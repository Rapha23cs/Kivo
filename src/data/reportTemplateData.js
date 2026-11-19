// Estrutura e Regras de Negócio do Módulo de Relatórios de Inspeção Ambiental
// Extraído integralmente do modelo oficial de Relatório (Slides 1 a 35), adaptado de forma neutra para o Kivo (multi-cliente).

// Critérios oficiais da Tabela 01 (Slide 2)
export const REPORT_RESULT_GUIDELINES = [
  {
    key: 'itensAvaliados',
    label: 'Itens Avaliados',
    criterion: 'Quantidade total de itens avaliados no checklist, desconsiderando os itens marcados como "Não Aplicável".'
  },
  {
    key: 'conformidades',
    label: 'Conformidades',
    criterion: 'Quantidade de itens avaliados como "Sim".'
  },
  {
    key: 'desviosPlanoAcao',
    label: 'Desvios com Plano de Ação',
    criterion: 'Quantidade de desvios tratados diretamente por Plano de Ação.'
  },
  {
    key: 'naoConformidades',
    label: 'Não Conformidades Ambientais',
    criterion: 'Quantidade de desvios classificados como Não Conformidade Ambiental.'
  },
  {
    key: 'ocorrenciasAmbientais',
    label: 'Ocorrências Ambientais',
    criterion: 'Quantidade de desvios classificados como Ocorrência Ambiental.'
  },
  {
    key: 'notificacoes',
    label: 'Notificações',
    criterion: 'Quantidade de notificações ambientais emitidas durante a inspeção.'
  },
  {
    key: 'interdicoes',
    label: 'Interdições',
    criterion: 'Quantidade de interdições realizadas durante a inspeção.'
  },
  {
    key: 'indiceConformidade',
    label: 'Índice Geral de Conformidade (%)',
    criterion: 'Resultado percentual obtido pela divisão entre conformidades e itens avaliados: (Conformidades / Itens Avaliados) x 100.'
  }
];

// Classificações e Fluxos da Tabela 03 (Slides 3 e 4)
export const DEVIATION_CLASSIFICATIONS = [
  {
    value: 'Desvio Pontual',
    label: 'Desvio Pontual',
    defaultTratativa: 'Plano de Ação Corretiva'
  },
  {
    value: 'Não Conformidade Ambiental',
    label: 'Não Conformidade Ambiental',
    defaultTratativa: 'Registro e Tratativa de Não Conformidade Ambiental'
  },
  {
    value: 'Ocorrência Ambiental',
    label: 'Ocorrência Ambiental',
    defaultTratativa: 'Registro no Procedimento de Gestão de Ocorrências Ambientais'
  },
  {
    value: 'Notificação',
    label: 'Notificação',
    defaultTratativa: 'Atendimento formal à Notificação Ambiental emitida'
  },
  {
    value: 'Interdição',
    label: 'Interdição',
    defaultTratativa: 'Contenção imediata e cumprimento das exigências para desinterdição'
  }
];

export const DEVIATION_STATUS_OPTIONS = ['Em Aberto', 'Em Andamento', 'Concluído'];

export const MATURITY_LEVELS = [
  {
    value: 'Inicial',
    label: 'Inicial',
    criterion: 'NC Maior em aberto e/ou reincidência relevante de desvios; controles ainda não estruturados.'
  },
  {
    value: 'Em Desenvolvimento',
    label: 'Em Desenvolvimento',
    criterion: 'Sem NC Maior; há NC Menor(es) e/ou desvios pontuais isolados, sem reincidência.'
  },
  {
    value: 'Consolidado',
    label: 'Consolidado',
    criterion: 'Sem Não Conformidades; desvios eventuais tratados apenas por Plano de Ação, sem reincidência.'
  }
];

export const ADHERENCE_RULES = [
  { range: '< 70%', label: 'Baixa Aderência', variant: 'danger' },
  { range: '70% a 85%', label: 'Média Aderência', variant: 'warning' },
  { range: '> 85%', label: 'Alta Aderência', variant: 'success' }
];

// Seções do Registro Fotográfico (Slides 5 a 32)
export const PHOTO_SECTIONS = [
  'Gestão de Resíduos',
  'Gestão de Produtos Químicos',
  'Água e Efluentes',
  'Controles Operacionais e Infraestrutura',
  'Emergência e Licenciamento'
];

