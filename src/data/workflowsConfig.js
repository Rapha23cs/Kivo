// Definição dos Fluxos de Trabalho Técnicos suportados pelo Kivo

export const WORK_DISCIPLINES = [
  {
    id: 'meio_ambiente',
    label: 'Meio Ambiente',
    shortLabel: 'Meio Ambiente',
    available: true,
    statusBadge: 'Disponível',
    description: 'Gestão ambiental, PGRSS, resíduos, efluentes, água, emissões e conformidades (EMSERH / RDC-50 / NR-32).',
    checklistSummary: '11 temáticas • 63 itens avaliativos'
  },
  {
    id: 'seguranca_trabalho',
    label: 'Segurança do Trabalho',
    shortLabel: 'SST / Segurança',
    available: false,
    statusBadge: 'Em breve',
    description: 'Inspeções de SST, NRs, EPIs/EPCs, máquinas, sinalização, ergonomia e combate a incêndio.',
    checklistSummary: 'Módulo em implementação (próxima etapa)'
  }
];

export function getDisciplineMeta(disciplineId) {
  return (
    WORK_DISCIPLINES.find((d) => d.id === disciplineId) ||
    WORK_DISCIPLINES[0]
  );
}
