import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Download,
  RefreshCw,
  Trash2,
  Database,
  ShieldCheck,
  History,
  AlertTriangle,
  CheckCircle2,
  Layers,
  FileText,
  Film,
  Users,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Globe,
  Radio,
  ExternalLink,
} from 'lucide-react';
import {
  cmsStore,
  StorageVersionAudit,
  MigrationConflict,
} from '../../services/cmsStore';
import {
  getSupabaseCredentials,
  testSupabaseConnection,
} from '../../services/supabaseClient';
import { ConfirmModal } from '../../components/admin/ConfirmModal';
import { SupabaseMigrationPanel } from '../../components/admin/SupabaseMigrationPanel';

interface DataBackupAdminProps {
  onNotify: (msg: string) => void;
  onRefresh: () => void;
}

export const DataBackupAdmin: React.FC<DataBackupAdminProps> = ({ onNotify, onRefresh }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [audits, setAudits] = useState<StorageVersionAudit[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [demoAudit, setDemoAudit] = useState<ReturnType<typeof cmsStore.detectDemoItemsInCurrentData> | null>(null);

  // Supabase test state
  const [supabaseTest, setSupabaseTest] = useState<{
    loading: boolean;
    result: {
      connected: boolean;
      url: string;
      maskedKey: string;
      message: string;
      latencyMs?: number;
    } | null;
  }>({ loading: false, result: null });


  // Migration Preview & Execution state
  const [selectedVersionForRestore, setSelectedVersionForRestore] = useState<string | null>(null);
  const [migrationPreview, setMigrationPreview] = useState<ReturnType<typeof cmsStore.previewRestoreFromVersion> | null>(null);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, 'keep_current' | 'use_incoming' | 'keep_both'>>({});

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    isDanger: boolean;
    onConfirm: () => void;
  } | null>(null);

  const refreshAudits = () => {
    const list = cmsStore.auditStorageVersions();
    setAudits(list);
    const demos = cmsStore.detectDemoItemsInCurrentData();
    setDemoAudit(demos);
  };

  useEffect(() => {
    refreshAudits();
  }, []);

  const handleOpenRestoreModal = (versionKey: string) => {
    const preview = cmsStore.previewRestoreFromVersion(versionKey);
    setSelectedVersionForRestore(versionKey);
    setMigrationPreview(preview);
    setConflictResolutions({});
  };

  const handleExecuteRestore = () => {
    if (!selectedVersionForRestore) return;

    const result = cmsStore.executeRestoreFromVersion(selectedVersionForRestore, conflictResolutions);
    if (result.success) {
      onRefresh();
      refreshAudits();
      setSelectedVersionForRestore(null);
      setMigrationPreview(null);
      onNotify(
        `Conteúdos da ${selectedVersionForRestore} recuperados com sucesso! Backup de segurança salvo sob: ${result.backupKey}`
      );
    } else {
      onNotify('Erro ao recuperar dados da versão selecionada.');
    }
  };

  const handleRemoveDemos = () => {
    const demoCount = demoAudit?.totalDemoCount || 0;
    setModalConfig({
      isOpen: true,
      title: 'Remover Registros Demonstrativos (DEMO)',
      message: `Deseja remover ${demoCount} itens demonstrativos originais? Seus conteúdos reais e quaisquer itens demonstrativos que você tenha editado serão 100% preservados. Um backup de segurança será gerado antes da exclusão.`,
      confirmLabel: 'Remover Somente Demos',
      isDanger: true,
      onConfirm: () => {
        const res = cmsStore.removeUnmodifiedDemoContent();
        onRefresh();
        refreshAudits();
        onNotify(`Itens DEMO removidos com sucesso! Backup prévio gerado: ${res.backupKey}`);
        setModalConfig(null);
      },
    });
  };

  const handleDownloadConsolidatedBackup = () => {
    const jsonStr = cmsStore.getConsolidatedAllVersionsBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lanterna_magica_TODAS_VERSOES_CONSOLIDADAS_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Backup consolidado de todas as versões exportado com sucesso!');
  };

  const handleExportCurrentBackup = () => {
    const rawData = cmsStore.getRawData();
    const jsonStr = JSON.stringify(rawData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lanterna_magica_v4_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('Backup JSON da versão atual exportado com sucesso!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        // Criar backup prévio
        cmsStore.createSafetyBackup('pre_file_import');
        const success = cmsStore.importBackup(content);
        if (success) {
          onRefresh();
          refreshAudits();
          onNotify('Backup JSON importado e restaurado com sucesso!');
        } else {
          onNotify('Erro ao importar arquivo JSON. Verifique a formatação do arquivo.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    setModalConfig({
      isOpen: true,
      title: 'Inicializar CMS vazio',
      message: 'ATENÇÃO: Deseja realmente inicializar o CMS do zero? Todos os dados editoriais locais (publicações, filmes, pessoas, estreias e mídias) serão zerados. Um backup de segurança será criado antes.',
      confirmLabel: 'Inicializar CMS vazio',
      isDanger: true,
      onConfirm: () => {
        cmsStore.createSafetyBackup('pre_initialize_empty_cms');
        cmsStore.clearAllData();
        onRefresh();
        refreshAudits();
        onNotify('CMS inicializado com sucesso (0 publicações, 0 filmes, 0 pessoas).');
        setModalConfig(null);
      },
    });
  };

  const handleSeedDemo = () => {
    setModalConfig({
      isOpen: true,
      title: 'Restaurar Acervo Demonstrativo Padrão',
      message: 'Deseja reinicializar o banco com os modelos demonstrativos originais?',
      confirmLabel: 'Restaurar Demos',
      isDanger: false,
      onConfirm: () => {
        cmsStore.createSafetyBackup('pre_seed_demo');
        cmsStore.seedDemoData();
        onRefresh();
        refreshAudits();
        onNotify('Dados demonstrativos restaurados com sucesso!');
        setModalConfig(null);
      },
    });
  };

  const handleRunSupabaseTest = async () => {
    setSupabaseTest((prev) => ({ ...prev, loading: true }));
    const result = await testSupabaseConnection();
    setSupabaseTest({ loading: false, result });
    if (result.connected) {
      onNotify('Conexão com o Supabase testada com sucesso!');
    } else {
      onNotify('Supabase: ' + result.message);
    }
  };

  const activeAudit = audits.find((a) => a.isCurrentKey);
  const legacyAuditsWithData = audits.filter(
    (a) =>
      !a.isCurrentKey &&
      a.exists &&
      (a.realItemsCount > 0 ||
        Object.values(a.itemCounts).some((c) => Number(c) > 0))
  );

  const creds = getSupabaseCredentials();
  const isSupabaseConfigured = Boolean(creds.url && creds.anonKey);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1A1A1A]/15 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif-display text-2xl text-[#1A1A1A]">
              Auditoria de Dados, Migração & Backups
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300">
              <ShieldCheck size={12} />
              Proteção Permanente Ativa
            </span>
          </div>
          <p className="text-xs font-serif-body text-[#1A1A1A]/70 mt-1">
            Audite as versões armazenadas no seu navegador, restaure conteúdos anteriores de forma não-destrutiva e gerencie backups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshAudits}
            className="py-2 px-3 bg-white border border-[#1A1A1A]/20 text-[#1A1A1A] text-xs font-sans font-bold uppercase hover:bg-[#F5F2ED] transition-colors flex items-center gap-1.5"
            title="Recarregar auditoria de versões"
          >
            <RefreshCw size={13} />
            <span>Recarregar Auditoria</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadConsolidatedBackup}
            className="py-2 px-3 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center gap-1.5"
            title="Download de todas as chaves do navegador em um único arquivo"
          >
            <Download size={13} />
            <span>Baixar Todas as Versões (JSON)</span>
          </button>
        </div>
      </div>

      {/* SUPABASE CONNECTION STATUS & STAGING CARD */}
      <div className="bg-white border border-[#1A1A1A]/20 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1A1A1A]/10 pb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1A1A1A] text-[#F5F2ED] flex items-center justify-center font-bold text-xs font-mono">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-display text-lg text-[#1A1A1A]">
                  Integração com Supabase (Em Preparação)
                </h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider ${
                    isSupabaseConfigured
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {isSupabaseConfigured ? 'Credenciais Detectadas' : 'Aguardando Variáveis de Ambiente'}
                </span>
              </div>
              <p className="text-xs font-serif-body text-[#1A1A1A]/70">
                Fase 1: Preparação de conexão segura (sem escrita, sem alteração de dados e sem remover o localStorage).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunSupabaseTest}
            disabled={supabaseTest.loading}
            className="py-2 px-4 bg-[#1A1A1A] text-white text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            {supabaseTest.loading ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Radio size={13} />
            )}
            <span>{supabaseTest.loading ? 'Testando Conexão...' : 'Testar Conexão Supabase'}</span>
          </button>
        </div>

        {/* Configuration summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-3 bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-stone-500 font-bold uppercase text-[10px] block">
              URL do Projeto (NEXT_PUBLIC_SUPABASE_URL ou VITE_SUPABASE_URL)
            </span>
            <code className="text-stone-900 font-mono text-[11px] block truncate">
              {creds.url ? creds.url : 'Não informada'}
            </code>
          </div>

          <div className="p-3 bg-stone-50 border border-stone-200 space-y-1">
            <span className="text-stone-500 font-bold uppercase text-[10px] block">
              Chave Pública (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_ANON_KEY)
            </span>
            <code className="text-stone-900 font-mono text-[11px] block truncate">
              {creds.anonKey ? `${creds.anonKey.slice(0, 12)}...${creds.anonKey.slice(-6)} (Oculta por Segurança)` : 'Não informada'}
            </code>
          </div>
        </div>

        {/* Test Result Feedback */}
        {supabaseTest.result && (
          <div
            className={`p-4 border text-xs font-sans space-y-1 ${
              supabaseTest.result.connected
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {supabaseTest.result.connected ? (
                <CheckCircle2 size={16} className="text-emerald-700" />
              ) : (
                <AlertTriangle size={16} className="text-amber-700" />
              )}
              <span>
                {supabaseTest.result.connected
                  ? 'Status: Conectado com Sucesso!'
                  : 'Status: Não foi possível conectar'}
              </span>
              {supabaseTest.result.latencyMs !== undefined && (
                <span className="text-[10px] bg-white/70 px-1.5 py-0.5 rounded font-mono">
                  {supabaseTest.result.latencyMs}ms
                </span>
              )}
            </div>
            <p className="leading-relaxed pl-6">{supabaseTest.result.message}</p>
          </div>
        )}

        <div className="p-3 bg-stone-50 border-l-2 border-stone-400 text-[11px] font-sans text-stone-600 space-y-1">
          <p>
            <strong>Garantia de Segurança:</strong> O cliente Supabase configurado utiliza estritamente a chave pública/anon no frontend. As tabelas do banco e o storage permanecem isolados e seus dados locais continuam intactos no armazenamento local.
          </p>
        </div>
      </div>

      {/* PAINEL DE MIGRAÇÃO DEFINITIVA PARA O SUPABASE */}
      <SupabaseMigrationPanel onNotify={onNotify} onRefresh={onRefresh} />


      {/* Safety Notice Banner */}
      <div className="p-4 bg-stone-50 border-l-4 border-[#1A1A1A] text-xs font-sans text-[#1A1A1A]/85 space-y-1">
        <p className="font-bold flex items-center gap-1.5 text-stone-900">
          <CheckCircle2 size={14} className="text-emerald-700" />
          Como funciona a Proteção e Recuperação Não-Destrutiva:
        </p>
        <p className="text-stone-700 leading-relaxed">
          O Lanterna Mágica armazena seus dados no armazenamento local do navegador. Quando novas entidades são adicionadas (*Filmes, Pessoas e Estreias*), as chaves antigas (*v3, v2, v1*) continuam guardadas com segurança no seu navegador. O assistente abaixo permite que você inspecione os dados de cada versão e os traga para a versão ativa sem perda de textos, notas, tags ou imagens.
        </p>
      </div>

      {/* AUDITORIA DE VERSÕES */}
      <div className="bg-white border border-[#1A1A1A]/15 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-3">
          <div className="flex items-center gap-2">
            <History size={18} className="text-[#1A1A1A]" />
            <h3 className="font-serif-display text-lg text-[#1A1A1A]">
              Auditoria de Versões Encontradas no Seu Navegador
            </h3>
          </div>
          <span className="text-[11px] font-sans text-[#1A1A1A]/60">
            {audits.filter((a) => a.exists).length} versão(ões) detectada(s)
          </span>
        </div>

        <div className="space-y-4">
          {audits.map((audit) => {
            const isExpanded = expandedKey === audit.key;
            const totalItems = Object.values(audit.itemCounts).reduce(
              (acc: number, val: any) => acc + (Number(val) || 0),
              0
            );

            return (
              <div
                key={audit.key}
                className={`border transition-all ${
                  audit.isCurrentKey
                    ? 'border-[#1A1A1A] bg-stone-50/60'
                    : audit.exists
                    ? 'border-[#1A1A1A]/20 bg-white hover:border-[#1A1A1A]/40'
                    : 'border-dashed border-[#1A1A1A]/15 bg-stone-50/20 opacity-60'
                }`}
              >
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif-display text-base font-bold text-[#1A1A1A]">
                        {audit.label}
                      </span>
                      <code className="text-[11px] font-mono bg-stone-100 px-1.5 py-0.5 text-stone-700 border border-stone-200">
                        {audit.key}
                      </code>
                      {audit.isCurrentKey && (
                        <span className="px-2 py-0.5 text-[9px] font-sans font-bold uppercase bg-[#1A1A1A] text-white">
                          Versão Ativa Atual
                        </span>
                      )}
                      {!audit.exists && (
                        <span className="px-2 py-0.5 text-[9px] font-sans uppercase bg-stone-100 text-stone-500">
                          Não encontrada neste navegador
                        </span>
                      )}
                    </div>

                    {audit.exists && (
                      <div className="flex items-center gap-4 text-xs font-sans text-stone-600 flex-wrap pt-1">
                        <span>
                          Total de publicações/itens: <strong>{totalItems}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Itens Reais: <strong className="text-emerald-700">{audit.realItemsCount}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Itens Modelo/DEMO: <strong className="text-stone-500">{audit.demoItemsCount}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {audit.exists && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setExpandedKey(isExpanded ? null : audit.key)}
                        className="py-1.5 px-3 bg-white border border-[#1A1A1A]/20 text-[#1A1A1A] text-xs font-sans font-bold uppercase hover:bg-stone-100 transition-colors flex items-center gap-1"
                      >
                        <span>{isExpanded ? 'Ocultar Detalhes' : 'Inspecionar Detalhes'}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {!audit.isCurrentKey && (
                        <button
                          type="button"
                          onClick={() => handleOpenRestoreModal(audit.key)}
                          className="py-1.5 px-3 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center gap-1"
                        >
                          <History size={13} />
                          <span>Restaurar / Mesclar</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* EXPANDED CONTENT VIEW */}
                {isExpanded && audit.exists && (
                  <div className="border-t border-[#1A1A1A]/10 p-4 bg-stone-50/50 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-xs font-sans">
                      <div className="bg-white p-2.5 border border-stone-200">
                        <span className="text-stone-500 block text-[10px] uppercase font-bold">Ensaios</span>
                        <span className="text-base font-bold text-stone-900">{audit.itemCounts.ensaios}</span>
                      </div>
                      <div className="bg-white p-2.5 border border-stone-200">
                        <span className="text-stone-500 block text-[10px] uppercase font-bold">Críticas</span>
                        <span className="text-base font-bold text-stone-900">{audit.itemCounts.criticas}</span>
                      </div>
                      <div className="bg-white p-2.5 border border-stone-200">
                        <span className="text-stone-500 block text-[10px] uppercase font-bold">Uma Imagem</span>
                        <span className="text-base font-bold text-stone-900">{audit.itemCounts.umaImagem}</span>
                      </div>
                      <div className="bg-white p-2.5 border border-stone-200">
                        <span className="text-stone-500 block text-[10px] uppercase font-bold">Cineastas / Pessoas</span>
                        <span className="text-base font-bold text-stone-900">
                          {(audit.itemCounts.cineastas || 0) + (audit.itemCounts.pessoas || 0)}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 border border-stone-200">
                        <span className="text-stone-500 block text-[10px] uppercase font-bold">Filmes</span>
                        <span className="text-base font-bold text-stone-900">{audit.itemCounts.filmes}</span>
                      </div>
                      <div className="bg-white p-2.5 border border-stone-200">
                        <span className="text-stone-500 block text-[10px] uppercase font-bold">Listas & Especiais</span>
                        <span className="text-base font-bold text-stone-900">
                          {audit.itemCounts.listas + audit.itemCounts.especiais}
                        </span>
                      </div>
                    </div>

                    {/* Titles inspection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans pt-2">
                      {audit.sampleTitles.ensaios.length > 0 && (
                        <div className="bg-white p-3 border border-stone-200 space-y-1">
                          <strong className="text-stone-900 block border-b border-stone-100 pb-1">
                            Amostra de Ensaios nesta versão:
                          </strong>
                          <ul className="list-disc list-inside space-y-0.5 text-stone-700">
                            {audit.sampleTitles.ensaios.map((t, idx) => (
                              <li key={idx} className="truncate" title={t}>
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {audit.sampleTitles.criticas.length > 0 && (
                        <div className="bg-white p-3 border border-stone-200 space-y-1">
                          <strong className="text-stone-900 block border-b border-stone-100 pb-1">
                            Amostra de Críticas nesta versão:
                          </strong>
                          <ul className="list-disc list-inside space-y-0.5 text-stone-700">
                            {audit.sampleTitles.criticas.map((t, idx) => (
                              <li key={idx} className="truncate" title={t}>
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {audit.sampleTitles.cineastas.length > 0 && (
                        <div className="bg-white p-3 border border-stone-200 space-y-1">
                          <strong className="text-stone-900 block border-b border-stone-100 pb-1">
                            Cineastas cadastrados:
                          </strong>
                          <ul className="list-disc list-inside space-y-0.5 text-stone-700">
                            {audit.sampleTitles.cineastas.map((t, idx) => (
                              <li key={idx} className="truncate">
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {audit.sampleTitles.listas.length > 0 && (
                        <div className="bg-white p-3 border border-stone-200 space-y-1">
                          <strong className="text-stone-900 block border-b border-stone-100 pb-1">
                            Listas e Especiais:
                          </strong>
                          <ul className="list-disc list-inside space-y-0.5 text-stone-700">
                            {audit.sampleTitles.listas.concat(audit.sampleTitles.especiais).map((t, idx) => (
                              <li key={idx} className="truncate" title={t}>
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* GESTÃO DE CONTEÚDOS DEMONSTRATIVOS (DEMO) */}
      <div className="bg-white border border-[#1A1A1A]/15 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1A1A1A]/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-[#1A1A1A]" />
            <h3 className="font-serif-display text-lg text-[#1A1A1A]">
              Gestão de Conteúdos Demonstrativos (DEMO)
            </h3>
          </div>
          <span className="text-xs font-sans text-stone-600">
            Demos não-modificados no banco ativo: <strong>{demoAudit?.totalDemoCount || 0}</strong>
          </span>
        </div>

        <p className="text-xs font-sans text-[#1A1A1A]/80 leading-relaxed">
          Esta ferramenta identifica com precisão cirúrgica apenas os registros de exemplo inseridos como modelo (como <em>Persona, Anatomia de uma Queda, Bergman, Ozu</em>). 
          <strong> Caso você tenha editado qualquer um desses itens e colocado seu próprio texto/título, ele será protegido e NÃO será apagado.</strong>
        </p>

        {demoAudit && demoAudit.totalDemoCount > 0 ? (
          <div className="bg-stone-50 border border-stone-200 p-4 space-y-3">
            <div className="text-xs font-sans text-stone-700 space-y-1">
              <span className="font-bold block text-stone-900">
                Itens DEMO identificados na versão atual:
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {demoAudit.ensaios.length > 0 && (
                  <span className="px-2 py-0.5 bg-white border border-stone-300 text-stone-700 text-[11px]">
                    Ensaios DEMO: {demoAudit.ensaios.length} ({demoAudit.ensaios.map((e) => e.title.slice(0, 20) + '...').join(', ')})
                  </span>
                )}
                {demoAudit.criticas.length > 0 && (
                  <span className="px-2 py-0.5 bg-white border border-stone-300 text-stone-700 text-[11px]">
                    Críticas DEMO: {demoAudit.criticas.length} ({demoAudit.criticas.map((c) => c.movieTitle).join(', ')})
                  </span>
                )}
                {demoAudit.filmes.length > 0 && (
                  <span className="px-2 py-0.5 bg-white border border-stone-300 text-stone-700 text-[11px]">
                    Filmes DEMO: {demoAudit.filmes.length}
                  </span>
                )}
                {demoAudit.pessoas.length > 0 && (
                  <span className="px-2 py-0.5 bg-white border border-stone-300 text-stone-700 text-[11px]">
                    Pessoas DEMO: {demoAudit.pessoas.length}
                  </span>
                )}
                {demoAudit.estreias.length > 0 && (
                  <span className="px-2 py-0.5 bg-white border border-stone-300 text-stone-700 text-[11px]">
                    Estreias DEMO: {demoAudit.estreias.length}
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleRemoveDemos}
                className="py-2.5 px-4 bg-stone-900 text-white text-xs font-sans font-bold uppercase tracking-wider hover:bg-stone-800 transition-colors flex items-center gap-2"
              >
                <Trash2 size={13} />
                <span>Remover Conteúdos Demonstrativos (DEMO)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-sans text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>Nenhum conteúdo demonstrativo não-modificado detectado no banco ativo. O acervo contém apenas suas publicações reais.</span>
          </div>
        )}
      </div>

      {/* EXPORTAR & IMPORTAR BACKUPS GERAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white border border-[#1A1A1A]/15 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1A1A1A]/10 pb-3">
            <Database size={18} className="text-[#1A1A1A]" />
            <h3 className="font-serif-display text-lg text-[#1A1A1A]">Arquivo JSON Externo</h3>
          </div>

          <p className="text-xs font-sans text-[#1A1A1A]/80 leading-relaxed">
            Faça download do arquivo JSON completo com todas as publicações da versão atual ou restaure de um arquivo que você tenha salvo anteriormente.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={handleExportCurrentBackup}
              className="w-full py-3 px-4 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={14} />
              <span>Baixar Backup Atual v4 (JSON)</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-white border border-[#1A1A1A]/20 text-[#1A1A1A] text-xs font-sans font-bold uppercase hover:bg-[#F5F2ED] transition-colors flex items-center justify-center gap-2"
            >
              <Upload size={14} />
              <span>Restaurar de um Arquivo Backup JSON</span>
            </button>
          </div>
        </div>

        <div className="p-6 bg-white border border-[#1A1A1A]/15 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1A1A1A]/10 pb-3">
            <RefreshCw size={18} className="text-[#1A1A1A]" />
            <h3 className="font-serif-display text-lg text-[#1A1A1A]">Inicialização e Testes</h3>
          </div>

          <p className="text-xs font-sans text-[#1A1A1A]/80 leading-relaxed">
            Inicialize o CMS vazio para começar a cadastrar publicações, filmes e pessoas do zero ou reinicialize com os artigos demonstrativos padrão.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={handleClearAll}
              className="w-full py-3 px-4 bg-red-50 border border-red-300 text-red-700 text-xs font-sans font-bold uppercase hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={14} />
              <span>Inicializar CMS vazio</span>
            </button>

            <button
              type="button"
              onClick={handleSeedDemo}
              className="w-full py-3 px-4 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs font-sans font-bold uppercase hover:bg-[#1A1A1A] hover:text-[#F5F2ED] transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} />
              <span>Restaurar Acervo Demonstrativo Padrão</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE RESTAURAÇÃO E RESOLUÇÃO DE CONFLITOS */}
      {selectedVersionForRestore && migrationPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#1A1A1A] max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-stone-200 pb-3">
              <h3 className="font-serif-display text-xl text-stone-900">
                Restaurar e Mesclar Dados da {selectedVersionForRestore}
              </h3>
              <p className="text-xs font-sans text-stone-600 mt-1">
                Uma cópia de segurança do banco atual será gerada automaticamente antes da importação.
              </p>
            </div>

            {/* Resume of items to be restored */}
            <div className="bg-stone-50 border border-stone-200 p-4 space-y-3">
              <h4 className="font-bold text-xs font-sans uppercase text-stone-900">
                Itens a serem recuperados e integrados na Versão Ativa:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-sans">
                <div className="bg-white p-2 border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">Ensaios</span>
                  <span className="font-bold text-stone-900">+{migrationPreview.newItemsCount.ensaios}</span>
                </div>
                <div className="bg-white p-2 border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">Críticas</span>
                  <span className="font-bold text-stone-900">+{migrationPreview.newItemsCount.criticas}</span>
                </div>
                <div className="bg-white p-2 border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">Cineastas / Pessoas</span>
                  <span className="font-bold text-stone-900">
                    +{migrationPreview.newItemsCount.cineastas + migrationPreview.newItemsCount.pessoas}
                  </span>
                </div>
                <div className="bg-white p-2 border border-stone-200">
                  <span className="text-stone-500 block text-[10px]">Listas & Especiais</span>
                  <span className="font-bold text-stone-900">
                    +{migrationPreview.newItemsCount.listas + migrationPreview.newItemsCount.especiais}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-sans text-stone-600 space-y-1 pt-1">
                <p>✓ As Críticas importadas gerarão automaticamente as fichas técnicas em <strong>Filmes</strong> caso não existam.</p>
                <p>✓ Os Cineastas importados serão vinculados à nova entidade <strong>Pessoas</strong> sem duplicatas.</p>
                <p>✓ Todos os textos, imagens, notas, tags, slugs e marcações de destaque serão 100% preservados.</p>
              </div>
            </div>

            {/* CONFLICT RESOLUTION UI */}
            {migrationPreview.conflicts.length > 0 && (
              <div className="border border-amber-300 bg-amber-50/60 p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs font-sans">
                  <AlertTriangle size={15} />
                  <span>Conflitos detectados entre conteúdos reais ({migrationPreview.conflicts.length}):</span>
                </div>
                <p className="text-[11px] font-sans text-amber-800">
                  Os itens abaixo já possuem um registro real com mesmo slug/id. Escolha como deseja tratá-los:
                </p>

                <div className="space-y-3 pt-2">
                  {migrationPreview.conflicts.map((c) => {
                    const currentRes = conflictResolutions[c.id] || 'keep_current';
                    return (
                      <div key={c.id} className="bg-white p-3 border border-amber-200 text-xs font-sans space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-stone-900 uppercase text-[10px]">
                              {c.type}: {c.currentTitle}
                            </span>
                            <span className="block text-[11px] text-stone-500">
                              Versão antiga contém: &quot;{c.incomingTitle}&quot; (slug: {c.incomingSlug})
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setConflictResolutions((prev) => ({ ...prev, [c.id]: 'keep_current' }))
                            }
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase border ${
                              currentRes === 'keep_current'
                                ? 'bg-stone-900 text-white border-stone-900'
                                : 'bg-stone-100 text-stone-700 border-stone-300'
                            }`}
                          >
                            Manter Atual
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConflictResolutions((prev) => ({ ...prev, [c.id]: 'use_incoming' }))
                            }
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase border ${
                              currentRes === 'use_incoming'
                                ? 'bg-stone-900 text-white border-stone-900'
                                : 'bg-stone-100 text-stone-700 border-stone-300'
                            }`}
                          >
                            Substituir pelo Antigo
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setConflictResolutions((prev) => ({ ...prev, [c.id]: 'keep_both' }))
                            }
                            className={`px-2.5 py-1 text-[10px] font-bold uppercase border ${
                              currentRes === 'keep_both'
                                ? 'bg-stone-900 text-white border-stone-900'
                                : 'bg-stone-100 text-stone-700 border-stone-300'
                            }`}
                          >
                            Manter Ambos (Novo Slug)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedVersionForRestore(null);
                  setMigrationPreview(null);
                }}
                className="py-2.5 px-4 bg-white border border-stone-300 text-stone-700 text-xs font-sans font-bold uppercase hover:bg-stone-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="py-2.5 px-5 bg-stone-900 text-white text-xs font-sans font-bold uppercase tracking-wider hover:bg-stone-800 flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} />
                <span>Confirmar & Restaurar Dados</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {modalConfig && (
        <ConfirmModal
          isOpen={modalConfig.isOpen}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmLabel={modalConfig.confirmLabel}
          isDanger={modalConfig.isDanger}
          onConfirm={modalConfig.onConfirm}
          onClose={() => setModalConfig(null)}
        />
      )}
    </div>
  );
};

