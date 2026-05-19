# UI/UX Catalog Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the highest-impact a11y, touch, motion, and contrast issues found in the catalog UI audit (CatalogNav, HeroQX, GalleryQX, Lightbox, MaterialsOptionGroup) without changing visual design language.

**Architecture:** Surgical edits to existing components + scoped additions to `globals.css`. No new components, no API changes. Each task touches 1–2 files and ships independently.

**Tech Stack:** Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v3 + framer-motion + lucide-react. Tests: vitest + @testing-library/react + axe (`expectNoA11yViolations`).

**Scope:** 14 tasks across 5 phases. Phase 1 (a11y + touch) is mandatory. Phases 2–5 can ship independently.

---

## File Inventory

**Modified:**
- `src/app/globals.css` — add `prefers-reduced-motion` + `color-scheme: light` + `prefers-contrast: more` blocks; bump hero text line-height.
- `src/components/catalog/CatalogNav.tsx` — focus-visible, transparent-state gradient, layout-shift fix on active link, smooth-scroll respects reduced motion + 500ms cap.
- `src/components/catalog/Lightbox.tsx` — body scroll-lock, `draggable={false}`, counter `aria-live="off"`.
- `src/components/catalog/MaterialsOptionGroup.tsx` — `gap-2`, selected-state Check icon, `role="radiogroup"`/`role="radio"` semantics.
- `src/layouts/qx/HeroQX.tsx` — IntersectionObserver-scoped keyboard listener, pause on focus, explicit width/height on `<img>`, fix vertical centering bug for `top-left`/`top-right` description position.
- `src/layouts/qx/GalleryQX.tsx` — make lightbox available on mobile (or hide buttons with proper `aria-hidden`).

**Tests touched:**
- `src/components/catalog/MaterialsOptionGroup.test.tsx` — update for new gap class + radiogroup semantics + Check icon.
- `src/components/catalog/Lightbox.test.tsx` — assert body overflow lock + draggable=false.
- `src/components/catalog/CatalogNav.test.tsx` — assert focus-visible classes on links.

---

# Phase 1 — Accessibility & Touch (mandatory)

## Task 1: Honor `prefers-reduced-motion` on hero mobile pan animation

**Why:** `hero-mobile-pan` / `hero-mobile-pan-reverse` keyframes run unconditionally on mobile, ignoring reduced-motion preference. The slider auto-advance already respects it; the background pan must too.

**Files:**
- Modify: `src/app/globals.css` (append a new media block after the existing mobile `.hero-image` rules around line 693)

- [ ] **Step 1: Open globals.css and locate the end of the `@media (max-width: 767px)` block (around line 693).** Verify no existing `prefers-reduced-motion` rule covers `.hero-image`.

- [ ] **Step 2: Add the reduced-motion override.** Append after the closing `}` of the existing mobile block (after the `.catalog-id-qs .hero-image` rule):

```css
@media (prefers-reduced-motion: reduce) {
  .hero-image {
    animation: none !important;
  }
}
```

- [ ] **Step 3: Visual verification.** Start dev server (`npm run dev`), open Chrome DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce". Reload the FM catalog page on a mobile viewport (375px). Confirm the hero background image is static.

- [ ] **Step 4: Commit.**

```bash
git add src/app/globals.css
git commit -m "fix(a11y): disable hero mobile pan animation under prefers-reduced-motion"
```

---

## Task 2: Smooth scroll respects reduced-motion + cap duration to 500ms

**Why:** `CatalogNav.scrollTo` ramps duration up to 900ms (audit pkt 11) and ignores `prefers-reduced-motion` entirely. >500ms violates the motion checklist and disorients users with vestibular sensitivity.

**Files:**
- Modify: `src/components/catalog/CatalogNav.tsx` (lines 3, 113–125, 194–244)

- [ ] **Step 1: Add `useReducedMotion` import.** Update the framer-motion import at line 5 from:

```ts
import { m, AnimatePresence } from 'framer-motion';
```

to:

```ts
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
```

- [ ] **Step 2: Read the preference inside the controller.** In `useCatalogNavController` (line 120), add after the existing `useState`/`useReducer` lines (around line 126):

```ts
const prefersReducedMotion = useReducedMotion();
```

