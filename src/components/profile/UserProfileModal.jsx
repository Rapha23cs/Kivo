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
  Trash2
} from 'lucide-react';
import { getSupabaseClient } from '../../supabase/supabaseConfig';
import { compressImageToDataUrl } from '../../supabase/dataService';
import { sanitizeMediaUrl } from '../../utils/kivoHelpers';
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
  stats = { orders: 0, reports: 0, units: 0, clients: 0 }
}) {
  if (!isOpen) return null;

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

  useEffect(() => {
    setProfile({ ...userProfile });
    setNewEmail(userProfile?.email || '');
  }, [userProfile, isOpen]);

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
    if (newPassword.length < 6) {
      setSecurityFeedback({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
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
              <h3 className="font-semibold text-[#F4F4F5] text-sm sm:text-base truncate">
                Minha Conta & Perfil RT
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
            Perfil RT
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

              {/* Identidade Visual do RT (Foto + Assinatura para Laudos PDF) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#141518] border border-[#232429] rounded-xl p-4">
                <div className="flex items-center gap-3">
                  {profile.avatarUrl ? (
                    <img
                      src={sanitizeMediaUrl(profile.avatarUrl)}
                      alt={profile.name || 'Foto do Auditor'}
                      className="w-12 h-12 rounded-full object-cover border border-[#2EB88A]/50 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#0D0E10] border border-[#27282E] flex items-center justify-center text-sm font-bold text-[#F4F4F5] shrink-0">
                      {profile.name?.charAt(0) || 'A'}
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <span className="text-[11px] font-semibold text-[#F4F4F5] block">Foto do Perfil RT</span>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">
                    Nome Completo do Auditor / RT *
                  </label>
                  <input
                    type="text"
                    required
                    value={profile.name || ''}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>

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

                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">
                    Título / Cargo Profissional
                  </label>
                  <input
                    type="text"
                    value={profile.title || ''}
                    onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                  />
                </div>

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
                    <label className="block text-[#A1A1AA] mb-1">Nova Senha (mín. 6 caracteres)</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••"
                      className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:border-[#2EB88A] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A1A1AA] mb-1">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
