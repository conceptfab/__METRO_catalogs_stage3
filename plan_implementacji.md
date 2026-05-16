# Catalog PDF Download (A4 Landscape) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Każdy katalog dostaje przycisk "Pobierz PDF". Klik otwiera dedykowaną trasę `/catalog/[catalogId]/print`, która renderuje wszystkie sekcje katalogu jako serię stron A4 landscape (297×210mm), po czym automatycznie wywołuje `window.print()` — użytkownik zapisuje plik jako PDF przez natywne okno przeglądarki.

**Architecture:** Reużywamy istniejące komponenty sekcji (`HeroQX`, `OverviewQX`, …, `ProductCodesQX`) opakowując każdą w `<div className="print-page">` o stałych wymiarach A4 landscape z `page-break-after: always`. Istniejący layout `CatalogPageQX` zostaje nietknięty — dodajemy tylko jeden floating button (`<PdfDownloadButton />`) jako overlay. Trasa `/print` jest świadomie odseparowana, ma własne style print-only i nie współdzieli nawigacji/footera.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v3, native `window.print()` + CSS `@page`. Zero nowych zależności npm.

**Constraints (twarde):**
- Istniejąca strona katalogu (`/catalog/[catalogId]`) wygląda identycznie po zmianach — żadnych przesunięć pikseli, żadnych zmian w kolumnach/spacingach
- Każda sekcja domyślnie = jedna strona A4 landscape; sekcje przepełnione (Gallery, Materials, ProductCodes) dostają explicit page-break per logiczna grupa
- Brak nowych npm dependencies
- Trasa print wykluczona z sitemap i indeksowania

---

## File Structure

**Create:**
- `src/styles/print.css` — globalne `@page` + utility classes `.print-page`, `.print-page-cover`, `.print-only`, `.print-hide`
- `src/layouts/qx/CatalogPrintQX.tsx` — layout owijający wszystkie sekcje w `.print-page`
- `src/layouts/qx/CatalogPrintQX.test.tsx` — testuje że wszystkie sekcje są renderowane i każda jest w osobnej `.print-page`
- `src/components/catalog/PrintAutoTrigger.tsx` — client component, useEffect → `window.print()` po `load`
- `src/components/catalog/PdfDownloadButton.tsx` — client component, floating fixed-position link do `/print`
- `src/components/catalog/PdfDownloadButton.test.tsx` — testuje render i poprawny `href`
- `src/app/catalog/[catalogId]/print/page.tsx` — route handler ładujący CatalogData i renderujący `CatalogPrintQX`

**Modify:**
- `src/app/layout.tsx` — `import '@/styles/print.css'` (jedna linia obok istniejącego importu `globals.css`)
- `src/layouts/qx/CatalogPageQX.tsx:123` — dodaj jedną linię `<PdfDownloadButton catalogId={catalog.id} />` przed `</CatalogMotion>`
- `src/app/sitemap.ts` — upewnić się że trasy `*/print` są wykluczone
- `src/app/robots.txt` — dodać `Disallow: /catalog/*/print` jeśli plik istnieje jako tekst statyczny (sprawdź pierwszy)

---

## Task 1: Print stylesheet (A4 landscape + utilities)

**Files:**
- Create: `src/styles/print.css`
- Modify: `src/app/layout.tsx` (dodaj import obok istniejącego `globals.css`)

- [ ] **Step 1: Utwórz `src/styles/print.css`**

```css
/*
 * Print-only stylesheet for catalog PDF export.
 * Loaded globally; @media print rules are inert in normal viewing.
 * .print-page utility is used by the dedicated /print route only.
 */

@page {
  size: A4 landscape;
  margin: 0;
}

@media print {
  html,
  body {
    background: #ffffff !important;
    margin: 0 !important;
    padding: 0 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-hide {
    display: none !important;
  }
}

.print-only {
  display: none;
}

@media print {
  .print-only {
    display: block;
  }
}

/* Wrapper used on the /print route — one wrapper per A4 landscape page */
.print-page {
  width: 297mm;
  height: 210mm;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
  background: #ffffff;
  position: relative;
  box-sizing: border-box;
}

.print-page:last-child {
  page-break-after: auto;
  break-after: auto;
}

/* On-screen preview of the /print route — visualise the page boundaries */
@media screen {
  body.print-preview {
    background: #d4d4d4;
    padding: 24px 0;
  }
  body.print-preview .print-page {
    margin: 0 auto 24px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
}
```

