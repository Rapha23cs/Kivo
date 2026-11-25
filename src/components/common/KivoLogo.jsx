import React from 'react';

export default function KivoLogo({
  size = 'md',
  showText = true,
  subtitle = 'Vistorias & Relatórios',
  darkText = false
}) {
  const iconSizes = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-8 h-8 rounded-lg',
    lg: 'w-10 h-10 rounded-xl'
  };

  return (
    <div className="flex items-center gap-2.5 shrink-0">
      <img
        src="/icon.svg"
        alt="Logo Kivo"
        className={`${iconSizes[size] || iconSizes.md} shrink-0 shadow-sm ring-1 ring-white/10`}
      />
      {showText && (
        <div className="leading-tight">
          <span
            className={`font-bold tracking-tight block leading-none ${
              size === 'lg' ? 'text-lg' : 'text-base'
            } ${darkText ? 'text-slate-900' : 'text-[#F4F4F5]'}`}
          >
            KIVO
          </span>
          {subtitle && (
            <span
              className={`text-[10px] font-medium uppercase tracking-widest block font-mono mt-0.5 ${
                darkText ? 'text-emerald-700' : 'text-[#71717A]'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
