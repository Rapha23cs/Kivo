import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export const environmentalApi = {
  /**
   * Converte o documento da Ordem de Serviço / Vistoria do Kivo para o payload
   * esperado pelo sistema interno de Gerenciamento Ambiental (compatível com Checklist EMSERH).
   */
  formatPayload(kivoOrder) {
    const checklist = kivoOrder.checklist || [];

    // Apuração automática do checklist (Regras EMSERH linhas 69-74)
    let totalSim = 0;
    let totalNao = 0;
    let totalNA = 0;

    const desvios = [];
    const todosItensAvaliados = [];

    checklist.forEach(item => {
      const resp = (item.response || (item.status === 'conforme' ? 'sim' : item.status === 'nao_conforme' ? 'nao' : 'na')).toLowerCase();
      
      if (resp === 'sim') totalSim++;
      else if (resp === 'nao') totalNao++;
      else if (resp === 'na' || resp === 'n/a') totalNA++;

      const isDesvio = resp === 'nao';

      const itemFormatado = {
        id: item.id,
        numero: item.item,
        topico: item.topicTitle || item.topicId || 'Geral',
        pergunta: item.question || item.requirement,
        resposta: resp.toUpperCase(),
        classificacao: isDesvio ? (item.classification || 'Média') : null,
        responsavel: isDesvio ? (item.responsible || 'Não especificado') : null,
        prazo: isDesvio ? (item.deadline || 'Não estipulado') : null,
        observacao: item.observation || '',
        evidenciaUrl: item.photoEvidence || item.evidenceUrl || null
      };

      todosItensAvaliados.push(itemFormatado);

      if (isDesvio) {
        desvios.push(itemFormatado);
      }
    });

    const totalAvaliados = totalSim + totalNao;
    const percentualConformidade = totalAvaliados > 0 
      ? Number(((totalSim / totalAvaliados) * 100).toFixed(1)) 
      : 100;

    return {
      origem: 'KIVO_FIELD_SERVICE',
      codigoKivo: kivoOrder.id,
      tipoVistoria: kivoOrder.category || 'Inspeção e Vistoria Ambiental Hospitalar',
      titulo: kivoOrder.title,
      
      // Cabeçalho Oficial Pré-Checklist EMSERH
      cabecalhoPreChecklist: {
        unidade: kivoOrder.hospitalName || kivoOrder.unit || 'Unidade Hospitalar',
        regional: kivoOrder.regional || 'Regional Metropolitana',
        municipio: kivoOrder.municipio || 'São Luís - MA',
        dataInspecao: kivoOrder.scheduledDate || new Date().toISOString().split('T')[0],
        responsavelInspecao: kivoOrder.technicianName || 'Raphael Sá (RT)',
        tipoInspecao: kivoOrder.inspectionType || 'Programada' // 'Programada' ou 'Não Programada'
      },

      // Responsável Técnico (RT Pessoal)
      responsavelTecnico: {
        nome: kivoOrder.technicianName,
        registro: kivoOrder.signatures?.technician?.registry || 'CRQ / CRBio / CREA',
        assinado: Boolean(kivoOrder.signatures?.technician?.signed),
        dataAssinatura: kivoOrder.signatures?.technician?.signedAt
      },

      // Validação de Recebimento do Hospital
      recebimentoCliente: {
        nome: kivoOrder.signatures?.clientRepresentative?.signerName || 'Não informado',
        cargo: kivoOrder.signatures?.clientRepresentative?.role || 'Direção / SCIH / Biossegurança',
        assinado: Boolean(kivoOrder.signatures?.clientRepresentative?.signed),
        dataAssinatura: kivoOrder.signatures?.clientRepresentative?.signedAt
      },

      // Validação Geográfica em Campo
      geolocalizacao: {
        checkinRealizado: Boolean(kivoOrder.checkin?.performed),
        latitude: kivoOrder.checkin?.lat || null,
        longitude: kivoOrder.checkin?.lng || null,
        timestampCheckin: kivoOrder.checkin?.timestamp || null,
        validadoPorGps: Boolean(kivoOrder.checkin?.verifiedByGps)
      },

      // Parâmetros Físico-Químicos e Ambientes Críticos (RDC 50)
      parametrosAmbientaisRDC50: kivoOrder.measurements ? {
        pressaoDiferencialPa: kivoOrder.measurements.differentialPressurePa,
        temperaturaC: kivoOrder.measurements.roomTemperatureC,
        umidadeRelativaPercentual: kivoOrder.measurements.relativeHumidityPercent,
        trocasDeArPorHora: kivoOrder.measurements.airRenovationsPerHour
      } : null,

      // Pós-Checklist: Resumo Oficial da Inspeção (Linhas 69-74 do checklist.xlsx)
      resumoInspecao: {
        totalItensCadastrados: checklist.length,
        totalAvaliados,
        totalConformeSim: totalSim,
        totalNaoConformeNao: totalNao,
        totalNaoAplicavelNA: totalNA,
        percentualConformidade,
        statusGeral: totalNao === 0 ? 'CONFORME' : percentualConformidade >= 80 ? 'REGULAR_COM_RESSALVAS' : 'CRITICO_EXIGE_PLANO_DE_ACAO'
      },

      // Plano de Ação das Não Conformidades (Regra 6: Apenas itens 'Não')
      planoAcaoDesvios: desvios,

      // Checklist Completo Auditado
      itensAuditados: todosItensAvaliados,

      conclusaoTecnica: kivoOrder.technicalConclusion || '',
      dataFinalizacaoKivo: kivoOrder.checkout?.timestamp || new Date().toISOString()
    };
  },

  /**
   * Envia a vistoria para o endpoint interno do Gerenciamento Ambiental
   */
  async sendInspection(kivoOrder) {
    const payload = this.formatPayload(kivoOrder);

    if (config.sync.dryRun) {
      logger.info(`[DRY-RUN] Simulação de envio da OS ${kivoOrder.id} para ${config.environmentalApi.url}`);
      logger.info(`[DRY-RUN] Payload formatado:`, JSON.stringify(payload, null, 2));
      return { success: true, recordId: `MOCK-${Date.now()}` };
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Kivo-Coolify-SyncAgent/1.0'
      };

      if (config.environmentalApi.token) {
        headers['Authorization'] = `Bearer ${config.environmentalApi.token}`;
      }

      logger.info(`Enviando OS ${kivoOrder.id} para ${config.environmentalApi.url}...`);

      const response = await axios.post(config.environmentalApi.url, payload, {
        headers,
        timeout: config.environmentalApi.timeoutMs
      });

      logger.success(`OS ${kivoOrder.id} aceita pelo Gerenciamento Ambiental! Status HTTP: ${response.status}`);
      return {
        success: true,
        recordId: response.data?.id || response.data?.recordId || `ENV-${Date.now()}`,
        rawResponse: response.data
      };
    } catch (err) {
      const errorDetail = err.response
        ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
        : err.message;
      logger.error(`Falha ao enviar OS ${kivoOrder.id} ao Gerenciamento Ambiental: ${errorDetail}`);
      throw new Error(errorDetail);
    }
  }
};

