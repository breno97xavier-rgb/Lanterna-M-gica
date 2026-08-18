import {
  Ensaio,
  Critica,
  UmaImagemUmaIdeia,
  Cineasta,
  Especial,
  Lista,
  Filme,
  Pessoa,
  FilmCredit,
  Estreia,
  TagItem,
  MediaItem,
  HighlightItem,
  SearchResult,
  ContentStatus,
} from '../types';

const STORAGE_KEY = 'lanterna_magica_cms_data_v4';

export const KNOWN_STORAGE_KEYS = [
  'lanterna_magica_cms_data_v4',
  'lanterna_magica_cms_data_v3',
  'lanterna_magica_cms_data_v2',
  'lanterna_magica_cms_data_v1',
  'lanterna_magica_cms_data',
];

export const EMPTY_CMS_DATA: CMSData = {
  ensaios: [],
  criticas: [],
  umaImagemList: [],
  cineastas: [],
  pessoas: [],
  filmes: [],
  estreias: [],
  especiais: [],
  listas: [],
  tags: [],
  media: [],
};

export const DEMO_SIGNATURES = {
  ensaios: ['ens-1', 'ens-2', 'ens-3'],
  criticas: ['crit-1', 'crit-2', 'crit-3'],
  umaImagemList: ['img-1'],
  cineastas: ['cin-1', 'cin-2'],
  pessoas: ['pes-1', 'pes-2', 'pes-3', 'pes-4', 'pes-5', 'pes-6', 'pes-7', 'pes-8', 'pes-9', 'pes-10', 'pes-11', 'pes-12'],
  filmes: ['film-1', 'film-2', 'film-3', 'film-4', 'film-5', 'film-6', 'film-7'],
  estreias: ['rel-1', 'rel-2', 'rel-3', 'rel-4', 'rel-5'],
  especiais: ['esp-1'],
  listas: ['lis-1'],
  media: ['med-1'],
};

export const ORIGINAL_DEMO_TITLES: Record<string, string> = {
  'ens-1': 'O Silêncio como Linguagem: A Trilogia da Fé de Ingmar Bergman',
  'ens-2': 'A Geometria do Afeto: O Plano Tatami e a Dignidade Cotidiana em Yasujiro Ozu',
  'ens-3': 'Robert Bresson e a Graça do Modelo: A Espiritualidade do Plano Despojado',
  'crit-1': 'Anatomia de uma Queda',
  'crit-2': 'Persona',
  'crit-3': 'Dias Perfeitos',
  'img-1': 'A Luz que Atravessa as Árvores em Komorebi',
  'cin-1': 'Ingmar Bergman',
  'cin-2': 'Yasujiro Ozu',
  'esp-1': 'BERGMAN: FÉ, SILÊNCIO E MORTE',
  'lis-1': 'Dez Obras Fundamentais sobre o Silêncio e a Fé no Cinema',
  'film-1': 'Persona',
  'film-2': 'Anatomia de uma Queda',
  'film-3': 'Dias Perfeitos',
  'film-4': 'O Fim da Rua',
  'film-5': 'Ainda Estou Aqui',
  'film-6': 'Megalopolis',
  'film-7': 'Zona de Interesse',
  'pes-1': 'Ingmar Bergman',
  'pes-2': 'Liv Ullmann',
  'pes-3': 'Bibi Andersson',
  'pes-4': 'Sven Nykvist',
  'pes-5': 'Justine Triet',
  'pes-6': 'Sandra Hüller',
  'pes-7': 'Wim Wenders',
  'pes-8': 'Koji Yakusho',
  'pes-9': 'Yasujiro Ozu',
  'pes-10': 'Marcelo Gomes',
  'pes-11': 'Walter Salles',
  'pes-12': 'Fernanda Torres',
  'rel-1': 'O Fim da Rua',
  'rel-2': 'Ainda Estou Aqui',
  'rel-3': 'Megalopolis',
  'rel-4': 'Anatomia de uma Queda',
  'rel-5': 'Zona de Interesse',
};

export function isUnmodifiedDemo(collection: string, item: any): boolean {
  if (!item || !item.id) return false;
  const demoIds = (DEMO_SIGNATURES as Record<string, string[]>)[collection] || [];
  if (!demoIds.includes(item.id)) return false;

  const originalTitle = ORIGINAL_DEMO_TITLES[item.id];
  if (!originalTitle) return true;

  const currentTitle = item.title || item.movieTitle || item.name || item.filmTitle || '';
  return currentTitle.trim().toLowerCase() === originalTitle.trim().toLowerCase();
}

export interface StorageVersionAudit {
  key: string;
  label: string;
  isCurrentKey: boolean;
  exists: boolean;
  itemCounts: {
    ensaios: number;
    criticas: number;
    umaImagem: number;
    cineastas: number;
    pessoas: number;
    filmes: number;
    estreias: number;
    especiais: number;
    listas: number;
    tags: number;
    media: number;
  };
  sampleTitles: {
    ensaios: string[];
    criticas: string[];
    cineastas: string[];
    pessoas: string[];
    listas: string[];
    especiais: string[];
  };
  realItemsCount: number;
  demoItemsCount: number;
  rawData?: CMSData;
}

export interface MigrationConflict {
  id: string;
  type: 'ensaio' | 'critica' | 'cineasta' | 'pessoa' | 'filme' | 'estreia' | 'lista' | 'especial' | 'umaImagem';
  currentTitle: string;
  incomingTitle: string;
  currentSlug: string;
  incomingSlug: string;
  currentItem: any;
  incomingItem: any;
  sourceKey: string;
}

export interface CMSData {
  ensaios: Ensaio[];
  criticas: Critica[];
  umaImagemList: UmaImagemUmaIdeia[];
  cineastas: Cineasta[];
  pessoas: Pessoa[];
  filmes: Filme[];
  estreias: Estreia[];
  especiais: Especial[];
  listas: Lista[];
  tags: TagItem[];
  media: MediaItem[];
}