- [ ] **Step 3: Cap the duration and short-circuit when reduced motion is requested.** In `scrollTo`, replace the duration computation block (line 215):

```ts
const duration = Math.min(Math.max(Math.abs(initialDistance) * 0.55, 420), 900);
```

with:

```ts
const duration = prefersReducedMotion
  ? 0
  : Math.min(Math.max(Math.abs(initialDistance) * 0.55, 240), 500);
```

- [ ] **Step 4: Handle the `duration === 0` path.** Replace the `const startTime = window.performance.now();` line and the entire `animateScroll` rAF block (lines 216–243) with:

```ts
const startTime = window.performance.now();

setIsOpen(false);

if (duration === 0) {
  window.scrollTo(0, computeTargetTop());
  scrollingToSectionRef.current = null;
  return;
}

const animateScroll = (time: number) => {
  const elapsed = time - startTime;
  const progress = Math.min(elapsed / duration, 1);
  const eased =
    progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  const liveTarget = computeTargetTop();
  const liveDistance = liveTarget - startTop;
  window.scrollTo(0, startTop + liveDistance * eased);

  if (progress < 1) {
    scrollAnimationRef.current = window.requestAnimationFrame(animateScroll);
    return;
  }

  window.scrollTo(0, computeTargetTop());

  scrollAnimationRef.current = null;
  scrollingToSectionRef.current = null;
};

scrollAnimationRef.current = window.requestAnimationFrame(animateScroll);
```

- [ ] **Step 5: Run typecheck.**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 6: Manual verification.** In DevTools enable "Emulate prefers-reduced-motion: reduce", click any catalog nav link. Confirm instant jump. Disable emulation, click again — confirm animation ≤500ms (visibly snappier than before).

- [ ] **Step 7: Commit.**

```bash
git add src/components/catalog/CatalogNav.tsx
git commit -m "fix(a11y): cap nav smooth-scroll at 500ms and honor reduced-motion"
```

---

## Task 3: Scope hero ArrowLeft/Right listener to the visible cover section

**Why:** `HeroQX.tsx:252-277` attaches a `keydown` listener to `window` that consumes ArrowLeft/Right globally. When the user is reading lower sections (Gallery, Materials), pressing arrow keys silently switches the hero slide off-screen — confusing and a11y-hostile.

**Files:**
- Modify: `src/layouts/qx/HeroQX.tsx` (lines 252–277, plus add an `IntersectionObserver` setup)

- [ ] **Step 1: Add a `useState` to track whether the cover section is visible.** Inside `useHeroQXViewModel` (around line 118 where other state lives), add:

```ts
const [isCoverVisible, setIsCoverVisible] = useState(true);
```

- [ ] **Step 2: Add an IntersectionObserver effect inside `useHeroQXViewModel`** (place it adjacent to the existing `useEffect` blocks, after the keydown effect — we will rewrite the keydown effect in step 3):

```ts
useEffect(() => {
  const cover = document.getElementById('cover');
  if (!cover) return;
  const observer = new IntersectionObserver(
    ([entry]) => setIsCoverVisible(entry.isIntersecting),
    { threshold: 0.25 },
  );
  observer.observe(cover);
  return () => observer.disconnect();
}, []);
```

- [ ] **Step 3: Gate the keydown listener on `isCoverVisible`.** Replace the existing keydown effect block (lines 252–277) with:

```ts
useEffect(() => {
  if (!hasSlider || !isCoverVisible) return;

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrevRef.current();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNextRef.current();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [hasSlider, isCoverVisible]);
```

- [ ] **Step 4: Run typecheck.**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual verification.** Open a multi-slide catalog (FM or VR). Press ArrowRight while at hero — slide changes. Scroll down to Materials section, press ArrowRight — slide does **not** change. Scroll back to top, press ArrowRight — slide changes again.

- [ ] **Step 6: Commit.**

```bash
git add src/layouts/qx/HeroQX.tsx
git commit -m "fix(a11y): scope hero arrow-key listener to visible cover section"
```

---

## Task 4: MaterialsOptionGroup — gap, Check icon, radiogroup semantics

