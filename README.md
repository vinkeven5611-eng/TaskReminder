# TaskReminder 🔔

> **免費的高階待辦事項與 Gmail 自動提醒工具**  
> 永遠不再錯過任何重要截止時間！

🌐 **線上體驗**：[https://task-reminder-omega-five.vercel.app](https://task-reminder-omega-five.vercel.app)

---

## ✨ 功能特色

- 📋 **任務管理**：新增、編輯、完成、刪除待辦事項
- 📧 **郵件自動提醒**：任務截止前 24 小時、1 小時各自發送 Gmail 提醒
- 🔐 **Email 2FA 二步驗證**：每次登入需透過信箱驗證碼確認身份，可記住裝置跳過驗證
- 📊 **即時使用統計**：首頁底部顯示今日活躍用戶數與總註冊人數
- 🌙 **高端 Dark Glassmorphism UI**：採用毛玻璃效果、環境光、貝茲曲線動畫

---

## 🛠️ 技術棧

### 前端
| 技術 | 版本 | 用途 |
|------|------|------|
| React | 18 | UI 框架 |
| Vite | 5 | 打包工具 |
| React Router | 6 | 前端路由 |
| Lucide React | latest | 圖示庫 |

### 後端
| 技術 | 版本 | 用途 |
|------|------|------|
| Flask | 3 | REST API 框架 |
| Flask-JWT-Extended | 4 | JWT 身份驗證 |
| Flask-Bcrypt | 1 | 密碼加密 |
| APScheduler | 3 | 背景排程任務 |
| SQLAlchemy | 3 | ORM 資料庫管理 |
| PostgreSQL / SQLite | - | 資料庫 |

### 部署
- **前端**：[Vercel](https://vercel.com)
- **後端**：[Render](https://render.com)
- **資料庫**：PostgreSQL (Supabase / Render)

---

## 🚀 本機啟動方式

### 前置需求
- Node.js >= 18
- Python >= 3.10
- pip

### 後端
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # 填入你的 SMTP 設定
python app.py
```

### 前端
```bash
cd frontend
npm install
npm run dev
```

### 環境變數 (`.env`)
```
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_gmail@gmail.com
SMTP_PASSWORD=your_app_password
SENDER_EMAIL=your_gmail@gmail.com
SECRET_KEY=your_secret_key
JWT_SECRET=your_jwt_secret
DATABASE_URL=sqlite:///taskflow.db
```

---

## 📁 專案結構

```
TaskReminder/
├── backend/
│   ├── app.py          # Flask 主程式、路由、排程
│   ├── models.py       # SQLAlchemy 資料模型
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/      # Auth.jsx, Dashboard.jsx
│   │   ├── components/ # TaskCard.jsx
│   │   └── services/   # api.js (API 串接)
│   ├── public/
│   │   ├── robots.txt
│   │   └── sitemap.xml
│   └── index.html
└── render.yaml         # Render 自動部署設定
```

---

## 📜 License

MIT License © 2026 TaskReminder
