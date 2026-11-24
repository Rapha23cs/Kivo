import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro inesperado de renderização.'
    };
  }

  componentDidCatch(error, info) {
    console.error('Kivo ErrorBoundary:', error, info?.componentStack);
  }

  async handleHardReload() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k.startsWith('kivo-shell-')).map((k) => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.update().catch(() => {})));
      }
    } catch {
      // ignora
    }
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#141518] border border-[#2D2F36] rounded-2xl p-6 space-y-4 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-[#221216] border border-[#F43F5E]/40 text-[#FB7185] flex items-center justify-center mx-auto font-bold text-lg">
            !
          </div>
          <div className="space-y-1">
            <h1 className="text-base font-bold text-[#F4F4F5]">Ops! Ocorreu uma falha inesperada</h1>
            <p className="text-xs text-[#A1A1AA]">
              Se houve uma atualização recente do aplicativo, limpe o cache e recarregue.
            </p>
            {this.state.errorMessage && (
              <p className="text-[11px] font-mono text-[#FB7185] bg-[#0D0E10] border border-[#232429] rounded-lg px-3 py-2 mt-2 break-words">
                {this.state.errorMessage}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => this.handleHardReload()}
            className="w-full py-2.5 px-4 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-semibold rounded-lg text-xs transition"
          >
            Atualizar Cache e Recarregar Kivo
          </button>
        </div>
      </div>
    );
  }
}
