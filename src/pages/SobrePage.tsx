import React from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';

interface SobrePageProps {
  onNavigate: (path: string) => void;
}

export const SobrePage: React.FC<SobrePageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
        
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

      </div>
    </div>
  );
};
