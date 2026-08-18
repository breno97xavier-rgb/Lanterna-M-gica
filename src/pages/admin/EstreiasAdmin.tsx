import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Calendar, Film, Check, X, ArrowUpRight } from 'lucide-react';
import { cmsStore } from '../../services/cmsStore';
import { Estreia, Filme } from '../../types';

export const EstreiasAdmin: React.FC = () => {
  const [estreias, setEstreias] = useState<Estreia[]>(() => cmsStore.getEstreias(false));
  const [filmes] = useState<Filme[]>(() => cmsStore.getFilmes());
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [currentEstreia, setCurrentEstreia] = useState<Partial<Estreia>>({});

  const refreshList = () => {
    setEstreias(cmsStore.getEstreias(false));
  };

  const handleCreateNew = () => {
    // Default next Thursday
    const d = new Date();
    const day = d.getDay();
    const diff = (4 - day + 7) % 7 || 7; // days to next thursday
    d.setDate(d.getDate() + diff);
    const nextThursday = d.toISOString().slice(0, 10);

    setCurrentEstreia({
      filmId: filmes[0]?.id || '',
      filmSlug: filmes[0]?.slug || '',
      filmTitle: filmes[0]?.title || '',
      filmDirector: filmes[0]?.director || '',
      filmYear: filmes[0]?.year || new Date().getFullYear(),
      filmCountry: filmes[0]?.country || 'Brasil',
      filmPoster: filmes[0]?.posterImage || '',
      filmGenres: filmes[0]?.genres || ['Drama'],
      releaseDate: nextThursday,
      distributor: '',
      releaseType: 'Cinema',
      notes: '',
      isPublished: true,
    });
    setIsEditing(true);
  };

  const handleEdit = (est: Estreia) => {
    setCurrentEstreia({ ...est });
    setIsEditing(true);
  };

  const handleDelete = (id: string, filmTitle: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a estreia de "${filmTitle}"?`)) {
      cmsStore.deleteEstreia(id);
      refreshList();
    }
  };

  const handleSelectFilm = (filmId: string) => {
    const f = filmes.find((x) => x.id === filmId);
    if (!f) return;

    setCurrentEstreia((prev) => ({
      ...prev,
      filmId: f.id,
      filmSlug: f.slug,
      filmTitle: f.title,
      filmOriginalTitle: f.originalTitle,
      filmDirector: f.director,
      filmYear: f.year,
      filmCountry: f.country,
      filmPoster: f.posterImage,
      filmGenres: f.genres,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEstreia.filmTitle || !currentEstreia.releaseDate) {
      alert('Filme e Data de Estreia são obrigatórios.');
      return;
    }

    cmsStore.saveEstreia(currentEstreia);
    setIsEditing(false);
    refreshList();
  };

  const filtered = estreias.filter((est) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      est.filmTitle.toLowerCase().includes(q) ||
      est.filmDirector?.toLowerCase().includes(q) ||
      est.distributor?.toLowerCase().includes(q) ||
      est.releaseDate.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1A1A]/10 pb-4">
        <div>
          <h2 className="text-xl font-serif-display font-bold text-[#1A1A1A]">
            Guia de Estreias ({estreias.length})
          </h2>
          <p className="text-xs font-serif-body text-[#1A1A1A]/70 mt-0.5">
            Lançamentos semanais no circuito cinematográfico brasileiro.
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider transition-colors shadow-xs"
        >
          <Plus size={14} />
          <span>Cadastrar Estreia</span>
        </button>
      </div>

      {/* Editor Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#F5F2ED] border border-[#1A1A1A]/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-3">
              <h3 className="text-lg font-serif-display font-bold text-[#1A1A1A]">
                {currentEstreia.id ? 'Editar Estreia' : 'Nova Estreia'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-[#1A1A1A]/60 hover:text-[#1A1A1A]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Select Film from Catalog */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Filme no Acervo *
                </label>
                <select
                  value={currentEstreia.filmId || ''}
                  onChange={(e) => handleSelectFilm(e.target.value)}
                  className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="">Selecione um filme cadastrado...</option>
                  {filmes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title} ({f.year}) — Dir. {f.director}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] font-sans text-[#1A1A1A]/50">
                  Dica: Se o filme ainda não estiver na lista, você pode cadastrá-lo primeiro na aba &quot;Filmes&quot; do painel.
                </p>
              </div>

              {/* Title & Director preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Título do Filme
                  </label>
                  <input
                    type="text"
                    required
                    value={currentEstreia.filmTitle || ''}
                    onChange={(e) =>
                      setCurrentEstreia((prev) => ({ ...prev, filmTitle: e.target.value }))
                    }
                    className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Direção
                  </label>
                  <input
                    type="text"
                    required
                    value={currentEstreia.filmDirector || ''}
                    onChange={(e) =>
                      setCurrentEstreia((prev) => ({ ...prev, filmDirector: e.target.value }))
                    }
                    className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Release Date & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Data de Lançamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={currentEstreia.releaseDate || ''}
                    onChange={(e) =>
                      setCurrentEstreia((prev) => ({ ...prev, releaseDate: e.target.value }))
                    }
                    className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                  />
                  <p className="text-[9px] font-sans text-[#1A1A1A]/50">
                    Sugerido: Quinta-feira
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Tipo de Estreia
                  </label>
                  <select
                    value={currentEstreia.releaseType || 'Cinema'}
                    onChange={(e) =>
                      setCurrentEstreia((prev) => ({
                        ...prev,
                        releaseType: e.target.value as any,
                      }))
                    }
                    className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Cinema">Cinema (Salas comerciais)</option>
                    <option value="Streaming">Streaming / VOD</option>
                    <option value="Festival">Festival de Cinema</option>
                    <option value="Relançamento">Relançamento em Cópia Restaurada</option>
                    <option value="Especial">Sessão Especial</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                    Distribuidora no Brasil
                  </label>
                  <input
                    type="text"
                    value={currentEstreia.distributor || ''}
                    onChange={(e) =>
                      setCurrentEstreia((prev) => ({ ...prev, distributor: e.target.value }))
                    }
                    placeholder="Ex: O2 Play / MUBI / Imovision"
                    className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Poster URL */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                  URL do Pôster Vertical
                </label>
                <input
                  type="url"
                  value={currentEstreia.filmPoster || ''}
                  onChange={(e) =>
                    setCurrentEstreia((prev) => ({ ...prev, filmPoster: e.target.value }))
                  }
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Editorial Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Notas Editoriais / Observações de Lançamento
                </label>
                <textarea
                  rows={3}
                  value={currentEstreia.notes || ''}
                  onChange={(e) =>
                    setCurrentEstreia((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Ex: Vencedor da Palma de Ouro no Festival de Cannes. Estreia em circuito restrito e salas de arte."
                  className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-serif-body text-[#1A1A1A] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="estPublish"
                  checked={currentEstreia.isPublished !== false}
                  onChange={(e) =>
                    setCurrentEstreia((prev) => ({ ...prev, isPublished: e.target.checked }))
                  }
                  className="accent-[#D4AF37] w-4 h-4"
                />
                <label htmlFor="estPublish" className="text-xs font-sans text-[#1A1A1A]">
                  Publicar estreia no guia público e na seção &quot;Nos Cinemas Esta Semana&quot;
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1A1A]/15">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-[#1A1A1A]/20 text-xs font-sans uppercase tracking-wider text-[#1A1A1A] hover:bg-[#1A1A1A]/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1A1A1A] text-[#F5F2ED] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-xs font-sans font-bold uppercase tracking-wider transition-colors"
                >
                  Salvar Estreia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por filme, distribuidora, diretor..."
          className="w-full bg-white border border-[#1A1A1A]/15 pl-9 pr-3 py-2 text-xs font-sans text-[#1A1A1A] placeholder-[#1A1A1A]/40 focus:outline-none focus:border-[#D4AF37]"
        />
      </div>

      {/* Estreias Table */}
      <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[#1A1A1A]/5 border-b border-[#1A1A1A]/10 text-[10px] uppercase font-bold tracking-wider text-[#1A1A1A]/70">
            <tr>
              <th className="py-3 px-4">Filme</th>
              <th className="py-3 px-4">Data de Estreia</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Distribuidora</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]/10">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[#1A1A1A]/50">
                  Nenhuma estreia cadastrada ou encontrada com a busca.
                </td>
              </tr>
            ) : (
              filtered.map((est) => (
                <tr key={est.id} className="hover:bg-[#1A1A1A]/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {est.filmPoster ? (
                        <img
                          src={est.filmPoster}
                          alt={est.filmTitle}
                          className="w-8 aspect-[2/3] object-cover border border-[#1A1A1A]/20"
                        />
                      ) : (
                        <div className="w-8 aspect-[2/3] bg-[#1A1A1A]/10 flex items-center justify-center">
                          <Film size={14} className="text-[#1A1A1A]/40" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-[#1A1A1A]">{est.filmTitle}</div>
                        <div className="text-[10px] text-[#1A1A1A]/60">
                          Dir. {est.filmDirector} ({est.filmYear})
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-[#1A1A1A]">
                    {est.releaseDate}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/10 text-[10px] font-semibold uppercase">
                      {est.releaseType || 'Cinema'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#1A1A1A]/80">{est.distributor || '—'}</td>
                  <td className="py-3 px-4">
                    {est.isPublished !== false ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10px] uppercase">
                        <Check size={12} /> Publicado
                      </span>
                    ) : (
                      <span className="text-[#1A1A1A]/40 text-[10px] uppercase">Rascunho</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(est)}
                        className="p-1 text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/10 transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(est.id, est.filmTitle)}
                        className="p-1 text-red-600/70 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
