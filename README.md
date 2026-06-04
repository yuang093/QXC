# QXC.exe — Python Script Archive

> 🏴‍☠️ A 90s Y2K-style archive for Python trading algorithms

![QXC Screenshot](https://img.shields.io/badge/style-90s_Y2K-ff9eb5?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-2a1f3d?style=for-the-badge&logo=next.js)
![SQLite](https://img.shields.io/badge/SQLite-3-88c8e8?style=for-the-badge&logo=sqlite)
![Tailwind](https://img.shields.io/badge/Tailwind-3-c89ec7?style=for-the-badge&logo=tailwindcss)

## ✨ Features

- 📁 **Script Archive** — Python 腳本下載連結與說明
- 📊 **Statistics** — 訪問量、下載次數、即時數據
- 🔍 **Search & Filter** — 全文搜尋、標籤分類、排序 (新→舊、熱門、字母)
- 💬 **Comments** — 每個腳本可留言
- ⚠️ **Broken Link Reports** — 使用者可回報失效連結
- 🌙 **Dark Mode** — 復古色調完整切換
- 📤 **CSV Export/Import** — 完整資料備份與還原
- 🔐 **Admin Panel** — 密碼保護的管理後台 (`yuang093`)
- 📄 **Pagination** — 分頁支援大量資料

## 🎨 Design

90 年代 Y2K 風格：
- Mac OS 風格視窗、像素字體
- VT323 / Press Start 2P / Silkscreen / DM Mono
- 薄荷綠、桃粉、紫紅、米黃、淡藍
- 復古按鈕、貼紙、CRT 掃描線
- 完全避開 Inter/Roboto/Arial 與紫色漸層

## 🚀 Quick Start

```bash
# 安裝
npm install

# 初始化資料庫 (會建立 data/qxc.db 並 seed 範例資料)
npm run init-db

# 開發
npm run dev

# 開啟 http://localhost:3000
```

## 📦 Deployment to Vercel

1. 推到 GitHub (已預設)
2. 在 [Vercel](https://vercel.com) 匯入此 repo
3. 設定環境變數 (選用):
   - `ADMIN_PASSWORD` (預設 `yuang093`)
4. Deploy!

⚠️ **重要**: Vercel 的 serverless 環境預設不支援持久化檔案系統。
SQLite 在 Vercel 上**只會存活於單次請求** (因為 /tmp 在每次冷啟動會被清空)。

**生產環境建議**：
- 對於正式使用，請改用 [Vercel Postgres](https://vercel.com/storage/postgres) 或 [Turso](https://turso.tech/) (libSQL，SQLite 相容)
- 改用 Postgres 的 `pg` 套件，schema 幾乎一樣

對於個人/小團隊使用，SQLite 在本地與大部分 VPS 都運作良好。

## 🗂️ Project Structure

```
QXC/
├── app/
│   ├── api/              # API 路由
│   │   ├── scripts/      # 增刪改查
│   │   ├── download/     # 下載計數
│   │   ├── visit/        # 訪問記錄
│   │   ├── comments/     # 留言
│   │   ├── report/       # 失效回報
│   │   ├── csv/          # 匯出匯入
│   │   └── admin/        # 認證
│   ├── admin/            # 管理後台頁
│   ├── globals.css       # 全域樣式
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # 首頁
├── components/
│   ├── ScriptCard.tsx    # 腳本卡片
│   ├── EditModal.tsx     # 新增/編輯 modal
│   └── ThemeToggle.tsx   # 深淺色切換
├── lib/
│   └── db.ts             # SQLite 連線與 schema
├── scripts/
│   └── init-db.js        # 初始化資料庫
├── data/                 # SQLite 檔案 (gitignore)
└── package.json
```

## 🔐 Admin Access

- 預設密碼: `yuang093`
- 點擊右上角 `⚙ ADMIN` 輸入密碼
- 管理員可：新增、編輯、刪除腳本、匯入/匯出 CSV、查看失效回報
- 進入 `/admin` 查看失效連結回報

## 📋 CSV Format

```csv
id,name,url,description,tags,downloads,size_kb,version,status,created_at,updated_at
1,amV11.py,https://...,"SPX 早盤策略",SPX,MORNING,247,14.2,v11,active,2026-05-30,...
```

匯入時 `id` 會被忽略（自動編號），其他欄位都會寫入。

## 📜 License

MIT
