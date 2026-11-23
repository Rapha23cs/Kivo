import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QrCodeSvg({ value, size = 84, className = '' }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let active = true;
    if (!value) {
      setDataUrl('');
      return undefined;
    }

    QRCode.toDataURL(String(value), {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!dataUrl) return null;

  return (
    <img
      src={dataUrl}
      alt="QR Code de validação do laudo"
      width={size}
      height={size}
      className={`rounded border border-slate-200 bg-white ${className}`}
    />
  );
}