// Mapeamento exato dos 63 itens do Checklist -> 56 slots fotográficos do Relatório
export const CHECKLIST_TO_REPORT_PHOTO_SLOT = {
  1: 1,
  3: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 6,
  9: 7,
  12: 8,
  13: 9,
  14: 10,
  15: 11,
  16: 12,
  17: 13,
  18: 14,
  19: 15,
  21: 16,
  22: 17,
  24: 18,
  25: 19,
  26: 20,
  27: 21,
  28: 22,
  29: 23,
  30: 24,
  32: 25,
  33: 26,
  34: 27,
  35: 28,
  36: 29,
  37: 30,
  38: 31,
  39: 32,
  40: 33,
  41: 34,
  42: 35,
  43: 36,
  44: 37,
  45: 38,
  46: 39,
  47: 40,
  48: 41,
  49: 42,
  51: 43,
  52: 44,
  53: 45,
  54: 46,
  55: 47,
  56: 49,
  57: 50,
  58: 51,
  59: 52,
  60: 53,
  61: 54,
  62: 55,
  63: 56
};

export function mapTopicToPhotoSection(topic = '') {
  if (topic === 'Gestão de Resíduos') return 'Gestão de Resíduos';
  if (topic === 'Gestão de Produtos Químicos') return 'Gestão de Produtos Químicos';
  if (topic === 'Água' || topic === 'Efluentes') return 'Água e Efluentes';
  if (topic === 'Emergência Ambiental' || topic === 'Licenciamento Ambiental') return 'Emergência e Licenciamento';
  return 'Controles Operacionais e Infraestrutura';
}