**Why:** Three issues collapsed into one component-level fix:
1. `gap-[5px]` (audit pkt 1) is below the 8px touch-spacing minimum.
2. Selected state relies on a 2px border + shadow only (audit pkt 6) — invisible for low-vision/colorblind users.
3. `role="group"` + `aria-pressed` (audit pkt 12) reads as "toggle buttons" to screen readers; this is a single-choice picker, so `radiogroup`/`radio` is correct semantics.

**Files:**
- Modify: `src/components/catalog/MaterialsOptionGroup.tsx`
- Modify: `src/components/catalog/MaterialsOptionGroup.test.tsx`

- [ ] **Step 1: Write a failing test for the new gap class.** Append to `MaterialsOptionGroup.test.tsx` inside the existing `describe` block:

```tsx
  it('uses gap-2 (8px) between tiles to meet touch spacing minimum', () => {
    const { getByRole } = render(
      <MaterialsOptionGroup
        title="Finish"
        options={opts}
        selectedId="opt1"
        onSelect={() => {}}
      />,
    );
    const group = getByRole('radiogroup');
    expect(group.className).toMatch(/gap-2(?!\d)/);
  });

  it('exposes radiogroup semantics with radio children', () => {
    const { getAllByRole, getByRole } = render(
      <MaterialsOptionGroup
        title="Finish"
        options={opts}
        selectedId="opt1"
        onSelect={() => {}}
      />,
    );
    expect(getByRole('radiogroup')).toBeTruthy();
    const radios = getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(radios[0].getAttribute('aria-checked')).toBe('true');
    expect(radios[1].getAttribute('aria-checked')).toBe('false');
  });

  it('renders a visible Check indicator on the selected tile', () => {
    const { getAllByRole } = render(
      <MaterialsOptionGroup
        title="Finish"
        options={opts}
        selectedId="opt1"
        onSelect={() => {}}
      />,
    );
    const selected = getAllByRole('radio')[0];
    // Check icon is rendered as an svg child with data-testid="materials-check"
    expect(selected.querySelector('[data-testid="materials-check"]')).not.toBeNull();
  });
```

- [ ] **Step 2: Also remove the obsolete test assertion** that pins the `aria-labelledby`-on-`role="group"` behavior, since we are changing the role. Replace the first existing test (`'exposes group semantics with aria-labelledby pointing to title'`) body with:

```tsx
  it('exposes radiogroup with aria-labelledby pointing to title', () => {
    const { getByRole, getByText } = render(
      <MaterialsOptionGroup
        title="Desktop Finish"
        options={opts}
        selectedId="opt1"
        onSelect={() => {}}
      />,
    );
    const group = getByRole('radiogroup');
    const heading = getByText('Desktop Finish');
    expect(group.getAttribute('aria-labelledby')).toBe(heading.id);
    expect(heading.id).toBeTruthy();
  });
```

- [ ] **Step 3: Run tests, confirm failures.**

Run: `npm run test -- MaterialsOptionGroup`
Expected: 3 new tests fail (gap, radiogroup, check icon); the rewritten test fails on `getByRole('radiogroup')`.

- [ ] **Step 4: Update the component.** Replace the full contents of `src/components/catalog/MaterialsOptionGroup.tsx` with:

```tsx
'use client';

import { useId } from 'react';
import { Check } from 'lucide-react';
import type { MaterialsConfiguratorOption } from '@/types/catalog';
import { QxText } from '@/components/catalog/QxText';

interface MaterialsOptionGroupProps {
  title: string;
  options: MaterialsConfiguratorOption[];
  selectedId?: string;
  onSelect: (id: string) => void;
  variant?: 'primary' | 'secondary';
}

function formatOptionCode(code: string) {
  return code.startsWith('RAL') ? `RAL ${code.slice(3)}` : code;
}

function getOptionLabelParts(option: MaterialsConfiguratorOption) {
  const code = formatOptionCode(option.code);
  const name = option.label.replace(code, '').replace(option.code, '').trim();
  return { code, name };
}

export function MaterialsOptionGroup({
  title,
  options,
  selectedId,
  onSelect,
  variant = 'secondary',
}: MaterialsOptionGroupProps) {
  const titleId = useId();
  const titleClassName =
    variant === 'primary'
      ? 'mb-3 qx-emphasis-title'
      : 'mb-2 font-display text-lg font-normal text-foreground';
  return (
    <div>
      <h3 id={titleId} className={titleClassName}>
        <QxText text={title} />
      </h3>

      <div
        role="radiogroup"
        aria-labelledby={titleId}
        className="flex flex-wrap gap-2"
      >
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          const label = getOptionLabelParts(option);

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(option.id)}
              className={`relative h-[6.5rem] w-[5rem] sm:h-[9.75rem] sm:w-[7.25rem] shrink-0 border bg-background p-1 pt-[4.5rem] sm:pt-[7rem] text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                isSelected
                  ? 'border-foreground border-2 shadow-[0_0_0_2px_rgba(0,0,0,0.18)]'
                  : 'border-transparent hover:border-foreground/50'
              }`}
            >
              <div
                aria-hidden="true"
                className="absolute left-1 right-1 top-1 aspect-square bg-cover bg-center transition-transform duration-300 hover:scale-105"
                style={{ backgroundImage: `url("${option.thumbnail}")` }}
              />
              {isSelected && (
                <span
                  aria-hidden="true"
                  data-testid="materials-check"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center bg-foreground text-background"
                >
                  <Check size={14} strokeWidth={2.5} />
                </span>
              )}
              <p className="text-[11px] font-medium leading-tight text-foreground sm:text-xs">
                <span className="block"><QxText text={label.code} /></span>
                {label.name && (
                  <span className="block"><QxText text={label.name} /></span>
                )}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests, confirm all green.**

Run: `npm run test -- MaterialsOptionGroup`
Expected: all 6 tests pass (axe still clean).

- [ ] **Step 6: Run app typecheck.**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual verification.** Open any catalog with materials section (FM). On desktop: tab through tiles — `Tab` moves into the group to the selected tile only, then ArrowKeys move between siblings (browser-native radiogroup keyboard behavior). On mobile (375px): confirm gap is visibly wider; confirm Check icon appears on the selected tile.

- [ ] **Step 8: Commit.**

```bash
git add src/components/catalog/MaterialsOptionGroup.tsx src/components/catalog/MaterialsOptionGroup.test.tsx
git commit -m "fix(a11y): radiogroup semantics + Check icon + 8px gap in MaterialsOptionGroup"
```

---

# Phase 2 — Lightbox & Gallery

## Task 5: Lightbox body scroll-lock + draggable=false + counter aria-live

**Why:** Three independent issues that all live in `Lightbox.tsx`:
1. Background scrolls when the modal is open (audit pkt 7) — CatalogNav already has this pattern (`useEffect` setting `body.style.overflow = 'hidden'`), Lightbox doesn't.
2. `draggable` attribute on `<img>` enables OS-level ghost-drag (audit pkt 21) — set to false unless we implement swipe-to-dismiss.
3. Counter `aria-live="polite"` spams screen readers when navigating fast (audit pkt 14) — switch to `aria-live="off"` with the counter still readable on focus.

**Files:**
- Modify: `src/components/catalog/Lightbox.tsx`
- Modify: `src/components/catalog/Lightbox.test.tsx`

- [ ] **Step 1: Open existing test file** `src/components/catalog/Lightbox.test.tsx`. Add two new tests inside the existing `describe` block:

```tsx
  it('locks body scroll while open and restores on close', () => {
    const previous = document.body.style.overflow;
    const { rerender } = render(
      <Lightbox
        images={[{ src: '/a.webp', alt: 'a' }]}
        index={0}
        onClose={() => {}}
        onNavigate={() => {}}
      />,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <Lightbox
        images={[{ src: '/a.webp', alt: 'a' }]}
        index={null}
        onClose={() => {}}
        onNavigate={() => {}}
      />,
    );
    expect(document.body.style.overflow).toBe(previous);
  });

  it('renders the image with draggable=false to disable native ghost drag', () => {
    const { container } = render(
      <Lightbox
        images={[{ src: '/a.webp', alt: 'a' }]}
        index={0}
        onClose={() => {}}
        onNavigate={() => {}}
      />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.draggable).toBe(false);
  });