- [ ] **Step 2: Dodaj import w `src/app/layout.tsx`**

Otwórz `src/app/layout.tsx`. Powinien już mieć linię typu `import './globals.css';`. Dopisz **bezpośrednio pod nią**:

```tsx
import '@/styles/print.css';
```

> **Dlaczego nie `@import` w CSS:** zależy od presence'u `postcss-import` w pipeline, która nie jest tu pewna. Import przez TS w `layout.tsx` jest idiomatyczny dla Next.js App Router i działa bez dodatkowych pluginów.

- [ ] **Step 3: Sprawdź typecheck i build CSS**

Run: `npm run typecheck`
Expected: PASS (no TS errors)

Run: `npm run build:no-images 2>&1 | head -40`
Expected: build kończy się sukcesem, brak ostrzeżeń o brakującym `print.css`

- [ ] **Step 4: Commit**

```bash
git add src/styles/print.css src/app/layout.tsx
git commit -m "feat: add print stylesheet with A4 landscape page utilities"
```

---

## Task 2: PdfDownloadButton (floating action button + test)

**Files:**
- Create: `src/components/catalog/PdfDownloadButton.tsx`
- Create: `src/components/catalog/PdfDownloadButton.test.tsx`

- [ ] **Step 1: Napisz failing test**

`src/components/catalog/PdfDownloadButton.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PdfDownloadButton from './PdfDownloadButton';

describe('PdfDownloadButton', () => {
  it('renders an accessible link to the catalog print route', () => {
    render(<PdfDownloadButton catalogId="QX0" />);
    const link = screen.getByRole('link', { name: /pobierz pdf/i });
    expect(link).toHaveAttribute('href', '/catalog/QX0/print');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('is hidden in print output via .print-hide class', () => {
    render(<PdfDownloadButton catalogId="QX0" />);
    const link = screen.getByRole('link', { name: /pobierz pdf/i });
    expect(link.className).toMatch(/print-hide/);
  });
});
```

- [ ] **Step 2: Uruchom test — ma fail'ować**

Run: `npm test -- src/components/catalog/PdfDownloadButton.test.tsx`
Expected: FAIL — `Cannot find module './PdfDownloadButton'`

- [ ] **Step 3: Implementacja `PdfDownloadButton.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';

interface Props {
  catalogId: string;
}

export default function PdfDownloadButton({ catalogId }: Props) {
  return (
    <Link
      href={`/catalog/${catalogId}/print`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Pobierz PDF tego katalogu"
      className="print-hide fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold uppercase tracking-wide text-on-dark shadow-lg transition hover:bg-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Download size={18} strokeWidth={2} aria-hidden="true" />
      Pobierz PDF
    </Link>
  );
}
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npm test -- src/components/catalog/PdfDownloadButton.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/catalog/PdfDownloadButton.tsx src/components/catalog/PdfDownloadButton.test.tsx
git commit -m "feat: add PdfDownloadButton client component with print route link"
```

---

## Task 3: PrintAutoTrigger (auto window.print on mount)

**Files:**
- Create: `src/components/catalog/PrintAutoTrigger.tsx`

> **Why no unit test:** komponent celowo wywołuje `window.print()` — testowanie tego w jsdom wymaga ciężkiego mockingu globalnych funkcji i daje znikomą wartość. Manualna weryfikacja w przeglądarce w Tasku 7.

- [ ] **Step 1: Napisz `PrintAutoTrigger.tsx`**

