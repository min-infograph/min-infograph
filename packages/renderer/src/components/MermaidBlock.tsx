import { useEffect, useState } from 'react';
import { renderMermaid } from '../renderer/renderMermaid.js';
import type { InfographicShape, MermaidAppearance, TechnicalStyle } from '@min-infograph/ir';

interface Props {
  diagram: string;
  title?: string;
  style: TechnicalStyle;
  shape: InfographicShape;
  appearance?: MermaidAppearance;
}

export function MermaidBlock({ diagram, title, style, shape, appearance }: Props) {
  const [result, setResult] = useState<{ svg?: string; error?: string }>({});
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 600px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 600px)');
    const onChange = () => setCompact(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const renderDiagram = compact ? diagram.replace(/^(\s*(?:flowchart|graph)\s+)LR\b/i, '$1TB') : diagram;

  useEffect(() => {
    let active = true;
    setResult({});
    renderMermaid(renderDiagram, style, shape, appearance).then(
      (svg) => active && setResult({ svg }),
      (error: unknown) => active && setResult({ error: error instanceof Error ? error.message : String(error) }),
    );
    return () => { active = false; };
  }, [renderDiagram, style, shape, appearance]);

  const kind = diagram.trim().split(/\s|\n/, 1)[0].replace('Diagram', ' diagram');

  return (
    <div className="diagram-block">
      <div className="block-topline">
        <span className="block-kicker"><span className="kicker-dot" /> {kind}</span>
        <span className="block-index">DIAGRAM</span>
      </div>
      {title && <h2 className="block-heading">{title}</h2>}
      <div className="diagram-stage" role="img" aria-label={title || `${kind} diagram`}>
        {result.svg && <div className="mermaid-svg" dangerouslySetInnerHTML={{ __html: result.svg }} />}
        {result.error && <p className="diagram-error">Diagram error: {result.error}</p>}
        {!result.svg && !result.error && <div className="diagram-loading">Rendering diagram…</div>}
      </div>
    </div>
  );
}
