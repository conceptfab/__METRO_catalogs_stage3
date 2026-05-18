# Plan poprawek FM overrides — wynik audytu

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wyczyścić martwy kod i redundancję w klonach FM (FinishesFM, MaterialsFM, PackshotsFM + ich wersje print), wyciągnąć współdzielone pure-helpery materiałów do `src/lib/materials-options.ts`, zastosować drobne optymalizacje. Bez zmiany widocznego dla użytkownika behawioru.

**Architecture:** FM korzysta z 5 klonów komponentów QX (dispatch w `CatalogPageQX.tsx` / `CatalogPrintQX.tsx` po `catalog.id === 'FM'`). Audyt code-reviewera wskazał: (1) martwa ekstrakcja `frameCode` w PackshotsFM/PackshotsPrintFM, (2) martwa logika `desktopLeftovers` / `hasGroupedDesktop` w FinishesPrintFM/MaterialsFM, (3) zduplikowane pure-helpery (parsePackshotImage, pickConfiguratorOption, dedupeByCode, orderOptions, formatOptionCode, METRO_ID_PATTERN) między 8 plikami QX+FM, (4) drobne: `pickRandom` nad 1-elementową tablicą, drift między `verify-` i `generate-catalog-pdfs.mjs`.

**Tech Stack:** TypeScript 5.9 strict, React 19, Next.js 15 App Router, Vitest, ESLint 9. Pure-funkcje extraction = zero runtime cost.

**Ograniczenia (cross-cutting):**
- **Bez zmiany behawioru widocznego dla użytkownika** — etykiety, kolory, kolejność chipów, dispatch — wszystko musi zostać identyczne.
- **Nie ruszamy QX-bazowych komponentów poza Fazą 3** (extract). Pozostałe katalogi (QX/QS/VR/TS/FOTA) muszą działać identycznie.
- **Po każdej fazie** `npx tsc --noEmit` musi zwrócić exit 0.
- **Po Fazie 3** wszystkie istniejące testy muszą przechodzić (`npm run test`).
- **Nie dotykamy** `src/app/design-system/page.tsx` ani `docs/DOKUMENTACJA.md` / `docs/dokumentacja.html`.

---

## Faza 1: Martwy kod w PackshotsFM / PackshotsPrintFM (Critical)

Chip "Frame" został usunięty z FM packshots — `frameCode`, `FRAME_COLOR_FROM_NAME` i cała gałąź wyciągająca `frameToken` nie są nigdzie konsumowane. Zwężamy typ powrotny `parsePackshotImage` do `{ topCode?: string }` i usuwamy nieżywą logikę.

### Task 1.1: Usuń frame-extraction w `PackshotsFM.tsx`

**Files:**
- Modify: `src/layouts/qx/PackshotsFM.tsx:26-55, 190`

- [ ] **Step 1: Usuń stałą `FRAME_COLOR_FROM_NAME` i zwęź `parsePackshotImage`**

Usuń linie 26-31 (cała stała `FRAME_COLOR_FROM_NAME`). Następnie zamień blok funkcji `parsePackshotImage` (linie 33-55):

```typescript
function parsePackshotImage(filename: string | undefined): {
  topCode?: string;
} {
  if (!filename) return {};
  const base = filename.split('/').pop() ?? '';
  const stem = base.replace(/\.[^.]+$/, '').split('__')[0];
  const tokens = stem.split('_');
  const topToken = tokens[1];
  const topCode =
    topToken && /^[UW]\d+$/i.test(topToken) ? topToken.toUpperCase() : undefined;
  return { topCode };
}
```

- [ ] **Step 2: Sprawdź że konsument (linia 190) jest zgodny**

