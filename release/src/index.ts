export * from '../../packages/ir/src/index.js';
export * from '../../packages/renderer/src/index.js';

import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { validateIR } from '../../packages/ir/src/index.js';
import { Infographic, type BlockRendererRegistry } from '../../packages/renderer/src/index.js';

export interface RenderOptions {
  assetBase?: string;
  renderers?: BlockRendererRegistry;
}

/** Validate and mount an infographic JSON document into a DOM element. */
export function render(container: Element, document: unknown, options: RenderOptions = {}) {
  const ir = validateIR(document);
  const root = createRoot(container);
  root.render(createElement(Infographic, { ir, ...options }));
  return { unmount: () => root.unmount() };
}
