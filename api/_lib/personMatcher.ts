// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Algoritmo Determinístico de Reconciliação e Classificação de Pessoas
// Arquivo: api/_lib/personMatcher.ts
//
// Regras Fundamentais:
// 1. EXACT_TMDB_MATCH: public.pessoas.tmdb_id = tmdbPersonId (determinação 100%).
// 2. POSSIBLE_LOCAL_MATCH: candidato localizado SOMENTE entre pessoas.tmdb_id IS NULL.
// 3. Nome igual NÃO é prova; gera sugestão (POSSIBLE), NUNCA auto-link.
// 4. AMBIGUOUS: múltiplos candidatos locais ou colisão de nomes com outro tmdb_id.
// 5. NEW_PERSON: nenhum candidato plausível; elegível para futura criação como draft.
// ==============================================================================

import type {
  ReconciledPerson,
  SuggestedPersonCandidate,
  PersonMatchSignals,
} from './types.js';

export interface LocalPersonRecord {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  birth_date: string | null;
  death_date: string | null;
  country: string | null;
  country_id: string | null;
  bio: string | null;
  is_editorial_profile: boolean;
  editorial_profile: string | null;
  primary_roles: string[] | null;
  status: string;
  tmdb_id: number | null;
  tmdb_synced_at: string | null;
  imdb_id: string | null;
}

export interface LocalCreditRecord {
  id: string;
  film_id: string;
  person_id: string | null;
  fallback_person_name: string | null;
  department: string;
  role: string | null;
  character_name: string | null;
  order_index: number;
}

export interface TmdbPersonInput {
  tmdbPersonId: number;
  name: string;
  originalName?: string;
  profilePath?: string | null;
  profileUrl?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
  imdbId?: string | null;
  knownForDepartment?: string;
}

/**
 * Normaliza strings para comparação flexível de nomes
 */
export function normalizePersonName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Extrai o ano de uma string de data (YYYY-MM-DD)
 */
function extractYear(dateStr: string | null | undefined): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.match(/^(\d{4})/);
  if (match) {
    const year = parseInt(match[1], 10);
    return isNaN(year) ? null : year;
  }
  return null;
}

/**
 * Classifica uma lista de pessoas do TMDB contra a base local de pessoas
 */
