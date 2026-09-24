import { useMemo, useState } from 'react';
import { Infographic } from '@min-infograph/renderer';
import { ZoomPanCanvas } from '@min-infograph/renderer';
import { measureMermaidRenderTimes } from '@min-infograph/renderer';
import { validateIR } from '@min-infograph/ir';
import agentExample from './examples/ai-agent.json';
import temporalExample from './examples/temporal.json';
import styleStudyExample from './examples/style-study.json';
import emotionExample from './examples/emotion-decisions.json';
import opportunityExample from './examples/opportunity-ai.json';
import mermaidAppearanceExample from './examples/mermaid-appearance.json';
import type { MermaidBlock as MermaidIRBlock, MermaidNodeEffect, MermaidNodeShape } from '@min-infograph/ir';

const examples = {
  agent: { label: 'AI Agent', data: agentExample },
  temporal: { label: 'Temporal', data: temporalExample },
  study: { label: 'Style study', data: styleStudyExample },
  emotion: { label: 'Emotion & decisions', data: emotionExample },
  opportunity: { label: 'AI opportunity', data: opportunityExample },
  mermaid: { label: 'Mermaid shapes', data: mermaidAppearanceExample },
} as const;

type ExampleKey = keyof typeof examples;
type BenchResult = Record<1 | 5 | 10, number>;
const initialRenderSource = (): string | undefined => {
  const encoded = new URLSearchParams(window.location.search).get('render');
  if (!encoded) return undefined;
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch { return undefined; }
};
const initialExample = (): ExampleKey => {
  const key = new URLSearchParams(window.location.search).get('example');
  return key && key in examples ? key as ExampleKey : 'agent';
};

