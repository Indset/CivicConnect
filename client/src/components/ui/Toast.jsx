import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ToastContext = createContext(null);
const tones = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  error: 'border-rose-200 bg-rose-50 text-rose-950',
  info: 'border-civic-200 bg-white text-slate-900',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const showToast = useCallback((message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current.slice(-3), { id, message, tone }]);
    return id;
  }, []);
  const value = useMemo(() => ({ showToast, dismiss }), [showToast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[1100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        role="region"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), 5000);
    return () => window.clearTimeout(timer);
  }, [onDismiss, toast.id]);

  return (
    <div
      className={`pointer-events-auto flex items-start justify-between gap-4 rounded-xl border p-4 shadow-xl ${tones[toast.tone] ?? tones.info}`}
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      <p className="text-sm font-medium leading-5">{toast.message}</p>
      <button
        aria-label="Dismiss notification"
        className="shrink-0 rounded px-1 text-current/60 hover:text-current"
        onClick={() => onDismiss(toast.id)}
        type="button"
      >
        ×
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context.showToast;
}
