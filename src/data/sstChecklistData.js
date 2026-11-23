// Módulo de Segurança do Trabalho (SST): Checklists Modulares por NR + Matriz de Risco

export const SST_NR_MODULES = [
  {
    id: 'nr01',
    code: 'NR-01',
    name: 'NR-01 — GRO & PGR',
    shortName: 'NR-01 GRO/PGR',
    description: 'Gerenciamento de Riscos Ocupacionais, PGR vigente, ordens de serviço de SST e capacitações.',
    items: [
      'O Programa de Gerenciamento de Riscos (PGR) está atualizado e contempla os riscos físicos, químicos, biológicos, ergonômicos e de acidentes da unidade?',
      'O Inventário de Riscos e o Plano de Ação do PGR possuem cronograma vigente e responsáveis designados?',
      'As Ordens de Serviço (OS) de Segurança do Trabalho foram emitidas e assinadas pelos trabalhadores?',
      'Os colaboradores recebem capacitação inicial, periódica e eventual registrada conforme as atividades executadas?',
      'Há procedimento documentado e divulgado para direito de recusa e comunicação de situações de risco grave e iminente?'
    ]
  },
  {
    id: 'nr06',
    code: 'NR-06',
    name: 'NR-06 — EPIs',
    shortName: 'NR-06 EPIs',
    description: 'Fornecimento gratuito, Certificado de Aprovação (CA) válido, fichas assinadas, higienização e uso efetivo.',
    items: [
      'Os EPIs fornecidos possuem Certificado de Aprovação (CA) válido e compatível com os riscos de cada função?',
      'As fichas de entrega, substituição e devolução de EPIs estão devidamente preenchidas e assinadas pelos trabalhadores?',
      'Os trabalhadores utilizam corretamente os EPIs obrigatórios nas áreas sinalizadas durante a inspeção em campo?',
      'Os EPIs encontram-se em bom estado de conservação, limpeza e dentro do prazo de validade?',
      'Há local adequado para guarda, higienização e descarte de EPIs contaminados ou danificados?',
      'Os trabalhadores receberam treinamento prático sobre uso correto, limitações, guarda e conservação dos EPIs?'
    ]
  },
  {
    id: 'nr10',
    code: 'NR-10',
    name: 'NR-10 — Instalações Elétricas',
    shortName: 'NR-10 Elétrica',
    description: 'Quadros elétricos protegidos, diagrama unifilar, aterramento, SPDA, bloqueio/etiquetagem e prontuário.',
    items: [
      'Os quadros de distribuição elétrica estão trancados, sinalizados com alerta de choque e sem fiação exposta?',
      'Os diagramas unifilares das instalações elétricas estão atualizados e acessíveis próximo aos painéis principais?',
      'Os circuitos e disjuntores encontram-se devidamente identificados no interior dos quadros elétricos?',
      'O Sistema de Proteção contra Descargas Atmosféricas (SPDA) e o aterramento possuem laudo técnico e inspeções periódicas vigentes?',
      'Profissionais autorizados para serviços em eletricidade possuem treinamento NR-10 válido e utilizam bloqueio/etiquetagem (LOTO)?'
    ]
  },
  {
    id: 'nr12',
    code: 'NR-12',
    name: 'NR-12 — Máquinas & Equipamentos',
    shortName: 'NR-12 Máquinas',
    description: 'Proteções fixas/móveis, dispositivos de parada de emergência, sensores de intertravamento e manuais.',
    items: [
      'Partes móveis, polias, correias e zonas de perigo de máquinas possuem proteções físicas fixas ou móveis íntegras?',
      'Os botões de parada de emergência estão acessíveis, desobstruídos, sinalizados e testados quanto ao funcionamento?',
      'Dispositivos de segurança e chaves de intertravamento estão operantes sem sinais de burla ou improvisos?',
      'Os comandos elétricos de acionamento operam em extrabaixa tensão e com proteção contra partida acidental?',
      'Os operadores de máquinas e equipamentos estão capacitados e os procedimentos operacionais encontram-se disponíveis?'
    ]
  },
  {
    id: 'nr23',
    code: 'NR-23',
    name: 'NR-23 — Incêndio & Emergência',
    shortName: 'NR-23 Incêndio',
    description: 'Extintores, hidrantes, AVCB/CLCB vigente, rotas de fuga desobstruídas, iluminação e brigada.',
    items: [
      'A unidade possui AVCB ou CLCB do Corpo de Bombeiros válido e compatível com a área e ocupação atual?',
      'Os extintores de incêndio estão dentro da validade de carga/teste hidrostático, com lacre íntegro, manômetro na faixa verde e sinalizados?',
      'Os acessos a extintores, hidrantes, quadros de alarme e saídas de emergência estão totalmente desobstruídos?',
      'As rotas de fuga e portas de emergência possuem sinalização fotoluminescente e iluminação de emergência funcionando?',
      'Há brigada de incêndio treinada, com reciclagem vigente e escala divulgada por turno?',
      'Foram realizados simulados periódicos de abandono de área e atendimento a emergências com registro em ata?'
    ]
  },
  {
    id: 'nr24',
    code: 'NR-24',
    name: 'NR-24 — Condições Sanitárias',
    shortName: 'NR-24 Sanitários',
    description: 'Sanitários, vestiários, armários, refeitório/copa e água potável em condições de higiene.',
    items: [
      'As instalações sanitárias estão separadas por sexo, limpas, ventiladas e com insumos básicos (sabonete, papel e lixeira com tampa)?',
      'Vestiários e armários individuais atendem ao efetivo de trabalhadores com conservação adequada?',
      'O refeitório ou espaço destinado às refeições apresenta limpeza, assentos suficientes e conservação térmica para alimentos?',
      'Há fornecimento contínuo de água potável filtrada/resfriada em bebedouros higienizados e em proporção adequada ao efetivo?',
      'As áreas de circulação, pisos e iluminação dos setores de apoio oferecem segurança contra quedas e acidentes?'
    ]
  },
  {
    id: 'nr35',
    code: 'NR-35',
    name: 'NR-35 — Trabalho em Altura',
    shortName: 'NR-35 Altura',
    description: 'Capacitação válida, ASO apto para altura, Permissão de Trabalho (PT), cinturão/talabarte e ancoragem.',
    items: [
      'Trabalhadores que atuam acima de 2 metros possuem treinamento NR-35 válido e aptidão registrada no ASO?',
      'É emitida Análise de Risco (AR) e Permissão de Trabalho (PT) antes do início de atividades não rotineiras em altura?',
      'Os cinturões tipo paraquedista, talabartes e trava-quedas passam por inspeção prévia e possuem CA válido?',
      'Existem pontos de ancoragem ou linhas de vida devidamente dimensionados, inspecionados e identificados?',
      'Escadas portáteis, andaimes e plataformas elevatórias utilizadas em campo possuem inspeção e proteção contra quedas de materiais?'
    ]
  }
];

