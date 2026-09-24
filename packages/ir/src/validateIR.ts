import type {
  CalloutBlock,
  InfographicBlock,
  InfographicIR,
  InfographicShape,
  ImageBlock,
  MetricBlock,
  MermaidAppearance,
  MermaidBlock,
  MermaidNodeShape,
  MermaidNodeEffect,
  SemanticEmphasis,
  TechnicalStyle,
  TextBlock,
} from "./infographic.js";
import { validatePoster, validatePosterImage } from './validatePoster.js';

/** Validate untrusted JSON and return a typed InfographicIR. */
export function validateIR(input: unknown): InfographicIR {
  if (input && typeof input === 'object' && !Array.isArray(input) && (input as { layout?: { type?: string } }).layout?.type === 'poster') return validatePoster(input);
  const fail = (path: string, message: string): never => {
    throw new Error(`${path}: ${message}`);
  };
  const objectAt = (value: unknown, path: string): Record<string, unknown> => {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return fail(path, "expected an object");
    }
    return value as Record<string, unknown>;
  };
  const onlyKeys = (obj: Record<string, unknown>, allowed: string[], path: string) => {
    for (const key of Object.keys(obj)) {
      if (!allowed.includes(key)) fail(`${path}.${key}`, "unsupported field");
    }
  };
  const requiredString = (obj: Record<string, unknown>, key: string, path: string): string => {
    const value = obj[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      return fail(`${path}.${key}`, "must be a non-empty string");
    }
    return value;
  };
  const optionalString = (obj: Record<string, unknown>, key: string, path: string): string | undefined => {
    if (obj[key] === undefined) return undefined;
    return requiredString(obj, key, path);
  };
  const validateEmphasis = (obj: Record<string, unknown>, path: string): SemanticEmphasis | undefined => {
    if (obj.emphasis === undefined) return undefined;
    if (obj.emphasis !== "high" && obj.emphasis !== "normal") {
      return fail(`${path}.emphasis`, 'must be "high" or "normal"');
    }
    return obj.emphasis;
  };

  const root = objectAt(input, "$");
  onlyKeys(root, ["version", "title", "subtitle", "style", "shape", "layout", "blocks"], "$");
  if (root.version !== "0.1") fail("$.version", 'unsupported version; expected "0.1"');
  const title = requiredString(root, "title", "$");
  const subtitle = optionalString(root, "subtitle", "$");
  if (root.style !== "technical" && root.style !== "editorial" && root.style !== "mindful" && root.style !== "opportunity") fail("$.style", 'must be "technical", "editorial", "mindful", or "opportunity"');
  const style = root.style as TechnicalStyle;
  const shape: InfographicShape = root.shape === undefined ? "rounded" : root.shape === "rounded" || root.shape === "angular" ? root.shape : fail("$.shape", 'must be "rounded" or "angular"');

  const layout = objectAt(root.layout, "$.layout");
  onlyKeys(layout, ["type", "columns"], "$.layout");
  if (layout.type !== "grid") fail("$.layout.type", 'must be "grid"');
  if (!Number.isInteger(layout.columns) || (layout.columns as number) < 1 || (layout.columns as number) > 2) {
    fail("$.layout.columns", "must be 1 or 2");
  }
  const rawBlocks = Array.isArray(root.blocks) ? root.blocks : fail("$.blocks", "must be an array");
  if (rawBlocks.length === 0) fail("$.blocks", "must be a non-empty array");

  const ids = new Set<string>();
  const blocks: InfographicBlock[] = rawBlocks.map((raw: unknown, index: number) => {
    const path = `$.blocks[${index}]`;
    const obj = objectAt(raw, path);
    const id = requiredString(obj, "id", path);
    if (ids.has(id)) fail(`${path}.id`, `duplicate id "${id}"`);
    ids.add(id);
    let span: number | undefined;
    if (obj.span !== undefined) {
      if (!Number.isInteger(obj.span) || (obj.span as number) < 1 || (obj.span as number) > (layout.columns as number)) {
        fail(`${path}.span`, `must be an integer from 1 to ${layout.columns}`);
      }
      span = obj.span as number;
    }
    const emphasis = validateEmphasis(obj, path);
    const common = { id, ...(span === undefined ? {} : { span }), ...(emphasis ? { emphasis } : {}) };

    switch (obj.type) {
      case "mermaid": {
        onlyKeys(obj, ["type", "id", "span", "emphasis", "title", "diagram", "appearance"], path);
        const title = requiredString(obj, "title", path);
        const diagram = requiredString(obj, "diagram", path);
        if (!/^\s*(?:flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph)\b/i.test(diagram)) {
          fail(`${path}.diagram`, "must start with a Mermaid diagram declaration");
        }
        let appearance: MermaidAppearance | undefined;
        if (obj.appearance !== undefined) {
          const appearancePath = `${path}.appearance`;
          const settings = objectAt(obj.appearance, appearancePath);
          onlyKeys(settings, ["fontSize", "nodeShapes", "nodeEffects"], appearancePath);
          if (settings.fontSize !== undefined && (!Number.isInteger(settings.fontSize) || (settings.fontSize as number) < 12 || (settings.fontSize as number) > 28)) {
            fail(`${appearancePath}.fontSize`, "must be an integer from 12 to 28");
          }
          let nodeShapes: Record<string, MermaidNodeShape> | undefined;
          if (settings.nodeShapes !== undefined) {
            if (!/^\s*(?:flowchart|graph)\b/i.test(diagram)) fail(`${appearancePath}.nodeShapes`, "only supported for flowchart diagrams");
            const map = objectAt(settings.nodeShapes, `${appearancePath}.nodeShapes`);
            const entries = Object.entries(map);
            if (entries.length === 0 || entries.length > 24) fail(`${appearancePath}.nodeShapes`, "must contain 1 to 24 node IDs");
            const allowed = new Set<MermaidNodeShape>(["rect", "rounded", "stadium", "diam", "hex", "cyl", "circle", "cloud"]);
            nodeShapes = {};
            for (const [nodeId, nodeShape] of entries) {
              if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(nodeId)) fail(`${appearancePath}.nodeShapes.${nodeId}`, "node ID must use letters, digits, and underscores and start with a letter");
              if (!allowed.has(nodeShape as MermaidNodeShape)) fail(`${appearancePath}.nodeShapes.${nodeId}`, "unsupported Mermaid shape");
              nodeShapes[nodeId] = nodeShape as MermaidNodeShape;
            }
          }
          let nodeEffects: Record<string, MermaidNodeEffect> | undefined;
          if (settings.nodeEffects !== undefined) {
            if (!/^\s*(?:flowchart|graph)\b/i.test(diagram)) fail(`${appearancePath}.nodeEffects`, "only supported for flowchart diagrams");
            const map = objectAt(settings.nodeEffects, `${appearancePath}.nodeEffects`);
            const entries = Object.entries(map);
            if (entries.length === 0 || entries.length > 24) fail(`${appearancePath}.nodeEffects`, "must contain 1 to 24 node IDs");
            const allowed = new Set<MermaidNodeEffect>(["none", "soft-shadow", "blue-glow", "coral-glow"]);
            nodeEffects = {};
            for (const [nodeId, effect] of entries) {
              if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(nodeId)) fail(`${appearancePath}.nodeEffects.${nodeId}`, "node ID must use letters, digits, and underscores and start with a letter");
              if (!allowed.has(effect as MermaidNodeEffect)) fail(`${appearancePath}.nodeEffects.${nodeId}`, "unsupported Mermaid effect");
              nodeEffects[nodeId] = effect as MermaidNodeEffect;
            }
          }
          appearance = { ...(settings.fontSize === undefined ? {} : { fontSize: settings.fontSize as number }), ...(nodeShapes ? { nodeShapes } : {}), ...(nodeEffects ? { nodeEffects } : {}) };
        }
        return { ...common, type: "mermaid", title, diagram, ...(appearance ? { appearance } : {}) } satisfies MermaidBlock;
      }
      case "text": {
        onlyKeys(obj, ["type", "id", "span", "emphasis", "title", "text"], path);
        const textTitle = optionalString(obj, "title", path);
        const text = requiredString(obj, "text", path);
        return { ...common, type: "text", ...(textTitle ? { title: textTitle } : {}), text } satisfies TextBlock;
      }
      case "callout": {
        onlyKeys(obj, ["type", "id", "span", "emphasis", "title", "text", "tone"], path);
        const title = requiredString(obj, "title", path);
        const text = requiredString(obj, "text", path);
        if (obj.tone !== undefined && !["info", "warning", "success"].includes(obj.tone as string)) {
          fail(`${path}.tone`, 'must be "info", "warning", or "success"');
        }
        return { ...common, type: "callout", title, text, ...(obj.tone ? { tone: obj.tone as CalloutBlock["tone"] } : {}) } satisfies CalloutBlock;
      }
      case "metric": {
        onlyKeys(obj, ["type", "id", "span", "emphasis", "label", "value", "detail"], path);
        const label = requiredString(obj, "label", path);
        const value = requiredString(obj, "value", path);
        const detail = optionalString(obj, "detail", path);
        return { ...common, type: "metric", label, value, ...(detail ? { detail } : {}) } satisfies MetricBlock;
      }
      case "image": {
        onlyKeys(obj, ["type", "id", "span", "emphasis", "image", "caption"], path);
        const image = validatePosterImage(obj.image, `${path}.image`);
        const caption = optionalString(obj, "caption", path);
        return { ...common, type: "image", image, ...(caption ? { caption } : {}) } satisfies ImageBlock;
      }
      default:
        return fail(`${path}.type`, 'unsupported block type; expected "mermaid", "text", "callout", "metric", or "image"');
    }
  });

  return { version: "0.1", title, ...(subtitle ? { subtitle } : {}), style, shape, layout: { type: "grid", columns: layout.columns as number }, blocks };
}
