import React from 'react';
import { ArrowLeft, Compass, ShieldAlert, LayoutDashboard } from 'lucide-react';

export default function NotFoundPage({ pathname = '', onGoHome, isAuthenticated = false }) {
  return (
    <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[540px] h-[340px] rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #2EB88A 0%, transparent 70%)' }}
      />

      <div className="relative w-full max-w-md bg-[#111214] border border-[#1F2024] rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#18191D] border border-[#27282E] flex items-center justify-center text-[#34D399]">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C1216] border border-[#F43F5E]/30 text-[#FB7185] font-mono text-[11px] font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>ERRO 404 • ROTA NÃO ENCONTRADA</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-[#F4F4F5] tracking-tight pt-1">
            Página não encontrada
          </h1>
          <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
            O endereço{' '}
            <code className="px-1.5 py-0.5 rounded bg-[#0D0E10] border border-[#232429] text-[#E4E4E7] font-mono text-[11px] break-all">
              {pathname || '/'}
            </code>{' '}
            não existe ou foi movido no sistema Kivo.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-semibold text-xs transition shadow-lg shadow-[#2EB88A]/10"
          >
            {isAuthenticated ? (
              <>
                <LayoutDashboard className="w-4 h-4" />
                <span>Voltar ao Painel</span>
              </>
            ) : (
              <>
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao Início</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-[#71717A] pt-1">
          Kivo • Inspeções &amp; Relatórios Ambientais
        </p>
      </div>
    </div>
  );
}
