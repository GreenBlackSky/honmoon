import { holdStop } from './audio/synth';

/* ---------------- navigation ----------------
   One current screen, by name. Each app decides which names it has and which
   component draws each one; the engine only ever asks to go somewhere by name,
   and checks hasRoute() before offering a link to a screen an app may not
   include (the Staff map lives in Zoey, for instance). */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ViewOpt = Record<string, any>;
export interface View {
  name: string;
  opt: ViewOpt;
}
export const nav: { view: View } = $state({ view: { name: 'home', opt: {} } });

// Set once at start-up by the app and never watched: a plain Set on purpose.
let routes: ReadonlySet<string> = new Set();
export function configureRoutes(names: string[]): void {
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  routes = new Set(names);
}
export function hasRoute(name: string): boolean {
  return routes.has(name);
}

type Hook = (from: string, to: string, opt: ViewOpt) => void;
const hooks: Hook[] = [];
/** Run something whenever the screen changes — stopping a timer, releasing the
    microphone, dropping a finished session. */
export function onNavigate(hook: Hook): void {
  hooks.push(hook);
}

let scroller: HTMLElement | null = null;
export function setScroller(element: HTMLElement | null): void {
  scroller = element;
}
export function scrollToTop(): void {
  if (scroller && scroller.scrollTo) {
    scroller.scrollTo(0, 0);
  }
}

export function go(name: string, opt: ViewOpt = {}): void {
  holdStop();
  const from = nav.view.name;
  for (const hook of hooks) {
    hook(from, name, opt);
  }
  nav.view = { name, opt };
  scrollToTop();
}
