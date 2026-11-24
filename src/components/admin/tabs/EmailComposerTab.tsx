'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, Mail, Save, Send, Trash2 } from 'lucide-react';

const DRAFT_KEY = 'dandoev_admin_email_draft_v1';
const templates = {
  application: { label: 'Application update', subject: 'Update on your DandoEv application', html: '<h2>Hello,</h2><p>We have an update on your DandoEv application.</p><p>Sign in to view the next step.</p><p>Regards,<br />DandoEv Team</p>' },
  payment: { label: 'Payment reminder', subject: 'DandoEv payment reminder', html: '<h2>Payment reminder</h2><p>This is a friendly reminder about your upcoming DandoEv payment.</p><p>Please sign in to review your repayment schedule.</p>' },
  announcement: { label: 'General announcement', subject: 'An update from DandoEv', html: '<h2>Hello from DandoEv</h2><p>We have an important update to share with you.</p>' },
};

export default function EmailComposerTab() {
  const [mode, setMode] = useState<'custom' | 'all_customers' | 'all_users'>('custom');
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (saved) { setMode(saved.mode || 'custom'); setRecipients(saved.recipients || ''); setSubject(saved.subject || ''); setHtml(saved.html || ''); }
    } catch { /* Ignore malformed local drafts. */ }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => localStorage.setItem(DRAFT_KEY, JSON.stringify({ mode, recipients, subject, html })), 300);
    return () => window.clearTimeout(timer);
  }, [mode, recipients, subject, html]);

  const recipientList = useMemo(() => recipients.split(/[\s,;]+/).map((email) => email.trim()).filter(Boolean), [recipients]);
  const applyTemplate = (key: keyof typeof templates) => { setSubject(templates[key].subject); setHtml(templates[key].html); setNotice({ text: 'Template loaded. You can edit it before sending.' }); };
  const clearDraft = () => { setRecipients(''); setSubject(''); setHtml(''); localStorage.removeItem(DRAFT_KEY); setNotice({ text: 'Draft cleared.' }); };
  const send = async () => {
    setSending(true); setNotice(null);
    try {
      const response = await fetch('/api/admin/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientMode: mode, recipients: recipientList, subject, html }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to send email.');
      setNotice({ text: `Sent to ${data.sent} recipient${data.sent === 1 ? '' : 's'}${data.failed ? `; ${data.failed} failed` : ''}.` });
      if (!data.failed) clearDraft();
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : 'Unable to send email.', error: true }); }
    finally { setSending(false); }
  };

  return <section className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#168A91]">Communications</p><h2 className="mt-1 text-2xl font-black text-[#0A1B46]">Compose email</h2><p className="mt-1 text-sm text-slate-600">Create a message, save a draft automatically, and send through the verified Resend sender.</p></div><div className="flex gap-2"><button onClick={() => setPreview(!preview)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"><Eye className="h-4 w-4" />{preview ? 'Edit' : 'Preview'}</button><button onClick={clearDraft} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-bold text-rose-700"><Trash2 className="h-4 w-4" />Clear draft</button></div></div>
    {notice && <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${notice.error ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{notice.text}</div>}
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-2xl border border-[#CDE7F7] bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[#0A1B46]"><Mail className="h-5 w-5" /><h3 className="font-extrabold">Message details</h3><span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Save className="h-3.5 w-3.5" />Draft autosaves</span></div>
        <label className="block text-sm font-bold text-slate-700">Template<select onChange={(e) => e.target.value && applyTemplate(e.target.value as keyof typeof templates)} defaultValue="" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium"><option value="">Start from a template…</option>{Object.entries(templates).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
        <label className="block text-sm font-bold text-slate-700">Recipients<select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-medium"><option value="custom">Specific recipients</option><option value="all_customers">All customer accounts (max 500)</option><option value="all_users">All user accounts (max 500)</option></select></label>
        {mode === 'custom' && <label className="block text-sm font-bold text-slate-700">Email addresses<span className="mt-1 block text-xs font-normal text-slate-500">Separate addresses with commas, spaces, or new lines.</span><textarea value={recipients} onChange={(e) => setRecipients(e.target.value)} rows={3} placeholder="customer@example.com" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-medium outline-none focus:border-[#168A91]" /></label>}
        <label className="block text-sm font-bold text-slate-700">Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} placeholder="Your email subject" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-medium outline-none focus:border-[#168A91]" /></label>
        {!preview ? <label className="block text-sm font-bold text-slate-700">Message HTML<textarea value={html} onChange={(e) => setHtml(e.target.value)} rows={14} placeholder="Write your message or use a template…" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-3 font-mono text-sm outline-none focus:border-[#168A91]" /></label> : <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><iframe title="Email preview" srcDoc={html || '<p style="font-family:Arial">Nothing to preview yet.</p>'} sandbox="" className="h-[360px] w-full rounded-lg bg-white" /></div>}
        <button disabled={sending || !subject.trim() || !html.trim() || (mode === 'custom' && recipientList.length === 0)} onClick={send} className="inline-flex items-center gap-2 rounded-xl bg-[#0A1B46] px-5 py-3 font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />{sending ? 'Sending…' : 'Send email'}</button>
      </div>
      <aside className="rounded-2xl border border-[#CDE7F7] bg-[#F4FBFF] p-5 shadow-sm"><h3 className="font-extrabold text-[#0A1B46]">Delivery safeguards</h3><ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600"><li>• Only authorized admin roles can send.</li><li>• Recipient addresses are deduplicated before dispatch.</li><li>• Each delivery is reported individually so failures can be retried.</li><li>• Drafts remain in this browser until cleared.</li><li>• Resend must have a verified sender/domain for production recipients.</li></ul></aside>
    </div>
  </section>;
}