export const INITIAL_DEMO_DATA: CMSData = {
  pessoas: [
    {
      id: 'pes-1',
      name: 'Ingmar Bergman',
      slug: 'ingmar-bergman',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      birthDate: '1918-07-14',
      deathDate: '2007-07-30',
      country: 'Suécia',
      primaryRoles: ['Diretor', 'Roteirista'],
      bio: 'Ingmar Bergman (1918–2007) foi um dos diretores e roteiristas mais influentes da história do cinema moderno. Nascido em Uppsala, na Suécia, filho de um pastor luterano austero, Bergman transformou as suas inquietações sobre fé, solidão, mortalidade e a complexidade das relações conjugais numa obra cinematográfica de rigor estético e filosófico ímpar.\n\nInspirador fundamental do projeto Lanterna Mágica — cujo nome remete tanto ao instrumento óptico ancestral quanto ao título da sua autobiografia (Lanterna Magica, 1987) —, o cinema de Bergman ensina que a tela pode ser um espaço de meditação existencial rigorosa e profundamente humana.',
      editorialProfile: 'O olhar de Bergman recusa o consolo fácil. Na ilha de Fårö, construiu uma dramaturgia da proximidade onde o rosto humano é o campo de batalha definitivo do cinema.',
      tags: ['Bergman', 'Existencialismo', 'Cinema Sueco', 'Fårö'],
      status: 'published',
      highlightHome: false,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'pes-2',
      name: 'Liv Ullmann',
      slug: 'liv-ullmann',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
      birthDate: '1938-12-16',
      country: 'Noruega',
      primaryRoles: ['Atriz', 'Diretora'],
      bio: 'Liv Johanne Ullmann é uma atriz, diretora e escritora norueguesa de renome internacional. Conhecida como uma das maiores colaboradoras artísticas e musa de Ingmar Bergman, Ullmann atuou em dez de seus filmes fundamentais, incluindo Persona (1966), Gritos e Sussurros (1972), Cenas de um Casamento (1973) e Sonata de Outono (1978).',
      editorialProfile: 'A intensidade expressiva de Ullmann definiu o cinema moderno de Bergman, transformando o silêncio de Elisabet Vogler em um manifesto contra a hipocrisia social.',
      tags: ['Atriz', 'Persona', 'Cinema Escandinavo', 'Diretora'],
      status: 'published',
      highlightHome: false,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'pes-3',
      name: 'Bibi Andersson',
      slug: 'bibi-andersson',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
      birthDate: '1935-11-11',
      deathDate: '2019-04-14',
      country: 'Suécia',
      primaryRoles: ['Atriz'],
      bio: 'Bibi Andersson (1935–2019) foi uma das mais aclamadas atrizes suecas do século XX. Sua interpretação vulnerável e penetrante da enfermeira Alma em Persona é considerada uma das maiores atuações da história do cinema.',
      tags: ['Atriz', 'Bergman', 'Persona'],
      status: 'published',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'pes-4',
      name: 'Sven Nykvist',
      slug: 'sven-nykvist',
      photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800',
      birthDate: '1922-12-03',
      deathDate: '2006-09-20',
      country: 'Suécia',
      primaryRoles: ['Diretor de Fotografia'],
      bio: 'Sven Vilhem Nykvist (1922–2006) foi um diretor de fotografia sueco com mais de 120 filmes no currículo. Colaborou com Bergman por décadas, ganhando dois Oscars de Melhor Fotografia (Gritos e Sussurros e Fanny & Alexander), revolucionando o uso da luz natural e dos contrastes do preto e branco.',
      editorialProfile: 'Mestre da luz nórdica e do claro-escuro psicológico. A sua câmera esculpia os contornos da alma humana.',
      tags: ['Fotografia', 'Diretor de Fotografia', 'Bergman', 'Cinema Sueco'],
      status: 'published',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'pes-5',
      name: 'Justine Triet',
      slug: 'justine-triet',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800',
      birthDate: '1978-07-17',
      country: 'França',
      primaryRoles: ['Diretora', 'Roteirista'],
      bio: 'Justine Triet é uma cineasta e roteirista francesa. Venceu a Palma de Ouro no Festival de Cannes de 2023 por Anatomia de uma Queda, tornando-se a terceira diretora mulher a conquistar a honraria máxima do cinema mundial.',
      tags: ['Diretora', 'Cinema Francês', 'Palme dOr'],
      status: 'published',
      createdAt: '2026-08-05T10:00:00Z',
      updatedAt: '2026-08-05T10:00:00Z',
    },
    {
      id: 'pes-6',
      name: 'Sandra Hüller',
      slug: 'sandra-huller',
      photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=800',
      birthDate: '1978-04-30',
      country: 'Alemanha',
      primaryRoles: ['Atriz'],
      bio: 'Sandra Hüller é uma das atrizes europeias mais celebradas de sua geração, com atuações consagradas em Toni Erdmann, Anatomia de uma Queda e Zona de Interesse.',
      tags: ['Atriz', 'Alemanha', 'Anatomia de uma Queda'],
      status: 'published',
      createdAt: '2026-08-05T10:00:00Z',
      updatedAt: '2026-08-05T10:00:00Z',
    },
    {
      id: 'pes-7',
      name: 'Wim Wenders',
      slug: 'wim-wenders',
      photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=800',
      birthDate: '1945-08-14',
      country: 'Alemanha',
      primaryRoles: ['Diretor', 'Roteirista', 'Produtor'],
      bio: 'Ernst Wilhelm "Wim" Wenders é um cineasta, dramaturgo, autor e fotógrafo alemão, figura seminal do Novo Cinema Alemão com obras como Paris, Texas, As Asas do Desejo e Dias Perfeitos.',
      tags: ['Diretor', 'Cinema Alemão', 'Dias Perfeitos'],
      status: 'published',
      createdAt: '2026-08-08T10:00:00Z',
      updatedAt: '2026-08-08T10:00:00Z',
    },
    {
      id: 'pes-8',
      name: 'Koji Yakusho',
      slug: 'koji-yakusho',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
      birthDate: '1956-01-01',
      country: 'Japão',
      primaryRoles: ['Ator'],
      bio: 'Koji Yakusho é um dos atores japoneses mais prestigiados do cinema contemporâneo. Venceu o prêmio de Melhor Ator no Festival de Cannes por seu papel como Hirayama em Dias Perfeitos.',
      tags: ['Ator', 'Cinema Japonês', 'Dias Perfeitos'],
      status: 'published',
      createdAt: '2026-08-08T10:00:00Z',
      updatedAt: '2026-08-08T10:00:00Z',
    },
    {
      id: 'pes-9',
      name: 'Yasujiro Ozu',
      slug: 'yasujiro-ozu',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
      birthDate: '1903-12-12',
      deathDate: '1963-12-12',
      country: 'Japão',
      primaryRoles: ['Diretor', 'Roteirista'],
      bio: 'Yasujiro Ozu (1903–1963) foi o grande mestre do cinema interior japonês. Mestre da quietude, Ozu dedicou a sua carreira a examinar a vida familiar e as transformações sociais do Japão do pós-guerra com uma sobriedade estética inconfundível.',
      tags: ['Cinema Japonês', 'Ozu', 'Quietude'],
      status: 'published',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'pes-10',
      name: 'Marcelo Gomes',
      slug: 'marcelo-gomes',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      country: 'Brasil',
      primaryRoles: ['Diretor', 'Roteirista'],
      bio: 'Marcelo Gomes é um premiado cineasta e roteirista brasileiro, diretor de Cinema, Aspirinas e Urubus, Viajo Porque Preciso, Volto Porque Te Amo, Paloma e O Fim da Rua.',
      tags: ['Cinema Brasileiro', 'Diretor'],
      status: 'published',
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'pes-11',
      name: 'Walter Salles',
      slug: 'walter-salles',
      photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=800',
      birthDate: '1956-04-12',
      country: 'Brasil',
      primaryRoles: ['Diretor', 'Produtor'],
      bio: 'Walter Salles é um dos cineastas mais renomados do cinema brasileiro, indicado ao Oscar por Central do Brasil e diretor de Diários de Motocicleta e Ainda Estou Aqui.',
      tags: ['Cinema Brasileiro', 'Diretor'],
      status: 'published',
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'pes-12',
      name: 'Fernanda Torres',
      slug: 'fernanda-torres',
      photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
      birthDate: '1965-09-15',
      country: 'Brasil',
      primaryRoles: ['Atriz', 'Escritora'],
      bio: 'Fernanda Pinheiro Monteiro Torres é uma das maiores atrizes brasileiras, vencedora do prêmio de Melhor Atriz no Festival de Cannes por Eu Sei Que Vou Te Amar (1986) e protagonista de Ainda Estou Aqui.',
      tags: ['Atriz', 'Cinema Brasileiro'],
      status: 'published',
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    }
  ],

  filmes: [
    {
      id: 'film-1',
      title: 'Persona',
      originalTitle: 'Persona',
      slug: 'persona',
      year: 1966,
      director: 'Ingmar Bergman',
      country: 'Suécia',
      genres: ['Drama', 'Psicológico', 'Mistério'],
      durationMinutes: 83,
      posterImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=800',
      synopsis: 'Uma atriz consagrada perde a voz durante a encenação de uma tragédia grega e recolhe-se em silêncio absoluto numa casa de praia na ilha de Fårö, acompanhada por uma jovem enfermeira cuja confissão constante dissolve as fronteiras entre as suas identidades.',
      credits: [
        {
          id: 'crd-1-1',
          filmId: 'film-1',
          personId: 'pes-1',
          personName: 'Ingmar Bergman',
          personSlug: 'ingmar-bergman',
          personPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
          department: 'Direção',
          role: 'Diretor',
          order: 1,
        },
        {
          id: 'crd-1-2',
          filmId: 'film-1',
          personId: 'pes-1',
          personName: 'Ingmar Bergman',
          personSlug: 'ingmar-bergman',
          personPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
          department: 'Roteiro',
          role: 'Roteirista',
          order: 2,
        },
        {
          id: 'crd-1-3',
          filmId: 'film-1',
          personId: 'pes-2',
          personName: 'Liv Ullmann',
          personSlug: 'liv-ullmann',
          personPhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
          department: 'Elenco',
          role: 'Atriz',
          characterName: 'Elisabet Vogler',
          order: 3,
        },
        {
          id: 'crd-1-4',
          filmId: 'film-1',
          personId: 'pes-3',
          personName: 'Bibi Andersson',
          personSlug: 'bibi-andersson',
          personPhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
          department: 'Elenco',
          role: 'Atriz',
          characterName: 'Enfermeira Alma',
          order: 4,
        },
        {
          id: 'crd-1-5',
          filmId: 'film-1',
          personId: 'pes-4',
          personName: 'Sven Nykvist',
          personSlug: 'sven-nykvist',
          personPhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800',
          department: 'Fotografia',
          role: 'Diretor de Fotografia',
          order: 5,
        }
      ],
      tags: ['Bergman', 'Identidade', 'Clássico', 'Fårö'],
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'film-2',
      title: 'Anatomia de uma Queda',
      originalTitle: "Anatomie d'une chute",
      slug: 'anatomia-de-uma-queda',
      year: 2026,
      director: 'Justine Triet',
      country: 'França',
      genres: ['Drama', 'Tribunal', 'Suspense'],
      durationMinutes: 152,
      posterImage: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c7a5c1?auto=format&fit=crop&q=80&w=800',
      synopsis: 'Um julgamento que disseca minuciosamente o casamento de uma escritora alemã após a morte súbita e violenta de seu marido nas montanhas isoladas de Grenoble, onde o filho cego do casal é a única testemunha.',
      credits: [
        {
          id: 'crd-2-1',
          filmId: 'film-2',
          personId: 'pes-5',
          personName: 'Justine Triet',
          personSlug: 'justine-triet',
          personPhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800',
          department: 'Direção',
          role: 'Diretora',
          order: 1,
        },
        {
          id: 'crd-2-2',
          filmId: 'film-2',
          personId: 'pes-6',
          personName: 'Sandra Hüller',
          personSlug: 'sandra-huller',
          personPhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=800',
          department: 'Elenco',
          role: 'Atriz',
          characterName: 'Sandra Voyter',
          order: 2,
        }
      ],
      tags: ['Tribunal', 'França', 'Lançamentos'],
      createdAt: '2026-08-05T10:00:00Z',
      updatedAt: '2026-08-05T10:00:00Z',
    },
    {
      id: 'film-3',
      title: 'Dias Perfeitos',
      originalTitle: 'Perfect Days',
      slug: 'dias-perfeitos',
      year: 2026,
      director: 'Wim Wenders',
      country: 'Japão / Alemanha',
      genres: ['Drama', 'Contemplativo'],
      durationMinutes: 124,
      posterImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=800',
      synopsis: 'A vida harmoniosa e poética de Hirayama, um zelador de banheiros públicos em Tóquio que encontra sublime satisfação na música em fita cassete, na fotografia de árvores e nos encontros fortuitos do cotidiano.',
      credits: [
        {
          id: 'crd-3-1',
          filmId: 'film-3',
          personId: 'pes-7',
          personName: 'Wim Wenders',
          personSlug: 'wim-wenders',
          personPhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=800',
          department: 'Direção',
          role: 'Diretor',
          order: 1,
        },
        {
          id: 'crd-3-2',
          filmId: 'film-3',
          personId: 'pes-8',
          personName: 'Koji Yakusho',
          personSlug: 'koji-yakusho',
          personPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
          department: 'Elenco',
          role: 'Ator',
          characterName: 'Hirayama',
          order: 2,
        }
      ],
      tags: ['Wim Wenders', 'Japão', 'Contemplação'],
      createdAt: '2026-08-08T10:00:00Z',
      updatedAt: '2026-08-08T10:00:00Z',
    },
    {
      id: 'film-4',
      title: 'O Fim da Rua',
      originalTitle: 'O Fim da Rua',
      slug: 'o-fim-da-rua',
      year: 2026,
      director: 'Marcelo Gomes',
      country: 'Brasil',
      genres: ['Drama', 'Suspense'],
      durationMinutes: 104,
      posterImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800',
      synopsis: 'Nas encruzilhadas do Recife contemporâneo, um conflito silencioso entre vizinhos de classes distintas desencadeia revelações sobre o passado urbano e as memórias reprimidas da cidade.',
      credits: [
        {
          id: 'crd-4-1',
          filmId: 'film-4',
          personId: 'pes-10',
          personName: 'Marcelo Gomes',
          personSlug: 'marcelo-gomes',
          department: 'Direção',
          role: 'Diretor',
          order: 1,
        }
      ],
      tags: ['Cinema Brasileiro', 'Recife', 'Estreias'],
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'film-5',
      title: 'Ainda Estou Aqui',
      originalTitle: 'Ainda Estou Aqui',
      slug: 'ainda-estou-aqui',
      year: 2026,
      director: 'Walter Salles',
      country: 'Brasil',
      genres: ['Drama', 'Histórico', 'Biografia'],
      durationMinutes: 135,
      posterImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800',
      synopsis: 'Adaptação do livro autobiográfico de Marcelo Rubens Paiva, que narra a luta incansável de sua mãe, Eunice Paiva, para reconstruir a família e descobrir o paradeiro do marido, o deputado Rubens Paiva, preso pela ditadura militar em 1971.',
      credits: [
        {
          id: 'crd-5-1',
          filmId: 'film-5',
          personId: 'pes-11',
          personName: 'Walter Salles',
          personSlug: 'walter-salles',
          department: 'Direção',
          role: 'Diretor',
          order: 1,
        },
        {
          id: 'crd-5-2',
          filmId: 'film-5',
          personId: 'pes-12',
          personName: 'Fernanda Torres',
          personSlug: 'fernanda-torres',
          department: 'Elenco',
          role: 'Atriz',
          characterName: 'Eunice Paiva',
          order: 2,
        }
      ],
      tags: ['Cinema Brasileiro', 'Ditadura Militar', 'Estreias'],
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'film-6',
      title: 'Megalopolis',
      originalTitle: 'Megalopolis',
      slug: 'megalopolis',
      year: 2026,
      director: 'Francis Ford Coppola',
      country: 'Estados Unidos',
      genres: ['Ficção Científica', 'Drama', 'Épico'],
      durationMinutes: 138,
      posterImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=800',
      synopsis: 'Uma fábula épica romana ambientada em uma América moderna imaginada. A cidade de Nova Roma entra em colapso e confronta dois ideais de futuro: o do arquiteto visionário Cesar Catilina e o do prefeito corrupto Franklyn Cicero.',
      tags: ['Coppola', 'Ficção Científica', 'Estreias'],
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'film-7',
      title: 'Zona de Interesse',
      originalTitle: 'The Zone of Interest',
      slug: 'zona-de-interesse',
      year: 2026,
      director: 'Jonathan Glazer',
      country: 'Reino Unido / Polônia',
      genres: ['Drama', 'Histórico', 'Guerra'],
      durationMinutes: 105,
      posterImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=800',
      synopsis: 'O comandante de Auschwitz, Rudolf Höss, e sua esposa Hedwig esforçam-se para construir uma vida paradisíaca para sua família em uma casa e jardim idílicos situados exatamente ao lado do muro do campo de extermínio.',
      tags: ['Holocausto', 'Glazer', 'Cinema Europeu'],
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    }
  ],

  estreias: [
    {
      id: 'rel-1',
      filmId: 'film-4',
      filmTitle: 'O Fim da Rua',
      filmSlug: 'o-fim-da-rua',
      filmDirector: 'Marcelo Gomes',
      filmYear: 2026,
      filmCountry: 'Brasil',
      filmGenres: ['Drama', 'Suspense'],
      filmDurationMinutes: 104,
      filmPoster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800',
      country: 'Brasil',
      releaseDate: '2026-08-13',
      releaseType: 'Cinema',
      distributor: 'Vitrine Filmes',
      notes: 'Estreia nacional nos cinemas brasileiros.',
      status: 'published',
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'rel-2',
      filmId: 'film-5',
      filmTitle: 'Ainda Estou Aqui',
      filmSlug: 'ainda-estou-aqui',
      filmDirector: 'Walter Salles',
      filmYear: 2026,
      filmCountry: 'Brasil',
      filmGenres: ['Drama', 'Histórico', 'Biografia'],
      filmDurationMinutes: 135,
      filmPoster: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800',
      country: 'Brasil',
      releaseDate: '2026-08-13',
      releaseType: 'Cinema',
      distributor: 'Sony Pictures Classics / Globoplay',
      notes: 'Lançamento simultâneo nos principais circuitos exibidores do país.',
      status: 'published',
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'rel-3',
      filmId: 'film-6',
      filmTitle: 'Megalopolis',
      filmSlug: 'megalopolis',
      filmDirector: 'Francis Ford Coppola',
      filmYear: 2026,
      filmCountry: 'Estados Unidos',
      filmGenres: ['Ficção Científica', 'Drama', 'Épico'],
      filmDurationMinutes: 138,
      filmPoster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=800',
      country: 'Brasil',
      releaseDate: '2026-08-13',
      releaseType: 'Cinema',
      distributor: 'O2 Play',
      notes: 'Estreia em salas IMAX e convencionais.',
      status: 'published',
      createdAt: '2026-08-10T10:00:00Z',
      updatedAt: '2026-08-10T10:00:00Z',
    },
    {
      id: 'rel-4',
      filmId: 'film-2',
      filmTitle: 'Anatomia de uma Queda',
      filmSlug: 'anatomia-de-uma-queda',
      filmDirector: 'Justine Triet',
      filmYear: 2026,
      filmCountry: 'França',
      filmGenres: ['Drama', 'Tribunal', 'Suspense'],
      filmDurationMinutes: 152,
      filmPoster: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c7a5c1?auto=format&fit=crop&q=80&w=800',
      country: 'Brasil',
      releaseDate: '2026-08-06',
      releaseType: 'Cinema',
      distributor: 'Diamond Films',
      notes: 'Semana anterior.',
      status: 'published',
      createdAt: '2026-08-03T10:00:00Z',
      updatedAt: '2026-08-03T10:00:00Z',
    },
    {
      id: 'rel-5',
      filmId: 'film-7',
      filmTitle: 'Zona de Interesse',
      filmSlug: 'zona-de-interesse',
      filmDirector: 'Jonathan Glazer',
      filmYear: 2026,
      filmCountry: 'Reino Unido / Polônia',
      filmGenres: ['Drama', 'Histórico', 'Guerra'],
      filmDurationMinutes: 105,
      filmPoster: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=800',
      country: 'Brasil',
      releaseDate: '2026-07-30',
      releaseType: 'Cinema',
      distributor: 'Max / A24',
      notes: 'Lançamento de fim de julho.',
      status: 'published',
      createdAt: '2026-07-28T10:00:00Z',
      updatedAt: '2026-07-28T10:00:00Z',
    }
  ],

  ensaios: [
    {
      id: 'ens-1',
      title: 'O Silêncio como Linguagem no Cinema de Ingmar Bergman',
      slug: 'o-silencio-como-linguagem-no-cinema-de-ingmar-bergman',
      subtitle: 'Uma investigação sobre o peso das palavras não ditas, a crise da fé e o vazio existencial na trilogia do silêncio.',
      coverImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1600',
      content: `No cinema de Ingmar Bergman, o silêncio não é ausência de som; é uma presença tangível e por vezes ensurdecedora. Quando as personagens de Bergman calam, a câmara não recua. Pelo contrário, aproxima-se do rosto humano até que a pele se torne uma cartografia de angústia.

Em *Persona* (1966), a mutismo de Elisabet Vogler (Liv Ullmann) não representa apenas uma recusa em desempenhar papéis sociais, mas uma greve radical contra a falsidade do discurso. Ao escolher o silêncio, Elisabet expõe a fragilidade da enfermeira Alma (Bibi Andersson), cuja torrente de confissões acaba por dissolver os limites entre duas identidades.

### A Trilogia da Incomunicabilidade

Ao longo de *Através de um Espelho* (1961), *Luz de Inverno* (1962) e *O Silêncio* (1963), Bergman questiona sistematicamente o silêncio divino. Se Deus permanece calado diante do sofrimento humano, cabe aos homens tentarem, quase em vão, comunicar entre si.

O cinema deixa de ser mero entretenimento para se transformar num altar secular de meditação moral e estética. O silêncio de Bergman força o espectador a olhar para a tela não em busca de respostas fáceis, mas para enfrentar as perguntas que habitam a própria existência.`,
      category: 'Filosofia & Estética',
      tags: ['Bergman', 'Silêncio', 'Existencialismo', 'Cinema Sueco', 'Fé'],
      author: 'Breno Matos',
      date: '2026-08-01',
      readTimeMinutes: 8,
      highlightHome: true,
      seoTitle: 'O Silêncio em Ingmar Bergman — Lanterna Mágica',
      seoDescription: 'Uma análise profunda sobre o silêncio e o vazio existencial no cinema de Ingmar Bergman.',
      status: 'published',
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'ens-2',
      title: 'A Geometria do Afeto em Yasujiro Ozu',
      slug: 'a-geometria-do-afeto-em-yasujiro-ozu',
      subtitle: 'Como a câmara baixa e a repetição do cotidiano revelam a passagem inexorável do tempo e a resignação familiar.',
      coverImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=1600',
      content: `Yasujiro Ozu encarava a câmara como um observador silencioso ajoelhado no tatami. Posicionada a cerca de três pés do chão, a perspetiva de Ozu elimina a hierarquia visual dramática do cinema ocidental.

Em *Era Uma Vez em Tóquio* (*Tokyo Monogatari*, 1953), o tempo não avança por sobressaltos, mas pelo ritmo calmo dos ciclos familiares. Os pais idosos que viajam até à capital descobrem que os filhos crescidos já não têm espaço moral ou temporal para os acolher. Não há vilões na narrativa; há apenas a vida moderna a acontecer com a sua melancólica naturalidade.

O conceito japonês de *Mono no Aware* — a sensibilidade empática perante a impermanência das coisas — encontra na estética de Ozu a sua expressão cinematográfica máxima.`,
      category: 'Memória & Tempo',
      tags: ['Ozu', 'Cinema Japonês', 'Tempo', 'Família', 'Estética'],
      author: 'Breno Matos',
      date: '2026-07-20',
      readTimeMinutes: 6,
      highlightHome: true,
      seoTitle: 'Yasujiro Ozu e o Tempo no Cinema — Lanterna Mágica',
      seoDescription: 'A quietude e a geometria do afeto no cinema de Yasujiro Ozu.',
      status: 'published',
      createdAt: '2026-07-20T10:00:00Z',
      updatedAt: '2026-07-20T10:00:00Z',
    },
    {
      id: 'ens-3',
      title: 'Robert Bresson e a Graça do Modelo Cinematográfico',
      slug: 'robert-bresson-e-a-graca-do-modelo-cinematografico',
      subtitle: 'A recusa do ato teatral e a busca por um cinema puro despido de artifícios representativos.',
      coverImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=1600',
      content: `Em suas *Notas sobre o Cinematógrafo*, Robert Bresson estabelece uma distinção fundamental: o cinema não deve ser teatro filmado. Para atingir a verdade interior da imagem, Bresson rejeita os atores tradicionais em favor dos "modelos" — não profissionais instruídos a repetir falas e gestos sem inflexão dramática até que o ego seja totalmente eliminado.

Em *A Grande Testemunha* (*Au Hasard Balthazar*, 1966), a vida e o sofrimento de um burro atravessam a crueldade e a paixão humanas com uma dignidade quase bíblica. Ao retirar a interpretação ostensiva, Bresson permite que o mistério do invisível emerja da matéria visível.`,
      category: 'Teoria & Linguagem',
      tags: ['Bresson', 'Cinema Francês', 'Espiritualidade', 'Teoria'],
      author: 'Breno Matos',
      date: '2026-06-15',
      readTimeMinutes: 7,
      highlightHome: false,
      seoTitle: 'Robert Bresson e a Graça do Modelo — Lanterna Mágica',
      seoDescription: 'A reflexão sobre a linguagem cinematográfica e o estilo transcendente de Bresson.',
      status: 'published',
      createdAt: '2026-06-15T10:00:00Z',
      updatedAt: '2026-06-15T10:00:00Z',
    }
  ],

  criticas: [
    {
      id: 'crit-1',
      movieTitle: 'Anatomia de uma Queda',
      editorialTitle: 'Onde a Verdade Legal se Choca com o Inimaginável do Matrimônio',
      slug: 'anatomia-de-uma-queda-critica',
      director: 'Justine Triet',
      year: 2026,
      country: 'França',
      durationMinutes: 152,
      screenplay: 'Justine Triet, Arthur Harari',
      cinematography: 'Simon Beaufils',
      genre: 'Drama / Tribunal',
      genres: ['Drama', 'Tribunal', 'Suspense'],
      coverImage: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c7a5c1?auto=format&fit=crop&q=80&w=1600',
      content: `O tribunal em *Anatomia de uma Queda* não é um local de justiça transcendente, mas uma arena onde a linguagem tenta dissecar a intimidade sem compreender o seu mistério. Quando Samuel cai do chalé nas montanhas isoladas, a única testemunha é o filho cego, Daniel, e o seu cão de assistência.

Sandra Hüller entrega uma atuação monumental como uma escritora cuja vida privada é convertida em prova acusatória. O filme recusa os atalhos do thriller convencional. O que interessa a Justine Triet não é apenas responder "quem o fez", mas demonstrar como o sistema judiciário exige uma narrativa coesa ali onde a vida real é feita de ambiguidade, ressentimento e silêncio.

A nota em estrelas reflete o domínio absoluto da montagem e o respeito do filme pela inteligência moral do espectador.`,
      starRating: 4.5,
      tags: ['Tribunal', 'Psicologia', 'Cinema Francês', 'Lançamentos'],
      isNewRelease: true,
      highlightHome: true,
      date: '2026-08-05',
      seoTitle: 'Crítica: Anatomia de uma Queda — Lanterna Mágica',
      seoDescription: 'Análise detalhada de Anatomia de uma Queda de Justine Triet.',
      status: 'published',
      createdAt: '2026-08-05T10:00:00Z',
      updatedAt: '2026-08-05T10:00:00Z',
    },
    {
      id: 'crit-2',
      movieTitle: 'Persona',
      editorialTitle: 'A Dissolução da Face Humana e o Espelho da Alma',
      slug: 'persona-1966-critica',
      director: 'Ingmar Bergman',
      year: 1966,
      country: 'Suécia',
      durationMinutes: 83,
      screenplay: 'Ingmar Bergman',
      cinematography: 'Sven Nykvist',
      genre: 'Drama / Psicológico',
      genres: ['Drama', 'Psicológico', 'Mistério'],
      coverImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1600',
      content: `Lançado em 1966, *Persona* permanece como uma das obras mais radicais da história do cinema. A imagem de abertura — o projetor a acender-se, os frames queimados, a contagem decrescente de película — lembra-nos de que estamos diante de um objeto construído de luz e sombra.

No entanto, à medida que a enfermeira Alma cuida de Elisabet na casa de praia isolada em Fårö, a matéria do filme transcende o próprio suporte. A fotografia em preto e branco de Sven Nykvist esculpe as faces das duas mulheres até que a fusão mítica dos seus rostos se torne um dos momentos mais arrebatadores da modernidade cinematográfica.`,
      starRating: 5.0,
      tags: ['Bergman', 'Clássico', 'Psicologia', 'Identidade'],
      isNewRelease: false,
      highlightHome: false,
      date: '2026-07-10',
      seoTitle: 'Crítica: Persona (1966) — Lanterna Mágica',
      seoDescription: 'Análise do clássico Persona de Ingmar Bergman.',
      status: 'published',
      createdAt: '2026-07-10T10:00:00Z',
      updatedAt: '2026-07-10T10:00:00Z',
    },
    {
      id: 'crit-3',
      movieTitle: 'Dias Perfeitos',
      editorialTitle: 'O Rigor da Repetição e a Beleza do Cotidiano',
      slug: 'dias-perfeitos-wim-wenders-critica',
      director: 'Wim Wenders',
      year: 2026,
      country: 'Japão / Alemanha',
      durationMinutes: 124,
      screenplay: 'Wim Wenders, Takuma Takasaki',
      cinematography: 'Franz Lustig',
      genre: 'Drama',
      genres: ['Drama', 'Contemplativo'],
      coverImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=1600',
      content: `Koji Yakusho interpreta Hirayama, um limpador de casas de banho públicas em Tóquio que vive a sua rotina com uma devoção quase monástica. Hirayama acorda com o som das vassouras na rua, cuida das suas plantas, ouve cassetes de rock clássico e fotografa as sombras das árvores (*komorebi*).

Wim Wenders filma este percurso sem sombra de sentimentalismo. Em vez disso, propõe um exercício de desaceleração num mundo saturado de ruído. É um filme sobre a dignidade do trabalho simples e a riqueza que reside na atenção plena ao presente.`,
      starRating: 4.0,
      tags: ['Wim Wenders', 'Japão', 'Rotina', 'Contemplação'],
      isNewRelease: true,
      highlightHome: false,
      date: '2026-07-28',
      seoTitle: 'Crítica: Dias Perfeitos — Lanterna Mágica',
      seoDescription: 'A serenidade e a rotina poética no filme Dias Perfeitos de Wim Wenders.',
      status: 'published',
      createdAt: '2026-07-28T10:00:00Z',
      updatedAt: '2026-07-28T10:00:00Z',
    }
  ],

  umaImagemList: [
    {
      id: 'img-1',
      title: 'A Luz que Atravessa as Árvores em Komorebi',
      slug: 'a-luz-que-atravessa-as-arvores',
      image: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&q=80&w=1600',
      content: `No idioma japonês, existe uma palavra sem tradução direta para as línguas ocidentais: *Komorebi* (木漏れ日). Designa a luz do sol que vaza através das folhas das árvores, criando uma dança efémera de sombras no chão.

Em *Dias Perfeitos*, Hirayama aponta a sua pequena câmara analógica para o alto todas as tardes. Ele sabe que a luz de hoje nunca se repetirá exatamente igual amanhã. É uma lição de cinema moral: a imagem não existe para reter a posse do mundo, mas para testemunhar a sua passagem graciosa e irrepetível.`,
      relatedMovie: 'Dias Perfeitos',
      relatedFilmmaker: 'Wim Wenders',
      tags: ['Luz', 'Contemplação', 'Fotografia', 'Japão'],
      highlightHome: true,
      date: '2026-08-08',
      status: 'published',
      createdAt: '2026-08-08T10:00:00Z',
      updatedAt: '2026-08-08T10:00:00Z',
    }
  ],

  cineastas: [
    {
      id: 'cin-1',
      name: 'Ingmar Bergman',
      slug: 'ingmar-bergman',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      bio: `Ingmar Bergman (1918–2007) foi um dos diretores e roteiristas mais influentes da história do cinema moderno. Nascido em Uppsala, na Suécia, filho de um pastor luterano austero, Bergman transformou as suas inquietações pessoais sobre fé, solidão, mortalidade e a complexidade das relações conjugais numa obra cinematográfica de rigor estético incomparável.

Inspirador fundamental do projeto Lanterna Mágica — cujo nome remete tanto ao instrumento óptico ancestral quanto ao título da sua autobiografia (*Lanterna Magica*, 1987) —, o cinema de Bergman ensina que a tela pode ser um espaço de meditação existencial rigorosa e profundamente humana.`,
      birthYear: 1918,
      deathYear: 2007,
      country: 'Suécia',
      tags: ['Existencialismo', 'Fårö', 'Teatro', 'Suécia'],
      highlightHome: false,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    },
    {
      id: 'cin-2',
      name: 'Yasujiro Ozu',
      slug: 'yasujiro-ozu',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
      bio: `Yasujiro Ozu (1903–1963) foi o grande mestre do cinema interior japonês. Mestre da quietude, Ozu dedicou a sua carreira a examinar a vida familiar e as transformações sociais do Japão do pós-guerra com uma sobriedade estética inconfundível.`,
      birthYear: 1903,
      deathYear: 1963,
      country: 'Japão',
      tags: ['Cinema Japonês', 'Ozu', 'Quietude'],
      highlightHome: false,
      createdAt: '2026-08-01T10:00:00Z',
      updatedAt: '2026-08-01T10:00:00Z',
    }
  ],

  especiais: [
    {
      id: 'esp-1',
      title: 'BERGMAN: FÉ, SILÊNCIO E MORTE',
      slug: 'bergman-fe-silencio-e-morte',
      subtitle: 'Um ciclo editorial dedicado a explorar a vertigem espiritual e o rigor humano no cinema do mestre sueco.',
      coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1600',
      intro: 'Reunimos ensaios, críticas detalhadas e perfis para compreender como Ingmar Bergman transformou a angústia existencial numa das linguagens visuais mais potentes do século XX.',
      content: `O cinema de Ingmar Bergman não busca consolar o espectador; busca desnudá-lo. Ao longo de mais de quatro décadas de produção compulsiva entre o teatro e a ilha de Fårö, Bergman interrogou o silêncio de Deus, a fragilidade da identidade e o sofrimento inescapável da condição humana.

Neste especial do Lanterna Mágica, organizamos um percurso de leitura e análise por obras fundamentais como *O Sétimo Selo*, *Morangos Silvestres*, *Persona*, *Luz de Inverno* e *Fanny e Alexander*.`,
      relatedItemIds: ['ens-1', 'crit-2', 'cin-1', 'film-1'],
      highlightHome: true,
      status: 'published',
      createdAt: '2026-08-02T10:00:00Z',
      updatedAt: '2026-08-02T10:00:00Z',
    }
  ],

  listas: [
    {
      id: 'lis-1',
      title: 'Dez Obras Fundamentais sobre o Silêncio e a Fé no Cinema',
      slug: 'dez-obras-fundamentais-sobre-o-silencio-e-a-fe',
      intro: 'Uma seleção com curadoria editorial do Lanterna Mágica sobre filmes que investigam a dimensão espiritual sem recorrer a clichês religiosos.',
      coverImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=1600',
      items: [
        { rank: 1, title: 'O Sétimo Selo', director: 'Ingmar Bergman', year: 1957, note: 'A partida de xadrez com a Morte como metáfora da angústia medieval e contemporânea.' },
        { rank: 2, title: 'Luz de Inverno', director: 'Ingmar Bergman', year: 1962, note: 'A perda da fé de um pastor numa igreja fria no interior da Suécia.' },
        { rank: 3, title: 'A Palavra (Ordet)', director: 'Carl Theodor Dreyer', year: 1955, note: 'O milagre e a fé pura confrontando o dogmatismo e o ceticismo familiar.' },
        { rank: 4, title: 'O Diário de um Pároco de Aldeia', director: 'Robert Bresson', year: 1951, note: 'O sofrimento físico e a graça na vida de um jovem padre.' },
        { rank: 5, title: 'Silêncio', director: 'Martin Scorsese', year: 2016, note: 'A crise de fé dos jesuítas portugueses no Japão do século XVII.' }
      ],
      relatedFilmmaker: 'Ingmar Bergman',
      tags: ['Fé', 'Espiritualidade', 'Clássicos', 'Listas'],
      status: 'published',
      createdAt: '2026-08-03T10:00:00Z',
      updatedAt: '2026-08-03T10:00:00Z',
    }
  ],

  tags: [
    { id: 'tag-1', name: 'Bergman', slug: 'bergman', createdAt: '2026-08-01T10:00:00Z' },
    { id: 'tag-2', name: 'Silêncio', slug: 'silencio', createdAt: '2026-08-01T10:00:00Z' },
    { id: 'tag-3', name: 'Existencialismo', slug: 'existencialismo', createdAt: '2026-08-01T10:00:00Z' },
    { id: 'tag-4', name: 'Cinema Sueco', slug: 'cinema-sueco', createdAt: '2026-08-01T10:00:00Z' },
    { id: 'tag-5', name: 'Fé', slug: 'fe', createdAt: '2026-08-01T10:00:00Z' },
    { id: 'tag-6', name: 'Lançamentos', slug: 'lancamentos', createdAt: '2026-08-01T10:00:00Z' },
    { id: 'tag-7', name: 'Wim Wenders', slug: 'wim-wenders', createdAt: '2026-08-01T10:00:00Z' }
  ],

  media: [
    {
      id: 'med-1',
      url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=1600',
      filename: 'bergman_silencio_cover.jpg',
      altText: 'Projetor de cinema clássico em sala escura',
      caption: 'Projetor óptico do arquivo Lanterna Mágica',
      credit: 'Unsplash / Cinema',
      createdAt: '2026-08-01T10:00:00Z'
    }
  ]
};

