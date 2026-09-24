import { getInfographicStyle } from '../styles/technical.js';
import type { InfographicShape, MermaidAppearance, TechnicalStyle } from '@min-infograph/ir';

type MermaidAPI = typeof import('mermaid')['default'];
let mermaidPromise: Promise<MermaidAPI> | undefined;

function getMermaid(): Promise<MermaidAPI> {
  mermaidPromise ??= import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize(getInfographicStyle('technical').mermaid);
    return mermaid;
  });
  return mermaidPromise;
}

let nextRenderId = 0;
let renderQueue: Promise<unknown> = Promise.resolve();

const effectCSS = `
.node.forma-shadow .label-container { filter: drop-shadow(0 5px 4px rgba(24, 51, 49, .32)); }
.node.forma-glow-blue .label-container { filter: drop-shadow(0 0 8px rgba(48, 133, 223, .9)) drop-shadow(0 0 3px rgba(48, 133, 223, .7)); }
.node.forma-glow-coral .label-container { filter: drop-shadow(0 0 8px rgba(232, 100, 78, .9)) drop-shadow(0 0 3px rgba(232, 100, 78, .7)); }`;
const effectClasses = { 'soft-shadow': 'forma-shadow', 'blue-glow': 'forma-glow-blue', 'coral-glow': 'forma-glow-coral' } as const;

/** Mermaid owns its SVG. Callers only keep it until the IR changes. */
export function renderMermaid(diagram: string, style: TechnicalStyle = 'technical', shape: InfographicShape = 'rounded', appearance?: MermaidAppearance): Promise<string> {
  const run = async () => {
    const mermaid = await getMermaid();
    // Rendering and configuration share Mermaid's global state, so initialize
    // the requested palette inside the same serialized queue as the render.
    const config = getInfographicStyle(style).mermaid;
    const nodeCorners = shape === 'angular' ? '.node rect { rx: 0; ry: 0; }' : '.node rect { rx: 10px; ry: 10px; }';
    mermaid.initialize({
      ...config,
      themeVariables: { ...config.themeVariables, ...(appearance?.fontSize ? { fontSize: `${appearance.fontSize}px` } : {}) },
      themeCSS: `${config.themeCSS}\n${nodeCorners}\n${effectCSS}`,
    });
    const id = `infographic-mermaid-${++nextRenderId}`;
    // Appending Mermaid's native node declarations preserves the authored
    // labels and links while allowing IR-driven geometry overrides.
    const isFlowchart = /^\s*(?:flowchart|graph)\b/i.test(diagram);
    const shapeDeclarations = isFlowchart ? Object.entries(appearance?.nodeShapes ?? {}).map(([nodeId, nodeShape]) => `  ${nodeId}@{ shape: ${nodeShape} }`) : [];
    const effectDeclarations = isFlowchart ? Object.entries(appearance?.nodeEffects ?? {}).flatMap(([nodeId, effect]) => effect === 'none' ? [] : [`  class ${nodeId} ${effectClasses[effect]}`]) : [];
    const shapedDiagram = [...shapeDeclarations, ...effectDeclarations].length
      ? `${diagram.trimEnd()}\n${[...shapeDeclarations, ...effectDeclarations].join('\n')}`
      : diagram;
    const { svg } = await mermaid.render(id, shapedDiagram);
    return svg;
  };

  // Mermaid uses temporary DOM nodes internally. Serialize calls while keeping
  // every diagram independent and every SVG definition ID unique.
  const result = renderQueue.then(run, run);
  renderQueue = result.then(() => undefined, () => undefined);
  return result;
}

export async function measureMermaidRenderTimes(diagram: string, style: TechnicalStyle = 'technical', shape: InfographicShape = 'rounded', appearance?: MermaidAppearance) {
  const result: Record<1 | 5 | 10, number> = { 1: 0, 5: 0, 10: 0 };
  for (const count of [1, 5, 10] as const) {
    const start = performance.now();
    for (let index = 0; index < count; index++) await renderMermaid(diagram, style, shape, appearance);
    result[count] = Math.round(performance.now() - start);
  }
  return result;
}
