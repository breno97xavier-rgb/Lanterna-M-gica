import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  User,
  Plus,
  Edit2,
  Trash2,
  Search,
  Check,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Save,
  Calendar,
  Globe,
  Instagram,
  Twitter,
  Linkedin,
  Mail,
  Star,
  ArrowUp,
  ArrowDown,
  Shield,
  Eye,
  CheckCircle,
  Film,
} from 'lucide-react';
import {
  TeamMember,
  EditorialRole,
  TeamMemberStatus,
  TeamMemberSocialLinks,
} from '../../types';
import {
  fetchTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  slugifyTeamMember,
  normalizeDateToIsoDate,
  TeamMemberRoleInput,
} from '../../services/repositories/teamMembersRepository';
import {
  fetchEditorialRoles,
  createEditorialRole,
  updateEditorialRole,
  deleteEditorialRole,
  slugifyEditorialRole,
} from '../../services/repositories/editorialRolesRepository';
import { ImageUploader } from '../../components/admin/ImageUploader';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { calculatePersonAge } from '../../utils/dateUtils';

interface TeamAdminProps {
  onNotify?: (msg: string) => void;
  autoCreate?: boolean;
}

interface MemberFormRoleItem {
  roleId: string;
  isPrimary: boolean;
  orderIndex: number;
}

