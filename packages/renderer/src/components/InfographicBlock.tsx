import type { InfographicBlock as Block, InfographicShape, TechnicalStyle } from '@min-infograph/ir';
import { MermaidBlock } from './MermaidBlock.js';
import { ImageAsset } from './PosterInfographic.js';

interface Props { block: Block; columns: number; index: number; style: TechnicalStyle; shape: InfographicShape; assetBase?: string }

export function InfographicBlock({ block, columns, index, style, shape, assetBase }: Props) {
  const span = Math.min(block.span ?? 1, columns);
  const className = [
    'infographic-block',
    `infographic-block--${block.type}`,
    block.emphasis === 'high' ? 'infographic-block--high' : '',
    block.type === 'callout' ? `infographic-block--${block.tone ?? 'info'}` : '',
  ].filter(Boolean).join(' ');

  return (
    <section className={className} style={{ gridColumn: `span ${span}` }} data-block-id={block.id}>
      {block.type === 'mermaid' && <MermaidBlock diagram={block.diagram} title={block.title} style={style} shape={shape} appearance={block.appearance} />}
      {block.type === 'text' && <div className="native-block text-block">
        <div className="block-topline"><span className="block-kicker"><span className="kicker-dot" /> EXPLAINER</span><span className="block-index">{String(index + 1).padStart(2, '0')}</span></div>
        {block.title && <h2 className="block-heading">{block.title}</h2>}
        <p>{block.text}</p>
      </div>}
      {block.type === 'callout' && <div className="native-block callout-block">
        <div className="block-topline"><span className="block-kicker"><span className="kicker-dot" /> KEY INSIGHT</span><span className="block-index">{String(index + 1).padStart(2, '0')}</span></div>
        <div className="callout-content"><span className="callout-quote">“</span><div><h2 className="block-heading">{block.title}</h2><p>{block.text}</p></div></div>
      </div>}
      {block.type === 'metric' && <div className="native-block metric-block">
        <div className="block-topline"><span className="block-kicker"><span className="kicker-dot" /> AT A GLANCE</span><span className="block-index">{String(index + 1).padStart(2, '0')}</span></div>
        <div className="metric-content"><strong>{block.value}</strong><span>{block.label}</span></div>{block.detail && <p className="metric-detail">{block.detail}</p>}
      </div>}
      {block.type === 'image' && <figure className="native-block grid-image-block"><ImageAsset image={block.image} className="grid-image-asset" assetBase={assetBase} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>}
    </section>
  );
}
