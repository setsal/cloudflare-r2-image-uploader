use crate::config::ImageProcessingConfig;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use image::codecs::avif::AvifEncoder;
use image::codecs::gif::GifEncoder;
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::{CompressionType, FilterType as PngFilterType, PngEncoder};
use image::codecs::tiff::TiffEncoder;
use image::imageops::FilterType;
use image::{DynamicImage, ExtendedColorType, ImageEncoder, ImageFormat};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawImageProcessingResult {
    pub original_size: usize,
    pub processed_size: usize,
    pub processed_buffer_base64: String,
    pub width: u32,
    pub height: u32,
    pub original_width: u32,
    pub original_height: u32,
    pub savings: u32,
    pub format: String,
    pub file_name: String,
}

fn is_svg(buffer: &[u8], file_name: &str) -> bool {
    if file_name.to_lowercase().ends_with(".svg") {
        return true;
    }
    let prefix = std::str::from_utf8(&buffer[..buffer.len().min(256)]).unwrap_or("");
    let trimmed = prefix.trim_start();
    trimmed.starts_with("<svg") || trimmed.contains("<svg")
}

/// Quantize an RGBA image with `imagequant` and write an indexed PNG for TinyPNG/sharp-style PNG compression.
fn encode_quantized_png(img: &DynamicImage, quality: u8) -> Result<Vec<u8>, String> {
    let rgba = img.to_rgba8();
    let width = rgba.width() as usize;
    let height = rgba.height() as usize;
    let raw_pixels = rgba.into_raw();

    let pixels: Vec<imagequant::RGBA> = raw_pixels
        .chunks_exact(4)
        .map(|c| imagequant::RGBA::new(c[0], c[1], c[2], c[3]))
        .collect();

    let mut liq = imagequant::new();
    let min_quality = quality.saturating_sub(20);
    liq.set_quality(min_quality, quality.clamp(1, 100))
        .map_err(|e| e.to_string())?;

    let mut liq_img = liq
        .new_image(pixels, width, height, 0.0)
        .map_err(|e| e.to_string())?;

    let mut res = liq.quantize(&mut liq_img).map_err(|e| e.to_string())?;
    let _ = res.set_dithering_level(1.0);
    let (palette, indexed_pixels) = res.remapped(&mut liq_img).map_err(|e| e.to_string())?;

    let mut out = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut out, width as u32, height as u32);
        encoder.set_color(png::ColorType::Indexed);
        encoder.set_depth(png::BitDepth::Eight);
        encoder.set_compression(png::Compression::Best);

        let mut rgb_pal = Vec::with_capacity(palette.len() * 3);
        let mut trns_pal = Vec::with_capacity(palette.len());
        let mut has_alpha = false;
        for px in &palette {
            rgb_pal.push(px.r);
            rgb_pal.push(px.g);
            rgb_pal.push(px.b);
            trns_pal.push(px.a);
            if px.a < 255 {
                has_alpha = true;
            }
        }
        encoder.set_palette(rgb_pal);
        if has_alpha {
            encoder.set_trns(trns_pal);
        }

        let mut writer = encoder.write_header().map_err(|e| e.to_string())?;
        writer
            .write_image_data(&indexed_pixels)
            .map_err(|e| e.to_string())?;
    }

    Ok(out)
}

