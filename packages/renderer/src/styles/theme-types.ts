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
