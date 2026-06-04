# QXC.exe — Python Script Archive

> 🏴‍☠️ A 90s Y2K-style archive for Python trading algorithms
>
> 100% Serverless. 0 元資料庫。GitHub JSON 永久儲存。

![QXC Screenshot](https://img.shields.io/badge/style-90s_Y2K-ff9eb5?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-2a1f3d?style=for-the-badge&logo=next.js)
![GitHub API](https://img.shields.io/badge/GitHub-JSON-88c8e8?style=for-the-badge&logo=github)
![Tailwind](https://img.shields.io/badge/Tailwind-3-c89ec7?style=for-the-badge&logo=tailwindcss)

## ✨ Features

- 📁 **Script Archive** — Python 腳本下載連結與說明
- 📊 **Statistics** — 訪問量、下載次數
- 🔍 **Search & Filter** — 全文搜尋、標籤分類、排序
- 💬 **Comments** — 每個腳本可留言
- ⚠️ **Broken Link Reports** — 使用者可回報失效連結
- 🌙 **Dark Mode** — 復古色調完整切換
- 📤 **CSV Export/Import** — 完整資料備份與還原
- 🔐 **Admin Panel** — 密碼保護的管理後台
- 📄 **Pagination** — 分頁支援

## 🏗️ 架構

```
使用者 → Vercel (Next.js) → GitHub Contents API → data/data.json
                          ↑
                    全部資料儲存在這裡
```

**完全 Serverless**，無需任何資料庫。

## 🚀 部署步驟

### 1. 建立 GitHub Token

1. 到 https://github.com/settings/tokens/new
2. **Note** 填 `QXC Archive`
3. **Expiration** 選 `No expiration` (或自訂)
4. **Scopes** 勾選 ✅ `Contents` (讀寫)
5. 按 **Generate token**，**複製 token** (只會顯示一次！)

### 2. 在 Vercel 設定環境變數

到 Vercel Dashboard → 你的 QXC 專案 → Settings → Environment Variables：

| Key | Value | 說明 |
|-----|-------|------|
| `GITHUB_TOKEN` | `ghp_xxxxxxxxxx` | 步驟 1 取得的 token |
| `GITHUB_REPO` | `yuang093/QXC` | 預設值 |
| `GITHUB_BRANCH` | `main` | 預設值 |
| `GITHUB_PATH` | `data/data.json` | 預設值 |
| `ADMIN_PASSWORD` | `yuang093` | 預設值 (建議改掉) |

### 3. 第一次部署

Vercel 會自動部署。**第一次訪問時，API 會自動在 `data/data.json` 建立空資料庫**。

若要使用預設範例資料：
1. 把 `data/data.json` 從本機 push 上去
2. 或匯入 CSV

### 4. 完成！

到 `https://你的網址.vercel.app` 開始使用。

## 💻 本地開發

```bash
# 1. Clone
git clone https://github.com/yuang093/QXC.git
cd QXC

# 2. 安裝
npm install

# 3. 設定環境變數
cp .env.example .env.local
# 編輯 .env.local 填入 GITHUB_TOKEN

# 4. 啟動
npm run dev

# 5. 開啟 http://localhost:3000
```

## 📋 限制與取捨

- ✅ 永久免費（GitHub API 公開端點 60 req/hr 認證、5000 req/hr 認證）
- ✅ 完整 git 歷史記錄
- ⚠️ 寫入 ~500ms（有 30 秒 cache 減少 GET）
- ⚠️ 併發寫入可能衝突（自動 retry）
- ⚠️ Token 有讀寫權限，請妥善保管

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
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ScriptCard.tsx
│   ├── EditModal.tsx
│   └── ThemeToggle.tsx
├── lib/
│   └── github-db.ts      # GitHub Contents API 封裝
├── data/
│   └── data.json         # 資料庫本體
└── package.json
```

## 🔐 管理後台

- 預設密碼：`yuang093` (請透過環境變數改掉)
- 點擊右上角 `⚙ ADMIN` 輸入密碼
- 管理員可：新增、編輯、刪除、匯入/匯出 CSV、查看失效回報

## 📜 License

MIT