export function App() {
  const [example, setExample] = useState<ExampleKey>(initialExample);
  const [source, setSource] = useState(() => initialRenderSource() ?? JSON.stringify(examples[initialExample()].data, null, 2));
  const [bench, setBench] = useState<BenchResult | null>(null);
  const [benchmarking, setBenchmarking] = useState(false);
  const [showSource, setShowSource] = useState(false);

  const parsed = useMemo(() => {
    try { return { ir: validateIR(JSON.parse(source)), error: null }; }
    catch (error) { return { ir: null, error: error instanceof Error ? error.message : String(error) }; }
  }, [source]);

  const diagramCount = parsed.ir?.blocks.filter((block) => block.type === 'mermaid').length ?? 0;
  const firstDiagram = parsed.ir?.blocks.find((block): block is MermaidIRBlock => block.type === 'mermaid');
  const editableNode = Object.keys(firstDiagram?.appearance?.nodeShapes ?? firstDiagram?.appearance?.nodeEffects ?? {})[0];

  function selectExample(key: ExampleKey) {
    setExample(key);
    setSource(JSON.stringify(examples[key].data, null, 2));
    setBench(null);
    const url = new URL(window.location.href);
    url.searchParams.set('example', key);
    window.history.replaceState(null, '', url);
  }

  function updateDocumentField(field: 'style' | 'shape', value: string) {
    try {
      const document = JSON.parse(source) as Record<string, unknown>;
      document[field] = value;
      setSource(JSON.stringify(document, null, 2));
      setBench(null);
    } catch {
      // Keep invalid hand-edited JSON visible; the source editor reports the error.
    }
  }

  function updateDiagramAppearance(field: 'fontSize' | 'nodeShape' | 'nodeEffect', value: number | MermaidNodeShape | MermaidNodeEffect) {
    if (!firstDiagram?.appearance) return;
    try {
      const document = JSON.parse(source) as { blocks: Array<{ id: string; appearance?: { fontSize?: number; nodeShapes?: Record<string, MermaidNodeShape>; nodeEffects?: Record<string, MermaidNodeEffect> } }> };
      const block = document.blocks.find((item) => item.id === firstDiagram.id);
      if (!block?.appearance) return;
      if (field === 'fontSize') block.appearance.fontSize = value as number;
      else if (editableNode && field === 'nodeShape') (block.appearance.nodeShapes ??= {})[editableNode] = value as MermaidNodeShape;
      else if (editableNode && field === 'nodeEffect') (block.appearance.nodeEffects ??= {})[editableNode] = value as MermaidNodeEffect;
      setSource(JSON.stringify(document, null, 2));
      setBench(null);
    } catch { /* Keep invalid JSON visible for correction in the editor. */ }
  }

  let currentDocument: Record<string, unknown> = {};
  try { currentDocument = JSON.parse(source) as Record<string, unknown>; } catch { /* invalid source */ }

  async function runBenchmark() {
    if (!firstDiagram) return;
    setBenchmarking(true);
    setBench(null);
    try { setBench(await measureMermaidRenderTimes(firstDiagram.diagram, parsed.ir!.style, parsed.ir!.shape, firstDiagram.appearance)); }
    finally { setBenchmarking(false); }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand"><div className="brand-symbol"><span /><span /><span /><span /></div><div><strong>FORMA</strong><small>INFOGRAPHIC SYSTEM</small></div></div>
        <div className="app-header-meta"><span className="header-pill"><span /> LIVE PREVIEW</span><span className="header-version">PROOF OF CONCEPT · V0.1</span></div>
      </header>

      <main className="workspace">
        <aside className={`editor-panel ${showSource ? 'editor-panel--open' : ''}`}>
          <div className="panel-heading"><span className="panel-overline">THE WORKBENCH</span><h2>Source to story.</h2><p>Edit the infographic definition. Every valid change renders in the preview.</p></div>
          <div className="control-group"><div className="control-label"><span>01</span> EXAMPLE</div><div className="example-switcher">
            {(Object.keys(examples) as ExampleKey[]).map((key) => <button key={key} className={example === key ? 'example-button active' : 'example-button'} onClick={() => selectExample(key)} type="button">{examples[key].label}<span>↗</span></button>)}
          </div></div>
          <div className="control-group design-controls"><div className="control-label"><span>02</span> DESIGN YOUR INFOGRAPHIC</div>
            <label className="design-select"><span>Theme</span><select aria-label="Infographic theme" value={String(currentDocument.style ?? 'technical')} onChange={(event) => updateDocumentField('style', event.target.value)}><option value="technical">Technical · cool teal</option><option value="editorial">Editorial · warm paper</option><option value="mindful">Mindful · soft pastel</option><option value="opportunity">Opportunity · vivid blue</option></select></label>
            <label className="design-select"><span>Shape</span><select aria-label="Infographic shape" value={String(currentDocument.shape ?? 'rounded')} onChange={(event) => updateDocumentField('shape', event.target.value)}><option value="rounded">Rounded corners</option><option value="angular">Angular corners</option></select></label>
            <p>These controls edit the document JSON, so the preview and source stay in sync.</p>
            {firstDiagram?.appearance && <div className="mermaid-appearance-controls">
              <div className="control-label">MERMAID DIAGRAM</div>
              <label className="mermaid-font-control"><span>Diagram font size <output>{firstDiagram.appearance.fontSize ?? 15}px</output></span><input type="range" min="12" max="28" step="1" aria-label="Mermaid font size" value={firstDiagram.appearance.fontSize ?? 15} onChange={(event) => updateDiagramAppearance('fontSize', Number(event.target.value))} /></label>
              {editableNode && <label className="design-select"><span>Shape for {editableNode}</span><select aria-label={`Mermaid node shape for ${editableNode}`} value={firstDiagram.appearance.nodeShapes?.[editableNode]} onChange={(event) => updateDiagramAppearance('nodeShape', event.target.value as MermaidNodeShape)}><option value="rect">Rectangle</option><option value="rounded">Rounded</option><option value="stadium">Stadium</option><option value="diam">Diamond</option><option value="hex">Hexagon</option><option value="cyl">Cylinder</option><option value="circle">Circle</option><option value="cloud">Cloud</option></select></label>}
              {editableNode && <label className="design-select"><span>Effect for {editableNode}</span><select aria-label={`Mermaid node effect for ${editableNode}`} value={firstDiagram.appearance.nodeEffects?.[editableNode] ?? 'none'} onChange={(event) => updateDiagramAppearance('nodeEffect', event.target.value as MermaidNodeEffect)}><option value="none">No effect</option><option value="soft-shadow">Soft shadow</option><option value="blue-glow">Blue glow</option><option value="coral-glow">Coral glow</option></select></label>}
              <p>These settings affect the first Mermaid diagram. Edit nodeShapes and nodeEffects in the JSON to style other nodes.</p>
            </div>}
          </div>
          <div className="control-group source-group"><div className="control-label"><span>03</span> INFOGRAPHIC IR <span className="json-tag">JSON</span></div>
            <textarea aria-label="Infographic JSON" spellCheck={false} value={source} onChange={(event) => setSource(event.target.value)} />
            <div className={`validation-status ${parsed.error ? 'validation-status--error' : ''}`}><span className="status-icon">{parsed.error ? '!' : '✓'}</span><span>{parsed.error ?? `Valid IR · ${parsed.ir?.blocks.length} blocks · ${diagramCount} diagrams`}</span></div>
          </div>
          <div className="control-group benchmark-group"><div className="control-label"><span>04</span> RENDER EXPERIMENT</div><p>Measure approximate client render time using this example’s first diagram.</p><button type="button" className="bench-button" disabled={!diagramCount || benchmarking} onClick={runBenchmark}>{benchmarking ? 'Measuring…' : 'Measure 1 / 5 / 10 diagrams'} <span>↗</span></button>
            {bench && <div className="benchmark-results">{([1, 5, 10] as const).map((count) => <div key={count}><strong>{bench[count]}<small>ms</small></strong><span>{count} {count === 1 ? 'diagram' : 'diagrams'}</span></div>)}</div>}
          </div>
          <p className="panel-footnote">The JSON is the source of truth. Mermaid SVG is rebuilt whenever diagram source changes.</p>
        </aside>

        <section className="preview-panel" aria-label="Infographic preview">
          <div className="preview-toolbar"><div><span className="preview-indicator" /> PREVIEW CANVAS <span className="preview-slash">/</span> {examples[example].label.toUpperCase()}</div><button className="source-toggle" type="button" onClick={() => setShowSource((value) => !value)}>{showSource ? 'Hide source' : 'Edit source'} <span>↗</span></button></div>
          <div className="preview-canvas">{parsed.ir ? <ZoomPanCanvas key={example}><Infographic ir={parsed.ir} assetBase={import.meta.env.BASE_URL} /></ZoomPanCanvas> : <div className="invalid-preview"><span>!</span><h2>Check the JSON source</h2><p>{parsed.error}</p></div>}</div>
        </section>
      </main>
    </div>
  );
}
