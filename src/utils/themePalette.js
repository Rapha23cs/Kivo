// Paletas White-label de destaque do Kivo (aplicadas via data-accent e variáveis CSS + PDF)

export const KIVO_ACCENT_PRESETS = [
  {
    id: 'emerald',
    label: 'Esmeralda Kivo',
    hex: '#2EB88A',
    lightHex: '#34D399',
    darkHex: '#047857',
    softHex: '#122620',
    softHoverHex: '#173028',
    lightSoftHex: '#ECFDF5',
    lightSoftHoverHex: '#D1FAE5',
    onAccentHex: '#06281E'
  },
  {
    id: 'teal',
    label: 'Teal Clínico',
    hex: '#14B8A6',
    lightHex: '#2DD4BF',
    darkHex: '#0F766E',
    softHex: '#102424',
    softHoverHex: '#153130',
    lightSoftHex: '#F0FDFA',
    lightSoftHoverHex: '#CCFBF1',
    onAccentHex: '#042F2E'
  },
  {
    id: 'sky',
    label: 'Azul Engenharia',
    hex: '#0EA5E9',
    lightHex: '#38BDF8',
    darkHex: '#0369A1',
    softHex: '#0E202B',
    softHoverHex: '#132C3B',
    lightSoftHex: '#F0F9FF',
    lightSoftHoverHex: '#E0F2FE',
    onAccentHex: '#082F49'
  },
  {
    id: 'indigo',
    label: 'Índigo Corporativo',
    hex: '#6366F1',
    lightHex: '#818CF8',
    darkHex: '#4338CA',
    softHex: '#181930',
    softHoverHex: '#202242',
    lightSoftHex: '#EEF2FF',
    lightSoftHoverHex: '#E0E7FF',
    onAccentHex: '#EEF2FF'
  },
  {
    id: 'amber',
    label: 'Âmbar Segurança',
    hex: '#F59E0B',
    lightHex: '#FBBF24',
    darkHex: '#B45309',
    softHex: '#241B0E',
    softHoverHex: '#322512',
    lightSoftHex: '#FFFBEB',
    lightSoftHoverHex: '#FEF3C7',
    onAccentHex: '#271402'
  },
  {
    id: 'rose',
    label: 'Rubi Saúde',
    hex: '#F43F5E',
    lightHex: '#FB7185',
    darkHex: '#BE123C',
    softHex: '#251218',
    softHoverHex: '#341821',
    lightSoftHex: '#FFF1F2',
    lightSoftHoverHex: '#FFE4E6',
    onAccentHex: '#FFF1F2'
  }
];

export function getAccentPreset(id) {
  return KIVO_ACCENT_PRESETS.find((p) => p.id === id) || KIVO_ACCENT_PRESETS[0];
}

export function applyAccentCssVariables(accentId, theme = 'dark') {
  if (typeof document === 'undefined') return;
  const preset = getAccentPreset(accentId);
  const root = document.documentElement;
  root.setAttribute('data-accent', preset.id);
  root.style.setProperty('--kivo-accent', preset.hex);
  root.style.setProperty('--kivo-accent-light', preset.lightHex);
  root.style.setProperty('--kivo-accent-dark', preset.darkHex);
  root.style.setProperty('--kivo-accent-soft', theme === 'light' ? preset.lightSoftHex : preset.softHex);
  root.style.setProperty('--kivo-accent-soft-hover', theme === 'light' ? preset.lightSoftHoverHex : preset.softHoverHex);
  root.style.setProperty('--kivo-on-accent', preset.onAccentHex);
}
