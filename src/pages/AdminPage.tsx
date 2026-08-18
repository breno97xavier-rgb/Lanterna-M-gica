import React, { useState, useEffect } from 'react';
import {
  Lock,
  LogOut,
  ArrowLeft,
  LayoutDashboard,
  FileText,
  Film,
  Sparkles,
  User,
  List as ListIcon,
  Folder,
  Tag as TagIcon,
  Image as ImageIcon,
  Database,
  CheckCircle,
  HelpCircle,
  X,
  Plus,
} from 'lucide-react';
import { cmsStore } from '../services/cmsStore';
import { getSupabaseClient } from '../services/supabaseClient';
import { fetchPessoas } from '../services/repositories/pessoasRepository';
import { fetchFilmes } from '../services/repositories/filmesRepository';
import { fetchCriticas } from '../services/repositories/criticasRepository';
import { fetchEnsaios } from '../services/repositories/ensaiosRepository';
import { DashboardOverview } from './admin/DashboardOverview';
import { EnsaiosAdmin } from './admin/EnsaiosAdmin';
import { CriticasAdmin } from './admin/CriticasAdmin';
import { FilmesAdmin } from './admin/FilmesAdmin';
import { PessoasAdmin } from './admin/PessoasAdmin';
import { EstreiasAdmin } from './admin/EstreiasAdmin';
import { CineastasAdmin } from './admin/CineastasAdmin';
import { UmaImagemAdmin } from './admin/UmaImagemAdmin';
import { ListasAdmin } from './admin/ListasAdmin';
import { EspeciaisAdmin } from './admin/EspeciaisAdmin';
import { TagsAdmin } from './admin/TagsAdmin';
import { MediaAdmin } from './admin/MediaAdmin';
import { DataBackupAdmin } from './admin/DataBackupAdmin';
import { ArticlePreviewModal } from '../components/admin/ArticlePreviewModal';

interface AdminPageProps {
  onNavigate?: (path: string) => void;
  onGoBack?: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onNavigate, onGoBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'ensaios'
    | 'criticas'
    | 'estreias'
    | 'filmes'
    | 'pessoas'
    | 'cineastas'
    | 'uma_imagem'
    | 'listas'
    | 'especiais'
    | 'tags'
    | 'midia'
    | 'dados'
  >('overview');