pub fn process_image(
    buffer: &[u8],
    file_name: &str,
    config: &ImageProcessingConfig,
) -> Result<RawImageProcessingResult, String> {
    let original_size = buffer.len();

    // SVG passthrough
    if is_svg(buffer, file_name) {
        return Ok(RawImageProcessingResult {
            original_size,
            processed_size: original_size,
            processed_buffer_base64: BASE64.encode(buffer),
            width: 0,
            height: 0,
            original_width: 0,
            original_height: 0,
            savings: 0,
            format: "svg".to_string(),
            file_name: file_name.to_string(),
        });
    }

    let guessed_format = image::guess_format(buffer).map_err(|e| e.to_string())?;
    let format_name = match guessed_format {
        ImageFormat::Jpeg => "jpeg",
        ImageFormat::Png => "png",
        ImageFormat::WebP => "webp",
        ImageFormat::Avif => "avif",
        ImageFormat::Gif => "gif",
        ImageFormat::Tiff => "tiff",
        ImageFormat::Bmp => "bmp",
        ImageFormat::Ico => "ico",
        _ => "unknown",
    };

    let img = image::load_from_memory(buffer).map_err(|e| e.to_string())?;
    let original_width = img.width();
    let original_height = img.height();

    // BMP and ICO passthrough
    if matches!(guessed_format, ImageFormat::Bmp | ImageFormat::Ico) {
        return Ok(RawImageProcessingResult {
            original_size,
            processed_size: original_size,
            processed_buffer_base64: BASE64.encode(buffer),
            width: original_width,
            height: original_height,
            original_width,
            original_height,
            savings: 0,
            format: format_name.to_string(),
            file_name: file_name.to_string(),
        });
    }

    let mut current_img = img;

    // Apply resize if mode includes resize
    let should_resize = config.mode == "resize" || config.mode == "both";
    if should_resize && config.resize.percentage < 100 && config.resize.percentage > 0 {
        let scale = (config.resize.percentage as f64) / 100.0;
        let new_width = ((original_width as f64) * scale).round() as u32;
        let new_height = ((original_height as f64) * scale).round() as u32;

        if new_width > 0 && new_height > 0 {
            current_img = current_img.resize_exact(new_width, new_height, FilterType::Lanczos3);
        }
    }

    let width = current_img.width();
    let height = current_img.height();

    let should_compress = config.mode == "compress" || config.mode == "both";
    let quality = if should_compress {
        config.compression.quality.clamp(1, 100)
    } else {
        90
    };

    let mut out_buffer: Vec<u8> = Vec::new();

    match guessed_format {
        ImageFormat::Jpeg => {
            let rgb = current_img.to_rgb8();
            let encoder = JpegEncoder::new_with_quality(&mut out_buffer, quality);
            encoder
                .write_image(&rgb, width, height, ExtendedColorType::Rgb8)
                .map_err(|e| e.to_string())?;
        }
        ImageFormat::Png => {
            if should_compress && quality < 100 {
                if let Ok(quantized) = encode_quantized_png(&current_img, quality) {
                    out_buffer = quantized;
                }
            }
            if out_buffer.is_empty() {
                let rgba = current_img.to_rgba8();
                let comp = if should_compress {
                    CompressionType::Best
                } else {
                    CompressionType::Default
                };
                let encoder = PngEncoder::new_with_quality(&mut out_buffer, comp, PngFilterType::Adaptive);
                encoder
                    .write_image(&rgba, width, height, ExtendedColorType::Rgba8)
                    .map_err(|e| e.to_string())?;
            }
        }
        ImageFormat::WebP => {
            if let Ok(encoder) = webp::Encoder::from_image(&current_img) {
                let mem = encoder.encode(quality as f32);
                out_buffer = mem.to_vec();
            } else {
                let rgba = current_img.to_rgba8();
                let encoder = image::codecs::webp::WebPEncoder::new_lossless(&mut out_buffer);
                encoder
                    .write_image(&rgba, width, height, ExtendedColorType::Rgba8)
                    .map_err(|e| e.to_string())?;
            }
        }
        ImageFormat::Avif => {
            let rgba = current_img.to_rgba8();
            let encoder = AvifEncoder::new_with_speed_quality(&mut out_buffer, 6, quality);
            encoder
                .write_image(&rgba, width, height, ExtendedColorType::Rgba8)
                .map_err(|e| e.to_string())?;
        }
        ImageFormat::Tiff => {
            let rgba = current_img.to_rgba8();
            let mut cursor = Cursor::new(&mut out_buffer);
            let encoder = TiffEncoder::new(&mut cursor);
            encoder
                .write_image(&rgba, width, height, ExtendedColorType::Rgba8)
                .map_err(|e| e.to_string())?;
        }
        ImageFormat::Gif => {
            let rgba = current_img.to_rgba8();
            let mut encoder = GifEncoder::new(&mut out_buffer);
            encoder
                .encode(&rgba, width, height, ExtendedColorType::Rgba8)
                .map_err(|e| e.to_string())?;
        }
        _ => {
            out_buffer = buffer.to_vec();
        }
    }

    let processed_size = out_buffer.len();
    let savings = if original_size > 0 && processed_size < original_size {
        (((original_size - processed_size) as f64 / (original_size as f64)) * 100.0).round() as u32
    } else {
        0
    };

    Ok(RawImageProcessingResult {
        original_size,
        processed_size,
        processed_buffer_base64: BASE64.encode(&out_buffer),
        width,
        height,
        original_width,
        original_height,
        savings,
        format: format_name.to_string(),
        file_name: file_name.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::{CompressionSettings, ImageProcessingConfig, ResizeSettings};
    use image::{ImageBuffer, Rgba};

    #[test]
    fn test_svg_passthrough() {
        let svg = b"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\"></svg>";
        let cfg = ImageProcessingConfig::default();
        let res = process_image(svg, "icon.svg", &cfg).expect("svg should pass through");
        assert_eq!(res.format, "svg");
        assert_eq!(res.original_size, svg.len());
        assert_eq!(res.processed_size, svg.len());
        assert_eq!(res.savings, 0);
    }

    #[test]
    fn test_png_resize_and_compress() {
        let img: ImageBuffer<Rgba<u8>, Vec<u8>> = ImageBuffer::from_fn(200, 100, |x, y| {
            Rgba([(x % 255) as u8, (y % 255) as u8, ((x + y) % 255) as u8, 255])
        });
        let mut png_bytes = Vec::new();
        let encoder = PngEncoder::new(&mut png_bytes);
        encoder
            .write_image(img.as_raw(), 200, 100, ExtendedColorType::Rgba8)
            .unwrap();

        let cfg = ImageProcessingConfig {
            enabled: true,
            mode: "both".to_string(),
            compression: CompressionSettings { quality: 75 },
            resize: ResizeSettings { percentage: 50 },
            auto_confirm: false,
        };

        let res = process_image(&png_bytes, "sample.png", &cfg).expect("png processing succeeds");
        assert_eq!(res.format, "png");
        assert_eq!(res.original_width, 200);
        assert_eq!(res.original_height, 100);
        assert_eq!(res.width, 100);
        assert_eq!(res.height, 50);
        assert!(res.processed_size < res.original_size);
    }
}