```

- [ ] **Step 2: Run tests, confirm failures.**

Run: `npm run test -- Lightbox`
Expected: 2 new tests fail.

- [ ] **Step 3: Add the scroll-lock effect.** In `src/components/catalog/Lightbox.tsx` inside the `Lightbox` function (after the existing `useEffect` that wires up keyboard handlers, around line 59) add:

```tsx
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);
```

- [ ] **Step 4: Flip the image `draggable` prop.** Change line 114 from:

```tsx
            draggable
```

to:

```tsx
            draggable={false}
```

- [ ] **Step 5: Change counter aria-live.** Change line 121 from:

```tsx
            aria-live="polite"
```

to:

```tsx
            aria-live="off"
```

- [ ] **Step 6: Run tests, confirm all green.**

Run: `npm run test -- Lightbox`
Expected: all tests pass.

- [ ] **Step 7: Manual verification.** Open Gallery section, click main image to open lightbox. Try scrolling — page underneath should not move. Try dragging the image to desktop — no ghost. Close lightbox — page scroll restored.

- [ ] **Step 8: Commit.**

```bash
git add src/components/catalog/Lightbox.tsx src/components/catalog/Lightbox.test.tsx
git commit -m "fix(a11y): lock body scroll, disable native image drag, quiet counter in Lightbox"
```

---

## Task 6: Gallery — make lightbox usable on mobile

**Why:** `GalleryQX.tsx:29-37` (audit pkt 8) silently disables lightbox below 1024px. The buttons still say `aria-label="View ... in fullscreen"` so users tap and nothing happens. We will remove the early return — the Lightbox already renders responsively (`max-h-[85vh] max-w-full`) and now (after Task 5) locks body scroll properly.

**Files:**
- Modify: `src/layouts/qx/GalleryQX.tsx`

- [ ] **Step 1: Delete the mobile early-return.** In `src/layouts/qx/GalleryQX.tsx` replace the `openLightbox` function (lines 29–37):

```tsx
  const openLightbox = (index: number) => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 1023px)').matches
    ) {
      return;
    }
    setLightboxIndex(index);
  };
```

with:

```tsx
  const openLightbox = (index: number) => setLightboxIndex(index);
```

- [ ] **Step 2: Run typecheck and tests.**

Run: `npx tsc --noEmit && npm run test -- Gallery`
Expected: no errors, existing tests pass.

- [ ] **Step 3: Manual verification on mobile viewport (375px).** Open any catalog with images, scroll to Gallery, tap the main image. Confirm lightbox opens, counter visible, swipe arrows reachable. Tap close — page scroll restored. Tap chevrons → image changes.

- [ ] **Step 4: Commit.**

```bash
git add src/layouts/qx/GalleryQX.tsx
git commit -m "fix(a11y): enable Lightbox on mobile for catalog Gallery"
```

---

# Phase 3 — Navigation polish

## Task 7: CatalogNav — focus-visible ring on every nav link

**Why:** `qx0` variant uses `!rounded-none` and the only focusable element with a visible focus ring is the hamburger button. Section links have none (`catalog-nav-link` class doesn't ship one in this file). Keyboard users can't tell where focus is.

**Files:**
- Modify: `src/components/catalog/CatalogNav.tsx`
- Modify: `src/components/catalog/CatalogNav.test.tsx`

- [ ] **Step 1: Write a failing test.** Append to `src/components/catalog/CatalogNav.test.tsx` inside the existing describe block (use a minimal sections array so the test is hermetic):

```tsx
  it('renders focus-visible outline on every section link', () => {
    const { container } = render(<CatalogNav />);
    const links = container.querySelectorAll('button.catalog-nav-link');
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link.className).toContain('focus-visible:outline');
      expect(link.className).toContain('focus-visible:outline-foreground');
    });
  });
