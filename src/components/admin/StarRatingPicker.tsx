import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingPickerProps {
  value: number; // 0.5 to 5.0 in steps of 0.5
  onChange: (val: number) => void;
}

export const StarRatingPicker: React.FC<StarRatingPickerProps> = ({ value, onChange }) => {
  const options = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {options.map((val) => {
          const isSelected = value === val;
          return (
            <button
              key={val}
              type="button"
              onClick={() => onChange(val)}
              className={`px-2.5 py-1 text-xs font-mono border transition-all flex items-center gap-1 ${
                isSelected
                  ? 'bg-[#1A1A1A] text-[#F5F2ED] border-[#1A1A1A] font-bold shadow-xs'
                  : 'bg-white text-[#1A1A1A]/80 border-[#1A1A1A]/15 hover:border-[#1A1A1A]'
              }`}
            >
              <span>{val.toFixed(1)}</span>
              <Star
                size={12}
                className={isSelected ? 'fill-[#F5F2ED] text-[#F5F2ED]' : 'text-[#1A1A1A]/40'}
              />
            </button>
          );
        })}
      </div>

      {/* Visual Star Preview */}
      <div className="flex items-center gap-1 pt-1 text-[#1A1A1A]">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const diff = value - (starIndex - 1);
          let fillPercent = 0;
          if (diff >= 1) fillPercent = 100;
          else if (diff >= 0.5) fillPercent = 50;

          return (
            <div key={starIndex} className="relative w-5 h-5">
              {/* Outline Star */}
              <Star size={20} className="text-[#1A1A1A]/25 absolute inset-0" />
              {/* Half or Full Filled Star */}
              {fillPercent > 0 && (
                <div
                  className="absolute top-0 left-0 bottom-0 overflow-hidden text-[#1A1A1A]"
                  style={{ width: `${fillPercent}%` }}
                >
                  <Star size={20} className="fill-[#1A1A1A] text-[#1A1A1A]" />
                </div>
              )}
            </div>
          );
        })}
        <span className="ml-2 text-xs font-mono font-bold text-[#1A1A1A]">
          {value.toFixed(1)} / 5.0
        </span>
      </div>
    </div>
  );
};
