import React from 'react';

interface InlineMarkdownProps {
  text: string;
}

/**
 * Tokenizador e renderizador de Markdown inline (negrito, itálico, links, código).
 */
export const InlineMarkdown: React.FC<InlineMarkdownProps> = ({ text }) => {
  if (!text) return null;

  // Regex para capturar padrões inline:
  // 1. Links: [texto](url)
  // 2. Negrito + Itálico: ***texto*** ou ___texto___
  // 3. Negrito: **texto** ou __texto__
  // 4. Itálico: *texto* ou _texto_
  // 5. Código inline: `código`
  const tokenRegex =
    /(\[([^\]]+)\]\((https?:\/\/[^\s\)]+|#[^\s\)]+|\/[^\s\)]+|mailto:[^\s\)]+)\))|(\*\*\*([\s\S]+?)\*\*\*|___([\s\S]+?)___)|(\*\*([\s\S]+?)\*\*|__([\s\S]+?)__)|(\*([^\s*][^*]*[^\s*]|[^\s*])\*|_([^\s_][^_]*[^\s_]|[^\s_])_)|(`([^`]+)`)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  const renderTextWithLineBreaks = (str: string, baseKey: string | number) => {
    const lines = str.split('\n');
    return lines.map((line, lIdx) => (
      <React.Fragment key={`${baseKey}-l-${lIdx}`}>
        {line}
        {lIdx < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plainText = text.slice(lastIndex, match.index);
      elements.push(
        <React.Fragment key={`text-${key++}`}>
          {renderTextWithLineBreaks(plainText, key)}
        </React.Fragment>
      );
    }

    if (match[1]) {
      // Link [2: texto, 3: url]
      const linkText = match[2];
      const linkUrl = match[3];
      const isExternal = linkUrl.startsWith('http');
      elements.push(
        <a
          key={`link-${key++}`}
          href={linkUrl}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="underline decoration-[#D4AF37] decoration-1 underline-offset-2 text-[#1A1A1A] hover:text-[#D4AF37] transition-colors"
        >
          <InlineMarkdown text={linkText} />
        </a>
      );
    } else if (match[4]) {
      // Negrito + Itálico (*** ou ___)
      const inner = match[5] || match[6];
      elements.push(
        <strong key={`bi-${key++}`} className="font-bold text-[#1A1A1A]">
          <em className="italic">
            <InlineMarkdown text={inner} />
          </em>
        </strong>
      );
    } else if (match[7]) {
      // Negrito (** ou __)
      const inner = match[8] || match[9];
      elements.push(
        <strong key={`b-${key++}`} className="font-bold text-[#1A1A1A]">
          <InlineMarkdown text={inner} />
        </strong>
      );
    } else if (match[10]) {
      // Itálico (* ou _)
      const inner = match[11] || match[12];
      elements.push(
        <em key={`i-${key++}`} className="italic font-serif-display text-inherit">
          <InlineMarkdown text={inner} />
        </em>
      );
    } else if (match[13]) {
      // Código (`...`)
      const code = match[14];
      elements.push(
        <code
          key={`code-${key++}`}
          className="px-1.5 py-0.5 font-mono text-xs bg-[#1A1A1A]/8 border border-[#1A1A1A]/10 text-[#1A1A1A] rounded"
        >
          {code}
        </code>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    const trailingText = text.slice(lastIndex);
    elements.push(
      <React.Fragment key={`text-end-${key++}`}>
        {renderTextWithLineBreaks(trailingText, key)}
      </React.Fragment>
    );
  }

  return <>{elements}</>;
};

export interface EditorialContentProps {
  content?: string | null;
  className?: string;
  firstLetterDropCap?: boolean;
  dropCapClass?: string;
}

/**
 * Componente principal para renderizar o corpo de textos editoriais
 * (críticas, ensaios, dossiês, reflexões, etc.) com formatação rica,
 * suporte a Markdown (negrito **, itálico *, citações >, cabeçalhos ##/###, listas, imagens e divisores).
 */
export const EditorialContent: React.FC<EditorialContentProps> = ({
  content,
  className = 'space-y-6 font-serif-body text-base sm:text-lg text-[#1A1A1A]/90 leading-relaxed',
  firstLetterDropCap = false,
  dropCapClass = 'first-letter:float-left first-letter:text-5xl first-letter:font-serif-display first-letter:mr-3 first-letter:leading-none first-letter:text-[#1A1A1A]',
}) => {
  if (!content || !content.trim()) {
    return null;
  }

  // Divide o texto em blocos separados por 2 ou mais quebras de linha
  const rawBlocks = content.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  let hasAppliedDropCap = false;

  return (
    <div className={className}>
      {rawBlocks.map((block, idx) => {
        // 1. Linha horizontal separadora
        if (block === '---' || block === '***' || block === '___') {
          return (
            <hr
              key={idx}
              className="my-10 border-t border-[#1A1A1A]/15 max-w-xs mx-auto"
            />
          );
        }

        // 2. Imagem no corpo com legenda: ![legenda](url)
        const imageMatch = block.match(/^!\[(.*?)\]\((https?:\/\/[^\s\)]+|\/[^\s\)]+)\)$/);
        if (imageMatch) {
          const caption = imageMatch[1];
          const src = imageMatch[2];
          return (
            <figure key={idx} className="my-8 space-y-2">
              <div className="overflow-hidden border border-[#1A1A1A]/15 bg-[#1A1A1A]">
                <img
                  src={src}
                  alt={caption || 'Imagem editorial'}
                  className="w-full h-auto object-cover max-h-[550px] mx-auto"
                  loading="lazy"
                />
              </div>
              {caption && (
                <figcaption className="text-xs font-serif-body italic text-[#1A1A1A]/65 text-center px-4">
                  {caption}
                </figcaption>
              )}
            </figure>
          );
        }

        // 3. Título H2: ## Título
        if (block.startsWith('## ')) {
          return (
            <h2
              key={idx}
              className="text-2xl sm:text-3xl font-serif-display font-normal text-[#1A1A1A] pt-6 pb-2 border-b border-[#1A1A1A]/15 mt-8 mb-4 leading-tight"
            >
              <InlineMarkdown text={block.replace(/^##\s+/, '')} />
            </h2>
          );
        }

        // 4. Título H3: ### Título
        if (block.startsWith('### ')) {
          return (
            <h3
              key={idx}
              className="text-xl sm:text-2xl font-serif-display font-normal text-[#1A1A1A] pt-5 pb-2 border-b border-[#1A1A1A]/15 mt-6 mb-3 leading-tight"
            >
              <InlineMarkdown text={block.replace(/^###\s+/, '')} />
            </h3>
          );
        }

        // 5. Título H4: #### Título
        if (block.startsWith('#### ')) {
          return (
            <h4
              key={idx}
              className="text-lg sm:text-xl font-serif-display font-bold text-[#1A1A1A] mt-5 mb-2 leading-snug"
            >
              <InlineMarkdown text={block.replace(/^####\s+/, '')} />
            </h4>
          );
        }

        // 6. Citação / Blockquote: > Citação
        if (block.startsWith('>')) {
          const quoteLines = block
            .split('\n')
            .map((line) => line.replace(/^>\s?/, ''))
            .join('\n');

          return (
            <blockquote
              key={idx}
              className="my-8 pl-6 border-l-2 border-[#1A1A1A] italic font-serif-display text-xl text-[#1A1A1A] leading-snug"
            >
              <InlineMarkdown text={quoteLines} />
            </blockquote>
          );
        }

        // 7. Lista não ordenada: Linhas começando com "- " ou "* "
        const lines = block.split('\n');
        const isUnorderedList = lines.length > 0 && lines.every((l) => /^\s*[-*]\s+/.test(l));
        if (isUnorderedList) {
          return (
            <ul key={idx} className="my-6 pl-6 space-y-2 list-disc list-outside marker:text-[#D4AF37]">
              {lines.map((l, lIdx) => (
                <li key={lIdx} className="leading-relaxed">
                  <InlineMarkdown text={l.replace(/^\s*[-*]\s+/, '')} />
                </li>
              ))}
            </ul>
          );
        }

        // 8. Lista ordenada: Linhas começando com "1. ", "2. ", etc.
        const isOrderedList = lines.length > 0 && lines.every((l) => /^\s*\d+\.\s+/.test(l));
        if (isOrderedList) {
          return (
            <ol key={idx} className="my-6 pl-6 space-y-2 list-decimal list-outside marker:font-mono marker:text-xs marker:text-[#1A1A1A]/70">
              {lines.map((l, lIdx) => (
                <li key={lIdx} className="leading-relaxed">
                  <InlineMarkdown text={l.replace(/^\s*\d+\.\s+/, '')} />
                </li>
              ))}
            </ol>
          );
        }

        // 9. Parágrafo padrão
        const shouldApplyDropCap = firstLetterDropCap && !hasAppliedDropCap;
        if (shouldApplyDropCap) {
          hasAppliedDropCap = true;
        }

        return (
          <p
            key={idx}
            className={shouldApplyDropCap ? dropCapClass : undefined}
          >
            <InlineMarkdown text={block} />
          </p>
        );
      })}
    </div>
  );
};
