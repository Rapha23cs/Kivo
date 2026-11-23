// Checklist Oficial de Inspeção Ambiental Hospitalar - EMSERH
// Extraído fielmente de checklist.xlsx da raiz do projeto

export const EMSERH_ORIENTATIONS = [
  "1. O checklist deve ser utilizado durante a execução das inspeções ambientais realizadas nas unidades do cliente atendido.",
  "2. O preenchimento deve considerar as condições observadas no momento da inspeção.",
  "3. Marcar 'Sim' quando o item avaliado estiver em conformidade com os requisitos ambientais aplicáveis.",
  "4. Marcar 'Não' quando identificado desvio, ausência de controle, inadequação ou não atendimento aos requisitos avaliados.",
  "5. Marcar 'Não Aplicável' quando o item não se aplicar à realidade operacional da unidade inspecionada.",
  "6. Somente para os itens preenchidos como 'Não' deverão ser preenchidos os campos complementares de classificação, responsável, prazo e observações.",
  "7. Os desvios identificados devem ser classificados conforme diretrizes estabelecidas no Procedimento de Gestão de Inspeções Ambientais.",
  "8. As evidências fotográficas e registros complementares devem ser consolidados no Relatório de Inspeção Ambiental."
];

export const EMSERH_TOPICS = [
  'Gestão de Resíduos',
  'Gestão de Produtos Químicos',
  'Água',
  'Efluentes',
  'Emissões Atmosféricas',
  'Ruído Ambiental',
  'Emergência Ambiental',
  'Licenciamento Ambiental',
  'Infraestrutura Ambiental',
  'Aspectos e Impactos Ambientais',
  'Educação e Conscientização Ambiental'
];

export const EMSERH_TOPICS_CONFIG = {
  'Gestão de Resíduos': {
    name: 'Gestão de Resíduos',
    shortName: 'Resíduos',
    iconName: 'Trash2',
    color: 'slate',
    badgeClass: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    activeClass: 'bg-slate-700 text-white font-bold',
    description: 'Segregação, coletores, infectantes, abrigos externos e destinação final com MTR.'
  },
  'Gestão de Produtos Químicos': {
    name: 'Gestão de Produtos Químicos',
    shortName: 'Produtos Químicos',
    iconName: 'FlaskConical',
    color: 'purple',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    activeClass: 'bg-purple-600 text-white font-bold',
    description: 'Inventário químico, rotulagem GHS, FISPQ/FDS, bacias de contenção e incompatibilidades.'
  },
  'Água': {
    name: 'Água',
    shortName: 'Água & Potabilidade',
    iconName: 'Droplets',
    color: 'cyan',
    badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    activeClass: 'bg-cyan-600 text-white font-bold',
    description: 'Abastecimento, higienização semestral de reservatórios, controle de cloro e laudos de potabilidade.'
  },
  'Efluentes': {
    name: 'Efluentes',
    shortName: 'Efluentes & ETE',
    iconName: 'Waves',
    color: 'blue',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    activeClass: 'bg-blue-600 text-white font-bold',
    description: 'Caixas de gordura, rede de esgoto hospitalar, operação de ETE e ensaios laboratoriais.'
  },
  'Emissões Atmosféricas': {
    name: 'Emissões Atmosféricas',
    shortName: 'Emissões & Ar',
    iconName: 'Wind',
    color: 'teal',
    badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    activeClass: 'bg-teal-600 text-white font-bold',
    description: 'Chaminés, grupos geradores a diesel, caldeiras, manutenções e queima de combustíveis.'
  },
  'Ruído Ambiental': {
    name: 'Ruído Ambiental',
    shortName: 'Ruído & Conforto',
    iconName: 'Volume2',
    color: 'indigo',
    badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    activeClass: 'bg-indigo-600 text-white font-bold',
    description: 'Controle acústico de geradores, centrais de ar condicionado e conforto da vizinhança.'
  },
  'Emergência Ambiental': {
    name: 'Emergência Ambiental',
    shortName: 'Emergência & Derrames',
    iconName: 'Flame',
    color: 'rose',
    badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    activeClass: 'bg-rose-600 text-white font-bold',
    description: 'Kits de mitigação de derramamento químico, rotas de fuga, alarmes e plano de contingência.'
  },
  'Licenciamento Ambiental': {
    name: 'Licenciamento Ambiental',
    shortName: 'Licenças & Órgãos',
    iconName: 'FileCheck',
    color: 'emerald',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    activeClass: 'bg-emerald-600 text-white font-bold',
    description: 'Licença de Operação (LO), outorgas de poço, condicionantes ambientais e órgãos fiscalizadores.'
  },
  'Infraestrutura Ambiental': {
    name: 'Infraestrutura Ambiental',
    shortName: 'Infraestrutura',
    iconName: 'Building2',
    color: 'slate',
    badgeClass: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
    activeClass: 'bg-slate-700 text-white font-bold',
    description: 'Pisos impermeáveis, canaletas de contenção e preservação estrutural dos setores operacionais.'
  },
  'Aspectos e Impactos Ambientais': {
    name: 'Aspectos e Impactos Ambientais',
    shortName: 'Aspectos & Riscos',
    iconName: 'TreePine',
    color: 'emerald',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    activeClass: 'bg-emerald-600 text-white font-bold',
    description: 'Mapeamento de perigos ecológicos, controle de contaminação do solo e lençol freático.'
  },
  'Educação e Conscientização Ambiental': {
    name: 'Educação e Conscientização Ambiental',
    shortName: 'Educação & Treinamento',
    iconName: 'GraduationCap',
    color: 'lime',
    badgeClass: 'bg-lime-500/10 text-lime-400 border-lime-500/30',
    activeClass: 'bg-lime-600 text-white font-bold',
    description: 'Treinamento contínuo de equipes em descarte correto, biossegurança e consumo sustentável.'
  }
};

