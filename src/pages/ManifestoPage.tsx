import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ManifestoPageProps {
  onNavigate: (path: string) => void;
}

export const ManifestoPage: React.FC<ManifestoPageProps> = ({ onNavigate }) => {
  const principles = [
    {
      title: '1. Não existe obrigação de publicar sobre tudo.',
      text: 'Recusamos a tirania da novidade e a obrigação de cobrir diariamente todos os lançamentos comerciais. Publicamos apenas sobre as obras e temas que provocam inquietação intelectual genuína.',
    },
    {
      title: '2. Um filme não merece atenção apenas porque é novo.',
      text: 'O cinema de 1920, 1950 ou 1970 tem a mesma urgência do filme lançado hoje à tarde. O arquivo vivo é o chão do Lanterna Mágica.',
    },
    {
      title: '3. Discordar de uma obra não significa recusá-la.',
      text: 'Uma grande obra pode provocar desconforto ou discordância moral. O papel da crítica é enfrentar essa complexidade sem o impulso de cancelar ou simplificar.',
    },
    {
      title: '4. A crítica começa pela tentativa de compreender.',
      text: 'Antes de julgar ou emitir um veredito, o crítico deve atentar para a linguagem interna da obra: o que o filme está tentando fazer e através de quais meios formais ele busca atingir essa intenção.',
    },
    {
      title: '5. Cinema pode ser entretenimento e ainda assim merecer pensamento.',
      text: 'Não contrapomos o rigor intelectual ao prazer da narrativa popular. A grande arte frequentemente habita a interseção entre o mistério e a comunicação acessível.',
    },
    {
      title: '6. Nenhuma ideologia substitui uma boa análise.',
      text: 'A análise estética e moral do cinema não deve ser reduzida a um panfleto ideológico. A forma, a luz, o enquadramento e a montagem exigem atenção rigorosa.',
    },
    {
      title: '7. Uma interpretação precisa admitir a possibilidade de estar errada.',
      text: 'A escrita sobre arte deve cultivar a humildade hermenêutica. Nenhuma crítica esgota o mistério de uma grande obra de arte.',
    },
    {
      title: '8. Profundidade não deve significar obscuridade deliberada.',
      text: 'Buscamos uma linguagem sóbria, elegante, clara e humana — capaz de dialogar tanto com o cinéfilo experiente quanto com o leitor curioso.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] pt-28 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12">
        
        {/* Back button */}
        <div>
          <button
            onClick={() => onNavigate('/sobre')}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-sans-ui text-[#1A1A1A]/70 hover:text-[#D4AF37] transition-colors font-semibold"
          >
            <ArrowLeft size={14} />
            <span>Voltar para Sobre</span>
          </button>
        </div>

        {/* Page Header */}
        <div className="space-y-4 border-b border-[#1A1A1A]/15 pb-8 text-center">
          <span className="text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
            Manifesto Editorial
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif-display font-normal text-[#1A1A1A]">
            COMO OLHAMOS PARA OS FILMES
          </h1>
          <p className="text-base sm:text-lg font-serif-body text-[#1A1A1A]/80 max-w-2xl mx-auto leading-relaxed italic">
            Oito princípios norteadores para o exercício da crítica e da reflexão cultural no Lanterna Mágica.
          </p>
        </div>

        {/* Principles list */}
        <main className="max-w-[720px] mx-auto space-y-8 font-serif-body">
          {principles.map((p, idx) => (
            <div
              key={idx}
              className="p-6 bg-white border border-[#1A1A1A]/15 space-y-2 hover:border-[#D4AF37] transition-colors shadow-xs"
            >
              <h2 className="text-xl sm:text-2xl font-serif-display text-[#1A1A1A]">
                {p.title}
              </h2>
              <p className="text-base text-[#1A1A1A]/80 leading-relaxed">
                {p.text}
              </p>
            </div>
          ))}
        </main>

      </div>
    </div>
  );
};