```tsx
'use client';

import { useEffect } from 'react';

/**
 * Mounted on /print routes. Waits for all <img> resources to finish loading,
 * then triggers the browser print dialog once. URL ?auto=0 disables the trigger
 * (useful when debugging the print layout in screen mode).
 */
export default function PrintAutoTrigger() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('auto') === '0') {
      document.body.classList.add('print-preview');
      return;
    }

    const triggerPrint = () => {
      window.setTimeout(() => window.print(), 250);
    };

    const images = Array.from(document.images);
    const pending = images.filter((img) => !img.complete);

    if (pending.length === 0) {
      triggerPrint();
      return;
    }

    let remaining = pending.length;
    const onDone = () => {
      remaining -= 1;
      if (remaining <= 0) triggerPrint();
    };

    pending.forEach((img) => {
      img.addEventListener('load', onDone, { once: true });
      img.addEventListener('error', onDone, { once: true });
    });

    return () => {
      pending.forEach((img) => {
        img.removeEventListener('load', onDone);
        img.removeEventListener('error', onDone);
      });
    };
  }, []);

  return null;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/catalog/PrintAutoTrigger.tsx
git commit -m "feat: add PrintAutoTrigger client component for auto print dialog"
```

---

## Task 4: CatalogPrintQX layout (A4 page wrappers)

**Files:**
- Create: `src/layouts/qx/CatalogPrintQX.tsx`
- Create: `src/layouts/qx/CatalogPrintQX.test.tsx`

> **Decision:** każda sekcja idzie do osobnej `.print-page`. Dla sekcji z większą ilością contentu (Gallery, Materials, ProductCodes) dopuszczamy że content jest skalowany za pomocą `transform: scale()` żeby zmieścić się na jednej A4. Tweakowanie per-sekcję — Task 7.

- [ ] **Step 1: Failing test**

`src/layouts/qx/CatalogPrintQX.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CatalogPrintQX from './CatalogPrintQX';
import type { CatalogData } from '@/types/catalog';

vi.mock('next/image', () => ({
  default: ({ alt, src }: { alt?: string; src: string }) => (
    <img alt={alt ?? ''} src={typeof src === 'string' ? src : ''} />
  ),
}));

const minimalCatalog: CatalogData = {
  id: 'QX0',
  meta: { title: 'Test', layoutType: 'qx', theme: undefined, brandName: 'METRO' },
  sections: [],
  hero: { brandLabel: 'METRO', title: 'Hero', subtitle: '', media: { kind: 'image', src: '/x.webp', alt: '' } },
  overview: { heading: 'Overview', paragraphs: [], image: { src: '/x.webp', alt: '' } },
  gallery: { heading: 'Gallery', items: [] },
  finishes: { heading: 'Finishes', items: [], configurator: undefined },
  packshots: undefined,
  dimensions: { heading: 'Dimensions', items: [], image: { src: '/x.webp', alt: '' } },
  materials: { heading: 'Materials', items: [], configurator: undefined },
  features: { heading: 'Features', items: [] },
  gettingStarted: { heading: 'Getting Started', steps: [] },
  productCodes: { heading: 'Codes', items: [] },
} as unknown as CatalogData;

describe('CatalogPrintQX', () => {
  it('wraps every section in a .print-page container', () => {
    const { container } = render(<CatalogPrintQX catalog={minimalCatalog} />);
    const pages = container.querySelectorAll('.print-page');
    // Hero, Overview, Gallery, Finishes, Dimensions, Materials, Features, GettingStarted, ProductCodes = 9
    // Packshots is undefined → not rendered. Expected: 9 print pages.
    expect(pages.length).toBe(9);
  });

  it('renders no navigation or footer (print layout only)', () => {
    const { queryByRole } = render(<CatalogPrintQX catalog={minimalCatalog} />);
    expect(queryByRole('navigation')).toBeNull();
    expect(queryByRole('contentinfo')).toBeNull();
  });
});
```

