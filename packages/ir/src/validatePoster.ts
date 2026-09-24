import type { PosterBlock, PosterIcon, PosterImage, PosterInfographicIR, PosterTone } from './infographic.js';

const icons = new Set<PosterIcon>(['brain','lightbulb','bolt','mood_bad','directions_run','help','sentiment_satisfied','pause','search','list','check','bar_chart','settings','target','eco','flag','users','globe']);
const tones = new Set<PosterTone>(['rose','blue','mint','violet','slate']);
const fail = (path: string, message: string): never => { throw new Error(`${path}: ${message}`); };
const object = (value: unknown, path: string): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail(path, 'expected an object');
const keys = (value: Record<string, unknown>, allowed: string[], path: string) => { for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`${path}.${key}`, 'unsupported field'); };
const string = (value: unknown, path: string): string => typeof value === 'string' && value.trim() ? value : fail(path, 'must be a non-empty string');
const optional = (value: unknown, path: string): string | undefined => value === undefined ? undefined : string(value, path);
const array = <T>(value: unknown, path: string, parse: (item: unknown, path: string) => T, min = 1): T[] => {
  if (!Array.isArray(value) || value.length < min) fail(path, `must be an array with at least ${min} item${min === 1 ? '' : 's'}`);
  return (value as unknown[]).map((item, index) => parse(item, `${path}[${index}]`));
};
const tone = (value: unknown, path: string): PosterTone => tones.has(value as PosterTone) ? value as PosterTone : fail(path, 'must be rose, blue, mint, violet, or slate');
const icon = (value: unknown, path: string): PosterIcon => icons.has(value as PosterIcon) ? value as PosterIcon : fail(path, 'unsupported icon');
const strings = (value: unknown, path: string) => array(value, path, string);
export const validatePosterImage = (value: unknown, path: string): PosterImage => {
  const obj = object(value, path);
  keys(obj, ['src','alt','fit'], path);
  const src = string(obj.src, `${path}.src`);
  // Only app-local raster assets are accepted. This excludes remote URLs,
  // data/blob/javascript schemes, traversal, query/hash fragments, and SVG.
  if (!/^\/assets\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.(?:png|jpe?g|webp)$/i.test(src)) {
    fail(`${path}.src`, 'must be a local /assets/ PNG, JPG, JPEG, or WebP path without traversal, query, or hash');
  }
  const alt = string(obj.alt, `${path}.alt`);
  const fit: PosterImage['fit'] = obj.fit === undefined ? undefined : obj.fit === 'cover' || obj.fit === 'contain' ? obj.fit as PosterImage['fit'] : fail(`${path}.fit`, 'must be cover or contain');
  return { src, alt, fit };
};

