# TaskReminder 🔔

> **「極簡、準確、無縫同步」** — 專為現代人設計的智能任務管理工具。
> 完美的網頁體驗，搭配 Android 原生「真·鬧鐘」防漏通知，徹底終結「放鳥任務」的惡夢！

🌐 **網頁版線上體驗**：[https://task-reminder-omega-five.vercel.app](https://task-reminder-omega-five.vercel.app)  
📱 **Android 官方版下載**：[TaskFlow.apk (最新 v3.9 版)](https://task-reminder-omega-five.vercel.app/TaskFlow.apk)

---

## 🌟 核心功能特色

*   **⚡ 兩步驟極速註冊**：只需輸入信箱，完成免密碼登入 (2FA 驗證碼)，兼顧安全與快速。
*   **📅 Google 日曆雙向無縫同步**：一鍵連結你的 Google 帳號，TaskFlow 的任務會自動同步至日曆，在外部日曆的更動也能一鍵拉回。
*   **⏰ 獨家 Android「真·鬧鐘」提醒**：
    *   **頂部橫幅直彈**：時間到時，鬧鐘通知直接從手機頂部跳出，不縮水、不隱藏。
    *   **一鍵直接關閉**：跳出的通知下方直接提供「✕ 關閉鬧鐘」大按鈕，點擊立刻停止！
    *   **智慧震動與音響**：有聲音時走 `STREAM_ALARM` 鬧鐘特權音軌（超大聲響鈴）；靜音或震動模式下自動切換為 30 秒「救命級」高節奏持續震動。
    *   **無殘留清理**：鬧鐘響完後或任務被刪除時，鬧鐘排程會自動從手機與清單中清空，保持極簡。

---

## 🌐 網頁版使用說明

### 第一步：免密登入與註冊
1. 輸入您的常用 **Email 信箱**。
2. 系統會自動寄出一封包含 **6 位數驗證碼** 的郵件。
3. 輸入驗證碼即可快速登入（首次輸入新 Email 會自動建立新帳號）。

### 第二步：新增任務與截止時間
*   在上方輸入框輸入任務內容。
*   點擊 **日曆圖示** 選擇您的「任務截止時間（Due Date）」，接著點擊「新增任務」即可！

### 第三步：連結 Google 日曆同步
1. 點擊右上角的 **「設定 (⚙️)」** 圖示。
2. 點擊 **「連結 Google 帳號」** 並完成 Google 安全授權。
3. 授權完成後，開啟 **「自動同步任務到 Google 日曆」** 開關。
4. 之後不論是新增、完成還是刪除任務，TaskFlow 都會將其同步為您的 Google 日曆行程。
5. 若您在 Google 日曆上修改了行程時間，只需在 TaskFlow 點擊 **「同步更新」** 按鈕，最新的變更就會立刻拉回本地。

---

## 📱 Android App 使用與安裝指南

> [!IMPORTANT]
> **Android 版最核心的優勢**：一般網頁 App (PWA) 在手機螢幕關閉時無法準時發出聲音提醒。TaskFlow Android 原生版採用了系統底層的 `AlarmManager` 引擎，即使手機處於深度睡眠，時間到一樣能精確響鈴！

### 📥 安裝與版本更新
1. 在手機上打開瀏覽器，前往 [TaskReminder 線上版](https://task-reminder-omega-five.vercel.app) 下載 `TaskFlow.apk`。
2. 下載完成後，點擊安裝（若系統提示「未知的來源」，請選擇允許安裝）。
3. **版本更新**：未來若有新版本，App 在開啟時會自動跳出 **「發現新版本」** 提示，點擊確認即可一鍵下載並完成自動覆蓋安裝，無需手動去瀏覽器下載！

### 🔑 權限設定（非常重要！攸關鬧鐘是否會響）
為了確保鬧鐘在背景能準時且大聲地叫醒您，請在首次開啟 App 時完成以下授權：
1. **通知權限 (Post Notifications)**：App 啟動時會主動請求，請務必點擊**「允許」**，鬧鐘通知才能彈出。
2. **精確鬧鐘權限 (Exact Alarms)**：App 啟動時會引導您前往系統設定，請點擊確定並在系統開關中將 TaskFlow 的 **「允許設定精確鬧鐘」** 開啟。
3. **電池最佳化關閉（可選）**：在您的 Android 手機「設定 -> 應用程式管理 -> TaskFlow -> 省電策略 / 電池最佳化」中，選擇**「無限制」**或**「不限制背景活動」**。這能防止手機系統在半夜強制殺掉鬧鐘服務。

### ⏰ 設定任務鬧鐘
1. 在任務卡片上，點擊 **鐘頭圖示 (🔔)** 開啟鬧鐘設定面板。
2. 點擊 **「新增鬧鐘」**，設定您希望鬧鐘響起的日期與時間（可以早於截止時間，例如提早 15 分鐘提醒您準備）。
3. 設定完畢後點擊儲存，該鬧鐘即會寫入手機的原生晶片。
4. 點擊頂部的 **「鬧鐘清單」** 按鈕，可以查看所有已排定的鬧鐘，或隨時關閉它們。

### 🚨 鬧鐘響起時的互動
*   **手機在桌上或使用中**：鬧鐘時間到時，手機會大聲播放鈴聲，並從螢幕頂部直接彈出橫幅。
*   **按鈕清晰可見**：橫幅上會直接露出 **`✕ 關閉鬧鐘`** 的大按鈕，輕輕一按，音樂與震動立刻停止。
*   **防止誤滑**：鬧鐘通知被設定為「持續性」，無法隨手往左或往右滑掉，避免您在半夢半醒中滑掉通知而睡過頭。

---

## 📐 系統架構

```mermaid
graph TD
    User([使用者])
    Frontend[React Frontend - Vercel]
    Backend[Flask API - Render]
    DB[(PostgreSQL - Render)]
    Google[Google Calendar API]
    Brevo[Brevo Email API]
    Android[Android Native App]

    User <--> Frontend
    Frontend <--> Backend
    Backend <--> DB
    Backend <--> Google
    Backend <--> Brevo
    Android <--> Frontend
    Android -- Native Bridge --> Clock[Android System Clock]
```

### 架構組件說明
*   **前端層 (Frontend)**：採用 React 18 建置並託管於 Vercel。負責使用者介面互動、狀態管理及 OAuth 授權流程的發起。
*   **後端層 (Backend)**：使用 Flask 實作 RESTful API 並託管於 Render。整合 APScheduler 執行後台任務掃描，並處理核心業務邏輯。
*   **資料層 (Persistence)**：使用 Render 託管的 PostgreSQL 資料庫，儲存使用者資料、任務清單及經 AES 加密後的第三方授權權杖。
*   **整合層 (Integrations)**：
    *   **Google OAuth & Calendar**：實現跨平台的事件同步與身分驗證。
    *   **Brevo API**：作為雲端發信網關，負責 2FA 驗證碼與任務提醒信件，避開了 Render 免費雲端的發信限制。
*   **原生層 (Native Layer)**：Android App 以 Capacitor 為核心，並透過自定義的 Java Bridge 實作與系統底層鬧鐘引擎的直接通訊。

---

## 🛠️ 技術棧

| 類別 | 技術 |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, Lucide Icons, Vanilla CSS |
| **Backend** | Flask 3, SQLAlchemy, JWT-Extended |
| **Security** | OAuth 2.0, AES-GCM (Token 加密), API Rate Limiting |
| **Android** | Capacitor 5, Java (Native Bridge, AlarmManager, MediaPlayer) |
| **Infrastructure** | Vercel, Render, PostgreSQL |

---

## 🚀 APK 發布與更新流程 (Release Workflow)

為了確保網頁版下載連結與 App 「自動檢查更新」功能皆能順利安裝最新版，請在每次修改原生 App 代碼後，嚴格遵循以下發布步驟：

1. **推送代碼觸發 CI 打包**：
   - 每次修改原生代碼（例如 `AlarmActivity.java`）或調整版本號後，直接 `git commit` 並 `git push` 到 `main` 分支。
   - GitHub Actions 會自動執行 `Build Android APK` 工作流進行雲端編譯。
2. **下載 GitHub 編譯完成的 APK**：
   - 到 GitHub 專案的 **Actions** 頁面，點擊最新一次的 Build 紀錄。
   - 捲動到頁面底部，在 **Artifacts** 下載名為 **`TaskFlow-Android-App`** 的壓縮檔。
3. **覆蓋網頁端的靜態 APK 檔案**：
   - 將壓縮檔解壓縮得到 `app-debug.apk`。
   - 將檔案改名為 **`TaskFlow.apk`**。
   - 覆蓋至本機目錄中的 **`frontend/public/TaskFlow.apk`**。
4. **提交最新 APK 完成網站部署**：
   - 將覆蓋後的最新 `TaskFlow.apk` 加入 Git：`git commit -am "chore: update latest built APK for vX.X release"`。
   - 再次 `git push`，前端網頁與自動更新服務即會發布最新版本！

---

## 📜 授權協議
MIT License © 2026 TaskReminder Team