  const [autoCreateTab, setAutoCreateTab] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewItemData, setPreviewItemData] = useState<{ item: any; type: any } | null>(null);
  const [pessoasCount, setPessoasCount] = useState<number | null>(null);
  const [filmesCount, setFilmesCount] = useState<number | null>(null);
  const [criticasCount, setCriticasCount] = useState<number | null>(null);
  const [ensaiosCount, setEnsaiosCount] = useState<number | null>(null);

  const loadCounts = async () => {
    const [pesRes, filmRes, critRes, ensRes] = await Promise.all([
      fetchPessoas({ allStatuses: true }),
      fetchFilmes({ allStatuses: true }),
      fetchCriticas({ allStatuses: true }),
      fetchEnsaios({ allStatuses: true }),
    ]);
    if (pesRes.data) {
      setPessoasCount(pesRes.data.length);
    }
    if (filmRes.data) {
      setFilmesCount(filmRes.data.length);
    }
    if (critRes.data) {
      setCriticasCount(critRes.data.length);
    }
    if (ensRes.data) {
      setEnsaiosCount(ensRes.data.length);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    loadCounts();
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadCounts();
    }
  }, [isAuthenticated, activeTab]);

  // Restore and validate session on mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        if (isMounted) {
          setIsAuthenticated(false);
          setIsCheckingAuth(false);
        }
        return;
      }

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session || !session.user) {
          if (isMounted) {
            setIsAuthenticated(false);
            setCurrentUserEmail(null);
            setIsCheckingAuth(false);
          }
          return;
        }

        // Session exists, strictly validate admin role via is_admin() RPC
        const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');

        if (isMounted) {
          if (!rpcError && isAdmin === true) {
            setIsAuthenticated(true);
            setCurrentUserEmail(session.user.email || null);
          } else {
            // Not an admin: sign out immediately
            await supabase.auth.signOut();
            setIsAuthenticated(false);
            setCurrentUserEmail(null);
          }
          setIsCheckingAuth(false);
        }
      } catch (err) {
        if (isMounted) {
          setIsAuthenticated(false);
          setCurrentUserEmail(null);
          setIsCheckingAuth(false);
        }
      }
    };

    restoreSession();

    // Listen to Supabase auth state changes
    const supabase = getSupabaseClient();
    const { data: authListener } = supabase?.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        setCurrentUserEmail(null);
      }
    }) || { data: null };

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthError('Cliente Supabase não configurado. Verifique as variáveis de ambiente.');
      setAuthLoading(false);
      return;
    }

    try {
      const cleanEmail = email.trim();

      // 1. Authenticate with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        setAuthError('Credenciais inválidas. Verifique seu e-mail e senha.');
        setAuthLoading(false);
        return;
      }

      // 2. Validate admin role via public.is_admin() RPC
      const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');

      if (rpcError || isAdmin !== true) {
        // Unauthorized role: immediately sign out and reject
        await supabase.auth.signOut();
        setAuthError('Acesso não autorizado. Esta conta não possui privilégios de administrador.');
        setIsAuthenticated(false);
        setCurrentUserEmail(null);
        setAuthLoading(false);
        return;
      }

      // 3. Authorized admin
      setIsAuthenticated(true);
      setCurrentUserEmail(data.user.email || cleanEmail);
      setPassword('');
      showToast('Sessão iniciada no Painel Editorial Lanterna Mágica.');
    } catch (err: any) {
      setAuthError('Ocorreu um erro ao processar a autenticação. Tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (_) {}
    }
    setIsAuthenticated(false);
    setCurrentUserEmail(null);
    showToast('Sessão encerrada com sucesso.');
  };

  const handleNavigateTab = (tab: any, create = false) => {
    setActiveTab(tab);
    setAutoCreateTab(create);
  };

  // INITIAL LOADING CHECK
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col justify-center items-center p-4">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#1A1A1A]/60">
            LANTERNA MÁGICA · CMS
          </span>
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#1A1A1A]/70">
            <div className="w-4 h-4 border-2 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
            <span>Verificando sessão editorial...</span>
          </div>
        </div>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F2ED] flex flex-col justify-center items-center p-4">
        {/* Back Button */}
        <div className="w-full max-w-md mb-4 flex items-center justify-start">
          <button
            type="button"
            onClick={onGoBack || (() => onNavigate?.('/'))}
            className="inline-flex items-center gap-2 text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A] hover:text-[#1A1A1A]/70 bg-white px-3.5 py-2 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-all shadow-xs"
            title="Voltar para a página anterior do site"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao site</span>
          </button>
        </div>

        <div className="w-full max-w-md bg-white border border-[#1A1A1A] p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2 border-b border-[#1A1A1A]/15 pb-6">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#1A1A1A]/60">
              LANTERNA MÁGICA · CMS
            </span>
            <h1 className="font-serif-display text-2xl text-[#1A1A1A]">Acesso Editorial</h1>
            <p className="text-xs font-serif-body text-[#1A1A1A]/70">
              Painel de administração e publicação do acervo cultural
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs font-sans">
            <div>
              <label className="block font-bold uppercase text-[#1A1A1A]/80 mb-1">E-mail do Administrador</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ex: redacao@lanternamagica.com"
                disabled={authLoading}
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-3 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block font-bold uppercase text-[#1A1A1A]/80 mb-1">Senha de Acesso</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha de acesso..."
                disabled={authLoading}
                className="w-full bg-[#F5F2ED] border border-[#1A1A1A]/15 p-3 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] disabled:opacity-50"
              />
            </div>

            {authError && (
              <p className="text-xs font-mono text-red-600 font-bold bg-red-50 p-2.5 border border-red-200">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock size={14} />
              <span>{authLoading ? 'Autenticando...' : 'Entrar no Painel'}</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // LOGGED IN ADMIN DASHBOARD
  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1A1A1A] text-[#F5F2ED] px-4 py-3 text-xs font-mono border border-[#1A1A1A] shadow-2xl flex items-center gap-2 animate-fade-in">
          <CheckCircle size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Header */}
      <header className="bg-[#1A1A1A] text-[#F5F2ED] border-b border-[#1A1A1A] px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={onGoBack || (() => onNavigate?.('/'))}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F5F2ED]/10 hover:bg-[#F5F2ED] text-[#F5F2ED] hover:text-[#1A1A1A] border border-[#F5F2ED]/25 text-xs font-sans font-bold uppercase tracking-wider transition-all"
              title="Voltar para a página anterior do site"
            >
              <ArrowLeft size={16} />
              <span>Voltar ao site</span>
            </button>

            <div className="h-5 w-[1px] bg-[#F5F2ED]/20" />

            <span className="font-serif-display text-xl tracking-tight text-[#F5F2ED]">
              LANTERNA MÁGICA
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#F5F2ED] text-[#1A1A1A] font-bold uppercase">
              PAINEL EDITORIAL
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#F5F2ED]/70">
            <span className="hidden sm:inline">
              Conectado como <strong>{currentUserEmail || 'Administrador'}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800 text-red-200 border border-red-700/50 text-xs font-sans uppercase font-bold flex items-center gap-1.5 transition-colors"
            >
              <LogOut size={12} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        
        {/* Navigation Tabs Bar */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-[#1A1A1A]/15 text-xs font-sans uppercase font-bold text-[#1A1A1A]/70">
          <button
            onClick={() => handleNavigateTab('overview')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'overview'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>Painel Geral</span>
          </button>

          <button
            onClick={() => handleNavigateTab('ensaios')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'ensaios'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <FileText size={14} />
            <span>Ensaios ({ensaiosCount !== null ? ensaiosCount : '...'})</span>
          </button>

          <button
            onClick={() => handleNavigateTab('criticas')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'criticas'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <Film size={14} />
            <span>Críticas ({criticasCount !== null ? criticasCount : '...'})</span>
          </button>

          <button
            onClick={() => handleNavigateTab('estreias')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'estreias'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <Folder size={14} />
            <span>Estreias ({cmsStore.getEstreias(false).length})</span>
          </button>

          <button
            onClick={() => handleNavigateTab('filmes')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'filmes'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <Plus size={14} />
            <span>Catálogo Filmes ({filmesCount !== null ? filmesCount : '...'})</span>
          </button>

          <button
            onClick={() => handleNavigateTab('pessoas')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'pessoas'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <User size={14} />
            <span>Pessoas ({pessoasCount !== null ? pessoasCount : '...'})</span>
          </button>

          <button
            onClick={() => handleNavigateTab('cineastas')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'cineastas'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <User size={14} />
            <span>Cineastas ({cmsStore.getCineastas().length})</span>
          </button>

          <button
            onClick={() => handleNavigateTab('uma_imagem')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'uma_imagem'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <Sparkles size={14} />
            <span>Uma Imagem ({cmsStore.getUmaImagemList(false).length})</span>
          </button>

          <button
            onClick={() => handleNavigateTab('listas')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'listas'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <ListIcon size={14} />
            <span>Listas ({cmsStore.getListas(false).length})</span>
          </button>

          <button
            onClick={() => handleNavigateTab('especiais')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'especiais'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <Folder size={14} />
            <span>Especiais ({cmsStore.getEspeciais(false).length})</span>
          </button>

          <button
            onClick={() => handleNavigateTab('tags')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'tags'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <TagIcon size={14} />
            <span>Tags</span>
          </button>

          <button
            onClick={() => handleNavigateTab('midia')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              activeTab === 'midia'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <ImageIcon size={14} />
            <span>Mídia</span>
          </button>

          <button
            onClick={() => handleNavigateTab('dados')}
            className={`px-3 py-2 border whitespace-nowrap flex items-center gap-1.5 transition-colors ml-auto ${
              activeTab === 'dados'
                ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A]/70 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
            }`}
          >
            <Database size={14} />
            <span>Backup / Banco</span>
          </button>
        </nav>

        {/* Tab Views */}
        <main>
          {activeTab === 'overview' && (
            <DashboardOverview
              onNavigateTab={handleNavigateTab}
              onPreviewItem={(item, type) => setPreviewItemData({ item, type })}
            />
          )}

          {activeTab === 'ensaios' && (
            <EnsaiosAdmin
              onNotify={showToast}
              autoCreate={autoCreateTab}
            />
          )}

          {activeTab === 'criticas' && (
            <CriticasAdmin
              onNotify={showToast}
              autoCreate={autoCreateTab}
            />
          )}

          {activeTab === 'estreias' && <EstreiasAdmin />}

          {activeTab === 'filmes' && (
            <FilmesAdmin
              onNotify={showToast}
              autoCreate={autoCreateTab}
            />
          )}

          {activeTab === 'pessoas' && (
            <PessoasAdmin
              onNotify={showToast}
              autoCreate={autoCreateTab}
            />
          )}

          {activeTab === 'cineastas' && (
            <CineastasAdmin
              onNotify={showToast}
              autoCreate={autoCreateTab}
            />
          )}

          {activeTab === 'uma_imagem' && (
            <UmaImagemAdmin
              onNotify={showToast}
              autoCreate={autoCreateTab}
            />
          )}

          {activeTab === 'listas' && (
            <ListasAdmin
              onNotify={showToast}
              autoCreate={autoCreateTab}
            />
          )}

          {activeTab === 'especiais' && (
            <EspeciaisAdmin
              onNotify={showToast}
              autoCreate={autoCreateTab}
            />
          )}

          {activeTab === 'tags' && <TagsAdmin onNotify={showToast} />}

          {activeTab === 'midia' && <MediaAdmin onNotify={showToast} />}

          {activeTab === 'dados' && (
            <DataBackupAdmin
              onNotify={showToast}
              onRefresh={() => {
                // Manter o usuário na aba atual para preservar visualização de auditoria e relatórios
              }}
            />
          )}
        </main>
      </div>

      {/* Global Preview Modal */}
      {previewItemData && (
        <ArticlePreviewModal
          item={previewItemData.item}
          itemType={previewItemData.type}
          onClose={() => setPreviewItemData(null)}
        />
      )}
    </div>
  );
};
