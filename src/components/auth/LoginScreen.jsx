import React, { useState, useEffect } from 'react';
import {
  LogIn,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Send,
  Layers,
  ClipboardCheck,
  FileCheck2
} from 'lucide-react';
import { getSupabaseClient } from '../../supabase/supabaseConfig';
import { validateStrongPassword, getPasswordScore } from '../../utils/securityHelpers';
import LegalInfoModal from '../common/LegalInfoModal';
import KivoLogo from '../common/KivoLogo';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function translateAuthError(error) {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) {
    return {
      text: 'E-mail ou senha incorretos. Confira os dados ou clique em "Esqueci minha senha".',
      needsConfirmation: false
    };
  }
  if (msg.includes('email not confirmed')) {
    return {
      text: 'Seu e-mail ainda não foi confirmado. Verifique a caixa de entrada/spam ou reenvie o link abaixo.',
      needsConfirmation: true
    };
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return {
      text: 'Já existe uma conta cadastrada com este e-mail. Tente entrar ou redefinir sua senha.',
      needsConfirmation: false
    };
  }
  if (msg.includes('password should be at least')) {
    return {
      text: 'A senha deve ter pelo menos 6 caracteres.',
      needsConfirmation: false
    };
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return {
      text: 'Muitas tentativas em sequência. Aguarde alguns instantes antes de tentar novamente.',
      needsConfirmation: false
    };
  }
  if (msg.includes('invalid email')) {
    return {
      text: 'O endereço de e-mail informado não é válido.',
      needsConfirmation: false
    };
  }
  return {
    text: error?.message || 'Não foi possível concluir a solicitação. Tente novamente.',
    needsConfirmation: false
  };
}

