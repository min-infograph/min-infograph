import { useEffect, useState } from 'react';
import type { PosterBlock, PosterIcon, PosterImage, PosterInfographicIR, PosterTone } from '@min-infograph/ir';
import { Brain, Lightbulb, Lightning, SmileySad, PersonSimpleRun, Question, Smiley, Pause, MagnifyingGlass, ListBullets, Check, ChartBar, Gear, Target, Plant, Flag, UsersThree, Globe } from '@phosphor-icons/react';
import '../styles/poster.css';
import '../styles/opportunity.css';

const icons = { brain: Brain, lightbulb: Lightbulb, bolt: Lightning, mood_bad: SmileySad, directions_run: PersonSimpleRun, help: Question, sentiment_satisfied: Smiley, pause: Pause, search: MagnifyingGlass, list: ListBullets, check: Check, bar_chart: ChartBar, settings: Gear, target: Target, eco: Plant, flag: Flag, users: UsersThree, globe: Globe };
function Icon({ name, className = '' }: { name: PosterIcon; className?: string }) {
  const Component = icons[name];
  return <Component className={`poster-icon ${className}`} size="1em" weight="duotone" aria-hidden="true" />;
}
function Head({ title, subtitle }: { title: string; subtitle?: string }) {
  return <div className="poster-section-head"><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>;
}
function Card({ block }: { block: Extract<PosterBlock, { type: 'poster-card' }> }) {
  return <section className={`poster-widget poster-card tone-${block.tone}`}>
    <Head title={block.title} subtitle={block.subtitle} />
    <div className="poster-card-main"><div className="poster-brain"><Icon name={block.icon} /></div><ul>{block.points.map((point, index) => <li key={index}>{point.lead && <strong>{point.lead} </strong>}{point.text}</li>)}</ul></div>
    {block.quote && <blockquote>“{block.quote}”</blockquote>}
  </section>;
}
function Insight({ block }: { block: Extract<PosterBlock, { type: 'poster-insight' }> }) {
  return <section className="poster-widget poster-insight tone-mint"><h2>{block.title}</h2><Icon name={block.icon} className="insight-icon" /><strong>{block.lead}</strong>{block.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>;
}
function Stage({ stage, tone }: { stage: { icon: PosterIcon; label: string; detail?: string }; tone: PosterTone }) {
  return <div className={`poster-stage stage-${tone}`}><div className="poster-stage-icon"><Icon name={stage.icon} /></div><strong>{stage.label}</strong>{stage.detail && <small>{stage.detail}</small>}</div>;
}
function Flow({ block }: { block: Extract<PosterBlock, { type: 'poster-flow' }> }) {
  return <section className="poster-widget poster-flow"><Head title={block.title} subtitle={block.subtitle} />{block.lanes.map((lane, index) => <div className={`poster-flow-lane tone-${lane.tone}`} key={index}><div className="flow-lane-label">{lane.label}</div><div className="flow-stages">{lane.stages.map((stage, stageIndex) => <div className="poster-stage-wrap" key={stageIndex}><Stage stage={stage} tone={lane.tone} />{stageIndex < lane.stages.length - 1 && <span className="flow-arrow" aria-hidden="true">→</span>}</div>)}</div></div>)}</section>;
}
function Example({ block }: { block: Extract<PosterBlock, { type: 'poster-example' }> }) {
  return <section className="poster-widget poster-example"><Head title={block.title} subtitle={block.subtitle} /><div className="poster-example-columns">{block.columns.map((column, index) => <div className={`poster-example-column tone-${column.tone}`} key={index}><h3>{column.title}</h3><p>“{column.quote}”</p><ul>{column.points.map((point, pointIndex) => <li key={pointIndex}>{point}</li>)}</ul></div>)}</div></section>;
}
function Steps({ block }: { block: Extract<PosterBlock, { type: 'poster-steps' }> }) {
  return <section className="poster-widget poster-steps"><Head title={block.title} subtitle={block.subtitle} /><ol>{block.steps.map((step, index) => <li key={index}><span className="poster-step-number">{index + 1}</span><div><strong>{step.title}</strong><p>{step.detail}</p></div></li>)}</ol></section>;
}
function Takeaways({ block }: { block: Extract<PosterBlock, { type: 'poster-takeaways' }> }) {
  return <section className="poster-widget poster-takeaways"><h2>{block.title}</h2><ul>{block.items.map((item, index) => <li key={index}><span className="poster-takeaway-icon"><Icon name={item.icon} /></span><span>{item.text}</span></li>)}</ul></section>;
}
function Banner({ block }: { block: Extract<PosterBlock, { type: 'poster-banner' }> }) {
  return <section className="poster-widget poster-banner"><Icon name={block.icon} /><div><h2>{block.title}</h2><p>{block.text}</p></div>{block.quote && <blockquote>“{block.quote}”</blockquote>}</section>;
}
export function ImageAsset({ image, className = '', assetBase = '' }: { image: PosterImage; className?: string; assetBase?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [image.src]);
  return <div className={`poster-image-frame ${className}`}>
    {failed ? <div className="poster-image-error" role="img" aria-label={image.alt}>Image unavailable</div> : <img src={image.src.startsWith('/') ? `${assetBase.replace(/\/$/, '')}${image.src}` : image.src} alt={image.alt} className={`poster-image-fit-${image.fit ?? 'contain'}`} decoding="async" onError={() => setFailed(true)} />}
  </div>;
}
function VisualCard({ block, assetBase }: { block: Extract<PosterBlock, { type: 'poster-visual-card' }>; assetBase?: string }) {
  return <section className={`poster-widget poster-visual-card tone-${block.tone}`}>
    <div className="visual-card-heading"><span className="visual-card-number">{block.index}</span><div><h2>{block.title}</h2>{block.subtitle && <p>{block.subtitle}</p>}</div></div>
    <div className="visual-card-summary">{block.summary}</div>
    <ImageAsset image={block.image} className="visual-card-image" assetBase={assetBase} />
    <ul>{block.bullets.map((bullet, index) => <li key={index}><span aria-hidden="true">✓</span>{bullet}</li>)}</ul>
  </section>;
}
function VisualStory({ block, assetBase }: { block: Extract<PosterBlock, { type: 'poster-visual-story' }>; assetBase?: string }) {
  return <section className={`poster-widget poster-visual-story tone-${block.tone}`}>
    <h3>{block.title}</h3>{block.subtitle && <p className="visual-story-subtitle">{block.subtitle}</p>}
    <ImageAsset image={block.image} className="visual-story-image" assetBase={assetBase} />
    <strong className="visual-story-banner">{block.banner}</strong><p className="visual-story-description">{block.description}</p>
  </section>;
}
function StandaloneImage({ block, assetBase }: { block: Extract<PosterBlock, { type: 'poster-image' }>; assetBase?: string }) {
  return <figure className="poster-widget poster-standalone-image"><ImageAsset image={block.image} assetBase={assetBase} />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>;
}
function FeatureStrip({ block }: { block: Extract<PosterBlock, { type: 'poster-feature-strip' }> }) {
  return <section className="poster-widget poster-feature-strip"><h2>{block.title}</h2><div className="poster-feature-grid">{block.features.map((feature, index) => <div className="poster-feature" key={index}><Icon name={feature.icon} /><div><strong>{feature.title}</strong><p>{feature.text}</p></div></div>)}</div></section>;
}
function QuotePanel({ block }: { block: Extract<PosterBlock, { type: 'poster-quote' }> }) {
  return <section className="poster-widget poster-quote-panel"><h2>{block.title}</h2><blockquote>“{block.text}”</blockquote></section>;
}
function Footnote({ block }: { block: Extract<PosterBlock, { type: 'poster-footnote' }> }) {
  return <footer className="poster-footnote"><span>{block.left}</span><span>{block.right}</span></footer>;
}
function PosterHeading({ block }: { block: Extract<PosterBlock, { type: 'poster-heading' }> }) {
  return <div className="poster-opportunity-heading"><h2>{block.title}</h2>{block.note && <p>{block.note}</p>}</div>;
}
function Widget({ block, assetBase }: { block: PosterBlock; assetBase: string }) {
  const content = (() => { switch (block.type) {
    case 'poster-card': return <Card block={block} />;
    case 'poster-insight': return <Insight block={block} />;
    case 'poster-flow': return <Flow block={block} />;
    case 'poster-example': return <Example block={block} />;
    case 'poster-steps': return <Steps block={block} />;
    case 'poster-takeaways': return <Takeaways block={block} />;
    case 'poster-banner': return <Banner block={block} />;
    case 'poster-visual-card': return <VisualCard block={block} assetBase={assetBase} />;
    case 'poster-visual-story': return <VisualStory block={block} assetBase={assetBase} />;
    case 'poster-image': return <StandaloneImage block={block} assetBase={assetBase} />;
    case 'poster-feature-strip': return <FeatureStrip block={block} />;
    case 'poster-quote': return <QuotePanel block={block} />;
    case 'poster-footnote': return <Footnote block={block} />;
    case 'poster-heading': return <PosterHeading block={block} />;
  } })();
  return <div className="poster-grid-item" style={{ gridColumn: `span ${block.span}` }} data-block-id={block.id}>{content}</div>;
}
export function PosterInfographic({ ir, assetBase = '' }: { ir: PosterInfographicIR; assetBase?: string }) {
  const highlightAt = ir.highlight ? ir.title.lastIndexOf(ir.highlight) : -1;
  return <article className={`infographic poster-infographic infographic--${ir.style} infographic--${ir.shape}`}>
    <header className="poster-header"><h1>{highlightAt >= 0 ? <>{ir.title.slice(0, highlightAt)}<span className="poster-title-highlight">{ir.highlight}</span>{ir.title.slice(highlightAt + ir.highlight!.length)}</> : ir.title}</h1>{ir.subtitle && <p>{ir.subtitle}</p>}{ir.note && <aside>{ir.note}</aside>}</header>
    <div className="poster-grid">{ir.blocks.map(block => <Widget key={block.id} block={block} assetBase={assetBase} />)}</div>
  </article>;
}
