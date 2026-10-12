import { RenderMode, ServerRoute } from '@angular/ssr';

// The game depends on localStorage, the animation loop and a live backend,
// so it is rendered in the browser only (no prerendering at build time).
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
