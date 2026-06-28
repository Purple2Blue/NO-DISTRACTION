import { useEffect, useRef, useState } from 'react';
import { backendAPI } from './api/bridge';
import type { AppState } from './api/bridge';

// ── Types ───────────────────────────────────────────────────────────────────

interface Site {
  domain: string;
  active: boolean;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'warning';
  hiding: boolean;
}

interface Popover {
  domain: string;
  top: number;
  left: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseDomain(raw: string): string {
  return raw.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
}

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [sites, setSites]               = useState<Site[]>([]);
  const [masterActive, setMasterActive] = useState(true);
  const [newUrl, setNewUrl]             = useState('');
  const [toasts, setToasts]             = useState<Toast[]>([]);
  const [popover, setPopover]           = useState<Popover | null>(null);
  const [exitingDomain, setExitingDomain] = useState<string | null>(null);
  const [enteringDomain, setEnteringDomain] = useState<string | null>(null);

  const toastId     = useRef(0);
  const popoverRef  = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  // ── Load from Python backend ─────────────────────────────────────────────

  useEffect(() => {
    const load = () => {
      backendAPI.getInitialState().then((res: AppState | null) => {
        if (!res) return;
        // Adapt to your actual AppState shape from bridge.ts
        // Expected: { sites: {domain, active}[], master_active: boolean }
        const data = res as any;
        if (Array.isArray(data.sites))      setSites(data.sites);
        if (typeof data.master_active === 'boolean') setMasterActive(data.master_active);
        if (typeof data.is_active === 'boolean')     setMasterActive(data.is_active);
      });
    };

    if ((window as any).pywebview) {
      load();
    } else {
      window.addEventListener('pywebviewready', load);
      return () => window.removeEventListener('pywebviewready', load);
    }
  }, []);

  // ── Close popover on outside click ──────────────────────────────────────

  useEffect(() => {
    if (!popover) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    const tid = setTimeout(() => document.addEventListener('mousedown', handler), 10);
    return () => {
      clearTimeout(tid);
      document.removeEventListener('mousedown', handler);
    };
  }, [popover]);

  // ── Toast ────────────────────────────────────────────────────────────────

