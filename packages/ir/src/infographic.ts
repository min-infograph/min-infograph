/** Stable, renderer-independent content model for infographic documents. */
export type SemanticEmphasis = "high" | "normal";
export type CalloutTone = "info" | "warning" | "success";
export type TechnicalStyle = "technical" | "editorial" | "mindful" | "opportunity";
export type InfographicShape = "rounded" | "angular";

export interface InfographicBaseBlock {
  id: string;
  /** Number of columns occupied in the document grid. */
  span?: number;
  emphasis?: SemanticEmphasis;
}

export interface MermaidBlock extends InfographicBaseBlock {
  type: "mermaid";
  title: string;
  diagram: string;
  appearance?: MermaidAppearance;
}

/** Mermaid-native rendering options. Node shapes apply to flowcharts only. */
export type MermaidNodeShape = "rect" | "rounded" | "stadium" | "diam" | "hex" | "cyl" | "circle" | "cloud";
export type MermaidNodeEffect = "none" | "soft-shadow" | "blue-glow" | "coral-glow";
export interface MermaidAppearance {
  fontSize?: number;
  nodeShapes?: Record<string, MermaidNodeShape>;
  nodeEffects?: Record<string, MermaidNodeEffect>;
}

export interface TextBlock extends InfographicBaseBlock {
  type: "text";
  title?: string;
  text: string;
}

export interface CalloutBlock extends InfographicBaseBlock {
  type: "callout";
  title: string;
  text: string;
  tone?: CalloutTone;
}

export interface MetricBlock extends InfographicBaseBlock {
  type: "metric";
  label: string;
  value: string;
  detail?: string;
}

export interface ImageBlock extends InfographicBaseBlock {
  type: "image";
  image: PosterImage;
  caption?: string;
}

export type InfographicBlock = MermaidBlock | TextBlock | CalloutBlock | MetricBlock | ImageBlock;

export interface GridInfographicIR {
  version: "0.1";
  title: string;
  subtitle?: string;
  style: TechnicalStyle;
  shape: InfographicShape;
  layout: {
    type: "grid";
    columns: number;
  };
  blocks: InfographicBlock[];
}

export type PosterTone = "rose" | "blue" | "mint" | "violet" | "slate";
export type PosterIcon = "brain" | "lightbulb" | "bolt" | "mood_bad" | "directions_run" | "help" | "sentiment_satisfied" | "pause" | "search" | "list" | "check" | "bar_chart" | "settings" | "target" | "eco" | "flag" | "users" | "globe";
export interface PosterPoint { lead?: string; text: string }
export interface PosterCardBlock {
  type: "poster-card"; id: string; span: number; tone: PosterTone; title: string; subtitle?: string;
  icon: PosterIcon; points: PosterPoint[]; quote?: string;
}
export interface PosterInsightBlock {
  type: "poster-insight"; id: string; span: number; title: string; icon: PosterIcon; lead: string; paragraphs: string[];
}
export interface PosterStage { icon: PosterIcon; label: string; detail?: string }
export interface PosterFlowLane { label: string; tone: PosterTone; stages: PosterStage[] }
export interface PosterFlowBlock {
  type: "poster-flow"; id: string; span: number; title: string; subtitle?: string; lanes: PosterFlowLane[];
}
export interface PosterExampleColumn { title: string; tone: PosterTone; quote: string; points: string[] }
export interface PosterExampleBlock {
  type: "poster-example"; id: string; span: number; title: string; subtitle?: string; columns: PosterExampleColumn[];
}
export interface PosterStep { title: string; detail: string }
export interface PosterStepsBlock {
  type: "poster-steps"; id: string; span: number; title: string; subtitle?: string; steps: PosterStep[];
}
export interface PosterTakeaway { icon: PosterIcon; text: string }
export interface PosterTakeawaysBlock {
  type: "poster-takeaways"; id: string; span: number; title: string; items: PosterTakeaway[];
}
export interface PosterBannerBlock {
  type: "poster-banner"; id: string; span: number; icon: PosterIcon; title: string; text: string; quote?: string;
}
export interface PosterImage { src: string; alt: string; fit?: "cover" | "contain" }
export interface PosterVisualCardBlock {
  type: "poster-visual-card"; id: string; span: number; tone: PosterTone; title: string; subtitle?: string;
  image: PosterImage; summary: string; bullets: string[]; index?: string;
}
export interface PosterVisualStoryBlock {
  type: "poster-visual-story"; id: string; span: number; tone: PosterTone; title: string; subtitle?: string;
  image: PosterImage; banner: string; description: string;
}
export interface PosterImageBlock {
  type: "poster-image"; id: string; span: number; image: PosterImage; caption?: string;
}
export interface PosterFeature { icon: PosterIcon; title: string; text: string }
export interface PosterFeatureStripBlock { type: "poster-feature-strip"; id: string; span: number; title: string; features: PosterFeature[] }
export interface PosterQuoteBlock { type: "poster-quote"; id: string; span: number; title: string; text: string }
export interface PosterFootnoteBlock { type: "poster-footnote"; id: string; span: number; left: string; right: string }
export interface PosterHeadingBlock { type: "poster-heading"; id: string; span: number; title: string; note?: string }
export type PosterBlock = PosterCardBlock | PosterInsightBlock | PosterFlowBlock | PosterExampleBlock | PosterStepsBlock | PosterTakeawaysBlock | PosterBannerBlock | PosterVisualCardBlock | PosterVisualStoryBlock | PosterImageBlock | PosterFeatureStripBlock | PosterQuoteBlock | PosterFootnoteBlock | PosterHeadingBlock;
export interface PosterInfographicIR {
  version: "0.1"; title: string; subtitle?: string; note?: string; highlight?: string;
  style: TechnicalStyle; shape: InfographicShape;
  layout: { type: "poster"; columns: 20 };
  blocks: PosterBlock[];
}
export type InfographicIR = GridInfographicIR | PosterInfographicIR;
