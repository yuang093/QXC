/**
 * Firebase Realtime Database wrapper
 * 透過 REST API 讀寫, 不需要 Firebase Admin SDK
 *
 * 優點: 免費、永久儲存、real-time 同步
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
  scripts: Record<string, Script>;  // key = id
  comments: Record<string, Comment>;
  reports: Record<string, Report>;
  visits: { total: number; lastReset: string | null };
}

const FIREBASE_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
  || 'https://qxc-archive-default-rtdb.asia-southeast1.firebasedatabase.app';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'yuang093';

const DEFAULT_DB: Database = {
  scripts: {},
  comments: {},
  reports: {},
  visits: { total: 0, lastReset: null },
};

// 30 秒 in-memory cache
let cache: { data: Database; ts: number } | null = null;
const CACHE_TTL = 30_000;

// 簡單 lock 防止併發寫入
let writeLock: Promise<any> = Promise.resolve();

// ========== HTTP helpers ==========

async function firebaseGet<T>(path: string): Promise<T | null> {
  const url = `${FIREBASE_URL}/${path}.json`;
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firebase GET ${path} failed: ${res.status}`);
  return res.json();
}

async function firebasePut(path: string, data: any): Promise<void> {
  const url = `${FIREBASE_URL}/${path}.json`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase PUT ${path} failed: ${res.status} ${await res.text()}`);
}

async function firebasePatch(path: string, data: any): Promise<void> {
  const url = `${FIREBASE_URL}/${path}.json`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Firebase PATCH ${path} failed: ${res.status}`);
}

async function firebaseDelete(path: string): Promise<void> {
  const url = `${FIREBASE_URL}/${path}.json`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Firebase DELETE ${path} failed: ${res.status}`);
}

// ========== Database operations ==========

async function loadDb(): Promise<Database> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return cache.data;
  }
  // Realtime Database 是 NoSQL, 每個 collection 一個 endpoint
  const [scripts, comments, reports, visits] = await Promise.all([
    firebaseGet<Record<string, Script>>('scripts'),
    firebaseGet<Record<string, Comment>>('comments'),
    firebaseGet<Record<string, Report>>('reports'),
    firebaseGet<{ total: number; lastReset: string | null }>('visits'),
  ]);

  const data: Database = {
    scripts: scripts || {},
    comments: comments || {},
    reports: reports || {},
    visits: visits || { total: 0, lastReset: null },
  };

  cache = { data, ts: Date.now() };
  return data;
}

function invalidateCache() {
  cache = null;
}

export async function getDb(): Promise<Database> {
  return loadDb();
}

export async function withDb<T>(fn: (db: Database) => Promise<{ result: T; message?: string; }>): Promise<T> {
  const next = writeLock.then(async () => {
    const db = await loadDb();
    const { result } = await fn(db);
    // 寫回所有變更的部分
    await Promise.all([
      firebasePut('scripts', db.scripts),
      firebasePut('comments', db.comments),
      firebasePut('reports', db.reports),
      firebasePut('visits', db.visits),
    ]);
    invalidateCache();
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
    firebaseUrl: FIREBASE_URL,
  };
}
