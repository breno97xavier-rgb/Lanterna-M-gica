import React, { useState, useEffect } from 'react';
import {
  FileText,
  Film,
  Sparkles,
  User,
  List as ListIcon,
  Folder,
  Plus,
  Clock,
  Eye,
  Edit,
  CheckCircle,
  Archive,
  AlertCircle,
  Calendar,
  Users,
} from 'lucide-react';
import { cmsStore } from '../../services/cmsStore';
import { fetchPessoas } from '../../services/repositories/pessoasRepository';
import { fetchFilmes } from '../../services/repositories/filmesRepository';
import { fetchCriticas, mapSupabaseCriticaToCritica } from '../../services/repositories/criticasRepository';
import { fetchEnsaios, mapSupabaseEnsaioToEnsaio } from '../../services/repositories/ensaiosRepository';
import { Critica, Ensaio } from '../../types';
import { formatEditorialDate } from '../../utils/dateUtils';

interface DashboardOverviewProps {
  onNavigateTab: (tab: any, create?: boolean) => void;
  onPreviewItem?: (item: any, type: any) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateTab,
  onPreviewItem,
}) => {
  const [ensaios, setEnsaios] = useState<Ensaio[]>([]);
  const [criticas, setCriticas] = useState<Critica[]>([]);
  const umaImagem = cmsStore.getUmaImagemList(false);
  const especiais = cmsStore.getEspeciais(false);
  const listas = cmsStore.getListas(false);
  const [pessoasCount, setPessoasCount] = useState<number>(0);
  const [filmesCount, setFilmesCount] = useState<number>(0);
  const estreias = cmsStore.getEstreias(false);

  useEffect(() => {
    fetchPessoas({ allStatuses: true }).then(({ data }) => {
      if (data) {
        setPessoasCount(data.length);
      }
    });
    fetchFilmes({ allStatuses: true }).then(({ data }) => {
      if (data) {
        setFilmesCount(data.length);
      }
    });
    fetchCriticas({ allStatuses: true }).then(({ data }) => {
      if (data) {
        setCriticas(data.map(mapSupabaseCriticaToCritica));
      }
    });
    fetchEnsaios({ allStatuses: true }).then(({ data }) => {
      if (data) {
        setEnsaios(data.map(mapSupabaseEnsaioToEnsaio));
      }
    });
  }, []);

  const allItems = [
    ...ensaios.map((e) => ({ ...e, _type: 'ensaio' as const, _title: e.title })),
    ...criticas.map((c) => ({
      ...c,
      _type: 'critica' as const,
      _title: `${c.movieTitle} — ${c.editorialTitle}`,
    })),
    ...umaImagem.map((u) => ({ ...u, _type: 'uma_imagem' as const, _title: u.title })),
    ...especiais.map((es) => ({ ...es, _type: 'especial' as const, _title: es.title })),
    ...listas.map((l) => ({ ...l, _type: 'lista' as const, _title: l.title })),
  ];

  const draftsCount = allItems.filter((i) => i.status === 'draft').length;
  const scheduledCount = allItems.filter((i) => i.status === 'scheduled').length;
  const publishedCount = allItems.filter((i) => i.status === 'published').length;
  const archivedCount = allItems.filter((i) => i.status === 'archived').length;

  const recentItems = [...allItems]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
    )
    .slice(0, 8);

  return (
    <div className="space-y-8">
      {/* Editorial Shortcuts */}
      <div className="space-y-3">
        <h2 className="text-sm font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]/70">
          Atalhos de Criação & Gestão
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <button
            onClick={() => onNavigateTab('ensaios', true)}
            className="p-3 bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] text-left space-y-1.5 transition-colors group"
          >
            <div className="p-1.5 bg-[#1A1A1A] text-[#F5F2ED] w-fit group-hover:bg-[#D4AF37] group-hover:text-[#1A1A1A] transition-colors">
              <FileText size={16} />
            </div>
            <p className="text-xs font-sans font-bold text-[#1A1A1A]">Novo Ensaio</p>
          </button>

          <button
            onClick={() => onNavigateTab('criticas', true)}
            className="p-3 bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] text-left space-y-1.5 transition-colors group"
          >
            <div className="p-1.5 bg-[#1A1A1A] text-[#F5F2ED] w-fit group-hover:bg-[#D4AF37] group-hover:text-[#1A1A1A] transition-colors">
              <Film size={16} />
            </div>
            <p className="text-xs font-sans font-bold text-[#1A1A1A]">Nova Crítica</p>
          </button>

          <button
            onClick={() => onNavigateTab('estreias', true)}
            className="p-3 bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] text-left space-y-1.5 transition-colors group"
          >
            <div className="p-1.5 bg-[#1A1A1A] text-[#F5F2ED] w-fit group-hover:bg-[#D4AF37] group-hover:text-[#1A1A1A] transition-colors">
              <Calendar size={16} />
            </div>
            <p className="text-xs font-sans font-bold text-[#1A1A1A]">Nova Estreia</p>
          </button>

          <button
            onClick={() => onNavigateTab('filmes', true)}
            className="p-3 bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] text-left space-y-1.5 transition-colors group"
          >
            <div className="p-1.5 bg-[#1A1A1A] text-[#F5F2ED] w-fit group-hover:bg-[#D4AF37] group-hover:text-[#1A1A1A] transition-colors">
              <Film size={16} />
            </div>
            <p className="text-xs font-sans font-bold text-[#1A1A1A]">Novo Filme</p>
          </button>

          <button
            onClick={() => onNavigateTab('pessoas', true)}
            className="p-3 bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] text-left space-y-1.5 transition-colors group"
          >
            <div className="p-1.5 bg-[#1A1A1A] text-[#F5F2ED] w-fit group-hover:bg-[#D4AF37] group-hover:text-[#1A1A1A] transition-colors">
              <Users size={16} />
            </div>
            <p className="text-xs font-sans font-bold text-[#1A1A1A]">Nova Pessoa</p>
          </button>

          <button
            onClick={() => onNavigateTab('uma_imagem', true)}
            className="p-3 bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] text-left space-y-1.5 transition-colors group"
          >
            <div className="p-1.5 bg-[#1A1A1A] text-[#F5F2ED] w-fit group-hover:bg-[#D4AF37] group-hover:text-[#1A1A1A] transition-colors">
              <Sparkles size={16} />
            </div>
            <p className="text-xs font-sans font-bold text-[#1A1A1A]">Uma Imagem</p>
          </button>

          <button
            onClick={() => onNavigateTab('listas', true)}
            className="p-3 bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] text-left space-y-1.5 transition-colors group"
          >
            <div className="p-1.5 bg-[#1A1A1A] text-[#F5F2ED] w-fit group-hover:bg-[#D4AF37] group-hover:text-[#1A1A1A] transition-colors">
              <ListIcon size={16} />
            </div>
            <p className="text-xs font-sans font-bold text-[#1A1A1A]">Nova Lista</p>
          </button>

          <button
            onClick={() => onNavigateTab('especiais', true)}
            className="p-3 bg-white border border-[#1A1A1A]/15 hover:border-[#1A1A1A] text-left space-y-1.5 transition-colors group"
          >
            <div className="p-1.5 bg-[#1A1A1A] text-[#F5F2ED] w-fit group-hover:bg-[#D4AF37] group-hover:text-[#1A1A1A] transition-colors">
              <Folder size={16} />
            </div>
            <p className="text-xs font-sans font-bold text-[#1A1A1A]">Novo Especial</p>
          </button>
        </div>
      </div>

      {/* Editorial Status Counts & Collections */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
        <div className="p-4 bg-white border border-[#1A1A1A]/15 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/60 flex items-center gap-1">
            <CheckCircle size={12} className="text-emerald-600" /> Publicados
          </span>
          <p className="text-3xl font-serif-display text-[#1A1A1A]">{publishedCount}</p>
        </div>

        <div className="p-4 bg-white border border-[#1A1A1A]/15 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/60 flex items-center gap-1">
            <AlertCircle size={12} className="text-amber-600" /> Rascunhos
          </span>
          <p className="text-3xl font-serif-display text-[#1A1A1A]">{draftsCount}</p>
        </div>

        <div className="p-4 bg-white border border-[#1A1A1A]/15 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/60 flex items-center gap-1">
            <Film size={12} className="text-[#D4AF37]" /> Acervo Filmes
          </span>
          <p className="text-3xl font-serif-display text-[#1A1A1A]">{filmesCount}</p>
        </div>

        <div className="p-4 bg-white border border-[#1A1A1A]/15 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/60 flex items-center gap-1">
            <Users size={12} className="text-[#D4AF37]" /> Pessoas
          </span>
          <p className="text-3xl font-serif-display text-[#1A1A1A]">{pessoasCount}</p>
        </div>

        <div className="p-4 bg-white border border-[#1A1A1A]/15 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/60 flex items-center gap-1">
            <Calendar size={12} className="text-[#D4AF37]" /> Estreias
          </span>
          <p className="text-3xl font-serif-display text-[#1A1A1A]">{estreias.length}</p>
        </div>

        <div className="p-4 bg-white border border-[#1A1A1A]/15 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1A1A1A]/60 flex items-center gap-1">
            <Archive size={12} className="text-gray-500" /> Arquivados
          </span>
          <p className="text-3xl font-serif-display text-[#1A1A1A]">{archivedCount}</p>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white border border-[#1A1A1A]/15 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1A1A1A]/15 pb-3">
          <h3 className="font-serif-display text-lg text-[#1A1A1A]">Últimas Atualizações Editoriais</h3>
          <span className="text-xs font-mono text-[#1A1A1A]/60">
            Total no acervo: {allItems.length + filmesCount + pessoasCount + estreias.length} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans text-[#1A1A1A]">
            <thead>
              <tr className="border-b border-[#1A1A1A]/15 text-[10px] uppercase font-bold text-[#1A1A1A]/60">
                <th className="py-2.5 px-3">Título</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]/10">
              {recentItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#F5F2ED]/50 transition-colors">
                  <td className="py-3 px-3 font-medium text-[#1A1A1A] max-w-xs truncate">
                    {item._title}
                  </td>
                  <td className="py-3 px-3 font-mono text-[10px] uppercase text-[#1A1A1A]/70">
                    {item._type}
                  </td>
                  <td className="py-3 px-3 font-mono text-[10px] uppercase">
                    {item.status === 'published' && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold">
                        PUBLICADO
                      </span>
                    )}
                    {item.status === 'draft' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold">
                        RASCUNHO
                      </span>
                    )}
                    {item.status === 'scheduled' && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold">
                        AGENDADO
                      </span>
                    )}
                    {item.status === 'archived' && (
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-800 font-bold">
                        ARQUIVADO
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[#1A1A1A]/70">
                    {formatEditorialDate(
                      ('date' in item && item.date) ? item.date : (item as any).publishedAt || item.createdAt,
                      'short'
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {onPreviewItem && (
                        <button
                          type="button"
                          title="Visualizar Prévia"
                          onClick={() => onPreviewItem(item, item._type)}
                          className="p-1 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]"
                        >
                          <Eye size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        title="Editar"
                        onClick={() =>
                          onNavigateTab(
                            item._type === 'uma_imagem' ? 'uma_imagem' : `${item._type}s`
                          )
                        }
                        className="p-1 hover:bg-[#1A1A1A]/10 text-[#1A1A1A]"
                      >
                        <Edit size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
