import type { CSSProperties } from 'react';
import type { TechnicalStyle } from '@min-infograph/ir';
import { getInfographicStyle } from './technical.js';

/** Only palette values are exposed; Mermaid security and configuration remain owned by the renderer. */
export interface MermaidPalette {
  background?: string;
  primaryColor?: string; primaryTextColor?: string; primaryBorderColor?: string;
  secondaryColor?: string; secondaryTextColor?: string; secondaryBorderColor?: string;
  tertiaryColor?: string; tertiaryTextColor?: string; tertiaryBorderColor?: string;
  lineColor?: string; textColor?: string;
  actorBkg?: string; actorBorder?: string; actorTextColor?: string;
  signalColor?: string; signalTextColor?: string;
  labelBoxBkgColor?: string; labelBoxBorderColor?: string;
  noteBkgColor?: string; noteBorderColor?: string; noteTextColor?: string;
  activationBkgColor?: string; activationBorderColor?: string;
}
export interface ThemeOverrides {
  colors?: Partial<Record<'background' | 'ink' | 'muted' | 'accent' | 'surface' | 'border' | 'heroBackground' | 'heroInk', string>>;
  typography?: { fontFamily?: string; headingFontFamily?: string; monoFontFamily?: string; titleSize?: string; bodySize?: string };
  spacing?: { blockGap?: string; padding?: string };
  mermaid?: MermaidPalette;
}

export function resolveTheme(name: TechnicalStyle, overrides?: ThemeOverrides) {
  const base = getInfographicStyle(name);
  const colors = overrides?.colors;
  return {
    ...base,
    typography: { ...base.typography, ...overrides?.typography },
    spacing: { ...base.spacing, ...overrides?.spacing },
    colors: { ...base.colors, ...colors },
    mermaid: {
      ...base.mermaid,
      themeVariables: {
        ...base.mermaid.themeVariables,
        ...(overrides?.typography?.fontFamily ? { fontFamily: overrides.typography.fontFamily } : {}),
        ...(colors?.background ? { background: colors.background } : {}),
        ...(colors?.ink ? Object.fromEntries(['textColor', 'primaryTextColor', 'secondaryTextColor', 'tertiaryTextColor', 'actorTextColor', 'signalTextColor', 'noteTextColor'].map(key => [key, colors.ink])) : {}),
        ...(colors?.accent ? { primaryBorderColor: colors.accent, secondaryBorderColor: colors.accent, actorBorder: colors.accent, lineColor: colors.accent } : {}),
        ...overrides?.mermaid,
      },
    },
  };
}
const kebab = (key: string) => key.replace(/[A-Z]/g, char => `-${char.toLowerCase()}`);
/** Tokens live on each article, so siblings cannot change one another's palette. */
export function themeStyle(name: TechnicalStyle, overrides?: ThemeOverrides, poster = false): CSSProperties {
  const resolved = resolveTheme(name, overrides);
  const tokens: Record<string, string> = {};
  for (const [key, value] of Object.entries(overrides?.colors ?? {})) tokens[`--min-infograph-${kebab(key)}`] = value;
  for (const [key, value] of Object.entries(overrides?.typography ?? {})) tokens[`--min-infograph-${kebab(key)}`] = value;
  for (const [key, value] of Object.entries(overrides?.spacing ?? {})) tokens[`--min-infograph-${key === 'padding' ? 'sheet-padding' : kebab(key)}`] = value;
  return { ...tokens, fontFamily: `var(--min-infograph-font-family, ${poster ? "'IBM Plex Sans',sans-serif" : resolved.typography.fontFamily})` } as CSSProperties;
}