export const TeamAdmin: React.FC<TeamAdminProps> = ({ onNotify, autoCreate = false }) => {
  // Context switch: 'members' or 'roles'
  const [activeContext, setActiveContext] = useState<'members' | 'roles'>('members');

  // ============================================================================
  // DATA STATES
  // ============================================================================
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<EditorialRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters for Members
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TeamMemberStatus>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [aboutFilter, setAboutFilter] = useState<boolean>(false);

  // ============================================================================
  // MEMBER EDIT / CREATE STATE
  // ============================================================================
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberSlug, setMemberSlug] = useState('');
  const [memberPhotoUrl, setMemberPhotoUrl] = useState('');
  const [memberBirthDate, setMemberBirthDate] = useState('');
  const [memberBio, setMemberBio] = useState('');
  const [memberShortBio, setMemberShortBio] = useState('');
  const [memberDisplayOnAbout, setMemberDisplayOnAbout] = useState(true);
  const [memberStatus, setMemberStatus] = useState<TeamMemberStatus>('published');
  const [memberOrderIndex, setMemberOrderIndex] = useState(0);

  // Selected Roles in Member Form
  const [memberRoles, setMemberRoles] = useState<MemberFormRoleItem[]>([]);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>('');

  // Social Links
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialLetterboxd, setSocialLetterboxd] = useState('');
  const [socialTwitter, setSocialTwitter] = useState('');
  const [socialBluesky, setSocialBluesky] = useState('');
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialWebsite, setSocialWebsite] = useState('');
  const [socialEmail, setSocialEmail] = useState('');

  const [isSavingMember, setIsSavingMember] = useState(false);
  const [memberFormError, setMemberFormError] = useState<string | null>(null);

  // Member Delete Modal
  const [deleteMemberTarget, setDeleteMemberTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  // ============================================================================
  // EDITORIAL ROLES CRUD STATES
  // ============================================================================
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleSlug, setRoleSlug] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [roleGroupCategory, setRoleGroupCategory] = useState('redacao');
  const [roleOrderIndex, setRoleOrderIndex] = useState(0);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [roleModalError, setRoleModalError] = useState<string | null>(null);

  // Role Delete Modal
  const [deleteRoleTarget, setDeleteRoleTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const loadRoles = useCallback(async () => {
    const { data, error: err } = await fetchEditorialRoles();
    if (err) {
      setError(`Erro ao carregar funções: ${err.message}`);
    } else {
      setRoles(data || []);
    }
  }, []);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await fetchTeamMembers({ status: 'all' });
    if (err) {
      setError(`Erro ao carregar integrantes: ${err.message}`);
    } else {
      setMembers(data || []);
    }
    setLoading(false);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadRoles(), loadMembers()]);
    setLoading(false);
  }, [loadRoles, loadMembers]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Handle auto-create trigger
  useEffect(() => {
    if (autoCreate && !isEditingMember) {
      handleCreateNewMember();
    }
  }, [autoCreate]);

  // ============================================================================
  // MEMBER HANDLERS
  // ============================================================================
  const handleCreateNewMember = () => {
    setEditingMemberId(null);
    setMemberName('');
    setMemberSlug('');
    setMemberPhotoUrl('');
    setMemberBirthDate('');
    setMemberBio('');
    setMemberShortBio('');
    setMemberDisplayOnAbout(true);
    setMemberStatus('published');
    setMemberOrderIndex(members.length);

    // Se houver roles cadastradas, podemos pré-selecionar a primeira como primária
    if (roles.length > 0) {
      setMemberRoles([{ roleId: roles[0].id, isPrimary: true, orderIndex: 0 }]);
    } else {
      setMemberRoles([]);
    }

    setSocialInstagram('');
    setSocialLetterboxd('');
    setSocialTwitter('');
    setSocialBluesky('');
    setSocialLinkedin('');
    setSocialWebsite('');
    setSocialEmail('');

    setMemberFormError(null);
    setIsEditingMember(true);
  };

  const handleEditMember = (m: TeamMember) => {
    setEditingMemberId(m.id);
    setMemberName(m.name || '');
    setMemberSlug(m.slug || '');
    setMemberPhotoUrl(m.photoUrl || '');
    setMemberBirthDate(m.birthDate ? (normalizeDateToIsoDate(m.birthDate) || m.birthDate) : '');
    setMemberBio(m.bio || '');
    setMemberShortBio(m.shortBio || '');
    setMemberDisplayOnAbout(m.displayOnAbout !== false);
    setMemberStatus(m.status || 'published');
    setMemberOrderIndex(typeof m.orderIndex === 'number' ? m.orderIndex : 0);

    // Mapeia roles existentes
    const currentRoles: MemberFormRoleItem[] = (m.roles || []).map((r, idx) => ({
      roleId: r.roleId,
      isPrimary: Boolean(r.isPrimary),
      orderIndex: typeof r.orderIndex === 'number' ? r.orderIndex : idx,
    }));
    setMemberRoles(currentRoles);

    // Social Links
    const links = (m.socialLinks as TeamMemberSocialLinks) || {};
    setSocialInstagram(links.instagram || '');
    setSocialLetterboxd(links.letterboxd || '');
    setSocialTwitter(links.twitter || '');
    setSocialBluesky(links.bluesky || '');
    setSocialLinkedin(links.linkedin || '');
    setSocialWebsite(links.website || '');
    setSocialEmail(links.email || '');

    setMemberFormError(null);
    setIsEditingMember(true);
  };

  const handleMemberNameChange = (val: string) => {
    setMemberName(val);
    if (!editingMemberId) {
      setMemberSlug(slugifyTeamMember(val));
    }
  };

  const handleAddRoleToMember = () => {
    if (!selectedRoleToAdd) return;
    if (memberRoles.some((r) => r.roleId === selectedRoleToAdd)) {
      setSelectedRoleToAdd('');
      return;
    }
    const hasPrimary = memberRoles.some((r) => r.isPrimary);
    const newRole: MemberFormRoleItem = {
      roleId: selectedRoleToAdd,
      isPrimary: !hasPrimary, // Se não tiver nenhuma primária, esta se torna a primária
      orderIndex: memberRoles.length,
    };
    setMemberRoles([...memberRoles, newRole]);
    setSelectedRoleToAdd('');
  };

  const handleRemoveRoleFromMember = (roleIdToRemove: string) => {
    const updated = memberRoles.filter((r) => r.roleId !== roleIdToRemove);
    // Se a removida era a primária e restaram outras, marca a primeira como primária
    if (updated.length > 0 && !updated.some((r) => r.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setMemberRoles(updated.map((r, idx) => ({ ...r, orderIndex: idx })));
  };

  const handleSetPrimaryRole = (roleId: string) => {
    setMemberRoles(
      memberRoles.map((r) => ({
        ...r,
        isPrimary: r.roleId === roleId,
      }))
    );
  };

  const handleMoveRole = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === memberRoles.length - 1)
    ) {
      return;
    }
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newItems = [...memberRoles];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);
    setMemberRoles(newItems.map((item, idx) => ({ ...item, orderIndex: idx })));
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingMember) return;

    const trimmedName = memberName.trim();
    if (!trimmedName) {
      setMemberFormError('O Nome do integrante é obrigatório.');
      return;
    }

    const trimmedSlug = memberSlug.trim() ? slugifyTeamMember(memberSlug) : slugifyTeamMember(trimmedName);
    if (!trimmedSlug) {
      setMemberFormError('O Slug é obrigatório.');
      return;
    }

    // Prepara objeto de links sociais
    const socialLinks: TeamMemberSocialLinks = {};
    if (socialInstagram.trim()) socialLinks.instagram = socialInstagram.trim();
    if (socialLetterboxd.trim()) socialLinks.letterboxd = socialLetterboxd.trim();
    if (socialTwitter.trim()) socialLinks.twitter = socialTwitter.trim();
    if (socialBluesky.trim()) socialLinks.bluesky = socialBluesky.trim();
    if (socialLinkedin.trim()) socialLinks.linkedin = socialLinkedin.trim();
    if (socialWebsite.trim()) socialLinks.website = socialWebsite.trim();
    if (socialEmail.trim()) socialLinks.email = socialEmail.trim();

    // Prepara payload de funções
    const rolesPayload: TeamMemberRoleInput[] = memberRoles.map((r, idx) => ({
      role_id: r.roleId,
      is_primary: Boolean(r.isPrimary),
      order_index: idx,
    }));

    const cleanBirthDate = memberBirthDate ? normalizeDateToIsoDate(memberBirthDate) : null;

    setIsSavingMember(true);
    setMemberFormError(null);

    try {
      if (editingMemberId) {
        // Atualização
        const { data, error: updateErr } = await updateTeamMember(editingMemberId, {
          name: trimmedName,
          slug: trimmedSlug,
          photo_url: memberPhotoUrl.trim() || null,
          birth_date: cleanBirthDate,
          bio: memberBio.trim() || null,
          short_bio: memberShortBio.trim() || null,
          social_links: socialLinks,
          display_on_about: memberDisplayOnAbout,
          status: memberStatus,
          order_index: memberOrderIndex,
          roles: rolesPayload,
        });

        if (updateErr) {
          setMemberFormError(updateErr.message);
          setIsSavingMember(false);
          return;
        }

        if (onNotify) {
          onNotify(`Integrante "${data?.name || trimmedName}" atualizado com sucesso!`);
        }
      } else {
        // Criação
        const { data, error: createErr } = await createTeamMember({
          name: trimmedName,
          slug: trimmedSlug,
          photo_url: memberPhotoUrl.trim() || null,
          birth_date: cleanBirthDate,
          bio: memberBio.trim() || null,
          short_bio: memberShortBio.trim() || null,
          social_links: socialLinks,
          display_on_about: memberDisplayOnAbout,
          status: memberStatus,
          order_index: memberOrderIndex,
          roles: rolesPayload,
        });

        if (createErr) {
          setMemberFormError(createErr.message);
          setIsSavingMember(false);
          return;
        }

        if (onNotify) {
          onNotify(`Integrante "${data?.name || trimmedName}" cadastrado com sucesso!`);
        }
      }

      setIsEditingMember(false);
      await loadMembers();
    } catch (err: any) {
      setMemberFormError(err?.message || 'Falha inesperada ao salvar integrante.');
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleConfirmDeleteMember = async () => {
    if (!deleteMemberTarget) return;
    setIsDeletingMember(true);

    const { success, error: delErr } = await deleteTeamMember(deleteMemberTarget.id);
    if (!success && delErr) {
      setError(delErr.message);
      if (onNotify) {
        onNotify(`Não foi possível excluir: ${delErr.message}`);
      }
    } else {
      if (onNotify) {
        onNotify(`Integrante "${deleteMemberTarget.name}" removido com sucesso.`);
      }
      await loadMembers();
    }

    setIsDeletingMember(false);
    setDeleteMemberTarget(null);
  };

  // ============================================================================
  // EDITORIAL ROLES HANDLERS
  // ============================================================================
  const handleOpenNewRoleModal = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleSlug('');
    setRoleDescription('');
    setRoleGroupCategory('redacao');
    setRoleOrderIndex(roles.length);
    setRoleModalError(null);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRoleModal = (role: EditorialRole) => {
    setEditingRoleId(role.id);
    setRoleName(role.name);
    setRoleSlug(role.slug);
    setRoleDescription(role.description || '');
    setRoleGroupCategory(role.groupCategory || 'redacao');
    setRoleOrderIndex(role.orderIndex);
    setRoleModalError(null);
    setIsRoleModalOpen(true);
  };

  const handleRoleNameChange = (val: string) => {
    setRoleName(val);
    if (!editingRoleId) {
      setRoleSlug(slugifyEditorialRole(val));
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingRole) return;

    const trimmedName = roleName.trim();
    if (!trimmedName) {
      setRoleModalError('O nome da função é obrigatório.');
      return;
    }

    const trimmedSlug = roleSlug.trim() ? slugifyEditorialRole(roleSlug) : slugifyEditorialRole(trimmedName);
    if (!trimmedSlug) {
      setRoleModalError('O slug da função é obrigatório.');
      return;
    }

    setIsSavingRole(true);
    setRoleModalError(null);

    try {
      if (editingRoleId) {
        const { data, error: updateErr } = await updateEditorialRole(editingRoleId, {
          name: trimmedName,
          slug: trimmedSlug,
          description: roleDescription.trim() || null,
          group_category: roleGroupCategory.trim() || 'redacao',
          order_index: roleOrderIndex,
        });

        if (updateErr) {
          setRoleModalError(updateErr.message);
          setIsSavingRole(false);
          return;
        }

        if (onNotify) {
          onNotify(`Função "${data?.name || trimmedName}" atualizada com sucesso!`);
        }
      } else {
        const { data, error: createErr } = await createEditorialRole({
          name: trimmedName,
          slug: trimmedSlug,
          description: roleDescription.trim() || null,
          group_category: roleGroupCategory.trim() || 'redacao',
          order_index: roleOrderIndex,
        });

        if (createErr) {
          setRoleModalError(createErr.message);
          setIsSavingRole(false);
          return;
        }

        if (onNotify) {
          onNotify(`Função editorial "${data?.name || trimmedName}" criada com sucesso!`);
        }
      }

      setIsRoleModalOpen(false);
      await loadRoles();
      // Recarrega integrantes para atualizar nomes de roles associadas
      await loadMembers();
    } catch (err: any) {
      setRoleModalError(err?.message || 'Falha ao salvar função editorial.');
    } finally {
      setIsSavingRole(false);
    }
  };

  const handleConfirmDeleteRole = async () => {
    if (!deleteRoleTarget) return;
    setIsDeletingRole(true);

    const { success, error: delErr } = await deleteEditorialRole(deleteRoleTarget.id);
    if (!success && delErr) {
      setError(delErr.message);
      if (onNotify) {
        onNotify(`Erro ao excluir função: ${delErr.message}`);
      }
    } else {
      if (onNotify) {
        onNotify(`Função editorial "${deleteRoleTarget.name}" removida com sucesso.`);
      }
      await loadRoles();
      await loadMembers();
    }

    setIsDeletingRole(false);
    setDeleteRoleTarget(null);
  };

  // ============================================================================
  // FILTERED MEMBERS LIST
  // ============================================================================
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // 1. Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = m.name.toLowerCase().includes(q);
        const matchBio = m.bio?.toLowerCase().includes(q) || false;
        const matchShortBio = m.shortBio?.toLowerCase().includes(q) || false;
        const matchRole = (m.roles || []).some((r) => r.role?.name.toLowerCase().includes(q));
        if (!matchName && !matchBio && !matchShortBio && !matchRole) {
          return false;
        }
      }

      // 2. Status Filter
      if (statusFilter !== 'all' && m.status !== statusFilter) {
        return false;
      }

      // 3. Role Filter
      if (roleFilter !== 'all') {
        const hasRole = (m.roles || []).some((r) => r.roleId === roleFilter);
        if (!hasRole) return false;
      }

      // 4. Display on about filter
      if (aboutFilter && !m.displayOnAbout) {
        return false;
      }

      return true;
    });
  }, [members, searchQuery, statusFilter, roleFilter, aboutFilter]);

  // Roles map for easy lookup
  const rolesMap = useMemo(() => {
    const map = new Map<string, EditorialRole>();
    roles.forEach((r) => map.set(r.id, r));
    return map;
  }, [roles]);

  // Roles that are not yet selected for the current member
  const availableRolesToAdd = useMemo(() => {
    const selectedIds = new Set(memberRoles.map((r) => r.roleId));
    return roles.filter((r) => !selectedIds.has(r.id));
  }, [roles, memberRoles]);

  // Idade calculada para o preview em tempo real
  const previewAge = useMemo(() => {
    return calculatePersonAge(memberBirthDate);
  }, [memberBirthDate]);

  // ============================================================================
  // RENDER: MEMBER EDIT / CREATE VIEW
  // ============================================================================
  if (isEditingMember) {
    const isNew = !editingMemberId;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 border border-[#1A1A1A]/15">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditingMember(false)}
              className="p-2 border border-[#1A1A1A]/15 hover:border-[#1A1A1A] hover:bg-[#F5F2ED] transition-colors"
              title="Voltar para a listagem"
            >
              <X size={16} />
            </button>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#1A1A1A]/60">
                EQUIPE EDITORIAL · {isNew ? 'NOVO CADASTRO' : 'EDIÇÃO DE INTEGRANTE'}
              </span>
              <h2 className="font-serif-display text-xl text-[#1A1A1A]">
                {memberName ? memberName : isNew ? 'Novo Integrante' : 'Editar Integrante'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditingMember(false)}
              className="px-3.5 py-2 text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 hover:text-[#1A1A1A] border border-[#1A1A1A]/15 bg-white hover:bg-[#F5F2ED] transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveMember}
              disabled={isSavingMember}
              className="px-4 py-2 text-xs font-sans font-bold uppercase tracking-wider text-[#F5F2ED] bg-[#1A1A1A] hover:bg-[#1A1A1A]/80 border border-[#1A1A1A] flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isSavingMember ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSavingMember ? 'Salvando...' : 'Salvar Integrante'}</span>
            </button>
          </div>
        </div>

        {/* Global form error */}
        {memberFormError && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{memberFormError}</span>
          </div>
        )}

        {/* Main Grid: Form + Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Column (8 cols) */}
          <form onSubmit={handleSaveMember} className="lg:col-span-8 space-y-6">
            {/* Bloco 1: Identificação Básica */}
            <div className="bg-white border border-[#1A1A1A]/15 p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A] border-b border-[#1A1A1A]/10 pb-2 flex items-center gap-2">
                <User size={14} />
                <span>Identificação & URL Canônica</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1">
                    Nome Completo <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={memberName}
                    onChange={(e) => handleMemberNameChange(e.target.value)}
                    placeholder="ex: Breno Matos"
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1">
                    Slug na URL <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={memberSlug}
                    onChange={(e) => setMemberSlug(e.target.value)}
                    placeholder="ex: breno-matos"
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                  <p className="text-[10px] font-mono text-[#1A1A1A]/50 mt-1">
                    URL pública: /equipe/{memberSlug || 'slug'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1 flex items-center gap-1.5">
                    <Calendar size={13} />
                    <span>Data de Nascimento</span>
                  </label>
                  <input
                    type="date"
                    value={memberBirthDate}
                    onChange={(e) => setMemberBirthDate(e.target.value)}
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                  {previewAge !== null && (
                    <p className="text-[10px] font-mono text-emerald-700 font-bold mt-1">
                      Idade calculada dinamicamente: {previewAge} anos
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1">
                    Ordem de Exibição Institucional
                  </label>
                  <input
                    type="number"
                    value={memberOrderIndex}
                    onChange={(e) => setMemberOrderIndex(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                    title="Ordem numérica na listagem geral e página Sobre"
                  />
                  <p className="text-[10px] font-mono text-[#1A1A1A]/50 mt-1">
                    Números menores aparecem primeiro (0, 1, 2...).
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco 2: Foto e Avatar */}
            <div className="bg-white border border-[#1A1A1A]/15 p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A] border-b border-[#1A1A1A]/10 pb-2 flex items-center gap-2">
                <User size={14} />
                <span>Foto de Perfil & Avatar</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-8">
                  <ImageUploader
                    label="Enviar Foto ou Selecionar da Biblioteca"
                    value={memberPhotoUrl}
                    onChange={setMemberPhotoUrl}
                    folder="people"
                  />
                </div>

                {/* Circular Avatar Preview */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#F5F2ED] border border-[#1A1A1A]/15 text-center">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#1A1A1A]/60 mb-2">
                    Formato Circular
                  </span>
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#1A1A1A] bg-white flex items-center justify-center shadow-xs">
                    {memberPhotoUrl ? (
                      <img
                        src={memberPhotoUrl}
                        alt={memberName || 'Avatar'}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="font-serif-display text-2xl text-[#1A1A1A]/40 font-bold">
                        {memberName ? memberName.charAt(0).toUpperCase() : '?'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[#1A1A1A]/50 mt-2">
                    {memberPhotoUrl ? 'Foto selecionada' : 'Sem foto cadastrada'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloco 3: Funções Editoriais */}
            <div className="bg-white border border-[#1A1A1A]/15 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A] flex items-center gap-2">
                  <Shield size={14} />
                  <span>Funções Editoriais ({memberRoles.length})</span>
                </h3>
                <span className="text-[10px] font-mono text-[#1A1A1A]/60">
                  Marque exatamente UMA função principal
                </span>
              </div>

              {/* Lista de funções atribuídas */}
              {memberRoles.length === 0 ? (
                <div className="p-4 bg-[#F5F2ED] border border-dashed border-[#1A1A1A]/20 text-center space-y-1">
                  <p className="text-xs font-sans text-[#1A1A1A]/70">
                    Nenhuma função editorial associada a este integrante.
                  </p>
                  <p className="text-[10px] font-mono text-[#1A1A1A]/50">
                    Selecione uma função no campo abaixo para adicioná-la.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {memberRoles.map((item, idx) => {
                    const roleData = rolesMap.get(item.roleId);
                    const roleNameStr = roleData?.name || 'Função não identificada';
                    const isPrimary = Boolean(item.isPrimary);

                    return (
                      <div
                        key={item.roleId}
                        className={`flex items-center justify-between p-3 border transition-all ${
                          isPrimary
                            ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                            : 'bg-[#F5F2ED] text-[#1A1A1A] border-[#1A1A1A]/15'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryRole(item.roleId)}
                            className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono uppercase font-bold tracking-wider border transition-colors ${
                              isPrimary
                                ? 'bg-amber-400 text-[#1A1A1A] border-amber-400'
                                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/20 hover:border-[#1A1A1A]'
                            }`}
                            title={isPrimary ? 'Função principal definida' : 'Clique para definir como principal'}
                          >
                            <Star size={11} className={isPrimary ? 'fill-current' : ''} />
                            <span>{isPrimary ? 'Principal' : 'Tornar Principal'}</span>
                          </button>

                          <div>
                            <span className="text-xs font-sans font-bold">{roleNameStr}</span>
                            {roleData?.groupCategory && (
                              <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 ml-2 ${
                                isPrimary ? 'bg-white/20 text-white' : 'bg-[#1A1A1A]/10 text-[#1A1A1A]/70'
                              }`}>
                                {roleData.groupCategory}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveRole(idx, 'up')}
                            disabled={idx === 0}
                            className={`p-1.5 border transition-colors disabled:opacity-30 ${
                              isPrimary
                                ? 'border-white/20 hover:bg-white/20 text-white'
                                : 'border-[#1A1A1A]/15 hover:bg-white text-[#1A1A1A]'
                            }`}
                            title="Subir ordem"
                          >
                            <ArrowUp size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMoveRole(idx, 'down')}
                            disabled={idx === memberRoles.length - 1}
                            className={`p-1.5 border transition-colors disabled:opacity-30 ${
                              isPrimary
                                ? 'border-white/20 hover:bg-white/20 text-white'
                                : 'border-[#1A1A1A]/15 hover:bg-white text-[#1A1A1A]'
                            }`}
                            title="Descer ordem"
                          >
                            <ArrowDown size={12} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveRoleFromMember(item.roleId)}
                            className={`p-1.5 border transition-colors ${
                              isPrimary
                                ? 'border-red-400 text-red-300 hover:bg-red-900/50'
                                : 'border-[#1A1A1A]/15 hover:bg-red-50 text-red-600'
                            }`}
                            title="Remover função deste integrante"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Seletor para adicionar nova função */}
              {availableRolesToAdd.length > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-[#1A1A1A]/10">
                  <select
                    value={selectedRoleToAdd}
                    onChange={(e) => setSelectedRoleToAdd(e.target.value)}
                    className="flex-1 bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="">-- Selecione uma função editorial para adicionar --</option>
                    {availableRolesToAdd.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.groupCategory})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddRoleToMember}
                    disabled={!selectedRoleToAdd}
                    className="px-3.5 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    <span>Adicionar</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bloco 4: Biografia e Resumo */}
            <div className="bg-white border border-[#1A1A1A]/15 p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A] border-b border-[#1A1A1A]/10 pb-2">
                Perfil Editorial & Biografia
              </h3>

              <div>
                <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1">
                  Resumo Curto (Short Bio)
                </label>
                <textarea
                  rows={2}
                  value={memberShortBio}
                  onChange={(e) => setMemberShortBio(e.target.value)}
                  placeholder="ex: Crítico de cinema, pesquisador da Nouvelle Vague e ensaísta da Lanterna Mágica."
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-serif-body text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
                <p className="text-[10px] font-mono text-[#1A1A1A]/50 mt-1">
                  Texto conciso para cards de autor e cabeçalhos de artigos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1">
                  Biografia Completa
                </label>
                <textarea
                  rows={6}
                  value={memberBio}
                  onChange={(e) => setMemberBio(e.target.value)}
                  placeholder="Biografia detalhada do integrante, trajetória acadêmica, interesses cinematográficos e publicações..."
                  className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-serif-body text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>
            </div>

            {/* Bloco 5: Redes e Links Sociais */}
            <div className="bg-white border border-[#1A1A1A]/15 p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A] border-b border-[#1A1A1A]/10 pb-2 flex items-center gap-2">
                <Globe size={14} />
                <span>Links & Presença Digital (Opcionais)</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1 flex items-center gap-1.5">
                    <Instagram size={12} />
                    <span>Instagram</span>
                  </label>
                  <input
                    type="text"
                    value={socialInstagram}
                    onChange={(e) => setSocialInstagram(e.target.value)}
                    placeholder="@usuario ou https://instagram.com/..."
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1 flex items-center gap-1.5">
                    <Film size={12} />
                    <span>Letterboxd</span>
                  </label>
                  <input
                    type="text"
                    value={socialLetterboxd}
                    onChange={(e) => setSocialLetterboxd(e.target.value)}
                    placeholder="usuario ou https://letterboxd.com/..."
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1 flex items-center gap-1.5">
                    <Twitter size={12} />
                    <span>X / Twitter</span>
                  </label>
                  <input
                    type="text"
                    value={socialTwitter}
                    onChange={(e) => setSocialTwitter(e.target.value)}
                    placeholder="@usuario ou https://x.com/..."
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1 flex items-center gap-1.5">
                    <Globe size={12} />
                    <span>Bluesky</span>
                  </label>
                  <input
                    type="text"
                    value={socialBluesky}
                    onChange={(e) => setSocialBluesky(e.target.value)}
                    placeholder="@usuario.bsky.social"
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1 flex items-center gap-1.5">
                    <Linkedin size={12} />
                    <span>LinkedIn</span>
                  </label>
                  <input
                    type="text"
                    value={socialLinkedin}
                    onChange={(e) => setSocialLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1 flex items-center gap-1.5">
                    <Globe size={12} />
                    <span>Website Pessoal</span>
                  </label>
                  <input
                    type="url"
                    value={socialWebsite}
                    onChange={(e) => setSocialWebsite(e.target.value)}
                    placeholder="https://meusite.com"
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1 flex items-center gap-1.5">
                    <Mail size={12} />
                    <span>E-mail Público / Contato Editorial</span>
                  </label>
                  <input
                    type="email"
                    value={socialEmail}
                    onChange={(e) => setSocialEmail(e.target.value)}
                    placeholder="contato@redacao.com"
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 6: Publicação & Exibição */}
            <div className="bg-white border border-[#1A1A1A]/15 p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1A1A] border-b border-[#1A1A1A]/10 pb-2">
                Status & Exibição Institucional
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* Status */}
                <div>
                  <label className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]/80 mb-1">
                    Status do Perfil
                  </label>
                  <select
                    value={memberStatus}
                    onChange={(e) => setMemberStatus(e.target.value as TeamMemberStatus)}
                    className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="published">Publicado (Ativo no site)</option>
                    <option value="draft">Rascunho (Oculto do público)</option>
                    <option value="archived">Arquivado (Inativo)</option>
                  </select>
                </div>

                {/* Display on About Toggle */}
                <div className="pt-4 md:pt-0">
                  <label className="flex items-start gap-3 p-3 bg-[#F5F2ED] border border-[#1A1A1A]/15 cursor-pointer hover:border-[#1A1A1A] transition-colors">
                    <input
                      type="checkbox"
                      checked={memberDisplayOnAbout}
                      onChange={(e) => setMemberDisplayOnAbout(e.target.checked)}
                      className="mt-0.5 accent-[#1A1A1A] w-4 h-4"
                    />
                    <div>
                      <span className="block text-xs font-sans font-bold uppercase text-[#1A1A1A]">
                        Exibir na Página Sobre
                      </span>
                      <span className="block text-[11px] font-serif-body text-[#1A1A1A]/70">
                        Apresenta este integrante na lista editorial da página institucional Sobre.
                      </span>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1A1A1A]/15">
              <button
                type="button"
                onClick={() => setIsEditingMember(false)}
                className="px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/70 hover:text-[#1A1A1A] border border-[#1A1A1A]/15 bg-white hover:bg-[#F5F2ED] transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingMember}
                className="px-6 py-2.5 text-xs font-sans font-bold uppercase tracking-wider text-[#F5F2ED] bg-[#1A1A1A] hover:bg-[#1A1A1A]/80 border border-[#1A1A1A] flex items-center gap-2 transition-all disabled:opacity-50 shadow-xs"
              >
                {isSavingMember ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{isSavingMember ? 'Salvando...' : 'Salvar Integrante'}</span>
              </button>
            </div>
          </form>

          {/* Preview Column (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="sticky top-6">
              <div className="bg-white border border-[#1A1A1A] p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#1A1A1A]/60 flex items-center gap-1.5">
                    <Eye size={12} />
                    <span>Pré-Visualização do Card</span>
                  </span>
                  <span className={`text-[9px] font-mono uppercase px-2 py-0.5 font-bold ${
                    memberStatus === 'published'
                      ? 'bg-emerald-100 text-emerald-800'
                      : memberStatus === 'draft'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-zinc-200 text-zinc-700'
                  }`}>
                    {memberStatus === 'published' ? 'Publicado' : memberStatus === 'draft' ? 'Rascunho' : 'Arquivado'}
                  </span>
                </div>

                {/* Live Card */}
                <div className="flex flex-col items-center text-center space-y-3 pt-2">
                  {/* Avatar */}
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#1A1A1A] bg-[#F5F2ED] flex items-center justify-center shadow-xs">
                    {memberPhotoUrl ? (
                      <img
                        src={memberPhotoUrl}
                        alt={memberName || 'Avatar'}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="font-serif-display text-2xl text-[#1A1A1A]/40 font-bold">
                        {memberName ? memberName.charAt(0).toUpperCase() : '?'}
                      </span>
                    )}
                  </div>

                  {/* Nome e Idade */}
                  <div>
                    <h4 className="font-serif-display text-lg text-[#1A1A1A] font-bold">
                      {memberName || 'Nome do Integrante'}
                    </h4>
                    {previewAge !== null && (
                      <span className="text-[11px] font-serif-body text-[#1A1A1A]/60">
                        {previewAge} anos
                      </span>
                    )}
                  </div>

                  {/* Roles */}
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {memberRoles.length > 0 ? (
                      memberRoles.map((mr) => {
                        const rData = rolesMap.get(mr.roleId);
                        const isPrim = Boolean(mr.isPrimary);
                        return (
                          <span
                            key={mr.roleId}
                            className={`text-[10px] font-mono px-2 py-0.5 font-bold uppercase tracking-wider ${
                              isPrim
                                ? 'bg-[#1A1A1A] text-[#F5F2ED]'
                                : 'bg-[#F5F2ED] text-[#1A1A1A]/70 border border-[#1A1A1A]/15'
                            }`}
                          >
                            {rData?.name || 'Função'}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] font-mono text-[#1A1A1A]/40 italic">
                        Sem função definida
                      </span>
                    )}
                  </div>

                  {/* Short Bio */}
                  <p className="text-xs font-serif-body text-[#1A1A1A]/80 line-clamp-3">
                    {memberShortBio || memberBio || 'Nenhum resumo editorial preenchido.'}
                  </p>

                  {/* Display on About Indicator */}
                  {memberDisplayOnAbout && (
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                        <CheckCircle size={10} />
                        <span>Visível na página Sobre</span>
                      </span>
                    </div>
                  )}

                  {/* Social Icons Preview */}
                  <div className="flex items-center gap-2 pt-2 border-t border-[#1A1A1A]/10 text-[#1A1A1A]/60">
                    {socialInstagram && <Instagram size={14} title={`Instagram: ${socialInstagram}`} />}
                    {socialLetterboxd && <Film size={14} title={`Letterboxd: ${socialLetterboxd}`} />}
                    {socialTwitter && <Twitter size={14} title={`Twitter: ${socialTwitter}`} />}
                    {socialBluesky && <Globe size={14} title={`Bluesky: ${socialBluesky}`} />}
                    {socialLinkedin && <Linkedin size={14} title={`LinkedIn: ${socialLinkedin}`} />}
                    {socialWebsite && <Globe size={14} title={`Site: ${socialWebsite}`} />}
                    {socialEmail && <Mail size={14} title={`E-mail: ${socialEmail}`} />}
                    {!socialInstagram && !socialLetterboxd && !socialTwitter && !socialBluesky && !socialLinkedin && !socialWebsite && !socialEmail && (
                      <span className="text-[10px] font-mono text-[#1A1A1A]/30">
                        Sem redes conectadas
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: MAIN LIST VIEW (MEMBERS OR ROLES)
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 border border-[#1A1A1A]/15 shadow-xs">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#1A1A1A]/60">
            LANTERNA MÁGICA · ADMINISTRAÇÃO EDITORIAL
          </span>
          <h1 className="font-serif-display text-2xl text-[#1A1A1A]">
            Equipe Editorial & Redação
          </h1>
          <p className="text-xs font-serif-body text-[#1A1A1A]/70 mt-0.5">
            Gerenciamento de integrantes, funções institucionais e autoria editorial
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            className="p-2 border border-[#1A1A1A]/15 hover:border-[#1A1A1A] hover:bg-[#F5F2ED] text-[#1A1A1A]/70 hover:text-[#1A1A1A] transition-colors"
            title="Atualizar dados do Supabase"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>

          {activeContext === 'members' ? (
            <button
              type="button"
              onClick={handleCreateNewMember}
              className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>Novo Integrante</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenNewRoleModal}
              className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={14} />
              <span>Nova Função Editorial</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-xs font-bold"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Sub-Tabs: Integrantes vs Funções Editoriais */}
      <div className="flex items-center gap-2 border-b border-[#1A1A1A]/15 pb-2 text-xs font-sans uppercase font-bold">
        <button
          type="button"
          onClick={() => setActiveContext('members')}
          className={`px-4 py-2 border flex items-center gap-2 transition-colors ${
            activeContext === 'members'
              ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
              : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
          }`}
        >
          <Users size={14} />
          <span>Integrantes da Equipe ({members.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveContext('roles')}
          className={`px-4 py-2 border flex items-center gap-2 transition-colors ${
            activeContext === 'roles'
              ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
              : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
          }`}
        >
          <Shield size={14} />
          <span>Funções Editoriais ({roles.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CONTEXT 1: MEMBERS LIST                                                   */}
      {/* ========================================================================= */}
      {activeContext === 'members' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 border border-[#1A1A1A]/15 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
            {/* Search Field */}
            <div className="relative flex-1 min-w-[240px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1A1A1A]/40"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, função ou biografia..."
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 pl-9 pr-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#F5F2ED] border border-[#1A1A1A]/15 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              >
                <option value="all">Todos os status</option>
                <option value="published">Publicados</option>
                <option value="draft">Rascunhos</option>
                <option value="archived">Arquivados</option>
              </select>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-[#F5F2ED] border border-[#1A1A1A]/15 px-3 py-2 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
              >
                <option value="all">Todas as funções</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              {/* Display on About checkbox */}
              <label className="flex items-center gap-1.5 px-3 py-2 bg-[#F5F2ED] border border-[#1A1A1A]/15 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={aboutFilter}
                  onChange={(e) => setAboutFilter(e.target.checked)}
                  className="accent-[#1A1A1A]"
                />
                <span>Página Sobre</span>
              </label>
            </div>
          </div>

          {/* Members Table / Grid */}
          {loading ? (
            <div className="bg-white border border-[#1A1A1A]/15 p-12 text-center">
              <Loader2 size={24} className="animate-spin text-[#1A1A1A]/40 mx-auto mb-2" />
              <p className="text-xs font-mono text-[#1A1A1A]/60">Carregando integrantes da equipe...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="bg-white border border-[#1A1A1A]/15 p-12 text-center space-y-3">
              <Users size={32} className="text-[#1A1A1A]/30 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-serif-display text-lg text-[#1A1A1A]">
                  {members.length === 0 ? 'Nenhum integrante cadastrado' : 'Nenhum integrante encontrado'}
                </h3>
                <p className="text-xs font-serif-body text-[#1A1A1A]/60 max-w-md mx-auto">
                  {members.length === 0
                    ? 'Comece cadastrando os editores, críticos e colaboradores da redação no botão abaixo.'
                    : 'Tente ajustar os termos de busca ou filtros aplicados para encontrar o integrante desejado.'}
                </p>
              </div>
              {members.length === 0 && (
                <button
                  type="button"
                  onClick={handleCreateNewMember}
                  className="mt-2 px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors inline-flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Cadastrar Primeiro Integrante</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white border border-[#1A1A1A]/15 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1A1A1A] text-[#F5F2ED] font-mono text-[10px] uppercase tracking-wider border-b border-[#1A1A1A]">
                    <th className="p-3.5 w-14 text-center">Foto</th>
                    <th className="p-3.5">Nome / URL</th>
                    <th className="p-3.5">Função Principal</th>
                    <th className="p-3.5">Outras Funções</th>
                    <th className="p-3.5 text-center">Sobre</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]/10 font-sans">
                  {filteredMembers.map((m) => {
                    const primaryRole = (m.roles || []).find((r) => r.isPrimary);
                    const otherRoles = (m.roles || []).filter((r) => !r.isPrimary);

                    return (
                      <tr key={m.id} className="hover:bg-[#F5F2ED]/60 transition-colors">
                        {/* Avatar */}
                        <td className="p-3 text-center">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#1A1A1A]/30 bg-[#F5F2ED] mx-auto flex items-center justify-center">
                            {m.photoUrl ? (
                              <img
                                src={m.photoUrl}
                                alt={m.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="font-serif-display text-sm font-bold text-[#1A1A1A]/50">
                                {m.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Nome & Slug */}
                        <td className="p-3">
                          <div className="font-bold text-[#1A1A1A] text-sm hover:underline cursor-pointer" onClick={() => handleEditMember(m)}>
                            {m.name}
                          </div>
                          <span className="font-mono text-[10px] text-[#1A1A1A]/50">
                            /equipe/{m.slug}
                          </span>
                        </td>

                        {/* Função Principal */}
                        <td className="p-3">
                          {primaryRole?.role ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1A1A1A] text-[#F5F2ED] px-2 py-0.5">
                              <Star size={10} className="fill-amber-400 text-amber-400" />
                              <span>{primaryRole.role.name}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[#1A1A1A]/40 italic">
                              Sem função principal
                            </span>
                          )}
                        </td>

                        {/* Outras Funções */}
                        <td className="p-3">
                          {otherRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {otherRoles.map((or) => (
                                <span
                                  key={or.roleId}
                                  className="text-[10px] font-mono px-1.5 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/15 text-[#1A1A1A]/70"
                                >
                                  {or.role?.name || 'Função'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-[#1A1A1A]/30">—</span>
                          )}
                        </td>

                        {/* Exibir no Sobre */}
                        <td className="p-3 text-center">
                          {m.displayOnAbout ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                              <Check size={10} />
                              <span>Sim</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[#1A1A1A]/40">
                              Não
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block text-[10px] font-mono uppercase px-2 py-0.5 font-bold ${
                              m.status === 'published'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : m.status === 'draft'
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-zinc-200 text-zinc-700 border border-zinc-300'
                            }`}
                          >
                            {m.status === 'published'
                              ? 'Publicado'
                              : m.status === 'draft'
                              ? 'Rascunho'
                              : 'Arquivado'}
                          </span>
                        </td>

                        {/* Ações */}
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditMember(m)}
                              className="p-1.5 border border-[#1A1A1A]/15 hover:border-[#1A1A1A] hover:bg-white text-[#1A1A1A] transition-colors"
                              title="Editar integrante"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteMemberTarget({ id: m.id, name: m.name })}
                              className="p-1.5 border border-red-200 hover:border-red-500 hover:bg-red-50 text-red-600 transition-colors"
                              title="Excluir integrante"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONTEXT 2: EDITORIAL ROLES LIST                                           */}
      {/* ========================================================================= */}
      {activeContext === 'roles' && (
        <div className="space-y-4">
          <div className="bg-white p-4 border border-[#1A1A1A]/15 flex items-center justify-between">
            <div>
              <h2 className="font-serif-display text-lg text-[#1A1A1A]">
                Taxonomia de Funções Institucionais
              </h2>
              <p className="text-xs font-serif-body text-[#1A1A1A]/70">
                Cargos e atribuições para redação, coordenação, crítica e colaboradores
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenNewRoleModal}
              className="px-3.5 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center gap-1.5"
            >
              <Plus size={13} />
              <span>Nova Função</span>
            </button>
          </div>

          {roles.length === 0 ? (
            <div className="bg-white border border-[#1A1A1A]/15 p-12 text-center space-y-3">
              <Shield size={32} className="text-[#1A1A1A]/30 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-serif-display text-lg text-[#1A1A1A]">
                  Nenhuma função editorial cadastrada
                </h3>
                <p className="text-xs font-serif-body text-[#1A1A1A]/60 max-w-md mx-auto">
                  Cadastre funções institucionais como Editor-chefe, Crítico, Ensaísta ou Colaborador.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewRoleModal}
                className="mt-2 px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors inline-flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Cadastrar Primeira Função</span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#1A1A1A]/15 overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1A1A1A] text-[#F5F2ED] font-mono text-[10px] uppercase tracking-wider border-b border-[#1A1A1A]">
                    <th className="p-3.5 w-16 text-center">Ordem</th>
                    <th className="p-3.5">Nome da Função</th>
                    <th className="p-3.5">Slug</th>
                    <th className="p-3.5">Categoria / Grupo</th>
                    <th className="p-3.5">Descrição</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]/10 font-sans">
                  {roles.map((r) => (
                    <tr key={r.id} className="hover:bg-[#F5F2ED]/60 transition-colors">
                      <td className="p-3 text-center font-mono font-bold text-[#1A1A1A]/70">
                        {r.orderIndex}
                      </td>
                      <td className="p-3 font-bold text-[#1A1A1A]">
                        {r.name}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-[#1A1A1A]/60">
                        {r.slug}
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/15 text-[#1A1A1A]/80">
                          {r.groupCategory}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-serif-body text-[#1A1A1A]/70 max-w-xs truncate">
                        {r.description || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditRoleModal(r)}
                            className="p-1.5 border border-[#1A1A1A]/15 hover:border-[#1A1A1A] hover:bg-white text-[#1A1A1A] transition-colors"
                            title="Editar função"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteRoleTarget({ id: r.id, name: r.name })}
                            className="p-1.5 border border-red-200 hover:border-red-500 hover:bg-red-50 text-red-600 transition-colors"
                            title="Excluir função"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT EDITORIAL ROLE                                       */}
      {/* ========================================================================= */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1A1A1A]/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5F2ED] border border-[#1A1A1A] w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#1A1A1A] text-[#F5F2ED] px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-amber-400" />
                <span className="font-serif-display text-base tracking-tight">
                  {editingRoleId ? 'Editar Função Editorial' : 'Nova Função Editorial'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="text-[#F5F2ED]/70 hover:text-[#F5F2ED]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-5 space-y-4 text-xs font-sans">
              {roleModalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono">
                  {roleModalError}
                </div>
              )}

              <div>
                <label className="block font-bold uppercase text-[#1A1A1A]/80 mb-1">
                  Nome da Função <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={roleName}
                  onChange={(e) => handleRoleNameChange(e.target.value)}
                  placeholder="ex: Editor-chefe, Crítico, Ensaísta"
                  className="w-full bg-white border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-[#1A1A1A]/80 mb-1">
                  Slug Canônico <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={roleSlug}
                  onChange={(e) => setRoleSlug(e.target.value)}
                  placeholder="ex: editor-chefe"
                  className="w-full bg-white border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-[#1A1A1A]/80 mb-1">
                  Categoria de Agrupamento (Group Category)
                </label>
                <div className="flex gap-2">
                  <select
                    value={roleGroupCategory}
                    onChange={(e) => setRoleGroupCategory(e.target.value)}
                    className="flex-1 bg-white border border-[#1A1A1A]/15 p-2.5 text-xs font-sans text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                  >
                    <option value="direcao">Direção / Coordenação</option>
                    <option value="redacao">Redação / Crítica</option>
                    <option value="colaboracao">Colaboração Externa</option>
                    <option value="producao">Produção & Edição</option>
                    <option value="pesquisa">Pesquisa & Acervo</option>
                  </select>
                  <input
                    type="text"
                    value={roleGroupCategory}
                    onChange={(e) => setRoleGroupCategory(e.target.value)}
                    placeholder="ou digite..."
                    className="w-28 bg-white border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                    title="Permite definir categoria customizada"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase text-[#1A1A1A]/80 mb-1">
                  Ordem de Exibição
                </label>
                <input
                  type="number"
                  value={roleOrderIndex}
                  onChange={(e) => setRoleOrderIndex(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-white border border-[#1A1A1A]/15 p-2.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-[#1A1A1A]/80 mb-1">
                  Descrição / Atribuições (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="Descrição da atribuição editorial no portal..."
                  className="w-full bg-white border border-[#1A1A1A]/15 p-2.5 text-xs font-serif-body text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1A1A1A]/10">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-sans font-bold uppercase text-[#1A1A1A]/70 hover:text-[#1A1A1A] border border-[#1A1A1A]/15 bg-white hover:bg-[#F5F2ED]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingRole}
                  className="px-4 py-2 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingRole ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>{isSavingRole ? 'Salvando...' : 'Salvar Função'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS: CONFIRM DELETE MEMBER & ROLE                                      */}
      {/* ========================================================================= */}
      <ConfirmModal
        isOpen={Boolean(deleteMemberTarget)}
        title="Excluir Integrante da Equipe"
        message={`Tem certeza que deseja excluir o integrante "${deleteMemberTarget?.name}"? Esta ação removerá os dados do perfil e suas atribuições de função.`}
        confirmLabel={isDeletingMember ? 'Excluindo...' : 'Excluir Integrante'}
        isDanger={true}
        onConfirm={handleConfirmDeleteMember}
        onClose={() => setDeleteMemberTarget(null)}
      />

      <ConfirmModal
        isOpen={Boolean(deleteRoleTarget)}
        title="Excluir Função Editorial"
        message={`Tem certeza que deseja excluir a função "${deleteRoleTarget?.name}"? A função será desvinculada dos integrantes que a utilizam.`}
        confirmLabel={isDeletingRole ? 'Excluindo...' : 'Excluir Função'}
        isDanger={true}
        onConfirm={handleConfirmDeleteRole}
        onClose={() => setDeleteRoleTarget(null)}
      />
    </div>
  );
};
