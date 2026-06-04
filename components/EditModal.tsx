'use client';

import { useState, useEffect } from 'react';
import { Script } from '@/lib/github-db';

interface EditModalProps {
  script: Script | null;
  onClose: () => void;
  onSave: () => void;
}

const emptyScript = {
  name: '',
  url: '',
  description: '',
  tags: '',
  size_kb: null as number | null,
  version: '',
  status: 'active' as 'active' | 'deprecated',
};

export default function EditModal({ script, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState({ ...emptyScript });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (script) {
      setForm({
        name: script.name,
        url: script.url,
        description: script.description,
        tags: script.tags,
        size_kb: script.size_kb,
        version: script.version || '',
        status: script.status as 'active' | 'deprecated',
      });
    } else {
      setForm({ ...emptyScript });
    }
  }, [script]);

  const handleSave = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      alert('名稱與連結為必填');
      return;
    }
    setSaving(true);
    try {
      if (script) {
        // 更新
        await fetch(`/api/scripts/${script.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        // 新增
        await fetch('/api/scripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      onSave();
      onClose();
    } catch (e) {
      alert('儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="window w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="titlebar">
          <span className="font-screen text-xs text-ink font-bold">
            ⚡ {script ? 'EDIT' : 'NEW'} SCRIPT.exe
          </span>
          <button onClick={onClose} className="font-mono text-xs font-bold text-ink hover:underline">
            [X CLOSE]
          </button>
        </div>
        <div className="p-6 bg-cream dark:bg-[#2a2438]">
          <h2 className="font-pixel text-lg text-ink dark:text-cream mb-4">
            {script ? `編輯: ${script.name}` : '新增腳本'}
          </h2>

          <div className="space-y-3">
            <Field label="程式名稱 *" value={form.name} onChange={v => setForm({ ...form, name: v })} />
            <Field label="下載連結 (URL) *" value={form.url} onChange={v => setForm({ ...form, url: v })} />
            <Field
              label="說明 (最多 3000 字)"
              value={form.description}
              onChange={v => setForm({ ...form, description: v.slice(0, 3000) })}
              textarea
              maxLength={3000}
            />
            <Field
              label="標籤 (以逗號分隔)"
              value={form.tags}
              onChange={v => setForm({ ...form, tags: v })}
              placeholder="SPX, MORNING, FUTURES"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="大小 (KB)"
                value={form.size_kb?.toString() || ''}
                onChange={v => setForm({ ...form, size_kb: v ? parseFloat(v) : null })}
                type="number"
              />
              <Field label="版本" value={form.version} onChange={v => setForm({ ...form, version: v })} />
            </div>
            <div>
              <label className="font-screen text-[10px] text-ink dark:text-cream block mb-1">狀態</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as any })}
                className="input-retro w-full text-lg"
              >
                <option value="active">ACTIVE</option>
                <option value="deprecated">DEPRECATED</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 mt-6 justify-end">
            <button onClick={onClose} className="btn-retro text-[10px]">CANCEL</button>
            <button onClick={handleSave} disabled={saving} className="btn-retro btn-primary-retro text-[10px]">
              {saving ? 'SAVING...' : '💾 SAVE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder = '', textarea = false, maxLength
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; textarea?: boolean; maxLength?: number }) {
  return (
    <div>
      <label className="font-screen text-[10px] text-ink dark:text-cream block mb-1 flex justify-between">
        <span>{label}</span>
        {maxLength && <span className="text-ink/50">{value.length}/{maxLength}</span>}
      </label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-retro w-full text-lg"
          rows={3}
          maxLength={maxLength}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="input-retro w-full"
          maxLength={maxLength}
        />
      )}
    </div>
  );
}