- [ ] **Step 2: Uruchom test — fail**

Run: `npm test -- src/layouts/qx/CatalogPrintQX.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Implementacja `CatalogPrintQX.tsx`**

```tsx
import type { CatalogData } from '@/types/catalog';
import HeroQX from './HeroQX';
import OverviewQX from './OverviewQX';
import GalleryQX from './GalleryQX';
import FinishesQX from './FinishesQX';
import DimensionsQX from './DimensionsQX';
import MaterialsQX from './MaterialsQX';
import FeaturesQX from './FeaturesQX';
import GettingStartedQX from './GettingStartedQX';
import PackshotsQX from './PackshotsQX';
import ProductCodesQX from './ProductCodesQX';

interface Props {
  catalog: CatalogData;
}

/**
 * Print-only layout. Each section is wrapped in a .print-page container
 * (297×210mm) with page-break-after: always so the browser produces one
 * A4 landscape page per section when printing.
 *
 * No nav, no footer, no scroll animations — pure paged document.
 */
export default function CatalogPrintQX({ catalog }: Props) {
  const themeClassName = catalog.meta.theme
    ? `catalog-${catalog.meta.theme}`
    : undefined;
  const idClassName = catalog.id
    ? `catalog-id-${catalog.id.toLowerCase()}`
    : undefined;
  const rootClassName = [themeClassName, idClassName, 'catalog-print']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClassName}>
      <div className="print-page print-page-hero">
        <HeroQX data={catalog.hero} />
      </div>
      <div className="print-page print-page-overview">
        <OverviewQX data={catalog.overview} />
      </div>
      <div className="print-page print-page-gallery">
        <GalleryQX data={catalog.gallery} />
      </div>
      <div className="print-page print-page-finishes">
        <FinishesQX
          data={catalog.finishes}
          configurator={
            catalog.finishes.configurator ?? catalog.materials.configurator
          }
        />
      </div>
      {catalog.packshots && (
        <div className="print-page print-page-packshots">
          <PackshotsQX
            data={catalog.packshots}
            materialsConfigurator={catalog.materials.configurator}
          />
        </div>
      )}
      <div className="print-page print-page-dimensions">
        <DimensionsQX data={catalog.dimensions} />
      </div>
      <div className="print-page print-page-materials">
        <MaterialsQX data={catalog.materials} />
      </div>
      <div className="print-page print-page-features">
        <FeaturesQX data={catalog.features} />
      </div>
      <div className="print-page print-page-getting-started">
        <GettingStartedQX data={catalog.gettingStarted} />
      </div>
      <div className="print-page print-page-product-codes">
        <ProductCodesQX data={catalog.productCodes} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Test ma przejść**

Run: `npm test -- src/layouts/qx/CatalogPrintQX.test.tsx`
Expected: PASS (2 tests)

> Jeśli test fail'uje z powodu różnic w `CatalogData` typie — popraw `minimalCatalog` w teście tak, by spełniał aktualny typ (zaglądnij do `src/types/catalog.ts`). Nie zmieniaj implementacji ani liczby `.print-page` (9 to wymóg, exclusing Packshots który jest opcjonalny).

- [ ] **Step 5: Commit**

```bash
git add src/layouts/qx/CatalogPrintQX.tsx src/layouts/qx/CatalogPrintQX.test.tsx
git commit -m "feat: add CatalogPrintQX layout with A4 page wrappers per section"
```

---

## Task 5: Print route `/catalog/[catalogId]/print/page.tsx`

**Files:**
- Create: `src/app/catalog/[catalogId]/print/page.tsx`

- [ ] **Step 1: Utwórz katalog i plik**

```bash
mkdir -p src/app/catalog/\[catalogId\]/print
```

