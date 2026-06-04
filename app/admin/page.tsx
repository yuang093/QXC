'use client';

import { useEffect, useState } from 'react';

interface Report {
  id: number;
  script_id: number;
  script_name: string | null;
  reason: string;
  created_at: string;
}

export default function AdminPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const k = localStorage.getItem('qxc-admin-key') || '';
    if (k) {
      setKey(k);
      loadReports(k);
      setAuthed(true);
    }
  }, []);

  const loadReports = async (k: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report?key=${encodeURIComponent(k)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setAuthed(false);
      } else {
        setReports(data.reports || []);
      }
    } catch (e) {
      setError('連線失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (!key) return;
    loadReports(key).then(() => {
      localStorage.setItem('qxc-admin-key', key);
      setAuthed(true);
    });
  };

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="window w-full max-w-md">
          <div className="titlebar">
            <span className="font-screen text-xs font-bold text-ink">🔐 ADMIN</span>
          </div>
          <div className="p-6 bg-cream">
            <h2 className="font-pixel text-base mb-4">ENTER PASSWORD</h2>
            <input
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="input-retro w-full mb-2"
              autoFocus
            />
            {error && <p className="font-mono text-xs text-red-600 mb-2">{error}</p>}
            <button onClick={handleLogin} className="btn-retro btn-primary-retro w-full">UNLOCK</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="window max-w-4xl mx-auto">
        <div className="titlebar">
          <span className="font-screen text-xs font-bold text-ink">📊 ADMIN DASHBOARD</span>
          <a href="/" className="font-mono text-xs text-ink hover:underline">← Back to Home</a>
        </div>
        <div className="p-6 bg-cream">
          <h1 className="font-pixel text-xl mb-4 text-ink">📋 失效連結回報 ({reports.length})</h1>
          {loading ? (
            <p className="font-mono text-center py-8">⏳ Loading...</p>
          ) : reports.length === 0 ? (
            <p className="font-mono text-center py-8 text-ink/60">尚無回報</p>
          ) : (
            <div className="space-y-2">
              {reports.map(r => (
                <div key={r.id} className="card-retro !shadow-retro-sm !p-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-vt text-xl text-ink">{r.script_name || `Script #${r.script_id}`}</span>
                    <span className="font-mono text-[10px] text-ink/60">{r.created_at}</span>
                  </div>
                  <p className="font-mono text-sm text-ink/80">{r.reason || '(無原因)'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
