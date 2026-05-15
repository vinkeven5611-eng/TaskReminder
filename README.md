# TaskReminder 🔔

> **免費的高階待辦事項與日曆同步工具**  
> 永遠不再錯過任何重要截止時間！結合 Google 日曆雙向同步與 Brevo API 雲端發信，打造最強大的免費任務管理體驗。

🌐 **線上體驗**：[https://task-reminder-omega-five.vercel.app](https://task-reminder-omega-five.vercel.app)

---

## ✨ 核心功能特色

- 📋 **高階任務管理**：新增、編輯、完成、刪除待辦事項，支援精確到分鐘的截止時間。
- 📅 **Google 日曆雙向同步**：
  - 支援 Google OAuth 2.0 安全登入授權。
  - 任務新增、修改、刪除時，自動同步至 Google 日曆。
  - 首頁一鍵「檢查變更」，將 Google 日曆上的修改即時同步回系統。
- 📧 **雲端郵件自動提醒**：採用 **Brevo API** 繞過雲端平台 SMTP 封鎖，確保任務提醒信件 100% 送達。
- 🔐 **Email 2FA 二步驗證**：登入流程結合 Brevo API 寄送 4 位數驗證碼，保障帳號安全，且完全免費（無需自訂網域）。
- 🌙 **高端 Dark Glassmorphism UI**：採用毛玻璃效果、環境光、流暢的微動畫，並針對手機版 (Mobile-first) 進行深度 RWD 體驗優化。
- 🛡️ **進階資安防護**：
  - 實作 API 速率限制 (Rate Limiting) 防禦信件炸彈與暴力破解。
  - 金鑰與 Token 的 AES-GCM 雙向加密存儲。
- ⚡ **全自動化排程**：配合外部 Ping 服務，解決免費雲端平台休眠導致的任務遺漏問題。
- 🆕 **最近更新 (2026/05/15)**：
  - 📱 **深度手機版對齊優化**：實現組件寬度 100% 對齊，並將導覽圖示統一靠右以符合單手操作。
  - 👁️ **視覺邊界強化**：調高框線對比度，大幅改善在極黑背景下的區塊辨識度。

---

## 🛠️ 技術棧

### 前端
- **React 18** + **Vite 5** (核心 UI 與快速建置)
- **React Router 6** (單頁面路由)
- **Lucide React** (美觀圖示庫)
- **Vanilla CSS** (高端毛玻璃設計系統)

### 後端
- **Flask 3** (REST API 核心框架)
- **Flask-SQLAlchemy** (ORM 資料庫管理)
- **Flask-JWT-Extended** (身份驗證)
- **Brevo API (Requests)** (雲端發信解決方案)
- **Google API Client** (Google Calendar 同步)
- **Cryptography** (AES 高強度加密)

### 雲端部署架構
- **前端託管**：[Vercel](https://vercel.com)
- **後端託管**：[Render](https://render.com) (Web Service)
- **雲端資料庫**：Render PostgreSQL
- **寄信服務**：[Brevo](https://brevo.com) (HTTP API 模式)

---

## 🚀 部署與啟動指南

### 環境變數 (`.env` / Render Environment)
請確保在雲端平台設定以下環境變數：

```env
# 系統安全金鑰
SECRET_KEY=your_secret_key
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_base64_aes_key  # 用於加密 Google Token

# Brevo API 寄信設定 (解決 Render SMTP 封鎖問題)
BREVO_API_KEY=xkeysib-your_api_key
SENDER_EMAIL=your_verified_email@gmail.com

# Google Calendar OAuth 2.0 金鑰
GOOGLE_CLIENT_ID=your_google_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_secret
```

### 雲端自動部署 (CI/CD)
1. **GitHub 推送**：本專案已配置完成，只要推送到 `main` 分支，Vercel 與 Render 將同步啟動更新。
2. **Render 設定**：使用 `render.yaml` 進行 IaC 自動建置，並手動於 Dashboard 填入 `BREVO_API_KEY` 與 Google 金鑰。

---

## 📁 專案結構簡述

- `backend/app.py`: Flask 主程式、API 路由、Brevo 發信邏輯。
- `backend/calendar_sync.py`: Google Calendar 同步核心邏輯。
- `frontend/src/pages/Auth.jsx`: 具備驗證碼機制的登入頁面。
- `frontend/src/index.css`: 全域 Glassmorphism 設計系統。

---

## 📜 License
MIT License © 2026 TaskReminder 團隊
