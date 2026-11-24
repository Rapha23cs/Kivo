import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  Trash2
} from 'lucide-react';

const FeedbackContext = createContext(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback deve ser usado dentro de FeedbackProvider.');
  }
  return ctx;
}

const TOAST_STYLES = {
  success: {
    container: 'bg-[#111715]/95 border-[#2EB88A]/40 text-[#F4F4F5]',
    iconBg: 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30',
    Icon: CheckCircle2
  },
  error: {
    container: 'bg-[#181113]/95 border-[#F43F5E]/40 text-[#F4F4F5]',
    iconBg: 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/30',
    Icon: XCircle
  },
  warning: {
    container: 'bg-[#17140F]/95 border-[#F59E0B]/40 text-[#F4F4F5]',
    iconBg: 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/30',
    Icon: AlertTriangle
  },
  info: {
    container: 'bg-[#141518]/95 border-[#32343C] text-[#F4F4F5]',
    iconBg: 'bg-[#1A1B20] text-[#CBD5E1] border-[#2D2F36]',
    Icon: Info
  }
};

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolverRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (input, defaultType = 'info') => {
      const normalized =
        typeof input === 'string'
          ? { message: input, type: defaultType }
          : { type: defaultType, ...input };

      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const duration = normalized.duration ?? 4000;

      setToasts((prev) => [...prev.slice(-3), { ...normalized, id }]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
      return id;
    },
    [dismissToast]
  );

  const toast = useCallback((opts) => pushToast(opts, 'info'), [pushToast]);
  toast.success = useCallback((opts) => pushToast(opts, 'success'), [pushToast]);
  toast.error = useCallback((opts) => pushToast(opts, 'error'), [pushToast]);
  toast.warning = useCallback((opts) => pushToast(opts, 'warning'), [pushToast]);
  toast.info = useCallback((opts) => pushToast(opts, 'info'), [pushToast]);

  const confirm = useCallback((options) => {
    const opts =
      typeof options === 'string'
        ? { title: 'Confirmar ação', message: options }
        : options;

    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setConfirmState({
        title: opts.title || 'Confirmar ação',
        message: opts.message || '',
        detail: opts.detail || '',
        confirmLabel: opts.confirmLabel || 'Confirmar',
        cancelLabel: opts.cancelLabel || 'Cancelar',
        variant: opts.variant || 'danger'
      });
    });
  }, []);

  const settleConfirm = useCallback((result) => {
    setConfirmState(null);
    if (resolverRef.current) {
      const fn = resolverRef.current;
      resolverRef.current = null;
      fn(result);
    }
  }, []);

  useEffect(() => {
    if (!confirmState) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') settleConfirm(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmState, settleConfirm]);

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Stack de Notificações (Toasts) */}
      {toasts.length > 0 && (
        <div
          aria-live="polite"
          className="no-print fixed bottom-20 sm:bottom-auto sm:top-4 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-[420px] z-[80] flex flex-col gap-2 pointer-events-none"
        >
          {toasts.map((t) => {
            const cfg = TOAST_STYLES[t.type] || TOAST_STYLES.info;
            const Icon = cfg.Icon;
            return (
              <div
                key={t.id}
                className={`pointer-events-auto border rounded-xl p-3.5 shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all ${cfg.container}`}
              >
                <div className={`p-1.5 rounded-lg border shrink-0 ${cfg.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 text-xs">
                  {t.title && <p className="font-semibold text-[#F4F4F5] leading-snug">{t.title}</p>}
                  {t.message && (
                    <p className={`text-[#A1A1AA] leading-relaxed ${t.title ? 'mt-0.5' : 'text-[#E4E4E7]'}`}>
                      {t.message}
                    </p>
                  )}
                  {t.action?.label && (
                    <button
                      type="button"
                      onClick={() => {
                        t.action.onClick?.();
                        dismissToast(t.id);
                      }}
                      className="mt-1.5 inline-flex items-center px-2.5 py-1 rounded-md bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 font-semibold text-[11px] transition"
                    >
                      {t.action.label}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  className="p-1 text-[#71717A] hover:text-[#F4F4F5] rounded-md transition shrink-0"
                  aria-label="Fechar notificação"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Confirmação Kivo (substitui confirm() do navegador) */}
      {confirmState && (
        <div
          className="no-print fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => settleConfirm(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111214] border border-[#232429] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-5 flex items-start gap-3.5">
              <div
                className={`p-2.5 rounded-xl border shrink-0 ${
                  confirmState.variant === 'danger'
                    ? 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/30'
                    : confirmState.variant === 'warning'
                    ? 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/30'
                    : 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30'
                }`}
              >
                {confirmState.variant === 'danger' ? (
                  <Trash2 className="w-5 h-5" />
                ) : confirmState.variant === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <h3 className="text-sm sm:text-base font-semibold text-[#F4F4F5] leading-snug">
                  {confirmState.title}
                </h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">
                  {confirmState.message}
                </p>
                {confirmState.detail && (
                  <p className="text-[11px] font-mono text-[#71717A] bg-[#0D0E10] border border-[#232429] rounded-lg px-2.5 py-1.5 mt-2">
                    {confirmState.detail}
                  </p>
                )}
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#141518] border-t border-[#1F2024] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => settleConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] transition"
              >
                {confirmState.cancelLabel}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settleConfirm(true)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  confirmState.variant === 'danger'
                    ? 'bg-[#E11D48] hover:bg-[#F43F5E] text-white'
                    : confirmState.variant === 'warning'
                    ? 'bg-[#F59E0B] hover:bg-[#FBBF24] text-[#09090B]'
                    : 'bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B]'
                }`}
              >
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