export function classifyTmdbPeople(
  tmdbPeople: TmdbPersonInput[],
  localPeople: LocalPersonRecord[],
  localFilmCredits: LocalCreditRecord[] = []
): ReconciledPerson[] {
  // 1. Mapear pessoas locais por tmdb_id
  const localByTmdbId = new Map<number, LocalPersonRecord>();
  // 2. Mapear pessoas locais sem tmdb_id por nome normalizado
  const unlinkedByNormName = new Map<string, LocalPersonRecord[]>();
  // 3. Mapear pessoas locais com outro tmdb_id por nome normalizado (para detecção de homônimos/conflito)
  const linkedByNormName = new Map<string, LocalPersonRecord[]>();

  // 4. Mapear participações em créditos locais do filme
  const localFilmPersonCredits = new Map<string, string[]>();
  localFilmCredits.forEach((c) => {
    if (c.person_id) {
      const existing = localFilmPersonCredits.get(c.person_id) || [];
      existing.push(`${c.department}: ${c.role || c.character_name || 'Crédito'}`);
      localFilmPersonCredits.set(c.person_id, existing);
    }
  });

  localPeople.forEach((p) => {
    const norm = normalizePersonName(p.name);
    if (p.tmdb_id !== null && p.tmdb_id !== undefined) {
      localByTmdbId.set(p.tmdb_id, p);
      const list = linkedByNormName.get(norm) || [];
      list.push(p);
      linkedByNormName.set(norm, list);
    } else {
      const list = unlinkedByNormName.get(norm) || [];
      list.push(p);
      unlinkedByNormName.set(norm, list);
    }
  });

  // 5. Deduplicar pessoas de entrada por tmdbPersonId
  const uniqueTmdbPeople = new Map<number, TmdbPersonInput>();
  tmdbPeople.forEach((p) => {
    if (!uniqueTmdbPeople.has(p.tmdbPersonId)) {
      uniqueTmdbPeople.set(p.tmdbPersonId, p);
    }
  });

  const results: ReconciledPerson[] = [];

  for (const person of uniqueTmdbPeople.values()) {
    const tmdbId = person.tmdbPersonId;
    const nameNorm = normalizePersonName(person.name);
    const origNorm = person.originalName ? normalizePersonName(person.originalName) : '';

    // --- CASO A: EXACT_TMDB_MATCH ---
    const exactMatch = localByTmdbId.get(tmdbId);
    if (exactMatch) {
      const signals: PersonMatchSignals = {
        exactTmdbIdMatch: true,
        localName: exactMatch.name,
        confidenceNotes: ['Correspondência exata por TMDB ID já registrado no banco de dados.'],
      };

      results.push({
        tmdbPersonId: tmdbId,
        name: person.name,
        originalName: person.originalName || person.name,
        profilePath: person.profilePath || null,
        profileUrl: person.profileUrl || null,
        status: 'EXACT_TMDB_MATCH',
        statusDescription: `Pessoa já vinculada no acervo: "${exactMatch.name}" (UUID: ${exactMatch.id}).`,
        matchedLocalPersonId: exactMatch.id,
        matchedLocalPerson: {
          id: exactMatch.id,
          name: exactMatch.name,
          slug: exactMatch.slug,
          photoUrl: exactMatch.photo_url,
          isEditorialProfile: exactMatch.is_editorial_profile,
          status: exactMatch.status,
        },
        suggestedCandidates: [],
        signals,
      });
      continue;
    }

    // --- CASO B: BUSCA DE CANDIDATOS SEM TMDB ID ---
    const unlinkedCandidates = [
      ...(unlinkedByNormName.get(nameNorm) || []),
      ...(origNorm && origNorm !== nameNorm ? unlinkedByNormName.get(origNorm) || [] : []),
    ];

    // Deduplicar candidatos por UUID
    const candidateMap = new Map<string, LocalPersonRecord>();
    unlinkedCandidates.forEach((c) => candidateMap.set(c.id, c));
    const uniqueCandidates = Array.from(candidateMap.values());

    // Verificar se existe conflito com pessoa que possui OUTRO tmdb_id
    const linkedSameName = [
      ...(linkedByNormName.get(nameNorm) || []),
      ...(origNorm && origNorm !== nameNorm ? linkedByNormName.get(origNorm) || [] : []),
    ];

    // Se existe pessoa com mesmo nome mas OUTRO tmdb_id e nenhum candidato sem tmdb_id
    if (uniqueCandidates.length === 0 && linkedSameName.length > 0) {
      const conflictP = linkedSameName[0];
      const signals: PersonMatchSignals = {
        exactTmdbIdMatch: false,
        normalizedNameMatch: true,
        localName: conflictP.name,
        otherLocalTmdbIdConflict: conflictP.tmdb_id,
        confidenceNotes: [
          `Homônimo detectado: "${conflictP.name}" já está associada ao TMDB #${conflictP.tmdb_id}. Trata-se de outra pessoa com mesmo nome.`,
        ],
      };

      results.push({
        tmdbPersonId: tmdbId,
        name: person.name,
        originalName: person.originalName || person.name,
        profilePath: person.profilePath || null,
        profileUrl: person.profileUrl || null,
        status: 'NEW_PERSON',
        statusDescription: `Nome coincide com registro existente ("${conflictP.name}"), mas este possui outro TMDB ID (#${conflictP.tmdb_id}). Criar como novo profissional.`,
        matchedLocalPersonId: null,
        matchedLocalPerson: null,
        suggestedCandidates: [],
        signals,
      });
      continue;
    }

    // CASO B.1: Exatamente 1 candidato local plausível sem TMDB ID
    if (uniqueCandidates.length === 1) {
      const cand = uniqueCandidates[0];
      const tmdbBirthYear = extractYear(person.birthDate);
      const localBirthYear = extractYear(cand.birth_date);
      const birthYearMatch =
        tmdbBirthYear !== null && localBirthYear !== null ? tmdbBirthYear === localBirthYear : undefined;

      const tmdbDeathYear = extractYear(person.deathDate);
      const localDeathYear = extractYear(cand.death_date);
      const deathYearMatch =
        tmdbDeathYear !== null && localDeathYear !== null ? tmdbDeathYear === localDeathYear : undefined;

      const hasLocalCreditsInFilm = localFilmPersonCredits.has(cand.id);
      const existingRolesInFilm = localFilmPersonCredits.get(cand.id) || [];

      const confidenceNotes: string[] = [
        `Nome normalizado idêntico a "${cand.name}" (sem TMDB ID vinculado).`,
      ];
      if (hasLocalCreditsInFilm) {
        confidenceNotes.push(`Pessoa já possui créditos cadastrados neste filme local.`);
      }
      if (birthYearMatch === true) {
        confidenceNotes.push(`Ano de nascimento coincidente (${localBirthYear}).`);
      }
      if (deathYearMatch === true) {
        confidenceNotes.push(`Ano de falecimento coincidente (${localDeathYear}).`);
      }

      const signals: PersonMatchSignals = {
        exactTmdbIdMatch: false,
        normalizedNameMatch: true,
        localName: cand.name,
        birthYearMatch,
        tmdbBirthYear,
        localBirthYear,
        deathYearMatch,
        tmdbDeathYear,
        localDeathYear,
        localCountry: cand.country,
        hasLocalCreditsInFilm,
        confidenceNotes,
      };

      const suggested: SuggestedPersonCandidate = {
        localPersonId: cand.id,
        name: cand.name,
        slug: cand.slug,
        photoUrl: cand.photo_url,
        birthDate: cand.birth_date,
        deathDate: cand.death_date,
        country: cand.country,
        isEditorialProfile: cand.is_editorial_profile,
        status: cand.status,
        existingRolesInFilm,
        signals,
      };

      results.push({
        tmdbPersonId: tmdbId,
        name: person.name,
        originalName: person.originalName || person.name,
        profilePath: person.profilePath || null,
        profileUrl: person.profileUrl || null,
        status: 'POSSIBLE_LOCAL_MATCH',
        statusDescription: `Candidato local sugerido: "${cand.name}" (UUID: ${cand.id}). Requer confirmação editorial.`,
        matchedLocalPersonId: null, // JAMAIS AUTO-LINK!
        matchedLocalPerson: null,
        suggestedCandidates: [suggested],
        signals,
      });
      continue;
    }

    // CASO B.2: Múltiplos candidatos locais sem TMDB ID
    if (uniqueCandidates.length > 1) {
      const suggestedList: SuggestedPersonCandidate[] = uniqueCandidates.map((cand) => {
        const hasLocalCreditsInFilm = localFilmPersonCredits.has(cand.id);
        const existingRolesInFilm = localFilmPersonCredits.get(cand.id) || [];
        const signals: PersonMatchSignals = {
          exactTmdbIdMatch: false,
          normalizedNameMatch: true,
          localName: cand.name,
          hasLocalCreditsInFilm,
          confidenceNotes: [`Múltiplo candidato local encontrado para o nome "${cand.name}".`],
        };

        return {
          localPersonId: cand.id,
          name: cand.name,
          slug: cand.slug,
          photoUrl: cand.photo_url,
          birthDate: cand.birth_date,
          deathDate: cand.death_date,
          country: cand.country,
          isEditorialProfile: cand.is_editorial_profile,
          status: cand.status,
          existingRolesInFilm,
          signals,
        };
      });

      results.push({
        tmdbPersonId: tmdbId,
        name: person.name,
        originalName: person.originalName || person.name,
        profilePath: person.profilePath || null,
        profileUrl: person.profileUrl || null,
        status: 'AMBIGUOUS',
        statusDescription: `Encontrados ${uniqueCandidates.length} candidatos locais com o nome "${person.name}". Escolha manual obrigatória.`,
        matchedLocalPersonId: null,
        matchedLocalPerson: null,
        suggestedCandidates: suggestedList,
        signals: {
          confidenceNotes: [`Ambiguidade: ${uniqueCandidates.length} registros locais com o mesmo nome.`],
        },
      });
      continue;
    }

    // CASO C: NEW_PERSON (Nenhum candidato local)
    results.push({
      tmdbPersonId: tmdbId,
      name: person.name,
      originalName: person.originalName || person.name,
      profilePath: person.profilePath || null,
      profileUrl: person.profileUrl || null,
      status: 'NEW_PERSON',
      statusDescription: `Profissional não cadastrado localmente. Será criado como rascunho (draft) se aprovado.`,
      matchedLocalPersonId: null,
      matchedLocalPerson: null,
      suggestedCandidates: [],
      signals: {
        confidenceNotes: ['Nenhum registro correspondente encontrado no banco local.'],
      },
    });
  }

  return results;
}