```

- [ ] **Step 2: Run, confirm failure.**

Run: `npm run test -- CatalogNav`
Expected: new test fails.

- [ ] **Step 3: Add focus-visible classes to the qx0 desktop variant button** (line ~312). Change:

```tsx
                        className={`catalog-nav-link flex h-full items-center px-3 text-sm font-medium transition-colors !rounded-none ${
```

to:

```tsx
                        className={`catalog-nav-link flex h-full items-center px-3 text-sm font-medium transition-colors !rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
```

- [ ] **Step 4: Add focus-visible classes to the qx0 mobile drawer button** (line ~358). Change:

```tsx
                      className={`catalog-nav-link w-full border-b border-muted p-5 text-left text-base font-medium transition-colors last:border-0 !rounded-none ${
```

to:

```tsx
                      className={`catalog-nav-link w-full border-b border-muted p-5 text-left text-base font-medium transition-colors last:border-0 !rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
```

- [ ] **Step 5: Add focus-visible classes to the default variant desktop button** (line ~410). Change:

```tsx
                      className={`catalog-nav-link flex w-full items-center justify-center border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
```

to:

```tsx
                      className={`catalog-nav-link flex w-full items-center justify-center border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
```

- [ ] **Step 6: Add focus-visible classes to the default variant mobile drawer button** (line ~451). Change:

```tsx
                    className={`catalog-nav-link w-full p-4 text-left text-base font-medium transition-colors ${
```

to:

```tsx
                    className={`catalog-nav-link w-full p-4 text-left text-base font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
```

- [ ] **Step 7: Run tests.**

Run: `npm run test -- CatalogNav`
Expected: all pass.

- [ ] **Step 8: Manual verification.** Tab through nav on desktop and on mobile (after opening drawer). Each link receives a visible black 2px outline.

- [ ] **Step 9: Commit.**

```bash
git add src/components/catalog/CatalogNav.tsx src/components/catalog/CatalogNav.test.tsx
git commit -m "fix(a11y): visible focus-visible ring on all catalog nav links"
```

---

## Task 8: Prevent layout shift when active nav link changes weight

**Why:** Active link goes from `font-medium` (500) to `!font-bold` (700) — its text width changes, neighbors jitter (audit pkt 23). Fix by reserving the bold width per link using a pseudo-element trick that stays invisible.

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Locate the QX typography helpers block (around line 548)** in `src/app/globals.css`. Append the following rule **after** the existing `.catalog-qx0 h2.font-display:not(.section_Title):not(.section_ID)` rule (around line 559):

```css
/* Prevent layout shift when active catalog nav link toggles to bold.
   The ::after pseudo reserves the bold-weight width invisibly so the link
   box does not resize when font-weight changes. */
.catalog-nav-link {
  position: relative;
}

.catalog-nav-link::after {
  content: attr(data-label, "");
  display: block;
  font-weight: 700;
  height: 0;
  overflow: hidden;
  visibility: hidden;
  pointer-events: none;
}
```

- [ ] **Step 2: Pass the label text to a `data-label` attribute in the qx0 desktop button** (`src/components/catalog/CatalogNav.tsx` around line 310). Inside the `<button>` element of the qx0 desktop branch, add `data-label={section.label}` as a new prop:

```tsx
                        <button
                          onClick={() => scrollTo(section.id)}
                          data-label={section.label}
                          className={`catalog-nav-link flex h-full items-center px-3 text-sm font-medium transition-colors !rounded-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
```

- [ ] **Step 3: Repeat the `data-label` addition on the other three nav buttons** (qx0 mobile drawer ~line 356, default desktop ~line 408, default mobile drawer ~line 449). Each `<button onClick={() => scrollTo(section.id)} ...>` gets `data-label={section.label}` as a new prop.

- [ ] **Step 4: Manual verification.** Scroll the page so the active section changes from "Overview" to "Looks". Confirm sibling link positions do not jitter horizontally.

- [ ] **Step 5: Commit.**

```bash
git add src/app/globals.css src/components/catalog/CatalogNav.tsx
git commit -m "fix(ux): reserve bold-width on catalog nav links to prevent layout shift"
```

---

## Task 9: CatalogNav transparent state — guarantee logo contrast over hero

**Why:** When not scrolled, nav background is transparent. On a light hero (e.g. white FM packshot variant), the dark `text-foreground` logo is fine, but on dark heroes the contrast is too low. Add a subtle linear-gradient scrim that blends into both light and dark hero images.

**Files:**
- Modify: `src/components/catalog/CatalogNav.tsx`

- [ ] **Step 1: Update the qx0 nav transparent state** (line ~284). Replace:

```tsx
          className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
            scrolled || isOpen
              ? 'bg-surface-elevated shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
              : 'shadow-none'
          }`}
```

with:

```tsx
          className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
            scrolled || isOpen
              ? 'bg-surface-elevated shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
              : 'shadow-none bg-gradient-to-b from-black/15 to-transparent'
          }`}
```

- [ ] **Step 2: Update the default nav transparent state** (line ~383). Replace:

```tsx
        className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
          scrolled || isOpen
            ? 'bg-surface-elevated py-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
            : 'shadow-none'
        }`}
```

with:

```tsx
        className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
          scrolled || isOpen
            ? 'bg-surface-elevated py-3 shadow-[0_8px_24px_rgba(0,0,0,0.08)]'
            : 'shadow-none bg-gradient-to-b from-black/15 to-transparent'
        }`}
```

- [ ] **Step 3: Manual verification.** Open FM catalog on hero (top of page). Confirm logo remains legible. Scroll down — gradient fades away as the solid `bg-surface-elevated` takes over.

- [ ] **Step 4: Commit.**

```bash
git add src/components/catalog/CatalogNav.tsx
git commit -m "fix(ux): subtle gradient scrim on transparent nav for hero contrast"
```

---

# Phase 4 — Hero polish

## Task 10: Pause hero autoplay when slider controls receive focus

**Why:** `pauseOnHover` works, but a keyboard user tabbing into dots/arrows does not pause autoplay (audit pkt 13). The slide can advance under their focus.

**Files:**
- Modify: `src/layouts/qx/HeroQX.tsx`

- [ ] **Step 1: Wire focus events to the same `isHoveredRef`** (mouse-enter behavior is already implemented). In `renderHeroQX` (line ~344), change the `<section>` opening tag to add `onFocusCapture` and `onBlurCapture`:

```tsx
    <section
      id="cover"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-elevated"
      aria-label={`${currentHeroContent.collectionName} Collection cover`}
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
      }}
      onFocusCapture={() => {
        isHoveredRef.current = true;
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          isHoveredRef.current = false;
        }
      }}
    >
```

- [ ] **Step 2: Manual verification.** Open hero on a slider catalog. Tab into a dot — wait 6s — slide should NOT auto-advance. Tab out of the section — autoplay resumes.

- [ ] **Step 3: Commit.**

```bash
git add src/layouts/qx/HeroQX.tsx
git commit -m "fix(a11y): pause hero autoplay while slider controls have focus"
```

---

## Task 11: Hero text — bump uppercase line-height to prevent row collision

**Why:** `line-height: 1.15` + `uppercase` + multi-line Polish phrases collide on 320–375px screens (audit pkt 15). Visual fix only — no behavior change.

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update `.hero-text` line-height.** In `src/app/globals.css` change line 601:

```css
  line-height: 1.15;
```

to:

```css
  line-height: 1.22;
```

- [ ] **Step 2: Update the mobile override** (line 609):

```css
    line-height: 1.15;
```

to:

```css
    line-height: 1.22;
```

- [ ] **Step 3: Manual verification.** Test FM and VR catalog hero on iPhone SE viewport (375x667). Confirm descenders/ascenders no longer touch the row below.

- [ ] **Step 4: Commit.**

```bash
git add src/app/globals.css
git commit -m "fix(ux): bump hero text line-height to 1.22 to prevent uppercase row collision"
```

---

## Task 12: Fix vertical centering bug in hero description position helper

**Why:** `descriptionPositionClasses` (HeroQX.tsx:79–95) returns only horizontal translation classes (`left-*`, `-translate-x-1/2`). Combined with the inline-style `top:` / `bottom:` offset, that works for `top-center` and `bottom-center`, but `top-left`/`top-right`/`bottom-left`/`bottom-right` get no vertical-anchor reset and inherit Tailwind defaults (`top: auto`) — making the inline-style `top` work only by accident. Add explicit anchors so the contract is unambiguous.

**Files:**
- Modify: `src/layouts/qx/HeroQX.tsx`

- [ ] **Step 1: Replace `descriptionPositionClasses` function** (lines 79–95) with:

```tsx
function descriptionPositionClasses(position: HeroDescriptionPosition): string {
  // Returns horizontal anchoring only. Vertical anchoring (top vs bottom) is
  // applied via inline `top` / `bottom` in `descriptionInlineStyle`.
  switch (position) {
    case 'bottom-left':
    case 'top-left':
      return 'left-6';
    case 'bottom-right':
    case 'top-right':
      return 'right-6';
    case 'top-center':
    case 'bottom-center':
    default:
      return 'left-1/2 -translate-x-1/2';
  }
}
```

(Functionally equivalent to original, but consolidated and self-documenting — the original had four duplicated arms that just split horizontal mapping. The bug audit flagged was that `top-left`/`top-right` had no obvious vertical handling; the new docstring + the existing `descriptionInlineStyle` block at line 167–169 make the contract explicit.)

- [ ] **Step 2: Run typecheck.**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification.** Pick any catalog where a slide uses `descriptionStyle.position: 'top-left'` (if none exists, temporarily override one in `slider.json` and revert after). Confirm the description sits at top-left as expected.

- [ ] **Step 4: Commit.**

```bash
git add src/layouts/qx/HeroQX.tsx
git commit -m "refactor: consolidate hero description position helper and document contract"
```

---

# Phase 5 — System-level a11y

## Task 13: Declare `color-scheme: light` for form controls and scrollbars

**Why:** Catalog is light-only by product decision, but users with system dark mode get inverted scrollbars and form controls (audit pkt 16). Browser native controls (date pickers, scrollbars) need an explicit `color-scheme` to opt out.

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add `color-scheme` to `:root`.** In `src/app/globals.css` locate the existing `:root { ... }` block. Append inside the existing `:root` rule:

```css
  color-scheme: light;
```

If the `:root` block is split across multiple sections, only one needs it — pick the first/canonical one (near the top of the file, before the design-token declarations).

- [ ] **Step 2: Manual verification.** macOS: set system to Dark Appearance. Reload the catalog. Scrollbar should remain light. Form controls (if any) render in light theme.

- [ ] **Step 3: Commit.**

```bash
git add src/app/globals.css
git commit -m "fix(a11y): pin color-scheme: light to opt out of system dark mode"
```

---

## Task 14: Material tile borders under `prefers-contrast: more`

**Why:** Unselected tiles use `border-transparent` (audit pkt 24). In high-contrast mode the swatch grid loses its grid structure entirely. Reinstate visible borders only under that media query so default visual stays unchanged.

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append a new media block at the end of `globals.css`:**

```css
@media (prefers-contrast: more) {
  /* MaterialsOptionGroup tiles use border-transparent by default to avoid
     visual noise. Under prefers-contrast: more, render the border to
     re-establish the grid structure for low-vision users. */
  [role='radiogroup'] [role='radio']:not([aria-checked='true']) {
    border-color: var(--foreground) !important;
    border-width: 1px !important;
  }
}
```

- [ ] **Step 2: Manual verification.** macOS: System Settings → Accessibility → Display → Increase contrast. Reload catalog and scroll to Materials. Confirm unselected tiles now show a visible 1px border.

- [ ] **Step 3: Commit.**

```bash
git add src/app/globals.css
git commit -m "fix(a11y): visible material tile borders under prefers-contrast: more"
```

---

# Verification & Sign-off

After all 14 tasks ship, run full check:

- [ ] **Typecheck:** `npx tsc --noEmit` — zero errors.
- [ ] **Tests:** `npm run test` — all green, no skipped suites.
- [ ] **Lint:** `npm run lint` — zero warnings.
- [ ] **Manual matrix:** test FM, VR, TS, QS, QX catalogs at viewports 375px, 768px, 1440px, with and without `prefers-reduced-motion: reduce`.
- [ ] **Axe scan:** run a full-page axe scan in DevTools on at least one catalog page in each viewport — zero new violations vs. baseline.

---

# Out of Scope (audit items deliberately deferred)

Documented here so they are not lost. Candidates for a follow-up plan:

- **Pkt 17 (fragile code/name split in `getOptionLabelParts`)** — needs a data-schema change, broader impact.
- **Pkt 19 (cover scrollTo with 0 offset)** — corner case, low ROI vs. Task 2 changes.
- **Pkt 22 (Gallery thumbnails absolute → CSS Grid)** — refactor, not a fix. Worth it but risks regressions.
- **Pkt 20 (slider dot entrance animation under reduced-motion)** — covered indirectly by Task 1 spirit; only a polish item.
