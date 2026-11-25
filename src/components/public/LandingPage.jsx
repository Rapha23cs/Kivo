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
  ExternalLink,
  Sun,
  Moon,
  Menu,
  X,
  Lock,
  Grid,
  CalendarDays,
  ArrowRightLeft,
  ChevronDown,
  Leaf,
  HardHat,
  Route
} from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../supabase/supabaseConfig';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || 'suporte@kivo.com.br';
const SUPPORT_WHATSAPP = (import.meta.env.VITE_SUPPORT_WHATSAPP || '').replace(/\D/g, '');

export default function LandingPage({
  onOpenLogin,
  onOpenSignup,
  onOpenLegal,
  theme = 'dark',
  onToggleTheme
}) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);
  const [sentStatus, setSentStatus] = useState(null);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState('checklist'); // checklist | sst | routes | portal
  const [openFaqIdx, setOpenFaqIdx] = useState(0);

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
      title: 'Checklists Ambientais & SST',
      desc: '63 pontos ambientais em 11 temáticas (RDC-50, PGRSS, NR-32) e checklists modulares de SST por NR (NR-01 a NR-35), além de modelos personalizados.'
    },
    {
      icon: WifiOff,
      title: 'Modo Offline Real em Campo',
      desc: 'Audite em subsolos, casas de máquinas ou hospitais sem internet. As respostas e fotos ficam em IndexedDB e sincronizam automaticamente ao reconectar.'
    },
    {
      icon: Camera,
      title: 'Evidências & Antes × Depois',
      desc: 'Compressão automática de fotos, remoção de EXIF, carimbo técnico com unidade/data/hora e comparador visual interativo Antes × Depois nos Planos de Ação.'
    },
    {
      icon: FileBarChart2,
      title: 'Laudos A4 & Consolidado por Rede',
      desc: 'Exporte laudos executivos em PDF A4 prontos para diretoria ou gere o consolidado comparativo entre todas as unidades de um mesmo cliente.'
    },
    {
      icon: CalendarDays,
      title: 'Agenda Recorrente & Vencimentos SST',
      desc: 'Calendário mensal com recorrência automática por unidade e controle de validade para AVCB, extintores, EPIs, treinamentos NR e laudos.'
    },
    {
      icon: ShieldCheck,
      title: 'Portal QR com PIN & 2FA',
      desc: 'Compartilhe o laudo somente leitura via QR Code com prazo de expiração e código PIN opcional, além de 2FA (TOTP) e RLS multi-auditor.'
    }
  ];

  const steps = [
    {
      num: '01',
      title: 'Organize Clientes, Unidades & Agenda',
      desc: 'Cadastre contratos, regionais, logotipos, cronogramas recorrentes e o inventário de vencimentos SST em um único painel.'
    },
    {
      num: '02',
      title: 'Execute a Vistoria em Campo',
      desc: 'Preencha o checklist no celular mesmo offline, classifique desvios (ou calcule risco na Matriz 5×5) e registre fotos carimbadas.'
    },
    {
      num: '03',
      title: 'Publique PDF A4 & Portal Validado',
      desc: 'Conclua o relatório técnico em segundos, baixe o PDF executivo ou envie o link protegido por PIN e QR Code para o gestor acompanhar.'
    }
  ];

  const faqs = [
    {
      q: 'O Kivo funciona mesmo em áreas sem internet (subsolos, centrais ou zonas rurais)?',
      a: 'Sim. O aplicativo opera como PWA offline-first com armazenamento local em IndexedDB e fila inteligente de sincronização. Assim que a conexão retorna, vistorias, relatórios, unidades e fotos pendentes sobem automaticamente.'
    },
    {
      q: 'O cliente precisa criar uma conta para ver o relatório enviado?',
      a: 'Não. Ao ativar o Portal Público no relatório, você gera um link exclusivo e QR Code com validade configurável (7, 30 ou 90 dias) e código PIN opcional para o gestor visualizar e imprimir o laudo.'
    },
    {
      q: 'Posso usar checklists próprios além dos padrões Ambiental e SST?',
      a: 'Sim. No editor de Modelos de Checklist você cria formulários personalizados por disciplina e pode vinculá-los tanto às novas vistorias quanto às visitas recorrentes da Agenda.'
    },
    {
      q: 'Como os dados das empresas e fotos ficam protegidos?',
      a: 'Cada conta opera isolada no PostgreSQL via Row-Level Security (RLS), as imagens ficam em bucket privado acessado por URLs assinadas, há suporte a 2FA por aplicativo autenticador e registro imutável de auditoria.'
    },
    {
      q: 'Consigo comparar a evolução de várias unidades de um mesmo cliente?',
      a: 'Sim. O módulo de Relatórios oferece a visão Consolidada por Rede, agrupando médias de conformidade, maturidade e volume de desvios por contrato/cliente.'
    }
  ];

  const navLinks = [
    { href: '#fluxos', label: 'Ambiental & SST' },
    { href: '#recursos', label: 'Recursos' },
    { href: '#fluxo', label: 'Como funciona' },
    { href: '#faq', label: 'Dúvidas' },
    { href: '#contato', label: 'Contato' }
  ];

  return (
    <div className="min-h-[100dvh] bg-[#0B0B0D] text-[#F4F4F5] font-sans selection:bg-[#2EB88A] selection:text-[#0B0B0D]">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0B0B0D]/90 backdrop-blur-xl border-b border-[#1F2024]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <a href="#topo" className="flex items-center gap-2.5 shrink-0 group">
            <img src="/icon.svg" alt="Logo Kivo" className="w-9 h-9 rounded-xl shadow-sm transition group-hover:scale-105" />
            <div>
              <span className="font-bold text-base tracking-tight text-[#F4F4F5] block leading-none">
                KIVO
              </span>
              <span className="text-[10px] font-mono text-[#34D399] uppercase tracking-wider block mt-0.5">
                Vistorias &amp; Relatórios
              </span>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-[#A1A1AA]">
            {navLinks.map((lnk) => (
              <a
                key={lnk.href}
                href={lnk.href}
                className="px-3 py-1.5 rounded-lg hover:bg-[#141518] hover:text-[#F4F4F5] transition"
              >
                {lnk.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className="p-2 rounded-xl bg-[#141518] hover:bg-[#1C1D22] border border-[#27282E] text-[#A1A1AA] hover:text-[#F4F4F5] transition"
                title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
                aria-label="Alternar tema"
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-[#34D399]" />
                ) : (
                  <Sun className="w-4 h-4 text-[#FBBF24]" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#141518] hover:bg-[#1C1D22] border border-[#27282E] text-xs font-semibold text-[#F4F4F5] transition"
            >
              <LogIn className="w-3.5 h-3.5 text-[#34D399]" />
              <span>Entrar</span>
            </button>
            <button
              type="button"
              onClick={onOpenSignup}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2EB88A] hover:bg-[#34D399] text-xs font-semibold text-[#09090B] transition shadow-sm shadow-[#2EB88A]/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Criar Conta</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              className="md:hidden p-2 rounded-xl bg-[#141518] border border-[#27282E] text-[#A1A1AA] hover:text-[#F4F4F5]"
              aria-label="Abrir navegação"
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-[#1F2024] bg-[#111214] px-4 py-3 space-y-2 animate-fade-in">
            <div className="flex flex-wrap gap-2">
              {navLinks.map((lnk) => (
                <a
                  key={lnk.href}
                  href={lnk.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#141518] border border-[#232429] text-xs text-[#E4E4E7]"
                >
                  {lnk.label}
                </a>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileNavOpen(false);
                onOpenSignup();
              }}
              className="w-full py-2.5 rounded-xl bg-[#2EB88A] text-[#09090B] font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Criar Conta Gratuita
            </button>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="topo" className="relative overflow-hidden border-b border-[#1F2024]">
        <div
          className="pointer-events-none absolute -top-36 left-1/2 -translate-x-1/2 w-[780px] h-[420px] rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #2EB88A 0%, transparent 70%)' }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-22 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#122620] border border-[#2EB88A]/35 text-[#34D399] text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Meio Ambiente, SST &amp; Roteirização em Campo</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold tracking-tight text-[#F4F4F5] leading-[1.08]">
              Da vistoria em campo ao{' '}
              <span className="text-[#34D399]">laudo técnico validado</span>, mesmo sem internet.
            </h1>

            <p className="text-sm sm:text-base text-[#A1A1AA] leading-relaxed max-w-xl">
              Padronize auditorias ambientais e de SST em uma plataforma única: execute checklists offline no celular, planeje rotas de unidades no Maranhão, gerencie planos 5W2H e publique laudos A4 com QR Code e PIN.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onOpenLogin}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] font-bold text-sm transition shadow-lg shadow-[#2EB88A]/20"
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px]">
              {[
                { val: '63 + 7 NRs', label: 'Checklists Prontos' },
                { val: 'Offline', label: 'IndexedDB + PWA' },
                { val: 'Rotas MA', label: 'Mapa & Otimização' },
                { val: 'PDF + QR', label: 'Portal com PIN' }
              ].map((stat) => (
                <div key={stat.val} className="kivo-card rounded-2xl px-3.5 py-3">
                  <span className="font-mono font-bold text-[#34D399] block text-xs kivo-tabular">{stat.val}</span>
                  <span className="text-[#71717A] text-[10px] block mt-0.5">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive SaaS App Preview */}
          <div className="lg:col-span-6">
            <div className="kivo-card rounded-2xl overflow-hidden shadow-2xl">
              {/* Mock Window Bar */}
              <div className="px-4 py-3 bg-[#141518] border-b border-[#232429] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]/75" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/75" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2EB88A]/85" />
                  <span className="ml-2 font-mono text-[10px] text-[#71717A]">kivo.app/painel</span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#122620] text-[#34D399] border border-[#2EB88A]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
                  Nuvem &amp; Offline Ready
                </span>
              </div>

              {/* Interactive Pill Tabs */}
              <div className="px-4 pt-3 pb-2 bg-[#111214] border-b border-[#1F2024] flex items-center gap-1.5 overflow-x-auto text-[11px]">
                {[
                  { id: 'checklist', label: 'Checklist' },
                  { id: 'sst', label: 'SST & Matriz 5×5' },
                  { id: 'routes', label: 'Rotas MA' },
                  { id: 'portal', label: 'Laudo PDF & QR' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPreviewTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                      previewTab === tab.id
                        ? 'bg-[#122620] text-[#34D399] border border-[#2EB88A]/35 font-semibold'
                        : 'text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#141518]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-5 space-y-4 min-h-[280px] bg-[#111214]">
                {previewTab === 'checklist' && (
                  <div className="space-y-3.5 animate-fade-in">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-4 h-4 text-[#34D399] shrink-0" />
                        <span className="text-xs font-semibold text-[#F4F4F5] truncate">
                          Hospital Regional • Unidade Norte
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-[#34D399] bg-[#122620] px-2 py-0.5 rounded border border-[#2EB88A]/30 shrink-0">
                        92.1% Conforme
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="bg-[#141518] border border-[#232429] rounded-xl p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono text-[#34D399]">#14 • Gestão de Resíduos (PGRSS)</span>
                          <p className="text-xs text-[#E4E4E7] mt-0.5">
                            Abrigo externo de RSS identificado, trancado e com contenção íntegra?
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-md bg-[#122620] text-[#34D399] border border-[#2EB88A]/40 font-mono text-[11px] font-bold shrink-0">
                          SIM
                        </span>
                      </div>

                      <div className="bg-[#141518] border border-[#F43F5E]/35 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-[#FB7185]">#27 • Produtos Químicos (FISPQ)</span>
                            <p className="text-xs text-[#E4E4E7] mt-0.5">
                              FISPQs atualizadas e bacia de contenção disponível no almoxarifado?
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-md bg-[#221216] text-[#FB7185] border border-[#F43F5E]/40 font-mono text-[11px] font-bold shrink-0">
                            NÃO
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] bg-[#0D0E10] rounded-lg px-2.5 py-1.5 border border-[#232429]">
                          <span>Foto carimbada • 24/11 14:22</span>
                          <span className="text-[#FB7185] font-semibold">Prazo: 48h (Grave)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {previewTab === 'sst' && (
                  <div className="space-y-3.5 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#F4F4F5] flex items-center gap-1.5">
                        <Grid className="w-4 h-4 text-[#FBBF24]" />
                        Matriz de Risco 5×5 &amp; Plano 5W2H
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#221A10] text-[#FBBF24] border border-[#F59E0B]/30">
                        NR-06 • NR-10 • NR-23 • NR-35
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[10px]">
                      {[
                        { score: 5, qty: 0, cls: 'bg-[#0EA5E9]/20 border-[#38BDF8]/40' },
                        { score: 10, qty: 1, cls: 'bg-[#F59E0B]/20 border-[#FBBF24]/45' },
                        { score: 15, qty: 2, cls: 'bg-[#F97316]/25 border-[#FB923C]/50' },
                        { score: 20, qty: 1, cls: 'bg-[#F43F5E]/25 border-[#F43F5E]/60' },
                        { score: 25, qty: 0, cls: 'bg-[#F43F5E]/30 border-[#F43F5E]/70' }
                      ].map((cell) => (
                        <div key={cell.score} className={`rounded-lg border py-2 ${cell.cls}`}>
                          <span className="font-bold text-[#F4F4F5] block">{cell.qty}</span>
                          <span className="text-[9px] text-[#A1A1AA]">R{cell.score}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-[#141518] border border-[#232429] rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#34D399] font-semibold">
                          <ArrowRightLeft className="w-3 h-3" /> Comparador Antes × Depois
                        </span>
                        <p className="text-[#E4E4E7] mt-0.5 truncate">
                          Quadro elétrico sinalizado e bloqueado (NR-10)
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#122620] text-[#34D399] border border-[#2EB88A]/35 text-[10px] font-semibold shrink-0">
                        Concluído
                      </span>
                    </div>
                  </div>
                )}

                {previewTab === 'routes' && (
                  <div className="space-y-3.5 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#F4F4F5] flex items-center gap-1.5">
                        <Route className="w-4 h-4 text-[#34D399]" />
                        Roteiro Otimizado • Maranhão (MA)
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#122620] text-[#34D399] border border-[#2EB88A]/30">
                        368 km • ~5h 10min
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {[
                        { num: 1, nome: 'Hospital Regional • São Luís', meta: 'Partida • GPS exato' },
                        { num: 2, nome: 'UPA Rosário', meta: '+58 km • Agenda próxima' },
                        { num: 3, nome: 'Hospital Macrorregional • Caxias', meta: '+310 km • 2 desvios críticos' }
                      ].map((stop) => (
                        <div key={stop.num} className="bg-[#141518] border border-[#232429] rounded-xl p-2.5 flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-full bg-[#2EB88A] text-[#09090B] font-mono font-bold text-[11px] flex items-center justify-center shrink-0">
                            {stop.num}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-[#F4F4F5] truncate">{stop.nome}</p>
                            <p className="text-[10px] text-[#71717A] truncate">{stop.meta}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {previewTab === 'portal' && (
                  <div className="space-y-3.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-[11px] text-[#34D399] block">REL-OS-2026-042</span>
                        <h4 className="text-xs font-bold text-[#F4F4F5]">Laudo Técnico Executivo A4</h4>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#122620] text-[#34D399] border border-[#2EB88A]/35 text-[10px] font-semibold">
                        <Lock className="w-3 h-3" /> PIN + 30 dias
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="bg-[#141518] border border-[#232429] rounded-xl p-2.5">
                        <span className="text-[10px] text-[#71717A] block">Índice</span>
                        <span className="font-mono font-bold text-sm text-[#34D399]">92.1%</span>
                      </div>
                      <div className="bg-[#141518] border border-[#232429] rounded-xl p-2.5">
                        <span className="text-[10px] text-[#71717A] block">Aderência</span>
                        <span className="font-semibold text-xs text-[#F4F4F5]">Alta</span>
                      </div>
                      <div className="bg-[#141518] border border-[#232429] rounded-xl p-2.5">
                        <span className="text-[10px] text-[#71717A] block">Fotos</span>
                        <span className="font-mono font-bold text-sm text-[#F4F4F5]">18</span>
                      </div>
                    </div>

                    <div className="bg-[#141518] border border-[#232429] rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-white text-[#09090B] flex items-center justify-center shrink-0">
                          <QrCode className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-[#F4F4F5] block truncate">Portal Público do Cliente</span>
                          <span className="text-[10px] text-[#71717A] block truncate">
                            Validado por token UUID + expiração automática
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#34D399] shrink-0">PDF A4</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Disciplines Comparison */}
      <section id="fluxos" className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-6 space-y-8">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#34D399]">Dois Fluxos Integrados</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F5] tracking-tight">
            Meio Ambiente e Segurança do Trabalho em uma única plataforma
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="kivo-card kivo-card-interactive border-[#2EB88A]/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#122620] text-[#34D399] border border-[#2EB88A]/35">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F4F4F5]">Meio Ambiente</h3>
                  <span className="text-[11px] text-[#34D399] font-mono">63 itens • 11 temáticas normativas</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#122620] text-[#34D399] border border-[#2EB88A]/30">
                ATIVO
              </span>
            </div>
            <ul className="space-y-2 text-xs text-[#A1A1AA]">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#34D399] shrink-0" /> Resíduos (PGRSS), Produtos Químicos (FISPQ), Água, Efluentes e Emissões</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#34D399] shrink-0" /> Apuração automática da Regra 6 (Não = anomalia + prazo + responsável)</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#34D399] shrink-0" /> 56 slots fotográficos padrão + fotos extras e Consolidado por Rede</li>
            </ul>
          </div>

          <div className="kivo-card kivo-card-interactive border-[#F59E0B]/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#221A10] text-[#FBBF24] border border-[#F59E0B]/35">
                  <HardHat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#F4F4F5]">Segurança do Trabalho (SST)</h3>
                  <span className="text-[11px] text-[#FBBF24] font-mono">Checklists por NR + Matriz 5×5</span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#221A10] text-[#FBBF24] border border-[#F59E0B]/30">
                ATIVO
              </span>
            </div>
            <ul className="space-y-2 text-xs text-[#A1A1AA]">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" /> Módulos NR-01, NR-06, NR-10, NR-12, NR-23, NR-24 e NR-35 combináveis</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" /> Matriz de Risco 5×5 (Probabilidade × Severidade) clicável nos Planos de Ação</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" /> Inventário de Vencimentos SST (AVCB, extintores, CAs de EPIs e treinamentos)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-10">
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
                className="kivo-card kivo-card-interactive rounded-2xl p-5 space-y-3"
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
              <div key={step.num} className="kivo-card kivo-card-interactive rounded-2xl p-6 space-y-3">
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

      {/* FAQ Accordion */}
      <section id="faq" className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-6 space-y-6">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-[#34D399]">Dúvidas Frequentes</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#F4F4F5] tracking-tight">
            Tudo o que sua equipe técnica precisa saber
          </h2>
        </div>

        <div className="space-y-2.5">
          {faqs.map((item, idx) => {
            const isOpen = openFaqIdx === idx;
            return (
              <div
                key={item.q}
                className="kivo-card rounded-2xl overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left text-xs sm:text-sm font-semibold text-[#F4F4F5] hover:bg-[#18191D] transition"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#34D399] shrink-0 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-[#A1A1AA] leading-relaxed border-t border-[#1F2024] pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Contact / Demo Request */}
      <section id="contato" className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start kivo-card rounded-2xl p-6 sm:p-8">
          <div className="lg:col-span-5 space-y-4">
            <span className="text-xs font-mono uppercase tracking-widest text-[#34D399]">Contato Direto</span>
            <h2 className="text-2xl font-bold text-[#F4F4F5] tracking-tight">
              Implante o Kivo na sua equipe técnica
            </h2>
            <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
              Quer apresentar o sistema para sua diretoria, personalizar modelos ou tirar dúvidas sobre implantação e LGPD? Fale conosco pelo formulário ou pelos canais diretos.
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
            <span>Kivo • Vistorias &amp; Relatórios Técnicos (Ambiental &amp; SST)</span>
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
