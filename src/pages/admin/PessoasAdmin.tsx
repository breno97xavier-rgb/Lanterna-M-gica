import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  User,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Save,
  Globe,
  Calendar,
  Flag,
} from 'lucide-react';
import {
  fetchPessoas,
  createPessoa,
  updatePessoa,
  deletePessoa,
  slugify,
  normalizeDateToIso,
  SupabasePessoa,
} from '../../services/repositories/pessoasRepository';
import {
  fetchCountries,
  createCountry,
  SupabaseCountry,
} from '../../services/repositories/countriesRepository';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { ContentStatus } from '../../types';

interface PessoasAdminProps {
  onNotify?: (msg: string) => void;
  autoCreate?: boolean;
}

export const PessoasAdmin: React.FC<PessoasAdminProps> = ({ onNotify, autoCreate = false }) => {
  const [pessoas, setPessoas] = useState<SupabasePessoa[]>([]);
  const [countries, setCountries] = useState<SupabaseCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Editing / Creating State
  const [isEditing, setIsEditing] = useState(false);
  const [editingPessoa, setEditingPessoa] = useState<Partial<SupabasePessoa>>({});
  const [isDeceased, setIsDeceased] = useState(false);
  const [rolesInput, setRolesInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Country Modal State
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryFlag, setNewCountryFlag] = useState('');
  const [isSavingCountry, setIsSavingCountry] = useState(false);
  const [countryModalError, setCountryModalError] = useState<string | null>(null);

  // Deleting State
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCountries = useCallback(async () => {
    const { data } = await fetchCountries();
    if (data) {
      setCountries(data);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchErr } = await fetchPessoas({ allStatuses: true });
    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      setPessoas(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadList();
    loadCountries();
  }, [loadList, loadCountries]);

  useEffect(() => {
    if (autoCreate && !isEditing) {
      handleCreateNew();
    }
  }, [autoCreate]);

  const handleCreateNew = () => {
    setEditingPessoa({
      name: '',
      slug: '',
      photo_url: '',
      country_id: '',
      country: '',
      birth_date: '',
      death_date: '',
      bio: '',
      primary_roles: ['Diretor'],
      highlight_home: false,
      status: 'published' as ContentStatus,
    });
    setIsDeceased(false);
    setRolesInput('Diretor');
    setFormError(null);
    setIsEditing(true);
  };

  const handleEdit = (p: SupabasePessoa) => {
    const cleanBirth = p.birth_date ? (normalizeDateToIso(p.birth_date) || p.birth_date) : '';
    const cleanDeath = p.death_date ? (normalizeDateToIso(p.death_date) || p.death_date) : '';
    const hasDeath = Boolean(p.death_date && String(p.death_date).trim() !== '');
    setIsDeceased(hasDeath);
    setEditingPessoa({
      ...p,
      country_id: p.country_id || p.country_data?.id || '',
      country: p.country || p.country_data?.name || '',
      birth_date: cleanBirth,
      death_date: cleanDeath,
    });
    setRolesInput(p.primary_roles ? p.primary_roles.join(', ') : '');
    setFormError(null);
    setIsEditing(true);
  };

  const handleNameChange = (name: string) => {
    const isNew = !editingPessoa.id;
    const slug = isNew ? slugify(name) : (editingPessoa.slug || slugify(name));
    setEditingPessoa((prev) => ({ ...prev, name, slug }));
  };

  const handleCountrySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) {
      setEditingPessoa((prev) => ({ ...prev, country_id: null, country: null }));
      return;
    }
    const found = countries.find((c) => c.id === selectedId);
    setEditingPessoa((prev) => ({
      ...prev,
      country_id: selectedId,
      country: found ? found.name : prev.country,
    }));
  };

  const handleToggleDeceased = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsDeceased(checked);
    if (!checked) {
      setEditingPessoa((prev) => ({ ...prev, death_date: '' }));
    }
  };

  const handleOpenCountryModal = () => {
    setNewCountryName('');
    setNewCountryFlag('');
    setCountryModalError(null);
    setIsCountryModalOpen(true);
  };

  const handleSaveCountryModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingCountry) return;

    const name = newCountryName.trim();
    if (!name) {
      setCountryModalError('O nome do país é obrigatório.');
      return;
    }

    setIsSavingCountry(true);
    setCountryModalError(null);

    const { data: createdCountry, error: countryErr } = await createCountry({
      name,
      flag_url: newCountryFlag || null,
    });

    if (countryErr || !createdCountry) {
      setCountryModalError(countryErr?.message || 'Falha ao cadastrar país.');
      setIsSavingCountry(false);
      return;
    }

    // Refresh countries list
    await loadCountries();

    // Select the new country automatically for the current pessoa form
    setEditingPessoa((prev) => ({
      ...prev,
      country_id: createdCountry.id,
      country: createdCountry.name,
    }));

    if (onNotify) {
      onNotify(`País "${createdCountry.name}" cadastrado com sucesso!`);
    }

    setIsSavingCountry(false);
    setIsCountryModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const name = editingPessoa.name?.trim();
    if (!name) {
      setFormError('O Nome Completo é obrigatório.');
      return;
    }

    const slug = editingPessoa.slug?.trim() ? slugify(editingPessoa.slug) : slugify(name);
    if (!slug) {
      setFormError('O Slug é obrigatório.');
      return;
    }

    const roles = rolesInput
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);

    setIsSaving(true);
    setFormError(null);

    const isEditMode = Boolean(editingPessoa.id);
    const birthDateVal = editingPessoa.birth_date ? (normalizeDateToIso(editingPessoa.birth_date) || null) : null;
    const deathDateVal = isDeceased && editingPessoa.death_date
      ? (normalizeDateToIso(editingPessoa.death_date) || null)
      : null;
    const countryIdVal = editingPessoa.country_id || null;
    const countryNameVal = editingPessoa.country?.trim() || null;

    if (isEditMode && editingPessoa.id) {
      const { data, error: updateErr } = await updatePessoa(editingPessoa.id, {
        name,
        slug,
        photo_url: editingPessoa.photo_url || null,
        country_id: countryIdVal,
        country: countryNameVal,
        birth_date: birthDateVal,
        death_date: deathDateVal,
        bio: editingPessoa.bio || null,
        primary_roles: roles.length > 0 ? roles : ['Profissional do Cinema'],
        highlight_home: editingPessoa.highlight_home || false,
        status: editingPessoa.status || 'published',
      });

      if (updateErr) {
        setFormError(updateErr.message);
      } else {
        if (onNotify) onNotify(`Pessoa "${data?.name}" atualizada no Supabase!`);
        setIsEditing(false);
        await loadList();
      }
    } else {
      const { data, error: createErr } = await createPessoa({
        name,
        slug,
        photo_url: editingPessoa.photo_url || null,
        country_id: countryIdVal,
        country: countryNameVal,
        birth_date: birthDateVal,
        death_date: deathDateVal,
        bio: editingPessoa.bio || null,
        primary_roles: roles.length > 0 ? roles : ['Profissional do Cinema'],
        highlight_home: editingPessoa.highlight_home || false,
        status: editingPessoa.status || 'published',
      });

      if (createErr) {
        setFormError(createErr.message);
      } else {
        if (onNotify) onNotify(`Pessoa "${data?.name}" cadastrada com sucesso no Supabase!`);
        setIsEditing(false);
        await loadList();
      }
    }

    setIsSaving(false);
  };

  const confirmDeleteAction = async () => {
    if (!deleteTarget || isDeleting) return;

    setIsDeleting(true);
    const { error: delErr } = await deletePessoa(deleteTarget.id);

    if (delErr) {
      setError(delErr.message);
      if (onNotify) onNotify(`Erro ao excluir: ${delErr.message}`);
    } else {
      if (onNotify) onNotify(`Pessoa "${deleteTarget.name}" removida com sucesso.`);
      setDeleteTarget(null);
      await loadList();
    }
    setIsDeleting(false);
  };

  const filtered = pessoas.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const cName = p.country_data?.name || p.country || '';
    return (
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      cName.toLowerCase().includes(q) ||
      p.primary_roles?.some((r) => r.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1A1A1A]/10 pb-4">
        <div>
          <h2 className="text-xl font-serif-display font-bold text-[#1A1A1A]">
            Catálogo de Pessoas ({pessoas.length})
          </h2>
          <p className="text-xs font-mono text-[#1A1A1A]/60 mt-0.5">
            Registro unificado em <code className="bg-[#1A1A1A]/5 px-1 py-0.5">public.pessoas</code> com países associados via <code className="bg-[#1A1A1A]/5 px-1 py-0.5">public.countries</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadList}
            disabled={loading}
            className="p-2 border border-[#1A1A1A]/15 text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-white transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
          >
            <Plus size={14} />
            <span>Nova Pessoa</span>
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Form Drawer / Modal when editing or creating */}
      {isEditing && (
        <div className="bg-white border-2 border-[#1A1A1A] p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-4">
            <div className="flex items-center gap-2">
              <User size={18} className="text-[#D4AF37]" />
              <h3 className="font-serif-display font-bold text-lg text-[#1A1A1A]">
                {editingPessoa.id ? `Editar: ${editingPessoa.name}` : 'Cadastrar Nova Pessoa'}
              </h3>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="text-[#1A1A1A]/60 hover:text-[#1A1A1A] p-1"
            >
              <X size={18} />
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editingPessoa.name || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="ex: Liv Ullmann"
                  className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Slug (URL amigável) *
                </label>
                <input
                  type="text"
                  required
                  value={editingPessoa.slug || ''}
                  onChange={(e) =>
                    setEditingPessoa((prev) => ({ ...prev, slug: e.target.value }))
                  }
                  placeholder="ex: liv-ullmann"
                  className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>
            </div>

            {/* Country Selector + Add Country Action */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                  País de Nascimento (Catálogo Reutilizável)
                </label>
                <button
                  type="button"
                  onClick={handleOpenCountryModal}
                  className="inline-flex items-center gap-1 text-[11px] font-sans font-bold text-[#D4AF37] hover:text-[#1A1A1A] transition-colors"
                >
                  <Plus size={12} />
                  <span>+ Novo país</span>
                </button>
              </div>

              <div className="relative">
                <select
                  value={editingPessoa.country_id || ''}
                  onChange={handleCountrySelectChange}
                  className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                >
                  <option value="">-- Selecione um país do acervo --</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.flag_url ? '🏁' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] font-mono text-[#1A1A1A]/50">
                {countries.length === 0
                  ? 'Nenhum país cadastrado no acervo. Clique em "+ Novo país" para criar o primeiro.'
                  : `${countries.length} países cadastrados em public.countries.`}
              </p>
            </div>

            {/* Dates: Birth Date, Deceased Toggle, Death Date */}
            <div className="p-4 bg-[#F5F2ED] border border-[#1A1A1A]/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Birth Date - Always Enabled */}
                <div className="space-y-1">
                  <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-1.5">
                    <Calendar size={12} className="text-[#D4AF37]" />
                    <span>Data de Nascimento</span>
                  </label>
                  <input
                    type="date"
                    value={editingPessoa.birth_date || ''}
                    onChange={(e) =>
                      setEditingPessoa((prev) => ({ ...prev, birth_date: e.target.value }))
                    }
                    className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                  <p className="text-[10px] font-mono text-[#1A1A1A]/60">
                    Formato ISO AAAA-MM-DD (ex: 1971-03-31).
                  </p>
                </div>

                {/* Deceased Control & Death Date */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                      Falecimento
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-sans font-semibold text-[#1A1A1A] select-none">
                      <input
                        type="checkbox"
                        checked={isDeceased}
                        onChange={handleToggleDeceased}
                        className="w-4 h-4 accent-[#1A1A1A] cursor-pointer"
                      />
                      <span>Pessoa falecida</span>
                    </label>
                  </div>

                  <input
                    type="date"
                    disabled={!isDeceased}
                    value={isDeceased ? (editingPessoa.death_date || '') : ''}
                    onChange={(e) =>
                      setEditingPessoa((prev) => ({ ...prev, death_date: e.target.value }))
                    }
                    className={`w-full border px-3 py-2 text-xs font-mono transition-colors ${
                      isDeceased
                        ? 'bg-white border-[#1A1A1A]/20 text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]'
                        : 'bg-[#1A1A1A]/5 border-[#1A1A1A]/10 text-[#1A1A1A]/40 cursor-not-allowed'
                    }`}
                  />
                  <p className="text-[10px] font-mono text-[#1A1A1A]/60">
                    {isDeceased
                      ? 'Preencha a data de falecimento (ex: 1994-01-20).'
                      : 'Desmarcado: pessoa viva/em atividade (death_date = NULL).'}
                  </p>
                </div>
              </div>
            </div>

            {/* Primary Roles */}
            <div className="space-y-1">
              <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                Funções Principais (separadas por vírgula)
              </label>
              <input
                type="text"
                value={rolesInput}
                onChange={(e) => setRolesInput(e.target.value)}
                placeholder="Ex: Diretora, Atriz, Roteirista"
                className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
              <p className="text-[10px] font-mono text-[#1A1A1A]/50">
                Ex: Diretor, Atriz, Ator, Roteirista, Diretor de Fotografia, Montador, Produtor
              </p>
            </div>

            {/* Photo Upload via Supabase Storage */}
            <ImageUploader
              label="Fotografia / Retrato (Bucket media/people)"
              value={editingPessoa.photo_url || ''}
              folder="people"
              onChange={(url) =>
                setEditingPessoa((prev) => ({ ...prev, photo_url: url }))
              }
            />

            {/* Status Editorial */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1A1A1A]/10">
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Status Editorial
                </label>
                <select
                  value={editingPessoa.status || 'published'}
                  onChange={(e) =>
                    setEditingPessoa((prev) => ({ ...prev, status: e.target.value as ContentStatus }))
                  }
                  className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A]"
                >
                  <option value="published">Publicado</option>
                  <option value="draft">Rascunho</option>
                  <option value="archived">Arquivado</option>
                </select>
              </div>
            </div>

            {/* Biography */}
            <div className="space-y-1">
              <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                Biografia Editorial / Notas
              </label>
              <textarea
                rows={6}
                value={editingPessoa.bio || ''}
                onChange={(e) =>
                  setEditingPessoa((prev) => ({ ...prev, bio: e.target.value }))
                }
                placeholder="Biografia detalhada da pessoa..."
                className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-serif-body text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            {/* Highlight in Home Hero */}
            <div className="pt-2 border-t border-[#1A1A1A]/10">
              <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-sans font-bold text-[#1A1A1A] select-none">
                <input
                  type="checkbox"
                  checked={editingPessoa.highlight_home || false}
                  onChange={(e) =>
                    setEditingPessoa((prev) => ({ ...prev, highlight_home: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#1A1A1A] cursor-pointer"
                />
                <span>Destacar no Hero Rotativo da Home Principal</span>
              </label>
              <p className="text-[11px] font-mono text-[#1A1A1A]/60 mt-0.5 pl-6">
                Exibe o perfil desta pessoa no carrossel de abertura com foto e biografia.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1A1A]/15">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-[#1A1A1A]/20 text-xs font-sans font-semibold text-[#1A1A1A] hover:bg-[#1A1A1A]/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{editingPessoa.id ? 'Salvar Alterações' : 'Cadastrar Pessoa'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Cadastrar Novo País */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#1A1A1A] w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-3">
              <div className="flex items-center gap-2">
                <Flag size={18} className="text-[#D4AF37]" />
                <h3 className="font-serif-display font-bold text-lg text-[#1A1A1A]">
                  Cadastrar Novo País
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCountryModalOpen(false)}
                className="text-[#1A1A1A]/60 hover:text-[#1A1A1A] p-1"
              >
                <X size={18} />
              </button>
            </div>

            {countryModalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{countryModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCountryModal} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#1A1A1A]">
                  Nome do País *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCountryName}
                  onChange={(e) => setNewCountryName(e.target.value)}
                  placeholder="Ex: Escócia, França, Estados Unidos, Japão"
                  className="w-full bg-white border border-[#1A1A1A]/20 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              {/* Flag Uploader via Supabase Storage */}
              <ImageUploader
                label="Bandeira do País (Bucket media/countries)"
                value={newCountryFlag}
                folder="countries"
                onChange={(url) => setNewCountryFlag(url)}
              />

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1A1A1A]/10">
                <button
                  type="button"
                  onClick={() => setIsCountryModalOpen(false)}
                  className="px-4 py-2 border border-[#1A1A1A]/20 text-xs font-sans font-semibold text-[#1A1A1A] hover:bg-[#1A1A1A]/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingCountry}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
                >
                  {isSavingCountry ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Salvar País</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar pessoa por nome, país, slug, função..."
          className="w-full bg-white border border-[#1A1A1A]/15 pl-9 pr-3 py-2 text-xs font-sans text-[#1A1A1A] placeholder-[#1A1A1A]/40 focus:outline-none focus:border-[#1A1A1A]"
        />
      </div>

      {/* Table / List */}
      <div className="bg-white border border-[#1A1A1A]/15 overflow-x-auto">
        {loading && pessoas.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-[#1A1A1A]/60 flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span>Carregando pessoas de public.pessoas...</span>
          </div>
        ) : (
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-[#1A1A1A]/5 border-b border-[#1A1A1A]/10 text-[10px] uppercase font-bold tracking-wider text-[#1A1A1A]/70">
              <tr>
                <th className="py-3 px-4">Pessoa</th>
                <th className="py-3 px-4">Funções Principais</th>
                <th className="py-3 px-4">País</th>
                <th className="py-3 px-4">Período</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]/10">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs font-mono text-[#1A1A1A]/50">
                    Nenhuma pessoa cadastrada em public.pessoas ou encontrada na busca.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const countryName = p.country_data?.name || p.country || '—';
                  const flagUrl = p.country_data?.flag_url;
                  const birthYear = p.birth_date ? p.birth_date.slice(0, 4) : undefined;
                  const deathYear = p.death_date ? p.death_date.slice(0, 4) : undefined;

                  return (
                    <tr key={p.id} className="hover:bg-[#1A1A1A]/[0.02] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt={p.name}
                              className="w-9 h-9 object-cover rounded-full border border-[#1A1A1A]/20"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center font-bold text-xs">
                              {p.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-[#1A1A1A] flex items-center gap-1.5">
                              <span>{p.name}</span>
                              {p.highlight_home && (
                                <span className="px-1 py-0.2 bg-[#1A1A1A] text-[#F5F2ED] text-[8px] font-mono uppercase">
                                  Hero
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#1A1A1A]/50 font-mono">{p.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {p.primary_roles?.map((r) => (
                            <span
                              key={r}
                              className="px-1.5 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/10 text-[10px] uppercase font-semibold"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#1A1A1A]/80">
                        <div className="flex items-center gap-1.5">
                          {flagUrl && (
                            <img
                              src={flagUrl}
                              alt={countryName}
                              className="w-4 h-3 object-cover rounded-xs border border-[#1A1A1A]/15 shadow-2xs"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <span>{countryName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#1A1A1A]/70 font-mono text-[11px]">
                        {birthYear ? `${birthYear}–${deathYear || 'Pres.'}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-1.5 py-0.5 text-[9px] font-mono uppercase font-bold ${
                            p.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : p.status === 'draft'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(p)}
                            className="p-1.5 text-[#1A1A1A]/70 hover:text-[#1A1A1A] hover:bg-[#1A1A1A]/5 transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                            className="p-1.5 text-red-600/70 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={Boolean(deleteTarget)}
          title="Excluir Pessoa"
          message={`Tem certeza de que deseja remover a pessoa "${deleteTarget.name}" do banco de dados? Esta ação não pode ser desfeita.`}
          confirmLabel={isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
          cancelLabel="Cancelar"
          isDestructive={true}
          onConfirm={confirmDeleteAction}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
