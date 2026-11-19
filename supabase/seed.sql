-- =============================================================================
-- Kivo - Seed Oficial EMSERH (11 Temáticas e 63 Itens de Auditoria)
-- Extraído diretamente de src/data/emserhChecklistData.js
-- =============================================================================

insert into public.tematicas (slug, nome, nome_curto, icone, descricao, ordem)
values
  ('gestao-de-residuos', 'Gestão de Resíduos', 'Resíduos', 'Trash2', 'Segregação, coletores, infectantes, abrigos externos e destinação final com MTR.', 1),
  ('gestao-de-produtos-quimicos', 'Gestão de Produtos Químicos', 'Produtos Químicos', 'FlaskConical', 'Inventário químico, rotulagem GHS, FISPQ/FDS, bacias de contenção e incompatibilidades.', 2),
  ('agua', 'Água', 'Água & Potabilidade', 'Droplets', 'Abastecimento, higienização semestral de reservatórios, controle de cloro e laudos de potabilidade.', 3),
  ('efluentes', 'Efluentes', 'Efluentes & ETE', 'Waves', 'Caixas de gordura, rede de esgoto hospitalar, operação de ETE e ensaios laboratoriais.', 4),
  ('emissoes-atmosfericas', 'Emissões Atmosféricas', 'Emissões & Ar', 'Wind', 'Chaminés, grupos geradores a diesel, caldeiras, manutenções e queima de combustíveis.', 5),
  ('ruido-ambiental', 'Ruído Ambiental', 'Ruído & Conforto', 'Volume2', 'Controle acústico de geradores, centrais de ar condicionado e conforto da vizinhança.', 6),
  ('emergencia-ambiental', 'Emergência Ambiental', 'Emergência & Derrames', 'Flame', 'Kits de mitigação de derramamento químico, rotas de fuga, alarmes e plano de contingência.', 7),
  ('licenciamento-ambiental', 'Licenciamento Ambiental', 'Licenças & Órgãos', 'FileCheck', 'Licença de Operação (LO), outorgas de poço, condicionantes ambientais e órgãos fiscalizadores.', 8),
  ('infraestrutura-ambiental', 'Infraestrutura Ambiental', 'Infraestrutura', 'Building2', 'Pisos impermeáveis, canaletas de contenção e preservação estrutural dos setores operacionais.', 9),
  ('aspectos-e-impactos-ambientais', 'Aspectos e Impactos Ambientais', 'Aspectos & Riscos', 'TreePine', 'Mapeamento de perigos ecológicos, controle de contaminação do solo e lençol freático.', 10),
  ('educacao-e-conscientizacao-ambiental', 'Educação e Conscientização Ambiental', 'Educação & Treinamento', 'GraduationCap', 'Treinamento contínuo de equipes em descarte correto, biossegurança e consumo sustentável.', 11)
on conflict (nome) do update set
  slug = excluded.slug,
  nome_curto = excluded.nome_curto,
  icone = excluded.icone,
  descricao = excluded.descricao,
  ordem = excluded.ordem;

