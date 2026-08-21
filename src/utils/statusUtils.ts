import { ContentStatus } from '../types';

/**
 * Utilitários centralizados para cálculo do status editorial efetivo.
 * 
 * Regra canônica:
 * - 'published': se status === 'published' OU (status === 'scheduled' E scheduled_at <= agora)
 * - 'scheduled': se status === 'scheduled' E scheduled_at > agora
 * - 'draft': se status === 'draft'
 * - 'archived': se status === 'archived'
 */

export interface ItemWithEditorialStatus {
  status?: ContentStatus | string | null;
  scheduled_at?: string | null;
  scheduledAt?: string | null;
  published_at?: string | null;
  publishedAt?: string | null;
}

/**
 * Calcula o status editorial efetivo de uma publicação ou registro administrativo.
 * 
 * Permite que itens agendados cujo horário de liberação já passou sejam representados
 * no CMS como 'published' sem necessitar de alteração física da coluna no banco.
 */
export function getEffectiveEditorialStatus(
  input: ItemWithEditorialStatus | ContentStatus | string | null | undefined,
  scheduledAtParam?: string | null,
  nowTime: number = Date.now()
): ContentStatus {
  if (!input) return 'draft';

  let status: ContentStatus = 'draft';
  let scheduledAt: string | null | undefined = null;

  if (typeof input === 'object' && input !== null) {
    status = (input.status as ContentStatus) || 'draft';
    scheduledAt = input.scheduled_at ?? input.scheduledAt;
  } else if (typeof input === 'string') {
    status = input as ContentStatus;
    scheduledAt = scheduledAtParam;
  }

  // Draft e Arquivado mantêm-se inalterados
  if (status === 'draft' || status === 'archived') {
    return status;
  }

  // Publicado direto
  if (status === 'published') {
    return 'published';
  }

  // Agendado: avalia se o timestamp programado já foi atingido
  if (status === 'scheduled') {
    if (scheduledAt && typeof scheduledAt === 'string' && scheduledAt.trim()) {
      const scheduledTime = new Date(scheduledAt.trim()).getTime();
      if (!isNaN(scheduledTime) && scheduledTime <= nowTime) {
        return 'published';
      }
    }
    return 'scheduled';
  }

  return status;
}

/**
 * Verifica se um item está efetivamente publicado (status 'published' ou agendado já liberado).
 */
export function isEffectivelyPublished(
  item: ItemWithEditorialStatus | null | undefined,
  nowTime: number = Date.now()
): boolean {
  return getEffectiveEditorialStatus(item, undefined, nowTime) === 'published';
}

/**
 * Retorna as classes visuais e o rótulo padrão para badges de status no CMS.
 */
export function getEditorialStatusBadgeInfo(status: ContentStatus) {
  switch (status) {
    case 'published':
      return {
        label: 'PUBLICADO',
        bgClass: 'bg-emerald-100',
        textClass: 'text-emerald-800',
        borderClass: 'border-emerald-300',
      };
    case 'draft':
      return {
        label: 'RASCUNHO',
        bgClass: 'bg-amber-100',
        textClass: 'text-amber-800',
        borderClass: 'border-amber-300',
      };
    case 'scheduled':
      return {
        label: 'AGENDADO',
        bgClass: 'bg-blue-100',
        textClass: 'text-blue-800',
        borderClass: 'border-blue-300',
      };
    case 'archived':
      return {
        label: 'ARQUIVADO',
        bgClass: 'bg-gray-200',
        textClass: 'text-gray-800',
        borderClass: 'border-gray-300',
      };
    default:
      return {
        label: 'DESCONHECIDO',
        bgClass: 'bg-stone-100',
        textClass: 'text-stone-700',
        borderClass: 'border-stone-300',
      };
  }
}