export const EMSERH_CLASSIFICATIONS = [
  { value: 'Leve', label: 'Leve (Baixo impacto / Desvio formal)', color: 'amber' },
  { value: 'Médio', label: 'Médio (Impacto moderado / Prazo 15-30 dias)', color: 'orange' },
  { value: 'Grave', label: 'Grave (Risco sanitário/ambiental elevado / Prazo 48h-7 dias)', color: 'red' },
  { value: 'Crítico', label: 'Crítico (Interrupção imediata / Risco iminente / Prazo 24h)', color: 'rose' }
];

export const EMSERH_BASE_ITEMS = [
  {
    "id": "item-1",
    "number": 1,
    "topic": "Gestão de Resíduos",
    "question": "Há segregação adequada dos resíduos por grupo/classe (comuns, recicláveis, infectantes, perfurocortantes)?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-2",
    "number": 2,
    "topic": "Gestão de Resíduos",
    "question": "Os coletores de resíduos possuem identificação adequada?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-3",
    "number": 3,
    "topic": "Gestão de Resíduos",
    "question": "Os resíduos perfurocortantes estão acondicionados adequadamente?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-4",
    "number": 4,
    "topic": "Gestão de Resíduos",
    "question": "Os recipientes de resíduos encontram-se íntegros e em condições adequadas de uso?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-5",
    "number": 5,
    "topic": "Gestão de Resíduos",
    "question": "O abrigo de resíduos encontra-se adequado (portas trancadas, piso/paredes laváveis e ventilação adequada), identificado e sinalizado?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-6",
    "number": 6,
    "topic": "Gestão de Resíduos",
    "question": "O abrigo de resíduos possui controle de acesso?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-7",
    "number": 7,
    "topic": "Gestão de Resíduos",
    "question": "As bombonas estão adequadas (tampas rosqueadas, identificadas) e são suficientes para demanda gerada?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-8",
    "number": 8,
    "topic": "Gestão de Resíduos",
    "question": "O PGRSS da unidade está atualizado e implementado?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-9",
    "number": 9,
    "topic": "Gestão de Resíduos",
    "question": "A equipe da unidade conhecem os indicadores de gestão de resíduos?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-10",
    "number": 10,
    "topic": "Gestão de Resíduos",
    "question": "A unidade segrega e destina o resíduo oleoso gerado na manutenção dos geradores?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-11",
    "number": 11,
    "topic": "Gestão de Resíduos",
    "question": "Existem resíduos patrimoniáveis dispostos de forma adequada?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-12",
    "number": 12,
    "topic": "Gestão de Produtos Químicos",
    "question": "Os produtos químicos possuem FDS disponível em local visível?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-13",
    "number": 13,
    "topic": "Gestão de Produtos Químicos",
    "question": "Os produtos químicos estão adequadamente identificados e rotulados?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-14",
    "number": 14,
    "topic": "Gestão de Produtos Químicos",
    "question": "Há segregação adequada entre os produtos químicos armazenados?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-15",
    "number": 15,
    "topic": "Gestão de Produtos Químicos",
    "question": "Os produtos químicos fracionados estão em recepientes  adequados e rotulados, conforme procedimento",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-16",
    "number": 16,
    "topic": "Gestão de Produtos Químicos",
    "question": "O armazenamento e acondicionamento dos produtos químicos possuem contenção e sinalização adequadas?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-17",
    "number": 17,
    "topic": "Gestão de Produtos Químicos",
    "question": "O Inventário de Produtos Químicos está atualizado?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-18",
    "number": 18,
    "topic": "Gestão de Produtos Químicos",
    "question": "A unidade possui DML (Depósito de Material de Limpeza) devidamente identificado e em condições adequadas?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-19",
    "number": 19,
    "topic": "Gestão de Produtos Químicos",
    "question": "O manual de saneantes da unidade está atualizado?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-20",
    "number": 20,
    "topic": "Gestão de Produtos Químicos",
    "question": "A unidade possui diluidora de produtos químicos, quando aplicável, em funcionamento adequado?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-21",
    "number": 21,
    "topic": "Gestão de Produtos Químicos",
    "question": "A equipe que manuseia produto químico é devidamente treinadas (FDS e procedimento) e conhecem os riscos da sua atividade?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-22",
    "number": 22,
    "topic": "Água",
    "question": "O sistema de abastecimento de água (concessionária/poço/misto) encontra-se adequado?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-23",
    "number": 23,
    "topic": "Água",
    "question": "O poço possui hidrômetro em funcionamento e estrutura física (cercamento e identificação) íntegra, quando aplicável?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-24",
    "number": 24,
    "topic": "Água",
    "question": "Existe controle de consumo de água e reserva para situações de emergência ou risco de desabastecimento?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-25",
    "number": 25,
    "topic": "Água",
    "question": "Os reservatórios de água encontram-se íntegros, com impermeabilização adequada, limpeza em dia, com tampas, sem fissuras e trincas?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-26",
    "number": 26,
    "topic": "Água",
    "question": "Os sistemas de tratamento de água (cloração/abrandador) estão instalados e em funcionamento, quando aplicável?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-27",
    "number": 27,
    "topic": "Água",
    "question": "O sistema de drenagem pluvial encontra-se adequado, com calhas limpas e desobstruídas?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-28",
    "number": 28,
    "topic": "Água",
    "question": "As instalações hidráulicas da unidade encontram-se em condições adequadas, sem vazamentos aparentes?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-29",
    "number": 29,
    "topic": "Água",
    "question": "Os pontos de coletas(torneiras) estão adequadas (sem corrosão, ferrugem, outros)?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-30",
    "number": 30,
    "topic": "Água",
    "question": "A rede sanitária da unidade está livre de conribuições indevidas de água pluvial ou operacional (diálise, dreno de ar condicionando e caldeira) para rede sanitária?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-31",
    "number": 31,
    "topic": "Efluentes",
    "question": "A rede coletora de esgoto, sistema de fossa e caixas de gordura encontram-se em condições adequadas (limpar, sem odor e vetores, aderencia ao cronograma de limpeza, sem vazamento de esgoto, estrutura integra, outros)?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-32",
    "number": 32,
    "topic": "Efluentes",
    "question": "Tampas e tampões dos PVs de esgoto e de águas pluviais estão íntegros, vedados e devidamente identificados para evitar misturas?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-33",
    "number": 33,
    "topic": "Efluentes",
    "question": "A Estação de Tratamento de Efluentes (ETE) opera adequadamente (limpa, bombas e sopradores funcionando, equipamentos operantes), com hidrômetro de saída em funcionamento?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-34",
    "number": 34,
    "topic": "Efluentes",
    "question": "O ponto de lançamento de efluentes está identificado, sinalizado e em condições adequadas (sem vazamento, sem odor, área capinada?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-35",
    "number": 35,
    "topic": "Efluentes",
    "question": "As instalações e sistemas de coleta de efluentes da unidade estação livre de vazamentos aparentes?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-36",
    "number": 36,
    "topic": "Efluentes",
    "question": "As fossas sépticas, filtros biológicos e tanques de equalização/passagem não apresentam rachaduras, trincas ou sinais de vazamento/infiltração no solo?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-37",
    "number": 37,
    "topic": "Efluentes",
    "question": "O operador da ETE e a equipe de coleta conhece os aspectos, impactos e controles da sua atividade?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-38",
    "number": 38,
    "topic": "Efluentes",
    "question": "O operador da ETE apresentou os registros diários de controle/operação do sistema (pH, cloro, vazão, analise do lodo, etc) ?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-39",
    "number": 39,
    "topic": "Emissões Atmosféricas",
    "question": "A unidade possui equipamentos ou processos geradores de emissões atmosféricas (ex.: gerador, veículos a diesel)?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-40",
    "number": 40,
    "topic": "Emissões Atmosféricas",
    "question": "Existe monitoramento de fumaça preta, quando aplicável?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-41",
    "number": 41,
    "topic": "Emissões Atmosféricas",
    "question": "Os equipamentos e veículos estão livres de sinais visíveis de emissão excessiva?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-42",
    "number": 42,
    "topic": "Emissões Atmosféricas",
    "question": "As emissões pontuais são lançadas de forma a permitir boa dispersão atmosférica (dutos/chaminés)?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-43",
    "number": 43,
    "topic": "Emissões Atmosféricas",
    "question": "Existem controles implementados para minimização das emissões atmosféricas?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-44",
    "number": 44,
    "topic": "Emissões Atmosféricas",
    "question": "A manutenção preventiva dos geradores é realizada conforme  cronograma fornecido pela engenharia?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-45",
    "number": 45,
    "topic": "Emissões Atmosféricas",
    "question": "A manutenção preventiva dos veículos à disel é realizada conforme  cronograma fornecido pela setor de transporte/unidade?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-46",
    "number": 46,
    "topic": "Ruído Ambiental",
    "question": "A unidade possui equipamentos ruidosos (ex.: gerador, chiller, torre de resfriamento)?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-47",
    "number": 47,
    "topic": "Ruído Ambiental",
    "question": "Existem controles para minimização de ruído (ex.: contenções, estruturas cobertas, enclausuramentos)?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-48",
    "number": 48,
    "topic": "Emergência Ambiental",
    "question": "Existem kits de emergência ambiental disponíveis, incluindo para produtos químicos, quando aplicável?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-49",
    "number": 49,
    "topic": "Emergência Ambiental",
    "question": "Os materiais para atuação em contenção ( kits de emergÊncia) encontram-se adequados e em quantidade suficiente?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-50",
    "number": 50,
    "topic": "Emergência Ambiental",
    "question": "Os colaboradores conhecem o fluxo de comunicação de emergência ambiental?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-51",
    "number": 51,
    "topic": "Licenciamento Ambiental",
    "question": "A Licença de Operação (ou Dispensa/Isenção), quando aplicável, está vigente?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-52",
    "number": 52,
    "topic": "Licenciamento Ambiental",
    "question": "A Licença de Outorga de Uso de Poço está vigente, quando aplicável?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-53",
    "number": 53,
    "topic": "Licenciamento Ambiental",
    "question": "A Licença de Operação de ETE está vigente, quando aplicável?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-54",
    "number": 54,
    "topic": "Licenciamento Ambiental",
    "question": "A Licença de Outorga de Lançamento de Efluentes está vigente, quando aplicável?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-55",
    "number": 55,
    "topic": "Licenciamento Ambiental",
    "question": "O AVCB, o Alvará de Funcionamento e o Alvará Sanitário encontram-se válidos?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-56",
    "number": 56,
    "topic": "Licenciamento Ambiental",
    "question": "As licenças e documentações ambientais estão dispostas em local visível aos colaboradores?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-57",
    "number": 57,
    "topic": "Licenciamento Ambiental",
    "question": "As condicionantes ambientais estão sendo acompanhadas e atendidas?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-58",
    "number": 58,
    "topic": "Licenciamento Ambiental",
    "question": "Os registros ambientais encontram-se atualizados e disponíveis?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-59",
    "number": 59,
    "topic": "Infraestrutura Ambiental",
    "question": "As estruturas ambientais encontram-se adequadas e em boas condições de conservação ?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-60",
    "number": 60,
    "topic": "Infraestrutura Ambiental",
    "question": "As áreas apresentam condições adequadas de limpeza e organização?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-61",
    "number": 61,
    "topic": "Aspectos e Impactos Ambientais",
    "question": "Os controles operacionais relacionados aos aspectos ambientais identificados estão implementados?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-62",
    "number": 62,
    "topic": "Aspectos e Impactos Ambientais",
    "question": "Os riscos ambientais identificados possuem controles adequados?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  },
  {
    "id": "item-63",
    "number": 63,
    "topic": "Educação e Conscientização Ambiental",
    "question": "Os colaboradores demonstram conhecimento das práticas ambientais aplicáveis (ex.: segregação de resíduos, manuseio de produtos químicos, uso racional da água)?",
    "status": null,
    "classification": "",
    "responsible": "",
    "deadline": "",
    "observation": "",
    "evidenceUrl": ""
  }
];

export function calculateInspectionSummary(checklist = []) {
  const totalSim = checklist.filter(i => i.status === 'sim' || i.status === 'conforme').length;
  const totalNao = checklist.filter(i => i.status === 'nao' || i.status === 'nao_conforme').length;
  const totalNA = checklist.filter(i => i.status === 'na' || i.status === 'nao_aplicavel').length;
  const totalAvaliados = totalSim + totalNao;
  const totalGeral = checklist.length;
  const percentualConformidade = totalAvaliados > 0 
    ? Math.round((totalSim / totalAvaliados) * 100) 
    : 0;

  const desvios = checklist.filter(i => i.status === 'nao' || i.status === 'nao_conforme');

  return {
    totalGeral,
    totalAvaliados,
    totalSim,
    totalNao,
    totalNA,
    percentualConformidade,
    desviosCount: desvios.length,
    desvios
  };
}

export function calculateTopicBreakdown(checklist = []) {
  const breakdown = {};
  const dynamicTopics = [];
  const seen = new Set();

  EMSERH_TOPICS.forEach((topic) => {
    if (checklist.some((i) => (i.topic || i.topicTitle) === topic)) {
      seen.add(topic);
      dynamicTopics.push(topic);
    }
  });

  checklist.forEach((i) => {
    const t = i.topic || i.topicTitle || 'Geral';
    if (!seen.has(t)) {
      seen.add(t);
      dynamicTopics.push(t);
    }
  });

  dynamicTopics.forEach(topic => {
    const items = checklist.filter(i => (i.topic || i.topicTitle || 'Geral') === topic);
    const sim = items.filter(i => i.status === 'sim' || i.status === 'conforme').length;
    const nao = items.filter(i => i.status === 'nao' || i.status === 'nao_conforme').length;
    const na = items.filter(i => i.status === 'na' || i.status === 'nao_aplicavel').length;
    const pendente = items.filter(i => !i.status).length;
    const totalAvaliados = sim + nao;
    const percent = totalAvaliados > 0 ? Math.round((sim / totalAvaliados) * 100) : 100;

    breakdown[topic] = {
      topic,
      total: items.length,
      sim,
      nao,
      na,
      pendente,
      totalAvaliados,
      percent,
      hasDesvios: nao > 0
    };
  });
  return breakdown;
}
