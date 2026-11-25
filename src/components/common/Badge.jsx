import React from 'react';

export default function Badge({ children, variant = 'neutral', size = 'md', dot = false, className = '' }) {
  const variantStyles = {
    neutral: 'bg-[#1A1B20] text-[#A1A1AA] border-[#27282E]',
    primary: 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30',
    success: 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30',
    warning: 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/30',
    danger: 'bg-[#221216] text-[#FB7185] border-[#F43F5E]/30',
    info: 'bg-[#181A20] text-[#CBD5E1] border-[#2C2F38]',
    purple: 'bg-[#1B1926] text-[#A5B4FC] border-[#6366F1]/30',
  };

  const dotColors = {
    neutral: 'bg-[#71717A]',
    primary: 'bg-[#34D399]',
    success: 'bg-[#34D399]',
    warning: 'bg-[#FBBF24]',
    danger: 'bg-[#FB7185]',
    info: 'bg-[#94A3B8]',
    purple: 'bg-[#A5B4FC]',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-xs px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium tracking-tight rounded-full border ${variantStyles[variant] || variantStyles.neutral} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant] || dotColors.neutral}`} />
      )}
      {children}
    </span>
  );
}

