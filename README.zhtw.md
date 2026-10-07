<p align="center">
  <img src=".github/icon.png" alt="Cloudflare R2 Image Uploader" width="128" />
</p>

<h1 align="center">Cloudflare R2 Image Uploader</h1>

<p align="center">
  一款<strong>隱私優先</strong>、<strong>極簡設計</strong>的桌面應用程式，專為快速上傳圖片至 Cloudflare R2 儲存空間而打造 —— 內建<strong>壓縮與縮放功能</strong>，圖片在離開你的電腦前就已完成最佳化處理。
</p>

<p align="center">
  拖放、壓縮、取得連結，一個工具搞定一切 —— 不需要額外工具、不需要線上服務、不需要多餘步驟。專為部落客、開發者與內容創作者設計，在 Cloudflare R2 上實現零摩擦的高效圖片託管。
</p>

<p align="center">
  <a href="README.md">English</a>
</p>

<p align="center">
  <img src=".github/assets/main.png" alt="應用程式截圖" width="600" />
</p>

## 主要功能

- **僅限圖片上傳** —— 專注於圖片格式（JPEG、PNG、WebP、AVIF、GIF、SVG 等）
- **拖放上傳** —— 直接將圖片拖放到應用程式即可立即上傳
- **剪貼簿貼上** —— 一鍵貼上截圖或已複製的圖片
- **內建壓縮** —— 採用 sharp 引擎的品質壓縮 —— 一步到位優化圖片，無需任何外部工具
- **內建縮放** —— 百分比縮放，提供快速預設（25%、50%、75%、100%）
- **上傳前預覽** —— 上傳前查看預估壓縮大小與節省空間
- **自動確認** —— 可選擇跳過確認對話框，實現全自動化工作流程
- **自動剪貼簿** —— 上傳後自動複製 URL（支援 Raw / Markdown / HTML 格式）
- **自動重新命名** —— 使用時間戳記或隨機 ID 重新命名，避免檔名衝突
- **憑證設定檔** —— 儲存並切換多組 R2 連線設定
- **上傳歷史** —— 瀏覽歷史上傳紀錄，追蹤原始本機檔案路徑與原始檔名，支援一鍵複製 URL／路徑及檔案總管定位
- **淺色 / 深色模式** —— 在設定中切換主題
- **匯出 / 匯入** —— 以 JSON 備份與還原所有設定和歷史紀錄
- **跨平台** —— 支援 Windows、macOS 與 Linux

## 快速開始

```bash
# 安裝相依套件
npm install

# 以開發模式執行
npm run dev

# 建置正式版本
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## 設定

1. 啟動應用程式並前往 **Settings**（設定）分頁
2. 填入你的 Cloudflare R2 憑證：
   - **S3 API Endpoint**：`https://<account-id>.r2.cloudflarestorage.com`
   - **Access Key ID** 與 **Secret Access Key**：從 Cloudflare Dashboard → R2 → 管理 R2 API 權杖中產生
   - **Bucket Name**：你的 R2 儲存桶名稱
   - **Public URL Base**：你的自訂網域（例如 `https://images.yourdomain.com`）
3. 點擊 **Test Connection** 驗證連線
4. 切換到 **Upload** 分頁即可開始上傳！


## 圖片處理

前往 **Image** 分頁設定處理選項：

- **壓縮** —— 調整品質（1-100%）以縮小檔案大小，同時保持視覺品質
- **縮放** —— 上傳前按百分比縮放圖片
- **兩者兼用** —— 同時套用壓縮與縮放，達到最大幅度的檔案縮減
- **自動確認** —— 跳過預覽對話框，直接上傳處理後的圖片

處理功能**預設為關閉** —— 需要時再開啟即可。

## 設計理念

- **圖片優先** —— 專為圖片上傳工作流程而設計
- **隱私與安全** —— 憑證絕不離開你的電腦；所有敏感欄位預設遮罩
- **極簡主義** —— 無臃腫功能、無帳號系統、無遙測追蹤 —— 只有一個快速的圖片上傳工具

## 技術堆疊

- **Electron** + **electron-vite** —— 桌面應用框架
- **React 18** + **TypeScript** —— 使用者介面
- **sharp** —— 高效能圖片壓縮與縮放（基於 libvips）
- **AWS SDK v3**（`@aws-sdk/client-s3`）—— 相容 S3 的 R2 上傳
- **electron-store** —— 本地持久化設定（設定與歷史紀錄分離儲存）

## License

MIT
