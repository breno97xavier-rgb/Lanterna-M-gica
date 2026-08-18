import React, { useState, useEffect, useCallback } from 'react';
import { Tag as TagIcon, X, Plus, Loader2 } from 'lucide-react';
import { fetchTags, createTag, SupabaseTag } from '../../services/repositories/tagsRepository';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export const TagInput: React.FC<TagInputProps> = ({ tags, onChange }) => {
  const [inputValue, setInputValue] = useState('');
  const [availableTags, setAvailableTags] = useState<SupabaseTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const loadTags = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchTags();
    if (data) {
      setAvailableTags(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleAddTag = async (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed || isAdding) return;

    // Check if already in selected tags (case-insensitive check)
    const alreadySelected = tags.some((t) => t.toLowerCase() === trimmed.toLowerCase());
    if (alreadySelected) {
      setInputValue('');
      return;
    }

    // Check if tag exists in Supabase
    const existingInDb = availableTags.find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase()
    );

    const canonicalName = existingInDb ? existingInDb.name : trimmed;
    onChange([...tags, canonicalName]);
    setInputValue('');

    // If tag is brand new in Supabase, create it asynchronously in public.tags
    if (!existingInDb) {
      setIsAdding(true);
      const { data: newTag } = await createTag(trimmed);
      if (newTag) {
        setAvailableTags((prev) => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setIsAdding(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  return (
    <div className="space-y-2 p-3 bg-white border border-[#1A1A1A]/15">
      <div className="flex items-center justify-between">
        <label className="text-xs font-sans font-bold uppercase tracking-wider text-[#1A1A1A]/80 flex items-center gap-1.5">
          <TagIcon size={14} />
          <span>Tags & Temas</span>
        </label>
        {loading && <Loader2 size={12} className="animate-spin text-[#1A1A1A]/40" />}
      </div>

      {/* Selected tags */}
      <div className="flex flex-wrap gap-1.5 min-h-[32px] p-1.5 bg-[#F5F2ED] border border-[#1A1A1A]/10">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-[#1A1A1A]/20 text-xs font-mono text-[#1A1A1A]"
          >
            <span>#{tag}</span>
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="text-[#1A1A1A]/50 hover:text-red-600 transition-colors"
              title="Remover tag"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs font-mono text-[#1A1A1A]/40 self-center">
            Nenhuma tag selecionada
          </span>
        )}
      </div>

      {/* Input box */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma tag e pressione Enter..."
          disabled={isAdding}
          className="flex-1 bg-[#F5F2ED] border border-[#1A1A1A]/15 px-3 py-1.5 text-xs font-mono text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => handleAddTag(inputValue)}
          disabled={isAdding || !inputValue.trim()}
          className="px-3 py-1.5 bg-[#1A1A1A] text-[#F5F2ED] text-xs font-mono uppercase font-bold hover:bg-[#1A1A1A]/80 transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          {isAdding ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          <span>Adicionar</span>
        </button>
      </div>

      {/* Quick suggestions from existing Supabase tags */}
      {availableTags.length > 0 && (
        <div className="pt-2 border-t border-[#1A1A1A]/10 flex flex-wrap gap-1 text-[11px] font-mono text-[#1A1A1A]/70">
          <span className="text-[10px] uppercase font-bold text-[#1A1A1A]/50 mr-1 self-center">
            Sugestões:
          </span>
          {availableTags
            .filter((t) => !tags.some((selected) => selected.toLowerCase() === t.name.toLowerCase()))
            .slice(0, 12)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleAddTag(t.name)}
                className="px-1.5 py-0.5 bg-[#F5F2ED] border border-[#1A1A1A]/10 hover:border-[#1A1A1A] hover:bg-white transition-colors text-[10px]"
              >
                +{t.name}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

