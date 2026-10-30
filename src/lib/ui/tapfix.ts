/* Every control is driven from pointer events, not click. On Android Chrome a
   click can be withheld altogether — the button lights up from :active and
   nothing else happens — when the browser is still arbitrating the gesture.
   pointerdown/pointerup always arrive, so a tap is recognised here: press and
   release on the same button, little movement, no long press. The button is
   then clicked programmatically, so every Svelte onclick handler just works.

   The browser may still send its own click afterwards, and by then the screen
   has often re-drawn — it would hit whatever button moved under the finger
   and fire a second, wrong action. Real pointer clicks that arrive just after
   a recognised tap are swallowed. Keyboard Enter and Space produce a click
   with no pointer sequence in front of it, and those always go through. */

let installed = false;
/** A press that moves further than this is a pan, not a tap. */
const MAX_MOVE_PX = 14;
/** A press held longer than this is a long press, not a tap. */
const MAX_PRESS_MS = 800;
/** The browser's own click arriving this soon after a recognised tap is a duplicate. */
const DUPLICATE_CLICK_MS = 600;

export function installTapFix(root: Document = document): void {
  if (installed || typeof window === 'undefined' || !window.PointerEvent) {
    return;
  }
  installed = true;
  let press: { button: HTMLButtonElement; x: number; y: number; t: number } | null = null;
  let tappedAt = 0;
  let clickingOurselves = false;
  const buttonAt = (node: EventTarget | null) =>
    node && (node as Element).closest
      ? ((node as Element).closest('button') as HTMLButtonElement | null)
      : null;

  root.addEventListener(
    'pointerdown',
    (event) => {
      const button = buttonAt(event.target);
      press = button ? { button, x: event.clientX, y: event.clientY, t: Date.now() } : null;
    },
    true,
  );
  root.addEventListener(
    'pointercancel',
    () => {
      press = null;
    },
    true,
  );
  root.addEventListener(
    'pointerup',
    (event) => {
      const started = press;
      press = null;
      if (!started || buttonAt(event.target) !== started.button) {
        return;
      }
      const moved =
        Math.abs(event.clientX - started.x) > MAX_MOVE_PX ||
        Math.abs(event.clientY - started.y) > MAX_MOVE_PX;
      const heldTooLong = Date.now() - started.t > MAX_PRESS_MS;
      if (moved || heldTooLong || started.button.disabled) {
        return;
      }
      tappedAt = Date.now();
      clickingOurselves = true;
      try {
        started.button.click();
      } finally {
        clickingOurselves = false;
      }
    },
    true,
  );
  root.addEventListener(
    'click',
    (event) => {
      if (clickingOurselves) {
        return;
      }
      const mouse = event as MouseEvent;
      const fromKeyboard = mouse.detail === 0 && !mouse.clientX && !mouse.clientY;
      if (fromKeyboard || !buttonAt(event.target)) {
        return;
      }
      if (Date.now() - tappedAt < DUPLICATE_CLICK_MS) {
        event.stopPropagation();
        event.preventDefault();
      }
    },
    true,
  );
}