Otwórz plik i potwierdź, że w `.map((item, i) => { const { topCode } = parsePackshotImage(item.image); ... })` destructuring czyta tylko `topCode`. Nie powinno być żadnego użycia `frameCode` poniżej (dawniej usunęliśmy chip Frame).

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/qx/PackshotsFM.tsx
git commit -m "refactor(fm): drop dead frame extraction in PackshotsFM"
```

### Task 1.2: Usuń frame-extraction w `PackshotsPrintFM.tsx`

**Files:**
- Modify: `src/layouts/qx/PackshotsPrintFM.tsx:19-52, 167`

- [ ] **Step 1: Usuń `FRAME_COLOR_FROM_NAME` i zwęź `parsePackshotImage`**

Usuń linie 19-24 (stała `FRAME_COLOR_FROM_NAME`). Zamień blok `parsePackshotImage` (linie 28-52):

```typescript
function parsePackshotImage(filename: string | undefined): {
  topCode?: string;
} {
  if (!filename) return {};
  const base = filename.split('/').pop() ?? '';
  const stem = base.replace(/\.[^.]+$/, '').split('__')[0];
  const tokens = stem.split('_');
  const topToken = tokens[1];
  const topCode =
    topToken && /^[UW]\d+$/i.test(topToken)
      ? topToken.toUpperCase()
      : undefined;
  return { topCode };
}
```

- [ ] **Step 2: Potwierdź konsumenta**

W linii ~167 powinno być `const { topCode } = parsePackshotImage(item.image);` — bez `frameCode`. (To już jest tak po wcześniejszych zmianach.)

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/qx/PackshotsPrintFM.tsx
git commit -m "refactor(fm): drop dead frame extraction in PackshotsPrintFM"
```

### Task 1.3: Zwęź union `StaticChip role` w `PackshotsPrintFM.tsx`

**Files:**
- Modify: `src/layouts/qx/PackshotsPrintFM.tsx` (typ `StaticChip` props oraz miejsce użycia)

- [ ] **Step 1: Znajdź definicję `StaticChip` i zwęź union**

Otwórz `src/layouts/qx/PackshotsPrintFM.tsx`. Znajdź funkcję `StaticChip` (powinna mieć typ `role: 'Frame' | 'Top' | 'Decor'`). Zmień typ na `role: 'Decor'`:

```typescript
function StaticChip({
  option,
  role,
}: {
  option: MaterialsConfiguratorOption;
  role: 'Decor';
}) {
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0. Jedyne wywołanie `<StaticChip ... role="Decor" />` pozostaje zgodne.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/qx/PackshotsPrintFM.tsx
git commit -m "refactor(fm): narrow StaticChip role union to 'Decor'"
```

### Faza 1 — Acceptance

- [ ] `npx tsc --noEmit` exit 0
- [ ] Curl: `curl -s http://localhost:3000/catalog/FM | grep -c "Decor"` zwraca > 0
- [ ] `grep -c "FRAME_COLOR_FROM_NAME\|frameCode\|frameToken" src/layouts/qx/PackshotsFM.tsx src/layouts/qx/PackshotsPrintFM.tsx` zwraca `0` w sumie
- [ ] Render `/catalog/FM` wizualnie bez zmian (chip „Decor" pod packshotami, brak „Frame")

---

## Faza 2: Martwa logika `leftovers` i `hasGroupedDesktop` (Important)

FM zawsze ma kompletne kody w `DESKTOP_PRICE_GROUP_1 ∪ DESKTOP_PRICE_GROUP_2` (U100/110/120/130 + W200/210/220/240/250/310/330) → `desktopLeftovers` jest zawsze pustą tablicą. `hasGroupedDesktop` jest zawsze `true`. Usuwamy obie martwe gałęzie.

### Task 2.1: Usuń `desktopLeftovers` i grupę „Other" w `FinishesPrintFM.tsx`

**Files:**
- Modify: `src/layouts/qx/FinishesPrintFM.tsx:154-165, 222-224`

- [ ] **Step 1: Usuń `knownDesktopCodes` Set, `desktopLeftovers` filter, spread w `desktopOptions`**

