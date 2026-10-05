import { createElement } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { Infographic, renderMermaid, type InfographicProps } from '@min-infograph/renderer';
import '@min-infograph/renderer/styles.css';

declare global {
  interface Window {
    integration: { hydrate: (html: string, props: InfographicProps) => void; mount: (props: InfographicProps[]) => void; renderMermaid: typeof renderMermaid; errors: string[] };
  }
}
const errors: string[] = [];
window.integration = {
  errors,
  hydrate(html, props) {
    const mount = document.getElementById('mount')!;
    mount.innerHTML = html;
    hydrateRoot(mount, createElement(Infographic, props), { onRecoverableError: error => errors.push(String(error)) });
  },
  mount(props) {
    createRoot(document.getElementById('mount')!).render(createElement('div', {}, props.map((item, key) => createElement(Infographic, { ...item, key }))));
  },
  renderMermaid,
};
