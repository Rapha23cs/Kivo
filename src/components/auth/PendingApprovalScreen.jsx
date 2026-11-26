import React, { useState } from 'react';
import { ShieldAlert, Clock, RefreshCw, LogOut, Sun, Moon, Mail, ShieldCheck } from 'lucide-react';
import KivoLogo from '../common/KivoLogo';

export default function PendingApprovalScreen({
  userProfile,
  email,
  accessStatus = 'pending',
  isOnline = true,
  theme = 'dark',
  onToggleTheme,
  onCheckStatus,
  onSignOut
}) {
  const [checking, setChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const isBlocked = accessStatus === 'blocked';
  const displayEmail = email || userProfile?.email || 'Conta autenticada';

  const handleRecheck = async () => {
    if (!onCheckStatus || checking) return;
    setChecking(true);
    setStatusMessage('');
    try {
      const updated = await onCheckStatus();
      if (updated?.accessStatus === 'approved') {
        return;
      }
      setStatusMessage(
        updated?.accessStatus === 'blocked'
          ? 'Seu acesso permanece suspenso pelo administrador.'
          : 'Seu cadastro ainda está aguardando autorização de um administrador.'
      );
    } catch {
      setStatusMessage('Não foi possível consultar o status agora. Verifique sua conexão.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] flex flex-col justify-between p-4 sm:p-6">
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between">
        <KivoLogo size="md" showText subtitle="Vistorias & Relatórios" />
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-[#141518] border border-[#232429] text-[#A1A1AA] hover:text-[#F4F4F5] transition"
            title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4 text-[#34D399]" />
            ) : (
              <Sun className="w-4 h-4 text-[#FBBF24]" />
            )}
          </button>
        )}
      </header>

      <main className="w-full max-w-md mx-auto my-8">
        <div className="kivo-card rounded-2xl p-6 sm:p-8 space-y-5 text-center shadow-2xl">
          <div
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto ${
              isBlocked
                ? 'bg-[#221216] border-[#F43F5E]/40 text-[#FB7185]'
                : 'bg-[#221A10] border-[#F59E0B]/40 text-[#FBBF24]'
            }`}
          >
            {isBlocked ? <ShieldAlert className="w-7 h-7" /> : <Clock className="w-7 h-7" />}
          </div>

          <div className="space-y-2">
            <span
              className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                isBlocked
                  ? 'bg-[#221216] border-[#F43F5E]/40 text-[#FB7185]'
                  : 'bg-[#221A10] border-[#F59E0B]/40 text-[#FBBF24]'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              {isBlocked ? 'Acesso Bloqueado' : 'Autorização Pendente'}
            </span>

            <h1 className="text-xl font-bold text-[#F4F4F5] tracking-tight">
              {isBlocked
                ? 'Acesso suspenso pelo administrador'
                : 'Aguardando liberação do administrador'}
            </h1>

            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              {isBlocked
                ? 'Esta conta foi suspensa ou ainda não possui permissão ativa para acessar vistorias, unidades e laudos do Kivo.'
                : 'Por medida de segurança, novos cadastros no Kivo precisam ser autorizados manualmente pelo administrador antes do primeiro acesso ao sistema.'}
            </p>
          </div>

          <div className="bg-[#0D0E10] border border-[#232429] rounded-xl p-3.5 text-left space-y-1">
            <div className="flex items-center gap-2 text-xs text-[#F4F4F5] font-medium">
              <Mail className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
              <span className="truncate">{displayEmail}</span>
            </div>
            {userProfile?.name && (
              <p className="text-[11px] text-[#71717A] pl-5.5 truncate">
                {userProfile.name}
              </p>
            )}
          </div>

          {!isOnline && (
            <div className="p-3 rounded-xl bg-[#221A10] border border-[#F59E0B]/30 text-[11px] text-[#FBBF24]">
              Sem conexão com a internet. Conecte-se para validar se sua conta já foi liberada.
            </div>
          )}

          {statusMessage && (
            <div className="p-3 rounded-xl bg-[#18191D] border border-[#27282E] text-[11px] text-[#A1A1AA]">
              {statusMessage}
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleRecheck}
              disabled={checking || !isOnline}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Verificando liberação...' : 'Já fui autorizado — Verificar agora'}
            </button>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] text-[#A1A1AA] hover:text-[#F4F4F5] font-medium text-xs transition flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair desta conta
              </button>
            )}
          </div>
        </div>
      </main>

      <footer className="text-center text-[11px] text-[#71717A]">
        Kivo • Segurança e Controle de Acesso Administrativo
      </footer>
    </div>
  );
}