Zamień blok od `const knownDesktopCodes = new Set(...)` przez `desktopLeftovers` do końca definicji `desktopOptions` (linie 154-165) na:

```typescript
  const desktopOptions = [...desktopGroup1, ...desktopGroup2];
```

- [ ] **Step 2: Usuń JSX-block „Other"**

W bloku renderu `<div className="finishes-print-subgroups">...</div>` usuń:

```typescript
                    {desktopLeftovers.length > 0 && (
                      <StaticGroup title="Other" options={desktopLeftovers} />
                    )}
```

(linie ~222-224)

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/qx/FinishesPrintFM.tsx
git commit -m "refactor(fm): drop dead desktopLeftovers branch in FinishesPrintFM"
```

### Task 2.2: Usuń `desktopLeftovers` + `hasGroupedDesktop` w `MaterialsFM.tsx`

**Files:**
- Modify: `src/layouts/qx/MaterialsFM.tsx:95-110, 185-225`

- [ ] **Step 1: Usuń memo `desktopLeftovers` i pole z `desktopOptions`**

Znajdź `const desktopLeftovers = useMemo(...)` (linia ~95) i usuń cały memo. Następnie zaktualizuj `desktopOptions` (linia ~104):

```typescript
  const desktopOptions = useMemo(
    () => [...desktopPriceGroup1, ...desktopPriceGroup2],
    [desktopPriceGroup1, desktopPriceGroup2],
  );
```

- [ ] **Step 2: Usuń flagę `hasGroupedDesktop` i zwiń branch w JSX**

Usuń linie `const hasGroupedDesktop = ...;` (linia ~108). W rendrze (~185) zastąp całe `{hasGroupedDesktop ? (...) : (...)}` tylko gałęzią „then" (grupowaną z dwoma price-groupami). Końcowa struktura JSX wewnątrz konfiguratora:

```typescript
              <div>
                <h3 className="mb-3 qx-emphasis-title">
                  <QxText text="Decor" />
                </h3>
                <div className="space-y-4">
                  {desktopPriceGroup1.length > 0 && (
                    <MaterialsOptionGroup
                      title="I-st price group"
                      options={desktopPriceGroup1}
                      selectedId={selectedDesktop?.id}
                      onSelect={setSelectedDesktopId}
                    />
                  )}
                  {desktopPriceGroup2.length > 0 && (
                    <MaterialsOptionGroup
                      title="II-nd price group"
                      options={desktopPriceGroup2}
                      selectedId={selectedDesktop?.id}
                      onSelect={setSelectedDesktopId}
                    />
                  )}
                </div>
              </div>
```

Block z `desktopLeftovers` (linie 207-214) i całe `else`-renderowanie ungrouped `MaterialsOptionGroup title="Decor"` (linie 217-225) — usuń.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Spot-check render**

Run: `curl -s http://localhost:3000/catalog/FM | grep -oE "I-st price group|II-nd price group|Decor" | sort -u`
Expected: trzy linie — `Decor`, `I-st price group`, `II-nd price group`.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/qx/MaterialsFM.tsx
git commit -m "refactor(fm): drop dead leftovers + hasGroupedDesktop in MaterialsFM"
```

### Faza 2 — Acceptance

- [ ] `npx tsc --noEmit` exit 0
- [ ] `grep -c "desktopLeftovers\|hasGroupedDesktop\|knownDesktopCodes" src/layouts/qx/MaterialsFM.tsx src/layouts/qx/FinishesPrintFM.tsx` zwraca `0` w sumie
- [ ] Render `/catalog/FM`: nagłówek „Decor", dwie price-groups, jeden chip RAL 9006, bez „Other"
- [ ] Pozostałe katalogi (QX/QS/VR/TS/FOTA) nadal renderują „Other" jeśli mają nieznane kody (sprawdź: `curl -s http://localhost:3000/catalog/QX | grep -c "I-st price"` zwraca > 0)

---

