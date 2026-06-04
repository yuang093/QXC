'use client';

import { useEffect, useState } from 'react';
import { Script } from '@/lib/db';
import ScriptCard from '@/components/ScriptCard';
import EditModal from '@/components/EditModal';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTag, setActiveTag] = useState('ALL');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [sort, setSort] = useState<'newest' | 'downloads' | 'name' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Script | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPwd, setAdminPwd] = useState('');
  const [adminError, setAdminError] = useState('');
  const [visits, setVisits] = useState({ total: 0, today: 0, last7: 0 });

  const PER_PAGE = 10;

  // 記錄訪問
  useEffect(() => {
    fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/' }),
    }).catch(() => {});
    // 取得訪問統計
    fetch('/api/visit').then(r => r.json()).then(setVisits).catch(() => {});
  }, []);

  // 檢查管理員狀態
  useEffect(() => {
    const key = localStorage.getItem('qxc-admin-key');
    if (key) setIsAdmin(true);
  }, []);

  // 搜尋 debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // 載入資料
  const loadScripts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedSearch,
        tag: activeTag,
        sort,
        page: String(page),
        limit: String(PER_PAGE),
      });
      const res = await fetch(`/api/scripts?${params}`);
      const data = await res.json();
      setScripts(data.scripts || []);
      setAllTags(data.tags || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScripts();
  }, [debouncedSearch, activeTag, sort, page]);

  const handleAdminLogin = async () => {
    setAdminError('');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPwd }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('qxc-admin-key', adminPwd);
        setIsAdmin(true);
        setShowAdminLogin(false);
        setAdminPwd('');
      } else {
        setAdminError(data.error || '登入失敗');
      }
    } catch {
      setAdminError('連線失敗');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('qxc-admin-key');
    setIsAdmin(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('確定刪除此腳本? (含所有留言)')) return;
    await fetch(`/api/scripts/${id}`, { method: 'DELETE' });
    loadScripts();
  };

  const handleEdit = (s: Script) => {
    setEditing(s);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditing(null);
    setIsModalOpen(true);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('匯入 CSV 將清空現有資料，確定繼續?')) {
      e.target.value = '';
      return;
    }
    const csv = await file.text();
    const key = localStorage.getItem('qxc-admin-key') || '';
    const res = await fetch(`/api/csv?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csv,
    });
    const data = await res.json();
    if (data.ok) {
      alert(`成功匯入 ${data.inserted} 筆資料`);
      loadScripts();
    } else {
      alert('匯入失敗: ' + (data.error || ''));
    }
    e.target.value = '';
  };

  const handleExport = () => {
    window.open('/api/csv', '_blank');
  };

  return (
    <div className="py-8 px-4">
      <div className="window">
        {/* Title bar */}
        <div className="titlebar">
          <div className="font-screen font-bold text-ink text-sm tracking-wide">
            ⚡ QXC.exe — Python Script Archive
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex gap-1.5">
              <div className="w-4 h-4 rounded-full border-2 border-ink bg-cream"></div>
              <div className="w-4 h-4 rounded-full border-2 border-ink bg-[#6bcb77]"></div>
              <div className="w-4 h-4 rounded-full border-2 border-ink bg-[#ff5e7e]"></div>
            </div>
          </div>
        </div>

        {/* Top section: logo + stats + actions */}
        <div className="bg-mint dark:bg-[#1a1f2e] border-b-[3px] border-ink p-6">
          <div className="grid md:grid-cols-[1fr_2fr_1fr] gap-6 items-center">
            <div>
              <h1 className="font-pixel text-3xl text-ink dark:text-cream leading-none" style={{ textShadow: '3px 3px 0 #ff9eb5' }}>
                QXC
              </h1>
              <div className="font-mono text-[10px] text-ink/60 dark:text-cream/60 mt-2">
                // ARCHIVE.SYS
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <StatBubble label="FILES" value={total} />
              <StatBubble label="VISITS" value={visits.total} />
              <StatBubble label="TODAY" value={visits.today} accent="pink" />
              <StatBubble label="7-DAYS" value={visits.last7} accent="purple" />
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleNew} className="btn-retro btn-primary-retro">
                + NEW LINK
              </button>
              {isAdmin ? (
                <>
                  <button onClick={handleExport} className="btn-retro text-[10px]">
                    📤 EXPORT CSV
                  </button>
                  <label className="btn-retro text-[10px] text-center cursor-pointer">
                    📥 IMPORT CSV
                    <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
                  </label>
                  <button onClick={handleLogout} className="btn-retro text-[10px]">
                    🚪 LOGOUT
                  </button>
                </>
              ) : (
                <button onClick={() => setShowAdminLogin(true)} className="btn-retro">
                  ⚙ ADMIN
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 bg-cream dark:bg-[#2a2438] border-b-[3px] border-ink flex gap-3 items-center">
          <label className="font-screen text-xs text-ink dark:text-cream">🔍 SEARCH:</label>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="type to search..."
            className="input-retro flex-1"
          />
          <select
            value={sort}
            onChange={e => { setSort(e.target.value as any); setPage(1); }}
            className="input-retro text-lg"
          >
            <option value="newest">NEWEST</option>
            <option value="oldest">OLDEST</option>
            <option value="downloads">MOST DOWNLOADS</option>
            <option value="name">NAME A→Z</option>
          </select>
        </div>

        {/* Tag filters */}
        <div className="px-4 py-3 bg-blue/40 dark:bg-blue/20 border-b-[3px] border-ink flex flex-wrap gap-2">
          <TagPill tag="ALL" active={activeTag === 'ALL'} onClick={() => { setActiveTag('ALL'); setPage(1); }} />
          {allTags.map(t => (
            <TagPill key={t} tag={t} active={activeTag === t} onClick={() => { setActiveTag(t); setPage(1); }} />
          ))}
        </div>

        {/* Cards */}
        <div className="p-4 md:p-6 bg-cream dark:bg-[#2a2438] min-h-[400px]">
          {loading ? (
            <div className="text-center font-vt text-2xl text-ink/60 dark:text-cream/60 py-12">
              ⏳ Loading...
            </div>
          ) : scripts.length === 0 ? (
            <div className="text-center font-vt text-2xl text-ink/60 dark:text-cream/60 py-12">
              (◞‸◟ㆀ) No scripts found.
            </div>
          ) : (
            <>
              {scripts.map(s => (
                <ScriptCard
                  key={s.id}
                  script={s}
                  isAdmin={isAdmin}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onRefresh={loadScripts}
                />
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="btn-retro text-[10px] disabled:opacity-30"
                  >
                    ← PREV
                  </button>
                  <span className="font-vt text-xl text-ink dark:text-cream">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="btn-retro text-[10px] disabled:opacity-30"
                  >
                    NEXT →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-purple text-ink border-t-[3px] border-ink p-3 text-center font-screen text-[10px] tracking-widest">
          ▶ MADE WITH ♥ // QXC.ARCHIVE // © 2024-2026 // BUILD 2.4.1
        </div>
      </div>

      {/* Edit modal */}
      {isModalOpen && (
        <EditModal
          script={editing}
          onClose={() => setIsModalOpen(false)}
          onSave={loadScripts}
        />
      )}

      {/* Admin login modal */}
      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="window w-full max-w-md">
            <div className="titlebar">
              <span className="font-screen text-xs text-ink font-bold">🔐 ADMIN LOGIN</span>
              <button onClick={() => setShowAdminLogin(false)} className="font-mono text-xs text-ink">[X]</button>
            </div>
            <div className="p-6 bg-cream dark:bg-[#2a2438]">
              <h2 className="font-pixel text-base text-ink dark:text-cream mb-4">ENTER PASSWORD</h2>
              <input
                type="password"
                value={adminPwd}
                onChange={e => setAdminPwd(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                className="input-retro w-full mb-2"
                placeholder="••••••••"
                autoFocus
              />
              {adminError && <p className="font-mono text-xs text-red-600 mb-2">❌ {adminError}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAdminLogin(false)} className="btn-retro text-[10px]">CANCEL</button>
                <button onClick={handleAdminLogin} className="btn-retro btn-primary-retro text-[10px]">UNLOCK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBubble({ label, value, accent }: { label: string; value: number; accent?: 'pink' | 'purple' }) {
  const bg = accent === 'pink' ? '!bg-pink' : accent === 'purple' ? '!bg-purple' : '';
  return (
    <div className={`stat-bubble min-w-[100px] ${bg}`}>
      <div className="font-vt text-3xl text-ink dark:text-cream leading-none">{value.toLocaleString()}</div>
      <div className="font-screen text-[9px] text-ink/80 dark:text-cream/80 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function TagPill({ tag, active, onClick }: { tag: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`pill-retro cursor-pointer ${active ? '!bg-pink' : ''}`}
    >
      {tag}
    </button>
  );
}
