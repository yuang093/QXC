// 把預設 8 筆資料寫入 Firebase Realtime Database
// 使用方式: node scripts/seed-firebase.js
//
// 注意: 預設 Firebase 規則是 test mode, 任何人都能寫入
// 正式環境建議在 Firebase Console 設定安全規則

const FIREBASE_URL = process.env.FIREBASE_URL || 'https://qxc-archive-default-rtdb.asia-southeast1.firebasedatabase.app';

const seedData = {
  scripts: {
    '1': {
      id: 1, name: 'amV11.py',
      url: 'https://github.com/yuang093/QXC/raw/main/scripts/amV11.py',
      description: 'SPX 早盤賣方策略，於開盤前 15 分鐘自動掛單，根據 IV percentile 動態調整 strike distance。',
      tags: ['SPX', 'MORNING', 'SPX-AM'],
      downloads: 247, size_kb: 14.2, version: 'v11', status: 'active',
      created_at: '2026-05-30T14:22:00Z', updated_at: '2026-05-30T14:22:00Z',
    },
    '2': {
      id: 2, name: 'REAL_QQQV7.py',
      url: 'https://github.com/yuang093/QXC/raw/main/scripts/REAL_QQQV7.py',
      description: 'QQQ 戰術五口層級輪動策略，五層 Layer 狀態機管理完整生命週期。',
      tags: ['QQQ', '5-LAYER', 'LAYERED'],
      downloads: 412, size_kb: 28.7, version: 'v7', status: 'active',
      created_at: '2026-05-28T09:14:00Z', updated_at: '2026-05-28T09:14:00Z',
    },
    '3': {
      id: 3, name: 'bps2V7.py',
      url: 'https://github.com/yuang093/QXC/raw/main/scripts/bps2V7.py',
      description: 'SPX 波段操作策略。透過 20/50 日均線黃金交叉判斷進場，動態調整倉位大小。',
      tags: ['SPX', 'SWING'],
      downloads: 189, size_kb: 19.1, version: 'v7', status: 'active',
      created_at: '2026-05-25T16:48:00Z', updated_at: '2026-05-25T16:48:00Z',
    },
    '4': {
      id: 4, name: 'bcsV6.py',
      url: 'https://github.com/yuang093/QXC/raw/main/scripts/bcsV6.py',
      description: 'SPX 靜態備兌看漲策略，固定 strike 與到期日。',
      tags: ['SPX', 'BCS', 'STATIC'],
      downloads: 156, size_kb: 11.8, version: 'v6', status: 'active',
      created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-20T10:00:00Z',
    },
    '5': {
      id: 5, name: 'REAL_SMHV5.py',
      url: 'https://github.com/yuang093/QXC/raw/main/scripts/REAL_SMHV5.py',
      description: 'SMH 半導體 ETF 戰術五口層級輪動策略。',
      tags: ['SMH', '5-LAYER', 'SEMICONDUCTOR'],
      downloads: 203, size_kb: 26.4, version: 'v5', status: 'active',
      created_at: '2026-05-22T11:30:00Z', updated_at: '2026-05-22T11:30:00Z',
    },
    '6': {
      id: 6, name: 'bcs_dynamic_1500V7.py',
      url: 'https://github.com/yuang093/QXC/raw/main/scripts/bcs_dynamic_1500V7.py',
      description: 'SPX 動態備兌看漲策略，動態調整 strike 與倉位。',
      tags: ['SPX', 'BCS', 'DYNAMIC'],
      downloads: 178, size_kb: 22.1, version: 'v7', status: 'active',
      created_at: '2026-05-19T13:15:00Z', updated_at: '2026-05-19T13:15:00Z',
    },
    '7': {
      id: 7, name: 'pmV6.py',
      url: 'https://github.com/yuang093/QXC/raw/main/scripts/pmV6.py',
      description: '【策略本質】SPX 0DTE Iron Condor 下午盤賣方機器人（async/await 架構、繼承自 pmV5）。在 SPY 溫和上漲趨勢下，於美東 15:00-15:30 間以 5 分鐘間隔（共 6 個時段）建立當日到期（0DTE）的 4 腿 Iron Condor 價差組合，賺取時間衰減權利金。【結構】4 腿：Short Put（Δ≈-0.35）+ Long Put（−80 點）+ Short Call（ATM+10）+ Long Call（+80 點），Put 價差 + Call 價差各賺一筆 credit。【寬度/口數】WING_WIDTH=80 點、每腿 QTY=1 口、Tick=0.05、STOP_TICK=0.10。【進場時程】美東 15:00/15:10/15:15/15:20/15:25/15:30 共 6 個時段，ALLOWED_WEEKDAYS={0,1,2,3,4} 週一至週五；scheduler 自動計算下次進場時間並 sleep 等待。【連線/帳號】ClientID=402、Port=7497、SPX/SPXW、MULTIPLIER=100、QUOTE_EXCHANGE=CBOE、ORDER_EXCHANGE=SMART、ACCOUNT=DUOXXXXXX；啟動時 ensure_connected() 檢查連線，reqMarketDataType(3) 取得延遲報價。【履約價邏輯】find_strikes_by_delta()：以 ATM 為中心 ±300 點、5 點間隔建出候選 Put 合約（MIN_DELTA_SEARCH=10 個），訂閱 market data 取得 modelGreeks，等候 15 秒後取最接近 TARGET_DELTA=-0.35 的 Short Put；Short Call 固定 ATM+10；Delta 搜尋失敗則 fallback 至 near5(ATM) ± WING_WIDTH 固定寬度。【趨勢濾網】check_trend_filter()：取得 SPY 即時報價 + SMA7（reqHistoricalDataAsync 取 2 個月日線），兩條件必須同時成立才進場：(1) SPY > SMA7、(2) SPY 漲幅 ≤ TREND_UPPER_PCT=2.0%，超標視為趨勢過強主動跳過並記錄原因。【下單流程】分腿下單「先 HEDGE 再 SHORT」嚴格順序：先 exec_buy_hedge() 買 Long Put/Call（限價 = ask + attempt×HEDGE_SLIP），等成交 40×0.5 秒；成交後才 exec_sell_short() 賣 Short 腿（限價 = min(theoretical, mid) + max(0.05, bid)）；若 Short 失敗自動反向平倉已買的 Hedge 避免裸部位（LimitOrder 平倉）。【停損系統】每筆 Short 成交價 × STOP_MULT=1.80 登記為 STP BUY 停損單；SAVED_STOPS[conId] 字典儲存多層停損；register_stop_and_rebuild() 動態調整停損單數量（與短部位匹配）；啟動時 sync_all_spxw_stops() 掃描所有 SPXW 空單自動補上停損（avgCost/MULTIPLIER × 1.8 推算）。【Retry】HEDGE_RETRIES=3、SHORT_RETRIES=3、HEDGE_SLIP=0.10（買加價）、SHORT_STEP=0.10（賣降價）、CREDIT_SLIP=0.10；每次等待 40×0.5=20 秒後取消重試。【風控】(1) 啟動 close_all_spx_positions() 市價清倉 SPX 殘留部位；(2) cancel_conflicts_for() 下單前取消對沖合約所有未成交單防重複；(3) cancel_all_stops_for() 平倉時自動撤 STOP；(4) on_error() 分級處理 IB 錯誤（10090/10167/2104/2106/2158 忽略，2000+ warning、其他 error）。【改進】相較 pmV5 三項強化：(1) 加入 Delta 動態選價取代固定 near5；(2) 新增 SAVED_STOPS 多層停損字典與 rebuild_stops_for 機制；(3) 啟動 sync_all_spxw_stops() 全域停損補單。【總結】午後溫和多頭環境的 SPX 0DTE Iron Condor 賣方機器人：以 Delta=-0.35 動態鎖定 Put 主力、80 點固定翼寬控制風險、1.8× 權利金硬停損防止末日崩盤暴損；分腿下單「先買保險再賣主力」確保部位結構乾淨不裸，Hedge 失敗時反向平倉保護資本；趨勢濾網避開強勢行情，sync_all_stops 啟動補單機制應對隔夜斷線重連；6 個時段分散進場降低時機風險，整體設計兼顧系統性、時間衰效率與極端行情存活率。',
      tags: ['SPX', 'AFTERNOON', 'PM', '0DTE', 'IRON-CONDOR'],
      downloads: 134, size_kb: 16.5, version: 'v6', status: 'active',
      created_at: '2026-06-04T13:00:00Z', updated_at: '2026-06-04T13:00:00Z',
    },
    '8': {
      id: 8, name: 'monitor_utils.py',
      url: 'https://github.com/yuang093/QXC/raw/main/scripts/monitor_utils.py',
      description: '倉位監控工具集合，支援 IB API 即時倉位查詢與異常告警。',
      tags: ['UTIL', 'MONITOR'],
      downloads: 89, size_kb: 8.3, version: 'v1', status: 'active',
      created_at: '2026-05-15T09:00:00Z', updated_at: '2026-05-15T09:00:00Z',
    },
  },
  comments: {},
  reports: {},
  visits: { total: 8247, lastReset: null },
};

async function main() {
  console.log('Seeding Firebase Realtime Database at:', FIREBASE_URL);
  for (const [key, value] of Object.entries(seedData)) {
    const url = `${FIREBASE_URL}/${key}.json`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
    if (!res.ok) {
      console.error(`Failed to seed ${key}:`, res.status, await res.text());
      process.exit(1);
    }
    console.log(`[OK] ${key}: ${Array.isArray(value) ? value.length : Object.keys(value).length} items`);
  }
  console.log('\nDone! Visit https://qxc-five.vercel.app to see the data.');
}

main().catch(e => { console.error(e); process.exit(1); });