## Faza 3: Extract `src/lib/materials-options.ts` (Important — największy zysk)

Pure-funkcje (`parsePackshotImage`, `pickConfiguratorOption`, `dedupeByCode`, `orderOptions`, `formatOptionCode`, `METRO_ID_PATTERN`) są obecnie skopiowane w 8 plikach (4 QX + 4 FM). Wynosimy je do jednego modułu. FM nie traci niezależności — moduł jest pure-helperami nad typem `MaterialsConfiguratorOption`, nie zawiera żadnych label-i ani danych specyficznych dla katalogu.

**Subtelność:** `parsePackshotImage` w QX-oryginałach zwraca `{ topCode, frameCode }`. Shared moduł eksportuje **pełną wersję** (z `frameCode` + `FRAME_COLOR_FROM_NAME`). FM-pliki używają destructuringu `const { topCode } = parsePackshotImage(...)` (TypeScript wyciszy nieużyte `frameCode`, bo destructuring jest selektywny). Tym samym moduł jest jeden, a FM nie renderuje frame.

### Task 3.1: Utwórz `src/lib/materials-options.ts`

**Files:**
- Create: `src/lib/materials-options.ts`

- [ ] **Step 1: Napisz nowy plik z eksportami**

```typescript
import type { MaterialsConfiguratorOption } from '@/types/catalog';

export const METRO_ID_PATTERN = /^metro[_ -]/i;

const FRAME_COLOR_FROM_NAME: Record<string, string> = {
  white: 'RAL9003',
  black: 'RAL9005',
  grey: 'RAL9006',
  gray: 'RAL9006',
};

export function parsePackshotImage(filename: string | undefined): {
  topCode?: string;
  frameCode?: string;
} {
  if (!filename) return {};
  const base = filename.split('/').pop() ?? '';
  const stem = base.replace(/\.[^.]+$/, '').split('__')[0];
  const tokens = stem.split('_');
  const topToken = tokens[1];
  const frameToken = tokens[2];
  const topCode =
    topToken && /^[UW]\d+$/i.test(topToken)
      ? topToken.toUpperCase()
      : undefined;

  let frameCode: string | undefined;
  if (frameToken) {
    if (/^RAL\d+$/i.test(frameToken)) {
      frameCode = frameToken.toUpperCase();
    } else {
      frameCode = FRAME_COLOR_FROM_NAME[frameToken.toLowerCase()];
    }
  }
  return { topCode, frameCode };
}

export function pickConfiguratorOption(
  options: MaterialsConfiguratorOption[] | undefined,
  code: string | undefined,
): MaterialsConfiguratorOption | undefined {
  if (!options || !code) return undefined;
  const upper = code.toUpperCase();
  const matches = options.filter(
    (option) => option.code.toUpperCase() === upper,
  );
  if (matches.length === 0) return undefined;

  const metroEntry = matches.find((option) => METRO_ID_PATTERN.test(option.id));
  const swatchEntry = matches.find(
    (option) => !METRO_ID_PATTERN.test(option.id),
  );

  if (metroEntry && swatchEntry) {
    return {
      ...metroEntry,
      label: swatchEntry.label,
      thumbnail: swatchEntry.image,
    };
  }
  return swatchEntry ?? metroEntry ?? matches[0];
}

export function dedupeByCode(options: MaterialsConfiguratorOption[]) {
  const seen = new Set<string>();
  const result: MaterialsConfiguratorOption[] = [];
  for (const option of options) {
    if (seen.has(option.code)) continue;
    const preferred = pickConfiguratorOption(options, option.code);
    if (!preferred) continue;
    seen.add(option.code);
    result.push(preferred);
  }
  return result;
}

export function orderOptions(
  options: MaterialsConfiguratorOption[],
  orderedCodes: string[],
): MaterialsConfiguratorOption[] {
  return orderedCodes.flatMap((code) => {
    const option = pickConfiguratorOption(options, code);
    return option ? [option] : [];
  });
}

export function formatOptionCode(code: string): string {
  return code.startsWith('RAL') ? `RAL ${code.slice(3)}` : code;
}
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0. (Plik samodzielnie kompiluje się.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/materials-options.ts
git commit -m "feat(lib): extract materials-options pure helpers"
```