Następnie utwórz plik `src/app/catalog/[catalogId]/print/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadCatalog, getCatalogList } from '@/lib/catalog-loader';
import CatalogPrintQX from '@/layouts/qx/CatalogPrintQX';
import PrintAutoTrigger from '@/components/catalog/PrintAutoTrigger';

export async function generateStaticParams() {
  const catalogs = await getCatalogList();
  return catalogs.map((catalog) => ({ catalogId: catalog.id }));
}

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function CatalogPrintPage({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}) {
  const resolvedParams = await params;
  const catalog = await loadCatalog(resolvedParams.catalogId);

  if (!catalog) {
    notFound();
  }

  // Print route currently supports the QX layout only — extend as new layouts come online.
  if (catalog.meta.layoutType !== 'qx') {
    notFound();
  }

  return (
    <>
      <CatalogPrintQX catalog={catalog} />
      <PrintAutoTrigger />
    </>
  );
}
```

- [ ] **Step 2: Typecheck i build**

Run: `npm run typecheck`
Expected: PASS

Run: `npm run build:no-images 2>&1 | tail -30`
Expected: build OK, w outpucie powinny pojawić się dodatkowe trasy statyczne dla każdego katalogu zakończone `/print`.

- [ ] **Step 3: Commit**

```bash
git add src/app/catalog/\[catalogId\]/print/page.tsx
git commit -m "feat: add /catalog/[catalogId]/print route with auto print trigger"
```

---

## Task 6: Mount PdfDownloadButton in CatalogPageQX

**Files:**
- Modify: `src/layouts/qx/CatalogPageQX.tsx` (jedna nowa linia — przycisk floating, nie zmienia struktury layoutu)

- [ ] **Step 1: Otwórz plik i dodaj import**

Po linii 16 (`import ProductCodesQX from './ProductCodesQX';`) dodaj:

```tsx
import PdfDownloadButton from '@/components/catalog/PdfDownloadButton';
```

- [ ] **Step 2: Wstaw `<PdfDownloadButton />` przed `</CatalogMotion>`**

W obecnej wersji pliku linia 123 to spacer:

```tsx
<div className="h-[120px] w-full bg-neutral-300 dark:bg-neutral-800" aria-hidden="true" />
```

Dodaj **poniżej** spacera, przed zamykającym `</CatalogMotion>`:

```tsx
<PdfDownloadButton catalogId={catalog.id} />
```

Pełny fragment po edycji:

```tsx
        <div className="h-[120px] w-full bg-neutral-300 dark:bg-neutral-800" aria-hidden="true" />
        <PdfDownloadButton catalogId={catalog.id} />
      </CatalogMotion>
    </div>
  );
}
```

- [ ] **Step 3: Uruchom istniejące testy `CatalogPageQX`**

Run: `npm test -- src/layouts/qx/CatalogPageQX.test.tsx`
Expected: PASS — wszystkie istniejące testy bez regresji. Jeśli któryś sprawdza `container.children.length` lub identyczność DOM stringa, zaktualizuj go o obecność przycisku (nie usuwaj!).

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/layouts/qx/CatalogPageQX.tsx
git commit -m "feat: mount PdfDownloadButton on CatalogPageQX layout"
```

---

## Task 7: Per-section A4 fitting (visual tuning pass)

**Files:**
- Modify: `src/styles/print.css` (dodaj klasy per-sekcja gdzie potrzebne)

> **Cel:** każda z 9-10 sekcji renderuje się sensownie na jednej A4 landscape (297×210mm). Nieuniknione różnice projektowe → tweakuj klasami `.print-page-<sekcja>`, **nie** ruszaj komponentów sekcji.

- [ ] **Step 1: Uruchom dev server**

Run: `npm run dev`
Expected: serwer startuje na `http://localhost:3000` (lub kolejny wolny port).

- [ ] **Step 2: Otwórz tryb podglądu (bez auto-printu)**

W przeglądarce (Chrome) otwórz dla pierwszego dostępnego katalogu (np. `QX0`):

```
http://localhost:3000/catalog/QX0/print?auto=0
```

