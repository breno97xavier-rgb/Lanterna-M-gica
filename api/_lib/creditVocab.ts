// ==============================================================================
// LANTERNA MÁGICA — FASE 10: FILMES E PESSOAS 2.0
// Mapeamento Central Determinístico de Vocabulário de Créditos (TMDB → Lanterna)
// Arquivo: api/_lib/creditVocab.ts
// ==============================================================================

export interface MappedCreditInfo {
  department: string;
  role: string;
  isDefaultSelected: boolean;
  priorityOrder: number;
}

/**
 * Mapeamento canônico de cargos técnicos e artísticos
 */
const CREW_MAPPINGS: Record<
  string, // `${department.toLowerCase()}|${job.toLowerCase()}`
  { department: string; role: string; isDefaultSelected: boolean; priorityOrder: number }
> = {
  // --- DIREÇÃO ---
  'directing|director': {
    department: 'Direção',
    role: 'Diretor',
    isDefaultSelected: true,
    priorityOrder: 10,
  },
  'directing|co-director': {
    department: 'Direção',
    role: 'Codiretor',
    isDefaultSelected: true,
    priorityOrder: 11,
  },
  'directing|assistant director': {
    department: 'Direção',
    role: 'Assistente de Direção',
    isDefaultSelected: false,
    priorityOrder: 15,
  },
  'directing|script supervisor': {
    department: 'Direção',
    role: 'Continuísta',
    isDefaultSelected: false,
    priorityOrder: 16,
  },

  // --- ROTEIRO & ADAPTAÇÃO ---
  'writing|screenplay': {
    department: 'Roteiro',
    role: 'Roteirista',
    isDefaultSelected: true,
    priorityOrder: 20,
  },
  'writing|writer': {
    department: 'Roteiro',
    role: 'Roteirista',
    isDefaultSelected: true,
    priorityOrder: 21,
  },
  'writing|author': {
    department: 'Roteiro',
    role: 'Roteirista',
    isDefaultSelected: true,
    priorityOrder: 22,
  },
  'writing|novel': {
    department: 'Roteiro',
    role: 'Autor da Obra Original',
    isDefaultSelected: true,
    priorityOrder: 23,
  },
  'writing|book': {
    department: 'Roteiro',
    role: 'Autor da Obra Original',
    isDefaultSelected: true,
    priorityOrder: 24,
  },
  'writing|dialogue': {
    department: 'Roteiro',
    role: 'Diálogos',
    isDefaultSelected: true,
    priorityOrder: 25,
  },
  'writing|story': {
    department: 'Roteiro',
    role: 'História Original',
    isDefaultSelected: false,
    priorityOrder: 26,
  },

  // --- FOTOGRAFIA ---
  'camera|director of photography': {
    department: 'Fotografia',
    role: 'Diretor de Fotografia',
    isDefaultSelected: true,
    priorityOrder: 30,
  },
  'camera|camera operator': {
    department: 'Fotografia',
    role: 'Operador de Câmera',
    isDefaultSelected: false,
    priorityOrder: 31,
  },
  'camera|still photographer': {
    department: 'Fotografia',
    role: 'Fotógrafo de Cena',
    isDefaultSelected: false,
    priorityOrder: 32,
  },
  'camera|assistant camera': {
    department: 'Fotografia',
    role: 'Assistente de Câmera',
    isDefaultSelected: false,
    priorityOrder: 33,
  },

  // --- MONTAGEM ---
  'editing|editor': {
    department: 'Montagem',
    role: 'Montador',
    isDefaultSelected: true,
    priorityOrder: 40,
  },
  'editing|supervising film editor': {
    department: 'Montagem',
    role: 'Supervisor de Montagem',
    isDefaultSelected: false,
    priorityOrder: 41,
  },
  'editing|assistant editor': {
    department: 'Montagem',
    role: 'Assistente de Montagem',
    isDefaultSelected: false,
    priorityOrder: 42,
  },

  // --- MÚSICA & SOM ---
  'sound|original music composer': {
    department: 'Música',
    role: 'Compositor',
    isDefaultSelected: true,
    priorityOrder: 50,
  },
  'sound|music': {
    department: 'Música',
    role: 'Música',
    isDefaultSelected: false,
    priorityOrder: 51,
  },
  'sound|sound designer': {
    department: 'Som',
    role: 'Desenho de Som',
    isDefaultSelected: false,
    priorityOrder: 52,
  },
  'sound|sound engineer': {
    department: 'Som',
    role: 'Engenheiro de Som',
    isDefaultSelected: false,
    priorityOrder: 53,
  },
  'sound|sound mixer': {
    department: 'Som',
    role: 'Mixador de Som',
    isDefaultSelected: false,
    priorityOrder: 54,
  },
  'sound|sound assistant': {
    department: 'Som',
    role: 'Assistente de Som',
    isDefaultSelected: false,
    priorityOrder: 55,
  },

  // --- PRODUÇÃO ---
  'production|producer': {
    department: 'Produção',
    role: 'Produtor',
    isDefaultSelected: false,
    priorityOrder: 60,
  },
  'production|executive producer': {
    department: 'Produção',
    role: 'Produtor Executivo',
    isDefaultSelected: false,
    priorityOrder: 61,
  },
  'production|co-producer': {
    department: 'Produção',
    role: 'Coprodutor',
    isDefaultSelected: false,
    priorityOrder: 62,
  },
  'production|line producer': {
    department: 'Produção',
    role: 'Produtor Delegado',
    isDefaultSelected: false,
    priorityOrder: 63,
  },
  'production|production manager': {
    department: 'Produção',
    role: 'Gerente de Produção',
    isDefaultSelected: false,
    priorityOrder: 64,
  },

  // --- DIREÇÃO DE ARTE & CENOGRAFIA ---
  'art|production design': {
    department: 'Direção de Arte',
    role: 'Diretor de Arte',
    isDefaultSelected: false,
    priorityOrder: 70,
  },
  'art|art direction': {
    department: 'Direção de Arte',
    role: 'Direção de Arte',
    isDefaultSelected: false,
    priorityOrder: 71,
  },
  'art|set decoration': {
    department: 'Direção de Arte',
    role: 'Cenógrafo',
    isDefaultSelected: false,
    priorityOrder: 72,
  },
  'art|assistant decorator': {
    department: 'Direção de Arte',
    role: 'Assistente de Cenografia',
    isDefaultSelected: false,
    priorityOrder: 73,
  },

  // --- FIGURINO & MAQUIAGEM ---
  'costume & make-up|costume design': {
    department: 'Figurino',
    role: 'Figurinista',
    isDefaultSelected: false,
    priorityOrder: 80,
  },
  'costume & make-up|makeup artist': {
    department: 'Maquiagem',
    role: 'Maquiador',
    isDefaultSelected: false,
    priorityOrder: 81,
  },
};