insert into public.checklist_itens_modelo (codigo, tematica_id, numero, pergunta, ativo)
select v.codigo, t.id, v.numero, v.pergunta, true
from (values
  ('item-1', 'Gestão de Resíduos', 1, 'Há segregação adequada dos resíduos por grupo/classe (comuns, recicláveis, infectantes, perfurocortantes)?'),
  ('item-2', 'Gestão de Resíduos', 2, 'Os coletores de resíduos possuem identificação adequada?'),
  ('item-3', 'Gestão de Resíduos', 3, 'Os resíduos perfurocortantes estão acondicionados adequadamente?'),
  ('item-4', 'Gestão de Resíduos', 4, 'Os recipientes de resíduos encontram-se íntegros e em condições adequadas de uso?'),
  ('item-5', 'Gestão de Resíduos', 5, 'O abrigo de resíduos encontra-se adequado (portas trancadas, piso/paredes laváveis e ventilação adequada), identificado e sinalizado?'),
  ('item-6', 'Gestão de Resíduos', 6, 'O abrigo de resíduos possui controle de acesso?'),
  ('item-7', 'Gestão de Resíduos', 7, 'As bombonas estão adequadas (tampas rosqueadas, identificadas) e são suficientes para demanda gerada?'),
  ('item-8', 'Gestão de Resíduos', 8, 'O PGRSS da unidade está atualizado e implementado?'),
  ('item-9', 'Gestão de Resíduos', 9, 'A equipe da unidade conhecem os indicadores de gestão de resíduos?'),
  ('item-10', 'Gestão de Resíduos', 10, 'A unidade segrega e destina o resíduo oleoso gerado na manutenção dos geradores?'),
  ('item-11', 'Gestão de Resíduos', 11, 'Existem resíduos patrimoniáveis dispostos de forma adequada?'),
  ('item-12', 'Gestão de Produtos Químicos', 12, 'Os produtos químicos possuem FDS disponível em local visível?'),
  ('item-13', 'Gestão de Produtos Químicos', 13, 'Os produtos químicos estão adequadamente identificados e rotulados?'),
  ('item-14', 'Gestão de Produtos Químicos', 14, 'Há segregação adequada entre os produtos químicos armazenados?'),
  ('item-15', 'Gestão de Produtos Químicos', 15, 'Os produtos químicos fracionados estão em recepientes  adequados e rotulados, conforme procedimento'),
  ('item-16', 'Gestão de Produtos Químicos', 16, 'O armazenamento e acondicionamento dos produtos químicos possuem contenção e sinalização adequadas?'),
  ('item-17', 'Gestão de Produtos Químicos', 17, 'O Inventário de Produtos Químicos está atualizado?'),
  ('item-18', 'Gestão de Produtos Químicos', 18, 'A unidade possui DML (Depósito de Material de Limpeza) devidamente identificado e em condições adequadas?'),
  ('item-19', 'Gestão de Produtos Químicos', 19, 'O manual de saneantes da unidade está atualizado?'),
  ('item-20', 'Gestão de Produtos Químicos', 20, 'A unidade possui diluidora de produtos químicos, quando aplicável, em funcionamento adequado?'),
  ('item-21', 'Gestão de Produtos Químicos', 21, 'A equipe que manuseia produto químico é devidamente treinadas (FDS e procedimento) e conhecem os riscos da sua atividade?'),
  ('item-22', 'Água', 22, 'O sistema de abastecimento de água (concessionária/poço/misto) encontra-se adequado?'),
  ('item-23', 'Água', 23, 'O poço possui hidrômetro em funcionamento e estrutura física (cercamento e identificação) íntegra, quando aplicável?'),
  ('item-24', 'Água', 24, 'Existe controle de consumo de água e reserva para situações de emergência ou risco de desabastecimento?'),
  ('item-25', 'Água', 25, 'Os reservatórios de água encontram-se íntegros, com impermeabilização adequada, limpeza em dia, com tampas, sem fissuras e trincas?'),
  ('item-26', 'Água', 26, 'Os sistemas de tratamento de água (cloração/abrandador) estão instalados e em funcionamento, quando aplicável?'),
  ('item-27', 'Água', 27, 'O sistema de drenagem pluvial encontra-se adequado, com calhas limpas e desobstruídas?'),
  ('item-28', 'Água', 28, 'As instalações hidráulicas da unidade encontram-se em condições adequadas, sem vazamentos aparentes?'),
  ('item-29', 'Água', 29, 'Os pontos de coletas(torneiras) estão adequadas (sem corrosão, ferrugem, outros)?'),
  ('item-30', 'Água', 30, 'A rede sanitária da unidade está livre de conribuições indevidas de água pluvial ou operacional (diálise, dreno de ar condicionando e caldeira) para rede sanitária?'),
  ('item-31', 'Efluentes', 31, 'A rede coletora de esgoto, sistema de fossa e caixas de gordura encontram-se em condições adequadas (limpar, sem odor e vetores, aderencia ao cronograma de limpeza, sem vazamento de esgoto, estrutura integra, outros)?'),
  ('item-32', 'Efluentes', 32, 'Tampas e tampões dos PVs de esgoto e de águas pluviais estão íntegros, vedados e devidamente identificados para evitar misturas?'),
  ('item-33', 'Efluentes', 33, 'A Estação de Tratamento de Efluentes (ETE) opera adequadamente (limpa, bombas e sopradores funcionando, equipamentos operantes), com hidrômetro de saída em funcionamento?'),
  ('item-34', 'Efluentes', 34, 'O ponto de lançamento de efluentes está identificado, sinalizado e em condições adequadas (sem vazamento, sem odor, área capinada?'),
  ('item-35', 'Efluentes', 35, 'As instalações e sistemas de coleta de efluentes da unidade estação livre de vazamentos aparentes?'),
  ('item-36', 'Efluentes', 36, 'As fossas sépticas, filtros biológicos e tanques de equalização/passagem não apresentam rachaduras, trincas ou sinais de vazamento/infiltração no solo?'),
  ('item-37', 'Efluentes', 37, 'O operador da ETE e a equipe de coleta conhece os aspectos, impactos e controles da sua atividade?'),
  ('item-38', 'Efluentes', 38, 'O operador da ETE apresentou os registros diários de controle/operação do sistema (pH, cloro, vazão, analise do lodo, etc) ?'),
  ('item-39', 'Emissões Atmosféricas', 39, 'A unidade possui equipamentos ou processos geradores de emissões atmosféricas (ex.: gerador, veículos a diesel)?'),
  ('item-40', 'Emissões Atmosféricas', 40, 'Existe monitoramento de fumaça preta, quando aplicável?'),
  ('item-41', 'Emissões Atmosféricas', 41, 'Os equipamentos e veículos estão livres de sinais visíveis de emissão excessiva?'),
  ('item-42', 'Emissões Atmosféricas', 42, 'As emissões pontuais são lançadas de forma a permitir boa dispersão atmosférica (dutos/chaminés)?'),
  ('item-43', 'Emissões Atmosféricas', 43, 'Existem controles implementados para minimização das emissões atmosféricas?'),
  ('item-44', 'Emissões Atmosféricas', 44, 'A manutenção preventiva dos geradores é realizada conforme  cronograma fornecido pela engenharia?'),
  ('item-45', 'Emissões Atmosféricas', 45, 'A manutenção preventiva dos veículos à disel é realizada conforme  cronograma fornecido pela setor de transporte/unidade?'),
  ('item-46', 'Ruído Ambiental', 46, 'A unidade possui equipamentos ruidosos (ex.: gerador, chiller, torre de resfriamento)?'),
  ('item-47', 'Ruído Ambiental', 47, 'Existem controles para minimização de ruído (ex.: contenções, estruturas cobertas, enclausuramentos)?'),
  ('item-48', 'Emergência Ambiental', 48, 'Existem kits de emergência ambiental disponíveis, incluindo para produtos químicos, quando aplicável?'),
  ('item-49', 'Emergência Ambiental', 49, 'Os materiais para atuação em contenção ( kits de emergÊncia) encontram-se adequados e em quantidade suficiente?'),
  ('item-50', 'Emergência Ambiental', 50, 'Os colaboradores conhecem o fluxo de comunicação de emergência ambiental?'),
  ('item-51', 'Licenciamento Ambiental', 51, 'A Licença de Operação (ou Dispensa/Isenção), quando aplicável, está vigente?'),
  ('item-52', 'Licenciamento Ambiental', 52, 'A Licença de Outorga de Uso de Poço está vigente, quando aplicável?'),
  ('item-53', 'Licenciamento Ambiental', 53, 'A Licença de Operação de ETE está vigente, quando aplicável?'),
  ('item-54', 'Licenciamento Ambiental', 54, 'A Licença de Outorga de Lançamento de Efluentes está vigente, quando aplicável?'),
  ('item-55', 'Licenciamento Ambiental', 55, 'O AVCB, o Alvará de Funcionamento e o Alvará Sanitário encontram-se válidos?'),
  ('item-56', 'Licenciamento Ambiental', 56, 'As licenças e documentações ambientais estão dispostas em local visível aos colaboradores?'),
  ('item-57', 'Licenciamento Ambiental', 57, 'As condicionantes ambientais estão sendo acompanhadas e atendidas?'),
  ('item-58', 'Licenciamento Ambiental', 58, 'Os registros ambientais encontram-se atualizados e disponíveis?'),
  ('item-59', 'Infraestrutura Ambiental', 59, 'As estruturas ambientais encontram-se adequadas e em boas condições de conservação ?'),
  ('item-60', 'Infraestrutura Ambiental', 60, 'As áreas apresentam condições adequadas de limpeza e organização?'),
  ('item-61', 'Aspectos e Impactos Ambientais', 61, 'Os controles operacionais relacionados aos aspectos ambientais identificados estão implementados?'),
  ('item-62', 'Aspectos e Impactos Ambientais', 62, 'Os riscos ambientais identificados possuem controles adequados?'),
  ('item-63', 'Educação e Conscientização Ambiental', 63, 'Os colaboradores demonstram conhecimento das práticas ambientais aplicáveis (ex.: segregação de resíduos, manuseio de produtos químicos, uso racional da água)?')
) as v(codigo, tematica_nome, numero, pergunta)
join public.tematicas t on t.nome = v.tematica_nome
on conflict (codigo) do update set
  tematica_id = excluded.tematica_id,
  numero = excluded.numero,
  pergunta = excluded.pergunta,
  ativo = excluded.ativo;
