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
    ['pmV6.py', 'https://github.com/yuang093/QXC/raw/main/scripts/pmV6.py', `【策略本質】SPX 0DTE Iron Condor 下午盤賣方機器人（async/await 架構、繼承自 pmV5）。在 SPY 溫和上漲趨勢下，於美東 15:00-15:30 間以 5 分鐘間隔（共 6 個時段）建立當日到期（0DTE）的 4 腿 Iron Condor 價差組合，賺取時間衰減權利金。【結構】4 腿：Short Put（Δ≈-0.35）+ Long Put（−80 點）+ Short Call（ATM+10）+ Long Call（+80 點），Put 價差 + Call 價差各賺一筆 credit。【寬度/口數】WING_WIDTH=80 點、每腿 QTY=1 口、Tick=0.05、STOP_TICK=0.10。【進場時程】美東 15:00/15:10/15:15/15:20/15:25/15:30 共 6 個時段，ALLOWED_WEEKDAYS={0,1,2,3,4} 週一至週五；scheduler 自動計算下次進場時間並 sleep 等待。【連線/帳號】ClientID=402、Port=7497、SPX/SPXW、MULTIPLIER=100、QUOTE_EXCHANGE=CBOE、ORDER_EXCHANGE=SMART、ACCOUNT=DUOXXXXXX；啟動時 ensure_connected() 檢查連線，reqMarketDataType(3) 取得延遲報價。【履約價邏輯】find_strikes_by_delta()：以 ATM 為中心 ±300 點、5 點間隔建出候選 Put 合約（MIN_DELTA_SEARCH=10 個），訂閱 market data 取得 modelGreeks，等候 15 秒後取最接近 TARGET_DELTA=-0.35 的 Short Put；Short Call 固定 ATM+10；Delta 搜尋失敗則 fallback 至 near5(ATM) ± WING_WIDTH 固定寬度。【趨勢濾網】check_trend_filter()：取得 SPY 即時報價 + SMA7（reqHistoricalDataAsync 取 2 個月日線），兩條件必須同時成立才進場：(1) SPY > SMA7、(2) SPY 漲幅 ≤ TREND_UPPER_PCT=2.0%，超標視為趨勢過強主動跳過並記錄原因。【下單流程】分腿下單「先 HEDGE 再 SHORT」嚴格順序：先 exec_buy_hedge() 買 Long Put/Call（限價 = ask + attempt×HEDGE_SLIP），等成交 40×0.5 秒；成交後才 exec_sell_short() 賣 Short 腿（限價 = min(theoretical, mid) + max(0.05, bid)）；若 Short 失敗自動反向平倉已買的 Hedge 避免裸部位（LimitOrder 平倉）。【停損系統】每筆 Short 成交價 × STOP_MULT=1.80 登記為 STP BUY 停損單；SAVED_STOPS[conId] 字典儲存多層停損；register_stop_and_rebuild() 動態調整停損單數量（與短部位匹配）；啟動時 sync_all_spxw_stops() 掃描所有 SPXW 空單自動補上停損（avgCost/MULTIPLIER × 1.8 推算）。【Retry】HEDGE_RETRIES=3、SHORT_RETRIES=3、HEDGE_SLIP=0.10（買加價）、SHORT_STEP=0.10（賣降價）、CREDIT_SLIP=0.10；每次等待 40×0.5=20 秒後取消重試。【風控】(1) 啟動 close_all_spx_positions() 市價清倉 SPX 殘留部位；(2) cancel_conflicts_for() 下單前取消對沖合約所有未成交單防重複；(3) cancel_all_stops_for() 平倉時自動撤 STOP；(4) on_error() 分級處理 IB 錯誤（10090/10167/2104/2106/2158 忽略，2000+ warning、其他 error）。【改進】相較 pmV5 三項強化：(1) 加入 Delta 動態選價取代固定 near5；(2) 新增 SAVED_STOPS 多層停損字典與 rebuild_stops_for 機制；(3) 啟動 sync_all_spxw_stops() 全域停損補單。【總結】午後溫和多頭環境的 SPX 0DTE Iron Condor 賣方機器人：以 Delta=-0.35 動態鎖定 Put 主力、80 點固定翼寬控制風險、1.8× 權利金硬停損防止末日崩盤暴損；分腿下單「先買保險再賣主力」確保部位結構乾淨不裸，Hedge 失敗時反向平倉保護資本；趨勢濾網避開強勢行情，sync_all_stops 啟動補單機制應對隔夜斷線重連；6 個時段分散進場降低時機風險，整體設計兼顧系統性、時間衰效率與極端行情存活率。`, 'SPX,AFTERNOON,PM,0DTE,IRON-CONDOR', 134, 16.5, 'v6', 'active'],
  ];
  for (const r of seed) insert.run(...r);
  console.log('Seeded with', seed.length, 'scripts');
}

console.log('Database initialized successfully!');
db.close();