export function validatePoster(input: unknown): PosterInfographicIR {
  const root = object(input, '$');
  keys(root, ['version','title','subtitle','note','highlight','style','shape','layout','blocks'], '$');
  if (root.version !== '0.1') fail('$.version', 'unsupported version');
  const layout = object(root.layout, '$.layout');
  keys(layout, ['type','columns'], '$.layout');
  if (layout.type !== 'poster') fail('$.layout.type', 'must be poster');
  if (layout.columns !== 20) fail('$.layout.columns', 'must be 20');
  if (!['technical','editorial','mindful','opportunity'].includes(root.style as string)) fail('$.style', 'unsupported style');
  if (!['rounded','angular'].includes(root.shape as string)) fail('$.shape', 'unsupported shape');
  const ids = new Set<string>();
  const blocks = array(root.blocks, '$.blocks', (raw, path): PosterBlock => {
    const obj = object(raw, path);
    const id = string(obj.id, `${path}.id`);
    if (ids.has(id)) fail(`${path}.id`, `duplicate id "${id}"`);
    ids.add(id);
    if (!Number.isInteger(obj.span) || (obj.span as number) < 1 || (obj.span as number) > 20) fail(`${path}.span`, 'must be an integer from 1 to 20');
    const base = { id, span: obj.span as number };
    const title = () => string(obj.title, `${path}.title`);
    const subtitle = () => optional(obj.subtitle, `${path}.subtitle`);
    switch (obj.type) {
      case 'poster-card':
        keys(obj, ['type','id','span','tone','title','subtitle','icon','points','quote'], path);
        return { ...base, type: obj.type, tone: tone(obj.tone, `${path}.tone`), title: title(), subtitle: subtitle(), icon: icon(obj.icon, `${path}.icon`), points: array(obj.points, `${path}.points`, (rawPoint, pointPath) => {
          const point = object(rawPoint, pointPath); keys(point, ['lead','text'], pointPath);
          return { lead: optional(point.lead, `${pointPath}.lead`), text: string(point.text, `${pointPath}.text`) };
        }), quote: optional(obj.quote, `${path}.quote`) };
      case 'poster-insight':
        keys(obj, ['type','id','span','title','icon','lead','paragraphs'], path);
        return { ...base, type: obj.type, title: title(), icon: icon(obj.icon, `${path}.icon`), lead: string(obj.lead, `${path}.lead`), paragraphs: strings(obj.paragraphs, `${path}.paragraphs`) };
      case 'poster-flow':
        keys(obj, ['type','id','span','title','subtitle','lanes'], path);
        return { ...base, type: obj.type, title: title(), subtitle: subtitle(), lanes: array(obj.lanes, `${path}.lanes`, (rawLane, lanePath) => {
          const lane = object(rawLane, lanePath); keys(lane, ['label','tone','stages'], lanePath);
          return { label: string(lane.label, `${lanePath}.label`), tone: tone(lane.tone, `${lanePath}.tone`), stages: array(lane.stages, `${lanePath}.stages`, (rawStage, stagePath) => {
            const stage = object(rawStage, stagePath); keys(stage, ['icon','label','detail'], stagePath);
            return { icon: icon(stage.icon, `${stagePath}.icon`), label: string(stage.label, `${stagePath}.label`), detail: optional(stage.detail, `${stagePath}.detail`) };
          }, 2) };
        }, 2) };
      case 'poster-example':
        keys(obj, ['type','id','span','title','subtitle','columns'], path);
        return { ...base, type: obj.type, title: title(), subtitle: subtitle(), columns: array(obj.columns, `${path}.columns`, (rawColumn, columnPath) => {
          const column = object(rawColumn, columnPath); keys(column, ['title','tone','quote','points'], columnPath);
          return { title: string(column.title, `${columnPath}.title`), tone: tone(column.tone, `${columnPath}.tone`), quote: string(column.quote, `${columnPath}.quote`), points: strings(column.points, `${columnPath}.points`) };
        }, 2) };
      case 'poster-steps':
        keys(obj, ['type','id','span','title','subtitle','steps'], path);
        return { ...base, type: obj.type, title: title(), subtitle: subtitle(), steps: array(obj.steps, `${path}.steps`, (rawStep, stepPath) => {
          const step = object(rawStep, stepPath); keys(step, ['title','detail'], stepPath);
          return { title: string(step.title, `${stepPath}.title`), detail: string(step.detail, `${stepPath}.detail`) };
        }) };
      case 'poster-takeaways':
        keys(obj, ['type','id','span','title','items'], path);
        return { ...base, type: obj.type, title: title(), items: array(obj.items, `${path}.items`, (rawItem, itemPath) => {
          const item = object(rawItem, itemPath); keys(item, ['icon','text'], itemPath);
          return { icon: icon(item.icon, `${itemPath}.icon`), text: string(item.text, `${itemPath}.text`) };
        }) };
      case 'poster-banner':
        keys(obj, ['type','id','span','icon','title','text','quote'], path);
        return { ...base, type: obj.type, icon: icon(obj.icon, `${path}.icon`), title: title(), text: string(obj.text, `${path}.text`), quote: optional(obj.quote, `${path}.quote`) };
      case 'poster-visual-card':
        keys(obj, ['type','id','span','tone','title','subtitle','image','summary','bullets','index'], path);
        return { ...base, type: obj.type, tone: tone(obj.tone, `${path}.tone`), title: title(), subtitle: subtitle(), image: validatePosterImage(obj.image, `${path}.image`), summary: string(obj.summary, `${path}.summary`), bullets: strings(obj.bullets, `${path}.bullets`), index: optional(obj.index, `${path}.index`) };
      case 'poster-visual-story':
        keys(obj, ['type','id','span','tone','title','subtitle','image','banner','description'], path);
        return { ...base, type: obj.type, tone: tone(obj.tone, `${path}.tone`), title: title(), subtitle: subtitle(), image: validatePosterImage(obj.image, `${path}.image`), banner: string(obj.banner, `${path}.banner`), description: string(obj.description, `${path}.description`) };
      case 'poster-image':
        keys(obj, ['type','id','span','image','caption'], path);
        return { ...base, type: obj.type, image: validatePosterImage(obj.image, `${path}.image`), caption: optional(obj.caption, `${path}.caption`) };
      case 'poster-feature-strip':
        keys(obj, ['type','id','span','title','features'], path);
        return { ...base, type: obj.type, title: title(), features: array(obj.features, `${path}.features`, (rawFeature, featurePath) => {
          const feature = object(rawFeature, featurePath); keys(feature, ['icon','title','text'], featurePath);
          return { icon: icon(feature.icon, `${featurePath}.icon`), title: string(feature.title, `${featurePath}.title`), text: string(feature.text, `${featurePath}.text`) };
        }) };
      case 'poster-quote':
        keys(obj, ['type','id','span','title','text'], path);
        return { ...base, type: obj.type, title: title(), text: string(obj.text, `${path}.text`) };
      case 'poster-footnote':
        keys(obj, ['type','id','span','left','right'], path);
        return { ...base, type: obj.type, left: string(obj.left, `${path}.left`), right: string(obj.right, `${path}.right`) };
      case 'poster-heading':
        keys(obj, ['type','id','span','title','note'], path);
        return { ...base, type: obj.type, title: title(), note: optional(obj.note, `${path}.note`) };
      default: return fail(`${path}.type`, 'unsupported poster block type');
    }
  });
  const documentTitle = string(root.title, '$.title');
  const highlight = optional(root.highlight, '$.highlight');
  if (highlight && !documentTitle.includes(highlight)) fail('$.highlight', 'must be a substring of title');
  return { version: '0.1', title: documentTitle, subtitle: optional(root.subtitle, '$.subtitle'), note: optional(root.note, '$.note'), highlight, style: root.style as PosterInfographicIR['style'], shape: root.shape as PosterInfographicIR['shape'], layout: { type: 'poster', columns: 20 }, blocks };
}
