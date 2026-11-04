// A strip that drifts sideways on its own, slowly and round and round, and holds still for anyone
// looking at it: a pointer moving over it, a finger, keyboard focus, a scroll it didn't make.
// For someone who asked for less motion it never moves, and it only runs while on screen.
//
// The strip is a scroll container whose only child (the track) holds one list. The list is copied
// once behind itself, so the last item is followed by the first again without a seam.

interface Options {
  /** CSS pixels a second. */
  speed?: number;
  /** Anything else that should hold it still, asked every frame (a photo open full-screen). */
  held?: () => boolean;
}

export interface Drift {
  /** Hold still for a while: someone is about to move the strip by hand. */
  hold(ms: number): void;
  /** Where the strip's own content begins, and how long one copy of it is. */
  span(): { start: number; length: number };
  /** Whether it moves at all. */
  moving: boolean;
}

export function drift(strip: HTMLElement, { speed = 20, held = () => false }: Options = {}): Drift {
  const track = strip.firstElementChild as HTMLElement;
  const original = track.firstElementChild as HTMLElement;
  const moving = !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window;

  let start = 0;
  let length = 0;
  const span = () => ({ start, length });
  let restUntil = 0;
  const hold = (ms: number) => (restUntil = Math.max(restUntil, performance.now() + ms));
  // An album shorter than the screen can't come round without a gap: it simply stays put.
  if (!moving || original.getBoundingClientRect().width < strip.clientWidth) return { hold, span, moving: false };

  // Copied inside a document with no window, where pictures never load: Chrome fetches a copied
  // picture the moment it is copied, lazy or not, and the copy would cost the whole album on arrival.
  const copy = document.implementation.createHTMLDocument('').importNode(original, true) as HTMLElement;
  copy.setAttribute('aria-hidden', 'true');
  // Clickable, but never a second time round for a keyboard or a screen reader.
  for (const el of copy.querySelectorAll('a, button, [tabindex]')) el.setAttribute('tabindex', '-1');
  // Its pictures go without addresses until the strip comes near them; by then the originals have
  // loaded as they passed, and the copy fills from the cache for nothing.
  const pictures = [...copy.querySelectorAll('img')].map((img) => {
    const held = { img, src: img.getAttribute('src'), srcset: img.getAttribute('srcset') };
    img.removeAttribute('srcset');
    img.removeAttribute('src');
    return held;
  });
  track.append(copy);
  const reveal = () => {
    if (!pictures.length || !length || strip.scrollLeft + strip.clientWidth * 2 < start + length) return;
    for (const { img, src, srcset } of pictures.splice(0)) {
      if (srcset) img.setAttribute('srcset', srcset);
      if (src) img.setAttribute('src', src);
    }
  };

  // Measured afresh whenever the window changes: the padding that lines the album up with the
  // text grows with it even when the photos don't. Sub-pixel, so coming round never nudges.
  const measure = () => {
    start = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    length = copy.getBoundingClientRect().left - original.getBoundingClientRect().left;
  };
  const resized = new ResizeObserver(measure);
  resized.observe(original);
  resized.observe(strip);

  let pos = 0;
  let last = 0;
  let frame = 0;
  let expected = 0;
  let focused = false;
  let pointer = '';
  // A pointer's own hold is kept apart, so its leaving lets go of that and nothing else.
  let pointerUntil = 0;
  const tick = (t: number) => {
    frame = requestAnimationFrame(tick);
    if (focused || t < restUntil || t < pointerUntil || held()) {
      last = 0;
      track.style.transform = '';
      return;
    }
    // Carry on from wherever a hand left it.
    if (!last) pos = strip.scrollLeft;
    pos += (speed * Math.min(t - (last || t), 50)) / 1000;
    last = t;
    if (!length) measure();
    reveal();
    if (length && pos >= start + length) pos -= length;
    // Whole pixels by scrolling, the fraction by a transform: it glides at any speed.
    const whole = Math.floor(pos);
    strip.scrollLeft = expected = whole;
    track.style.transform = pos > whole ? `translateX(${(whole - pos).toFixed(2)}px)` : '';
  };
  new IntersectionObserver((entries) => {
    cancelAnimationFrame(frame);
    last = 0;
    if (entries[entries.length - 1].isIntersecting) frame = requestAnimationFrame(tick);
  }).observe(strip);

  // A scroll it didn't make is someone's hand: a swipe, a wheel, a key. It waits for them.
  strip.addEventListener('scroll', () => {
    reveal();
    if (Math.abs(strip.scrollLeft - expected) > 1.5) hold(2500);
  }, { passive: true });
  // A pointer that moves over it is someone looking; one that only rests there isn't.
  strip.addEventListener('pointermove', (event) => {
    const at = `${event.clientX},${event.clientY}`;
    if (event.pointerType !== 'touch' && at !== pointer) pointerUntil = performance.now() + 3000;
    pointer = at;
  });
  strip.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'touch') pointerUntil = 0;
  });
  strip.addEventListener('pointerdown', (event) => event.pointerType === 'touch' && hold(4000));
  strip.addEventListener('pointerup', (event) => event.pointerType === 'touch' && hold(3000));
  // Reached by keyboard it holds still to be read; a click doesn't freeze it for good.
  strip.addEventListener('focusin', (event) => (focused = (event.target as Element).matches(':focus-visible')));
  strip.addEventListener('focusout', () => (focused = false));

  return { hold, span, moving };
}
