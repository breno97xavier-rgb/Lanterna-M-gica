import React from 'react';
import {
  Heading2,
  Heading3,
  Bold,
  Italic,
  Quote,
  List,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
} from 'lucide-react';

interface RichTextToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  content: string;
  onChange: (val: string) => void;
}

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  textareaRef,
  content,
  onChange,
}) => {
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultText;

    const newContent =
      content.substring(0, start) +
      prefix +
      selectedText +
      suffix +
      content.substring(end);

    onChange(newContent);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 50);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-[#F5F2ED] border-b border-[#1A1A1A]/15 text-xs font-mono">
      <button
        type="button"
        title="Subtítulo H2"
        onClick={() => insertFormatting('### ', '\n', 'Subtítulo da Seção')}
        className="p-1.5 hover:bg-white border border-transparent hover:border-[#1A1A1A]/15 text-[#1A1A1A] rounded-xs"
      >
        <Heading2 size={16} />
      </button>
      <button
        type="button"
        title="Subtítulo H3"
        onClick={() => insertFormatting('#### ', '\n', 'Subtítulo Menor')}
        className="p-1.5 hover:bg-white border border-transparent hover:border-[#1A1A1A]/15 text-[#1A1A1A] rounded-xs"
      >
        <Heading3 size={16} />
      </button>

      <div className="h-4 w-px bg-[#1A1A1A]/15 mx-1" />

      <button
        type="button"
        title="Negrito"
        onClick={() => insertFormatting('**', '**', 'texto em destaque')}
        className="p-1.5 hover:bg-white border border-transparent hover:border-[#1A1A1A]/15 text-[#1A1A1A] rounded-xs"
      >
        <Bold size={16} />
      </button>
      <button
        type="button"
        title="Itálico"
        onClick={() => insertFormatting('*', '*', 'título do filme ou termo')}
        className="p-1.5 hover:bg-white border border-transparent hover:border-[#1A1A1A]/15 text-[#1A1A1A] rounded-xs"
      >
        <Italic size={16} />
      </button>

      <div className="h-4 w-px bg-[#1A1A1A]/15 mx-1" />

      <button
        type="button"
        title="Citação Cenas/Texto"
        onClick={() => insertFormatting('\n> ', '\n', 'Citação marcante do artigo ou personagem')}
        className="p-1.5 hover:bg-white border border-transparent hover:border-[#1A1A1A]/15 text-[#1A1A1A] rounded-xs"
      >
        <Quote size={16} />
      </button>
      <button
        type="button"
        title="Lista de itens"
        onClick={() => insertFormatting('\n- ', '\n', 'Item de lista')}
        className="p-1.5 hover:bg-white border border-transparent hover:border-[#1A1A1A]/15 text-[#1A1A1A] rounded-xs"
      >
        <List size={16} />
      </button>

      <div className="h-4 w-px bg-[#1A1A1A]/15 mx-1" />

      <button
        type="button"
        title="Inserir Link"
        onClick={() => insertFormatting('[', '](https://exemplo.com)', 'Texto do link')}
        className="p-1.5 hover:bg-white border border-transparent hover:border-[#1A1A1A]/15 text-[#1A1A1A] rounded-xs"
      >
        <LinkIcon size={16} />
      </button>
      <button
        type="button"
        title="Inserir Imagem com Legenda"
        onClick={() => insertFormatting('\n![Legenda da foto](', ')\n', 'URL_DA_IMAGEM')}
        className="p-1.5 hover:bg-white border border-transparent hover:border-[#1A1A1A]/15 text-[#1A1A1A] rounded-xs"
      >
        <ImageIcon size={16} />
      </button>
      <button
        type="button"
        title="Divisor Seção"
        onClick={() => insertFormatting('\n---\n', '', '')}
        className="p-1.5 hover:bg-white border border-transparent hover:border-[#1A1A1A]/15 text-[#1A1A1A] rounded-xs"
      >
        <Minus size={16} />
      </button>

      <span className="ml-auto text-[10px] text-[#1A1A1A]/60 font-sans hidden sm:inline">
        Suporta marcação em parágrafos e citações
      </span>
    </div>
  );
};