  const showToast = (message: string, type: 'success' | 'warning' = 'success') => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, message, type, hiding: false }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, hiding: true } : t));
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 400);
    }, 3000);
  };

  // ── Master toggle ────────────────────────────────────────────────────────

  const handleMasterToggle = (active: boolean) => {
    setMasterActive(active);
    setSites(prev => prev.map(s => ({ ...s, active })));

    // TODO: wire to backend
    // backendAPI.setMasterActive?.(active);

    if (active) {
      showToast('Focus Mode enabled');
      setTimeout(() => showToast('Restart browser to apply changes', 'warning'), 1500);
    }
  };

  // ── Per-site toggle ──────────────────────────────────────────────────────

  const handleSiteToggle = (domain: string, active: boolean) => {
    setSites(prev => prev.map(s => s.domain === domain ? { ...s, active } : s));
    // TODO: wire to backend
    // backendAPI.toggleSite?.(domain, active);
  };

  // ── Delete flow ──────────────────────────────────────────────────────────

  const handleDeleteClick = (domain: string, btn: HTMLButtonElement) => {
    const rect = btn.getBoundingClientRect();
    setPopover({ domain, top: rect.top - 10, left: rect.left - 275 });
  };

  const handleDeleteConfirm = (domain: string) => {
    setPopover(null);
    setExitingDomain(domain);
    setTimeout(() => {
      setSites(prev => prev.filter(s => s.domain !== domain));
      setExitingDomain(null);
      showToast('Website removed');
      // TODO: wire to backend
      // backendAPI.removeSite?.(domain);
    }, 500);
  };

  // ── Add site ─────────────────────────────────────────────────────────────

  const handleAddSite = () => {
    const domain = parseDomain(newUrl);
    if (!domain) return;
    if (sites.find(s => s.domain === domain)) {
      showToast('Already in your list', 'warning');
      return;
    }
    const newSite: Site = { domain, active: masterActive };
    setSites(prev => [newSite, ...prev]);
    setEnteringDomain(domain);
    setTimeout(() => setEnteringDomain(null), 400);
    setNewUrl('');
    showToast('Website added');
    inputRef.current?.focus();
    // TODO: wire to backend
    // backendAPI.addSite?.(domain);
  };

  // ── Window controls ──────────────────────────────────────────────────────

  const minimize = () => (window as any).pywebview?.api?.minimize?.();
  const close    = () => (window as any).pywebview?.api?.close?.();

  // ── Derived state ────────────────────────────────────────────────────────

  const activeCount = sites.filter(s => s.active).length;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-[600px] h-[780px] mx-auto mica-surface flex flex-col fluent-shadow relative border border-white/5 select-none font-['Inter']">

      {/* ── Toast Stack ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-3 z-[1000] pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast-notification ${t.hiding ? 'toast-hide' : ''} pointer-events-auto px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/10 min-w-[280px]`}
          >
            <span className={`material-symbols-outlined text-[20px] ${t.type === 'warning' ? 'text-amber-400' : 'text-green-400'}`}>
              {t.type === 'warning' ? 'warning' : 'check_circle'}
            </span>
            <span className="text-[13px] text-on-surface font-medium flex-1">{t.message}</span>
          </div>
        ))}
      </div>

      {/* ── Delete Confirmation Popover ───────────────────────────────────── */}
      {popover && (
        <div
          ref={popoverRef}
          className="fixed z-[101] w-[260px] bg-surface-container-high border border-white/10 rounded-2xl shadow-2xl p-6 popover-animate"
          style={{ top: popover.top, left: popover.left }}
        >
          <h4 className="text-[16px] text-on-surface font-semibold">Remove website?</h4>
          <p className="text-[13px] text-on-surface-variant mt-1 leading-relaxed">
            This website will be removed from your blocked list.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setPopover(null)}
              className="flex-1 h-9 rounded-xl border border-white/10 hover:bg-white/5 text-on-surface text-[13px] font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteConfirm(popover.domain)}
              className="flex-1 h-9 rounded-xl bg-red-500 text-white text-[13px] font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* ── Title Bar ────────────────────────────────────────────────────── */}
      <header className="z-20 flex justify-between items-center w-full bg-background/60 backdrop-blur-2xl border-b border-white/5 shrink-0">
        <div className="flex items-center gap-4 px-6 py-4">
          {/* Replace this src with your actual app icon in /assets/ */}
          <img
            alt="Focus Mode"
            className="w-9 h-9 rounded-xl shadow-lg"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkRw7Ovp9XOebr0Tdi5shCzVb4W7mBLCjT8n8vlugv7GTrchU55xuoQePDSwBuvNCXmEzto4DbuKDtYnipUHtoaqfn_9TOP2NAnYJ8ZioJWErycDwkJzqKdnerNp3Xn85kA2s21Q0ZFvZ5pTynypZoV3LHN4bqfzLfx8SVCdaQ_p_jI0-ZO7rLRgRHi6IJgdFue_eeI3dLOUdkphLWSwoEfNQodbGvBuvmDmZvKphNmxrCTxVa8bSMaYk6dnywkQn4Lz5443ZtPMU"
          />
          <div>
            <h1 className="text-[20px] text-on-surface font-semibold leading-tight">Focus Mode</h1>
            <span className="text-[12px] text-on-surface-variant opacity-60">Stay focused. Block distractions.</span>
          </div>
        </div>

        {/* Windows-style controls */}
        <div className="flex items-start h-full">
          <div className="window-control text-on-surface-variant" onClick={minimize}>
            <span className="material-symbols-outlined text-[16px]">minimize</span>
          </div>
          <div className="window-control text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">check_box_outline_blank</span>
          </div>
          <div className="window-control close text-on-surface-variant" onClick={close}>
            <span className="material-symbols-outlined text-[18px]">close</span>
          </div>
        </div>
      </header>

      {/* ── Scrollable Content ────────────────────────────────────────────── */}
      <div className="z-10 flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-8">

        {/* Hero Card */}
        <section
          className={`hero-card state-transition rounded-2xl p-7 flex items-center justify-between border ${
            masterActive
              ? 'bg-surface-bright border-primary/30'
              : 'bg-surface-container-low border-white/10'
          }`}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`state-transition px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border ${
                  masterActive
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-white/5 text-on-surface-variant border-white/10'
                }`}
              >
                {masterActive ? 'ACTIVE' : 'PAUSED'}
              </span>
              <h2 className="text-[20px] text-on-surface font-semibold">
                {masterActive
                  ? `${activeCount} Website${activeCount !== 1 ? 's' : ''} Blocked`
                  : 'Protection Paused'}
              </h2>
            </div>
            <p className="text-[15px] text-on-surface-variant opacity-80">
              {masterActive
                ? 'Your deep work session is currently running.'
                : 'Deep work mode is currently inactive.'}
            </p>
          </div>

          {/* Master toggle */}
          <label className="relative inline-flex items-center cursor-pointer group">
            <input
              type="checkbox"
              className="sr-only"
              checked={masterActive}
              onChange={e => handleMasterToggle(e.target.checked)}
            />
            <div
              className={`w-16 h-8 rounded-full border transition-all duration-300 group-hover:border-white/20 ${
                masterActive
                  ? 'bg-primary border-primary/40'
                  : 'bg-surface-container-highest border-white/10'
              }`}
            />
            <div
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                masterActive ? 'left-[36px]' : 'left-1'
              }`}
            />
          </label>
        </section>

        {/* Blocked Sites */}
        <section className="space-y-4">
          <h3 className="text-[11px] font-bold text-on-surface-variant/70 px-2 tracking-[0.1em]">
            BLOCKED WEBSITES
          </h3>

          <div className="space-y-3">
            {sites.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-on-surface-variant/40">
                <span className="material-symbols-outlined text-[40px]">block</span>
                <p className="text-[14px]">No websites blocked yet. Add one below.</p>
              </div>
            )}

            {sites.map(site => (
              <div
                key={site.domain}
                className={`site-card group bg-surface-container-low border border-white/5 rounded-xl px-6 py-4 flex items-center justify-between ${
                  exitingDomain  === site.domain ? 'card-exit'  : ''
                } ${
                  enteringDomain === site.domain ? 'card-enter' : ''
                }`}
              >
                {/* Left: favicon + domain */}
                <div className="flex items-center gap-4">
                  <img
                    alt={site.domain}
                    className="w-9 h-9 rounded-lg object-cover bg-surface-container"
                    src={`https://www.google.com/s2/favicons?sz=128&domain=${site.domain}`}
                    onError={e => {
                      (e.target as HTMLImageElement).src =
                        'https://www.google.com/s2/favicons?sz=128&domain=example.com';
                    }}
                  />
                  <div>
                    <p className="text-[16px] text-on-surface font-medium">{site.domain}</p>
                    <p className="text-[12px] text-on-surface-variant/60">
                      {site.active ? 'Blocked' : 'Disabled'}
                    </p>
                  </div>
                </div>

                {/* Right: per-site toggle + delete */}
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={site.active}
                      onChange={e => handleSiteToggle(site.domain, e.target.checked)}
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors duration-200 ${
                        site.active ? 'bg-primary' : 'bg-surface-container-highest'
                      }`}
                    />
                    <div
                      className={`absolute top-[3px] w-3.5 h-3.5 bg-white rounded-full shadow transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        site.active ? 'left-[23px]' : 'left-[3px]'
                      }`}
                    />
                  </label>

                  <button
                    onClick={e => handleDeleteClick(site.domain, e.currentTarget)}
                    className="trash-btn material-symbols-outlined text-on-surface-variant/40 p-1.5 rounded-lg text-[18px]"
                  >
                    delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Footer Input ──────────────────────────────────────────────────── */}
      <footer className="z-30 px-6 pt-4 pb-5 bg-surface-container-high border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.3)] shrink-0">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 group">
            <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[22px]">
              language
            </span>
            <input
              ref={inputRef}
              className="h-14 w-full bg-surface border border-white/10 rounded-2xl pl-[54px] pr-6 text-[15px] text-on-surface focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all outline-none placeholder:text-on-surface-variant/30"
              placeholder="Add website (e.g. facebook.com)..."
              type="text"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddSite()}
            />
          </div>
          <button
            onClick={handleAddSite}
            className="h-14 bg-primary text-on-primary-container font-bold px-6 rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shrink-0"
          >
            <span className="material-symbols-outlined text-[22px]">add</span>
            Add
          </button>
        </div>

        <div className="mt-4 flex justify-center text-[11px] font-bold text-on-surface-variant/30 tracking-[0.2em]">
          FOCUS MODE V1.1
        </div>
      </footer>
    </div>
  );
}