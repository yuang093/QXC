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
  ];
  for (const r of seed) insert.run(...r);
  console.log('Seeded with', seed.length, 'scripts');
}

console.log('Database initialized successfully!');
db.close();
