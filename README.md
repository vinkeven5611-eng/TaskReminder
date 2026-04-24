# TaskReminder 🔔

> **免費的高階待辦事項與 Gmail 自動提醒工具**  
> 永遠不再錯過任何重要截止時間！結合 Google 日曆雙向同步，打造最強大的任務管理體驗。

🌐 **線上體驗**：[https://task-reminder-omega-five.vercel.app](https://task-reminder-omega-five.vercel.app)

---

## ✨ 核心功能特色

- 📋 **高階任務管理**：新增、編輯、完成、刪除待辦事項，支援精確到分鐘的截止時間。
- 📅 **Google 日曆雙向同步 (New!)**：
  - 支援 Google OAuth 2.0 安全登入授權。
  - 任務新增、修改、刪除時，自動同步至 Google 日曆。
  - 首頁一鍵「檢查變更」，將 Google 日曆上的修改即時同步回系統。
- 📧 **郵件自動提醒**：任務截止前 24 小時、1 小時各自發送 Gmail 專屬提醒。
- 🔐 **Email 2FA 二步驗證**：每次註冊與登入需透過信箱驗證碼確認身份，並支援「信任此裝置」功能跳過後續驗證。
- 🌙 **高端 Dark Glassmorphism UI**：採用毛玻璃效果、環境光、流暢的微動畫，並針對手機版 (Mobile-first) 進行深度 RWD 體驗優化。
- 🛡️ **進階資安防護**：
  - 實作 API 速率限制 (Rate Limiting) 防禦信件炸彈與暴力破解。
  - 金鑰與 Token 的 AES 雙向加密存儲。
  - 嚴格的 CORS 策略與防範 IDOR 漏洞的資源隔離。
- ⚡ **全自動化排程**：配合外部 Ping 服務與 5 分鐘高頻排程檢查，解決免費雲端平台休眠導致的任務遺漏問題。
- 🇹🇼 **全繁體中文在地化**：所有系統提示、錯誤訊息與介面皆為順暢的繁體中文。

---

## 🛠️ 技術棧

### 前端
| 技術 | 版本 | 用途 |
|------|------|------|
| React | 18 | 核心 UI 框架 |
| Vite | 5 | 快速打包建置工具 |
| React Router | 6 | 前端路由 (SPA) |
| Lucide React | latest | 高品質向量圖示庫 |

### 後端
| 技術 | 版本 | 用途 |
|------|------|------|
| Flask | 3 | REST API 核心框架 |
| Flask-SQLAlchemy | 3 | ORM 資料庫管理 |
| Flask-JWT-Extended | 4 | JWT 身份與狀態驗證 |
| Flask-Bcrypt | 1 | 密碼安全加密 |
| Flask-Limiter | 3 | 速率限制 (Rate Limiting) |
| APScheduler | 3 | 背景 Email 提醒排程任務 |
| Google API Client | latest | 串接 Google Calendar API |
| Cryptography | latest | AES-GCM 高強度資料加密 |

### 雲端部署架構
- **前端託管**：[Vercel](https://vercel.com) (包含 `vercel.json` 路由配置)
- **後端託管**：[Render](https://render.com) Web Service
- **雲端資料庫**：Render PostgreSQL (透過 Blueprint 自動配置)

---

## 🚀 部署與啟動指南

### 前置需求
- Node.js >= 18
- Python >= 3.10
- PostgreSQL (生產環境) / SQLite (本地開發)
- Google Cloud Console 開發者帳號 (獲取 OAuth 金鑰)

### 環境變數 (`.env`)
在 `backend` 目錄下建立 `.env` 檔案，並填入以下機密資訊：

```env
# 系統安全金鑰
SECRET_KEY=your_secret_key
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_base64_aes_key  # 用於加密 Google Token

# 資料庫 (Render 會自動注入此變數)
DATABASE_URL=sqlite:///taskflow.db

# Gmail SMTP 發信設定
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_gmail@gmail.com
SMTP_PASSWORD=your_app_password
SENDER_EMAIL=your_gmail@gmail.com

# Google Calendar OAuth 2.0 金鑰
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### 雲端自動部署 (CI/CD)
本專案已配置 `render.yaml`，可直接於 Render 平台選擇 **Blueprint Deploy**，系統將自動建立 PostgreSQL 資料庫與 Flask 服務，並自動執行 `db.create_all()`。

前端則可直接匯入至 Vercel，設定 `VITE_API_URL` 指向 Render 後端網址即可。

---

## 📁 專案結構

```
TaskReminder/
├── backend/
│   ├── app.py              # Flask 主程式、API 路由、Email 排程
│   ├── models.py           # SQLAlchemy 資料庫模型 (User, Task, DailyStat)
│   ├── calendar_sync.py    # Google Calendar 雙向同步核心邏輯
│   ├── requirements.txt    # Python 依賴套件清單
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/          # Auth.jsx (認證), Dashboard.jsx (主控台)
│   │   ├── components/     # TaskCard.jsx (任務卡片模組)
│   │   ├── services/       # api.js (Axios API 串接與攔截器)
│   │   ├── index.css       # 全域 CSS 與 Glassmorphism 設計系統
│   │   └── App.jsx         # 路由與狀態配置
│   ├── vercel.json         # Vercel SPA 路由重寫規則
│   └── index.html
└── render.yaml             # Render Blueprint IaC 部署配置檔
```

---

## 📜 License

MIT License © 2026 TaskReminder 團隊