`?auto=0` wyłącza automatyczne `window.print()` i dodaje klasę `body.print-preview` — strony A4 wyrenderują się jedna pod drugą na szarym tle z box-shadow. Pozwala oglądać layout bez wchodzenia w okno drukowania.

- [ ] **Step 3: Otwórz print preview (Cmd+P / Ctrl+P)**

W tym samym oknie wciśnij Cmd+P (Mac) / Ctrl+P (Win). Sprawdź:
- Orientacja: **Landscape** (Chrome powinien wykryć z `@page`)
- Format: **A4**
- Marginesy: **None** (z `@page { margin: 0 }`)
- Tła i kolory: **On** ("Background graphics" checked)

Przejdź każdą stronę i sprawdź:
1. **Hero** — czy tytuł i obraz mieszczą się; ewentualnie skala
2. **Overview** — tekst nie wycina się; obrazek na proporcjach
3. **Gallery** — najbardziej ryzykowne; jeśli galeria ma >6-8 obrazów może wymagać kolumnowego layoutu print-only
4. **Finishes** — siatka próbek mieści się
5. **Packshots** (jeśli istnieje) — produkty + colorbar
6. **Dimensions** — diagram + tabela
7. **Materials** — może być długie; oceń czy potrzebuje page-break-inside per grupa
8. **Features** — lista ikon + opisów
9. **GettingStarted** — kroki
10. **ProductCodes** — tabela; przy >20 wierszach trzeba podziału na dwie strony

- [ ] **Step 4: Dodaj klasy per-sekcja w `print.css` dla zidentyfikowanych problemów**

Wzorzec dla skalowania zawartości do A4 landscape (transform-origin top-left chroni przed odcięciem):

```css
.print-page-gallery > * {
  transform-origin: top left;
  transform: scale(0.72);
  width: calc(100% / 0.72);
  height: calc(100% / 0.72);
}
```

Wzorzec dla sekcji która powinna podzielić się na wiele stron (np. ProductCodes z długą tabelą):

```css
/* ProductCodes: pozwól treści przepłynąć na kolejne strony */
.print-page-product-codes {
  height: auto;
  min-height: 210mm;
  page-break-after: always;
}
.print-page-product-codes tr {
  page-break-inside: avoid;
}
```

Dla każdego problemu, który napotkasz, dodaj minimalną regułę do `src/styles/print.css` w bloku oznaczonym komentarzem:

```css
/* === Per-section A4 fits === */
```

Jeśli komentarza jeszcze nie ma — dodaj sekcję na końcu `print.css`.

- [ ] **Step 5: Iteruj — przeładuj stronę i zweryfikuj każdą sekcję**

Po każdej zmianie w `print.css`:
1. Zapisz plik (HMR odświeży)
2. Cmd+R w oknie z `?auto=0`
3. Cmd+P i przejrzyj wszystkie strony
4. Powtarzaj aż wszystkie 9-10 stron wygląda akceptowalnie

> **Definition of "akceptowalnie":** żaden tekst się nie wycina, żaden obraz nie wystaje poza krawędź strony, każda strona to widocznie ta sama sekcja co na żywym katalogu (skalowana, ale rozpoznawalna).

- [ ] **Step 6: Weryfikuj na drugim katalogu (sanity check)**

Powtórz Cmd+P dla `http://localhost:3000/catalog/<inny_katalog>/print?auto=0`. Jeśli któryś layout jest specyficzny per katalog (np. inna liczba elementów galerii), znajdziesz to teraz.

- [ ] **Step 7: Test "happy path" w trybie production**

Zatrzymaj `npm run dev` (Ctrl+C).

Run: `npm run build:no-images && npm run start`

Otwórz `http://localhost:3000/catalog/QX0/print` (tym razem BEZ `?auto=0` — print dialog ma wyskoczyć automatycznie).

Expected: po załadowaniu wszystkich obrazów (zwykle <2s) Chrome otwiera okno drukowania z poprawnie sformatowanym podglądem A4 landscape.

- [ ] **Step 8: Commit**