### Task 3.2: Migruj `PackshotsFM.tsx` do shared modułu

**Files:**
- Modify: `src/layouts/qx/PackshotsFM.tsx`

- [ ] **Step 1: Dodaj import**

Na górze pliku, po pozostałych importach, dodaj:

```typescript
import { parsePackshotImage, pickConfiguratorOption } from '@/lib/materials-options';
```

(Uwaga: `pickConfiguratorOption` zastępuje lokalną `pickOption` — nazwa się zmienia.)

- [ ] **Step 2: Usuń lokalne kopie**

Usuń lokalne definicje:
- `METRO_ID_PATTERN` (linia ~57 — może już została usunięta z innych zmian, ale FM-pliki ją zachowały)
- `function parsePackshotImage(...)` (po Fazie 1 to wąska wersja — zastąpimy importem)
- `function pickOption(...)` (linie ~59-83)

Zaktualizuj wywołania w renderze:
- Zamień `pickOption(materialsConfigurator?.frameOptions, frameCode)` na: usuń całe wywołanie i `frameOption` zmienną (po Fazie 1 nie ma już `frameCode`). Jeśli zmienna `frameOption` jeszcze istnieje, usuń.
- Zamień `pickOption(materialsConfigurator?.desktopOptions, topCode)` na `pickConfiguratorOption(materialsConfigurator?.desktopOptions, topCode)`.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/qx/PackshotsFM.tsx
git commit -m "refactor(fm): use shared materials-options in PackshotsFM"
```

### Task 3.3: Migruj `PackshotsPrintFM.tsx` do shared modułu

**Files:**
- Modify: `src/layouts/qx/PackshotsPrintFM.tsx`

- [ ] **Step 1: Dodaj import**

```typescript
import {
  parsePackshotImage,
  pickConfiguratorOption,
  formatOptionCode,
} from '@/lib/materials-options';
```

- [ ] **Step 2: Usuń lokalne kopie**

Usuń lokalne: `METRO_ID_PATTERN`, `parsePackshotImage`, `pickOption`, `formatOptionCode`.

W renderze zamień:
- `pickOption(materialsConfigurator?.desktopOptions, topCode)` → `pickConfiguratorOption(materialsConfigurator?.desktopOptions, topCode)`

(`formatOptionCode` używane w `StaticChip` — pozostaje, ale teraz pochodzi z importu.)

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/qx/PackshotsPrintFM.tsx
git commit -m "refactor(fm): use shared materials-options in PackshotsPrintFM"
```

### Task 3.4: Migruj `MaterialsFM.tsx` do shared modułu

**Files:**
- Modify: `src/layouts/qx/MaterialsFM.tsx`

- [ ] **Step 1: Dodaj import**

```typescript
import {
  pickConfiguratorOption,
  dedupeByCode,
  orderOptions,
} from '@/lib/materials-options';
```

- [ ] **Step 2: Usuń lokalne kopie**

Usuń lokalne definicje `METRO_ID_PATTERN`, `pickConfiguratorOption`, `dedupeByCode`, `orderOptions`.

Wywołania w komponencie pozostają identyczne (nazwy zgodne).

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/qx/MaterialsFM.tsx
git commit -m "refactor(fm): use shared materials-options in MaterialsFM"
```

### Task 3.5: Migruj `FinishesPrintFM.tsx` do shared modułu

**Files:**
- Modify: `src/layouts/qx/FinishesPrintFM.tsx`

- [ ] **Step 1: Dodaj import**

```typescript
import {
  pickConfiguratorOption,
  dedupeByCode,
  orderOptions,
  formatOptionCode,
} from '@/lib/materials-options';
```

- [ ] **Step 2: Usuń lokalne kopie**

Usuń lokalne: `METRO_ID_PATTERN`, `pickConfiguratorOption`, `dedupeByCode`, `orderOptions`, `formatOptionCode`.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/qx/FinishesPrintFM.tsx
git commit -m "refactor(fm): use shared materials-options in FinishesPrintFM"
```