// Todos os 56 pontos de registro fotográfico presentes nos Slides 5 a 32
export const REPORT_PHOTO_SLOTS = [
  // Slide 5
  { ordem: 1, secao: 'Gestão de Resíduos', legenda: 'Segregação adequada dos resíduos por grupo/classe' },
  { ordem: 2, secao: 'Gestão de Resíduos', legenda: 'Os resíduos perfurocortantes estão acondicionados adequadamente' },
  // Slide 6
  { ordem: 3, secao: 'Gestão de Resíduos', legenda: 'O abrigo de resíduos encontra-se adequado (portas trancadas, piso/paredes laváveis e ventilação adequada), identificado e sinalizado' },
  { ordem: 4, secao: 'Gestão de Resíduos', legenda: 'O abrigo de resíduos possui controle de acesso' },
  // Slide 7
  { ordem: 5, secao: 'Gestão de Resíduos', legenda: 'As bombonas estão adequadas (tampas rosqueadas, identificadas) e são suficientes para demanda gerada' },
  { ordem: 6, secao: 'Gestão de Resíduos', legenda: 'PGRSS da unidade está atualizado e implementado' },
  // Slide 8
  { ordem: 7, secao: 'Gestão de Resíduos', legenda: 'A equipe da unidade conhece os indicadores de gestão de resíduos' },
  { ordem: 8, secao: 'Gestão de Resíduos', legenda: 'Os produtos químicos possuem FDS disponível em local visível' },
  // Slide 9
  { ordem: 9, secao: 'Gestão de Produtos Químicos', legenda: 'Os produtos químicos estão adequadamente identificados e rotulados' },
  { ordem: 10, secao: 'Gestão de Produtos Químicos', legenda: 'Há segregação adequada entre os produtos químicos armazenados' },
  // Slide 10
  { ordem: 11, secao: 'Gestão de Produtos Químicos', legenda: 'Os produtos químicos fracionados estão em recipientes adequados e rotulados, conforme procedimento' },
  { ordem: 12, secao: 'Gestão de Produtos Químicos', legenda: 'O armazenamento e acondicionamento dos produtos químicos possuem contenção e sinalização adequadas' },
  // Slide 11
  { ordem: 13, secao: 'Gestão de Produtos Químicos', legenda: 'Inventário de Produtos Químicos está atualizado' },
  { ordem: 14, secao: 'Gestão de Produtos Químicos', legenda: 'DML (Depósito de Material de Limpeza) devidamente identificado e em condições adequadas' },
  // Slide 12
  { ordem: 15, secao: 'Gestão de Produtos Químicos', legenda: 'O manual de saneantes da unidade' },
  { ordem: 16, secao: 'Gestão de Produtos Químicos', legenda: 'A equipe que manuseia produto químico é devidamente treinada (FDS e procedimento) e conhece os riscos da sua atividade' },
  // Slide 13
  { ordem: 17, secao: 'Água e Efluentes', legenda: 'O sistema de abastecimento de água (concessionária/poço/misto) encontra-se adequado com hidrômetro e cercamento' },
  { ordem: 18, secao: 'Água e Efluentes', legenda: 'Existe controle de consumo de água e reserva para situações de emergência ou risco de desabastecimento' },
  // Slide 14
  { ordem: 19, secao: 'Água e Efluentes', legenda: 'Os reservatórios de água encontram-se íntegros, com impermeabilização adequada, limpeza em dia, com tampas, sem fissuras e trincas' },
  { ordem: 20, secao: 'Água e Efluentes', legenda: 'Os sistemas de tratamento de água (cloração/abrandador) estão instalados e em funcionamento' },
  // Slide 15
  { ordem: 21, secao: 'Água e Efluentes', legenda: 'O sistema de drenagem pluvial encontra-se adequado, com calhas limpas e desobstruídas' },
  { ordem: 22, secao: 'Água e Efluentes', legenda: 'As instalações hidráulicas da unidade encontram-se em condições adequadas, sem vazamentos aparentes' },
  // Slide 16
  { ordem: 23, secao: 'Água e Efluentes', legenda: 'Os pontos de coleta (torneiras) estão adequados (sem corrosão, ferrugem)' },
  { ordem: 24, secao: 'Água e Efluentes', legenda: 'A rede sanitária da unidade não apresenta contribuições indevidas de água do dreno de ar condicionado' },
  // Slide 17
  { ordem: 25, secao: 'Água e Efluentes', legenda: 'Tampas e tampões dos PVs de esgoto e de águas pluviais estão íntegros, vedados e devidamente identificados para evitar misturas' },
  { ordem: 26, secao: 'Água e Efluentes', legenda: 'A Estação de Tratamento de Efluentes (ETE) opera adequadamente (limpa, bombas e sopradores funcionando, equipamentos operantes), com hidrômetro de saída em funcionamento' },
  // Slide 18
  { ordem: 27, secao: 'Água e Efluentes', legenda: 'O ponto de lançamento de efluentes está em condições adequadas (sem vazamento, sem odor, área capinada)' },
  { ordem: 28, secao: 'Água e Efluentes', legenda: 'As instalações e sistemas de coleta de efluentes da unidade estão livres de vazamentos aparentes' },
  // Slide 19
  { ordem: 29, secao: 'Água e Efluentes', legenda: 'As fossas sépticas, filtros biológicos e tanques de equalização/passagem não apresentam rachaduras, trincas ou sinais de vazamento/infiltração no solo' },
  { ordem: 30, secao: 'Água e Efluentes', legenda: 'O operador da ETE e a equipe de coleta conhecem os aspectos, impactos e controles da sua atividade' },
  // Slide 20
  { ordem: 31, secao: 'Água e Efluentes', legenda: 'O operador da ETE apresentou os registros diários de controle/operação do sistema (pH, cloro, vazão, análise do lodo, etc.)' },
  { ordem: 32, secao: 'Água e Efluentes', legenda: 'A unidade possui equipamentos ou processos geradores de emissões atmosféricas (ex.: gerador, veículos a diesel)' },
  // Slide 21
  { ordem: 33, secao: 'Controles Operacionais e Infraestrutura', legenda: 'Existe monitoramento de fumaça preta' },
  { ordem: 34, secao: 'Controles Operacionais e Infraestrutura', legenda: 'Os equipamentos e veículos estão livres de sinais visíveis de emissão excessiva' },
  // Slide 22
  { ordem: 35, secao: 'Controles Operacionais e Infraestrutura', legenda: 'As emissões pontuais são lançadas de forma a permitir boa dispersão atmosférica (dutos/chaminés)' },
  { ordem: 36, secao: 'Controles Operacionais e Infraestrutura', legenda: 'Existem controles implementados para minimização das emissões atmosféricas' },
  // Slide 23
  { ordem: 37, secao: 'Controles Operacionais e Infraestrutura', legenda: 'Evidência de cronograma para manutenção preventiva dos geradores na unidade' },
  { ordem: 38, secao: 'Controles Operacionais e Infraestrutura', legenda: 'Evidência de cronograma para manutenção preventiva dos veículos a diesel na unidade' },
  // Slide 24
  { ordem: 39, secao: 'Controles Operacionais e Infraestrutura', legenda: 'A unidade possui equipamentos ruidosos (ex.: gerador, chiller, torre de resfriamento)' },
  { ordem: 40, secao: 'Controles Operacionais e Infraestrutura', legenda: 'Existem controles para minimização de ruído (ex.: contenções, estruturas cobertas, enclausuramentos)' },
  // Slide 25
  { ordem: 41, secao: 'Controles Operacionais e Infraestrutura', legenda: 'Existem kits de emergência ambiental disponíveis, incluindo para produtos químicos, quando aplicável' },
  { ordem: 42, secao: 'Controles Operacionais e Infraestrutura', legenda: 'Os materiais para atuação em contenção (kits de emergência) encontram-se adequados e em quantidade suficiente' },
  // Slide 26
  { ordem: 43, secao: 'Emergência e Licenciamento', legenda: 'A Licença de Operação (ou Dispensa/Isenção) está vigente' },
  { ordem: 44, secao: 'Emergência e Licenciamento', legenda: 'A Licença de Outorga de Uso de Poço está vigente' },
  // Slide 27
  { ordem: 45, secao: 'Emergência e Licenciamento', legenda: 'A Licença de Operação de ETE está vigente' },
  { ordem: 46, secao: 'Emergência e Licenciamento', legenda: 'A Licença de Outorga de Lançamento de Efluentes está vigente' },
  // Slide 28
  { ordem: 47, secao: 'Emergência e Licenciamento', legenda: 'O Alvará de Funcionamento e o Alvará Sanitário encontram-se válidos' },
  { ordem: 48, secao: 'Emergência e Licenciamento', legenda: 'Situação do AVCB da unidade' },
  // Slide 29
  { ordem: 49, secao: 'Emergência e Licenciamento', legenda: 'As licenças e documentações ambientais estão dispostas em local visível aos colaboradores' },
  { ordem: 50, secao: 'Emergência e Licenciamento', legenda: 'As condicionantes ambientais estão sendo acompanhadas e atendidas' },
  // Slide 30
  { ordem: 51, secao: 'Emergência e Licenciamento', legenda: 'Os registros ambientais encontram-se atualizados e disponíveis' },
  { ordem: 52, secao: 'Emergência e Licenciamento', legenda: 'As estruturas ambientais encontram-se adequadas e em boas condições de conservação' },
  // Slide 31
  { ordem: 53, secao: 'Controles Operacionais e Infraestrutura', legenda: 'As áreas apresentam condições adequadas de limpeza e organização' },
  { ordem: 54, secao: 'Controles Operacionais e Infraestrutura', legenda: 'Os controles operacionais relacionados aos aspectos ambientais identificados estão implementados' },
  // Slide 32
  { ordem: 55, secao: 'Controles Operacionais e Infraestrutura', legenda: 'Os riscos ambientais identificados possuem controles adequados por meio dos treinamentos' },
  { ordem: 56, secao: 'Controles Operacionais e Infraestrutura', legenda: 'Os colaboradores demonstram conhecimento das práticas ambientais aplicáveis (ex.: segregação de resíduos, manuseio de produtos químicos, uso racional da água)' }
];