```bash
git add src/styles/print.css
git commit -m "feat: tune per-section print layouts to fit A4 landscape"
```

---

## Task 8: Wyklucz `/print` z sitemap i indeksowania

**Files:**
- Modify (jeśli istnieje): `src/app/sitemap.ts`
- Modify (jeśli istnieje statycznie): `src/app/robots.txt`

- [ ] **Step 1: Sprawdź obecną zawartość sitemap**

Run: `cat src/app/sitemap.ts`

Expected: plik istnieje i zwraca tablicę z URLami katalogów. Sprawdź czy nie generuje wpisów dla `/print` — `generateStaticParams` na trasie `/print` może je dodać do prerender'u, ale do sitemap trafiają tylko URLe które ręcznie tam dodajesz. Jeśli sitemap iteruje po `getCatalogList()` i hardcoduje `/catalog/${id}` — wszystko OK, nie dodaje `/print`. Potwierdź wzrokowo.

Jeśli sitemap iteruje po wszystkich prerender'owanych trasach (mało prawdopodobne, ale możliwe) — dodaj filter `.filter(url => !url.endsWith('/print'))`.

- [ ] **Step 2: Robots — jeśli statyczny**

Run: `ls src/app/robots.txt 2>/dev/null && cat src/app/robots.txt`

Jeśli plik istnieje jako statyczny tekst, dodaj na końcu:

```
Disallow: /catalog/*/print
```

Jeśli `robots.txt` jest generowany przez `robots.ts`, dodaj w `rules`:

```ts
{ userAgent: '*', disallow: '/catalog/*/print' }
```

> **Note:** `metadata.robots = { index: false, follow: false }` w `print/page.tsx` (Task 5) już deklaruje noindex w `<meta>` tagu — `robots.txt` jest dodatkową warstwą obrony.

- [ ] **Step 3: Sprawdź sitemap output**

Run: `npm test -- src/app/sitemap.test.ts`
Expected: PASS, brak nowych wpisów `/print` w wygenerowanym sitemap. Jeśli istniejący test sitemap nie istnieje lub nie pokrywa tego case'u — dodaj prosty test który asercją sprawdza brak `/print`:

```ts
import { describe, it, expect } from 'vitest';
import sitemap from './sitemap';

describe('sitemap', () => {
  it('does not include /print routes', async () => {
    const entries = await sitemap();
    expect(entries.every((e) => !e.url.endsWith('/print'))).toBe(true);
  });
});
```

- [ ] **Step 4: Commit (jeśli były zmiany)**

```bash
git add src/app/sitemap.ts src/app/robots.txt src/app/sitemap.test.ts 2>/dev/null || true
git commit -m "chore: exclude catalog print routes from sitemap and robots"
```

Jeśli żaden plik nie wymagał zmian — pomiń commit.

---

## Task 9: End-to-end manual QA + final commit

**Files:**
- None (manual verification only)

- [ ] **Step 1: Pełny przebieg w dev**

Run: `npm run dev`

Z dwóch przeglądarek (Chrome + Firefox lub Safari):

1. Otwórz `http://localhost:3000/catalog/<dowolny_id>`
2. **Sprawdź wizualnie**: layout strony katalogowej wygląda **identycznie** jak przed zmianami (porównaj z `git stash` jeśli masz wątpliwości). Tylko nowy floating button "Pobierz PDF" w prawym dolnym rogu jest dodany.
3. **Kliknij "Pobierz PDF"**: otwiera nową kartę z `/print`.
4. **Czekaj na auto-print**: po <3s wyskakuje okno drukowania.
5. **W oknie drukowania**: orientacja Landscape, format A4, podgląd pokazuje wszystkie sekcje jako osobne strony.
6. **Save as PDF**: zapisz, otwórz w czytniku PDF, przejrzyj wszystkie strony.

- [ ] **Step 2: Test responsywności istniejącej strony**

