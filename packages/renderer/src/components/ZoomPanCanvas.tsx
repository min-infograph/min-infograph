import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type WheelEvent } from 'react';
import '../styles/zoom-pan.css';

type Point = { x: number; y: number };
type View = { scale: number; x: number; y: number };

const MIN_SCALE = 0.1;
const MAX_SCALE = 3.5;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** A bounded, pointer-centered zoom and pan viewport for large visual content. */
export function ZoomPanCanvas({ children, label = 'Infographic preview', className = '' }: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ view: View; start: Point; pinchDistance?: number; pinchScale?: number; center?: Point; anchor?: Point } | null>(null);
  const viewRef = useRef<View>({ scale: 1, x: 0, y: 0 });
  const [view, setView] = useState<View>(viewRef.current);
  const [dragging, setDragging] = useState(false);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });

  const commit = useCallback((next: View) => {
    const scale = clamp(next.scale, MIN_SCALE, MAX_SCALE);
    const viewport = viewportRef.current;
    let { x, y } = next;
    if (viewport && contentSize.width && contentSize.height) {
      const limit = (offset: number, viewportLength: number, contentLength: number) => {
        const scaledLength = contentLength * scale;
        if (scaledLength <= viewportLength) return (viewportLength - scaledLength) / 2;
        return clamp(offset, viewportLength - scaledLength, 0);
      };
      x = limit(x, viewport.clientWidth, contentSize.width);
      y = limit(y, viewport.clientHeight, contentSize.height);
    }
    const bounded = { scale, x, y };
    viewRef.current = bounded;
    setView(bounded);
  }, [contentSize]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    const measure = () => setContentSize({ width: element.scrollWidth, height: element.scrollHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => observer.disconnect();
  }, [children]);

  const zoomAt = useCallback((scale: number, point?: Point) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const center = point ?? { x: rect.width / 2, y: rect.height / 2 };
    const current = viewRef.current;
    const nextScale = clamp(scale, MIN_SCALE, MAX_SCALE);
    const ratio = nextScale / current.scale;
    commit({ scale: nextScale, x: center.x - (center.x - current.x) * ratio, y: center.y - (center.y - current.y) * ratio });
  }, [commit]);

  const fit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !contentSize.width || !contentSize.height) return;
    const scale = clamp(Math.min((viewport.clientWidth - 40) / contentSize.width, (viewport.clientHeight - 40) / contentSize.height, 1), MIN_SCALE, MAX_SCALE);
    commit({ scale, x: (viewport.clientWidth - contentSize.width * scale) / 2, y: (viewport.clientHeight - contentSize.height * scale) / 2 });
  }, [commit, contentSize]);

  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    // Keep the page's ordinary vertical scrolling at the default view. Once
    // zoomed, the wheel becomes a pointer-centered zoom control.
    if (Math.abs(viewRef.current.scale - 1) < 0.01 && Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    zoomAt(viewRef.current.scale * Math.exp(-event.deltaY * 0.0015), { x: event.clientX - rect.left, y: event.clientY - rect.top });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    pointers.current.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    setDragging(true);
    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const current = viewRef.current;
      gesture.current = { view: current, start: center, pinchDistance: distance(pts[0], pts[1]), pinchScale: current.scale, center, anchor: { x: (center.x - current.x) / current.scale, y: (center.y - current.y) / current.scale } };
    } else {
      gesture.current = { view: viewRef.current, start: pts[0] };
    }
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointers.current.set(event.pointerId, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    const pts = [...pointers.current.values()];
    const base = gesture.current;
    if (!base) return;
    if (pts.length >= 2 && base.pinchDistance && base.anchor) {
      const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const scale = clamp((base.pinchScale ?? 1) * distance(pts[0], pts[1]) / base.pinchDistance, MIN_SCALE, MAX_SCALE);
      commit({ scale, x: center.x - base.anchor.x * scale, y: center.y - base.anchor.y * scale });
    } else if (pts.length === 1) {
      commit({ ...base.view, x: base.view.x + pts[0].x - base.start.x, y: base.view.y + pts[0].y - base.start.y });
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (!pointers.current.size) {
      gesture.current = null;
      setDragging(false);
      return;
    }
    const point = [...pointers.current.values()][0];
    gesture.current = { view: viewRef.current, start: point };
  };

  const percent = Math.round(view.scale * 100);
  return <section className={`zoom-pan ${className}`} aria-label={label}>
    <div className="zoom-pan-head">
      <p className="zoom-pan-hint">Drag to pan · Zoom for detail</p>
      <div className="zoom-pan-toolbar" role="group" aria-label="Preview zoom controls">
      <button type="button" onClick={() => zoomAt(viewRef.current.scale / 1.2)} aria-label="Zoom out" title="Zoom out">−</button>
      <output className="zoom-pan-level" aria-live="polite" aria-label={`Zoom ${percent} percent`}>{percent}%</output>
      <button type="button" onClick={() => zoomAt(viewRef.current.scale * 1.2)} aria-label="Zoom in" title="Zoom in">+</button>
      <span className="zoom-pan-divider" aria-hidden="true" />
      <button type="button" className="zoom-pan-fit" onClick={fit} title="Fit infographic in preview">Fit</button>
      </div>
    </div>
    <div ref={viewportRef} className={`zoom-pan-viewport${dragging ? ' is-dragging' : ''}`} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} role="region" aria-label={`${label}. Drag to pan, use the mouse wheel or pinch to zoom.`}>
      <div ref={contentRef} className="zoom-pan-content" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, '--zoom-scale': view.scale } as CSSProperties}>{children}</div>
    </div>
  </section>;
}