export class CMSStore {
  private data: CMSData;

  constructor() {
    this.data = this.loadFromStorage();
    this.evaluateScheduledItems();
    this.ensurePessoasAndCineastasSync();
  }

  public normalizeAndFillMissingCollections(raw: any): CMSData {
    if (!raw || typeof raw !== 'object') return JSON.parse(JSON.stringify(EMPTY_CMS_DATA));

    const normalized: CMSData = {
      ensaios: Array.isArray(raw.ensaios) ? raw.ensaios : [],
      criticas: Array.isArray(raw.criticas) ? raw.criticas : [],
      umaImagemList: Array.isArray(raw.umaImagemList) ? raw.umaImagemList : [],
      cineastas: Array.isArray(raw.cineastas) ? raw.cineastas : [],
      pessoas: Array.isArray(raw.pessoas) ? raw.pessoas : [],
      filmes: Array.isArray(raw.filmes) ? raw.filmes : [],
      estreias: Array.isArray(raw.estreias) ? raw.estreias : [],
      especiais: Array.isArray(raw.especiais) ? raw.especiais : [],
      listas: Array.isArray(raw.listas) ? raw.listas : [],
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      media: Array.isArray(raw.media) ? raw.media : [],
    };

    return normalized;
  }

  private loadFromStorage(): CMSData {
    try {
      // 1. Tenta carregar a chave da versão atual (V4)
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            return this.normalizeAndFillMissingCollections(parsed);
          }
        } catch (e) {
          console.error('[Lanterna Mágica CMS] Erro ao analisar JSON do V4:', e);
        }
      }
    } catch (e) {
      console.error('Error loading CMS data from localStorage:', e);
    }

    // 2. Não auto-restaura V3/V2/V1 e não re-injeta DEMO se a chave não existir ou estiver vazia
    return JSON.parse(JSON.stringify(EMPTY_CMS_DATA));
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error saving CMS data to localStorage:', e);
    }
  }

  // --- AUDITORIA & RECUPERAÇÃO DE VERSÕES ---

  public auditStorageVersions(): StorageVersionAudit[] {
    const audits: StorageVersionAudit[] = [];
    const scannedKeys = new Set<string>();

    // 1. Chaves conhecidas
    KNOWN_STORAGE_KEYS.forEach((k) => {
      scannedKeys.add(k);
      audits.push(this.auditSingleKey(k, k === STORAGE_KEY));
    });

    // 2. Chaves adicionais encontradas no localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('lanterna_magica_') && !scannedKeys.has(k)) {
          scannedKeys.add(k);
          audits.push(this.auditSingleKey(k, false));
        }
      }
    } catch (e) {
      console.error('Error scanning localStorage keys:', e);
    }

    return audits;
  }

  private auditSingleKey(key: string, isCurrentKey: boolean): StorageVersionAudit {
    const labelMap: Record<string, string> = {
      lanterna_magica_cms_data_v4: 'Versão 4 (Atual com Filmes, Pessoas e Estreias)',
      lanterna_magica_cms_data_v3: 'Versão 3 (Cineastas e Especiais)',
      lanterna_magica_cms_data_v2: 'Versão 2 (Críticas e Ensaios)',
      lanterna_magica_cms_data_v1: 'Versão 1 (Inicial)',
      lanterna_magica_cms_data: 'Versão Legada (Primeira Instalação)',
    };

    let label = labelMap[key] || `Backup / Snapshot (${key.replace('lanterna_magica_', '')})`;
    let exists = false;
    let data: CMSData | undefined;

    const itemCounts = {
      ensaios: 0,
      criticas: 0,
      umaImagem: 0,
      cineastas: 0,
      pessoas: 0,
      filmes: 0,
      estreias: 0,
      especiais: 0,
      listas: 0,
      tags: 0,
      media: 0,
    };

    const sampleTitles = {
      ensaios: [] as string[],
      criticas: [] as string[],
      cineastas: [] as string[],
      pessoas: [] as string[],
      listas: [] as string[],
      especiais: [] as string[],
    };

    let realItemsCount = 0;
    let demoItemsCount = 0;

    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        exists = true;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          data = parsed;
          const ensaios = Array.isArray(parsed.ensaios) ? parsed.ensaios : [];
          const criticas = Array.isArray(parsed.criticas) ? parsed.criticas : [];
          const umaImagem = Array.isArray(parsed.umaImagemList) ? parsed.umaImagemList : [];
          const cineastas = Array.isArray(parsed.cineastas) ? parsed.cineastas : [];
          const pessoas = Array.isArray(parsed.pessoas) ? parsed.pessoas : [];
          const filmes = Array.isArray(parsed.filmes) ? parsed.filmes : [];
          const estreias = Array.isArray(parsed.estreias) ? parsed.estreias : [];
          const especiais = Array.isArray(parsed.especiais) ? parsed.especiais : [];
          const listas = Array.isArray(parsed.listas) ? parsed.listas : [];
          const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
          const media = Array.isArray(parsed.media) ? parsed.media : [];

          itemCounts.ensaios = ensaios.length;
          itemCounts.criticas = criticas.length;
          itemCounts.umaImagem = umaImagem.length;
          itemCounts.cineastas = cineastas.length;
          itemCounts.pessoas = pessoas.length;
          itemCounts.filmes = filmes.length;
          itemCounts.estreias = estreias.length;
          itemCounts.especiais = especiais.length;
          itemCounts.listas = listas.length;
          itemCounts.tags = tags.length;
          itemCounts.media = media.length;

          sampleTitles.ensaios = ensaios.slice(0, 5).map((e: any) => e.title);
          sampleTitles.criticas = criticas.slice(0, 5).map((c: any) => `${c.movieTitle} (${c.year || 's/d'})`);
          sampleTitles.cineastas = cineastas.slice(0, 5).map((c: any) => c.name);
          sampleTitles.pessoas = pessoas.slice(0, 5).map((p: any) => p.name);
          sampleTitles.listas = listas.slice(0, 5).map((l: any) => l.title);
          sampleTitles.especiais = especiais.slice(0, 5).map((e: any) => e.title);

          // Classificar itens reais vs demos
          ensaios.forEach((e: any) => (isUnmodifiedDemo('ensaios', e) ? demoItemsCount++ : realItemsCount++));
          criticas.forEach((c: any) => (isUnmodifiedDemo('criticas', c) ? demoItemsCount++ : realItemsCount++));
          umaImagem.forEach((u: any) => (isUnmodifiedDemo('umaImagemList', u) ? demoItemsCount++ : realItemsCount++));
          cineastas.forEach((c: any) => (isUnmodifiedDemo('cineastas', c) ? demoItemsCount++ : realItemsCount++));
          pessoas.forEach((p: any) => (isUnmodifiedDemo('pessoas', p) ? demoItemsCount++ : realItemsCount++));
          filmes.forEach((f: any) => (isUnmodifiedDemo('filmes', f) ? demoItemsCount++ : realItemsCount++));
          estreias.forEach((r: any) => (isUnmodifiedDemo('estreias', r) ? demoItemsCount++ : realItemsCount++));
          especiais.forEach((e: any) => (isUnmodifiedDemo('especiais', e) ? demoItemsCount++ : realItemsCount++));
          listas.forEach((l: any) => (isUnmodifiedDemo('listas', l) ? demoItemsCount++ : realItemsCount++));
        }
      }
    } catch (e) {
      console.error(`Error auditing key ${key}:`, e);
    }

    return {
      key,
      label,
      isCurrentKey,
      exists,
      itemCounts,
      sampleTitles,
      realItemsCount,
      demoItemsCount,
      rawData: data,
    };
  }

  public createSafetyBackup(reason = 'manual'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `lanterna_magica_backup_${reason}_${timestamp}`;
    try {
      localStorage.setItem(backupKey, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to create safety backup:', e);
    }
    return backupKey;
  }

  public getConsolidatedAllVersionsBackupJSON(): string {
    const consolidated: Record<string, any> = {
      exportDate: new Date().toISOString(),
      currentKey: STORAGE_KEY,
      storageKeys: {},
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('lanterna_magica_')) {
          try {
            consolidated.storageKeys[k] = JSON.parse(localStorage.getItem(k) || '{}');
          } catch (_) {
            consolidated.storageKeys[k] = localStorage.getItem(k);
          }
        }
      }
    } catch (e) {
      console.error('Failed to consolidate localStorage backups:', e);
    }

    return JSON.stringify(consolidated, null, 2);
  }

  public previewRestoreFromVersion(sourceKey: string): {
    success: boolean;
    sourceAudit?: StorageVersionAudit;
    newItemsCount: {
      ensaios: number;
      criticas: number;
      umaImagem: number;
      cineastas: number;
      pessoas: number;
      filmes: number;
      estreias: number;
      especiais: number;
      listas: number;
    };
    conflicts: MigrationConflict[];
  } {
    const audit = this.auditSingleKey(sourceKey, sourceKey === STORAGE_KEY);
    if (!audit.exists || !audit.rawData) {
      return {
        success: false,
        newItemsCount: { ensaios: 0, criticas: 0, umaImagem: 0, cineastas: 0, pessoas: 0, filmes: 0, estreias: 0, especiais: 0, listas: 0 },
        conflicts: [],
      };
    }

    const incoming = audit.rawData;
    const conflicts: MigrationConflict[] = [];
    const newItemsCount = {
      ensaios: 0,
      criticas: 0,
      umaImagem: 0,
      cineastas: 0,
      pessoas: 0,
      filmes: 0,
      estreias: 0,
      especiais: 0,
      listas: 0,
    };

    // Helper to check conflicts
    const checkCollection = (
      type: MigrationConflict['type'],
      currentList: any[],
      incomingList: any[],
      collectionName: string
    ) => {
      (incomingList || []).forEach((inc) => {
        const currentMatch = currentList.find(
          (curr) => curr.id === inc.id || (curr.slug && curr.slug === inc.slug)
        );

        if (!currentMatch) {
          (newItemsCount as any)[type === 'umaImagem' ? 'umaImagem' : type + 's']++;
        } else {
          // If the existing item in v4 is demo and incoming is real, no conflict: incoming replaces demo
          const currIsDemo = isUnmodifiedDemo(collectionName, currentMatch);
          const incIsDemo = isUnmodifiedDemo(collectionName, inc);

          if (!currIsDemo && !incIsDemo) {
            // Both are real content! Check if they are actually different
            const currTitle = currentMatch.title || currentMatch.movieTitle || currentMatch.name || '';
            const incTitle = inc.title || inc.movieTitle || inc.name || '';
            if (currTitle.trim().toLowerCase() !== incTitle.trim().toLowerCase()) {
              conflicts.push({
                id: inc.id,
                type,
                currentTitle: currTitle,
                incomingTitle: incTitle,
                currentSlug: currentMatch.slug || '',
                incomingSlug: inc.slug || '',
                currentItem: currentMatch,
                incomingItem: inc,
                sourceKey,
              });
            }
          }
        }
      });
    };

    checkCollection('ensaio', this.data.ensaios || [], incoming.ensaios || [], 'ensaios');
    checkCollection('critica', this.data.criticas || [], incoming.criticas || [], 'criticas');
    checkCollection('umaImagem', this.data.umaImagemList || [], incoming.umaImagemList || [], 'umaImagemList');
    checkCollection('cineasta', this.data.cineastas || [], incoming.cineastas || [], 'cineastas');
    checkCollection('pessoa', this.data.pessoas || [], incoming.pessoas || [], 'pessoas');
    checkCollection('filme', this.data.filmes || [], incoming.filmes || [], 'filmes');
    checkCollection('especial', this.data.especiais || [], incoming.especiais || [], 'especiais');
    checkCollection('lista', this.data.listas || [], incoming.listas || [], 'listas');

    return {
      success: true,
      sourceAudit: audit,
      newItemsCount,
      conflicts,
    };
  }

  public executeRestoreFromVersion(
    sourceKey: string,
    conflictResolutions: Record<string, 'keep_current' | 'use_incoming' | 'keep_both'> = {}
  ): {
    success: boolean;
    restoredCounts: Record<string, number>;
    autoCreatedFilmes: number;
    autoCreatedPessoas: number;
    backupKey: string;
  } {
    // 1. Cria backup de segurança automático antes de qualquer modificação
    const backupKey = this.createSafetyBackup(`pre_restore_${sourceKey.replace('lanterna_magica_', '')}`);

    const audit = this.auditSingleKey(sourceKey, sourceKey === STORAGE_KEY);
    if (!audit.exists || !audit.rawData) {
      return {
        success: false,
        restoredCounts: {},
        autoCreatedFilmes: 0,
        autoCreatedPessoas: 0,
        backupKey,
      };
    }

    const incoming = audit.rawData;
    let autoCreatedFilmes = 0;
    let autoCreatedPessoas = 0;

    const restoredCounts: Record<string, number> = {
      ensaios: 0,
      criticas: 0,
      umaImagem: 0,
      cineastas: 0,
      pessoas: 0,
      filmes: 0,
      estreias: 0,
      especiais: 0,
      listas: 0,
      tags: 0,
      media: 0,
    };

    // Generic merger respecting conflict resolutions and prioritizing real content over demo
    const mergeCollection = <T extends { id: string; slug?: string }>(
      currentList: T[],
      incomingList: T[],
      collectionName: string,
      typeKey: string
    ): T[] => {
      const result = [...currentList];

      (incomingList || []).forEach((inc) => {
        const existingIdx = result.findIndex(
          (curr) => curr.id === inc.id || (curr.slug && inc.slug && curr.slug === inc.slug)
        );

        if (existingIdx === -1) {
          result.push({ ...inc });
          restoredCounts[typeKey] = (restoredCounts[typeKey] || 0) + 1;
        } else {
          const currentItem = result[existingIdx];
          const currIsDemo = isUnmodifiedDemo(collectionName, currentItem);
          const incIsDemo = isUnmodifiedDemo(collectionName, inc);

          if (currIsDemo && !incIsDemo) {
            // Real content overrides demo
            result[existingIdx] = { ...inc };
            restoredCounts[typeKey] = (restoredCounts[typeKey] || 0) + 1;
          } else if (!currIsDemo && !incIsDemo) {
            // Both are real content: check resolution
            const resolution = conflictResolutions[inc.id] || 'keep_current';
            if (resolution === 'use_incoming') {
              result[existingIdx] = { ...inc };
              restoredCounts[typeKey] = (restoredCounts[typeKey] || 0) + 1;
            } else if (resolution === 'keep_both') {
              result.push({
                ...inc,
                id: `${inc.id}-imported-${Date.now().toString().slice(-4)}`,
                slug: inc.slug ? `${inc.slug}-restaurado` : undefined,
              });
              restoredCounts[typeKey] = (restoredCounts[typeKey] || 0) + 1;
            }
          }
        }
      });

      return result;
    };

    this.data.ensaios = mergeCollection(this.data.ensaios || [], incoming.ensaios || [], 'ensaios', 'ensaios');
    this.data.criticas = mergeCollection(this.data.criticas || [], incoming.criticas || [], 'criticas', 'criticas');
    this.data.umaImagemList = mergeCollection(this.data.umaImagemList || [], incoming.umaImagemList || [], 'umaImagemList', 'umaImagem');
    this.data.cineastas = mergeCollection(this.data.cineastas || [], incoming.cineastas || [], 'cineastas', 'cineastas');
    this.data.pessoas = mergeCollection(this.data.pessoas || [], incoming.pessoas || [], 'pessoas', 'pessoas');
    this.data.filmes = mergeCollection(this.data.filmes || [], incoming.filmes || [], 'filmes', 'filmes');
    this.data.estreias = mergeCollection(this.data.estreias || [], incoming.estreias || [], 'estreias', 'estreias');
    this.data.especiais = mergeCollection(this.data.especiais || [], incoming.especiais || [], 'especiais', 'especiais');
    this.data.listas = mergeCollection(this.data.listas || [], incoming.listas || [], 'listas', 'listas');

    // Tags & Media merger
    (incoming.tags || []).forEach((t) => {
      if (!this.data.tags.some((curr) => curr.slug === t.slug)) {
        this.data.tags.push({ ...t });
        restoredCounts.tags = (restoredCounts.tags || 0) + 1;
      }
    });

    (incoming.media || []).forEach((m) => {
      if (!this.data.media.some((curr) => curr.url === m.url || curr.id === m.id)) {
        this.data.media.push({ ...m });
        restoredCounts.media = (restoredCounts.media || 0) + 1;
      }
    });

    // Sincronização Inteligente: Gera Filmes para Críticas que não possuem ficha técnica
    this.data.criticas.forEach((critica) => {
      const normTitle = critica.movieTitle.trim().toLowerCase();
      const exists = this.data.filmes.some(
        (f) =>
          f.slug === critica.slug ||
          (f.title.trim().toLowerCase() === normTitle && (!critica.year || f.year === critica.year))
      );

      if (!exists) {
        this.data.filmes.push({
          id: `film-migrated-${critica.slug}`,
          title: critica.movieTitle,
          originalTitle: (critica as any).originalTitle || critica.movieTitle,
          slug: critica.slug,
          year: critica.year || new Date().getFullYear(),
          director: critica.director || 'Não informado',
          country: critica.country || 'Internacional',
          synopsis: (critica as any).excerpt || (critica.content ? critica.content.slice(0, 300) : ''),
          posterImage: critica.coverImage,
          genres: critica.genres || (critica.genre ? [critica.genre] : []),
          durationMinutes: critica.durationMinutes || 90,
          tags: critica.tags || [],
          status: critica.status,
          credits: [],
          createdAt: critica.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        autoCreatedFilmes++;
      }
    });

    // Sincronização Inteligente: Converte Cineastas antigos em Pessoas
    this.data.cineastas.forEach((cin) => {
      const exists = this.data.pessoas.some(
        (p) => p.slug === cin.slug || p.name.trim().toLowerCase() === cin.name.trim().toLowerCase()
      );

      if (!exists) {
        this.data.pessoas.push({
          id: cin.id.replace('cin-', 'pes-'),
          name: cin.name,
          slug: cin.slug,
          photo: cin.photo,
          country: cin.country,
          birthDate: cin.birthYear ? String(cin.birthYear) : undefined,
          deathDate: cin.deathYear ? String(cin.deathYear) : undefined,
          bio: cin.bio,
          primaryRoles: ['Diretor'],
          tags: cin.tags || [],
          status: 'published',
          highlightHome: cin.highlightHome || false,
          createdAt: cin.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        autoCreatedPessoas++;
      }
    });

    this.saveToStorage();

    return {
      success: true,
      restoredCounts,
      autoCreatedFilmes,
      autoCreatedPessoas,
      backupKey,
    };
  }

  // Identifica quais itens atuais na v4 são puramente DEMO não-modificados
  public detectDemoItemsInCurrentData(): {
    ensaios: Ensaio[];
    criticas: Critica[];
    umaImagem: UmaImagemUmaIdeia[];
    cineastas: Cineasta[];
    pessoas: Pessoa[];
    filmes: Filme[];
    estreias: Estreia[];
    especiais: Especial[];
    listas: Lista[];
    media: MediaItem[];
    totalDemoCount: number;
  } {
    const ensaios = (this.data.ensaios || []).filter((e) => isUnmodifiedDemo('ensaios', e));
    const criticas = (this.data.criticas || []).filter((c) => isUnmodifiedDemo('criticas', c));
    const umaImagem = (this.data.umaImagemList || []).filter((u) => isUnmodifiedDemo('umaImagemList', u));
    const cineastas = (this.data.cineastas || []).filter((c) => isUnmodifiedDemo('cineastas', c));
    const pessoas = (this.data.pessoas || []).filter((p) => isUnmodifiedDemo('pessoas', p));
    const filmes = (this.data.filmes || []).filter((f) => isUnmodifiedDemo('filmes', f));
    const estreias = (this.data.estreias || []).filter((r) => isUnmodifiedDemo('estreias', r));
    const especiais = (this.data.especiais || []).filter((e) => isUnmodifiedDemo('especiais', e));
    const listas = (this.data.listas || []).filter((l) => isUnmodifiedDemo('listas', l));
    const media = (this.data.media || []).filter((m) => isUnmodifiedDemo('media', m));

    const totalDemoCount =
      ensaios.length +
      criticas.length +
      umaImagem.length +
      cineastas.length +
      pessoas.length +
      filmes.length +
      estreias.length +
      especiais.length +
      listas.length +
      media.length;

    return {
      ensaios,
      criticas,
      umaImagem,
      cineastas,
      pessoas,
      filmes,
      estreias,
      especiais,
      listas,
      media,
      totalDemoCount,
    };
  }

  // Remove SOMENTE itens demonstrativos NÃO modificados pelo usuário
  public removeUnmodifiedDemoContent(): {
    success: boolean;
    removedCounts: Record<string, number>;
    backupKey: string;
  } {
    const backupKey = this.createSafetyBackup('pre_remove_demos');
    const demoInfo = this.detectDemoItemsInCurrentData();

    const removedCounts: Record<string, number> = {
      ensaios: demoInfo.ensaios.length,
      criticas: demoInfo.criticas.length,
      umaImagem: demoInfo.umaImagem.length,
      cineastas: demoInfo.cineastas.length,
      pessoas: demoInfo.pessoas.length,
      filmes: demoInfo.filmes.length,
      estreias: demoInfo.estreias.length,
      especiais: demoInfo.especiais.length,
      listas: demoInfo.listas.length,
      media: demoInfo.media.length,
    };

    const isNotDemo = (coll: string) => (item: any) => !isUnmodifiedDemo(coll, item);

    this.data.ensaios = (this.data.ensaios || []).filter(isNotDemo('ensaios'));
    this.data.criticas = (this.data.criticas || []).filter(isNotDemo('criticas'));
    this.data.umaImagemList = (this.data.umaImagemList || []).filter(isNotDemo('umaImagemList'));
    this.data.cineastas = (this.data.cineastas || []).filter(isNotDemo('cineastas'));
    this.data.pessoas = (this.data.pessoas || []).filter(isNotDemo('pessoas'));
    this.data.filmes = (this.data.filmes || []).filter(isNotDemo('filmes'));
    this.data.estreias = (this.data.estreias || []).filter(isNotDemo('estreias'));
    this.data.especiais = (this.data.especiais || []).filter(isNotDemo('especiais'));
    this.data.listas = (this.data.listas || []).filter(isNotDemo('listas'));
    this.data.media = (this.data.media || []).filter(isNotDemo('media'));

    this.saveToStorage();

    return {
      success: true,
      removedCounts,
      backupKey,
    };
  }

  // Ensures backward compatibility: every Cineasta has a matching Pessoa and vice versa
  private ensurePessoasAndCineastasSync(): void {
    if (!this.data.pessoas) this.data.pessoas = [];
    if (!this.data.cineastas) this.data.cineastas = [];

    // Sync from cineastas to pessoas
    this.data.cineastas.forEach((cin) => {
      const exists = this.data.pessoas.find((p) => p.slug === cin.slug || p.name.toLowerCase() === cin.name.toLowerCase());
      if (!exists) {
        this.data.pessoas.push({
          id: cin.id.replace('cin-', 'pes-'),
          name: cin.name,
          slug: cin.slug,
          photo: cin.photo,
          country: cin.country,
          birthDate: cin.birthYear ? String(cin.birthYear) : undefined,
          deathDate: cin.deathYear ? String(cin.deathYear) : undefined,
          bio: cin.bio,
          primaryRoles: ['Diretor'],
          tags: cin.tags,
          status: 'published',
          highlightHome: cin.highlightHome,
          createdAt: cin.createdAt,
          updatedAt: cin.updatedAt,
        });
      }
    });

    // Ensure filmes have credits initialized if missing
    if (this.data.filmes) {
      this.data.filmes.forEach((f) => {
        if (!f.credits) f.credits = [];
      });
    }
  }

  // Auto-publishes scheduled content if date <= current time
  public evaluateScheduledItems(): void {
    const now = new Date();
    let changed = false;

    const check = (item: { status?: ContentStatus; date?: string; releaseDate?: string; updatedAt?: string }) => {
      if (item.status === 'scheduled') {
        const itemDate = item.date || item.releaseDate;
        if (itemDate) {
          const d = new Date(itemDate);
          if (d <= now) {
            item.status = 'published';
            item.updatedAt = new Date().toISOString();
            changed = true;
          }
        }
      }
    };

    (this.data.ensaios || []).forEach(check);
    (this.data.criticas || []).forEach(check);
    (this.data.umaImagemList || []).forEach(check);
    (this.data.especiais || []).forEach(check);
    (this.data.listas || []).forEach(check);
    (this.data.estreias || []).forEach(check);

    if (changed) {
      this.saveToStorage();
    }
  }

  // --- ADMIN & SEEDING ---
  public seedDemoData(): void {
    this.data = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
    this.saveToStorage();
  }

  public clearAllData(): void {
    this.data = {
      ensaios: [],
      criticas: [],
      umaImagemList: [],
      cineastas: [],
      pessoas: [],
      filmes: [],
      estreias: [],
      especiais: [],
      listas: [],
      tags: [],
      media: [],
    };
    this.saveToStorage();
  }

  public getRawData(): CMSData {
    return this.data;
  }

  public importBackup(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed === 'object') {
        this.data = {
          ensaios: Array.isArray(parsed.ensaios) ? parsed.ensaios : [],
          criticas: Array.isArray(parsed.criticas) ? parsed.criticas : [],
          umaImagemList: Array.isArray(parsed.umaImagemList) ? parsed.umaImagemList : [],
          cineastas: Array.isArray(parsed.cineastas) ? parsed.cineastas : [],
          pessoas: Array.isArray(parsed.pessoas) ? parsed.pessoas : [],
          filmes: Array.isArray(parsed.filmes) ? parsed.filmes : [],
          estreias: Array.isArray(parsed.estreias) ? parsed.estreias : [],
          especiais: Array.isArray(parsed.especiais) ? parsed.especiais : [],
          listas: Array.isArray(parsed.listas) ? parsed.listas : [],
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          media: Array.isArray(parsed.media) ? parsed.media : [],
        };
        this.ensurePessoasAndCineastasSync();
        this.saveToStorage();
        return true;
      }
    } catch (e) {
      console.error('Failed to import CMS data JSON:', e);
    }
    return false;
  }

  public checkDuplicateSlug(slug: string, collection: keyof CMSData, ignoreId?: string): boolean {
    const list = this.data[collection];
    if (Array.isArray(list)) {
      return list.some((item: any) => item.slug === slug && item.id !== ignoreId);
    }
    return false;
  }

  // --- PESSOAS ---
  public getPessoas(publishedOnly = true): Pessoa[] {
    this.evaluateScheduledItems();
    if (!this.data.pessoas) this.data.pessoas = [];
    return this.data.pessoas
      .filter((p) => !publishedOnly || p.status !== 'draft')
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public getPessoaBySlug(slug: string): Pessoa | undefined {
    this.evaluateScheduledItems();
    return (this.data.pessoas || []).find((p) => p.slug === slug);
  }

  public getPessoaById(id: string): Pessoa | undefined {
    return (this.data.pessoas || []).find((p) => p.id === id);
  }

  public findPessoaByName(name: string): Pessoa | undefined {
    const norm = name.trim().toLowerCase();
    return (this.data.pessoas || []).find((p) => p.name.trim().toLowerCase() === norm);
  }

  public savePessoa(pessoa: Pessoa): void {
    if (!this.data.pessoas) this.data.pessoas = [];
    const idx = this.data.pessoas.findIndex((p) => p.id === pessoa.id);
    if (idx >= 0) {
      this.data.pessoas[idx] = { ...pessoa, updatedAt: new Date().toISOString() };
    } else {
      this.data.pessoas.push({
        ...pessoa,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Sync to Cineastas if marked as Director or has editorial profile
    const isDirector = pessoa.primaryRoles?.some((r) => r.toLowerCase().includes('diret') || r.toLowerCase().includes('cineasta'));
    if (isDirector || pessoa.editorialProfile) {
      const cinIdx = (this.data.cineastas || []).findIndex((c) => c.slug === pessoa.slug || c.id === pessoa.id);
      const cinPayload: Cineasta = {
        id: pessoa.id.startsWith('cin-') ? pessoa.id : `cin-${pessoa.id}`,
        name: pessoa.name,
        slug: pessoa.slug,
        photo: pessoa.photo || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
        bio: pessoa.bio || '',
        birthYear: pessoa.birthDate ? parseInt(pessoa.birthDate.slice(0, 4), 10) : undefined,
        deathYear: pessoa.deathDate ? parseInt(pessoa.deathDate.slice(0, 4), 10) : undefined,
        country: pessoa.country || '',
        tags: pessoa.tags || [],
        highlightHome: pessoa.highlightHome,
        createdAt: pessoa.createdAt,
        updatedAt: new Date().toISOString(),
      };
      if (cinIdx >= 0) {
        this.data.cineastas[cinIdx] = cinPayload;
      } else {
        this.data.cineastas.push(cinPayload);
      }
    }

    if (pessoa.tags) this.syncTags(pessoa.tags);
    this.saveToStorage();
  }

  public deletePessoa(id: string): void {
    const person = this.data.pessoas.find((p) => p.id === id);
    this.data.pessoas = (this.data.pessoas || []).filter((p) => p.id !== id);
    if (person) {
      this.data.cineastas = (this.data.cineastas || []).filter((c) => c.slug !== person.slug && c.id !== id);
    }
    this.saveToStorage();
  }

  public checkPessoaDependencies(personId: string, personName: string): string[] {
    const deps: string[] = [];
    const norm = personName.toLowerCase().trim();

    // Check in Filmes credits
    (this.data.filmes || []).forEach((f) => {
      const hasCredit = f.credits?.some((c) => c.personId === personId || c.personName.toLowerCase().trim() === norm);
      const isDirector = f.director.toLowerCase().trim().includes(norm);
      if (hasCredit || isDirector) {
        deps.push(`Filme: ${f.title} (${f.year})`);
      }
    });

    // Check in Críticas
    (this.data.criticas || []).forEach((c) => {
      if (c.director.toLowerCase().trim().includes(norm) || c.screenplay?.toLowerCase().includes(norm) || c.cinematography?.toLowerCase().includes(norm)) {
        deps.push(`Crítica: ${c.movieTitle} (Dir: ${c.director})`);
      }
    });

    // Check in Ensaios
    (this.data.ensaios || []).forEach((e) => {
      if (e.title.toLowerCase().includes(norm) || e.subtitle.toLowerCase().includes(norm) || e.content.toLowerCase().includes(norm)) {
        deps.push(`Ensaio: ${e.title}`);
      }
    });

    return deps;
  }

  // --- FILMES ---
  public getFilmes(): Filme[] {
    return (this.data.filmes || []).sort((a, b) => a.title.localeCompare(b.title));
  }

  public getFilmeBySlug(slug: string): Filme | undefined {
    return (this.data.filmes || []).find((f) => f.slug === slug);
  }

  public getFilmeById(id: string): Filme | undefined {
    return (this.data.filmes || []).find((f) => f.id === id);
  }

  public findFilmeByTitleAndYear(title: string, year?: number): Filme | undefined {
    const norm = title.trim().toLowerCase();
    return (this.data.filmes || []).find((f) => {
      const matchTitle = f.title.trim().toLowerCase() === norm || (f.originalTitle && f.originalTitle.trim().toLowerCase() === norm);
      if (year) {
        return matchTitle && f.year === year;
      }
      return matchTitle;
    });
  }

  public saveFilme(filme: Filme): void {
    if (!this.data.filmes) this.data.filmes = [];
    const idx = this.data.filmes.findIndex((f) => f.id === filme.id);
    if (idx >= 0) {
      this.data.filmes[idx] = { ...filme, updatedAt: new Date().toISOString() };
    } else {
      this.data.filmes.push({
        ...filme,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Auto update any Estreia referencing this film
    (this.data.estreias || []).forEach((est) => {
      if (est.filmId === filme.id) {
        est.filmTitle = filme.title;
        est.filmSlug = filme.slug;
        est.filmOriginalTitle = filme.originalTitle;
        est.filmDirector = filme.director;
        est.filmYear = filme.year;
        est.filmCountry = filme.country;
        est.filmGenres = filme.genres;
        est.filmDurationMinutes = filme.durationMinutes;
        est.filmPoster = filme.posterImage;
      }
    });

    if (filme.tags) this.syncTags(filme.tags);
    this.saveToStorage();
  }

  public deleteFilme(id: string): void {
    this.data.filmes = (this.data.filmes || []).filter((f) => f.id !== id);
    // Also remove from releases
    this.data.estreias = (this.data.estreias || []).filter((est) => est.filmId !== id);
    this.saveToStorage();
  }

  public checkFilmeDependencies(filmId: string, filmTitle: string): string[] {
    const deps: string[] = [];
    const norm = filmTitle.toLowerCase().trim();

    // Check Críticas
    (this.data.criticas || []).forEach((c) => {
      if (c.movieTitle.toLowerCase().trim() === norm || c.slug === slugify(filmTitle)) {
        deps.push(`Crítica: ${c.movieTitle} — ${c.editorialTitle}`);
      }
    });

    // Check Estreias
    (this.data.estreias || []).forEach((est) => {
      if (est.filmId === filmId || est.filmTitle.toLowerCase().trim() === norm) {
        deps.push(`Estreia: ${est.filmTitle} (${est.releaseDate})`);
      }
    });

    // Check Uma Imagem
    (this.data.umaImagemList || []).forEach((u) => {
      if (u.relatedMovie && u.relatedMovie.toLowerCase().trim() === norm) {
        deps.push(`Uma Imagem: ${u.title}`);
      }
    });

    // Check Listas
    (this.data.listas || []).forEach((l) => {
      if (l.items?.some((i) => i.title.toLowerCase().trim() === norm)) {
        deps.push(`Lista: ${l.title}`);
      }
    });

    return deps;
  }

  // --- ESTREIAS (Releases) ---
  public getEstreias(publishedOnly = true): Estreia[] {
    this.evaluateScheduledItems();
    return (this.data.estreias || [])
      .filter((est) => !publishedOnly || est.status !== 'draft')
      .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }

  public getEstreiaById(id: string): Estreia | undefined {
    return (this.data.estreias || []).find((est) => est.id === id);
  }

  public getEstreiaByFilmSlug(filmSlug: string): Estreia | undefined {
    return (this.data.estreias || []).find((est) => est.filmSlug === filmSlug);
  }

  public saveEstreia(estreia: Estreia): void {
    if (!this.data.estreias) this.data.estreias = [];
    const idx = this.data.estreias.findIndex((est) => est.id === estreia.id);
    if (idx >= 0) {
      this.data.estreias[idx] = { ...estreia, updatedAt: new Date().toISOString() };
    } else {
      this.data.estreias.push({
        ...estreia,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    this.saveToStorage();
  }

  public deleteEstreia(id: string): void {
    this.data.estreias = (this.data.estreias || []).filter((est) => est.id !== id);
    this.saveToStorage();
  }

  // Calculate Thursday start of the release week for any given date
  public getReleaseWeekRange(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    // Day of week: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
    const day = d.getDay();
    // Distance to current/previous Thursday
    const diffToThursday = (day >= 4 ? day - 4 : day + 3);
    const thursday = new Date(d);
    thursday.setDate(d.getDate() - diffToThursday);

    const wednesday = new Date(thursday);
    wednesday.setDate(thursday.getDate() + 6);

    const formatYMD = (date: Date) => date.toISOString().slice(0, 10);
    return {
      thursdayDate: formatYMD(thursday),
      wednesdayDate: formatYMD(wednesday),
      thursdayFormatted: thursday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
      rangeFormatted: `${thursday.getDate()}–${wednesday.getDate()} DE ${thursday.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()} DE ${thursday.getFullYear()}`,
      year: thursday.getFullYear(),
      month: String(thursday.getMonth() + 1).padStart(2, '0'),
      day: String(thursday.getDate()).padStart(2, '0'),
    };
  }

  // Get releases for the current release week (August 13-19, 2026 or reference date)
  public getCurrentWeekEstreias(referenceDate = '2026-08-13'): {
    weekRange: ReturnType<CMSStore['getReleaseWeekRange']>;
    items: Estreia[];
  } {
    const weekRange = this.getReleaseWeekRange(referenceDate);
    const all = this.getEstreias(true);

    const items = all.filter((est) => {
      const estRange = this.getReleaseWeekRange(est.releaseDate);
      return estRange.thursdayDate === weekRange.thursdayDate;
    });

    return { weekRange, items };
  }

  // Group historical releases by Thursday weeks (excluding current week if desired)
  public getHistoricalWeeksEstreias(referenceDate = '2026-08-13') {
    const currentWeek = this.getReleaseWeekRange(referenceDate);
    const all = this.getEstreias(true);

    const groups: {
      thursdayDate: string;
      rangeFormatted: string;
      weekRange: ReturnType<CMSStore['getReleaseWeekRange']>;
      items: Estreia[];
      isCurrentWeek: boolean;
    }[] = [];

    const map = new Map<string, Estreia[]>();

    all.forEach((est) => {
      const r = this.getReleaseWeekRange(est.releaseDate);
      const key = r.thursdayDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(est);
    });

    // Sort Thursday keys descending
    const sortedKeys = Array.from(map.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    sortedKeys.forEach((key) => {
      const items = map.get(key) || [];
      const r = this.getReleaseWeekRange(key);
      groups.push({
        thursdayDate: key,
        rangeFormatted: r.rangeFormatted,
        weekRange: r,
        items,
        isCurrentWeek: key === currentWeek.thursdayDate,
      });
    });

    return groups;
  }

  // --- ENSAIOS ---
  public getEnsaios(publishedOnly = true): Ensaio[] {
    this.evaluateScheduledItems();
    return (this.data.ensaios || [])
      .filter((e) => !publishedOnly || e.status === 'published')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getEnsaioBySlug(slug: string): Ensaio | undefined {
    this.evaluateScheduledItems();
    return (this.data.ensaios || []).find((e) => e.slug === slug);
  }

  public saveEnsaio(ensaio: Ensaio): void {
    if (!this.data.ensaios) this.data.ensaios = [];
    const idx = this.data.ensaios.findIndex((e) => e.id === ensaio.id);
    if (idx >= 0) {
      this.data.ensaios[idx] = { ...ensaio, updatedAt: new Date().toISOString() };
    } else {
      this.data.ensaios.push({
        ...ensaio,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    this.syncTags(ensaio.tags);
    this.saveToStorage();
  }

  public deleteEnsaio(id: string): void {
    this.data.ensaios = (this.data.ensaios || []).filter((e) => e.id !== id);
    this.saveToStorage();
  }

  // --- CRÍTICAS ---
  public getCriticas(publishedOnly = true): Critica[] {
    this.evaluateScheduledItems();
    return (this.data.criticas || [])
      .filter((c) => !publishedOnly || c.status === 'published')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getCriticaBySlug(slug: string): Critica | undefined {
    this.evaluateScheduledItems();
    return (this.data.criticas || []).find((c) => c.slug === slug);
  }

  public saveCritica(critica: Critica): void {
    if (!this.data.criticas) this.data.criticas = [];
    const idx = this.data.criticas.findIndex((c) => c.id === critica.id);
    if (idx >= 0) {
      this.data.criticas[idx] = { ...critica, updatedAt: new Date().toISOString() };
    } else {
      this.data.criticas.push({
        ...critica,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Also ensure the corresponding Film exists or updates
    const existingFilm = this.findFilmeByTitleAndYear(critica.movieTitle, critica.year);
    if (existingFilm) {
      if (critica.genres && critica.genres.length > 0) {
        existingFilm.genres = Array.from(new Set([...(existingFilm.genres || []), ...critica.genres]));
      }
      this.saveFilme(existingFilm);
    }

    this.syncTags(critica.tags);
    this.saveToStorage();
  }

  public deleteCritica(id: string): void {
    this.data.criticas = (this.data.criticas || []).filter((c) => c.id !== id);
    this.saveToStorage();
  }

  // --- UMA IMAGEM, UMA IDEIA ---
  public getUmaImagemList(publishedOnly = true): UmaImagemUmaIdeia[] {
    this.evaluateScheduledItems();
    return (this.data.umaImagemList || [])
      .filter((u) => !publishedOnly || u.status === 'published')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public saveUmaImagem(item: UmaImagemUmaIdeia): void {
    if (!this.data.umaImagemList) this.data.umaImagemList = [];
    const idx = this.data.umaImagemList.findIndex((u) => u.id === item.id);
    if (idx >= 0) {
      this.data.umaImagemList[idx] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      this.data.umaImagemList.push({
        ...item,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    this.syncTags(item.tags);
    this.saveToStorage();
  }

  public deleteUmaImagem(id: string): void {
    this.data.umaImagemList = (this.data.umaImagemList || []).filter((u) => u.id !== id);
    this.saveToStorage();
  }

  // --- CINEASTAS (Legacy adapter) ---
  public getCineastas(): Cineasta[] {
    return (this.data.cineastas || []).sort((a, b) => a.name.localeCompare(b.name));
  }

  public getCineastaBySlug(slug: string): Cineasta | undefined {
    return (this.data.cineastas || []).find((c) => c.slug === slug);
  }

  public saveCineasta(cineasta: Cineasta): void {
    if (!this.data.cineastas) this.data.cineastas = [];
    const idx = this.data.cineastas.findIndex((c) => c.id === cineasta.id);
    if (idx >= 0) {
      this.data.cineastas[idx] = { ...cineasta, updatedAt: new Date().toISOString() };
    } else {
      this.data.cineastas.push({
        ...cineasta,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Sync to Pessoa
    const pIdx = (this.data.pessoas || []).findIndex((p) => p.slug === cineasta.slug);
    if (pIdx >= 0) {
      this.data.pessoas[pIdx] = {
        ...this.data.pessoas[pIdx],
        name: cineasta.name,
        photo: cineasta.photo,
        bio: cineasta.bio,
        country: cineasta.country,
        birthDate: cineasta.birthYear ? String(cineasta.birthYear) : undefined,
        deathDate: cineasta.deathYear ? String(cineasta.deathYear) : undefined,
        highlightHome: cineasta.highlightHome,
        updatedAt: new Date().toISOString(),
      };
    } else {
      if (!this.data.pessoas) this.data.pessoas = [];
      this.data.pessoas.push({
        id: `pes-${cineasta.id}`,
        name: cineasta.name,
        slug: cineasta.slug,
        photo: cineasta.photo,
        bio: cineasta.bio,
        country: cineasta.country,
        birthDate: cineasta.birthYear ? String(cineasta.birthYear) : undefined,
        deathDate: cineasta.deathYear ? String(cineasta.deathYear) : undefined,
        primaryRoles: ['Diretor'],
        status: 'published',
        highlightHome: cineasta.highlightHome,
        createdAt: cineasta.createdAt,
        updatedAt: new Date().toISOString(),
      });
    }

    this.syncTags(cineasta.tags);
    this.saveToStorage();
  }

  public deleteCineasta(id: string): void {
    this.data.cineastas = (this.data.cineastas || []).filter((c) => c.id !== id);
    this.saveToStorage();
  }

  // --- ESPECIAIS ---
  public getEspeciais(publishedOnly = true): Especial[] {
    this.evaluateScheduledItems();
    return (this.data.especiais || [])
      .filter((e) => !publishedOnly || e.status === 'published')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getEspecialBySlug(slug: string): Especial | undefined {
    this.evaluateScheduledItems();
    return (this.data.especiais || []).find((e) => e.slug === slug);
  }

  public saveEspecial(especial: Especial): void {
    if (!this.data.especiais) this.data.especiais = [];
    const idx = this.data.especiais.findIndex((e) => e.id === especial.id);
    if (idx >= 0) {
      this.data.especiais[idx] = { ...especial, updatedAt: new Date().toISOString() };
    } else {
      this.data.especiais.push({
        ...especial,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    this.saveToStorage();
  }

  public deleteEspecial(id: string): void {
    this.data.especiais = (this.data.especiais || []).filter((e) => e.id !== id);
    this.saveToStorage();
  }

  // --- LISTAS ---
  public getListas(publishedOnly = true): Lista[] {
    this.evaluateScheduledItems();
    return (this.data.listas || [])
      .filter((l) => !publishedOnly || l.status === 'published')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getListaBySlug(slug: string): Lista | undefined {
    this.evaluateScheduledItems();
    return (this.data.listas || []).find((l) => l.slug === slug);
  }

  public saveLista(lista: Lista): void {
    if (!this.data.listas) this.data.listas = [];
    const idx = this.data.listas.findIndex((l) => l.id === lista.id);
    if (idx >= 0) {
      this.data.listas[idx] = { ...lista, updatedAt: new Date().toISOString() };
    } else {
      this.data.listas.push({
        ...lista,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    this.syncTags(lista.tags);
    this.saveToStorage();
  }

  public deleteLista(id: string): void {
    this.data.listas = (this.data.listas || []).filter((l) => l.id !== id);
    this.saveToStorage();
  }

  // --- TAGS ---
  public getTags(): TagItem[] {
    return (this.data.tags || []).sort((a, b) => a.name.localeCompare(b.name));
  }

  public saveTag(tagName: string): TagItem {
    const normalized = tagName.trim();
    const slug = slugify(normalized);

    const existing = (this.data.tags || []).find((t) => t.slug === slug);
    if (existing) return existing;

    const newTag: TagItem = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: normalized,
      slug,
      createdAt: new Date().toISOString(),
    };
    if (!this.data.tags) this.data.tags = [];
    this.data.tags.push(newTag);
    this.saveToStorage();
    return newTag;
  }

  public deleteTag(id: string): void {
    if (this.data.tags) {
      this.data.tags = this.data.tags.filter((t) => t.id !== id);
      this.saveToStorage();
    }
  }

  private syncTags(tagList: string[]): void {
    if (!tagList) return;
    tagList.forEach((t) => this.saveTag(t));
  }

  // --- MEDIA LIBRARY ---
  public getMedia(): MediaItem[] {
    return (this.data.media || []).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public saveMedia(media: MediaItem): void {
    if (!this.data.media) this.data.media = [];
    const idx = this.data.media.findIndex((m) => m.id === media.id);
    if (idx >= 0) {
      this.data.media[idx] = media;
    } else {
      this.data.media.push(media);
    }
    this.saveToStorage();
  }

  public deleteMedia(id: string): void {
    if (this.data.media) {
      this.data.media = this.data.media.filter((m) => m.id !== id);
      this.saveToStorage();
    }
  }

  // --- HOME HIGHLIGHTS (Up to 4 items) ---
  public getHomeHighlights(): HighlightItem[] {
    const highlights: HighlightItem[] = [];

    this.getEnsaios(true)
      .filter((e) => e.highlightHome)
      .forEach((e) => highlights.push({ ...e, itemType: 'ensaio' }));

    this.getCriticas(true)
      .filter((c) => c.highlightHome)
      .forEach((c) => highlights.push({ ...c, itemType: 'critica' }));

    this.getEspeciais(true)
      .filter((es) => es.highlightHome)
      .forEach((es) => highlights.push({ ...es, itemType: 'especial' }));

    this.getCineastas()
      .filter((cin) => cin.highlightHome)
      .forEach((cin) => highlights.push({ ...cin, itemType: 'cineasta' }));

    this.getUmaImagemList(true)
      .filter((u) => u.highlightHome)
      .forEach((u) => highlights.push({ ...u, itemType: 'uma_imagem' }));

    return highlights.slice(0, 4);
  }

  // --- RELATIONSHIP QUERIES FOR FILM HUB ---
  public getFilmRelatedContent(filmTitleOrSlug: string) {
    const norm = filmTitleOrSlug.toLowerCase().trim();
    const film = this.getFilmeBySlug(filmTitleOrSlug) || this.findFilmeByTitleAndYear(filmTitleOrSlug);
    const titleNorm = film ? film.title.toLowerCase().trim() : norm;

    const relatedCriticas = this.getCriticas(true).filter(
      (c) =>
        c.movieTitle.toLowerCase().trim() === titleNorm ||
        c.movieTitle.toLowerCase().includes(titleNorm) ||
        (film && c.slug === `${film.slug}-critica`)
    );

    const relatedEnsaios = this.getEnsaios(true).filter(
      (e) =>
        e.title.toLowerCase().includes(titleNorm) ||
        e.subtitle.toLowerCase().includes(titleNorm) ||
        e.content.toLowerCase().includes(titleNorm)
    );

    const relatedUmaImagem = this.getUmaImagemList(true).filter(
      (u) => u.relatedMovie && u.relatedMovie.toLowerCase().trim() === titleNorm
    );

    const relatedListas = this.getListas(true).filter(
      (l) => l.items?.some((i) => i.title.toLowerCase().trim() === titleNorm)
    );

    const relatedEspeciais = this.getEspeciais(true).filter(
      (es) =>
        (film && es.relatedItemIds?.includes(film.id)) ||
        es.title.toLowerCase().includes(titleNorm) ||
        es.subtitle.toLowerCase().includes(titleNorm)
    );

    const estreia = (this.data.estreias || []).find(
      (est) => (film && est.filmId === film.id) || est.filmTitle.toLowerCase().trim() === titleNorm
    );

    return {
      criticas: relatedCriticas,
      ensaios: relatedEnsaios,
      umaImagem: relatedUmaImagem,
      listas: relatedListas,
      especiais: relatedEspeciais,
      estreia,
      film,
    };
  }

  // --- RELATIONSHIP QUERIES FOR PERSON / FILMMAKER ---
  public getPersonRelatedContent(personNameOrSlug: string) {
    const norm = personNameOrSlug.toLowerCase().trim();
    const person = this.getPessoaBySlug(personNameOrSlug) || this.findPessoaByName(personNameOrSlug);
    const nameNorm = person ? person.name.toLowerCase().trim() : norm;

    // Filmes where this person is credited or is director
    const relatedFilmes = this.getFilmes().filter((f) => {
      const hasCredit = f.credits?.some(
        (c) => (person && c.personId === person.id) || c.personName.toLowerCase().trim() === nameNorm
      );
      const isDir = f.director.toLowerCase().trim().includes(nameNorm);
      return hasCredit || isDir;
    });

    const relatedEnsaios = this.getEnsaios(true).filter(
      (e) =>
        e.title.toLowerCase().includes(nameNorm) ||
        e.subtitle.toLowerCase().includes(nameNorm) ||
        e.tags.some((t) => t.toLowerCase().includes(nameNorm))
    );

    const relatedCriticas = this.getCriticas(true).filter(
      (c) =>
        c.director.toLowerCase().includes(nameNorm) ||
        c.tags.some((t) => t.toLowerCase().includes(nameNorm)) ||
        (c.screenplay && c.screenplay.toLowerCase().includes(nameNorm)) ||
        (c.cinematography && c.cinematography.toLowerCase().includes(nameNorm))
    );

    const relatedListas = this.getListas(true).filter(
      (l) =>
        (l.relatedFilmmaker && l.relatedFilmmaker.toLowerCase().includes(nameNorm)) ||
        l.tags.some((t) => t.toLowerCase().includes(nameNorm)) ||
        l.items?.some((i) => i.director?.toLowerCase().includes(nameNorm))
    );

    const relatedEspeciais = this.getEspeciais(true).filter(
      (es) =>
        es.title.toLowerCase().includes(nameNorm) ||
        es.subtitle.toLowerCase().includes(nameNorm) ||
        (person && es.relatedItemIds?.includes(person.id))
    );

    const relatedUmaImagem = this.getUmaImagemList(true).filter(
      (u) => u.relatedFilmmaker && u.relatedFilmmaker.toLowerCase().includes(nameNorm)
    );

    return {
      person,
      filmes: relatedFilmes,
      ensaios: relatedEnsaios,
      criticas: relatedCriticas,
      listas: relatedListas,
      especiais: relatedEspeciais,
      umaImagem: relatedUmaImagem,
    };
  }

  // Alias for backward compatibility
  public getFilmmakerRelatedContent(filmmakerName: string) {
    return this.getPersonRelatedContent(filmmakerName);
  }

  // --- GLOBAL SEARCH (Prioritizing FILMES and PESSOAS at the top) ---
  public searchAll(query: string): SearchResult[] {
    if (!query || query.trim().length === 0) return [];
    const q = query.toLowerCase().trim();

    const filmResults: SearchResult[] = [];
    const personResults: SearchResult[] = [];
    const publicationResults: SearchResult[] = [];

    // 1. Search Filmes (PRIORITY #1)
    this.getFilmes().forEach((f) => {
      const matchTitle = f.title.toLowerCase().includes(q);
      const matchOrig = f.originalTitle && f.originalTitle.toLowerCase().includes(q);
      const matchDir = f.director.toLowerCase().includes(q);
      const matchCountry = f.country.toLowerCase().includes(q);
      const matchGenre = f.genres?.some((g) => g.toLowerCase().includes(q));

      if (matchTitle || matchOrig || matchDir || matchCountry || matchGenre) {
        filmResults.push({
          id: f.id,
          type: 'filme',
          title: f.title,
          subtitle: `${f.director} · ${f.year}${f.country ? ` · ${f.country}` : ''}`,
          slug: f.slug,
          image: f.posterImage,
          tags: f.genres || f.tags,
        });
      }
    });

    // 2. Search Pessoas (PRIORITY #2)
    this.getPessoas(true).forEach((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchBio = p.bio?.toLowerCase().includes(q);
      const matchRoles = p.primaryRoles?.some((r) => r.toLowerCase().includes(q));
      const matchCountry = p.country?.toLowerCase().includes(q);

      if (matchName || matchBio || matchRoles || matchCountry) {
        personResults.push({
          id: p.id,
          type: 'pessoa',
          title: p.name,
          subtitle: p.primaryRoles && p.primaryRoles.length > 0 ? p.primaryRoles.join(' · ') : `Arquivo · ${p.country || 'Cinema'}`,
          slug: p.slug,
          image: p.photo,
          tags: p.tags,
        });
      }
    });

    // 3. Search Ensaios
    this.getEnsaios(true).forEach((e) => {
      if (
        e.title.toLowerCase().includes(q) ||
        e.subtitle.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        publicationResults.push({
          id: e.id,
          type: 'ensaio',
          title: e.title,
          subtitle: e.subtitle,
          slug: e.slug,
          date: e.date,
          image: e.coverImage,
          tags: e.tags,
        });
      }
    });

    // 4. Search Críticas
    this.getCriticas(true).forEach((c) => {
      if (
        c.movieTitle.toLowerCase().includes(q) ||
        c.editorialTitle.toLowerCase().includes(q) ||
        c.director.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        publicationResults.push({
          id: c.id,
          type: 'critica',
          title: `${c.movieTitle} — ${c.editorialTitle}`,
          subtitle: `Dir. ${c.director} (${c.year}) · ★ ${c.starRating.toFixed(1)}`,
          slug: c.slug,
          date: c.date,
          image: c.coverImage,
          tags: c.tags,
        });
      }
    });

    // 5. Search Especiais
    this.getEspeciais(true).forEach((es) => {
      if (
        es.title.toLowerCase().includes(q) ||
        es.subtitle.toLowerCase().includes(q) ||
        es.intro.toLowerCase().includes(q)
      ) {
        publicationResults.push({
          id: es.id,
          type: 'especial',
          title: es.title,
          subtitle: es.subtitle,
          slug: es.slug,
          image: es.coverImage,
        });
      }
    });

    // 6. Search Listas
    this.getListas(true).forEach((l) => {
      if (
        l.title.toLowerCase().includes(q) ||
        l.intro.toLowerCase().includes(q) ||
        l.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        publicationResults.push({
          id: l.id,
          type: 'lista',
          title: l.title,
          subtitle: l.intro,
          slug: l.slug,
          image: l.coverImage,
          tags: l.tags,
        });
      }
    });

    // 7. Search Uma Imagem
    this.getUmaImagemList(true).forEach((u) => {
      if (
        u.title.toLowerCase().includes(q) ||
        u.content.toLowerCase().includes(q) ||
        u.tags.some((t) => t.toLowerCase().includes(q))
      ) {
        publicationResults.push({
          id: u.id,
          type: 'uma_imagem',
          title: u.title,
          subtitle: u.relatedMovie ? `Filme: ${u.relatedMovie}` : 'Uma imagem, uma ideia',
          slug: u.slug,
          date: u.date,
          image: u.image,
          tags: u.tags,
        });
      }
    });

    // Combine prioritizing Filmes, then Pessoas, then Editorial Publications
    return [...filmResults, ...personResults, ...publicationResults];
  }

  public checkFilmmakerDependencies(filmmakerName: string): string[] {
    const related = this.getPersonRelatedContent(filmmakerName);
    const deps: string[] = [];
    related.filmes.forEach((f) => deps.push(`Filme: ${f.title} (${f.year})`));
    related.criticas.forEach((c) => deps.push(`Crítica: ${c.movieTitle} — ${c.editorialTitle}`));
    related.ensaios.forEach((e) => deps.push(`Ensaio: ${e.title}`));
    return deps;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

export const cmsStore = new CMSStore();
