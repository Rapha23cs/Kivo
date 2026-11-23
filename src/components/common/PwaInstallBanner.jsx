import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Share } from 'lucide-react';

const DISMISS_KEY = 'kivo_pwa_install_dismissed_at';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

function isStandaloneMode() {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIosSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const ts = Number(localStorage.getItem(DISMISS_KEY) || 0);
      return ts > 0 && Date.now() - ts < DISMISS_TTL_MS;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isStandaloneMode() || dismissed) return undefined;

    if (isIosSafari()) {
      setShowIosTip(true);
    }

    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setShowIosTip(false);
      setDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosTip(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignora
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (choice?.outcome === 'accepted') {
      handleDismiss();
    }
  };

  if (dismissed || isStandaloneMode() || (!deferredPrompt && !showIosTip)) {
    return null;
  }

  return (
    <div className="no-print fixed bottom-20 lg:bottom-5 left-3 right-3 sm:left-5 sm:right-auto sm:max-w-sm z-40">
      <div className="bg-[#141518]/95 backdrop-blur-md border border-[#2EB88A]/40 rounded-2xl p-3.5 shadow-2xl flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#122620] border border-[#2EB88A]/30 flex items-center justify-center shrink-0">
          <img src="/icon.svg" alt="Ícone Kivo" className="w-7 h-7 rounded-md" />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-[#F4F4F5] flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-[#34D399]" />
                Instalar Kivo no aparelho
              </h4>
              <p className="text-[11px] text-[#A1A1AA] leading-snug mt-0.5">
                {deferredPrompt
                  ? 'Acesse em tela cheia com ícone rápido e suporte offline em campo.'
                  : 'Toque em Compartilhar e depois em "Adicionar à Tela de Início" para usar como app.'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-[#71717A] hover:text-[#F4F4F5] rounded-lg transition shrink-0"
              aria-label="Fechar aviso de instalação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {deferredPrompt ? (
            <button
              type="button"
              onClick={handleInstall}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-semibold text-[11px] transition"
            >
              <Download className="w-3.5 h-3.5" />
              Instalar aplicativo
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#34D399] bg-[#122620] px-2 py-1 rounded border border-[#2EB88A]/30">
              <Share className="w-3 h-3" />
              <span>Safari → Compartilhar → Tela de Início</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