// Classificação automática do Nível de Aderência Ambiental (Tabela 02 / Item 7.3.4)
export function calculateAdherenceLevel(indiceConformidade) {
  const val = Number(indiceConformidade) || 0;
  if (val < 70) return 'Baixa Aderência';
  if (val <= 85) return 'Média Aderência';
  return 'Alta Aderência';
}

// Sugestão automática do Nível de Maturidade (Tabela 02 - Slide 34)
export function suggestMaturityLevel(desvios = []) {
  const hasMaiorOpen = desvios.some(
    (d) => d.classificacao === 'Não Conformidade Ambiental' && d.severidadeNc === 'Maior' && d.status !== 'Concluído'
  );
  if (hasMaiorOpen) return 'Inicial';

  const hasNC = desvios.some((d) => d.classificacao === 'Não Conformidade Ambiental');
  if (hasNC || desvios.length > 0) return 'Em Desenvolvimento';

  return 'Consolidado';
}

// Cálculo automático do Índice Geral de Conformidade (Fórmula Slide 2)
export function calculateConformityIndex(conformidades, itensAvaliados) {
  const total = Number(itensAvaliados) || 0;
  const ok = Number(conformidades) || 0;
  if (total <= 0) return 0;
  return Number(((ok / total) * 100).toFixed(1));
}

