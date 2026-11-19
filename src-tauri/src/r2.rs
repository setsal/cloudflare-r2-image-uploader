use crate::config::R2Config;
use chrono::Utc;
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use url::Url;

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub original_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

fn now_millis() -> u64 {
    Utc::now().timestamp_millis() as u64
}

fn generate_filename(original_name: &str, mode: &str) -> String {
    let ext = if original_name.contains('.') {
        original_name.rsplit('.').next().unwrap_or("")
    } else {
        ""
    };

    match mode {
        "timestamp" => {
            let ts = now_millis();
            if !ext.is_empty() {
                format!("{}.{}", ts, ext)
            } else {
                format!("{}", ts)
            }
        }
        "random" => {
            let id = nanoid::nanoid!(16);
            if !ext.is_empty() {
                format!("{}.{}", id, ext)
            } else {
                id
            }
        }
        _ => original_name.to_string(),
    }
}

fn build_object_key(path_prefix: &str, file_name: &str) -> String {
    let mut prefix = path_prefix.trim().to_string();
    while prefix.starts_with('/') {
        prefix.remove(0);
    }
    if !prefix.is_empty() && !prefix.ends_with('/') {
        prefix.push('/');
    }
    format!("{}{}", prefix, file_name)
}

fn build_public_url(public_url_base: &str, object_key: &str) -> String {
    let mut base = public_url_base.trim().to_string();
    while base.ends_with('/') {
        base.pop();
    }
    format!("{}/{}", base, object_key)
}

/// URI-encode a single path segment according to AWS SigV4 rules (RFC 3986 unreserved characters).
fn aws_uri_encode_segment(input: &str) -> String {
    let mut encoded = String::with_capacity(input.len());
    for byte in input.as_bytes() {
        match *byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(*byte as char);
            }
            _ => {
                encoded.push_str(&format!("%{:02X}", byte));
            }
        }
    }
    encoded
}

/// URI-encode an S3 path while preserving `/` separators.
fn aws_uri_encode_path(path: &str) -> String {
    path.split('/')
        .map(aws_uri_encode_segment)
        .collect::<Vec<_>>()
        .join("/")
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
    let mut mac = HmacSha256::new_from_slice(key).expect("HMAC accepts any key size");
    mac.update(data);
    mac.finalize().into_bytes().to_vec()
}

fn sha256_hex(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

fn extract_s3_error(status: reqwest::StatusCode, body: &str) -> String {
    if let Some(start) = body.find("<Message>") {
        if let Some(end) = body[start + 9..].find("</Message>") {
            return body[start + 9..start + 9 + end].to_string();
        }
    }
    if let Some(start) = body.find("<Code>") {
        if let Some(end) = body[start + 6..].find("</Code>") {
            return format!(
                "{} (HTTP {})",
                &body[start + 6..start + 6 + end],
                status.as_u16()
            );
        }
    }
    format!("HTTP {}", status)
}

fn parse_endpoint_host(endpoint: &str) -> Result<(String, String), String> {
    let trimmed = endpoint.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("Endpoint URL is required".to_string());
    }
    let parsed = Url::parse(trimmed).map_err(|e| format!("Invalid endpoint URL: {}", e))?;
    let host_str = parsed
        .host_str()
        .ok_or_else(|| "Endpoint URL is missing a host".to_string())?;
    let host = if let Some(port) = parsed.port() {
        format!("{}:{}", host_str, port)
    } else {
        host_str.to_string()
    };
    let base_url = format!("{}://{}", parsed.scheme(), host);
    Ok((base_url, host))
}

pub async fn upload_file(
    config: &R2Config,
    file_buffer: &[u8],
    original_name: &str,
    target_path: &str,
    auto_rename: &str,
) -> UploadResult {
    let timestamp = now_millis();

    let (base_url, host) = match parse_endpoint_host(&config.endpoint) {
        Ok(v) => v,
        Err(e) => {
            return UploadResult {
                success: false,
                url: None,
                key: None,
                file_name: None,
                original_name: Some(original_name.to_string()),
                original_path: None,
                file_size: None,
                error: Some(e),
                timestamp,
            };
        }
    };

    let file_name = generate_filename(original_name, auto_rename);
    let object_key = build_object_key(target_path, &file_name);
    let content_type = mime_guess::from_path(original_name)
        .first_or_octet_stream()
        .essence_str()
        .to_string();

    let encoded_bucket = aws_uri_encode_segment(config.bucket_name.trim());
    let encoded_key = aws_uri_encode_path(&object_key);
    let canonical_uri = format!("/{}/{}", encoded_bucket, encoded_key);
    let request_url = format!("{}{}", base_url, canonical_uri);

    let now = Utc::now();
    let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();
    let date_stamp = now.format("%Y%m%d").to_string();
    let region = "auto";
    let service = "s3";

    let payload_hash = sha256_hex(file_buffer);
    let canonical_headers = format!(
        "content-type:{}\nhost:{}\nx-amz-content-sha256:{}\nx-amz-date:{}\n",
        content_type, host, payload_hash, amz_date
    );
    let signed_headers = "content-type;host;x-amz-content-sha256;x-amz-date";

    let canonical_request = format!(
        "PUT\n{}\n\n{}\n{}\n{}",
        canonical_uri, canonical_headers, signed_headers, payload_hash
    );

    let credential_scope = format!("{}/{}/{}/aws4_request", date_stamp, region, service);
    let string_to_sign = format!(
        "AWS4-HMAC-SHA256\n{}\n{}\n{}",
        amz_date,
        credential_scope,
        sha256_hex(canonical_request.as_bytes())
    );

    let k_secret = format!("AWS4{}", config.secret_access_key.trim());
    let k_date = hmac_sha256(k_secret.as_bytes(), date_stamp.as_bytes());
    let k_region = hmac_sha256(&k_date, region.as_bytes());
    let k_service = hmac_sha256(&k_region, service.as_bytes());
    let k_signing = hmac_sha256(&k_service, b"aws4_request");
    let signature = hex::encode(hmac_sha256(&k_signing, string_to_sign.as_bytes()));

    let authorization = format!(
        "AWS4-HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}",
        config.access_key_id.trim(),
        credential_scope,
        signed_headers,
        signature
    );

    let client = reqwest::Client::new();
    let response = client
        .put(&request_url)
        .header("Host", &host)
        .header("Content-Type", &content_type)
        .header("x-amz-content-sha256", &payload_hash)
        .header("x-amz-date", &amz_date)
        .header("Authorization", &authorization)
        .body(file_buffer.to_vec())
        .send()
        .await;

    match response {
        Ok(resp) => {
            if resp.status().is_success() {
                let url = build_public_url(&config.public_url_base, &object_key);
                UploadResult {
                    success: true,
                    url: Some(url),
                    key: Some(object_key),
                    file_name: Some(file_name),
                    original_name: Some(original_name.to_string()),
                    original_path: None,
                    file_size: Some(file_buffer.len() as u64),
                    error: None,
                    timestamp,
                }
            } else {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_default();
                UploadResult {
                    success: false,
                    url: None,
                    key: None,
                    file_name: None,
                    original_name: Some(original_name.to_string()),
                    original_path: None,
                    file_size: None,
                    error: Some(extract_s3_error(status, &body)),
                    timestamp,
                }
            }
        }
        Err(err) => UploadResult {
            success: false,
            url: None,
            key: None,
            file_name: None,
            original_name: Some(original_name.to_string()),
            original_path: None,
            file_size: None,
            error: Some(err.to_string()),
            timestamp,
        },
    }
}

