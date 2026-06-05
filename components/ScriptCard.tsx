'use client';

import { useState } from 'react';
import { Script, Comment } from '@/lib/firebase-db';

interface ScriptCardProps {
  script: Script;
  isAdmin: boolean;
  onEdit: (s: Script) => void;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

export default function ScriptCard({ script, isAdmin, onEdit, onDelete, onRefresh }: ScriptCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportText, setReportText] = useState('');

  const rawTags: any = script.tags;
  const tags: string[] = Array.isArray(rawTags)
    ? rawTags
    : (typeof rawTags === 'string' ? rawTags.split(',').map(t => t.trim()).filter(Boolean) : []);

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/download/${script.id}`, { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
        onRefresh();
      }
    } catch (e) {
      alert('下載失敗，請稍後再試');
    }
  };

  const loadComments = async () => {
    if (comments.length > 0) {
      setExpanded(!expanded);
      return;
    }
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/comments/${script.id}`);
      const data = await res.json();
      setComments(data.comments || []);
    } finally {
      setLoadingComments(false);
      setExpanded(true);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/comments/${script.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, author: author.trim() || 'Anonymous' }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments([{
          id: data.id,
          script_id: script.id,
          author: author.trim() || 'Anonymous',
          content: newComment,
          created_at: new Date().toISOString(),
        }, ...comments]);
        setNewComment('');
        setAuthor('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!confirm('刪除此留言?')) return;
    const adminKey = localStorage.getItem('qxc-admin-key');
    await fetch(`/api/comments/${script.id}?key=${encodeURIComponent(adminKey || '')}`, {
      method: 'DELETE',
      headers: { 'X-Comment-Id': String(commentId) },
    });
    setComments(comments.filter(c => c.id !== commentId));
  };

  const submitReport = async () => {
    const res = await fetch(`/api/report/${script.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reportText }),
    });
    if (res.ok) {
      alert('已回報失效連結，感謝您的協助！');
      setReportText('');
      setReporting(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toISOString().slice(0, 10);
    } catch {
      return s;
    }
  };

  return (
    <div className="card-retro mb-5">
      {script.downloads > 300 && <div className="sticker">★ HOT</div>}
      {script.status === 'deprecated' && <div className="sticker !bg-gray-400 !text-white">OLD</div>}

      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-vt text-3xl text-ink dark:text-cream leading-tight">
            📄 {script.name}
          </h2>
          <div className="font-mono text-[11px] text-ink/60 dark:text-cream/60 mt-1">
            {formatDate(script.created_at)} {script.size_kb ? `// ${script.size_kb}KB` : ''} {script.version ? `// ${script.version}` : ''}
          </div>
        </div>
      </div>

      <p className="font-mono text-sm text-ink/80 dark:text-cream/80 leading-relaxed mb-3">
        {script.description}
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {tags.map(t => (
          <span key={t} className="pill-retro">{t}</span>
        ))}
        {tags.length > 0 && tags[0] && (
          <span className="pill-retro !bg-purple !text-white">{tags[0]}</span>
        )}
        <div className="flex-1"></div>
        <span className="font-vt text-xl text-ink dark:text-cream">↓ {script.downloads} dl</span>
        <button onClick={handleDownload} className="btn-retro btn-primary-retro">
          ⬇ DOWNLOAD
        </button>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t-2 border-dashed border-ink/30">
        <button onClick={loadComments} className="font-mono text-xs text-ink/70 dark:text-cream/70 hover:underline">
          💬 {expanded ? '隱藏留言' : `留言 (${comments.length})`}
        </button>
        <span className="text-ink/30">|</span>
        <button onClick={() => setReporting(!reporting)} className="font-mono text-xs text-ink/70 dark:text-cream/70 hover:underline">
          ⚠ 回報失效連結
        </button>
        {isAdmin && (
          <>
            <span className="text-ink/30">|</span>
            <button onClick={() => onEdit(script)} className="font-mono text-xs text-blue-600 hover:underline">
              ✏ 編輯
            </button>
            <span className="text-ink/30">|</span>
            <button onClick={() => onDelete(script.id)} className="font-mono text-xs text-red-600 hover:underline">
              🗑 刪除
            </button>
          </>
        )}
      </div>

      {reporting && (
        <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-ink rounded">
          <p className="font-mono text-xs mb-2 text-ink dark:text-cream">回報此連結失效 (選填原因):</p>
          <textarea
            value={reportText}
            onChange={e => setReportText(e.target.value)}
            className="input-retro w-full text-base mb-2"
            rows={2}
            placeholder="例如: 404 Not Found..."
          />
          <div className="flex gap-2">
            <button onClick={submitReport} className="btn-retro btn-primary-retro text-[10px]">送出</button>
            <button onClick={() => setReporting(false)} className="btn-retro text-[10px]">取消</button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-3 p-3 bg-blue/20 dark:bg-blue/10 border-2 border-ink rounded">
          <h3 className="font-screen text-xs text-ink dark:text-cream mb-2">💬 留言 ({comments.length})</h3>

          <div className="mb-3 p-2 bg-cream dark:bg-[#1a1a2e] border-2 border-ink rounded">
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="你的名稱 (Anonymous)"
              className="input-retro w-full text-base mb-2"
              maxLength={50}
            />
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="留言內容..."
              className="input-retro w-full text-base"
              rows={2}
              maxLength={1000}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="font-mono text-[10px] text-ink/60">{newComment.length}/1000</span>
              <button
                onClick={submitComment}
                disabled={!newComment.trim() || submitting}
                className="btn-retro btn-primary-retro text-[10px] disabled:opacity-50"
              >
                {submitting ? '送出中...' : '送出留言'}
              </button>
            </div>
          </div>

          {loadingComments ? (
            <p className="font-mono text-xs text-center text-ink/60">載入中...</p>
          ) : comments.length === 0 ? (
            <p className="font-mono text-xs text-center text-ink/60 py-2">尚無留言</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {comments.map(c => (
                <div key={c.id} className="p-2 bg-white dark:bg-[#1a1a2e] border-2 border-ink/30 rounded">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-screen text-[10px] text-ink/80 dark:text-cream/80">@{c.author}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-ink/50">{formatDate(c.created_at)}</span>
                      {isAdmin && (
                        <button onClick={() => deleteComment(c.id)} className="font-mono text-[10px] text-red-600 hover:underline">刪除</button>
                      )}
                    </div>
                  </div>
                  <p className="font-mono text-sm text-ink dark:text-cream whitespace-pre-wrap break-words">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
