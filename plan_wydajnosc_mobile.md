# Mobile LCP / Image-Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cut mobile LCP on `/catalog/QX` by stopping the hero from selecting an oversized image variant (up to the 220 KB un-resized original on high-DPR phones).

**Architecture:** The hero `<img>` (`HeroQX`, `HeroMCR800`), and the server-side `ReactDOM.preload()` in the catalog page, all derive their `srcSet`/`sizes` from a single source: `PRESET_SIZES.hero` in `src/lib/responsive-image.ts`. Changing that one value right-sizes the hero everywhere at once (rendered img + preload hint stay in sync). The fix is a balanced `sizes` value (`100vw`) chosen 2026-05-19 over aggressive/conservative alternatives.

**Tech Stack:** Next.js 15 (App Router, React 19), custom image loader over pre-generated WebP variants `[640, 1280, 1920, 2560]`, framer-motion hero carousel, Vitest.

---

## Podsumowanie (PL)

- **Co naprawiamy:** atrybut `sizes` obrazu hero wynosi `(max-width: 767px) 200vh, 100vw`. To `200vh` zawyża wymaganą szerokość — na telefonach retina przeglądarka sięga po kandydata `4000w`, którym jest **oryginał ~220 KB** ([responsive-image.ts:123](src/lib/responsive-image.ts#L123)), a na profilu Lighthouse Moto G po wariant 1920w/2560w. To główny hamulec LCP (3,5 s) z raportu.
- **Poprawka (zbalansowana, zatwierdzona):** `hero: '100vw'`. Hero jest pełnoekranowy (`h-full w-full object-cover`), więc jego szerokość układu = szerokość viewportu na każdym breakpoincie. Po zmianie mobile pobiera ~640–1280w (10–29 KB) zamiast 1920w/2560w/oryginału.
- **Świadomie POZA zakresem:** rozmiary obrazów galerii/packshotów/overview/materials. Zweryfikowano, że galeria QX ma mieszane proporcje (0.6–2.0) przy układzie `w-auto h-[55vh]`, więc `200vw` to uzasadniony bezpieczny zapas; te obrazy są też poniżej folda i lazy-loaded (nie wpływają na LCP). Zmiana groziłaby rozmyciem szerokich zdjęć. Szczegóły i opcjonalny kierunek na przyszłość — w sekcji „Deliberately Out of Scope”.
- **AVIF:** odłożone (decyzja użytkownika).

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/responsive-image.ts` | Single source of hero `srcSet`/`sizes` | Modify `PRESET_SIZES.hero` (1 line) |
| `src/lib/responsive-image.test.ts` | Locks the hero `sizes` contract that the img + preload both consume | Update 1 assertion |

No new files. No component edits needed — the change propagates through `responsiveImg(src, 'hero')` (in both hero components) and `responsiveProps(firstHeroSrc, 'hero')` (in the page preload) automatically.

---

## Task 1: Right-size the hero `sizes` (the LCP fix)

**Files:**
- Modify: `src/lib/responsive-image.ts:41-42`
- Test: `src/lib/responsive-image.test.ts:37`

- [ ] **Step 1: Update the test to expect the balanced value (write the failing assertion)**

In `src/lib/responsive-image.test.ts`, change the assertion on line 37 from:

```ts
    expect(result!.sizes).toBe('(max-width: 767px) 200vh, 100vw');
```

to:

```ts
    expect(result!.sizes).toBe('100vw');
```

Leave every other test unchanged (the `sizesOverride` test on lines 40-47 and the `gallery-thumb` preset test on lines 61-66 must stay as-is — we are not touching those presets).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/responsive-image.test.ts -t "uses manifest widths"`
Expected: FAIL — `expected '(max-width: 767px) 200vh, 100vw' to be '100vw'` (the implementation still returns the old string).

- [ ] **Step 3: Apply the implementation change**

In `src/lib/responsive-image.ts`, change lines 41-42 from:

```ts
const PRESET_SIZES: Record<ImagePreset, string> = {
  hero: '(max-width: 767px) 200vh, 100vw',
```

to:

```ts
const PRESET_SIZES: Record<ImagePreset, string> = {
  // Hero is full-bleed (h-full w-full, object-cover) at every breakpoint, so its
  // layout width is exactly the viewport width -> 100vw. The previous `200vh`
  // mobile hint over-provisioned: on high-DPR phones the resolved width exceeded
  // 2560 and the browser selected the `4000w` candidate (the ~220 KB un-resized
  // original); on the Lighthouse Moto G profile it forced the 1920w/2560w variant.
  // 100vw caps selection at the right small variant (~10-29 KB) on every device.
  hero: '100vw',
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/responsive-image.test.ts`
Expected: PASS — all tests in the file green.

- [ ] **Step 5: Run the full suite + typecheck (no regressions)**

Run: `npm run test && npm run typecheck`
Expected: Test suite passes (the project's known single pre-existing skip is acceptable); `tsc --noEmit` exits 0.

- [ ] **Step 6: Verify the change propagates to every hero consumer (no hardcoded hero sizes)**

Run:
```bash
grep -rn "responsiveImg(.*'hero'\|responsiveProps(.*'hero'\|, 'hero')" src/layouts src/app/catalog | sort
grep -rn 'sizes=' src/layouts/qx/HeroQX.tsx src/layouts/mcr800/HeroMCR800.tsx
```
Expected:
- `HeroQX.tsx`, `HeroMCR800.tsx` spread `responsiveImg(currentSlide.src, 'hero')` (no literal `sizes="..."` on the hero `<m.img>`).
- `src/app/catalog/[catalogId]/page.tsx` calls `responsiveProps(firstHeroSrc, 'hero')` and passes `responsive?.sizes` to `ReactDOM.preload(...)`.
- No file contains a hardcoded hero `sizes` string. (This is what guarantees the preload hint and the rendered img request the *same* variant — preventing a wasted/double fetch of the LCP image.)

- [ ] **Step 7: Verify print/PDF hero is unaffected (print-isolation guard)**

Run:
```bash
grep -rn "'hero'\|hero-print\|responsiveImg\|responsiveProps" src/layouts/qx/HeroPrintQX.tsx src/layouts/mcr800/HeroPrintMCR800.tsx 2>/dev/null
```
Expected: Print hero components either don't use the `hero` preset, or use it harmlessly — PDF generation runs through Puppeteer at a fixed render width, so `sizes` does not change which bytes the PDF embeds. Confirm no print-specific styling (`.hero-print-text`) is touched. If a print component spreads `responsiveImg(..., 'hero')`, the new `100vw` still resolves to an appropriate variant at the fixed print width — acceptable, no action.

- [ ] **Step 8: Commit**

```bash
git add src/lib/responsive-image.ts src/lib/responsive-image.test.ts
git commit -m "perf(images): cap hero sizes at 100vw to stop oversized LCP variant on mobile"
```

---

## Task 2: Validate the LCP win on a real device profile (verification gate)

This task confirms the fix actually moves the metric. No code changes unless Step 2 finds a problem.

**Files:** none (verification only).

- [ ] **Step 1: Confirm the hero LCP element renders opaque on first paint (not gated behind JS)**

Run:
```bash
grep -n "AnimatePresence\|initial=\|fetchPriority\|loading=" src/layouts/qx/HeroQX.tsx | head -20
```
Expected: `<AnimatePresence mode="sync" initial={false}>` is present (so the first slide mounts at its `animate` state, i.e. `opacity: 1`, and is paintable immediately — it is not faded in from `opacity: 0` on load). The slide-0 `<m.img>` has `fetchPriority={... 0 ? 'high' : ...}` and `loading={... 0 ? 'eager' : ...}`.

- [ ] **Step 2: If `initial={false}` is NOT present (conditional fix)**

Only if Step 1 shows the hero would SSR with `opacity: 0` (i.e. `AnimatePresence` lacks `initial={false}` or the first `<m.img>` is forced through its `initial` state on load): add `initial={false}` to the `<AnimatePresence>` wrapping the hero image in both `src/layouts/qx/HeroQX.tsx` and `src/layouts/mcr800/HeroMCR800.tsx`, so the LCP image is opaque server-side. Re-run `npm run test && npm run typecheck`, then commit:
```bash
git commit -am "perf(hero): render first slide opaque on load so it counts toward LCP"
```
(If Step 1 already shows `initial={false}`, skip this step — document "already opaque, no change".)

- [ ] **Step 3: Deploy a preview and re-measure (user-run)**

> Outward-facing action — run with the user's go-ahead.
```bash
vercel            # preview deploy; note the generated preview URL
```
Then run PageSpeed Insights (mobile) against `<preview-url>/catalog/QX` — or DevTools > Lighthouse, Mobile, "Moto G Power", 4G, cold load.

- [ ] **Step 4: Confirm the network panel shows the small hero variant**

In the Lighthouse/DevTools trace for the preview, confirm the LCP request is a `-640w.webp` / `-1280w.webp` hero variant (≈10–29 KB) — **not** `-1920w.webp`, `-2560w.webp`, or the un-suffixed original (`...thumb.webp`, ~220 KB). Record before/after:

| Metric | Before (report) | After (preview) |
|---|---|---|
| LCP (mobile) | 3.5 s | ____ |
| Hero LCP variant | 1920w / 2560w / original | ____ |
| "Improve image delivery" reserve | 372 KiB | ____ |
| Performance score | 89 | ____ |

Expected: LCP drops and the hero LCP variant is a small generated WebP. (Note: the report's full 372 KiB reserve also includes deliberately-overshot below-fold images — see "Deliberately Out of Scope"; this task targets the LCP element specifically.)

---

## Deliberately Out of Scope (documented, with rationale)

These were investigated and **intentionally left unchanged** — changing them is high-risk / low-reward and outside the chosen "P1 obrazy/LCP" scope:

- **Gallery main + thumbnails** (`src/layouts/qx/GalleryQX.tsx:81,104`, hardcoded `sizes="... 200vw"`): the layout is height-driven (`h-[55vh] max-h-[460px] w-auto`), so a frame's mobile display width = `displayHeight × imageAspect`. Verified QX gallery aspects span **0.6 → 2.0** (`3000×1500`, `3000×3000`, `4000×3000`, `1800×3000`). A 2.0-aspect image displays at ~220vw on a 412 px screen, so `200vw` is a *justified safe overshoot*, not a defect. Lowering it would under-serve and visibly blur the wide shots. These images are also below the fold and lazy-loaded (do not gate LCP).
- **Packshots / Overview / Materials** (`100vw` hardcoded / preset): actual mobile width ~90–95vw vs requested 100vw — within one variant step of correct, i.e. essentially right already. Below the fold. YAGNI.
- **AVIF generation:** deferred by decision; would add ~2× files to the 255 MB asset tree and a multi-format pipeline/manifest/loader/`<picture>` refactor for ~20–40 % extra bytes — a separate effort.

**Optional future follow-up (not in this plan):** if the gallery byte reserve becomes a priority, switch `GalleryQX` images to the `gallery` preset with a *per-image* `sizesOverride` computed from each image's known aspect ratio (height-aware), instead of one blanket `200vw`. This is the only safe way to right-size a height-driven `w-auto` layout across mixed aspects.

---

## Self-Review

- **Spec coverage:** Report P1 "Optymalizacja obrazów i elementu LCP" → Task 1 (hero sizes) + Task 2 (verification). Report P1 "priority/preload dla głównego obrazu" → already shipped (`fd39308`); Task 1 Step 6 locks preload↔img variant parity. Other report items (render-blocking, unused CSS/legacy JS, animations, robots.txt) are explicitly out of the chosen scope.
- **Placeholder scan:** No TBD/"add error handling"/"similar to". Every code step shows exact before/after text and exact commands with expected output. Step 2 of Task 2 is conditional but fully specified (concrete check + concrete remedy + concrete skip path).
- **Type consistency:** Only a string literal in `PRESET_SIZES.hero` and one matching test assertion change; both use the value `'100vw'`. No signatures change.