// Contagem automática dos desvios por classificação (Slides 1, 2 e 4)
export function summarizeDeviationsByClass(desvios = []) {
  return {
    desviosPlanoAcao: desvios.filter((d) => d.classificacao === 'Desvio Pontual').length,
    naoConformidades: desvios.filter((d) => d.classificacao === 'Não Conformidade Ambiental').length,
    ocorrenciasAmbientais: desvios.filter((d) => d.classificacao === 'Ocorrência Ambiental').length,
    notificacoes: desvios.filter((d) => d.classificacao === 'Notificação').length,
    interdicoes: desvios.filter((d) => d.classificacao === 'Interdição').length
  };
}

// Gerador do texto estruturado de Conclusão (Modelo Slide 33, neutro/multi-cliente)
export function buildDefaultConclusionText({
  indiceConformidade = 0,
  nivelAderencia,
  nivelMaturidade = 'Em Desenvolvimento',
  pontosPositivos = '',
  sinteseDesvios = ''
}) {
  const aderencia = nivelAderencia || calculateAdherenceLevel(indiceConformidade);
  const aderenciaCurta = aderencia.replace(' Aderência', '');
  const maturidadeTexto = (nivelMaturidade || 'Em Desenvolvimento').toLowerCase();

  const positivosStr = pontosPositivos?.trim()
    ? `, destacando-se como pontos positivos ${pontosPositivos.trim().replace(/\.$/, '')}`
    : '';

  const desviosStr = sinteseDesvios?.trim()
    ? `Foram identificados desvios relacionados principalmente a ${sinteseDesvios.trim().replace(/\.$/, '')}, os quais foram classificados e direcionados para tratativa conforme os critérios técnicos vigentes.`
    : 'Não foram registrados desvios críticos ou não conformidades impeditivas durante a inspeção.';

  return [
    `Com base na inspeção ambiental realizada, verificou-se que a unidade apresenta nível de aderência ambiental classificado como ${aderenciaCurta} (Índice Geral de Conformidade de ${Number(indiceConformidade).toFixed(1).replace('.', ',')}%), considerando os controles operacionais observados, os requisitos legais aplicáveis, os registros avaliados e as evidências identificadas durante a inspeção.`,
    `De forma geral, observou-se que os processos relacionados à gestão ambiental apresentam nível de maturidade ${maturidadeTexto}${positivosStr}.`,
    desviosStr,
    `Os desvios identificados demandam acompanhamento da unidade e da gestão responsável, visando o fortalecimento da aderência operacional, a melhoria contínua dos controles ambientais e a prevenção de reincidências.`
  ].join('\n\n');
}

export function createBlankReport({ userProfile, hospitals = [] } = {}) {
  const firstHospital = hospitals[0] || {};
  const year = new Date().getFullYear();
  const suffix = `${Math.random().toString(36).slice(2, 5).toUpperCase()}${String(Date.now()).slice(-3)}`;

  return {
    id: `local-rel-${Date.now()}`,
    codigoRelatorio: `RIA-${year}-${suffix}`,
    clienteNome: firstHospital.clientName || 'EMSERH',
    unidade: firstHospital.name || '',
    dataHora: new Date().toISOString().slice(0, 16),
    cidade: firstHospital.municipio || 'São Luís',
    regional: firstHospital.regional || 'Regional Metropolitana',
    tipoInspecao: 'Programada',
    objetivo: 'Avaliar o atendimento aos requisitos legais, controles operacionais e diretrizes de gestão ambiental na unidade.',
    responsavel: userProfile?.name || 'Auditor Técnico',
    gerencia: 'Meio Ambiente / SMS',
    fachadaUrl: '',

    // 8 indicadores da Capa
    itensAvaliados: 0,
    conformidades: 0,
    desviosPlanoAcao: 0,
    naoConformidades: 0,
    ocorrenciasAmbientais: 0,
    notificacoes: 0,
    interdicoes: 0,
    indiceConformidade: 0,

    // Desvios (Slides 3 e 4)
    desvios: [],

    // Registros Fotográficos (56 pontos dos Slides 5 a 32)
    registrosFotograficos: REPORT_PHOTO_SLOTS.map((slot) => ({
      ...slot,
      fotoUrl: '',
      observacao: '',
      incluirNoRelatorio: true
    })),

    // Conclusão (Slides 33 a 35)
    nivelAderencia: 'Baixa Aderência',
    nivelMaturidade: 'Em Desenvolvimento',
    pontosPositivos: '',
    sinteseDesvios: '',
    conclusaoTexto: '',

    status: 'rascunho',
    inspecaoId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
