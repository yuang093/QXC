import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// 資料庫檔案位置 — 使用 process.cwd() 在 Vercel 也可靠
const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'qxc.db');

// 確保資料夾存在
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 單例模式
let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // 初始化 schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',         -- comma-separated
      downloads INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      size_kb REAL,
      version TEXT,
      status TEXT NOT NULL DEFAULT 'active'  -- active | deprecated
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

  // 預設資料
  const count = db.prepare('SELECT COUNT(*) as c FROM scripts').get() as { c: number };
  if (count.c === 0) {
    const insert = db.prepare(`
      INSERT INTO scripts (name, url, description, tags, downloads, size_kb, version, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const seed = [
      ['amV11.py', 'https://github.com/yuang093/QXC/raw/main/scripts/amV11.py',
       'SPX 早盤賣方策略，於開盤前 15 分鐘自動掛單，根據 IV percentile 動態調整 strike distance。',
       'SPX,MORNING,SPX-AM', 247, 14.2, 'v11', 'active'],
      ['REAL_QQQV7.py', 'https://github.com/yuang093/QXC/raw/main/scripts/REAL_QQQV7.py',
       'QQQ 戰術五口層級輪動策略，五層 Layer 狀態機管理完整生命週期。',
       'QQQ,5-LAYER,LAYERED', 412, 28.7, 'v7', 'active'],
      ['bps2V7.py', 'https://github.com/yuang093/QXC/raw/main/scripts/bps2V7.py',
       'SPX 波段操作策略。透過 20/50 日均線黃金交叉判斷進場，動態調整倉位大小。',
       'SPX,SWING', 189, 19.1, 'v7', 'active'],
      ['bcsV6.py', 'https://github.com/yuang093/QXC/raw/main/scripts/bcsV6.py',
       'SPX 靜態備兌看漲策略，固定 strike 與到期日。',
       'SPX,BCS,STATIC', 156, 11.8, 'v6', 'active'],
      ['REAL_SMHV5.py', 'https://github.com/yuang093/QXC/raw/main/scripts/REAL_SMHV5.py',
       'SMH 半導體 ETF 戰術五口層級輪動策略。',
       'SMH,5-LAYER,SEMICONDUCTOR', 203, 26.4, 'v5', 'active'],
      ['bcs_dynamic_1500V7.py', 'https://github.com/yuang093/QXC/raw/main/scripts/bcs_dynamic_1500V7.py',
       'SPX 動態備兌看漲策略，動態調整 strike 與倉位。',
       'SPX,BCS,DYNAMIC', 178, 22.1, 'v7', 'active'],
      ['pmV5.py', 'https://github.com/yuang093/QXC/raw/main/scripts/pmV5.py',
       'SPX 下午盤賣方策略，於下午開盤後執行動態 sell。',
       'SPX,AFTERNOON,PM', 134, 16.5, 'v5', 'active'],
      ['monitor_utils.py', 'https://github.com/yuang093/QXC/raw/main/scripts/monitor_utils.py',
       '倉位監控工具集合，支援 IB API 即時倉位查詢與異常告警。',
       'UTIL,MONITOR', 89, 8.3, 'v1', 'active'],
    ];
    const insertMany = db.transaction((rows: typeof seed) => {
      for (const r of rows) insert.run(...r);
    });
    insertMany(seed);
  }

  dbInstance = db;
  return db;
}

export interface Script {
  id: number;
  name: string;
  url: string;
  description: string;
  tags: string;
  downloads: number;
  created_at: string;
  updated_at: string;
  size_kb: number | null;
  version: string | null;
  status: 'active' | 'deprecated';
}

export interface Comment {
  id: number;
  script_id: number;
  author: string;
  content: string;
  created_at: string;
}

export interface Report {
  id: number;
  script_id: number;
  reason: string;
  created_at: string;
}
