import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, FileText, Mail, Copy, Check, ExternalLink, MessageSquare } from 'lucide-react';
import { copyTextToClipboard } from '../../utils/kivoHelpers';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@kivo.com.br';
const SUPPORT_CHANNEL = import.meta.env.VITE_SUPPORT_CHANNEL || 'Atendimento técnico segunda a sexta, 08h às 18h (BRT)';
const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP || '').replace(/\D/g, '');

export default function LegalInfoModal({ isOpen, initialTab = 'privacidade', onClose }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyEmail = async () => {
    const ok = await copyTextToClipboard(SUPPORT_EMAIL);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const tabs = [
    { id: 'privacidade', label: 'Política de Privacidade', icon: ShieldCheck },
    { id: 'termos', label: 'Termos de Uso', icon: FileText },
    { id: 'suporte', label: 'Contato & Suporte', icon: Mail }
  ];

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Informações Legais e Suporte"
    >
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl bg-[#111214] border border-[#232429] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1F2024] flex items-center justify-between gap-3 bg-[#0D0E10]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#122620] border border-[#2EB88A]/30 text-[#34D399] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#F4F4F5]">Privacidade, Termos &amp; Suporte</h2>
              <p className="text-[11px] text-[#71717A]">Transparência LGPD e canais oficiais do Kivo</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#1C1D22] rounded-lg transition"
            aria-label="Fechar janela"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-3 border-b border-[#1F2024] flex gap-1.5 overflow-x-auto bg-[#0D0E10]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition whitespace-nowrap ${
                  active
                    ? 'border-[#2EB88A] text-[#34D399] bg-[#141518]'
                    : 'border-transparent text-[#8E9299] hover:text-[#F4F4F5]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-[#D4D4D8] leading-relaxed">
          {activeTab === 'privacidade' && (
            <div className="space-y-3.5">
              <p className="text-[11px] text-[#71717A] font-mono">
                Conformidade com a LGPD (Lei nº 13.709/2018)
              </p>

              <section className="space-y-1">
                <h3 className="text-xs font-semibold text-[#F4F4F5]">1. Dados coletados e finalidade</h3>
                <p className="text-[#A1A1AA]">
                  O Kivo armazena apenas informações necessárias para autenticação, execução de vistorias e emissão de relatórios técnicos: nome, e-mail profissional, número de registro/conselho (ex.: CRQ/CREA), clientes/unidades cadastrados, respostas de checklist e fotografias de evidência anexadas pelo auditor.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="text-xs font-semibold text-[#F4F4F5]">2. Armazenamento, isolamento e modo offline</h3>
                <p className="text-[#A1A1AA]">
                  Seus dados são protegidos na nuvem com controle de acesso por linha (Row-Level Security — cada conta acessa exclusivamente suas próprias inspeções, unidades e anexos). Para permitir vistorias sem internet, rascunhos e fila de sincronização ficam salvos localmente no dispositivo via <code className="text-[#E4E4E7]">localStorage</code> e <code className="text-[#E4E4E7]">IndexedDB</code>.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="text-xs font-semibold text-[#F4F4F5]">3. Cookies e rastreamento</h3>
                <p className="text-[#A1A1AA]">
                  Não utilizamos cookies publicitários ou scripts de rastreamento de terceiros. Apenas tokens estritamente necessários de sessão autenticada são mantidos no navegador.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="text-xs font-semibold text-[#F4F4F5]">4. Direitos do titular</h3>
                <p className="text-[#A1A1AA]">
                  Você pode atualizar seu perfil, exportar relatórios/planilhas ou excluir registros diretamente na plataforma. Para solicitações formais de exclusão definitiva ou dúvidas sobre tratamento de dados, utilize o canal na aba <strong>Contato &amp; Suporte</strong>.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'termos' && (
            <div className="space-y-3.5">
              <section className="space-y-1">
                <h3 className="text-xs font-semibold text-[#F4F4F5]">1. Objeto da plataforma</h3>
                <p className="text-[#A1A1AA]">
                  O Kivo é uma ferramenta de apoio operacional para vistorias ambientais, acompanhamento de planos de ação e geração de espelhos de checklist e relatórios técnicos em PDF.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="text-xs font-semibold text-[#F4F4F5]">2. Responsabilidade técnica</h3>
                <p className="text-[#A1A1AA]">
                  A veracidade dos apontamentos, classificações de não conformidades, prazos e conclusões emitidas nos relatórios é de responsabilidade exclusiva do Responsável Técnico / Auditor autenticado na conta.
                </p>
              </section>

              <section className="space-y-1">
                <h3 className="text-xs font-semibold text-[#F4F4F5]">3. Credenciais e uso adequado</h3>
                <p className="text-[#A1A1AA]">
                  Cada acesso é pessoal e intransferível. Recomendamos manter senha forte, não compartilhar sessões em dispositivos públicos e sincronizar pendentes offline antes de limpar os dados do navegador.
                </p>
              </section>
            </div>
          )}

          {activeTab === 'suporte' && (
            <div className="space-y-4">
              <p className="text-[#A1A1AA]">
                Precisa de auxílio técnico, suporte para implantação ou atendimento relacionado à LGPD? Entre em contato pelos canais abaixo:
              </p>

              <div className="bg-[#141518] border border-[#232429] rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#71717A] font-semibold block">
                      E-mail de Suporte / Encarregado (DPO)
                    </span>
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="text-sm font-semibold text-[#34D399] hover:underline inline-flex items-center gap-1.5 mt-0.5"
                    >
                      <span>{SUPPORT_EMAIL}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] text-xs font-medium text-[#F4F4F5] transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#34D399]" /> : <Copy className="w-3.5 h-3.5 text-[#A1A1AA]" />}
                    <span>{copied ? 'Copiado!' : 'Copiar e-mail'}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-[#1F2024] text-[11px] text-[#A1A1AA]">
                  <strong className="text-[#E4E4E7]">Horário de atendimento:</strong> {SUPPORT_CHANNEL}
                </div>

                {SUPPORT_WHATSAPP && (
                  <div className="pt-2 border-t border-[#1F2024]">
                    <a
                      href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Olá! Preciso de suporte técnico no sistema Kivo.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#122620] hover:bg-[#17322A] border border-[#2EB88A]/30 text-xs font-semibold text-[#34D399] transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Abrir atendimento no WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1F2024] bg-[#0D0E10] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] text-xs font-semibold text-[#F4F4F5] transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
