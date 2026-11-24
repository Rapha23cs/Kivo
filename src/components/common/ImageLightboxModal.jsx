import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Download, Camera } from 'lucide-react';
import { sanitizeMediaUrl } from '../../utils/kivoHelpers';

export default function ImageLightboxModal({
  isOpen,
  images = [],
  currentIndex = 0,
  onChangeIndex,
  onClose
}) {
  const safeList = images
    .map((img) => ({ ...img, url: sanitizeMediaUrl(img?.url) }))
    .filter((img) => Boolean(img.url));
  const clampedIndex = Math.max(0, Math.min(currentIndex, safeList.length - 1));
  const current = safeList[clampedIndex];

  useEffect(() => {
    if (!isOpen || safeList.length === 0) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && safeList.length > 1) {
        onChangeIndex?.((clampedIndex - 1 + safeList.length) % safeList.length);
      }
      if (e.key === 'ArrowRight' && safeList.length > 1) {
        onChangeIndex?.((clampedIndex + 1) % safeList.length);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, clampedIndex, safeList.length, onChangeIndex, onClose]);

  if (!isOpen || !current) return null;

  const content = (
    <div
      className="no-print fixed inset-0 z-[95] bg-black/92 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between gap-3 text-xs shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-[#141518] border border-[#232429] text-[#34D399] shrink-0">
            <Camera className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-[#F4F4F5] truncate">
              {current.title || 'Evidência Fotográfica'}
            </p>
            {current.subtitle && (
              <p className="text-[11px] text-[#A1A1AA] truncate">{current.subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {safeList.length > 1 && (
            <span className="font-mono text-[11px] text-[#A1A1AA] bg-[#141518] px-2.5 py-1 rounded-lg border border-[#232429]">
              {clampedIndex + 1} / {safeList.length}
            </span>
          )}
          <a
            href={current.url}
            download={`kivo-evidencia-${clampedIndex + 1}.jpg`}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-lg bg-[#141518] hover:bg-[#1C1D22] border border-[#232429] text-[#E4E4E7] transition"
            title="Abrir / Baixar original"
          >
            <Download className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-[#141518] hover:bg-[#1C1D22] border border-[#232429] text-[#E4E4E7] transition"
            title="Fechar (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center relative my-3"
        onClick={(e) => e.stopPropagation()}
      >
        {safeList.length > 1 && (
          <button
            type="button"
            onClick={() => onChangeIndex?.((clampedIndex - 1 + safeList.length) % safeList.length)}
            className="absolute left-1 sm:left-3 z-10 p-2.5 rounded-full bg-[#111214]/90 hover:bg-[#1C1D22] border border-[#2D2F36] text-[#F4F4F5] transition shadow-xl"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <img
          src={current.url}
          alt={current.title || 'Evidência'}
          className="max-h-full max-w-full object-contain rounded-xl border border-[#232429] shadow-2xl"
        />

        {safeList.length > 1 && (
          <button
            type="button"
            onClick={() => onChangeIndex?.((clampedIndex + 1) % safeList.length)}
            className="absolute right-1 sm:right-3 z-10 p-2.5 rounded-full bg-[#111214]/90 hover:bg-[#1C1D22] border border-[#2D2F36] text-[#F4F4F5] transition shadow-xl"
            aria-label="Próxima foto"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom Caption */}
      {current.observation && (
        <div
          className="max-w-3xl mx-auto bg-[#141518]/95 border border-[#232429] rounded-xl px-4 py-2.5 text-xs text-[#E4E4E7] text-center shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {current.observation}
        </div>
      )}
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }
  return content;
}