### Task 3.6: Migruj `PackshotsQX.tsx` do shared modułu

**Files:**
- Modify: `src/layouts/qx/PackshotsQX.tsx`

QX-oryginał używa pełnej wersji `parsePackshotImage` (z `frameCode`) — pasuje 1:1.

- [ ] **Step 1: Dodaj import**

```typescript
import { parsePackshotImage, pickConfiguratorOption } from '@/lib/materials-options';
```

- [ ] **Step 2: Usuń lokalne kopie**

Usuń: `FRAME_COLOR_FROM_NAME`, `parsePackshotImage`, `METRO_ID_PATTERN`, `pickOption`.

W renderze:
- Zamień każde `pickOption(...)` na `pickConfiguratorOption(...)`.
- `const { topCode, frameCode } = parsePackshotImage(item.image);` — bez zmian (destructuring nadal działa z shared modułem).

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Uruchom testy PackshotsQX**

Run: `npx vitest run src/layouts/qx/PackshotsQX.test.tsx`
Expected: PASS dla wszystkich testów.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/qx/PackshotsQX.tsx
git commit -m "refactor(qx): use shared materials-options in PackshotsQX"
```

### Task 3.7: Migruj `PackshotsPrintQX.tsx` do shared modułu

**Files:**
- Modify: `src/layouts/qx/PackshotsPrintQX.tsx`

- [ ] **Step 1: Dodaj import**

```typescript
import {
  parsePackshotImage,
  pickConfiguratorOption,
  formatOptionCode,
} from '@/lib/materials-options';
```

- [ ] **Step 2: Usuń lokalne kopie**

Usuń: `FRAME_COLOR_FROM_NAME`, `parsePackshotImage`, `METRO_ID_PATTERN`, `pickOption`, `formatOptionCode`.

Wywołania `pickOption(...)` → `pickConfiguratorOption(...)`.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/qx/PackshotsPrintQX.tsx
git commit -m "refactor(qx): use shared materials-options in PackshotsPrintQX"
```

### Task 3.8: Migruj `MaterialsQX.tsx` do shared modułu

**Files:**
- Modify: `src/layouts/qx/MaterialsQX.tsx`

- [ ] **Step 1: Dodaj import**

```typescript
import {
  pickConfiguratorOption,
  dedupeByCode,
  orderOptions,
} from '@/lib/materials-options';
```

- [ ] **Step 2: Usuń lokalne kopie**

Usuń: `METRO_ID_PATTERN`, `pickConfiguratorOption`, `dedupeByCode`, `orderOptions`.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/qx/MaterialsQX.tsx
git commit -m "refactor(qx): use shared materials-options in MaterialsQX"
```

### Task 3.9: Migruj `FinishesPrintQX.tsx` do shared modułu

**Files:**
- Modify: `src/layouts/qx/FinishesPrintQX.tsx`

- [ ] **Step 1: Dodaj import**

```typescript
import {
  pickConfiguratorOption,
  dedupeByCode,
  orderOptions,
  formatOptionCode,
} from '@/lib/materials-options';
```

- [ ] **Step 2: Usuń lokalne kopie**

Usuń: `METRO_ID_PATTERN`, `pickConfiguratorOption`, `dedupeByCode`, `orderOptions`, `formatOptionCode`.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/qx/FinishesPrintQX.tsx
git commit -m "refactor(qx): use shared materials-options in FinishesPrintQX"
```

### Task 3.10: Pełna walidacja po Fazie 3

