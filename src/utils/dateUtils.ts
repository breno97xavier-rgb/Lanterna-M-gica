/**
 * Utilitários centralizados para tratamento e formatação de datas e timestamps editoriais
 * projetados para evitar problemas de timezone em fusos negativos (ex: UTC-3 Brasil)
 * e garantir precisão temporal rigorosa no agendamento (data + hora + minuto).
 */

/**
 * Retorna a data atual no fuso horário local no formato YYYY-MM-DD.
 */
export function getTodayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retorna a data e hora local no formato aceito por <input type="datetime-local"> (YYYY-MM-DDTHH:mm).
 * Aceita opcionalmente um offset em minutos (ex: +30 para 30 minutos no futuro).
 */
export function getNowDateTimeLocalString(offsetMinutes: number = 0): string {
  const target = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  const hours = String(target.getHours()).padStart(2, '0');
  const minutes = String(target.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Converte qualquer valor de data/timestamp para string estrita YYYY-MM-DD no fuso local.
 * Se já for YYYY-MM-DD, preserva exatamente o dia editorial.
 */
export function getEditorialDateString(dateValue?: string | null): string {
  if (!dateValue || typeof dateValue !== 'string') {
    return getTodayLocalDateString();
  }

  const trimmed = dateValue.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      return trimmed.slice(0, 10);
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return trimmed.slice(0, 10);
  }
}

/**
 * Formata uma data editorial (YYYY-MM-DD ou ISO timestamp) para exibição em português.
 * 
 * Garante que '2026-08-18' seja exibido como '18 de ago. de 2026' (ou '18 de agosto de 2026')
 * em QUALQUER fuso horário, sem recuar para o dia anterior.
 */
export function formatEditorialDate(
  dateStr?: string | null,
  format: 'short' | 'long' = 'short'
): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const trimmed = dateStr.trim();
  if (!trimmed) return '';

  try {
    // Caso 1: Formato estrito YYYY-MM-DD (data de calendário editorial)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [yearStr, monthStr, dayStr] = trimmed.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10) - 1; // 0-indexed no Date
      const day = parseInt(dayStr, 10);

      // Instancia usando valores locais explícitos às 12h para imunidade total a deslocamentos
      const localDate = new Date(year, month, day, 12, 0, 0);
      return localDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: format === 'long' ? 'long' : 'short',
        year: 'numeric',
      });
    }

    // Caso 2: Timestamp ISO completo (ex: 2026-08-18T17:35:00.000Z)
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) return trimmed;

    return parsed.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: format === 'long' ? 'long' : 'short',
      year: 'numeric',
    });
  } catch {
    return trimmed;
  }
}

/**
 * Converte um timestamp ISO para o formato aceito por <input type="datetime-local"> (YYYY-MM-DDTHH:mm)
 * no fuso horário local do usuário.
 */
export function formatIsoForDateTimeInput(isoString?: string | null): string {
  if (!isoString || typeof isoString !== 'string') return '';
  try {
    const d = new Date(isoString.trim());
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day}T${hh}:${mm}`;
  } catch {
    return '';
  }
}

/**
 * Converte o valor de um <input type="date"> (YYYY-MM-DD) para um ISO String ao meio-dia local.
 */
export function parseDateInputToIso(dateInput?: string | null): string {
  if (!dateInput || !dateInput.trim()) return new Date().toISOString();
  const trimmed = dateInput.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const localDate = new Date(y, m - 1, d, 12, 0, 0);
    return localDate.toISOString();
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Converte o valor de um <input type="datetime-local"> (YYYY-MM-DDTHH:mm) para UTC ISO String.
 * Utiliza decomposição numérica explícita para garantir interpretação rigorosa no fuso horário local do usuário.
 */
export function parseDateTimeInputToIso(datetimeLocalInput?: string | null): string {
  if (!datetimeLocalInput || !datetimeLocalInput.trim()) {
    return new Date().toISOString();
  }
  const trimmed = datetimeLocalInput.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, yStr, mStr, dStr, hStr, minStr, sStr] = match;
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const day = parseInt(dStr, 10);
    const hours = parseInt(hStr, 10);
    const minutes = parseInt(minStr, 10);
    const seconds = sStr ? parseInt(sStr, 10) : 0;

    // Constrói objeto Date a partir dos componentes numéricos locais explícitos
    const localDate = new Date(year, month, day, hours, minutes, seconds, 0);
    if (!isNaN(localDate.getTime())) {
      return localDate.toISOString();
    }
  }

  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
}