pub async fn test_connection(config: &R2Config) -> ConnectionTestResult {
    let (base_url, host) = match parse_endpoint_host(&config.endpoint) {
        Ok(v) => v,
        Err(e) => {
            return ConnectionTestResult {
                success: false,
                error: Some(e),
            };
        }
    };

    let encoded_bucket = aws_uri_encode_segment(config.bucket_name.trim());
    let canonical_uri = format!("/{}", encoded_bucket);
    let request_url = format!("{}{}", base_url, canonical_uri);

    let now = Utc::now();
    let amz_date = now.format("%Y%m%dT%H%M%SZ").to_string();
    let date_stamp = now.format("%Y%m%d").to_string();
    let region = "auto";
    let service = "s3";

    let payload_hash = sha256_hex(b"");
    let canonical_headers = format!(
        "host:{}\nx-amz-content-sha256:{}\nx-amz-date:{}\n",
        host, payload_hash, amz_date
    );
    let signed_headers = "host;x-amz-content-sha256;x-amz-date";

    let canonical_request = format!(
        "HEAD\n{}\n\n{}\n{}\n{}",
        canonical_uri, canonical_headers, signed_headers, payload_hash
    );

    let credential_scope = format!("{}/{}/{}/aws4_request", date_stamp, region, service);
    let string_to_sign = format!(
        "AWS4-HMAC-SHA256\n{}\n{}\n{}",
        amz_date,
        credential_scope,
        sha256_hex(canonical_request.as_bytes())
    );

    let k_secret = format!("AWS4{}", config.secret_access_key.trim());
    let k_date = hmac_sha256(k_secret.as_bytes(), date_stamp.as_bytes());
    let k_region = hmac_sha256(&k_date, region.as_bytes());
    let k_service = hmac_sha256(&k_region, service.as_bytes());
    let k_signing = hmac_sha256(&k_service, b"aws4_request");
    let signature = hex::encode(hmac_sha256(&k_signing, string_to_sign.as_bytes()));

    let authorization = format!(
        "AWS4-HMAC-SHA256 Credential={}/{}, SignedHeaders={}, Signature={}",
        config.access_key_id.trim(),
        credential_scope,
        signed_headers,
        signature
    );

    let client = reqwest::Client::new();
    match client
        .head(&request_url)
        .header("Host", &host)
        .header("x-amz-content-sha256", &payload_hash)
        .header("x-amz-date", &amz_date)
        .header("Authorization", &authorization)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                ConnectionTestResult {
                    success: true,
                    error: None,
                }
            } else {
                ConnectionTestResult {
                    success: false,
                    error: Some(format!("HTTP {}", resp.status())),
                }
            }
        }
        Err(err) => ConnectionTestResult {
            success: false,
            error: Some(err.to_string()),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_object_key_and_public_url() {
        assert_eq!(build_object_key("/blog/2026/", "hero.png"), "blog/2026/hero.png");
        assert_eq!(build_object_key("blog/2026", "hero.png"), "blog/2026/hero.png");
        assert_eq!(build_object_key("", "hero.png"), "hero.png");
        assert_eq!(
            build_public_url("https://img.example.com/", "blog/2026/hero.png"),
            "https://img.example.com/blog/2026/hero.png"
        );
    }

    #[test]
    fn test_generate_filename_modes() {
        assert_eq!(generate_filename("photo.jpg", "off"), "photo.jpg");
        let ts_name = generate_filename("photo.jpg", "timestamp");
        assert!(ts_name.ends_with(".jpg") && ts_name.len() > 10);
        let rnd_name = generate_filename("photo.png", "random");
        assert!(rnd_name.ends_with(".png") && rnd_name.len() == 20);
    }
}
