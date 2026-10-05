import { Heading, HeadingContext, type HeadingLevel } from './Heading.js';
import type { GridInfographicIR, InfographicIR, InfographicBlock as Block, PosterInfographicIR, TechnicalStyle, InfographicShape } from '@min-infograph/ir';
import { themeStyle, type ThemeOverrides } from '../styles/theme.js';
import { InfographicBlock } from './InfographicBlock.js';
import { PosterInfographic } from './PosterInfographic.js';
import type { ReactNode } from 'react';

export interface BlockRenderContext { block: Block; style: TechnicalStyle; shape: InfographicShape; columns: number; index: number; assetBase: string; headingLevel: HeadingLevel; theme?: ThemeOverrides }
/** Return React content to replace a built-in block, or null to use its default renderer. */
export type CustomBlockRenderer = (context: BlockRenderContext) => ReactNode | null;
export type BlockRendererRegistry = Partial<Record<Block['type'], CustomBlockRenderer>>;

export interface InfographicProps { ir: InfographicIR; renderers?: BlockRendererRegistry; assetBase?: string; theme?: ThemeOverrides; headingLevel?: HeadingLevel }

export function Infographic({ ir, renderers, assetBase = '', theme, headingLevel = 1 }: InfographicProps) {
  if (ir.layout.type === 'poster') return <PosterInfographic ir={ir as PosterInfographicIR} assetBase={assetBase} theme={theme} headingLevel={headingLevel} />;
  const gridIR = ir as GridInfographicIR;
  const columns = gridIR.layout.columns;
  return (
    <HeadingContext.Provider value={headingLevel}>
    <article className={`infographic infographic--${ir.style} infographic--${ir.shape}`} style={themeStyle(ir.style, theme)}>
      <header className="infographic-hero">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-eyebrow"><span className="hero-mark">✳</span> VISUAL FIELD GUIDE <span className="hero-separator">/</span> {ir.style.toUpperCase()} · {ir.shape.toUpperCase()}</div>
          <Heading depth={0}>{ir.title}</Heading>
          {ir.subtitle && <p className="hero-subtitle">{ir.subtitle}</p>}
          <div className="hero-footer"><span>COMPOSED FROM STRUCTURED DATA</span><span>01 — {String(ir.blocks.length).padStart(2, '0')} BLOCKS</span></div>
        </div>
        <div className="hero-orbit" aria-hidden="true"><span /><span /><span /></div>
      </header>
      <div className="infographic-body" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {gridIR.blocks.map((block, index) => {
          const context = { block, style: ir.style, shape: ir.shape, columns, index, assetBase, headingLevel, theme };
          const custom = renderers?.[block.type]?.(context);
          return custom == null
            ? <InfographicBlock key={block.id} block={block} columns={columns} index={index} style={ir.style} shape={ir.shape} assetBase={assetBase} theme={theme} />
            : <div key={block.id} className={`infographic-block infographic-block--${block.type}`} style={{ gridColumn: `span ${Math.min(block.span ?? 1, columns)}` }} data-block-id={block.id}>{custom}</div>;
        })}
      </div>
      <footer className="infographic-footer"><span>INFOGRAPHIC / {ir.version}</span><span>MERMAID + NATIVE BLOCKS</span></footer>
    </article>
    </HeadingContext.Provider>
  );
}
