import type { GridInfographicIR, InfographicIR, InfographicBlock as Block, PosterInfographicIR, TechnicalStyle, InfographicShape } from '@min-infograph/ir';
import { getInfographicStyle } from '../styles/technical.js';
import { InfographicBlock } from './InfographicBlock.js';
import { PosterInfographic } from './PosterInfographic.js';
import type { ReactNode } from 'react';

export interface BlockRenderContext { block: Block; style: TechnicalStyle; shape: InfographicShape; columns: number; index: number; assetBase: string }
/** Return React content to replace a built-in block, or null to use its default renderer. */
export type CustomBlockRenderer = (context: BlockRenderContext) => ReactNode | null;
export type BlockRendererRegistry = Partial<Record<Block['type'], CustomBlockRenderer>>;

export function Infographic({ ir, renderers, assetBase = '' }: { ir: InfographicIR; renderers?: BlockRendererRegistry; assetBase?: string }) {
  if (ir.layout.type === 'poster') return <PosterInfographic ir={ir as PosterInfographicIR} assetBase={assetBase} />;
  const gridIR = ir as GridInfographicIR;
  const columns = gridIR.layout.columns;
  const style = getInfographicStyle(ir.style);
  return (
    <article className={`infographic infographic--${ir.style} infographic--${ir.shape}`} style={{
      '--block-gap': style.spacing.blockGap,
      '--sheet-padding': style.spacing.padding,
      '--title-size': style.typography.titleSize,
      '--body-size': style.typography.bodySize,
      fontFamily: style.typography.fontFamily,
    } as React.CSSProperties}>
      <header className="infographic-hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-eyebrow"><span className="hero-mark">✳</span> VISUAL FIELD GUIDE <span className="hero-separator">/</span> {ir.style.toUpperCase()} · {ir.shape.toUpperCase()}</div>
          <h1>{ir.title}</h1>
          {ir.subtitle && <p className="hero-subtitle">{ir.subtitle}</p>}
          <div className="hero-footer"><span>COMPOSED FROM STRUCTURED DATA</span><span>01 — {String(ir.blocks.length).padStart(2, '0')} BLOCKS</span></div>
        </div>
        <div className="hero-orbit" aria-hidden="true"><span /><span /><span /></div>
      </header>
      <div className="infographic-body" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {gridIR.blocks.map((block, index) => {
          const context = { block, style: ir.style, shape: ir.shape, columns, index, assetBase };
          const custom = renderers?.[block.type]?.(context);
          return custom == null
            ? <InfographicBlock key={block.id} block={block} columns={columns} index={index} style={ir.style} shape={ir.shape} assetBase={assetBase} />
            : <div key={block.id} className={`infographic-block infographic-block--${block.type}`} style={{ gridColumn: `span ${Math.min(block.span ?? 1, columns)}` }} data-block-id={block.id}>{custom}</div>;
        })}
      </div>
      <footer className="infographic-footer"><span>INFOGRAPHIC / {ir.version}</span><span>MERMAID + NATIVE BLOCKS</span></footer>
    </article>
  );
}
