import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  User,
  Lock,
  HardDrive,
  Mail,
  LogOut,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  WifiOff,
  Cloud,
  Upload,
  PenTool,
  Trash2,
  Palette,
  QrCode,
  History,
  KeyRound,
  Users
} from 'lucide-react';
import QRCode from 'qrcode';
import { getSupabaseClient } from '../../supabase/supabaseConfig';
import { AuditService } from '../../supabase/auditService';
import { DataService, compressImageToDataUrl } from '../../supabase/dataService';
import { sanitizeMediaUrl } from '../../utils/kivoHelpers';
import { validateStrongPassword, hashPinSha256, getUserPinSalt } from '../../utils/securityHelpers';
import { KIVO_ACCENT_PRESETS } from '../../utils/themePalette';
import { useFeedback } from '../common/FeedbackProvider';

export default function UserProfileModal({
  isOpen,
  onClose,
  userProfile,
  onSaveProfile,
  onSignOut,
  isOnline = true,
  pendingSyncCount = 0,
  onSyncNow,
  onScreenLockConfigChange,
  onRolesChanged,
  initialTab = null,
  stats = { orders: 0, reports: 0, units: 0, clients: 0 }
}) {
  const { confirm } = useFeedback();
  const [activeTab, setActiveTab] = useState('profile'); // profile | security | device
  const [profile, setProfile] = useState({ ...userProfile });
  const [saving, setSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState(null);

  const [newEmail, setNewEmail] = useState(userProfile?.email || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityFeedback, setSecurityFeedback] = useState(null);

  const [syncingNow, setSyncingNow] = useState(false);

  // MFA (2FA TOTP) + Audit Logs + Screen Lock PIN
  const [mfaFactors, setMfaFactors] = useState([]);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaEnrollData, setMfaEnrollData] = useState(null); // { id, secret, qrDataUrl }
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  const [screenPinInput, setScreenPinInput] = useState('');
  const [screenLockMinutes, setScreenLockMinutes] = useState(() => {
    try {
      return localStorage.getItem('kivo_screen_lock_minutes') || '15';
    } catch {
      return '15';
    }
  });
  const [hasScreenPin, setHasScreenPin] = useState(() => {
    try {
      return Boolean(localStorage.getItem('kivo_screen_pin_hash'));
    } catch {
      return false;
    }
  });
  const [deviceFeedback, setDeviceFeedback] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState(null);
  const [adminUpdatingId, setAdminUpdatingId] = useState(null);
  const isAdmin = userProfile?.role === 'admin';

  useEffect(() => {
    setProfile({ ...userProfile });
    setNewEmail(userProfile?.email || '');
  }, [userProfile, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || (isAdmin ? 'admin' : 'profile'));
    }
  }, [isOpen, initialTab, isAdmin]);

  const loadMfaFactors = async () => {
    if (!isOnline) return;
    const { client } = getSupabaseClient();
    if (!client?.auth?.mfa) return;
    setMfaLoading(true);
    try {
      const { data } = await client.auth.mfa.listFactors();
      setMfaFactors((data?.totp || []).filter((f) => f.status === 'verified'));
    } catch {
      // ignora caso indisponível
    } finally {
      setMfaLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    if (!isOnline || !isAdmin) return;
    setAdminLoading(true);
    setAdminFeedback(null);
    try {
      const list = await DataService.listUserRoles();
      setAdminUsers(list);
    } catch (err) {
      setAdminFeedback({
        type: 'error',
        text: err?.message || 'Não foi possível carregar usuários (aplique a migration 013 no Supabase).'
      });
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'security') {
      loadMfaFactors();
      AuditService.listRecent(isAdmin ? 30 : 15).then(setAuditLogs);
    }
    if (isOpen && activeTab === 'admin' && isAdmin) {
      loadAdminUsers();
      AuditService.listRecent(30).then(setAuditLogs);
    }
  }, [isOpen, activeTab, isAdmin]);

  if (!isOpen) return null;

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setProfileFeedback(null);
    try {
      await onSaveProfile(profile);
      setProfileFeedback({
        type: 'success',
        text: isOnline
          ? 'Perfil salvo na sua conta Supabase!'
          : 'Perfil salvo offline; será sincronizado quando houver conexão.'
      });
    } catch (err) {
      setProfileFeedback({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageUpload = async (field, maxWidth, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await compressImageToDataUrl(file, maxWidth, 0.82);
      setProfile((prev) => ({ ...prev, [field]: dataUrl }));
    } catch (err) {
      setProfileFeedback({ type: 'error', text: err?.message || 'Não foi possível carregar a imagem.' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSecurityFeedback(null);
    if (!isOnline) {
      setSecurityFeedback({ type: 'error', text: 'Conecte-se à internet para alterar sua senha.' });
      return;
    }
    const pwdCheck = validateStrongPassword(newPassword);
    if (!pwdCheck.valid) {
      setSecurityFeedback({
        type: 'error',
        text: 'A nova senha deve ter no mínimo 8 caracteres, combinando letras e números ou símbolos.'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityFeedback({ type: 'error', text: 'A confirmação da senha não confere.' });
      return;
    }

    setSecuritySaving(true);
    try {
      const { client } = getSupabaseClient();
      if (!client) throw new Error('Cliente Supabase indisponível.');
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setSecurityFeedback({ type: 'success', text: 'Senha alterada com sucesso!' });
    } catch (err) {
      setSecurityFeedback({ type: 'error', text: err?.message || 'Erro ao alterar senha.' });
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setSecurityFeedback(null);
    if (!isOnline) {
      setSecurityFeedback({ type: 'error', text: 'Conecte-se à internet para alterar o e-mail.' });
      return;
    }
    const trimmed = newEmail.trim();
    if (!trimmed || trimmed === userProfile?.email) return;

    setSecuritySaving(true);
    try {
      const { client } = getSupabaseClient();
      if (!client) throw new Error('Cliente Supabase indisponível.');
      const { error } = await client.auth.updateUser({ email: trimmed });
      if (error) throw error;
      setSecurityFeedback({
        type: 'success',
        text: `Enviamos um link de confirmação para ${trimmed} para concluir a troca de e-mail.`
      });
    } catch (err) {
      setSecurityFeedback({ type: 'error', text: err?.message || 'Erro ao solicitar troca de e-mail.' });
    } finally {
      setSecuritySaving(false);
    }
  };

  const handleStartMfaEnroll = async () => {
    setSecurityFeedback(null);
    if (!isOnline) {
      setSecurityFeedback({ type: 'error', text: 'Conecte-se à internet para ativar a verificação em 2 fatores.' });
      return;
    }
    setMfaLoading(true);
    try {
      const { client } = getSupabaseClient();
      if (!client?.auth?.mfa) throw new Error('MFA indisponível neste cliente.');
      const { data, error } = await client.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Kivo Authenticator (${new Date().toLocaleDateString('pt-BR')})`
      });
      if (error) throw error;
      const qrDataUrl = await QRCode.toDataURL(data.totp.uri, {
        width: 180,
        margin: 1,
        color: { dark: '#0F172A', light: '#FFFFFF' }
      });
      setMfaEnrollData({
        id: data.id,
        secret: data.totp.secret,
        qrDataUrl
      });
      setMfaVerifyCode('');
    } catch (err) {
      setSecurityFeedback({ type: 'error', text: err?.message || 'Erro ao iniciar configuração 2FA.' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirmMfaEnroll = async (e) => {
    e.preventDefault();
    if (!mfaEnrollData?.id || mfaVerifyCode.trim().length < 6) return;
    setMfaLoading(true);
    setSecurityFeedback(null);
    try {
      const { client } = getSupabaseClient();
      const { data: chData, error: chErr } = await client.auth.mfa.challenge({
        factorId: mfaEnrollData.id
      });
      if (chErr) throw chErr;
      const { error: verErr } = await client.auth.mfa.verify({
        factorId: mfaEnrollData.id,
        challengeId: chData.id,
        code: mfaVerifyCode.trim()
      });
      if (verErr) throw verErr;
      setMfaEnrollData(null);
      setMfaVerifyCode('');
      await loadMfaFactors();
      AuditService.log('auth.mfa_enabled', 'auth', 'totp');
      setSecurityFeedback({ type: 'success', text: 'Autenticação em 2 Fatores (2FA) ativada com sucesso!' });
    } catch (err) {
      setSecurityFeedback({ type: 'error', text: err?.message || 'Código inválido. Verifique seu aplicativo autenticador.' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisableMfa = async (factorId) => {
    const ok = await confirm({
      title: 'Desativar verificação em 2 fatores',
      message: 'Sua conta voltará a exigir apenas e-mail e senha ao entrar em novos dispositivos.',
      confirmLabel: 'Desativar 2FA',
      variant: 'warning'
    });
    if (!ok) return;
    setMfaLoading(true);
    try {
      const { client } = getSupabaseClient();
      const { error } = await client.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      await loadMfaFactors();
      AuditService.log('auth.mfa_disabled', 'auth', 'totp');
      setSecurityFeedback({ type: 'success', text: 'Verificação em 2 Fatores desativada.' });
    } catch (err) {
      setSecurityFeedback({ type: 'error', text: err?.message || 'Erro ao desativar 2FA.' });
    } finally {
      setMfaLoading(false);
    }
  };

  const handleSaveScreenPin = async (e) => {
    e.preventDefault();
    setDeviceFeedback(null);
    const clean = screenPinInput.trim();
    if (!clean && !hasScreenPin) {
      setDeviceFeedback({ type: 'error', text: 'Digite um PIN numérico de 4 a 6 dígitos.' });
      return;
    }
    if (clean && !/^\d{4,6}$/.test(clean)) {
      setDeviceFeedback({ type: 'error', text: 'O PIN de tela deve ter de 4 a 6 dígitos numéricos.' });
      return;
    }
    try {
      if (clean) {
        const uid = userProfile?.userId || '';
        const hash = await hashPinSha256(clean, getUserPinSalt(uid));
        localStorage.setItem('kivo_screen_pin_hash', hash);
        if (uid) {
          localStorage.setItem('kivo_screen_pin_uid', uid);
        } else {
          localStorage.removeItem('kivo_screen_pin_uid');
        }
        setHasScreenPin(true);
        setScreenPinInput('');
      }
      localStorage.setItem('kivo_screen_lock_minutes', screenLockMinutes);
      onScreenLockConfigChange?.();
      setDeviceFeedback({ type: 'success', text: 'Bloqueio rápido de tela configurado neste dispositivo.' });
    } catch {
      setDeviceFeedback({ type: 'error', text: 'Não foi possível salvar a configuração local.' });
    }
  };

  const handleRemoveScreenPin = () => {
    try {
      localStorage.removeItem('kivo_screen_pin_hash');
      localStorage.removeItem('kivo_screen_pin_uid');
      setHasScreenPin(false);
      setScreenPinInput('');
      onScreenLockConfigChange?.();
      setDeviceFeedback({ type: 'success', text: 'Bloqueio por PIN removido deste aparelho.' });
    } catch {
      // ignora
    }
  };

  const handleTriggerSync = async () => {
    if (!onSyncNow) return;
    setSyncingNow(true);
    try {
      await onSyncNow();
    } finally {
      setSyncingNow(false);
    }
  };

  const handleSafeSignOut = async () => {
    if (!onSignOut) return;
    if (pendingSyncCount > 0) {
      const ok = await confirm({
        title: 'Alterações offline pendentes',
        message: 'Existem dados salvos apenas neste aparelho que ainda não foram enviados ao Supabase. Se sair agora, os dados não sincronizados serão removidos deste dispositivo.',
        detail: `${pendingSyncCount} registro(s) aguardando sincronização`,
        confirmLabel: 'Sair mesmo assim',
        variant: 'warning'
      });
      if (!ok) return;
    }
    onClose();
    await onSignOut();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#111214] border-0 sm:border sm:border-[#232429] w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1F2024] bg-[#141518] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-[#122620] text-[#34D399] rounded-xl border border-[#2EB88A]/30 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-[#F4F4F5] text-sm sm:text-base truncate flex items-center gap-2">
                <span>{isAdmin ? 'Administração & Conta' : 'Minha Conta & Perfil RT'}</span>
                {isAdmin && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#221A10] text-[#FBBF24] border border-[#F59E0B]/40">
                    Admin
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-[#71717A] truncate">
                {userProfile?.email || 'Conta Supabase autenticada'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025] transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="px-4 sm:px-6 border-b border-[#232429] bg-[#111214] flex gap-4 text-xs font-medium overflow-x-auto shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`py-2.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === 'admin'
                  ? 'border-[#F59E0B] text-[#FBBF24] font-semibold'
                  : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Administração
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'profile'
                ? 'border-[#2EB88A] text-[#34D399] font-semibold'
                : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {isAdmin ? 'Minha Conta' : 'Perfil RT'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'security'
                ? 'border-[#2EB88A] text-[#34D399] font-semibold'
                : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Conta & Segurança
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('device')}
            className={`py-2.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'device'
                ? 'border-[#2EB88A] text-[#34D399] font-semibold'
                : 'border-transparent text-[#71717A] hover:text-[#F4F4F5]'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Dispositivo & Offline
            {pendingSyncCount > 0 && (
              <span className="font-mono text-[10px] bg-[#221A10] text-[#FBBF24] border border-[#F59E0B]/30 px-1.5 rounded-full">
                {pendingSyncCount}
              </span>
            )}
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs space-y-5">
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmitProfile} className="space-y-4">
              {profileFeedback && (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    profileFeedback.type === 'error'
                      ? 'bg-[#221216] border-[#F43F5E]/40 text-[#FB7185]'
                      : 'bg-[#122620] border-[#2EB88A]/40 text-[#34D399]'
                  }`}
                >
                  {profileFeedback.text}
                </div>
              )}

              {/* Identidade Visual (Foto + Assinatura RT apenas para auditores) */}
              <div className={`grid grid-cols-1 ${isAdmin ? '' : 'sm:grid-cols-2'} gap-4 bg-[#141518] border border-[#232429] rounded-xl p-4`}>
                <div className="flex items-center gap-3">
                  {profile.avatarUrl ? (
                    <img
                      src={sanitizeMediaUrl(profile.avatarUrl)}
                      alt={profile.name || 'Foto do Perfil'}
                      className="w-12 h-12 rounded-full object-cover border border-[#2EB88A]/50 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#0D0E10] border border-[#27282E] flex items-center justify-center text-sm font-bold text-[#F4F4F5] shrink-0">
                      {profile.name?.charAt(0) || 'A'}
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <span className="text-[11px] font-semibold text-[#F4F4F5] block">
                      {isAdmin ? 'Foto do Administrador' : 'Foto do Perfil RT'}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] rounded-md text-[11px] text-[#E4E4E7] cursor-pointer transition">
                        <Upload className="w-3 h-3 text-[#34D399]" />
                        <span>{profile.avatarUrl ? 'Trocar' : 'Enviar foto'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleProfileImageUpload('avatarUrl', 280, e)}
                        />
                      </label>
                      {profile.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setProfile((prev) => ({ ...prev, avatarUrl: '' }))}
                          className="p-1 text-[#71717A] hover:text-[#FB7185] transition"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {!isAdmin && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#F4F4F5] flex items-center gap-1">
                        <PenTool className="w-3 h-3 text-[#34D399]" />
                        Assinatura Digital (Laudos PDF)
                      </span>
                      {profile.signatureUrl && (
                        <button
                          type="button"
                          onClick={() => setProfile((prev) => ({ ...prev, signatureUrl: '' }))}
                          className="text-[10px] text-[#FB7185] hover:underline"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      {profile.signatureUrl ? (
                        <div className="bg-white rounded-md px-2 py-1 border border-[#27282E] h-10 flex items-center justify-center">
                          <img
                            src={sanitizeMediaUrl(profile.signatureUrl)}
                            alt="Assinatura RT"
                            className="max-h-8 max-w-[120px] object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#71717A] italic">Nenhuma assinatura enviada</span>
                      )}
                      <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] rounded-md text-[11px] text-[#E4E4E7] cursor-pointer transition shrink-0">
                        <Upload className="w-3 h-3 text-[#34D399]" />
                        <span>{profile.signatureUrl ? 'Substituir' : 'Enviar imagem'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleProfileImageUpload('signatureUrl', 480, e)}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">
                    {isAdmin ? 'Nome do Administrador *' : 'Nome Completo do Auditor / RT *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.name || ''}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>

                {!isAdmin && (
                  <div>
                    <label className="block text-[#A1A1AA] font-medium mb-1">
                      Registro no Conselho de Classe (RT) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: CRQ-IV 04291880 ou CREA-MA 506921"
                      value={profile.registry || ''}
                      onChange={(e) => setProfile({ ...profile, registry: e.target.value })}
                      className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#34D399] font-mono focus:border-[#2EB88A] focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">
                    {isAdmin ? 'Função / Cargo no Sistema' : 'Título / Cargo Profissional'}
                  </label>
                  <input
                    type="text"
                    value={profile.title || ''}
                    onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                    placeholder={isAdmin ? 'Administrador do Sistema' : ''}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>

                {!isAdmin && (
                  <>
                    <div>
                      <label className="block text-[#A1A1AA] font-medium mb-1">
                        Área de Especialidade
                      </label>
                      <input
                        type="text"
                        value={profile.specialty || ''}
                        onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                        className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[#A1A1AA] font-medium mb-1">
                        Nome da Consultoria / PJ (Opcional)
                      </label>
                      <input
                        type="text"
                        value={profile.consultancyName || ''}
                        onChange={(e) => setProfile({ ...profile, consultancyName: e.target.value })}
                        className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">
                    Telefone / WhatsApp Comercial
                  </label>
                  <input
                    type="text"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Cor de Destaque White-Label */}
              <div className="bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#F4F4F5] flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#34D399]" />
                    Identidade Visual White-Label (Cor de Destaque)
                  </span>
                  <span className="text-[10px] text-[#71717A]">Aplicada ao sistema e cabeçalho de laudos</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {KIVO_ACCENT_PRESETS.map((preset) => {
                    const selected = (profile.accentColor || 'emerald') === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setProfile((prev) => ({ ...prev, accentColor: preset.id }))}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition text-[11px] ${
                          selected
                            ? 'bg-[#1E2025] border-[#F4F4F5]/40 text-[#F4F4F5] font-semibold'
                            : 'bg-[#0D0E10] border-[#232429] text-[#A1A1AA] hover:border-[#32343C]'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full shrink-0 border border-white/20 flex items-center justify-center"
                          style={{ backgroundColor: preset.hex }}
                        >
                          {selected && <Check className="w-2.5 h-2.5 text-white drop-shadow" />}
                        </span>
                        <span className="truncate">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-[#1F2024] flex items-center justify-end gap-2 pb-safe">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1E2025] rounded-lg transition"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold rounded-lg transition flex items-center gap-1.5 text-xs"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Perfil'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5">
              {securityFeedback && (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    securityFeedback.type === 'error'
                      ? 'bg-[#221216] border-[#F43F5E]/40 text-[#FB7185]'
                      : 'bg-[#122620] border-[#2EB88A]/40 text-[#34D399]'
                  }`}
                >
                  {securityFeedback.text}
                </div>
              )}

              {/* Alterar Senha */}
              <form onSubmit={handleChangePassword} className="bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-[#F4F4F5] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#34D399]" />
                  Alterar Senha de Acesso
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#A1A1AA] mb-1">Nova Senha (mín. 8 caracteres)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A1A1AA] mb-1">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={securitySaving || !newPassword}
                    className="px-4 py-2 bg-[#1C1D22] hover:bg-[#25272E] disabled:opacity-50 text-[#F4F4F5] border border-[#2D2F36] rounded-lg font-medium transition"
                  >
                    {securitySaving ? 'Atualizando...' : 'Atualizar Senha'}
                  </button>
                </div>
              </form>

              {/* Alterar E-mail */}
              <form onSubmit={handleChangeEmail} className="bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-[#F4F4F5] font-semibold">
                  <Mail className="w-4 h-4 text-[#34D399]" />
                  E-mail da Conta
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-1 bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={securitySaving || !newEmail.trim() || newEmail.trim() === userProfile?.email}
                    className="px-4 py-2 bg-[#1C1D22] hover:bg-[#25272E] disabled:opacity-50 text-[#F4F4F5] border border-[#2D2F36] rounded-lg font-medium transition shrink-0"
                  >
                    Trocar E-mail
                  </button>
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Ao alterar o e-mail, o Supabase enviará um link de validação para o novo endereço antes de ativá-lo.
                </p>
              </form>

              {/* Autenticação em 2 Fatores (MFA / TOTP) */}
              <div className="bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-[#F4F4F5] font-semibold">
                    <QrCode className="w-4 h-4 text-[#34D399]" />
                    Autenticação em 2 Fatores (2FA / TOTP)
                  </div>
                  {mfaFactors.length > 0 ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#122620] text-[#34D399] border border-[#2EB88A]/40">
                      2FA Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1A1B20] text-[#71717A] border border-[#27282E]">
                      Inativo
                    </span>
                  )}
                </div>

                {mfaFactors.length > 0 ? (
                  <div className="flex items-center justify-between gap-3 flex-wrap text-[11px]">
                    <p className="text-[#A1A1AA]">
                      Sua conta solicita código de 6 dígitos do aplicativo autenticador ao iniciar sessão.
                    </p>
                    <button
                      type="button"
                      disabled={mfaLoading}
                      onClick={() => handleDisableMfa(mfaFactors[0].id)}
                      className="px-3 py-1.5 bg-[#221216] hover:bg-[#2E161B] text-[#FB7185] border border-[#F43F5E]/40 rounded-lg font-medium transition shrink-0"
                    >
                      Desativar 2FA
                    </button>
                  </div>
                ) : mfaEnrollData ? (
                  <form onSubmit={handleConfirmMfaEnroll} className="space-y-3 pt-1">
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#0D0E10] border border-[#232429] rounded-lg p-3">
                      <img
                        src={mfaEnrollData.qrDataUrl}
                        alt="QR Code 2FA"
                        className="w-32 h-32 rounded-lg bg-white p-1.5 shrink-0"
                      />
                      <div className="space-y-2 text-[11px] min-w-0">
                        <p className="text-[#E4E4E7] font-medium">
                          1. Escaneie o QR Code no Google Authenticator, Authy ou 1Password.
                        </p>
                        <p className="text-[#71717A] break-all font-mono">
                          Chave manual: <strong className="text-[#34D399]">{mfaEnrollData.secret}</strong>
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={mfaVerifyCode}
                            onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="Código 6 dígitos"
                            className="w-36 bg-[#141518] border border-[#27282E] rounded-lg px-3 py-1.5 font-mono text-center text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                          />
                          <button
                            type="submit"
                            disabled={mfaLoading || mfaVerifyCode.length < 6}
                            className="px-3 py-1.5 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold rounded-lg transition"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setMfaEnrollData(null)}
                            className="px-2.5 py-1.5 text-[#71717A] hover:text-[#F4F4F5]"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3 flex-wrap text-[11px]">
                    <p className="text-[#71717A]">
                      Adicione uma segunda camada de proteção por código TOTP temporário.
                    </p>
                    <button
                      type="button"
                      disabled={mfaLoading || !isOnline}
                      onClick={handleStartMfaEnroll}
                      className="px-3.5 py-1.5 bg-[#122620] hover:bg-[#17322A] disabled:opacity-50 text-[#34D399] border border-[#2EB88A]/40 rounded-lg font-medium transition shrink-0"
                    >
                      {mfaLoading ? 'Preparando...' : 'Ativar 2FA'}
                    </button>
                  </div>
                )}
              </div>

              {/* Trilha de Auditoria */}
              <div className="bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#F4F4F5] font-semibold">
                    <History className="w-4 h-4 text-[#34D399]" />
                    Registro de Atividades Críticas (Auditoria)
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAuditLogs((v) => !v)}
                    className="text-[11px] text-[#34D399] hover:underline font-medium"
                  >
                    {showAuditLogs ? 'Ocultar' : `Ver últimos (${auditLogs.length})`}
                  </button>
                </div>
                {showAuditLogs && (
                  <div className="max-h-44 overflow-y-auto divide-y divide-[#1F2024] bg-[#0D0E10] border border-[#232429] rounded-lg">
                    {auditLogs.length === 0 ? (
                      <p className="p-3 text-[11px] text-[#71717A] text-center">
                        Nenhum evento registrado ainda.
                      </p>
                    ) : (
                      auditLogs.map((log, i) => {
                        const actor = isAdmin && log.user_id
                          ? adminUsers.find((u) => u.user_id === log.user_id)
                          : null;
                        const detailLabel = log.metadata?.unidade || log.metadata?.nome || log.metadata?.email || '';
                        return (
                          <div key={log.id || i} className="px-3 py-2 flex items-center justify-between gap-2 text-[11px]">
                            <div className="min-w-0 truncate">
                              <span className="font-mono text-[#34D399]">{log.action}</span>
                              {log.entity_id && (
                                <span className="text-[#E4E4E7] ml-1.5 font-mono">({log.entity_id})</span>
                              )}
                              {detailLabel && (
                                <span className="text-[#A1A1AA] ml-1.5">• {detailLabel}</span>
                              )}
                              {actor && (
                                <span className="text-[#71717A] ml-1.5">por {actor.full_name || actor.email}</span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-[#71717A] shrink-0">
                              {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '—'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Encerrar Sessão */}
              {onSignOut && (
                <div className="bg-[#181214] border border-[#F43F5E]/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-[#F4F4F5]">Encerrar Sessão neste Dispositivo</h4>
                    <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                      {pendingSyncCount > 0
                        ? `Atenção: há ${pendingSyncCount} alteração(ões) aguardando sincronização.`
                        : 'Todas as suas alterações estão seguras na nuvem.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSafeSignOut}
                    className="px-4 py-2 bg-[#221216] hover:bg-[#2E161B] text-[#FB7185] border border-[#F43F5E]/40 rounded-lg font-semibold transition flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair da Conta
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'device' && (
            <div className="space-y-4">
              <div className="bg-[#141518] border border-[#232429] rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <div className="p-2.5 rounded-xl bg-[#122620] text-[#34D399] border border-[#2EB88A]/30">
                      <Cloud className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#221A10] text-[#FBBF24] border border-[#F59E0B]/30">
                      <WifiOff className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-[#F4F4F5]">
                      {isOnline ? 'Conectado ao Supabase Cloud' : 'Operando em Modo Offline'}
                    </h4>
                    <p className="text-[11px] text-[#71717A]">
                      {pendingSyncCount > 0
                        ? `${pendingSyncCount} registro(s) na fila aguardando envio`
                        : 'Fila de sincronização limpa (100% atualizado)'}
                    </p>
                  </div>
                </div>

                {onSyncNow && (
                  <button
                    type="button"
                    disabled={!isOnline || syncingNow}
                    onClick={handleTriggerSync}
                    className="px-4 py-2 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold rounded-lg transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingNow ? 'animate-spin' : ''}`} />
                    {syncingNow ? 'Sincronizando...' : 'Sincronizar Agora'}
                  </button>
                )}
              </div>

              {pendingSyncCount > 0 && !isOnline && (
                <div className="bg-[#221A10] border border-[#F59E0B]/30 rounded-xl p-3.5 flex items-start gap-2.5 text-[#FBBF24]">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Suas vistorias, unidades e relatórios editados estão salvos no IndexedDB deste aparelho e subirão automaticamente assim que a internet voltar.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-[#141518] border border-[#232429] rounded-xl p-3.5">
                  <span className="text-[10px] text-[#71717A] block">Clientes</span>
                  <span className="text-xl font-bold font-mono text-[#F4F4F5]">{stats.clients}</span>
                </div>
                <div className="bg-[#141518] border border-[#232429] rounded-xl p-3.5">
                  <span className="text-[10px] text-[#71717A] block">Unidades</span>
                  <span className="text-xl font-bold font-mono text-[#34D399]">{stats.units}</span>
                </div>
                <div className="bg-[#141518] border border-[#232429] rounded-xl p-3.5">
                  <span className="text-[10px] text-[#71717A] block">Vistorias</span>
                  <span className="text-xl font-bold font-mono text-[#F4F4F5]">{stats.orders}</span>
                </div>
                <div className="bg-[#141518] border border-[#232429] rounded-xl p-3.5">
                  <span className="text-[10px] text-[#71717A] block">Relatórios</span>
                  <span className="text-xl font-bold font-mono text-[#F4F4F5]">{stats.reports}</span>
                </div>
              </div>

              {/* Bloqueio Rápido por PIN (Dispositivos Compartilhados) */}
              <form onSubmit={handleSaveScreenPin} className="bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[#F4F4F5] font-semibold">
                    <KeyRound className="w-4 h-4 text-[#34D399]" />
                    Bloqueio Rápido de Tela por PIN (Campo / Tablet)
                  </div>
                  {hasScreenPin && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#122620] text-[#34D399] border border-[#2EB88A]/40">
                      PIN Ativo
                    </span>
                  )}
                </div>

                {deviceFeedback && (
                  <p className={`text-[11px] ${deviceFeedback.type === 'error' ? 'text-[#FB7185]' : 'text-[#34D399]'}`}>
                    {deviceFeedback.text}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#A1A1AA] mb-1">PIN (4 a 6 dígitos)</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={screenPinInput}
                      onChange={(e) => setScreenPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder={hasScreenPin ? 'Novo PIN (ou vazio p/ manter)' : 'Ex: 1234'}
                      className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 font-mono text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A1A1AA] mb-1">Bloqueio Automático por Inatividade</label>
                    <select
                      value={screenLockMinutes}
                      onChange={(e) => setScreenLockMinutes(e.target.value)}
                      className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                    >
                      <option value="0">Apenas bloqueio manual</option>
                      <option value="5">Após 5 minutos sem uso</option>
                      <option value="15">Após 15 minutos sem uso</option>
                      <option value="30">Após 30 minutos sem uso</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {hasScreenPin ? (
                    <button
                      type="button"
                      onClick={handleRemoveScreenPin}
                      className="text-[11px] text-[#FB7185] hover:underline"
                    >
                      Remover PIN deste aparelho
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#71717A]">Protege o acesso se o aparelho ficar apoiado em campo.</span>
                  )}
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-[#1C1D22] hover:bg-[#25272E] text-[#F4F4F5] border border-[#2D2F36] rounded-lg font-medium transition"
                  >
                    Salvar PIN
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'admin' && isAdmin && (
            <div className="space-y-4">
              <div className="bg-[#141518] border border-[#F59E0B]/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#FBBF24]" />
                    <h4 className="font-semibold text-[#F4F4F5] text-sm">
                      Controle Administrativo do Sistema
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={loadAdminUsers}
                    disabled={adminLoading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0D0E10] hover:bg-[#1C1D22] text-[#E4E4E7] border border-[#27282E] rounded-lg text-[11px] transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 text-[#34D399] ${adminLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>
                <p className="text-[11px] text-[#A1A1AA]">
                  • <strong>Liberação de acesso:</strong> novos cadastros entram como pendentes e só acessam o sistema após sua autorização.<br />
                  • <strong>Unidades:</strong> compartilhadas entre usuários autorizados; apenas Admins podem excluir unidades.<br />
                  • <strong>Vistorias e Relatórios:</strong> exclusivos de cada auditor no dia a dia, com acesso administrativo completo para contas Admin.
                </p>
              </div>

              {adminFeedback && (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    adminFeedback.type === 'error'
                      ? 'bg-[#221216] border-[#F43F5E]/40 text-[#FB7185]'
                      : 'bg-[#122620] border-[#2EB88A]/40 text-[#34D399]'
                  }`}
                >
                  {adminFeedback.text}
                </div>
              )}

              <div className="bg-[#141518] border border-[#232429] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#1F2024] flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#E4E4E7] text-xs">
                    Usuários cadastrados no Supabase ({adminUsers.length})
                  </span>
                  {adminUsers.filter((u) => u.access_status === 'pending').length > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#221A10] text-[#FBBF24] border border-[#F59E0B]/40">
                      {adminUsers.filter((u) => u.access_status === 'pending').length} pendente(s)
                    </span>
                  )}
                </div>

                {!isOnline ? (
                  <p className="p-4 text-[11px] text-[#71717A] text-center">
                    Conecte-se à internet para listar e gerenciar usuários.
                  </p>
                ) : adminLoading && adminUsers.length === 0 ? (
                  <p className="p-4 text-[11px] text-[#71717A] text-center">Carregando usuários...</p>
                ) : adminUsers.length === 0 ? (
                  <p className="p-4 text-[11px] text-[#71717A] text-center">
                    Nenhum usuário encontrado. Aplique a migration 013 no Supabase SQL Editor para sincronizar a tabela user_roles.
                  </p>
                ) : (
                  <div className="divide-y divide-[#1F2024] max-h-72 overflow-y-auto">
                    {adminUsers.map((u) => {
                      const isSelf = u.user_id === userProfile?.userId;
                      const nextRole = u.role === 'admin' ? 'auditor' : 'admin';
                      const accessStatus = u.role === 'admin' ? 'approved' : (u.access_status || 'approved');
                      const accessBadge =
                        accessStatus === 'pending'
                          ? { label: 'Aguardando', cls: 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/40' }
                          : accessStatus === 'blocked'
                            ? { label: 'Bloqueado', cls: 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/40' }
                            : { label: 'Autorizado', cls: 'bg-[#122620] text-[#34D399] border-[#2EB88A]/40' };

                      return (
                        <div key={u.user_id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-[#F4F4F5] truncate">
                                {u.full_name || u.email || 'Usuário'}
                              </span>
                              <span
                                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                  u.role === 'admin'
                                    ? 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/40'
                                    : 'bg-[#18191D] text-[#A1A1AA] border-[#27282E]'
                                }`}
                              >
                                {u.role}
                              </span>
                              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${accessBadge.cls}`}>
                                {accessBadge.label}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] text-[#34D399]">(Você)</span>
                              )}
                            </div>
                            <span className="text-[11px] text-[#71717A] truncate block">{u.email}</span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                            {accessStatus !== 'approved' && (
                              <button
                                type="button"
                                disabled={adminUpdatingId === u.user_id}
                                onClick={async () => {
                                  setAdminUpdatingId(u.user_id);
                                  setAdminFeedback(null);
                                  try {
                                    await DataService.updateUserAccess(u.user_id, 'approved');
                                    await loadAdminUsers();
                                    onRolesChanged?.();
                                    setAdminFeedback({
                                      type: 'success',
                                      text: `Acesso autorizado para ${u.email}.`
                                    });
                                  } catch (err) {
                                    setAdminFeedback({ type: 'error', text: err.message });
                                  } finally {
                                    setAdminUpdatingId(null);
                                  }
                                }}
                                className="px-2.5 py-1 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] rounded-lg text-[11px] font-semibold transition shrink-0"
                              >
                                Autorizar
                              </button>
                            )}

                            {!isSelf && u.role !== 'admin' && accessStatus !== 'blocked' && (
                              <button
                                type="button"
                                disabled={adminUpdatingId === u.user_id}
                                onClick={async () => {
                                  const ok = await confirm({
                                    title: 'Bloquear acesso deste usuário?',
                                    message: `${u.email} perderá o acesso imediato ao sistema até que você autorize novamente.`,
                                    confirmLabel: 'Bloquear acesso',
                                    variant: 'danger'
                                  });
                                  if (!ok) return;
                                  setAdminUpdatingId(u.user_id);
                                  setAdminFeedback(null);
                                  try {
                                    await DataService.updateUserAccess(u.user_id, 'blocked');
                                    await loadAdminUsers();
                                    onRolesChanged?.();
                                    setAdminFeedback({
                                      type: 'success',
                                      text: `Acesso de ${u.email} bloqueado.`
                                    });
                                  } catch (err) {
                                    setAdminFeedback({ type: 'error', text: err.message });
                                  } finally {
                                    setAdminUpdatingId(null);
                                  }
                                }}
                                className="px-2.5 py-1 bg-[#221216] hover:bg-[#2E161B] disabled:opacity-50 text-[#FB7185] border border-[#F43F5E]/40 rounded-lg text-[11px] font-medium transition shrink-0"
                              >
                                Bloquear
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={adminUpdatingId === u.user_id}
                              onClick={async () => {
                                const ok = await confirm({
                                  title: nextRole === 'admin' ? 'Promover para Admin?' : 'Remover acesso Admin?',
                                  message:
                                    nextRole === 'admin'
                                      ? `${u.email} passará a poder excluir unidades, autorizar usuários e visualizar/gerenciar vistorias e relatórios do sistema.`
                                      : `${u.email} voltará ao perfil Auditor (acesso restrito aos próprios dados e unidades em comum).`,
                                  confirmLabel: nextRole === 'admin' ? 'Promover a Admin' : 'Definir Auditor',
                                  variant: nextRole === 'admin' ? 'warning' : 'danger'
                                });
                                if (!ok) return;
                                setAdminUpdatingId(u.user_id);
                                setAdminFeedback(null);
                                try {
                                  await DataService.updateUserRole(u.user_id, nextRole);
                                  await loadAdminUsers();
                                  onRolesChanged?.();
                                  setAdminFeedback({
                                    type: 'success',
                                    text: `Papel de ${u.email} atualizado para ${nextRole}.`
                                  });
                                } catch (err) {
                                  setAdminFeedback({ type: 'error', text: err.message });
                                } finally {
                                  setAdminUpdatingId(null);
                                }
                              }}
                              className="px-2.5 py-1 bg-[#0D0E10] hover:bg-[#1C1D22] disabled:opacity-50 text-[#E4E4E7] border border-[#27282E] rounded-lg text-[11px] font-medium transition shrink-0"
                            >
                              {u.role === 'admin' ? 'Tornar Auditor' : 'Tornar Admin'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Trilha de Auditoria Global do Sistema */}
              <div className="bg-[#141518] border border-[#232429] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#1F2024] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-[#34D399]" />
                    <span className="font-semibold text-[#E4E4E7] text-xs">
                      Auditoria Global de Eventos ({auditLogs.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => AuditService.listRecent(30).then(setAuditLogs)}
                    className="text-[11px] text-[#34D399] hover:underline"
                  >
                    Atualizar logs
                  </button>
                </div>
                {auditLogs.length === 0 ? (
                  <p className="p-4 text-[11px] text-[#71717A] text-center">
                    Nenhum evento registrado ainda.
                  </p>
                ) : (
                  <div className="divide-y divide-[#1F2024] max-h-56 overflow-y-auto">
                    {auditLogs.map((log, i) => {
                      const actor = log.user_id
                        ? adminUsers.find((u) => u.user_id === log.user_id)
                        : null;
                      const detailLabel = log.metadata?.unidade || log.metadata?.nome || log.metadata?.email || '';
                      return (
                        <div key={log.id || i} className="px-4 py-2 flex items-center justify-between gap-2 text-[11px]">
                          <div className="min-w-0 truncate">
                            <span className="font-mono text-[#34D399]">{log.action}</span>
                            {log.entity_id && (
                              <span className="text-[#E4E4E7] ml-1.5 font-mono">({log.entity_id})</span>
                            )}
                            {detailLabel && (
                              <span className="text-[#A1A1AA] ml-1.5">• {detailLabel}</span>
                            )}
                            {actor && (
                              <span className="text-[#71717A] ml-1.5">por {actor.full_name || actor.email}</span>
                            )}
                          </div>
                          <span className="font-mono text-[10px] text-[#71717A] shrink-0">
                            {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
