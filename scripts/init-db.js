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
    ['pmV6.py', 'https://github.com/yuang093/QXC/raw/main/scripts/pmV6.py', `【策略本質】SPX 0DTE Iron Condor 下午盤賣方機器人。在 SPY 溫和上漲趨勢下，於美東 15:00-15:30 間以 5 分鐘間隔（共 6 個時段）建立當日到期（0DTE）的 4 腿價差組合，賺取時間衰減權利金。

【結構】4 腿 Iron Condor：Short Put（Δ≈-0.35）+ Long Put（−80 點）+ Short Call（ATM+10）+ Long Call（+80 點）。

【寬度/口數】WING_WIDTH=80 點、每腿 QTY=1 口、Tick=0.05。

【進場時程】美東 15:00/15:10/15:15/15:20/15:25/15:30 共 6 個時段，週一至週五。

【連線】ClientID=402、Port=7497、SPX/SPXW、MULTIPLIER=100、報價 CBOE、下單 SMART。

【履約價邏輯】動態 Delta 搜尋（ATM ±300 點、5 點間隔）取最接近 -0.35 的 Short Put；Call 腿固定 ATM+10；失敗則 fallback 至 near5(ATM) ± 80。

【趨勢濾網】SPY > SMA7 且漲幅 ≤ 2% 才進場，強趨勢主動跳過。

【下單流程】分腿下單「先買 HEDGE 再賣 SHORT」：成交 Long 腿才下 Short；若 Short 失敗自動平倉已買的 Hedge 避免裸部位。

【停損系統】每筆 Short 成交價 × 1.8（STOP_MULT）登記為 STOP BUY；SAVED_STOPS 多層字典管理；啟動 sync_all_spxw_stops 自動補停損。

【Retry】HEDGE/SHORT 各 3 次，買加價 0.10、賣降價 0.10，最多等 20 秒。

【風控】啟動清倉 SPX 殘留、cancel_conflicts 防重複下單、IB 錯誤分級。

【改進】相較 pmV5 強化 Delta 動態選價、SAVED_STOPS 多層停損、啟動全域 STOP SYNC。

【總結】溫和趨勢下午盤 Iron Condor，1.8× 硬停損防暴，分腿下單保部位乾淨。`, 'SPX,AFTERNOON,PM,0DTE,IRON-CONDOR', 134, 16.5, 'v6', 'active'],
  ];
  for (const r of seed) insert.run(...r);
  console.log('Seeded with', seed.length, 'scripts');
}

console.log('Database initialized successfully!');
db.close();
