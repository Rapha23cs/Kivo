// Utilitários compartilhados do Kivo (Status unificados, CSV, Resumo WhatsApp)

export const ORDER_STATUS_META = {
  open: { variant: 'info', label: 'Agendada' },
  in_progress: { variant: 'primary', label: 'Em Andamento' },
  completed: { variant: 'success', label: 'Concluída' }
};

export function getOrderStatusMeta(status) {
  return ORDER_STATUS_META[status] || { variant: 'neutral', label: status || 'Em Andamento' };
}

export function formatDateTimeWatermark(unitName = '') {
  const now = new Date();
  const stamp = now.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  return unitName ? `KIVO • ${unitName} • ${stamp}` : `KIVO • ${stamp}`;
}

export function sanitizeMediaUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Permite apenas imagens raster em data URL (bloqueando SVG que pode conter scripts)
  if (/^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith('blob:')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch {
    // URL inválida descartada
  }
  return '';
}

export function exportCsvRows(headers, rows, filename) {
  const escapeCell = (val) => {
    let str = String(val ?? '').replace(/\r?\n/g, ' ');
    // Neutraliza CSV Formula Injection (Excel / LibreOffice)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    str = str.replace(/"/g, '""');
    return `"${str}"`;
  };
  const lines = [
    headers.map(escapeCell).join(';'),
    ...rows.map((row) => row.map(escapeCell).join(';'))
  ];
  const csvContent = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildExecutiveSummaryText({
  code,
  clientName,
  unitName,
  regional,
  municipio,
  date,
  totalEvaluated,
  totalConformities,
  conformityPercent,
  adherenceLevel,
  deviations = []
}) {
  const headerLines = [
    `*RESUMO EXECUTIVO — INSPEÇÃO AMBIENTAL (KIVO)*`,
    `• *Código:* ${code || '—'}`,
    `• *Cliente:* ${clientName || 'Não informado'}`,
    `• *Unidade:* ${unitName || '—'}`,
    regional || municipio ? `• *Local:* ${[regional, municipio].filter(Boolean).join(' • ')}` : null,
    date ? `• *Data:* ${date}` : null,
    ``,
    `*RESULTADOS CONSOLIDADOS*`,
    `• Itens avaliados: ${totalEvaluated ?? 0}`,
    `• Conformidades: ${totalConformities ?? 0}`,
    `• Índice de Conformidade: *${conformityPercent ?? 0}%*${adherenceLevel ? ` (${adherenceLevel})` : ''}`,
    `• Desvios identificados: *${deviations.length}*`
  ].filter((l) => l !== null);

  if (deviations.length > 0) {
    headerLines.push('', '*PRINCIPAIS DESVIOS / PRAZOS*');
    deviations.slice(0, 10).forEach((d, idx) => {
      const desc = d.descricao || d.observation || d.question || 'Desvio registrado';
      const sev = d.classificacao || d.classification || 'Pendente';
      const prazo = d.prazo || d.deadline || 'A definir';
      headerLines.push(`${idx + 1}. [${sev}] ${desc} (Prazo: ${prazo})`);
    });
    if (deviations.length > 10) {
      headerLines.push(`... e mais ${deviations.length - 10} desvio(s) no laudo completo.`);
    }
  }

  return headerLines.join('\n');
}

export async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return true;
}
