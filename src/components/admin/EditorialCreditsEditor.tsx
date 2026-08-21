import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, User, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { TeamMember } from '../../types';
import { fetchTeamMembers } from '../../services/repositories/teamMembersRepository';

export interface EditorialCreditItem {
  memberId: string;
  roleName: string;
  orderIndex: number;
}

interface EditorialCreditsEditorProps {
  credits: EditorialCreditItem[];
  onChange: (credits: EditorialCreditItem[]) => void;
  defaultRole?: string;
  title?: string;
  disabled?: boolean;
}

const COMMON_ROLES = [
  'Texto',
  'Crítica',
  'Pesquisa',
  'Revisão',
  'Fotografia',
  'Colaboração',
];

export const EditorialCreditsEditor: React.FC<EditorialCreditsEditorProps> = ({
  credits,
  onChange,
  defaultRole = 'Texto',
  title = 'Autoria & Créditos Editoriais',
  disabled = false,
}) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [errorMembers, setErrorMembers] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadMembers() {
      setLoadingMembers(true);
      setErrorMembers(null);
      const { data, error } = await fetchTeamMembers({ status: 'all', orderBy: 'name' });
      if (!isMounted) return;

      if (error) {
        setErrorMembers('Falha ao carregar integrantes da equipe.');
      } else {
        // Ordena: published primeiro, depois draft e archived; dentro do status, por nome
        const sorted = (data || []).sort((a, b) => {
          if (a.status === 'published' && b.status !== 'published') return -1;
          if (a.status !== 'published' && b.status === 'published') return 1;
          return a.name.localeCompare(b.name, 'pt-BR');
        });
        setTeamMembers(sorted);
      }
      setLoadingMembers(false);
    }
    loadMembers();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAddCredit = () => {
    if (disabled || teamMembers.length === 0) return;

    // Encontra o primeiro membro que ainda não foi adicionado, ou o primeiro da lista
    const usedIds = new Set(credits.map((c) => c.memberId));
    const available = teamMembers.find((m) => !usedIds.has(m.id)) || teamMembers[0];

    const newCredit: EditorialCreditItem = {
      memberId: available.id,
      roleName: defaultRole,
      orderIndex: credits.length,
    };

    onChange([...credits, newCredit]);
  };

  const handleRemoveCredit = (index: number) => {
    if (disabled) return;
    const next = credits
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, orderIndex: idx }));
    onChange(next);
  };

  const handleMemberChange = (index: number, newMemberId: string) => {
    if (disabled) return;
    const next = [...credits];
    next[index] = { ...next[index], memberId: newMemberId };
    onChange(next);
  };

  const handleRoleChange = (index: number, newRole: string) => {
    if (disabled) return;
    const next = [...credits];
    next[index] = { ...next[index], roleName: newRole };
    onChange(next);
  };

  const handleMoveUp = (index: number) => {
    if (disabled || index <= 0) return;
    const next = [...credits];
    const temp = next[index - 1];
    next[index - 1] = next[index];
    next[index] = temp;
    // Reatribui orderIndex sequencial
    onChange(next.map((item, idx) => ({ ...item, orderIndex: idx })));
  };

  const handleMoveDown = (index: number) => {
    if (disabled || index >= credits.length - 1) return;
    const next = [...credits];
    const temp = next[index + 1];
    next[index + 1] = next[index];
    next[index] = temp;
    // Reatribui orderIndex sequencial
    onChange(next.map((item, idx) => ({ ...item, orderIndex: idx })));
  };

  return (
    <div className="bg-[#F5F2ED] border border-[#1A1A1A]/15 p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1A1A1A]/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <User size={15} className="text-[#D4AF37]" />
            <h4 className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-[#1A1A1A]">
              {title}
            </h4>
          </div>
          <p className="text-[11px] font-sans text-[#1A1A1A]/60 mt-0.5">
            Associe os integrantes reais da equipe responsáveis por esta publicação e especifique seus papéis.
          </p>
        </div>

        <button
          type="button"
          disabled={disabled || loadingMembers || teamMembers.length === 0}
          onClick={handleAddCredit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#D4AF37] hover:text-[#1A1A1A] text-[#F5F2ED] text-[11px] font-sans font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          <Plus size={13} />
          <span>Adicionar Integrante</span>
        </button>
      </div>

      {/* Loading state */}
      {loadingMembers && (
        <div className="py-6 flex items-center justify-center gap-2 text-xs font-mono text-[#1A1A1A]/60">
          <Loader2 size={14} className="animate-spin text-[#D4AF37]" />
          <span>Carregando integrantes da Equipe Editorial...</span>
        </div>
      )}

      {/* Error state */}
      {!loadingMembers && errorMembers && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs font-sans text-red-800 flex items-center gap-2">
          <AlertCircle size={14} />
          <span>{errorMembers}</span>
        </div>
      )}

      {/* Empty state */}
      {!loadingMembers && !errorMembers && credits.length === 0 && (
        <div className="py-6 px-4 bg-white border border-dashed border-[#1A1A1A]/20 text-center space-y-2">
          <p className="text-xs font-serif-body text-[#1A1A1A]/70">
            Nenhum integrante vinculado como autor desta publicação até o momento.
          </p>
          <button
            type="button"
            disabled={disabled || teamMembers.length === 0}
            onClick={handleAddCredit}
            className="text-[11px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] hover:underline"
          >
            + Clique para adicionar o primeiro crédito
          </button>
        </div>
      )}

      {/* Credits list */}
      {!loadingMembers && credits.length > 0 && (
        <div className="space-y-3">
          {credits.map((credit, idx) => {
            const currentMember = teamMembers.find((m) => m.id === credit.memberId);
            const isPrimary = idx === 0;

            return (
              <div
                key={`${credit.memberId}-${idx}`}
                className={`p-3 sm:p-4 bg-white border transition-colors ${
                  isPrimary
                    ? 'border-[#D4AF37]/50 shadow-xs ring-1 ring-[#D4AF37]/20'
                    : 'border-[#1A1A1A]/15'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Order indicator and Reorder controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        disabled={disabled || idx === 0}
                        onClick={() => handleMoveUp(idx)}
                        className="p-1 border border-[#1A1A1A]/15 hover:bg-[#1A1A1A] hover:text-[#F5F2ED] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-colors"
                        title="Subir posição"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        disabled={disabled || idx === credits.length - 1}
                        onClick={() => handleMoveDown(idx)}
                        className="p-1 border border-[#1A1A1A]/15 hover:bg-[#1A1A1A] hover:text-[#F5F2ED] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-inherit transition-colors"
                        title="Descer posição"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-[#1A1A1A]/60 px-1.5 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/10">
                        #{idx + 1}
                      </span>
                      {isPrimary && (
                        <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 border border-[#D4AF37]/30 flex items-center gap-1">
                          <ShieldCheck size={11} />
                          <span>Principal</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Form fields: Member select and Role input */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 flex-1">
                    {/* Member select */}
                    <div className="sm:col-span-6 space-y-1">
                      <label className="block text-[10px] font-sans font-bold uppercase text-[#1A1A1A]/70">
                        Integrante da Equipe
                      </label>
                      <select
                        disabled={disabled}
                        value={credit.memberId}
                        onChange={(e) => handleMemberChange(idx, e.target.value)}
                        className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/20 p-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                      >
                        {teamMembers.map((m) => {
                          const statusTag =
                            m.status === 'draft'
                              ? ' [Rascunho]'
                              : m.status === 'archived'
                              ? ' [Arquivado]'
                              : '';
                          const primaryRole = m.roles?.find((r) => r.isPrimary)?.role?.name;
                          const roleTag = primaryRole ? ` (${primaryRole})` : '';

                          return (
                            <option key={m.id} value={m.id}>
                              {m.name}
                              {roleTag}
                              {statusTag}
                            </option>
                          );
                        })}
                      </select>
                      {currentMember && currentMember.status !== 'published' && (
                        <span className="text-[10px] font-mono text-amber-700 block">
                          Atenção: Este integrante está com status &quot;{currentMember.status}&quot; no sistema de equipe.
                        </span>
                      )}
                    </div>

                    {/* Role / Credit input */}
                    <div className="sm:col-span-6 space-y-1">
                      <label className="block text-[10px] font-sans font-bold uppercase text-[#1A1A1A]/70">
                        Papel na Publicação
                      </label>
                      <input
                        type="text"
                        disabled={disabled}
                        value={credit.roleName}
                        onChange={(e) => handleRoleChange(idx, e.target.value)}
                        placeholder="Ex: Texto, Crítica, Pesquisa..."
                        className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/20 p-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                      />
                    </div>
                  </div>

                  {/* Remove button */}
                  <div className="shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleRemoveCredit(idx)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                      title="Remover crédito"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Quick suggestions for role */}
                <div className="mt-2.5 pt-2 border-t border-[#1A1A1A]/5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/40 mr-1">
                    Sugestões:
                  </span>
                  {COMMON_ROLES.map((suggestedRole) => (
                    <button
                      key={suggestedRole}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleRoleChange(idx, suggestedRole)}
                      className={`text-[10px] font-sans px-2 py-0.5 border transition-colors ${
                        credit.roleName.toLowerCase() === suggestedRole.toLowerCase()
                          ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                          : 'bg-[#F5F2ED] text-[#1A1A1A]/80 border-[#1A1A1A]/10 hover:border-[#1A1A1A]/40 hover:text-[#1A1A1A]'
                      }`}
                    >
                      {suggestedRole}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
