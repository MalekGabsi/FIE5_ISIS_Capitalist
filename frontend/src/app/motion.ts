/** One-shot decorative animations (Web Animations API: no timers, no class juggling). */

const reducedMotionQuery =
  typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

export function prefersReducedMotion(): boolean {
  return reducedMotionQuery?.matches ?? false;
}

/** Plays a transform/opacity animation unless the user asked for reduced motion. */
export function play(
  element: Element | undefined,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): void {
  if (!element || typeof element.animate !== 'function' || prefersReducedMotion()) return;
  element.animate(keyframes, { easing: 'ease-out', ...options });
}
