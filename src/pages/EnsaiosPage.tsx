import React, { useState } from 'react';
import { cmsStore } from '../services/cmsStore';
import { ArticleCard } from '../components/ArticleCard';

interface EnsaiosPageProps {
  onNavigate: (path: string) => void;
}

export const EnsaiosPage: React.FC<EnsaiosPageProps> = ({ onNavigate }) => {
  const [selectedTag, setSelectedTag] = useState<string>('todos');
  const allEnsaios = cmsStore.getEnsaios(true);

  // Extract all unique categories/tags
  const tagsSet = new Set<string>();
  allEnsaios.forEach((e) => {
    if (e.category) tagsSet.add(e.category);
    e.tags.forEach((t) => tagsSet.add(t));
  });
  const tagsList = Array.from(tagsSet);

  const filteredEnsaios =
    selectedTag === 'todos'
      ? allEnsaios
      : allEnsaios.filter(
          (e) =>
            e.category === selectedTag ||
            e.tags.includes(selectedTag)
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

        {/* Filters */}
        {tagsList.length > 0 && (
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
        {filteredEnsaios.length === 0 ? (
          <div className="py-24 text-center space-y-3 border border-[#1A1A1A]/15 bg-white">
            <p className="text-lg font-serif-display text-[#1A1A1A]/60">
              Nenhum ensaio publicado para esta categoria.
            </p>
          </div>
        ) : (
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
        )}

      </div>
    </div>
  );
};