export const RISK_PROBABILITIES = [
  { value: 1, label: '1 — Muito Baixa (Raro)' },
  { value: 2, label: '2 — Baixa (Pouco provável)' },
  { value: 3, label: '3 — Média (Possível)' },
  { value: 4, label: '4 — Alta (Provável)' },
  { value: 5, label: '5 — Muito Alta (Quase certo)' }
];

export const RISK_SEVERITIES = [
  { value: 1, label: '1 — Leve (Sem afastamento)' },
  { value: 2, label: '2 — Moderada (Lesão leve)' },
  { value: 3, label: '3 — Séria (Afastamento temporário)' },
  { value: 4, label: '4 — Grave (Incapacidade permanente)' },
  { value: 5, label: '5 — Catastrófica (Fatalidade / Múltiplas)' }
];

export function calculateRiskMatrix(probability = 3, severity = 3) {
  const p = Math.min(5, Math.max(1, Number(probability) || 3));
  const s = Math.min(5, Math.max(1, Number(severity) || 3));
  const score = p * s;

  if (score >= 20) {
    return {
      score,
      level: 'Intolerável',
      classification: 'Crítico',
      suggestedDeadline: '24 horas',
      badgeClass: 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/60',
      description: 'Interdição imediata recomendada até neutralização do risco.'
    };
  }
  if (score >= 13) {
    return {
      score,
      level: 'Substancial',
      classification: 'Grave',
      suggestedDeadline: '48 horas',
      badgeClass: 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/40',
      description: 'Ação corretiva prioritária com bloqueio ou controle provisório.'
    };
  }
  if (score >= 7) {
    return {
      score,
      level: 'Moderado',
      classification: 'Médio',
      suggestedDeadline: '15 dias',
      badgeClass: 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/40',
      description: 'Mitigar no plano de ação dentro do prazo programado.'
    };
  }
  if (score >= 4) {
    return {
      score,
      level: 'Tolerável',
      classification: 'Leve',
      suggestedDeadline: '30 dias',
      badgeClass: 'bg-[#122620] text-[#34D399] border-[#2EB88A]/40',
      description: 'Monitorar controles existentes e implementar melhoria.'
    };
  }
  return {
    score,
    level: 'Trivial',
    classification: 'Leve',
    suggestedDeadline: '60 dias',
    badgeClass: 'bg-[#1A1B20] text-[#A1A1AA] border-[#2D2F36]',
    description: 'Risco sob controle operacional.'
  };
}

export function buildSstChecklist(selectedModuleIds = ['nr01', 'nr06', 'nr23']) {
  const activeSet = new Set(
    Array.isArray(selectedModuleIds) && selectedModuleIds.length > 0
      ? selectedModuleIds
      : SST_NR_MODULES.map((m) => m.id)
  );

  const items = [];
  let num = 1;
  SST_NR_MODULES.forEach((mod) => {
    if (!activeSet.has(mod.id)) return;
    mod.items.forEach((question) => {
      items.push({
        id: `sst-${mod.id}-${num}`,
        number: num,
        topic: mod.name,
        nrCode: mod.code,
        question,
        status: null,
        classification: '',
        riskProbability: 3,
        riskSeverity: 3,
        responsible: '',
        deadline: '',
        observation: '',
        evidenceUrl: '',
        afterPhotoUrl: '',
        resolutionNote: '',
        actionStatus: 'Em Aberto'
      });
      num += 1;
    });
  });

  return items;
}

export const SST_INVENTORY_CATEGORIES = [
  'Extintor de Incêndio',
  'AVCB / CLCB Bombeiros',
  'ASO / Exame Ocupacional',
  'Treinamento NR',
  'EPI / EPC',
  'Laudo (PGR / PCMSO / LTCAT)',
  'SPDA / Aterramento / Calibração'
];
