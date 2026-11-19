import { config } from './config.js';
import { logger } from './utils/logger.js';
import { supabaseService } from './services/supabaseService.js';
import { environmentalApi } from './services/environmentalApi.js';

let isRunning = false;
let syncTimer = null;

async function runSyncCycle() {
  if (isRunning) {
    logger.warn("Ciclo anterior de sincronização ainda em andamento. Aguardando próximo intervalo.");
    return;
  }

  isRunning = true;
  logger.info("Iniciando verificação de inspeções pendentes no Supabase...");

  try {
    const pendingOrders = await supabaseService.getPendingOrders();

    if (pendingOrders.length === 0) {
      logger.info("Nenhuma inspeção pendente de sincronização encontrada. Tudo em dia!");
      return;
    }

    logger.info(`Encontradas ${pendingOrders.length} inspeção(ões) concluída(s) para enviar ao Gerenciamento Ambiental.`);

    let successCount = 0;
    let failureCount = 0;

    for (const order of pendingOrders) {
      try {
        logger.info(`Processando inspeção ${order.id} (${order.title || 'Vistoria'})...`);
        const result = await environmentalApi.sendInspection(order);

        if (result.success) {
          await supabaseService.markAsSynced(order, result.recordId);
          successCount++;
        }
      } catch (err) {
        failureCount++;
        logger.error(`Erro ao processar inspeção ${order.id}: ${err.message}. Será tentada novamente no próximo ciclo.`);
      }
    }

    logger.info(
      `Ciclo de sincronização finalizado: ${successCount} enviada(s) com sucesso, ${failureCount} falha(s).`
    );
  } catch (err) {
    logger.error(`Erro crítico durante a execução do ciclo de sincronização: ${err.message}`);
  } finally {
    isRunning = false;
  }
}

async function start() {
  console.log("=================================================");
  console.log("   🏥 KIVO SYNC AGENT - GERENCIAMENTO AMBIENTAL  ");
  console.log("   Banco: Supabase Cloud | Coolify On-Premise    ");
  console.log("=================================================");

  logger.info(`Destino Interno: ${config.environmentalApi.url}`);
  logger.info(`Intervalo de Execução: A cada ${config.sync.intervalMinutes} minutos`);
  logger.info(`Modo Dry-Run (Simulação): ${config.sync.dryRun ? 'ATIVADO' : 'DESATIVADO'}`);

  try {
    // Inicializar conexão com o Supabase
    supabaseService.init();

    // Executar primeira sincronização imediatamente na inicialização
    await runSyncCycle();

    // Agendar ciclos periódicos
    const intervalMs = config.sync.intervalMinutes * 60 * 1000;
    syncTimer = setInterval(runSyncCycle, intervalMs);

    logger.info(`Agente ativo em segundo plano no Coolify. Próxima consulta em ${config.sync.intervalMinutes} minutos.`);
  } catch (err) {
    logger.error(`Não foi possível iniciar o Kivo Sync Agent: ${err.message}`);
    process.exit(1);
  }
}

// Tratamento de desligamento suave (Graceful Shutdown do Docker/Coolify)
function handleShutdown(signal) {
  logger.info(`Sinal de encerramento ${signal} recebido. Parando o Kivo Sync Agent no Coolify...`);
  if (syncTimer) {
    clearInterval(syncTimer);
  }
  process.exit(0);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

start();
