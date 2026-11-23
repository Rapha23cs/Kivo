// Definição dos Fluxos de Trabalho Técnicos suportados pelo Kivo

export const WORK_DISCIPLINES = [
  {
    id: 'meio_ambiente',
    label: 'Meio Ambiente',
    shortLabel: 'Meio Ambiente',
    available: true,
    statusBadge: 'Ativo',
    description: 'Gestão ambiental, PGRSS, resíduos, efluentes, água, emissões e conformidades (EMSERH / RDC-50 / NR-32).',
    checklistSummary: '11 temáticas • 63 itens (ou modelo próprio)'
  },
  {
    id: 'seguranca_trabalho',
    label: 'Segurança do Trabalho',
    shortLabel: 'SST / Segurança',
    available: true,
    statusBadge: 'Ativo',
    description: 'Checklists modulares por NRs (NR-01 a NR-35), Matriz de Risco e controle de vencimentos SST.',
    checklistSummary: 'NRs modulares + Matriz de Risco (P×S)'
  }
];

export function getDisciplineMeta(disciplineId) {
  return (
    WORK_DISCIPLINES.find((d) => d.id === disciplineId) ||
    WORK_DISCIPLINES[0]
  );
}