- [ ] **Step 1: TypeScript**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Wszystkie testy**

Run: `npm run test`
Expected: PASS (zwłaszcza `PackshotsQX.test.tsx`, `CatalogPageQX.test.tsx`, `CatalogPrintQX.test.tsx`).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: bez nowych warningów.

- [ ] **Step 4: Render check FM + QX + jeden inny**

```bash
curl -s http://localhost:3000/catalog/FM | grep -oE "Decor|I-st price|RAL 9006" | sort -u
# Expected: Decor, I-st price, RAL 9006

curl -s http://localhost:3000/catalog/QX | grep -oE "Desktop Finish|Top|Frame" | sort -u
# Expected: Desktop Finish, Frame (oraz Top w packshotach)

curl -s http://localhost:3000/catalog/VR | grep -oE "Desktop Finish|Top|Frame" | sort -u
# Expected: jak wyżej
```

- [ ] **Step 5: LOC delta**

Run: `git diff --stat 3cd8d6a -- 'src/**'`
Expected: net delta minus ~200-250 linii względem stanu sprzed Fazy 3.

### Faza 3 — Acceptance

- [ ] `npx tsc --noEmit` exit 0
- [ ] `npm run test` PASS
- [ ] `npm run lint` bez nowych warningów
- [ ] `grep -rc "^const METRO_ID_PATTERN\|^function pickOption\|^function pickConfiguratorOption\|^function dedupeByCode\|^function orderOptions\|^function formatOptionCode\|^function parsePackshotImage" src/layouts/qx/` zwraca 0 (wszystkie definicje w `src/lib/materials-options.ts`)
- [ ] `grep -c "from '@/lib/materials-options'" src/layouts/qx/*.tsx` zwraca 8 (4 QX + 4 FM)
- [ ] Render FM i QX wizualnie identyczne

---

## Faza 4: Drobne optymalizacje (Minor)

### Task 4.1: Zastąp `pickRandom(frameOptions)` w `FinishesPrintFM.tsx`

W FM `FRAME_COLOR_ORDER = ['RAL9006']` → `frameOptions` ma zawsze ≤ 1 element. `Math.random()` jest niepotrzebny.

**Files:**
- Modify: `src/layouts/qx/FinishesPrintFM.tsx:170, 83`

- [ ] **Step 1: Zamień wywołanie `pickRandom`**

Linia 170:

Zamień:
```typescript
  const randomFrame = pickRandom(frameOptions);
```

Na:
```typescript
  const randomFrame = frameOptions[0];
```

(Linia 171 dla `randomDesktop` pozostaje — `desktopOptions` ma 11 wpisów.)

- [ ] **Step 2: Sprawdź czy `pickRandom` jest jeszcze używana w pliku**

Run: `grep -c "pickRandom" src/layouts/qx/FinishesPrintFM.tsx`
Expected: 2 (definicja + jedno wywołanie dla `randomDesktop`). Funkcja pozostaje używana, **nie usuwamy** jej.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/qx/FinishesPrintFM.tsx
git commit -m "perf(fm): skip pickRandom over single-element frameOptions"
```

### Task 4.2: (Opcjonalne) Wynieś `PRINTABLE_LAYOUTS` do shared modułu

Drift risk: `verify-catalog-pdfs.mjs` i `generate-catalog-pdfs.mjs` powtarzają zestaw layoutów dwukrotnie.

**Files:**
- Create: `scripts/lib/printable-layouts.mjs`
- Modify: `scripts/verify-catalog-pdfs.mjs`, `scripts/generate-catalog-pdfs.mjs`

- [ ] **Step 1: Utwórz `scripts/lib/printable-layouts.mjs`**

```javascript
/**
 * Layout types that have a printable variant (Hero/Print components + CatalogPrint orchestrator).
 * Used by generate-catalog-pdfs.mjs and verify-catalog-pdfs.mjs to filter catalogs to process.
 */
