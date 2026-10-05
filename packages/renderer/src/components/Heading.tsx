import { createContext, useContext, type ReactNode } from 'react';
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export const HeadingContext = createContext<HeadingLevel>(1);
/** Relative headings retain their visual class regardless of semantic rank. */
export function Heading({ depth = 0, className = '', children }: { depth?: number; className?: string; children: ReactNode }) {
  const base = useContext(HeadingContext);
  const Tag = `h${Math.min(6, Math.max(1, base + depth))}` as `h${HeadingLevel}`;
  return <Tag className={`min-infograph-heading min-infograph-heading--${depth} ${className}`}>{children}</Tag>;
}