/**
 * Mapeamento de fallback para departamentos genéricos do TMDB
 */
const DEPARTMENT_FALLBACKS: Record<string, string> = {
  directing: 'Direção',
  writing: 'Roteiro',
  camera: 'Fotografia',
  editing: 'Montagem',
  sound: 'Som',
  production: 'Produção',
  art: 'Direção de Arte',
  'costume & make-up': 'Figurino',
  'visual effects': 'Efeitos Visuais',
  lighting: 'Iluminação',
  crew: 'Equipe Técnica',
};

/**
 * Mapeia membro da equipe técnica (Crew) para o vocabulário Lanterna Mágica
 */
export function mapTmdbCrewMember(tmdbDepartment: string, tmdbJob: string): MappedCreditInfo {
  const deptNorm = (tmdbDepartment || '').trim().toLowerCase();
  const jobNorm = (tmdbJob || '').trim().toLowerCase();
  const key = `${deptNorm}|${jobNorm}`;

  if (CREW_MAPPINGS[key]) {
    return CREW_MAPPINGS[key];
  }

  // Fallback departamental
  const fallbackDept = DEPARTMENT_FALLBACKS[deptNorm] || tmdbDepartment || 'Outro';
  return {
    department: fallbackDept,
    role: tmdbJob || fallbackDept,
    isDefaultSelected: false,
    priorityOrder: 90,
  };
}

/**
 * Regra de Curadoria de Elenco:
 * Determina se o membro do elenco é selecionado por padrão.
 * Regra determinística: Os primeiros 8 membros por ordem de faturamento (cast.order < 8)
 * recebem isDefaultSelected = true.
 */
export const MAX_DEFAULT_CAST_COUNT = 8;

export function isCastDefaultSelected(castOrder: number): boolean {
  return typeof castOrder === 'number' && castOrder >= 0 && castOrder < MAX_DEFAULT_CAST_COUNT;
}

/**
 * Mapeia membro do elenco (Cast) para o vocabulário Lanterna Mágica.
 * REGRA RIGOROSA: Papel padrão neutro 'Elenco'.
 * NÃO inferir "Ator" ou "Atriz" por nome, aparência ou heurística.
 */
export function mapTmdbCastMember(castOrder: number): MappedCreditInfo {
  return {
    department: 'Elenco',
    role: 'Elenco', // Neutro canônico para novas importações
    isDefaultSelected: isCastDefaultSelected(castOrder),
    priorityOrder: 5,
  };
}

/**
 * Normalização CONSERVADORA para comparação de character_name:
 * - trim
 * - case-insensitive
 * - normalização de múltiplos espaços -> 1 espaço simples
 * - normalização de espaços ao redor de '/' (ex: "Vossellin / Monseigneur" <=> "Vossellin/Monseigneur")
 *
 * Importante: A normalização serve SOMENTE para detectar equivalência semântica.
 * Se houver equivalência, o valor canônico LOCAL é sempre preservado!
 */
export function normalizeCharacterNameForMatching(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*\/\s*/g, ' / ') // normaliza espaços ao redor de barras
    .replace(/\s+/g, ' ');       // normaliza múltiplos espaços
}