export const PRINTABLE_LAYOUTS = new Set(['qx', 'mcr800']);

export function isPrintableLayout(layoutType) {
  return PRINTABLE_LAYOUTS.has(layoutType);
}
```

- [ ] **Step 2: Zastosuj w `verify-catalog-pdfs.mjs`**

Otwórz `scripts/verify-catalog-pdfs.mjs`. Usuń lokalne `const PRINTABLE_LAYOUTS = new Set([...])`. Dodaj import na górze:

```javascript
import { PRINTABLE_LAYOUTS } from './lib/printable-layouts.mjs';
```

- [ ] **Step 3: Zastosuj w `generate-catalog-pdfs.mjs`**

Otwórz `scripts/generate-catalog-pdfs.mjs`. Znajdź linię (~94):
```javascript
if (config?.meta?.layoutType !== 'qx' && config?.meta?.layoutType !== 'mcr800') {
```

Zamień na:
```javascript
if (!PRINTABLE_LAYOUTS.has(config?.meta?.layoutType)) {
```

Dodaj import na górze pliku:
```javascript
import { PRINTABLE_LAYOUTS } from './lib/printable-layouts.mjs';
```

- [ ] **Step 4: Uruchom verifier (smoke test)**

Run: `node scripts/verify-catalog-pdfs.mjs`
Expected: wszystkie 7 katalogów (QX, QS, VR, TS, FM, FOTA, MCR800) z `ok` + total size.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/printable-layouts.mjs scripts/verify-catalog-pdfs.mjs scripts/generate-catalog-pdfs.mjs
git commit -m "refactor(scripts): extract PRINTABLE_LAYOUTS to shared module"
```

### Faza 4 — Acceptance

- [ ] `npx tsc --noEmit` exit 0
- [ ] `node scripts/verify-catalog-pdfs.mjs` listuje 7 katalogów
- [ ] `grep -c "Math.random()" src/layouts/qx/FinishesPrintFM.tsx` — 1 (tylko w `pickRandom` body)

---

## Końcowa weryfikacja całego planu

- [ ] `npx tsc --noEmit` exit 0
- [ ] `npm run test` PASS
- [ ] `npm run lint` bez nowych warningów
- [ ] Curl `/catalog/FM`: nagłówki „Decor", dwie price-groups, jeden chip RAL 9006, chip „Decor" pod packshotami, brak „Frame"
- [ ] Curl `/catalog/QX`, `/catalog/VR`: render bez zmian — etykiety „Desktop Finish", „Top", „Frame" obecne
- [ ] PDF: `npm run pdfs:verify` zwraca 7 katalogów (z MCR800)
- [ ] LOC delta vs stan po Fazie 0: net minus ~200-250 linii w `src/layouts/qx/` (po Fazie 3 extract)
- [ ] Komity: każda Faza ma osobne, atomic commity (po jednym per Task)
- [ ] `src/app/design-system/page.tsx`, `docs/DOKUMENTACJA.md`, `docs/dokumentacja.html` — bez zmian

---

## Notatka dla kolejnego agenta

**Subagent-Driven Development (recommended):**
- Wykonuj każdą Fazę w osobnej iteracji (Faza 1 → review → Faza 2 → review → ...).
- Po Fazie 3 koniecznie uruchom pełny `npm run test` (regresje na QX-bazowych komponentach).
- Po każdym Task wykonaj commit.

**Jeśli coś pójdzie nie tak:**
- Konflikty TypeScripta po Fazie 3 najczęściej wynikają z różnic w nazwach funkcji (np. lokalne `pickOption` vs eksportowane `pickConfiguratorOption`). Sprawdź wszystkie wywołania w pliku po usunięciu lokalnej definicji.
- Jeżeli test `PackshotsQX.test.tsx` zacznie failować po Fazie 3, prawdopodobnie test mockuje lub testuje lokalne helpery — w takim wypadku otwórz test i zaktualizuj importy.
