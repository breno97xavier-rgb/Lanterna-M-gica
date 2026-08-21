import React, { useState, useEffect } from 'react';
import { ArrowRight, BookOpen, Users, Loader2 } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { TeamMemberCard } from '../components/TeamMemberCard';
import { TeamMember } from '../types';
import { fetchTeamMembers } from '../services/repositories/teamMembersRepository';

interface SobrePageProps {
  onNavigate: (path: string) => void;
}

const CATEGORY_NAMES: Record<string, string> = {
  direcao: 'Direção Editorial',
  redacao: 'Corpo Redatorial',
  critica: 'Crítica Cinematográfica',
  ensaios: 'Ensaios & Pesquisa',
  colaboracao: 'Colaboradores',
  producao: 'Produção Editorial',
  pesquisa: 'Pesquisa & Documentação',
};

export const SobrePage: React.FC<SobrePageProps> = ({ onNavigate }) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoadingTeam(true);

    fetchTeamMembers({
      status: 'published',
      displayOnAboutOnly: true,
      orderBy: 'order_index',
    })
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data) {
          setTeamMembers(data);
        }
        setLoadingTeam(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadingTeam(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Agrupamento dinâmico de integrantes por função institucional / groupCategory
  const groupsMap = new Map<
    string,
    { categoryTitle: string; minOrder: number; members: TeamMember[] }
  >();

  teamMembers.forEach((member) => {
    const primaryRole = member.roles?.find((r) => r.isPrimary)?.role || member.roles?.[0]?.role;
    const categoryKey = primaryRole?.groupCategory?.toLowerCase().trim() || 'geral';
    const categoryTitle =
      CATEGORY_NAMES[categoryKey] ||
      (categoryKey !== 'geral'
        ? categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1).replace(/[-_]/g, ' ')
        : (primaryRole?.name || 'Equipe Editorial'));
    const roleOrder = primaryRole?.orderIndex ?? 99;

    if (!groupsMap.has(categoryKey)) {
      groupsMap.set(categoryKey, {
        categoryTitle,
        minOrder: roleOrder,
        members: [],
      });
    } else {
      const existing = groupsMap.get(categoryKey)!;
      if (roleOrder < existing.minOrder) {
        existing.minOrder = roleOrder;
      }
    }

    groupsMap.get(categoryKey)!.members.push(member);
  });

  const sortedGroups = Array.from(groupsMap.entries())
    .map(([key, value]) => ({
      key,
      ...value,
      members: value.members.sort((a, b) => {
        if (a.orderIndex !== b.orderIndex) {
          return a.orderIndex - b.orderIndex;
        }
        return a.name.localeCompare(b.name);
      }),
    }))
    .sort((a, b) => {
      if (a.minOrder !== b.minOrder) return a.minOrder - b.minOrder;
      return a.categoryTitle.localeCompare(b.categoryTitle);
    });

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-16">
        
        {/* Header */}
        <div className="space-y-6 text-center border-b border-[#1A1A1A]/15 pb-10">
          <div className="flex justify-center mb-2">
            <BrandLogo size="lg" theme="light" />
          </div>
          
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37] block">
            Apresentação Editorial
          </span>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif-display font-normal text-[#1A1A1A]">
            Carta de Apresentação
          </h1>

          <p className="text-lg font-serif-body text-[#1A1A1A]/80 italic max-w-2xl mx-auto">
            “Uma reflexão permanente sobre cinema, cultura e pensamento.”
          </p>
        </div>

        {/* Main Body Text — Comfortable reading width */}
        <main className="max-w-[720px] mx-auto space-y-8 font-serif-body text-base sm:text-lg text-[#1A1A1A]/90 leading-relaxed">
          <p className="first-letter:float-left first-letter:text-5xl first-letter:font-serif-display first-letter:mr-3 first-letter:leading-none first-letter:text-[#1A1A1A]">
            O Lanterna Mágica não nasceu de um plano comercial, nem da ambição de alimentar o fluxo incessante de notícias diárias e cotações de bilheteria. Ele nasce de uma paixão antiga e exigente: a relação demorada com a imagem cinematográfica, com a escrita e com a tentativa de compreender o mundo através das obras de arte.
          </p>

          <h2 className="text-2xl font-serif-display text-[#1A1A1A] pt-4 border-b border-[#1A1A1A]/15 pb-2">
            A Origem do Nome e a Inspiração em Bergman
          </h2>

          <p>
            O nome <em>Lanterna Mágica</em> possui uma dupla ressonância histórica e afetiva. Por um lado, evoca o equipamento ancestral que precedeu a invenção do cinematógrafo pelos irmãos Lumière — aquele projetor de luz e placas de vidro pintadas a mão que projetavam sombras e mistérios nas paredes escuras do século XVII.
          </p>

          <p>
            Por outro lado, remete diretamente à autobiografia de Ingmar Bergman, intitulada <em>Lanterna Magica</em> (1987). No cinema do realizador sueco, a projeção da luz na escuridão da sala de cinema nunca é um mero truque illusionista; é um portal de exame de consciência, onde o rosto humano é filmado com uma solenidade quase litúrgica.
          </p>

          <h2 className="text-2xl font-serif-display text-[#1A1A1A] pt-4 border-b border-[#1A1A1A]/15 pb-2">
            O Cinema como Espaço de Pensamento
          </h2>

          <p>
            A pergunta central que guia esta publicação não se limita a: <em>“Este filme é bom ou ruim?”</em>. Interessa-nos sobretudo perguntar: <strong>“O que existe nesta obra que merece ser pensado?”</strong>
          </p>

          <p>
            O cinema é aqui o ponto de partida para investigações que alcançam a filosofia, a moral, a memória, a sociedade, a religião, a literatura e as contradições do coração humano. Não encaramos os filmes como produtos descartáveis de consumo imediato, mas como documentos estéticos permanentes.
          </p>

          {/* Manifesto CTA Box */}
          <div className="my-12 p-8 bg-white border border-[#1A1A1A]/15 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
              <BookOpen size={16} className="text-[#D4AF37]" />
              <span>Princípios Editoriais</span>
            </div>
            
            <h3 className="text-2xl font-serif-display text-[#1A1A1A]">
              Como Olhamos para os Filmes
            </h3>

            <p className="text-sm font-serif-body text-[#1A1A1A]/80 leading-relaxed">
              Conheça as diretrizes éticas e estéticas que orientam a nossa escrita e a nossa recusa ao imediatismo e à rotulagem apressada.
            </p>

            <div className="pt-2">
              <button
                onClick={() => onNavigate('/manifesto')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A1A1A] text-[#F5F2ED] font-sans-ui text-xs font-semibold uppercase tracking-[0.2em] hover:bg-[#D4AF37] hover:text-[#1A1A1A] transition-colors shadow-xs"
              >
                <span>Ler Nosso Manifesto</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-[#1A1A1A]/15 text-sm font-sans-ui text-[#1A1A1A]/70 space-y-1">
            <p className="text-[#1A1A1A] font-semibold">Breno Matos</p>
            <p>Fundador e Editor do Lanterna Mágica</p>
            <p className="text-xs text-[#D4AF37] font-mono pt-1">Contato: lanternaamagica@gmail.com</p>
          </div>
        </main>

        {/* Seção Equipe Editorial */}
        {loadingTeam ? (
          <div className="pt-10 flex flex-col items-center justify-center space-y-2 text-[#1A1A1A]/50">
            <Loader2 size={24} className="animate-spin text-[#1A1A1A]/40" />
            <span className="text-xs font-mono tracking-widest uppercase">Carregando quadro de equipe...</span>
          </div>
        ) : teamMembers.length > 0 ? (
          <section className="pt-10 border-t border-[#1A1A1A]/15 space-y-10">
            {/* Header da Seção Equipe */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
                <Users size={14} />
                <span>Quadro Editorial</span>
              </div>
              <h2 className="text-3xl font-serif-display text-[#1A1A1A]">
                Equipe & Colaboradores
              </h2>
              <p className="text-sm font-serif-body text-[#1A1A1A]/70 max-w-lg mx-auto">
                As vozes e olhares responsáveis pela curadoria, ensaios, críticas e condução do Lanterna Mágica.
              </p>
            </div>

            {/* Grupos Editoriais Dinâmicos */}
            <div className="space-y-12">
              {sortedGroups.map((group) => (
                <div key={group.key} className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-[#1A1A1A]/10 pb-2">
                    <h3 className="text-lg sm:text-xl font-serif-display text-[#1A1A1A]">
                      {group.categoryTitle}
                    </h3>
                    <span className="text-[10px] font-mono text-[#1A1A1A]/50 uppercase tracking-widest">
                      ({group.members.length} {group.members.length === 1 ? 'integrante' : 'integrantes'})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {group.members.map((member) => (
                      <TeamMemberCard
                        key={member.id}
                        member={member}
                        onNavigate={onNavigate}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

      </div>
    </div>
  );
};

