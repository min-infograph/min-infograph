import type { MermaidConfig } from 'mermaid';

export interface InfographicStyle {
  typography: { fontFamily: string; titleSize: string; bodySize: string };
  spacing: { blockGap: string; padding: string };
  colors: { background: string; ink: string; muted: string; accent: string };
  mermaid: MermaidConfig;
}

export const technical: InfographicStyle = {
  typography: {
    fontFamily: '"IBM Plex Sans", sans-serif',
    titleSize: 'clamp(2.7rem, 5vw, 5.3rem)',
    bodySize: '1rem',
  },
  spacing: { blockGap: '1rem', padding: 'clamp(1.4rem, 3vw, 2.5rem)' },
  colors: {
    background: '#f6f7f3',
    ink: '#14222a',
    muted: '#607077',
    accent: '#ca684b',
  },
  mermaid: {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    themeVariables: {
      fontFamily: 'IBM Plex Sans, sans-serif',
      fontSize: '15px',
      background: '#ffffff',
      primaryColor: '#e2f0ee',
      primaryTextColor: '#14222a',
      primaryBorderColor: '#3f8d88',
      secondaryColor: '#f8e8de',
      secondaryTextColor: '#14222a',
      secondaryBorderColor: '#ca684b',
      tertiaryColor: '#f1f4ed',
      tertiaryTextColor: '#14222a',
      tertiaryBorderColor: '#98a8a7',
      lineColor: '#617e7e',
      textColor: '#14222a',
      actorBkg: '#e2f0ee',
      actorBorder: '#3f8d88',
      actorTextColor: '#14222a',
      signalColor: '#476c6e',
      signalTextColor: '#14222a',
      labelBoxBkgColor: '#f8e8de',
      labelBoxBorderColor: '#ca684b',
      noteBkgColor: '#fff4df',
      noteBorderColor: '#d8a25d',
      noteTextColor: '#14222a',
      activationBkgColor: '#d8eeea',
      activationBorderColor: '#3f8d88',
    },
    themeCSS: `
      .node rect, .node polygon, .node circle, .node ellipse, .actor {
        stroke-width: 1.5px;
      }
      .node rect { rx: 10px; ry: 10px; }
      .edgePath path, .flowchart-link { stroke-width: 1.7px; }
      .messageLine0, .messageLine1 { stroke-width: 1.6px; }
      .label, .nodeLabel, .messageText, .actor { font-weight: 500; }
    `,
    flowchart: {
      nodeSpacing: 48,
      rankSpacing: 60,
      curve: 'basis',
      htmlLabels: false,
      useMaxWidth: true,
    },
    sequence: { useMaxWidth: true, actorMargin: 62, messageMargin: 32 },
  },
};

/** A warmer editorial palette used to demonstrate that theme is document data. */
export const editorial: InfographicStyle = {
  ...technical,
  typography: { ...technical.typography, fontFamily: 'Manrope, sans-serif', titleSize: 'clamp(2.7rem, 5vw, 5.3rem)', bodySize: '1rem' },
  colors: { background: '#f3e8d7', ink: '#372b25', muted: '#78675b', accent: '#a94f3c' },
  mermaid: {
    ...technical.mermaid,
    themeVariables: {
      ...technical.mermaid.themeVariables,
      fontFamily: 'Manrope, sans-serif', background: '#fffaf1',
      primaryColor: '#f0d8b9', primaryTextColor: '#372b25', primaryBorderColor: '#a94f3c',
      secondaryColor: '#e4c6b4', secondaryTextColor: '#372b25', secondaryBorderColor: '#765342',
      tertiaryColor: '#f7edda', tertiaryTextColor: '#372b25', tertiaryBorderColor: '#a98a64',
      lineColor: '#8e6251', textColor: '#372b25', actorBkg: '#f0d8b9', actorBorder: '#a94f3c', actorTextColor: '#372b25',
      signalColor: '#8e6251', signalTextColor: '#372b25', labelBoxBkgColor: '#f7edda', labelBoxBorderColor: '#a98a64',
      noteBkgColor: '#fff0c9', noteBorderColor: '#c08a42', noteTextColor: '#372b25', activationBkgColor: '#e8cbb5', activationBorderColor: '#a94f3c',
    },
    themeCSS: `${technical.mermaid.themeCSS}\n.node rect { rx: 0; ry: 0; }`,
  },
};

export const mindful: InfographicStyle = {
  ...technical,
  typography: { fontFamily: 'Manrope, sans-serif', titleSize: 'clamp(2.7rem, 5vw, 5.3rem)', bodySize: '1rem' },
  colors: { background: '#f7fbff', ink: '#17233d', muted: '#53647c', accent: '#338ac7' },
  mermaid: technical.mermaid,
};

export const opportunity: InfographicStyle = {
  ...technical,
  typography: { fontFamily: 'Manrope, sans-serif', titleSize: 'clamp(2.7rem, 5vw, 5.3rem)', bodySize: '1rem' },
  colors: { background: '#fbfcff', ink: '#151c36', muted: '#546079', accent: '#5f48c8' },
};

export function getInfographicStyle(name: 'technical' | 'editorial' | 'mindful' | 'opportunity') {
  return name === 'editorial' ? editorial : name === 'mindful' ? mindful : name === 'opportunity' ? opportunity : technical;
}
