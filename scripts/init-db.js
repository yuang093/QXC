// 手動初始化資料庫的腳本
// 執行: npm run init-db
const path = require('path');
const fs = require('fs');

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const Database = require('better-sqlite3');
const dbPath = path.join(dbDir, 'qxc.db');

console.log('Initializing database at', dbPath);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS scripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    downloads INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    size_kb REAL,
    version TEXT,
    status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visited_at TEXT NOT NULL DEFAULT (datetime('now')),
    path TEXT NOT NULL DEFAULT '/',
    user_agent TEXT,
    ip TEXT
  );
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id INTEGER NOT NULL,
    author TEXT NOT NULL DEFAULT 'Anonymous',
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id INTEGER NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_scripts_status ON scripts(status);
  CREATE INDEX IF NOT EXISTS idx_comments_script ON comments(script_id);
  CREATE INDEX IF NOT EXISTS idx_visits_at ON visits(visited_at);
`);

const count = db.prepare('SELECT COUNT(*) as c FROM scripts').get();
if (count.c === 0) {
  const insert = db.prepare(`INSERT INTO scripts (name, url, description, tags, downloads, size_kb, version, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const seed = [
    ['amV11.py', 'https://github.com/yuang093/QXC/raw/main/scripts/amV11.py', 'SPX 早盤賣方策略。', 'SPX,MORNING', 247, 14.2, 'v11', 'active'],
    ['REAL_QQQV7.py', 'https://github.com/yuang093/QXC/raw/main/scripts/REAL_QQQV7.py', 'QQQ 戰術五口。', 'QQQ,5-LAYER', 412, 28.7, 'v7', 'active'],
    ['pmV6.py', 'https://github.com/yuang093/QXC/raw/main/scripts/pmV6.py', `SPX 0DTE Iron Condor 下午盤機器人。

在 SPY 溫和上漲趨勢下，於美東 15:00-15:30 間以 5 分鐘間隔（共 6 個時段）建立當日到期（0DTE）的 4 腿 Iron Condor 價差組合：Short Put（Δ≈-0.35）+ Long Put（−80 點）+ Short Call（ATM+10）+ Long Call（+80 點），透過時間衰減賺取權利金。

履約價選擇：以 ATM 為中心 ±300 點搜尋候選，動態取最接近目標 Delta -0.35 的 Short Put；Delta 搜尋失敗則 fallback 至 near5(ATM) ± 80 固定寬度。

趨勢濾網：僅在 SPY > SMA7 且漲幅 ≤ 2% 時進場，強趨勢時主動跳過。

下單順序：採「先買保險、再賣主力」分腿下單 — 成交 Long 腿後才下 Short 腿，若 Short 失敗自動平倉已買的 Hedge 避免裸部位。

停損管理：每筆 Short 成交價 × 1.8 倍登記為 STOP BUY 停損，並以 SAVED_STOPS 多層字典管理；啟動時自動掃描所有 SPXW 空單補上停損。

風控：3 次 retry 機制（買加價 / 賣降價各 0.10）、HEDGE 與 SHORT 獨立滑價容忍、啟動時強制清倉 SPX 殘留部位。`, 'SPX,AFTERNOON,PM,0DTE,IRON-CONDOR', 134, 16.5, 'v6', 'active'],
  ];
  for (const r of seed) insert.run(...r);
  console.log('Seeded with', seed.length, 'scripts');
}

console.log('Database initialized successfully!');
db.close();