export default function LoginScreen({
  onLoginSuccess,
  initialMode = 'login',
  onRecoveryComplete,
  onBackToLanding
}) {
  // Modos: 'login' | 'signup' | 'forgot' | 'recovery' | 'mfa'
  const [mode, setMode] = useState(initialMode);

  const [fullName, setFullName] = useState('');
  const [registry, setRegistry] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [mfaCode, setMfaCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSecondsLeft, setCooldownSecondsLeft] = useState(0);

  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'error' | 'success', text, needsConfirmation }
  const [legalTab, setLegalTab] = useState(null);

  useEffect(() => {
    if (initialMode === 'recovery' || initialMode === 'mfa') {
      setMode(initialMode);
      setFeedback(null);
    }
  }, [initialMode]);

  useEffect(() => {
    if (!cooldownUntil || cooldownUntil <= Date.now()) {
      setCooldownSecondsLeft(0);
      return undefined;
    }
    const tick = () => {
      const rem = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSecondsLeft(rem);
      if (rem === 0) setCooldownUntil(0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  useEffect(() => {
    if (mode !== 'mfa' || mfaFactorId) return;
    const { client } = getSupabaseClient();
    client?.auth?.mfa?.listFactors?.().then(({ data }) => {
      const totp = (data?.totp || []).find((f) => f.status === 'verified');
      if (totp?.id) setMfaFactorId(totp.id);
    });
  }, [mode, mfaFactorId]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setFeedback(null);
    setTouched({});
    setPassword('');
    setConfirmPassword('');
    setMfaCode('');
    setShowPassword(false);
  };

  // Validações reforçadas (mínimo 8 caracteres + letra + número/símbolo)
  const emailValid = EMAIL_REGEX.test(email.trim());
  const passwordPolicy = validateStrongPassword(password);
  const passwordMinLen = passwordPolicy.valid;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const nameValid = fullName.trim().length >= 3;
  const passwordScore = getPasswordScore(password);

  const strengthLabel =
    password.length === 0
      ? ''
      : passwordScore <= 1
        ? 'Fraca'
        : passwordScore === 2
          ? 'Razoável'
          : passwordScore === 3
            ? 'Boa'
            : 'Forte';

  const handleResendConfirmation = async () => {
    if (!emailValid) return;
    setResendLoading(true);
    try {
      const { client } = getSupabaseClient();
      const { error } = await client.auth.resend({
        type: 'signup',
        email: email.trim()
      });
      if (error) throw error;
      setFeedback({
        type: 'success',
        text: `Link de confirmação reenviado para ${email.trim()}. Verifique sua caixa de entrada e spam.`
      });
    } catch (err) {
      if (mode === 'login') {
        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);
        if (nextFails >= 5) {
          setCooldownUntil(Date.now() + 15000);
        }
      }
      const translated = translateAuthError(err);
      setFeedback({ type: 'error', ...translated });
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (mode === 'login' && cooldownSecondsLeft > 0) {
      setFeedback({
        type: 'error',
        text: `Muitas tentativas incorretas. Aguarde ${cooldownSecondsLeft}s para tentar novamente.`
      });
      return;
    }

    if (mode !== 'recovery' && mode !== 'mfa' && !emailValid) {
      setTouched((t) => ({ ...t, email: true }));
      setFeedback({ type: 'error', text: 'Informe um endereço de e-mail válido.' });
      return;
    }

    if (mode === 'signup') {
      if (!nameValid) {
        setTouched((t) => ({ ...t, fullName: true }));
        setFeedback({ type: 'error', text: 'Informe seu nome completo (mínimo 3 caracteres).' });
        return;
      }
      if (!passwordMinLen) {
        setTouched((t) => ({ ...t, password: true }));
        setFeedback({ type: 'error', text: 'A senha deve ter no mínimo 8 caracteres, com letras e números ou símbolos.' });
        return;
      }
      if (!passwordsMatch) {
        setTouched((t) => ({ ...t, confirmPassword: true }));
        setFeedback({ type: 'error', text: 'As senhas digitadas não conferem.' });
        return;
      }
    }

    if (mode === 'recovery') {
      if (!passwordMinLen) {
        setFeedback({ type: 'error', text: 'A nova senha deve ter no mínimo 8 caracteres, com letras e números ou símbolos.' });
        return;
      }
      if (!passwordsMatch) {
        setFeedback({ type: 'error', text: 'A confirmação da nova senha não confere.' });
        return;
      }
    }

    if (mode === 'mfa') {
      if (mfaCode.trim().length < 6) {
        setFeedback({ type: 'error', text: 'Informe o código de 6 dígitos do seu aplicativo autenticador.' });
        return;
      }
    }

    setLoading(true);
    try {
      const { client } = getSupabaseClient();
      if (!client) {
        throw new Error('Serviço de autenticação indisponível.');
      }

      if (mode === 'mfa') {
        let factorId = mfaFactorId;
        if (!factorId) {
          const { data: fData } = await client.auth.mfa.listFactors();
          factorId = (fData?.totp || []).find((f) => f.status === 'verified')?.id || '';
        }
        if (!factorId) {
          throw new Error('Fator 2FA não encontrado. Faça login novamente.');
        }
        const { data: challengeData, error: chErr } = await client.auth.mfa.challenge({ factorId });
        if (chErr) throw chErr;
        const { error: verErr } = await client.auth.mfa.verify({
          factorId,
          challengeId: challengeData.id,
          code: mfaCode.trim()
        });
        if (verErr) throw verErr;
        const { data: sessionData } = await client.auth.getSession();
        setFailedAttempts(0);
        if (onLoginSuccess) onLoginSuccess(sessionData?.session);
      } else if (mode === 'login') {
        const { data, error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
        setFailedAttempts(0);

        const { data: aalData } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel !== 'aal2') {
          const { data: factorsData } = await client.auth.mfa.listFactors();
          const totpFactor = (factorsData?.totp || []).find((f) => f.status === 'verified');
          if (totpFactor?.id) {
            setMfaFactorId(totpFactor.id);
            setMode('mfa');
            setFeedback(null);
            return;
          }
        }

        if (onLoginSuccess) onLoginSuccess(data.session);
      } else if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName.trim(),
              registry: registry.trim() || 'RT Habilitado',
              title: 'Auditor Ambiental & Responsável Técnico'
            }
          }
        });
        if (error) throw error;

        if (data.session) {
          if (onLoginSuccess) onLoginSuccess(data.session);
        } else {
          setFeedback({
            type: 'success',
            text: `Cadastro criado para ${email.trim()}! Confirme o link enviado ao seu e-mail para fazer o primeiro acesso.`
          });
          setPassword('');
          setConfirmPassword('');
        }
      } else if (mode === 'forgot') {
        const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setFeedback({
          type: 'success',
          text: `Se o e-mail ${email.trim()} estiver cadastrado, enviamos as instruções para redefinir sua senha.`
        });
      } else if (mode === 'recovery') {
        const { data, error } = await client.auth.updateUser({ password });
        if (error) throw error;
        setFeedback({
          type: 'success',
          text: 'Senha redefinida com sucesso! Redirecionando para o sistema...'
        });
        if (onRecoveryComplete) {
          setTimeout(() => onRecoveryComplete(data?.user), 900);
        }
      }
    } catch (err) {
      if (mode === 'login') {
        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);
        if (nextFails >= 5) {
          setCooldownUntil(Date.now() + 15000);
        }
      }
      const translated = translateAuthError(err);
      setFeedback({ type: 'error', ...translated });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0D] text-[#F4F4F5] flex flex-col lg:flex-row font-sans">
      {/* Coluna Esquerda: Contexto e Reconhecimento Visual (Nielsen H2, H6, H8) */}
      <aside className="hidden lg:flex lg:w-[46%] xl:w-[44%] bg-[#111214] border-r border-[#1F2024] p-10 xl:p-14 flex-col justify-between relative overflow-hidden">
        {/* Grade sutil técnica */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#F4F4F5 1px, transparent 1px)',
            backgroundSize: '24px 24px'
          }}
        />

        {/* Marca */}
        <div className="relative z-10">
          <KivoLogo size="lg" subtitle="Vistorias & Relatórios Técnicos" />
        </div>

        {/* Proposta de Valor + Mini Preview dos Fluxos */}
        <div className="relative z-10 space-y-6 my-auto py-8 max-w-md">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#122620] border border-[#2EB88A]/30 text-[#34D399] text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
              Meio Ambiente &amp; Segurança do Trabalho
            </div>
            <h2 className="text-2xl xl:text-3xl font-semibold text-[#F4F4F5] tracking-tight leading-snug">
              Vistorias e relatórios estruturados, da visita em campo ao laudo técnico.
            </h2>
            <p className="text-sm text-[#A1A1AA] leading-relaxed">
              Inicie sua vistoria escolhendo o fluxo de trabalho, preencha o checklist em campo e vincule para concluir o relatório técnico com segurança.
            </p>
          </div>

          {/* Card resumo minimalista dos dois fluxos */}
          <div className="bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-[#1F2024] pb-2.5">
              <span className="text-[#E4E4E7] font-medium flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-[#34D399]" />
                Fluxos de Vistoria &amp; Checklist
              </span>
              <span className="font-mono text-[11px] text-[#34D399]">2 áreas</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="bg-[#0D0E10] border border-[#2EB88A]/30 rounded-lg p-2.5">
                <Layers className="w-3.5 h-3.5 text-[#34D399] mx-auto mb-1" />
                <span className="text-sm font-semibold text-[#F4F4F5] block">Ambiente</span>
                <span className="text-[10px] text-[#34D399]">Ativo (63 itens)</span>
              </div>
              <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-2.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FBBF24] mx-auto mb-1" />
                <span className="text-sm font-semibold text-[#F4F4F5] block">Segurança</span>
                <span className="text-[10px] text-[#FBBF24]">Em breve (SST)</span>
              </div>
              <div className="bg-[#0D0E10] border border-[#232429] rounded-lg p-2.5">
                <FileCheck2 className="w-3.5 h-3.5 text-[#A1A1AA] mx-auto mb-1" />
                <span className="text-sm font-semibold text-[#F4F4F5] font-mono block">PDF + QR</span>
                <span className="text-[10px] text-[#71717A]">Laudo Vinculado</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé discreto */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-[#71717A] border-t border-[#1F2024] pt-4">
          <span>Acesso protegido por autenticação individual</span>
          <span className="font-mono">Kivo • Multi-Cliente</span>
        </div>
      </aside>

      {/* Coluna Direita: Formulário de Autenticação */}
      <main className="flex-1 flex flex-col items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-[410px] space-y-6">
          {onBackToLanding && (
            <button
              type="button"
              onClick={onBackToLanding}
              className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-[#34D399] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar à página inicial</span>
            </button>
          )}
          {/* Header mobile da marca */}
          <div className="flex lg:hidden justify-center">
            <KivoLogo size="md" subtitle="Auditoria & Inspeção Ambiental" />
          </div>

          <div className="bg-[#141518] border border-[#232429] rounded-2xl p-6 sm:p-7 space-y-6">
            {/* Seletor de Modo (Heurística 3 & 4) */}
            {(mode === 'login' || mode === 'signup') && (
              <div className="grid grid-cols-2 bg-[#0D0E10] p-1 rounded-xl border border-[#232429] text-xs">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className={`py-2 rounded-lg font-medium transition ${mode === 'login'
                      ? 'bg-[#1E2025] text-[#F4F4F5] border border-[#2D2F36]'
                      : 'text-[#71717A] hover:text-[#E4E4E7]'
                    }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`py-2 rounded-lg font-medium transition ${mode === 'signup'
                      ? 'bg-[#1E2025] text-[#F4F4F5] border border-[#2D2F36]'
                      : 'text-[#71717A] hover:text-[#E4E4E7]'
                    }`}
                >
                  Criar Conta
                </button>
              </div>
            )}

            {/* Título Contextual */}
            <div className="space-y-1">
              {(mode === 'forgot' || mode === 'recovery' || mode === 'mfa') && (
                <button
                  type="button"
                  onClick={async () => {
                    if (mode === 'mfa') {
                      const { client } = getSupabaseClient();
                      await client?.auth?.signOut();
                    }
                    switchMode('login');
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#A1A1AA] hover:text-[#F4F4F5] mb-2 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para entrar
                </button>
              )}
              <h2 className="text-lg font-semibold text-[#F4F4F5] tracking-tight">
                {mode === 'login' && 'Acesse sua conta'}
                {mode === 'signup' && 'Cadastro de novo técnico'}
                {mode === 'forgot' && 'Recuperar acesso'}
                {mode === 'recovery' && 'Definir nova senha'}
                {mode === 'mfa' && 'Verificação em 2 Fatores (2FA)'}
              </h2>
              <p className="text-xs text-[#71717A]">
                {mode === 'login' && 'Entre com seu e-mail e senha para gerenciar suas vistorias.'}
                {mode === 'signup' && 'Crie sua conta individual para registrar inspeções no Kivo.'}
                {mode === 'forgot' && 'Enviaremos um link seguro para você cadastrar uma nova senha.'}
                {mode === 'recovery' && 'Escolha uma nova senha forte para concluir a recuperação da conta.'}
                {mode === 'mfa' && 'Digite o código de 6 dígitos gerado pelo seu aplicativo autenticador.'}
              </p>
            </div>

            {/* Feedback de Status (Heurística 1 & 9) */}
            {feedback && (
              <div
                role="alert"
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed ${feedback.type === 'success'
                    ? 'bg-[#122620] border-[#2EB88A]/40 text-[#34D399]'
                    : 'bg-[#221216] border-[#F43F5E]/40 text-[#FB7185]'
                  }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div className="space-y-2 flex-1">
                  <p>{feedback.text}</p>
                  {feedback.needsConfirmation && emailValid && (
                    <button
                      type="button"
                      onClick={handleResendConfirmation}
                      disabled={resendLoading}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold underline hover:text-[#FECDD3] disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      {resendLoading ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Formulário */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
              {mode === 'signup' && (
                <>
                  <div>
                    <label htmlFor="fullName" className="block text-[#A1A1AA] font-medium mb-1.5">
                      Nome completo *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#71717A] absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        id="fullName"
                        type="text"
                        required
                        autoFocus
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                        placeholder="Ex: Ana Paula Ferreira"
                        className={`w-full bg-[#0D0E10] border rounded-lg pl-9 pr-3 py-2 text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none transition ${touched.fullName && !nameValid
                            ? 'border-[#F43F5E]/60 focus:border-[#F43F5E]'
                            : 'border-[#27282E] focus:border-[#2EB88A]'
                          }`}
                      />
                    </div>
                    {touched.fullName && !nameValid && (
                      <p className="text-[11px] text-[#FB7185] mt-1">Informe pelo menos 3 caracteres.</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="registry" className="block text-[#A1A1AA] font-medium mb-1.5">
                      Registro profissional / Conselho <span className="text-[#71717A]">(opcional)</span>
                    </label>
                    <div className="relative">
                      <Award className="w-4 h-4 text-[#71717A] absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        id="registry"
                        type="text"
                        value={registry}
                        onChange={(e) => setRegistry(e.target.value)}
                        placeholder="Ex: CRQ-IV 04291880 / CREA-MA"
                        className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg pl-9 pr-3 py-2 text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#2EB88A] transition"
                      />
                    </div>
                  </div>
                </>
              )}

              {mode !== 'recovery' && mode !== 'mfa' && (
                <div>
                  <label htmlFor="email" className="block text-[#A1A1AA] font-medium mb-1.5">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#71717A] absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      required
                      autoFocus={mode !== 'signup'}
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      placeholder="auditor@empresa.com"
                      className={`w-full bg-[#0D0E10] border rounded-lg pl-9 pr-3 py-2 text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none transition ${touched.email && email.length > 0 && !emailValid
                          ? 'border-[#F43F5E]/60 focus:border-[#F43F5E]'
                          : 'border-[#27282E] focus:border-[#2EB88A]'
                        }`}
                    />
                  </div>
                  {touched.email && email.length > 0 && !emailValid && (
                    <p className="text-[11px] text-[#FB7185] mt-1">Formato de e-mail inválido.</p>
                  )}
                </div>
              )}

              {mode !== 'forgot' && mode !== 'mfa' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="text-[#A1A1AA] font-medium">
                      {mode === 'recovery' ? 'Nova senha' : 'Senha'}
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-[11px] text-[#A1A1AA] hover:text-[#34D399] transition"
                      >
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#71717A] absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                      placeholder="••••••••"
                      className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg pl-9 pr-10 py-2 text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none focus:border-[#2EB88A] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      className="absolute right-2.5 top-2 p-1 text-[#71717A] hover:text-[#E4E4E7] transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Indicador de força da senha no Cadastro/Recuperação (Heurística 1 & 5) */}
                  {(mode === 'signup' || mode === 'recovery') && password.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      <div className="grid grid-cols-4 gap-1">
                        {[1, 2, 3, 4].map((step) => (
                          <div
                            key={step}
                            className={`h-1 rounded-full transition ${passwordScore >= step
                                ? passwordScore <= 1
                                  ? 'bg-[#FB7185]'
                                  : passwordScore === 2
                                    ? 'bg-[#A1A1AA]'
                                    : 'bg-[#2EB88A]'
                                : 'bg-[#232429]'
                              }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#71717A]">
                        <span>Mín. 8 caracteres + letra + número/símbolo {passwordMinLen ? '✓' : ''}</span>
                        <span>Força: <strong className="text-[#E4E4E7] font-medium">{strengthLabel}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(mode === 'signup' || mode === 'recovery') && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-[#A1A1AA] font-medium mb-1.5">
                    Confirmar senha
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#71717A] absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                      placeholder="Repita a senha"
                      className={`w-full bg-[#0D0E10] border rounded-lg pl-9 pr-3 py-2 text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none transition ${touched.confirmPassword && confirmPassword.length > 0 && !passwordsMatch
                          ? 'border-[#F43F5E]/60 focus:border-[#F43F5E]'
                          : 'border-[#27282E] focus:border-[#2EB88A]'
                        }`}
                    />
                  </div>
                  {touched.confirmPassword && confirmPassword.length > 0 && !passwordsMatch && (
                    <p className="text-[11px] text-[#FB7185] mt-1">As senhas não coincidem.</p>
                  )}
                </div>
              )}

              {mode === 'mfa' && (
                <div>
                  <label htmlFor="mfaCode" className="block text-[#A1A1AA] font-medium mb-1.5">
                    Código do Autenticador (6 dígitos)
                  </label>
                  <input
                    id="mfaCode"
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2.5 text-center font-mono text-lg tracking-[0.35em] text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (mode === 'login' && cooldownSecondsLeft > 0)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold rounded-lg transition text-xs mt-2"
              >
                {mode === 'login' && <LogIn className="w-4 h-4" />}
                {mode === 'signup' && <UserPlus className="w-4 h-4" />}
                {(mode === 'forgot' || mode === 'recovery') && <KeyRound className="w-4 h-4" />}
                {mode === 'mfa' && <ShieldCheck className="w-4 h-4" />}
                <span>
                  {loading
                    ? 'Processando...'
                    : mode === 'login' && cooldownSecondsLeft > 0
                      ? `Aguarde ${cooldownSecondsLeft}s`
                      : mode === 'login'
                        ? 'Entrar no Kivo'
                        : mode === 'signup'
                          ? 'Criar minha conta'
                          : mode === 'forgot'
                            ? 'Enviar link de recuperação'
                            : mode === 'mfa'
                              ? 'Validar Código 2FA'
                              : 'Salvar nova senha'}
                </span>
              </button>
            </form>
          </div>

          {/* Dica de ajuda discreta (Heurística 10) */}
          <p className="text-center text-[11px] text-[#71717A] leading-relaxed px-2">
            {mode === 'login' && (
              <>
                Novo técnico na equipe?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-[#E4E4E7] hover:text-[#34D399] font-medium underline underline-offset-2"
                >
                  Crie seu acesso aqui
                </button>
                .
              </>
            )}
            {mode === 'signup' && 'Ao criar sua conta, você concorda com os Termos de Uso e Política de Privacidade. Suas inspeções ficam vinculadas apenas ao seu usuário.'}
            {mode === 'forgot' && 'Caso o e-mail não chegue em 2 minutos, verifique a pasta de spam.'}
          </p>

          <div className="flex items-center justify-center gap-3 text-[11px] text-[#71717A] pt-1">
            <button
              type="button"
              onClick={() => setLegalTab('privacidade')}
              className="hover:text-[#D4D4D8] transition underline-offset-2 hover:underline"
            >
              Privacidade
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setLegalTab('termos')}
              className="hover:text-[#D4D4D8] transition underline-offset-2 hover:underline"
            >
              Termos de Uso
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setLegalTab('suporte')}
              className="hover:text-[#D4D4D8] transition underline-offset-2 hover:underline"
            >
              Suporte
            </button>
          </div>
        </div>
      </main>

      <LegalInfoModal
        isOpen={Boolean(legalTab)}
        initialTab={legalTab || 'privacidade'}
        onClose={() => setLegalTab(null)}
      />
    </div>
  );
}
