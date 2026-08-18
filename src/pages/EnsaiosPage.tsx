import React, { useState, useEffect } from 'react';
import { ArticleCard } from '../components/ArticleCard';
import { fetchEnsaios, mapSupabaseEnsaioToEnsaio } from '../services/repositories/ensaiosRepository';
import { Ensaio } from '../types';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface EnsaiosPageProps {
  onNavigate: (path: string) => void;
}

export const EnsaiosPage: React.FC<EnsaiosPageProps> = ({ onNavigate }) => {
  const [selectedTag, setSelectedTag] = useState<string>('todos');
  const [ensaios, setEnsaios] = useState<Ensaio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchEnsaios();
    if (fetchErr) {
      setError(fetchErr.message || 'Erro ao carregar ensaios do catálogo.');
      setEnsaios([]);
    } else {
      setEnsaios((data || []).map(mapSupabaseEnsaioToEnsaio));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extrair categorias e tags únicas dos ensaios reais publicados
  const tagsSet = new Set<string>();
  ensaios.forEach((e) => {
    if (e.category && e.category.trim()) tagsSet.add(e.category.trim());
    if (Array.isArray(e.tags)) {
      e.tags.forEach((t) => {
        if (t && t.trim()) tagsSet.add(t.trim());
      });
    }
  });
  const tagsList = Array.from(tagsSet);

  const filteredEnsaios =
    selectedTag === 'todos'
      ? ensaios
      : ensaios.filter(
          (e) =>
            e.category === selectedTag ||
            (Array.isArray(e.tags) && e.tags.includes(selectedTag))
        );

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Page Header */}
        <div className="space-y-4 border-b border-[#1A1A1A]/15 pb-8">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            Publicação Editorial
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A]">
            ENSAIOS
          </h1>
          <p className="text-base sm:text-lg font-serif-body text-[#1A1A1A]/70 max-w-3xl leading-relaxed">
            Reflexões sobre cinema, sociedade, estética, memória e aquilo que as imagens revelam sobre nós.
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-24 text-center space-y-4 bg-white border border-[#1A1A1A]/15">
            <Loader2 size={32} className="animate-spin text-[#D4AF37] mx-auto" />
            <p className="text-xs font-mono text-[#1A1A1A]/60 uppercase tracking-wider">
              Carregando ensaios editoriais...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="py-16 px-6 text-center space-y-4 bg-red-50 border border-red-200">
            <AlertTriangle size={32} className="text-red-600 mx-auto" />
            <p className="text-sm font-sans font-bold text-red-800">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider inline-flex items-center gap-2"
            >
              <RefreshCw size={14} /> Tentar Novamente
            </button>
          </div>
        )}

        {/* Filters */}
        {!loading && !error && tagsList.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar text-xs font-sans-ui">
            <button
              onClick={() => setSelectedTag('todos')}
              className={`px-4 py-2 uppercase tracking-[0.15em] transition-colors border ${
                selectedTag === 'todos'
                  ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] font-semibold'
                  : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#D4AF37] hover:text-[#1A1A1A]'
              }`}
            >
              Todos
            </button>
            {tagsList.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 uppercase tracking-[0.15em] transition-colors border whitespace-nowrap ${
                  selectedTag === tag
                    ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] font-semibold'
                    : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#D4AF37] hover:text-[#1A1A1A]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Ensaios Grid */}
        {!loading && !error && filteredEnsaios.length === 0 ? (
          <div className="py-24 text-center space-y-3 border border-[#1A1A1A]/15 bg-white">
            <p className="text-lg font-serif-display text-[#1A1A1A]/60">
              Nenhum ensaio publicado encontrado.
            </p>
            <p className="text-xs font-serif-body text-[#1A1A1A]/40 max-w-sm mx-auto">
              Novos textos reflexivos e análises estéticas serão adicionados em breve ao catálogo.
            </p>
          </div>
        ) : !loading && !error ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEnsaios.map((e) => (
              <ArticleCard
                key={e.id}
                type="ensaio"
                variant="medium"
                title={e.title}
                subtitle={e.subtitle}
                image={e.coverImage}
                date={e.date}
                author={e.author}
                readTimeMinutes={e.readTimeMinutes}
                onClick={() => onNavigate(`/ensaios/${e.slug}`)}
              />
            ))}
          </div>
        ) : null}

      </div>
    </div>
  );
};
