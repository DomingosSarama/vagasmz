import React, { useState } from 'react';
import { Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { evaluateDeadlineStatus } from '../utils/careerLogic.ts';

interface CompanyEmblemProps {
  company: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  onlyVerifiedImage?: boolean;
}

export function getVerifiedCompanyLogo(_company: string, explicitLogoUrl?: string): string | null {
  if (explicitLogoUrl?.startsWith('https://')) return explicitLogoUrl;
  return null;
}

export const CompanyEmblem: React.FC<CompanyEmblemProps> = ({
  company,
  logoUrl,
  size = 'md',
  onlyVerifiedImage = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const verifiedSrc = getVerifiedCompanyLogo(company, logoUrl);

  const dimensions =
    size === 'sm'
      ? 'w-8 h-8 text-[11px] rounded-lg'
      : size === 'lg'
        ? 'w-11 h-11 text-xs rounded-xl'
        : 'w-9 h-9 text-[11px] rounded-lg';

  if (verifiedSrc && !imgError) {
    return (
      <img
        src={verifiedSrc}
        alt={`Logótipo ${company}`}
        onError={() => setImgError(true)}
        className={`${dimensions} shrink-0 object-cover select-none border border-[var(--border-color)]`}
      />
    );
  }


  const words = (company || 'MZ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : (words[0] || 'MZ').slice(0, 2).toUpperCase();

  return (
    <div
      className={`${dimensions} shrink-0 flex items-center justify-center font-semibold tracking-wider select-none bg-[var(--surface-bg)] border border-[var(--border-color)] text-[var(--text-secondary)]`}
      aria-hidden="true"
    >
      <span>{initials}</span>
    </div>
  );
};

interface MatchRingProps {
  score: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const MatchRing: React.FC<MatchRingProps> = ({
  score,
  showLabel = true,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const isHigh = clamped >= 75;

  return (
    <span
      className={`font-mono-tabular text-xs font-semibold shrink-0 ${
        isHigh ? 'text-[var(--accent-green)]' : 'text-[var(--text-secondary)]'
      }`}
      title={`${clamped}% compatível com o teu perfil`}
    >
      {clamped}% {showLabel ? 'compatível' : ''}
    </span>
  );
};

interface DeadlineBadgeProps {
  deadline: string;
}

export const DeadlineBadge: React.FC<DeadlineBadgeProps> = ({ deadline }) => {
  const info = evaluateDeadlineStatus(deadline);

  if (info.status === 'Expirada') {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-tabular font-medium text-red-400">
        <AlertCircle className="w-3 h-3" />
        <span>Encerrada</span>
      </span>
    );
  }

  if (info.status === 'Prazo próximo') {
    const label =
      info.daysRemaining === 0
        ? 'Encerra hoje'
        : info.daysRemaining === 1
          ? 'Encerra em 24h'
          : `Encerra em ${info.daysRemaining}d`;
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-tabular font-medium text-amber-400">
        <Clock className="w-3 h-3" />
        <span>{label}</span>
      </span>
    );
  }

  if (info.status === 'Activa' && info.daysRemaining !== null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-tabular text-[var(--text-secondary)]">
        <span>Prazo: {deadline}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono-tabular text-[var(--text-secondary)]">
      <AlertCircle className="w-3 h-3" />
      <span>Disponibilidade por confirmar</span>
    </span>
  );
};

export const HeroCareerIllustration: React.FC = () => (
  <svg
    viewBox="0 0 240 120"
    fill="none"
    className="w-full max-w-[220px] h-auto select-none pointer-events-none"
    aria-hidden="true"
  >
    <rect
      x="8"
      y="8"
      width="224"
      height="104"
      rx="12"
      fill="#111111"
      stroke="#282828"
      strokeWidth="1"
    />
    <line x1="8" y1="42" x2="232" y2="42" stroke="#282828" strokeWidth="1" />
    <line x1="120" y1="42" x2="120" y2="112" stroke="#282828" strokeWidth="1" />
    <rect x="20" y="20" width="60" height="8" rx="2" fill="#FFFFFF" />
    <rect x="20" y="56" width="80" height="6" rx="2" fill="#A3A3A3" />
    <rect x="20" y="70" width="56" height="6" rx="2" fill="#525252" />
    <rect x="134" y="56" width="76" height="6" rx="2" fill="#C5F27A" />
    <rect x="134" y="70" width="64" height="6" rx="2" fill="#525252" />
  </svg>
);

export const EmptyStateIllustration: React.FC = () => (
  <svg
    viewBox="0 0 120 80"
    fill="none"
    className="w-24 h-16 mx-auto mb-2 text-[#737373]"
    aria-hidden="true"
  >
    <rect x="16" y="12" width="88" height="56" rx="10" fill="#111111" stroke="#282828" strokeWidth="1" />
    <line x1="16" y1="30" x2="104" y2="30" stroke="#282828" strokeWidth="1" />
    <line x1="30" y1="44" x2="74" y2="44" stroke="#525252" strokeWidth="2" strokeLinecap="round" />
    <line x1="30" y1="54" x2="58" y2="54" stroke="#282828" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