Zmień viewport (DevTools) na mobile (375px), tablet (768px), desktop (1440px) — przycisk "Pobierz PDF" pozostaje widoczny w prawym dolnym rogu i nie nakłada się krytycznie na żadne kontrolki nawigacji.

> Jeśli nakłada się np. na cookie banner lub inny floating UI — przesunięcie pozycji (`bottom-8 right-8` na mobile) to drobny tweak w `PdfDownloadButton.tsx`. Ale **nie** zmieniaj struktury layoutu sekcji ani spacingów.

- [ ] **Step 3: Pełen test suite**

Run: `npm test`
Expected: cała suite zielona.

Run: `npm run lint`
Expected: zero errors.

Run: `npm run typecheck`
Expected: zero errors.

Run: `npm run build:no-images`
Expected: build success, w outpucie widoczne wpisy `/catalog/<id>/print` dla każdego katalogu jako statyczne strony.

- [ ] **Step 4: Final commit (jeśli były tweakingi)**

Jeśli w trakcie QA dotknąłeś `PdfDownloadButton.tsx` lub `print.css`:

```bash
git add -p
git commit -m "fix: polish PDF download button placement and print layout edge cases"
```

- [ ] **Step 5: Podsumowanie do TODO.md**

Otwórz `TODO.md` i dopisz pod sekcją "Done" (lub utwórz jeśli nie ma):

```markdown
## Done — 2026-05-16
- Catalog PDF download (A4 landscape) via /catalog/[id]/print route + window.print()
```

```bash
git add TODO.md
git commit -m "docs: log PDF download feature completion in TODO"
```

---

## Out of Scope (świadomie pominięte)

- **Serverless Puppeteer / @sparticuz/chromium**: jednoklikowy download zamiast print dialog. Pominięte z powodu wagi zależności (~50MB), wzrostu cold startów, dodatkowego kosztu CPU/RAM. Trasa `/print` jest świadomie skonstruowana tak, że PDF endpoint może być dodany **bez zmian** w komponentach — zwyczajnie renderuje tę samą trasę w headless Chrome i zwraca binarny PDF.
- **Branding header/footer na każdej stronie PDF**: można dodać przez `@page :first { ... }` + `position: running()` + `content: element()`, ale to wymaga osobnej iteracji designerskiej.
- **Internationalizacja przycisku**: tekst "Pobierz PDF" zahardcoded'owany po polsku. Jeśli projekt urośnie do i18n — refactor do dict.
- **Layouts inne niż QX**: `type2` i `type3` to obecnie `CatalogPagePlaceholder`. Print route zwraca `notFound()` dla nie-QX layoutów (zobacz Task 5). Gdy te layouty zostaną zaimplementowane, dodaj odpowiednie `CatalogPrintType2.tsx` / `CatalogPrintType3.tsx` i mapę analogiczną do `layoutMap` w głównej trasie.
- **Custom file name dla zapisanego PDF**: niemożliwe bez backend-side rendering — przeglądarka używa tytułu strony jako domyślnej nazwy. Tytuł print route można jednak ustawić w metadata (`{catalog.meta.title} — PDF`) jako mały usability win, jeśli zechcesz dodać.

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Chrome i Safari różnie interpretują `@page` margins | Test w obu w Task 9; jeśli Safari ma problem → dodaj `@supports` fallback lub akceptuj zachowanie Chrome jako baseline |
| Niektóre sekcje (Materials, ProductCodes) mają tabele dłuższe niż A4 | Task 7 Step 4 wzorzec "auto height + page-break-inside: avoid na wierszach" |
| Lightbox/Modal komponenty mogą rendrować się w print | `LightboxQX` używa portala — w print route nie jest mountowany, więc OK. Sanity check w Task 7. |
| Floating button zasłania content na małych ekranach | Task 9 Step 2 — pozycjonowanie responsive |
| Klient bez JS nie dostanie window.print() | Akceptowalne — print route nadal renderuje się statycznie i Cmd+P zadziała ręcznie |
