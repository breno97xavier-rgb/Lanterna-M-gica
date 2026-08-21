import React from 'react';
import { TeamMember } from '../types';

interface TeamMemberCardProps {
  member: TeamMember;
  onNavigate: (path: string) => void;
  className?: string;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  onNavigate,
  className = '',
}) => {
  // Encontra função principal e outras funções
  const primaryRole = member.roles?.find((r) => r.isPrimary)?.role?.name || member.roles?.[0]?.role?.name;
  const otherRoles = (member.roles || [])
    .filter((r) => !r.isPrimary && r.role?.name && r.role.name !== primaryRole)
    .map((r) => r.role?.name);

  return (
    <div
      onClick={() => onNavigate(`/equipe/${member.slug}`)}
      className={`group cursor-pointer bg-white border border-[#1A1A1A]/15 p-6 flex flex-col items-center text-center transition-all duration-300 hover:border-[#1A1A1A] hover:shadow-md ${className}`}
    >
      {/* Avatar Circular com Fallback Visual */}
      <div className="relative mb-4">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-[#1A1A1A]/20 group-hover:border-[#1A1A1A] bg-[#F5F2ED] transition-colors flex items-center justify-center shadow-xs">
          {member.photoUrl ? (
            <img
              src={member.photoUrl}
              alt={member.name}
              className="w-full h-full object-cover grayscale contrast-105 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="font-serif-display text-3xl text-[#1A1A1A]/40 group-hover:text-[#1A1A1A]/80 font-bold transition-colors">
              {member.name ? member.name.charAt(0).toUpperCase() : '?'}
            </span>
          )}
        </div>
      </div>

      {/* Identificação */}
      <h3 className="font-serif-display text-lg sm:text-xl text-[#1A1A1A] group-hover:text-[#D4AF37] transition-colors leading-tight font-normal">
        {member.name}
      </h3>

      {/* Função Principal */}
      {primaryRole && (
        <span className="mt-1 text-[11px] font-sans font-bold uppercase tracking-[0.18em] text-[#D4AF37] block">
          {primaryRole}
        </span>
      )}

      {/* Funções Adicionais Discretas */}
      {otherRoles.length > 0 && (
        <span className="mt-1 text-[11px] font-serif-body italic text-[#1A1A1A]/60 block line-clamp-1">
          {otherRoles.join(' · ')}
        </span>
      )}

      {/* Resumo curto se presente */}
      {member.shortBio && (
        <p className="mt-3 text-xs font-serif-body text-[#1A1A1A]/75 leading-relaxed line-clamp-2 max-w-[240px]">
          {member.shortBio}
        </p>
      )}

      {/* Link de ação sutil */}
      <div className="mt-4 pt-3 border-t border-[#1A1A1A]/10 w-full">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#1A1A1A]/50 group-hover:text-[#1A1A1A] transition-colors">
          Ver perfil completo →
        </span>
      </div>
    </div>
  );
};
