import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

let supabaseClient = null;

export const supabaseService = {
  /**
   * Inicializa o cliente Supabase Admin (Service Role) para leitura e atualização sem bloqueio de RLS
   */
  init() {
    if (supabaseClient) {
      return supabaseClient;
    }

    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      throw new Error(
        'Credenciais do Supabase não fornecidas. Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente do Coolify.'
      );
    }

    supabaseClient = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });

    logger.success(`Cliente Supabase inicializado com sucesso (${config.supabase.url})!`);
    return supabaseClient;
  },

  /**
   * Retorna a instância ativa do Supabase
   */
  getClient() {
    if (!supabaseClient) {
      return this.init();
    }
    return supabaseClient;
  },

  /**
   * Busca todas as inspeções concluídas que ainda não foram sincronizadas
   * com o sistema interno de Gerenciamento Ambiental, já com os 63 itens e temáticas.
   */
  async getPendingOrders() {
    const client = this.getClient();

    const { data: inspecoes, error } = await client
      .from('inspecoes')
      .select(`
        id,
        codigo_kivo,
        unidade,
        regional,
        municipio,
        data_inspecao,
        responsavel_inspecao,
        tipo_inspecao,
        status,
        synced_to_environmental,
        created_at,
        updated_at,
        inspecao_respostas (
          id,
          status,
          classificacao,
          responsavel,
          prazo,
          observacao,
          evidencia_path,
          checklist_itens_modelo (
            codigo,
            numero,
            pergunta,
            tematicas (
              nome
            )
          )
        )
      `)
      .eq('status', 'completed')
      .eq('synced_to_environmental', false);

    if (error) {
      throw new Error(`Erro ao consultar public.inspecoes no Supabase: ${error.message}`);
    }

    if (!inspecoes || inspecoes.length === 0) {
      return [];
    }

    // Normalizar para o formato esperado por environmentalApi.formatPayload()
    return inspecoes.map((insp) => {
      const checklist = (insp.inspecao_respostas || [])
        .map((resp) => ({
          id: resp.checklist_itens_modelo?.codigo || resp.id,
          item: resp.checklist_itens_modelo?.numero || 0,
          topicTitle: resp.checklist_itens_modelo?.tematicas?.nome || 'Geral',
          question: resp.checklist_itens_modelo?.pergunta || '',
          response: resp.status || 'na',
          status: resp.status || null,
          classification: resp.classificacao || '',
          responsible: resp.responsavel || '',
          deadline: resp.prazo || '',
          observation: resp.observacao || '',
          evidenceUrl: resp.evidencia_path || null
        }))
        .sort((a, b) => a.item - b.item);

      return {
        id: insp.codigo_kivo,
        supabaseId: insp.id,
        title: `Inspeção Ambiental - ${insp.unidade}`,
        category: 'Gestão Ambiental Hospitalar (EMSERH)',
        hospitalName: insp.unidade,
        unit: insp.unidade,
        regional: insp.regional,
        municipio: insp.municipio,
        scheduledDate: insp.data_inspecao,
        technicianName: insp.responsavel_inspecao,
        inspectionType: insp.tipo_inspecao,
        status: insp.status,
        checklist,
        checkout: { timestamp: insp.updated_at || insp.created_at }
      };
    });
  },

  /**
   * Marca a inspeção como sincronizada com o Gerenciamento Ambiental no Supabase
   */
  async markAsSynced(order, environmentalRecordId) {
    const targetId = order?.supabaseId || order?.id || order;
    if (config.sync.dryRun) {
      logger.info(`[DRY-RUN] Simulação de atualização no Supabase para inspeção ${order?.id || targetId}`);
      return;
    }

    const client = this.getClient();
    const { error } = await client
      .from('inspecoes')
      .update({
        synced_to_environmental: true,
        environmental_synced_at: new Date().toISOString(),
        environmental_record_id: environmentalRecordId || null
      })
      .eq(order?.supabaseId ? 'id' : 'codigo_kivo', targetId);

    if (error) {
      throw new Error(`Erro ao atualizar status no Supabase: ${error.message}`);
    }

    logger.success(`Inspeção ${order?.id || targetId} marcada como 'synced_to_environmental: true' no Supabase.`);
  }
};
