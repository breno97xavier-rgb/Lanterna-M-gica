export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export type CreditDepartment =
  | 'Direção'
  | 'Elenco'
  | 'Roteiro'
  | 'Fotografia'
  | 'Montagem'
  | 'Música'
  | 'Produção'
  | 'Direção de Arte'
  | 'Figurino'
  | 'Som'
  | 'Outro';

export interface FilmCredit {
  id: string;
  filmId: string;
  personId?: string;
  personName: string;
  personSlug?: string;
  personPhoto?: string;
  department: CreditDepartment | string;
  role?: string;
  characterName?: string;
  order?: number;
}

export interface Pessoa {
  id: string;
  name: string;
  slug: string;
  photo?: string;
  birthDate?: string;
  deathDate?: string;
  country?: string;
  bio?: string;
  editorialProfile?: string;
  primaryRoles?: string[];
  tags?: string[];
  status?: ContentStatus;
  highlightHome?: boolean;
  tmdbId?: number | null;
  tmdbSyncedAt?: string | null;
  imdbId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Filme {
  id: string;
  title: string;
  originalTitle?: string;
  slug: string;
  year: number;
  director: string;
  country: string;
  genres?: string[];
  durationMinutes?: number;
  posterImage?: string;
  synopsis?: string;
  credits?: FilmCredit[];
  tags?: string[];
  status?: ContentStatus;
  scheduledAt?: string;
  publishedAt?: string;
  tmdbId?: number | null;
  tmdbSyncedAt?: string | null;
  originalLanguage?: string | null;
  imdbId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Estreia {
  id: string;
  filmId: string;
  filmTitle: string;
  filmSlug: string;
  filmOriginalTitle?: string;
  filmDirector: string;
  filmYear: number;
  filmCountry: string;
  filmGenres?: string[];
  filmDurationMinutes?: number;
  filmPoster?: string;
  country: string; // e.g. "Brasil"
  releaseDate: string; // YYYY-MM-DD
  releaseType: 'Cinema' | 'Streaming' | 'Festival' | 'Especial' | string;
  distributor?: string;
  notes?: string;
  status?: ContentStatus;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorProfile {
  name: string;
  photo?: string;
  bio?: string;
}

export interface TagItem {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  altText?: string;
  caption?: string;
  credit?: string;
  createdAt: string;
}

export interface Ensaio {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  coverImage: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  authors?: EditorialAuthorCredit[];
  date: string;
  readTimeMinutes: number;
  highlightHome: boolean;
  seoTitle?: string;
  seoDescription?: string;
  status: ContentStatus;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Critica {
  id: string;
  filmId?: string;
  movieTitle: string;
  editorialTitle: string;
  slug: string;
  director: string;
  year: number;
  country: string;
  durationMinutes: number;
  screenplay?: string;
  cinematography?: string;
  genre?: string;
  genres?: string[];
  coverImage: string;
  content: string;
  starRating: number; // 0.5 to 5.0 in steps of 0.5
  tags: string[];
  authors?: EditorialAuthorCredit[];
  author?: string;
  isNewRelease: boolean;
  highlightHome: boolean;
  date: string;
  seoTitle?: string;
  seoDescription?: string;
  status: ContentStatus;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UmaImagemUmaIdeia {
  id: string;
  legacyId?: string | null;
  title: string;
  slug: string;
  image: string;
  content: string;
  filmId?: string | null;
  personId?: string | null;
  film?: {
    id: string;
    title: string;
    slug: string;
    year?: number;
    posterUrl?: string | null;
    backdropUrl?: string | null;
  } | null;
  person?: {
    id: string;
    name: string;
    slug: string;
    photoUrl?: string | null;
  } | null;
  relatedMovie?: string;
  relatedFilmmaker?: string;
  tags: string[];
  authors?: EditorialAuthorCredit[];
  highlightHome: boolean;
  date: string;
  status: ContentStatus;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Cineasta {
  id: string;
  name: string;
  slug: string;
  photo: string;
  bio: string;
  birthYear?: number;
  deathYear?: number;
  country: string;
  tags: string[];
  highlightHome?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EspecialItemType = 'ensaio' | 'critica' | 'lista' | 'uma_imagem' | 'filme' | 'pessoa';

export interface EspecialItemEntityJoin {
  id: string;
  title?: string;
  name?: string;
  slug: string;
  year?: number;
  country?: string;
  coverImage?: string;
  poster_url?: string | null;
  backdrop_url?: string | null;
  photo_url?: string | null;
  [key: string]: any;
}

export interface EspecialItem {
  id: string;
  especialId: string;
  itemType: EspecialItemType;
  targetId: string;
  customLabel?: string;
  orderIndex: number;
  createdAt: string;

  // Joined relational data
  ensaio?: Ensaio;
  critica?: Critica;
  lista?: Lista;
  umaImagem?: UmaImagemUmaIdeia;
  filme?: Filme;
  pessoa?: Pessoa;
  entity?: EspecialItemEntityJoin;
}

export interface Especial {
  id: string;
  legacyId?: string | null;
  title: string;
  slug: string;
  subtitle: string;
  coverImage: string;
  intro: string;
  content: string;
  relatedPersonId?: string | null;
  relatedPerson?: {
    id: string;
    name: string;
    slug: string;
    photo_url?: string | null;
  } | null;
  items?: EspecialItem[];
  relatedItemIds: string[];
  highlightHome: boolean;
  status: ContentStatus;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  authorCredits?: EditorialAuthorCredit[];
  createdAt: string;
  updatedAt: string;
}

export interface ListaItem {
  id?: string;
  rank?: number;
  filmId?: string | null;
  title: string;
  director?: string;
  year?: number;
  note?: string;
  image?: string;
  orderIndex?: number;
  film?: {
    id: string;
    title: string;
    slug: string;
    year?: number;
    posterUrl?: string | null;
    backdropUrl?: string | null;
    country?: string | null;
    director?: string | null;
  } | null;
}

export interface Lista {
  id: string;
  legacyId?: string | null;
  title: string;
  slug: string;
  intro: string;
  coverImage: string;
  items: ListaItem[];
  relatedPersonId?: string | null;
  relatedPerson?: {
    id: string;
    name: string;
    slug: string;
    photoUrl?: string | null;
  } | null;
  relatedFilmmaker?: string;
  tags: string[];
  status: ContentStatus;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type HighlightItem = 
  | ({ itemType: 'ensaio' } & Ensaio)
  | ({ itemType: 'critica' } & Critica)
  | ({ itemType: 'especial' } & Especial)
  | ({ itemType: 'uma_imagem' } & UmaImagemUmaIdeia)
  | ({ itemType: 'cineasta' } & Cineasta)
  | ({ itemType: 'lista' } & Lista);

export interface SearchResult {
  id: string;
  type: 'filme' | 'pessoa' | 'ensaio' | 'critica' | 'uma_imagem' | 'especial' | 'cineasta' | 'lista' | 'estreia';
  title: string;
  subtitle?: string;
  slug: string;
  date?: string;
  image?: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Domínio de Equipe Editorial e Autoria (Fase 6)
// ---------------------------------------------------------------------------

export type TeamMemberStatus = 'draft' | 'published' | 'archived';

export interface TeamMemberSocialLinks {
  instagram?: string;
  twitter?: string;
  letterboxd?: string;
  website?: string;
  email?: string;
  bluesky?: string;
  linkedin?: string;
  [key: string]: string | undefined;
}

export interface EditorialRole {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  groupCategory: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberRole {
  memberId: string;
  roleId: string;
  isPrimary: boolean;
  orderIndex: number;
  createdAt?: string;
  role?: EditorialRole;
}

export interface TeamMember {
  id: string;
  legacyId?: string | null;
  name: string;
  slug: string;
  photoUrl?: string | null;
  birthDate?: string | null;
  bio?: string | null;
  shortBio?: string | null;
  socialLinks: TeamMemberSocialLinks;
  displayOnAbout: boolean;
  orderIndex: number;
  status: TeamMemberStatus;
  roles?: TeamMemberRole[];
  createdAt: string;
  updatedAt: string;
}

export interface EditorialAuthorCredit {
  id: string;
  publicationId?: string;
  memberId: string;
  roleName: string;
  orderIndex: number;
  createdAt?: string;
  member?: TeamMember;
}

// ---------------------------------------------------------------------------
// Domínio TMDB e Auditoria de Integração (Fase 9)
// ---------------------------------------------------------------------------

export type TmdbSyncEntityType = 'filme' | 'pessoa';
export type TmdbSyncStatus = 'success' | 'warning' | 'error' | 'skipped';

export interface TmdbSyncLog {
  id: string;
  entityType: TmdbSyncEntityType;
  internalId: string;
  tmdbId?: number | null;
  operation: string;
  source: string;
  status: TmdbSyncStatus;
  details?: Record<string, any>;
  errorMessage?: string | null;
  createdAt: string;
}


