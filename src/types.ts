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
  date: string;
  readTimeMinutes: number;
  highlightHome: boolean;
  seoTitle?: string;
  seoDescription?: string;
  status: ContentStatus;
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
  isNewRelease: boolean;
  highlightHome: boolean;
  date: string;
  seoTitle?: string;
  seoDescription?: string;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UmaImagemUmaIdeia {
  id: string;
  title: string;
  slug: string;
  image: string;
  content: string;
  relatedMovie?: string;
  relatedFilmmaker?: string;
  tags: string[];
  highlightHome: boolean;
  date: string;
  status: ContentStatus;
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

export interface Especial {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  coverImage: string;
  intro: string;
  content: string;
  relatedItemIds: string[];
  highlightHome: boolean;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListaItem {
  rank?: number;
  title: string;
  director?: string;
  year?: number;
  note?: string;
  image?: string;
}

export interface Lista {
  id: string;
  title: string;
  slug: string;
  intro: string;
  coverImage: string;
  items: ListaItem[];
  relatedFilmmaker?: string;
  tags: string[];
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export type HighlightItem = 
  | ({ itemType: 'ensaio' } & Ensaio)
  | ({ itemType: 'critica' } & Critica)
  | ({ itemType: 'especial' } & Especial)
  | ({ itemType: 'uma_imagem' } & UmaImagemUmaIdeia)
  | ({ itemType: 'cineasta' } & Cineasta);

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
