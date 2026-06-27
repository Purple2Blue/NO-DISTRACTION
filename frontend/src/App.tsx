import { useEffect, useState, useRef } from 'react';
import { backendAPI } from './api/bridge';
import type { AppState } from './api/bridge';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'warning';
}

interface PopoverData {
  url: string;
  top: number;
  left: number;
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [popover, setPopover] = useState<PopoverData | null>(null);
  
  const toastIdCounter = useRef(0);

  // Initialize data on load
  useEffect(() => {
    backendAPI.getInitialState().then(setState);
  }, []);

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#10131b] text-white font-sans">
        <p className="text-sm text-zinc-400 animate-pulse">Loading Focus Engine...</p>
      </div>
    );
  }

  // Toast System Handler
  const triggerToast = (message: string, type: 'success' | 'warning' = 'success') => {
    const id = toastIdCounter.current++;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // State calculations
  const activeCount = state.sites.filter((s:any) => s.enabled).length;

  // Master switch toggle action
  const handleMasterToggle = async () => {
    const res = await backendAPI.toggleMaster();
    if (res.success) {
      setState(res.state);
      if (res.state.master_on) {
        triggerToast('Focus Mode enabled', 'success');
        setTimeout(() => triggerToast('Restart browser to apply changes', 'warning'), 1200);
      }
    }
  };

  // Individual toggle site switch action
  const handleSiteToggle = async (url: string) => {
    const res = await backendAPI.toggleSite(url);
    if (res.success) {
      setState(res.state);
      const isNowEnabled = res.state.sites.find((s: any) => s.url === url)?.enabled;
      triggerToast(`${url} is now ${isNowEnabled ? 'Blocked' : 'Disabled'}`);
    }
  };

  // Add site submission handler
  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    const formattedUrl = newUrl.trim().toLowerCase().replace('https://', '').replace('http://', '').split('/')[0];
    const res = await backendAPI.addSite(formattedUrl);
    
    if (res.success) {
      setState(res.state);
      setNewUrl('');
      triggerToast('Website added successfully', 'success');
    } else if (res.error) {
      triggerToast(res.error, 'warning');
    }
  };

  // Prepare delete popover window parameters
  const showDeleteConfirmation = (e: React.MouseEvent<HTMLButtonElement>, url: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPopover({
      url,
      top: rect.top - 10,
      left: rect.left - 275
    });
  };

  // Delete site confirmation action
  const executeDelete = async (url: string) => {
    setPopover(null);
    const res = await backendAPI.removeSite(url);
    if (res.success) {
      setState(res.state);
      triggerToast('Website removed from block list', 'success');
    }
  };

  return (
    <div className="w-full h-screen bg-[#10131b] select-none overflow-hidden p-2">
      
      {/* Dynamic Toast Container */}
      <div className="fixed bottom-5 right-5 flex flex-col gap-3 z-[1000] pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className="toast-animation pointer-events-auto px-lg py-sm rounded-2xl shadow-2xl flex items-center gap-md border border-white/10 min-w-[280px] bg-[#1c2028]/95 backdrop-blur-xl"
          >
            <span className={`material-symbols-outlined text-[20px] font-bold ${
              toast.type === 'warning' ? 'text-[#fbbf24]' : 'text-[#4ade80]'
            }`}>
              {toast.type === 'warning' ? 'warning' : 'check_circle'}
            </span>
            <span className="text-[13px] text-on-surface font-medium flex-1">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Dynamic Popover Modal Overlay */}
      {popover && (
        <>
          <div className="fixed inset-0 z-[100] pointer-events-auto" onClick={() => setPopover(null)} />
          <div 
            style={{ top: `${popover.top}px`, left: `${popover.left}px` }}
            className="fixed z-[101] w-[260px] bg-surface-container-high border border-white/10 rounded-2xl shadow-2xl p-lg popover-animate pointer-events-auto"
          >
            <div className="flex flex-col gap-xs">
              <h4 className="text-[16px] text-on-surface font-semibold">Remove website?</h4>
              <p className="text-[13px] text-on-surface-variant opacity-70 leading-normal">This website will be removed from your blocked list.</p>
              <div className="flex gap-sm mt-md">
                <button 
                  onClick={() => setPopover(null)} 
                  className="flex-1 h-9 rounded-xl border border-white/10 hover:bg-white/5 text-on-surface text-[13px] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => executeDelete(popover.url)} 
                  className="flex-1 h-9 rounded-xl bg-[#EF4444] text-white text-[13px] font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Container Workspace Window App Shell Layout */}
      <main className="w-full h-full max-w-xl mx-auto mica-surface flex flex-col fluent-shadow relative border border-white/5 rounded-3xl">
        
        {/* Top Header App Bar Controls */}
        <header className="z-20 flex justify-between items-center w-full bg-background/60 backdrop-blur-2xl border-b border-white/5 p-1 rounded-t-3xl">
          <div className="flex items-center gap-md px-lg py-md">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-primary text-[22px]">shield_with_heart</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-[20px] text-on-surface font-semibold leading-tight">Focus Mode</h1>
              <span className="text-[12px] text-on-surface-variant opacity-60">Stay focused. Block distractions.</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content Workspace Panel Area */}
        <div className="z-10 flex-1 overflow-y-auto custom-scrollbar px-lg py-lg space-y-xl">
          
          {/* Hero Section Master Configuration Controller Switch Card Layout */}
          <section className={`hero-card state-transition border rounded-2xl p-[28px] flex items-center justify-between ${
            state.master_on ? 'bg-surface-bright border-primary/30' : 'bg-surface-container-low border-white/10'
          }`}>
            <div className="flex flex-col gap-sm pr-2">
              <div className="flex items-center gap-sm flex-wrap">
                <span className={`state-transition px-sm py-[4px] rounded-full text-[10px] tracking-widest border font-bold ${
                  state.master_on 
                    ? 'bg-primary/15 text-primary border-primary/30' 
                    : 'bg-white/5 text-on-surface-variant border-white/10'
                }`}>
                  {state.master_on ? 'ACTIVE' : 'PAUSED'}
                </span>
                <h2 className="text-[20px] text-on-surface font-semibold">
                  {state.master_on ? `${activeCount} Websites Blocked` : 'Protection Paused'}
                </h2>
              </div>
              <p className="text-[13px] text-on-surface-variant opacity-80">
                {state.master_on ? 'Your deep work session is currently running.' : 'Deep work mode is currently inactive.'}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer group shrink-0">
              <input 
                type="checkbox" 
                checked={state.master_on} 
                onChange={handleMasterToggle} 
                className="sr-only peer"
              />
              <div className={`w-16 h-8 border rounded-full transition-all group-hover:border-white/20 transition-colors ${
                state.master_on ? 'bg-[#aec6ff] border-white/10' : 'bg-surface-container-highest border-white/10'
              }`}></div>
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-200 ${
                state.master_on ? 'translate-x-9' : 'translate-x-1'
              }`}></div>
            </label>
          </section>

          {/* Active Target Blocks Item Scroll Workspace Frame Element */}
          <section className="space-y-md">
            <h3 className="text-[11px] text-on-surface-variant/70 px-xs tracking-[0.1em] font-bold uppercase">
              Blocked Websites
            </h3>
            
            <div className="space-y-sm">
              {state.sites.map((site: any) => (
                <div 
                  key={site.url} 
                  className="site-card group bg-surface-container-low border border-white/5 rounded-xl px-lg py-md flex items-center justify-between"
                >
                  <div className="flex items-center gap-md min-w-0">
                    <img 
                      className="w-9 h-9 rounded-lg shrink-0 bg-zinc-800" 
                      src={`https://www.google.com/s2/favicons?sz=128&domain=${site.url}`} 
                      alt={site.url}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://www.google.com/s2/favicons?sz=128&domain=example.com';
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-[15px] text-on-surface font-medium truncate pr-2">{site.url}</p>
                      <p className="text-[12px] text-on-surface-variant/60">
                        {site.enabled && state.master_on ? 'Blocked' : 'Disabled'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-md shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={site.enabled} 
                        onChange={() => handleSiteToggle(site.url)} 
                        className="sr-only peer"
                      />
                      <div className={`w-10 h-5 rounded-full transition-colors ${
                        site.enabled ? 'bg-[#aec6ff]' : 'bg-surface-container-highest'
                      }`}></div>
                      <div className={`absolute top-[3px] w-3.5 h-3.5 bg-white rounded-full transition-transform ${
                        site.enabled ? 'translate-x-5' : 'translate-x-[3px]'
                      }`}></div>
                    </label>
                    <button 
                      onClick={(e) => showDeleteConfirmation(e, site.url)}
                      className="trash-btn material-symbols-outlined text-on-surface-variant/40 p-1.5 rounded-lg text-[18px]"
                    >
                      delete
                    </button>
                  </div>
                </div>
              ))}

              {state.sites.length === 0 && (
                <div className="text-center py-8 text-zinc-600 text-xs tracking-wider">
                  NO WEBSITES ADDED YET
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Global Action Footer Submission Terminal Dock */}
        <footer className="z-30 p-lg bg-surface-container-high border-t border-white/10 shadow-[0_-12px_40px_rgba(0,0,0,0.3)] rounded-b-3xl">
          <form onSubmit={handleAddSite} className="flex gap-md items-center">
            <div className="relative flex-1 group">
              <span className="material-symbols-outlined absolute left-lg top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[22px]">
                language
              </span>
              <input 
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Add website (e.g. facebook.com)..." 
                className="h-[56px] w-full bg-surface border border-white/10 rounded-2xl pl-[54px] pr-lg py-md text-[15px] focus:border-primary/50 transition-all outline-none placeholder:text-on-surface-variant/30 text-zinc-200"
              />
            </div>
            <button 
              type="submit"
              className="h-[56px] bg-[#aec6ff] text-[#00285d] font-bold px-lg rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center gap-sm shrink-0"
            >
              <span className="material-symbols-outlined text-[24px]">add</span>
              Add
            </button>
          </form>
          <div className="mt-lg flex justify-center items-center text-[11px] text-on-surface-variant/40 font-bold tracking-[0.2em] opacity-80">
            <span>FOCUS MODE V1.2</span>
          </div>
        </footer>
      </main>
    </div>
  );
}