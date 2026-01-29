
# 🐻 Tabi-Kuma: 夢幻旅人

> **少女系夢幻馬卡龍風格的團體旅遊規劃工具。**

Tabi-Kuma 是一款專為好友團體設計的旅遊 App，擁有極致奶油感的 UI/UX 設計，結合 AI 助理與雲端同步功能，讓規劃行程變成一種享受。

## ✨ 特色功能

- 🌸 **奶油感視覺設計**：全 App 使用馬卡龍奶油色系，搭配手繪風動畫。
- 🗺️ **智慧行程規劃**：內建 Gemini AI 提供即時旅遊建議。
- 💰 **快樂消費記帳**：支持 HKD/JPY 自動換算，讓出國分帳不再頭痛。
- 📸 **拍立得日誌**：隨手紀錄旅途中的美好瞬間，即時同步給隊友。
- ☁️ **雲端資料同步**：基於 Supabase 實作，確保所有人的行程永遠是最新的。

## 🛠️ 技術棧

- **Frontend**: React 19, Tailwind CSS, Lucide React
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Google Gemini API (@google/genai)
- **Routing**: React Router 7

## 🚀 快速開始

1. **克隆專案**
   ```bash
   git clone https://github.com/你的帳號/tabi-kuma.git
   ```

2. **設定環境變數**
   在根目錄建立 `.env` 檔案並加入你的 Google API Key：
   ```env
   API_KEY=你的_GEMINI_API_KEY
   ```

3. **開發環境執行**
   ```bash
   npm install
   npm run dev
   ```

## 🔒 隱私與安全

請確保你在 GitHub 的專案設定中添加了 `API_KEY` 環境變數，切勿將真實的金鑰直接提交至程式碼庫。

---
Made with ❤️ for dream travelers.
