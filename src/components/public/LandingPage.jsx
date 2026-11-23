import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  WifiOff,
  Camera,
  FileBarChart2,
  ShieldCheck,
  QrCode,
  Mail,
  Send,
  MessageSquare,
  Building2,
  Sparkles,
  LogIn,
  UserPlus,
  ExternalLink
} from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../supabase/supabaseConfig';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@kivo.com.br';
const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP || '').replace(/\D/g, '');

export default function LandingPage({ onOpenLogin, onOpenSignup, onOpenLegal }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState(null); // { type: 'success' | 'error', text: string }

  const handleSubmitContact = async (e) => {
    e.preventDefault();
    if (nome.trim().length < 2 || !email.includes('@')) {
      setSentStatus({ type: 'error', text: 'Preencha seu nome e um e-mail válido.' });
      return;
    }

    setSending(true);
    setSentStatus(null);

    try {
      let persistedInCloud = false;
      if (isSupabaseConfigured() && navigator.onLine !== false) {
        const { client } = getSupabaseClient();
        if (client) {
          const { error } = await client.from('contatos_demonstracao').insert({
            nome: nome.trim(),
            email: email.trim(),
            empresa: empresa.trim() || null,
            mensagem: mensagem.trim() || null,
            origem: 'landing_page'
          });
          if (!error) {
            persistedInCloud = true;
          }
        }
      }

      if (!persistedInCloud) {
        const subject = encodeURIComponent(`Contato Kivo — ${empresa.trim() || nome.trim()}`);
        const body = encodeURIComponent(
          `Nome: ${nome.trim()}\nE-mail: ${email.trim()}\nEmpresa/Unidade: ${empresa.trim() || '—'}\n\nMensagem:\n${mensagem.trim() || 'Solicito apresentação da plataforma Kivo.'}`
        );
        window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
      }

      setSentStatus({
        type: 'success',
        text: persistedInCloud
          ? 'Solicitação registrada com sucesso! Nossa equipe técnica entrará em contato em breve.'
          : 'Abrimos seu cliente de e-mail para concluir o envio da solicitação.'
      });
      setNome('');
      setEmail('');
      setEmpresa('');
      setMensagem('');
    } catch {
      setSentStatus({
        type: 'error',
        text: `Não foi possível enviar automaticamente. Escreva para ${SUPPORT_EMAIL}.`
      });
    } finally {
      setSending(false);
    }
  };

  const features = [
    {
      icon: ClipboardCheck,
      title: 'Checklist Ambiental Estruturado',
      desc: '63 pontos distribuídos em 11 temáticas normativas (RDC-50, NR-32, PGRSS e NR-20) com apuração automática de conformidade e Regra 6.'
    },
    {
      icon: WifiOff,
      title: 'Modo Offline Real em Campo',
      desc: 'Continue vistoriando em subsolos, áreas industriais ou hospitais sem sinal. Tudo é salvo em IndexedDB e sincronizado ao reconectar.'
    },
    {
      icon: Camera,
      title: 'Evidências com Carimbo Técnico',
      desc: 'Compressão automática das fotos e carimbo de data, hora e referência da unidade diretamente na imagem para auditoria.'
    },
    {
      icon: FileBarChart2,
      title: 'Laudos Executivos em PDF',
      desc: 'Gere relatórios completos com fachada, 8 indicadores consolidados, tabela de desvios, galeria fotográfica e nível de aderência.'
    },
    {
      icon: QrCode,
      title: 'Portal Público por Token & QR Code',
      desc: 'Compartilhe um link somente leitura exclusivo com o cliente ou gestor da unidade, com validação via QR Code no documento.'
    },
    {
      icon: ShieldCheck,
      title: 'Segurança Multi-Auditor (RLS)',
      desc: 'Cada responsável técnico opera em ambiente isolado por conta, com Row-Level Security no Postgres e políticas privadas de mídia.'
    }
  ];

  const steps = [
    {
      num: '01',
      title: 'Cadastre Clientes & Unidades',
      desc: 'Organize contratos, regionais, municípios e histórico de auditorias por estabelecimento atendido.'
    },
    {
      num: '02',
      title: 'Execute a Vistoria no Celular',
      desc: 'Preencha o checklist mesmo offline, anexe fotos com legenda e registre desvios com prazo e responsável.'
    },
    {
      num: '03',
      title: 'Publique PDF e Link Validado',
      desc: 'Exporte o laudo técnico em PDF ou ative o link público com QR Code para acompanhamento direto pelo cliente.'
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] font-sans selection:bg-[#2EB88A] selection:text-[#0B0B0D]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0B0B0D]/90 backdrop-blur-md border-b border-[#1F2024]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#topo" className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="Logo Kivo" className="w-9 h-9 rounded-xl" />
            <div>
              <span className="font-bold text-base tracking-tight text-[#F4F4F5] block leading-none">
                KIVO
              </span>
              <span className="text-[10px] font-mono text-[#34D399] uppercase tracking-wider block mt-0.5">
                Inspeções Ambientais
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-[#A1A1AA]">
            <a href="#recursos" className="hover:text-[#F4F4F5] transition">Recursos</a>
            <a href="#fluxo" className="hover:text-[#F4F4F5] transition">Como funciona</a>
            <a href="#contato" className="hover:text-[#F4F4F5] transition">Contato</a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#141518] hover:bg-[#1C1D22] border border-[#27282E] text-xs font-semibold text-[#F4F4F5] transition"
            >
              <LogIn className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Entrar</span>
            </button>
            <button
              type="button"
              onClick={onOpenSignup}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2EB88A] hover:bg-[#34D399] text-xs font-semibold text-[#09090B] transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Criar Conta</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="topo" className="relative overflow-hidden border-b border-[#1F2024]">
        <div
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[380px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #2EB88A 0%, transparent 70%)' }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#122620] border border-[#2EB88A]/35 text-[#34D399] text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Plataforma para Responsáveis Técnicos &amp; Auditorias</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F4F4F5] leading-[1.12]">
              Da vistoria em campo ao{' '}
              <span className="text-[#34D399]">laudo ambiental validado</span>, mesmo sem internet.
            </h1>

            <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed max-w-2xl">
              Padronize inspeções sanitárias e ambientais com checklist completo, registro fotográfico carimbado, geração de relatórios PDF e compartilhamento seguro com seus clientes.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-bold text-sm transition shadow-lg shadow-[#2EB88A]/15"
              >
                <span>Acessar Plataforma</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#contato"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#141518] hover:bg-[#1C1D22] border border-[#27282E] text-[#E4E4E7] font-semibold text-sm transition"
              >
                <span>Solicitar Demonstração</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-[#A1A1AA]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Offline-first (PWA)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Dados isolados (LGPD + RLS)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#34D399]" /> Exportação PDF &amp; CSV
              </span>
            </div>
          </div>

          {/* Visual System Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#141518] border border-[#27282E] rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2024] pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#34D399]" />
                  <span className="text-xs font-semibold text-[#F4F4F5]">Hospital Regional • Unidade Norte</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#122620] text-[#34D399] border border-[#2EB88A]/30">
                  FINALIZADO
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0D0E10] border border-[#232429] rounded-xl p-3">
                  <span className="text-[10px] uppercase text-[#71717A] font-semibold block">Conformidade</span>
                  <span className="text-2xl font-black font-mono text-[#34D399] mt-0.5 block">92.1%</span>
                  <span className="text-[10px] text-[#A1A1AA]">Alta Aderência Ambiental</span>
                </div>
                <div className="bg-[#0D0E10] border border-[#232429] rounded-xl p-3">
                  <span className="text-[10px] uppercase text-[#71717A] font-semibold block">Itens Avaliados</span>
                  <span className="text-2xl font-black font-mono text-[#F4F4F5] mt-0.5 block">63/63</span>
                  <span className="text-[10px] text-[#A1A1AA]">11 temáticas normativas</span>
                </div>
              </div>

              <div className="bg-[#0D0E10] border border-[#232429] rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#E4E4E7] font-medium">Sincronização &amp; Portal</span>
                  <span className="text-[10px] font-mono text-[#34D399]">QR Code Ativo</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1C1D22] overflow-hidden">
                  <div className="h-full w-[92%] bg-[#2EB88A] rounded-full" />
                </div>
                <p className="text-[11px] text-[#71717A]">
                  Laudo emitido com 18 registros fotográficos e link público de conferência.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-10">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#34D399]">Recursos Operacionais</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F5] tracking-tight">
            Projetado para a rotina real de campo e gestão técnica
          </h2>
          <p className="text-sm text-[#A1A1AA]">
            Elimine planilhas soltas, fotos perdidas no celular e retrabalho para montar apresentações em slides.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.title}
                className="bg-[#141518] border border-[#232429] hover:border-[#2EB88A]/40 rounded-2xl p-5 space-y-3 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-[#122620] border border-[#2EB88A]/30 text-[#34D399] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#F4F4F5]">{feat.title}</h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="fluxo" className="border-y border-[#1F2024] bg-[#111214]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-10">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#34D399]">Fluxo em 3 Etapas</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F5] tracking-tight">
              Do planejamento à entrega ao gestor da unidade
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {steps.map((step) => (
              <div key={step.num} className="bg-[#141518] border border-[#232429] rounded-2xl p-6 space-y-3">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-[#122620] text-[#34D399] border border-[#2EB88A]/30 inline-block">
                  PASSO {step.num}
                </span>
                <h3 className="text-base font-bold text-[#F4F4F5]">{step.title}</h3>
                <p className="text-xs text-[#A1A1AA] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Demo Request */}
      <section id="contato" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-[#141518] border border-[#232429] rounded-2xl p-6 sm:p-8">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-mono uppercase tracking-widest text-[#34D399]">Contato Direto</span>
            <h2 className="text-2xl font-bold text-[#F4F4F5] tracking-tight">
              Implante o Kivo na sua equipe técnica
            </h2>
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
              Quer apresentar o sistema para sua diretoria, personalizar unidades ou tirar dúvidas sobre implantação e LGPD? Fale conosco pelo formulário ou pelos canais diretos.
            </p>

            <div className="space-y-2.5 pt-2 text-xs">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0D0E10] border border-[#232429] hover:border-[#2EB88A]/40 text-[#E4E4E7] transition"
              >
                <Mail className="w-4 h-4 text-[#34D399] shrink-0" />
                <span className="truncate">{SUPPORT_EMAIL}</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#71717A] ml-auto shrink-0" />
              </a>

              {SUPPORT_WHATSAPP && (
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Olá! Gostaria de conhecer o sistema Kivo.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-[#122620] border border-[#2EB88A]/30 hover:bg-[#17322A] text-[#34D399] font-medium transition"
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span>Atendimento via WhatsApp</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-auto shrink-0" />
                </a>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmitContact} className="lg:col-span-7 space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="landing-nome" className="block text-[#A1A1AA] font-medium mb-1.5">
                  Seu nome *
                </label>
                <input
                  id="landing-nome"
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full bg-[#0D0E10] border border-[#27282E] focus:border-[#2EB88A] rounded-xl px-3.5 py-2.5 text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="landing-email" className="block text-[#A1A1AA] font-medium mb-1.5">
                  E-mail profissional *
                </label>
                <input
                  id="landing-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com.br"
                  className="w-full bg-[#0D0E10] border border-[#27282E] focus:border-[#2EB88A] rounded-xl px-3.5 py-2.5 text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label htmlFor="landing-empresa" className="block text-[#A1A1AA] font-medium mb-1.5">
                Empresa / Hospital / Consultoria
              </label>
              <input
                id="landing-empresa"
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Nome da organização"
                className="w-full bg-[#0D0E10] border border-[#27282E] focus:border-[#2EB88A] rounded-xl px-3.5 py-2.5 text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="landing-msg" className="block text-[#A1A1AA] font-medium mb-1.5">
                Como podemos ajudar?
              </label>
              <textarea
                id="landing-msg"
                rows={3}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Conte brevemente sobre sua equipe e quantidade de unidades..."
                className="w-full bg-[#0D0E10] border border-[#27282E] focus:border-[#2EB88A] rounded-xl px-3.5 py-2.5 text-sm text-[#F4F4F5] placeholder-[#71717A] focus:outline-none resize-none"
              />
            </div>

            {sentStatus && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  sentStatus.type === 'success'
                    ? 'bg-[#122620] border-[#2EB88A]/40 text-[#34D399]'
                    : 'bg-[#221216] border-[#F43F5E]/40 text-[#FB7185]'
                }`}
              >
                {sentStatus.text}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-[#71717A]">
                Seus dados são usados apenas para responder este contato.
              </span>
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold text-xs transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Enviando...' : 'Enviar Solicitação'}</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1F2024] bg-[#0D0E10]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#71717A]">
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="Kivo" className="w-5 h-5 rounded" />
            <span>Kivo • Inspeções &amp; Relatórios Ambientais</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button type="button" onClick={onOpenLogin} className="hover:text-[#F4F4F5] transition">
              Entrar
            </button>
            <button type="button" onClick={() => onOpenLegal('privacidade')} className="hover:text-[#F4F4F5] transition">
              Privacidade
            </button>
            <button type="button" onClick={() => onOpenLegal('termos')} className="hover:text-[#F4F4F5] transition">
              Termos de Uso
            </button>
            <button type="button" onClick={() => onOpenLegal('suporte')} className="hover:text-[#F4F4F5] transition">
              Suporte
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
