import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Film,
  Users,
  Image as ImageIcon,
  Tag as TagIcon,
  List,
  Sparkles,
  Lock,
  RefreshCw,
  Layers,
  ArrowRight,
  Database,
  Info,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  auditV4Migration,
  executeV4MigrationToSupabase,
  getLastMigrationReport,
  clearLastMigrationReport,
  MigrationAuditReport,
  MigrationExecutionReport,
  MigrationProgressUpdate,
} from '../../services/supabaseMigration';
import { getSupabaseClient } from '../../services/supabaseClient';

interface SupabaseMigrationPanelProps {
  onNotify: (msg: string) => void;
  onRefresh?: () => void;
}

export const SupabaseMigrationPanel: React.FC<SupabaseMigrationPanelProps> = ({
  onNotify,
  onRefresh,
}) => {
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditReport, setAuditReport] = useState<MigrationAuditReport | null>(null);

  const [executing, setExecuting] = useState(false);
  const [progress, setProgress] = useState<MigrationProgressUpdate | null>(null);
  const [executionReport, setExecutionReport] = useState<MigrationExecutionReport | null>(null);

  const [adminCheck, setAdminCheck] = useState<{
    checked: boolean;
    isAdmin: boolean;
    email?: string;
    message?: string;
  }>({ checked: false, isAdmin: false });

  const [confirmedByAdmin, setConfirmedByAdmin] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [copiedErrors, setCopiedErrors] = useState(false);

  // Carregar último relatório de migração persistido no navegador
  useEffect(() => {
    const saved = getLastMigrationReport();
    if (saved) {
      setExecutionReport(saved);
    }
  }, []);

  // Verificar status de admin no Supabase
  const checkAdminStatus = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAdminCheck({
        checked: true,
        isAdmin: false,
        message: 'Supabase não configurado. Verifique as credenciais no AI Studio.',
      });
      return false;
    }

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        setAdminCheck({
          checked: true,
          isAdmin: false,
          message: 'Nenhum usuário logado no Supabase. Faça login administrativo.',
        });
        return false;
      }

      const { data: isAdmin, error: rpcErr } = await supabase.rpc('is_admin');
      if (rpcErr || !isAdmin) {
        setAdminCheck({
          checked: true,
          isAdmin: false,
          email: userData.user.email,
          message: 'Usuário logado não possui privilégio is_admin no Supabase.',
        });
        return false;
      }

      setAdminCheck({
        checked: true,
        isAdmin: true,
        email: userData.user.email,
        message: `Autenticado como administrador (${userData.user.email}).`,
      });
      return true;
    } catch (err: any) {
      setAdminCheck({
        checked: true,
        isAdmin: false,
        message: `Erro na verificação de admin: ${err?.message || err}`,
      });
      return false;
    }
  };

  // FASE A: Auditoria (Somente Leitura)
  const handleRunAudit = async () => {
    setAuditLoading(true);
    try {
      const report = await auditV4Migration();
      setAuditReport(report);
      await checkAdminStatus();
      if (report.isReadyToMigrate) {
        onNotify('Auditoria concluída com sucesso! Todos os registros são compatíveis com o Supabase.');
      } else {
        onNotify('Auditoria concluída com avisos. Verifique os registros bloqueados.');
      }
    } catch (err: any) {
      onNotify(`Erro na auditoria: ${err?.message || err}`);
    } finally {
      setAuditLoading(false);
    }
  };

  // FASE B: Execução Real
  const handleExecuteMigration = async () => {
    if (!confirmedByAdmin) {
      onNotify('Por favor, marque a caixa de confirmação de segurança antes de prosseguir.');
      return;
    }

    const isAdminOk = await checkAdminStatus();
    if (!isAdminOk) {
      onNotify('Acesso negado: É necessário estar autenticado como administrador no Supabase.');
      return;
    }

    setExecuting(true);
    setProgress({ stage: 'Iniciando', percent: 0, message: 'Preparando migração...', timestamp: new Date().toISOString() });

    try {
      const report = await executeV4MigrationToSupabase((p) => {
        setProgress(p);
      });
      setExecutionReport(report);
      if (report.success) {
        onNotify('Migração para o Supabase finalizada com 100% de sucesso!');
      } else {
        onNotify(`Migração finalizada com ${report.errors.length} erro(s). localStorage permanece intacto. Detalhes disponíveis abaixo.`);
      }
      if (onRefresh) onRefresh();
    } catch (err: any) {
      onNotify(`Falha na migração: ${err?.message || err}`);
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyErrors = () => {
    if (!executionReport || executionReport.errors.length === 0) return;
    const text = executionReport.errors
      .map((e, idx) => `${idx + 1}. [Etapa: ${e.step}] ID: ${e.id || 'N/A'}\nErro Supabase: ${e.error}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedErrors(true);
    setTimeout(() => setCopiedErrors(false), 3000);
    onNotify('Lista detalhada de erros copiada para a área de transferência!');
  };

  const handleClearReport = () => {
    clearLastMigrationReport();
    setExecutionReport(null);
    onNotify('Relatório de migração limpo da visualização.');
  };

  return (
    <div className="bg-white border border-[#1A1A1A]/20 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1A1A1A]/10 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-sm">
            <Database size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif-display text-xl text-[#1A1A1A]">
                Migração para Supabase
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider bg-stone-100 text-stone-800 border border-stone-300">
                Fonte: localStorage V4 Dinâmico
              </span>
            </div>
            <p className="text-xs font-serif-body text-[#1A1A1A]/70 mt-0.5">
              Transfere dados da chave ativa do navegador para o banco relacional e Supabase Storage de forma não-destrutiva e idempotente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunAudit}
            disabled={auditLoading || executing}
            className="py-2 px-4 bg-[#1A1A1A] text-white text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#1A1A1A]/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {auditLoading ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Search size={13} />
            )}
            <span>{auditLoading ? 'Auditando...' : '1. Auditar Migração (Somente Leitura)'}</span>
          </button>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-emerald-50/60 border border-emerald-300 text-xs font-sans text-emerald-950 space-y-1">
        <div className="flex items-center gap-2 font-bold text-emerald-900">
          <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
          <span>Garantias Fundamentais de Segurança e Idempotência:</span>
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-emerald-900/90 pl-1 text-[11px] leading-relaxed">
          <li><strong>Zero Modificação no localStorage:</strong> O navegador nunca tem suas chaves apagadas ou alteradas.</li>
          <li><strong>Leitura Dinâmica Real:</strong> Lê estritamente o objeto <code>lanterna_magica_cms_data_v4</code> sem usar dados demonstrativos fixos.</li>
          <li><strong>Upload Automático de Base64 para Storage:</strong> Imagens em Base64 são enviadas para o bucket <code>media</code> e convertidas para URLs públicas; nenhuma string Base64 é despejada no PostgreSQL.</li>
          <li><strong>Idempotência:</strong> A migração pode ser repetida sem duplicar registros no Supabase graças ao mapeamento unívoco de <code>legacy_id</code> e chaves compostas.</li>
        </ul>
      </div>

      {/* RELATÓRIO DE EXECUÇÃO PERSISTENTE (SEMPRE VISÍVEL SE HOUVER RELATÓRIO SALVO) */}
      {executionReport && (
        <div className="p-5 border border-[#1A1A1A]/30 bg-white space-y-5 text-xs font-sans shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-200 pb-3 gap-2">
            <div className="flex items-center gap-2">
              {executionReport.success ? (
                <CheckCircle2 size={20} className="text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle size={20} className="text-amber-700 shrink-0" />
              )}
              <div>
                <h4 className="font-serif-display text-base font-bold text-stone-900">
                  {executionReport.success
                    ? 'Relatório da Última Migração: 100% Sucesso'
                    : `Relatório da Última Migração: Finalizada com ${executionReport.errors.length} erro(s)`}
                </h4>
                <span className="text-[11px] text-stone-500 font-sans">
                  Relatório salvo no navegador · localStorage de origem permanece 100% preservado
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {executionReport.errors.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyErrors}
                  className="py-1.5 px-3 bg-stone-100 border border-stone-300 text-stone-800 text-[11px] font-sans font-bold uppercase hover:bg-stone-200 transition-colors flex items-center gap-1.5"
                >
                  <Copy size={12} />
                  <span>{copiedErrors ? 'Copiado!' : 'Copiar Erros'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleClearReport}
                className="py-1.5 px-3 bg-white border border-stone-300 text-stone-600 text-[11px] font-sans font-bold uppercase hover:bg-stone-50 transition-colors flex items-center gap-1.5"
                title="Limpar relatório salvo"
              >
                <Trash2 size={12} />
                <span>Limpar</span>
              </button>
            </div>
          </div>

          {/* Resumo de Inserções por Tabela */}
          <div>
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block mb-2">
              Registros Gravados com Sucesso no Supabase por Tabela:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-center">
              {Object.entries(executionReport.insertedCounts).map(([table, count]) => (
                <div key={table} className="p-2.5 bg-stone-50 border border-stone-200">
                  <span className="text-[10px] text-stone-500 font-bold uppercase block truncate">{table}</span>
                  <span className="text-base font-bold text-stone-900">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Uploads de Storage */}
          {executionReport.storageUploads.length > 0 && (
            <div className="p-3 bg-stone-50 border border-stone-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800">
                  Uploads Concluídos no Supabase Storage ({executionReport.storageUploads.length}):
                </span>
                <span className="text-[10px] font-mono text-stone-500">bucket: media</span>
              </div>
              <div className="text-[11px] text-stone-700 space-y-1 max-h-36 overflow-y-auto font-mono bg-white p-2 border border-stone-200">
                {executionReport.storageUploads.map((up, idx) => (
                  <div key={idx} className="truncate">
                    <span className="text-emerald-700 font-bold">✓</span> {up.path} ({Math.round(up.sizeBytes / 1024)} KB)
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ERROS DETALHADOS (SE HOUVER) */}
          {executionReport.errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-950 flex items-center gap-1.5 text-xs">
                  <AlertTriangle size={15} className="text-red-700" />
                  Erros Retornados pelo Supabase ({executionReport.errors.length}):
                </span>
                <span className="text-[10px] text-red-800 font-sans">
                  Nenhum dado local foi perdido ou alterado.
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {executionReport.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-white border border-red-200 text-xs font-sans space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="bg-red-100 text-red-900 px-1.5 py-0.5 font-bold uppercase rounded-xs">
                        Etapa: {err.step}
                      </span>
                      {err.id && (
                        <span className="text-stone-600">
                          ID / Registro: <code className="font-bold text-stone-900">{err.id}</code>
                        </span>
                      )}
                    </div>
                    <div className="text-red-800 font-mono text-[11px] bg-red-50/50 p-1.5 border border-red-100 rounded-xs break-all">
                      {err.error}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternar Visualização de Logs */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="text-[11px] text-stone-700 underline font-bold hover:text-stone-900"
            >
              {showLogs ? 'Ocultar Logs Completos da Migração' : 'Exibir Logs Detalhados da Migração'}
            </button>

            {showLogs && (
              <div className="mt-2 p-3 bg-stone-900 text-stone-100 text-[10px] font-mono rounded max-h-60 overflow-y-auto space-y-1">
                {executionReport.logs.map((l, idx) => (
                  <div key={idx}>{l}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULTADOS DA AUDITORIA (FASE A) */}
      {auditReport && (
        <div className="space-y-6 pt-2">
          <div className="border border-stone-300 bg-stone-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-stone-700" />
                <h4 className="font-serif-display text-base font-bold text-stone-900">
                  Relatório de Auditoria Preliminar
                </h4>
              </div>
              <span
                className={`px-2.5 py-0.5 text-[10px] font-sans font-bold uppercase tracking-wider ${
                  auditReport.isReadyToMigrate
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                {auditReport.isReadyToMigrate ? 'Aprovado para Migração' : 'Avisos Encontrados'}
              </span>
            </div>

            <p className="text-xs font-sans text-stone-700">
              {auditReport.summaryMessage}
            </p>

            {/* Grid de Contagens por Entidade */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-sans">
              <div className="p-2.5 bg-white border border-stone-200 text-center">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Filmes</span>
                <span className="text-base font-bold text-stone-900">{auditReport.collectionCounts.filmes}</span>
              </div>
              <div className="p-2.5 bg-white border border-stone-200 text-center">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Pessoas / Cineastas</span>
                <span className="text-base font-bold text-stone-900">
                  {auditReport.pessoasAudit.totalConsolidatedPessoas}{' '}
                  <span className="text-[10px] text-stone-500 font-normal">
                    ({auditReport.collectionCounts.pessoas}+{auditReport.collectionCounts.cineastas})
                  </span>
                </span>
              </div>
              <div className="p-2.5 bg-white border border-stone-200 text-center">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Críticas</span>
                <span className="text-base font-bold text-stone-900">
                  {auditReport.collectionCounts.criticas}{' '}
                  <span className="text-[10px] text-emerald-700 font-normal">
                    ({auditReport.criticasAudit.resolvedCount} resolvidas)
                  </span>
                </span>
              </div>
              <div className="p-2.5 bg-white border border-stone-200 text-center">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Ensaios & Especiais</span>
                <span className="text-base font-bold text-stone-900">
                  {auditReport.collectionCounts.ensaios + auditReport.collectionCounts.especiais}
                </span>
              </div>
              <div className="p-2.5 bg-white border border-stone-200 text-center">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Tags Totais</span>
                <span className="text-base font-bold text-stone-900">
                  {auditReport.tagsAudit.totalConsolidated}{' '}
                  <span className="text-[10px] text-stone-500 font-normal">
                    ({auditReport.tagsAudit.totalDeclared} declaradas)
                  </span>
                </span>
              </div>
              <div className="p-2.5 bg-white border border-stone-200 text-center">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Mídias & Base64</span>
                <span className="text-base font-bold text-stone-900">
                  {auditReport.imagesAudit.base64Images.length}{' '}
                  <span className="text-[10px] text-amber-700 font-normal">Base64</span>
                </span>
              </div>
            </div>

            {/* Detalhes Específicos da Auditoria */}
            <div className="space-y-3 pt-2 text-xs font-sans">
              {/* Críticas */}
              <div className="p-3 bg-white border border-stone-200 space-y-1.5">
                <span className="font-bold text-stone-800 flex items-center gap-1.5">
                  <Film size={13} className="text-stone-700" />
                  Resolução Canônica de Críticas ({auditReport.criticasAudit.total}):
                </span>
                <div className="space-y-1 pl-4 text-[11px] text-stone-600">
                  {auditReport.criticasAudit.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          it.status === 'resolved' ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                      />
                      <span>
                        <strong>{it.editorialTitle}</strong> &rarr;{' '}
                        {it.status === 'resolved' ? (
                          <span className="text-emerald-800">
                            Vinculada a <em>{it.matchedFilmTitle}</em> via {it.matchType}
                          </span>
                        ) : (
                          <span className="text-red-700">{it.reason}</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deduplicação Pessoas/Cineastas */}
              {auditReport.pessoasAudit.mergedDuplicates.length > 0 && (
                <div className="p-3 bg-white border border-stone-200 space-y-1.5">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <Users size={13} className="text-stone-700" />
                    Deduplicação de Pessoas e Cineastas ({auditReport.pessoasAudit.mergedDuplicates.length} fusões):
                  </span>
                  <div className="space-y-1 pl-4 text-[11px] text-stone-600">
                    {auditReport.pessoasAudit.mergedDuplicates.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-emerald-700" />
                        <span>
                          Cineasta <strong>{m.cineastaName}</strong> ({m.cineastaId}) mesclado canonicamente com Pessoa <strong>{m.pessoaName}</strong> ({m.pessoaId}) por {m.reason}.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Imagens Base64 */}
              {auditReport.imagesAudit.base64Images.length > 0 && (
                <div className="p-3 bg-amber-50/70 border border-amber-300 space-y-1.5">
                  <span className="font-bold text-amber-900 flex items-center gap-1.5">
                    <ImageIcon size={13} className="text-amber-800" />
                    Imagens em Formato Base64 Detectadas para Upload no Storage ({auditReport.imagesAudit.base64Images.length}):
                  </span>
                  <div className="space-y-1 pl-4 text-[11px] text-amber-900/90">
                    {auditReport.imagesAudit.base64Images.map((b, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span>•</span>
                        <span>
                          [{b.entity.toUpperCase()}] <strong>{b.title}</strong> ({b.field}) &rarr; Upload planejado para <code>media/{b.targetFilename}</code> (~{b.estimatedSizeKb} KB).
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Registros Bloqueados */}
              {auditReport.blockedRecords.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-300 space-y-1.5">
                  <span className="font-bold text-red-900 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-red-700" />
                    Registros Bloqueados ({auditReport.blockedRecords.length}):
                  </span>
                  <div className="space-y-1 pl-4 text-[11px] text-red-800">
                    {auditReport.blockedRecords.map((bl, idx) => (
                      <div key={idx}>
                        • [{bl.entity}] <strong>{bl.title}</strong>: {bl.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* FASE B: PAINEL DE EXECUÇÃO */}
          <div className="border-t border-[#1A1A1A]/10 pt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#1A1A1A]" />
              <h4 className="font-serif-display text-base font-bold text-[#1A1A1A]">
                2. Executar Migração Definitiva
              </h4>
            </div>

            {/* Verificação de Permissão do Administrador */}
            <div className="p-3 bg-stone-50 border border-stone-200 space-y-2 text-xs font-sans">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-700">Status de Autenticação Supabase:</span>
                <button
                  type="button"
                  onClick={checkAdminStatus}
                  className="text-[11px] text-[#1A1A1A] underline font-bold hover:text-stone-600"
                >
                  Reverificar Permissões
                </button>
              </div>
              <p className={adminCheck.isAdmin ? 'text-emerald-800 font-bold' : 'text-amber-800'}>
                {adminCheck.message || 'Clique em Auditar para verificar o usuário administrador.'}
              </p>
            </div>

            {/* Checkbox de Confirmação Explícita */}
            <label className="flex items-start gap-2.5 text-xs font-sans text-stone-800 cursor-pointer select-none p-3 bg-stone-50/50 border border-stone-200">
              <input
                type="checkbox"
                checked={confirmedByAdmin}
                onChange={(e) => setConfirmedByAdmin(e.target.checked)}
                disabled={executing}
                className="mt-0.5 rounded border-stone-400"
              />
              <span>
                <strong>Confirmo a execução da migração:</strong> Os registros auditados serão gravados no Supabase e as imagens Base64 serão enviadas para o bucket <code>media</code>. Meu <code>localStorage</code> permanecerá 100% intacto como cópia de segurança local.
              </span>
            </label>

            {/* Botão de Disparo da Migração */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={handleExecuteMigration}
                disabled={!confirmedByAdmin || executing || !auditReport.isReadyToMigrate}
                className="py-2.5 px-6 bg-emerald-800 text-white text-xs font-sans font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {executing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                <span>{executing ? 'Executando Migração no Supabase...' : 'Iniciar Migração para o Supabase'}</span>
              </button>

              <span className="text-[11px] font-sans text-stone-500">
                {executing
                  ? 'Processando requisições em cascata...'
                  : 'Exige confirmação do administrador e auditoria prévia aprovada.'}
              </span>
            </div>

            {/* Barra de Progresso em Tempo Real */}
            {progress && executing && (
              <div className="p-4 bg-stone-50 border border-stone-300 space-y-2 text-xs font-sans">
                <div className="flex items-center justify-between font-bold text-stone-800">
                  <span>Etapa: {progress.stage}</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-700 transition-all duration-300"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <p className="text-stone-600 text-[11px]">{progress.message}</p>
              </div>
            )}

            {/* RELATÓRIO PÓS-EXECUÇÃO */}
            {executionReport && (
              <div className="p-5 border border-stone-300 bg-white space-y-4 text-xs font-sans">
                <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                  <div className="flex items-center gap-2">
                    {executionReport.success ? (
                      <CheckCircle2 size={18} className="text-emerald-700" />
                    ) : (
                      <AlertTriangle size={18} className="text-amber-700" />
                    )}
                    <h4 className="font-serif-display text-base font-bold text-stone-900">
                      {executionReport.success
                        ? 'Migração Concluída com Sucesso!'
                        : 'Migração Finalizada com Avisos/Erros'}
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-sans font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
                    localStorage 100% Intacto
                  </span>
                </div>

                {/* Resumo de Inserções */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {Object.entries(executionReport.insertedCounts).map(([table, count]) => (
                    <div key={table} className="p-2 bg-stone-50 border border-stone-200">
                      <span className="text-[10px] text-stone-500 font-bold uppercase block">{table}</span>
                      <span className="text-sm font-bold text-stone-900">{count}</span>
                    </div>
                  ))}
                </div>

                {/* Uploads de Storage */}
                {executionReport.storageUploads.length > 0 && (
                  <div className="p-3 bg-stone-50 border border-stone-200 space-y-1">
                    <span className="font-bold text-stone-800 block">
                      Uploads Realizados para o Supabase Storage ({executionReport.storageUploads.length}):
                    </span>
                    <div className="text-[11px] text-stone-600 space-y-0.5 max-h-32 overflow-y-auto font-mono">
                      {executionReport.storageUploads.map((up, idx) => (
                        <div key={idx} className="truncate">
                          ✓ {up.path} ({Math.round(up.sizeBytes / 1024)} KB)
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Erros (se houver, nunca ocultados) */}
                {executionReport.errors.length > 0 && (
                  <div className="p-3 bg-red-50 border border-red-300 space-y-1">
                    <span className="font-bold text-red-900 block">
                      Erros Registrados Durante a Execução ({executionReport.errors.length}):
                    </span>
                    <div className="text-[11px] text-red-800 space-y-0.5 max-h-36 overflow-y-auto">
                      {executionReport.errors.map((err, idx) => (
                        <div key={idx}>
                          • [{err.step}] {err.id ? `(ID: ${err.id})` : ''}: {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternar Visualização de Logs */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowLogs(!showLogs)}
                    className="text-[11px] text-stone-700 underline font-bold"
                  >
                    {showLogs ? 'Ocultar Logs de Execução' : 'Exibir Logs Detalhados da Migração'}
                  </button>

                  {showLogs && (
                    <div className="mt-2 p-3 bg-stone-900 text-stone-100 text-[10px] font-mono rounded max-h-48 overflow-y-auto space-y-1">
                      {executionReport.logs.map((l, idx) => (
                        <div key={idx}>{l}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
