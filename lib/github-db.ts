/**
 * GitHub-based JSON database
 *
 * 用 GitHub Contents API 將 data.json 當作資料庫使用
 * 優點: 免費、永久保存、有完整 commit 歷史
 * 缺點: 寫入較慢 (~500ms), 需注意併發衝突
 */

export interface Script {
  id: number;
  name: string;
  url: string;
  description: string;
  tags: string[];
  downloads: number;
  size_kb: number | null;
  version: string | null;
  status: 'active' | 'deprecated';
  created_at: string;
  updated_at: string;
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

export interface Database {
  version: number;
  scripts: Script[];
  comments: Comment[];
  reports: Report[];
  visits: {
    total: number;
    lastReset: string | null;
  };
}

const DEFAULT_DB: Database = {
  version: 1,
  scripts: [],
  comments: [],
  reports: [],
  visits: { total: 0, lastReset: null },
};

// 環境變數
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_REPO = process.env.GITHUB_REPO || 'yuang093/QXC';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const GITHUB_PATH = process.env.GITHUB_PATH || 'data/data.json';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'yuang093';

const GITHUB_API = 'https://api.github.com';

// 30 秒 in-memory cache 避免短時間內重複 GET
let cache: { data: Database; sha: string; ts: number } | null = null;
const CACHE_TTL = 30_000;

// 簡單 lock 防止併發寫入
let writeLock: Promise<any> = Promise.resolve();

interface GetResult {
  data: Database;
  sha: string;
}

async function githubGet(): Promise<GetResult> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return { data: cache.data, sha: cache.sha };
  }

  const url = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}?ref=${GITHUB_BRANCH}`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'QXC-Archive',
  };
  if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

  const res = await fetch(url, { headers, cache: 'no-store' });

  if (res.status === 404) {
    if (GITHUB_TOKEN) {
      await createInitialFile();
      return githubGet();
    }
    return { data: { ...DEFAULT_DB }, sha: '' };
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`GitHub GET ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const json = await res.json();
  // 避免 Buffer 在 Edge runtime 不存在, 用 atob
  const content = typeof atob === 'function'
    ? atob(json.content.replace(/\n/g, ''))
    : Buffer.from(json.content, 'base64').toString('utf-8');
  const data = JSON.parse(content) as Database;

  // 確保所有欄位存在
  data.scripts = data.scripts || [];
  data.comments = data.comments || [];
  data.reports = data.reports || [];
  data.visits = data.visits || { total: 0, lastReset: null };

  cache = { data, sha: json.sha, ts: Date.now() };
  return { data, sha: json.sha };
}

async function githubPut(data: Database, sha: string, message: string): Promise<string> {
  const url = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'QXC-Archive',
    'Content-Type': 'application/json',
  };
  if (GITHUB_TOKEN) headers['Authorization'] = `Bearer ${GITHUB_TOKEN}`;

  const body = {
    message,
    content: typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))))
      : Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64'),
    sha: sha || undefined,
    branch: GITHUB_BRANCH,
  };

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    // 409 = SHA 衝突, 重試一次
    if (res.status === 409) {
      cache = null;
      throw new Error('CONFLICT: 並發衝突，請重試');
    }
    throw new Error(`GitHub PUT failed: ${res.status} ${errText}`);
  }

  const json = await res.json();
  // 清除 cache
  cache = { data, sha: json.content.sha, ts: Date.now() };
  return json.content.sha;
}

async function createInitialFile() {
  const url = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'QXC-Archive',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
  };

  const body = {
    message: 'chore: initialize QXC database',
    content: typeof btoa === 'function'
      ? btoa(unescape(encodeURIComponent(JSON.stringify(DEFAULT_DB, null, 2))))
      : Buffer.from(JSON.stringify(DEFAULT_DB, null, 2), 'utf-8').toString('base64'),
    branch: GITHUB_BRANCH,
  };

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok && res.status !== 422) {
    // 422 = 檔案已存在，忽略
    const err = await res.text();
    throw new Error(`Init failed: ${res.status} ${err}`);
  }
}

// ========== Public API ==========

export async function getDb(): Promise<Database> {
  const { data } = await githubGet();
  return data;
}

export async function saveDb(data: Database, message: string): Promise<void> {
  // 序列化寫入避免併發衝突
  const next = writeLock.then(async () => {
    cache = null; // 強制重抓
    const { sha } = await githubGet();
    await githubPut(data, sha, message);
  });
  writeLock = next;
  return next as Promise<void>;
}

export async function withDb<T>(fn: (db: Database) => Promise<{ result: T; message: string; }>): Promise<T> {
  // 序列化的 read-modify-write
  const next = writeLock.then(async () => {
    const { data, sha } = await githubGet();
    const { result, message } = await fn(data);
    await githubPut(data, sha, message);
    cache = { data, sha: '', ts: 0 }; // 立即過期
    return result;
  });
  writeLock = next;
  return next as Promise<T>;
}

export function checkAdmin(key: string | null): boolean {
  return key === ADMIN_PASSWORD;
}

export function getConfigStatus() {
  return {
    hasToken: !!GITHUB_TOKEN,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH,
    path: GITHUB_PATH,
  };
}
