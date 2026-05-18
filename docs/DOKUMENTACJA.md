# METRO Catalogs — Dokumentacja techniczna

Wersja: stage3 · Data: 2026-05-18 · Branch: `main`

Aplikacja prezentuje katalogi produktowe marki METRO (kolekcje mebli biurowych: QX, QS, VR, TS, FM, FOTA, MCR800). Każdy katalog renderowany jest jako pojedyncza strona złożona z konfigurowanych sekcji (overview, gallery, finishes, packshots, dimensions, materials, features, getting-started, codes), z możliwością pobrania PDF-a.

---

## 1. Stos technologiczny

### Runtime i framework
- **Next.js 15.5.12** — App Router, React Server Components, statyczne generowanie (`generateStaticParams`).
- **React 19.0.0** + **React Compiler** (`babel-plugin-react-compiler`, włączony przez `experimental.reactCompiler` w [next.config.ts](../next.config.ts#L31)).
- **TypeScript 5.9.3** — strict mode, `tsc --noEmit` w pipeline kontroli typów.
- **Node.js ≥ 20** (deklarowane w [package.json](../package.json#L60) `engines`).

### Warstwa UI
- **Tailwind CSS 3.4** + `tailwindcss-animate`, `@tailwindcss/typography`. Konfiguracja: [tailwind.config.ts](../tailwind.config.ts).
- **Tokeny CSS** zdefiniowane w [src/app/globals.css](../src/app/globals.css) — kolory (`--background`, `--surface-elevated`, `--warm-light`, `--accent`), klasy semantyczne sekcji (`.section_ID`, `.section_Title`, `.sec_main_text`, `.qx-word`), overrides motywu per katalog (`.catalog-qx0`).
- **Framer Motion 12** — animacje sekcji i przejść.
- **Lucide React** — ikony (mapa w [src/lib/icon-map.tsx](../src/lib/icon-map.tsx)).
- **Design System** — żywa strona przeglądowa pod `/design-system` ([src/app/design-system/page.tsx](../src/app/design-system/page.tsx)).

### Walidacja danych
- **Zod 3** — schematy treści katalogów ([src/lib/schemas/hero.ts](../src/lib/schemas/hero.ts), [src/lib/schemas/packshots.ts](../src/lib/schemas/packshots.ts)).

### Generowanie PDF
- **Puppeteer-core** + **@sparticuz/chromium** — headless Chromium do printu. Pakiety oznaczone w `serverExternalPackages` w [next.config.ts](../next.config.ts#L27), aby nie były trace'owane do bundla funkcji serwerless.
- Skrypty: [scripts/generate-catalog-pdfs.mjs](../scripts/generate-catalog-pdfs.mjs), [scripts/optimize-catalog-pdfs.mjs](../scripts/optimize-catalog-pdfs.mjs), [scripts/verify-catalog-pdfs.mjs](../scripts/verify-catalog-pdfs.mjs).

### Pipeline obrazów
- **sharp 0.33** — kompresja i generowanie wariantów responsywnych.
- Custom **image-loader** ([src/lib/image-loader.ts](../src/lib/image-loader.ts)) — `next/image` rozwiązuje wstępnie wygenerowane warianty `-256w/-400w/-512w/-800w/-1024w/-1200w/-1600w/-1920w/-2560w.webp` z manifestu [src/generated/responsive-image-manifest.json](../src/generated/responsive-image-manifest.json).
- Skrypty: [scripts/process-images.mjs](../scripts/process-images.mjs) (orkiestrator), [scripts/generate-thumbnails.mjs](../scripts/generate-thumbnails.mjs), [scripts/recompress-gallery-bases.mjs](../scripts/recompress-gallery-bases.mjs), [scripts/check-no-rasterized-non-webp.mjs](../scripts/check-no-rasterized-non-webp.mjs), [scripts/catalog-assets.mjs](../scripts/catalog-assets.mjs) (audyt).

### Testy i jakość
- **Vitest 2** + **@testing-library/react** + **jsdom** — testy jednostkowe i komponentowe ([vitest.config.ts](../vitest.config.ts)).
- **jest-axe** — testy dostępności.
- **ESLint 9** + `eslint-config-next`.
- **Knip** — wykrywanie martwego kodu ([knip.json](../knip.json)).

### Hosting
- **Vercel** — konfiguracja w [vercel.json](../vercel.json) (deploy z `main`). Fluid Compute (Node.js 24 LTS, domyślny runtime).

---

## 2. Architektura aplikacji

### Mapa katalogów

```
src/
├── app/                       — App Router
│   ├── page.tsx               — strona główna (kafelki katalogów + banner EU)
│   ├── layout.tsx             — root layout
│   ├── globals.css            — tokeny CSS + klasy semantyczne
│   ├── catalog/[catalogId]/
│   │   ├── page.tsx           — dynamiczna trasa z dispatchem layoutu
│   │   └── print/page.tsx     — wariant printowy (Puppeteer wchodzi tu)
│   ├── design-system/         — żywy design system
│   ├── api/catalogs/route.ts  — JSON z listą katalogów (service-desc)
│   ├── sitemap.ts             — sitemap.xml generowany z listy katalogów
│   └── not-found.tsx
├── components/catalog/        — komponenty współdzielone (Nav, Lightbox, ColorChip…)
├── layouts/
│   ├── qx/                    — layout dla QX, QS, VR, TS, FM, FOTA (CatalogPageQX, sekcje QX)
│   └── mcr800/                — layout dla MCR800 (sekcje MCR800)
├── lib/
│   ├── catalog-loader.ts      — ŁADOWANIE i normalizacja content.json
│   ├── schemas/               — schematy Zod
│   ├── image-loader.ts        — custom loader dla next/image
│   ├── responsive-image.ts    — helper `responsiveImg()`
│   ├── design-tokens.ts
│   ├── icon-map.tsx           — mapa nazwa→ikona Lucide
│   └── motion.ts
├── generated/
│   └── responsive-image-manifest.json   — auto-generowany manifest wariantów obrazów
└── types/catalog.ts           — wszystkie typy domeny

public/
├── config.json                — konfiguracja globalna (brand, footer, tytuł)
├── banner.webp                — banner EU
└── catalogs/
    ├── index.json             — lista ID katalogów do wyświetlenia
    ├── README.md              — szablon treści dla nowego katalogu
    └── <ID>/                  — folder per katalog (np. QX, QS…)
        ├── config.json        — meta + sections + layoutType + theme
        ├── metro_logo.svg
        ├── overview/content.json
        ├── hero/(content.json, slider.json, *.webp)
        ├── gallery/(content.json, *.webp, print.json)
        ├── finishes/content.json
        ├── packshots/(content.json, *.webp)
        ├── dimensions/(content.json, axo_*.svg)
        ├── materials/(content.json, *.webp)
        ├── features/(content.json, *.mp4, *_last.webp)
        ├── getting-started/content.json
        ├── codes/(content.json, axo_*_codes.svg)
        ├── thumbs/(<id>-home.webp, <id>-nav.webp)
        └── Download/metro-<id>.pdf
```

### Dispatch layoutów

Wszystkie katalogi przechodzą przez jedną dynamiczną trasę `/catalog/[catalogId]` ([src/app/catalog/[catalogId]/page.tsx](../src/app/catalog/[catalogId]/page.tsx)). Wybór konkretnego layoutu odbywa się przez prosty `layoutMap`:

```ts
const layoutMap = {
  qx:    CatalogPageQX,
  mcr800: CatalogPageMCR800,
  type2: CatalogPagePlaceholder,
  type3: CatalogPagePlaceholder,
};
```

Pole `meta.layoutType` z `config.json` katalogu decyduje, który komponent zostanie wyrenderowany. To pozwala mieć osobne wizualnie layouty dla różnych linii produktowych przy jednym wspólnym potoku danych.

Obecne mapowanie:
- `qx` → wszystkie katalogi poza MCR800 (QX, QS, VR, TS, FM, FOTA).
- `mcr800` → MCR800 (osobny komplet komponentów w [src/layouts/mcr800/](../src/layouts/mcr800/)).
- `type2`, `type3` → rezerwa na nowe layouty, dziś renderują `CatalogPagePlaceholder`.

#### FM overrides

FM korzysta z `layoutType: "qx"`, ale `CatalogPageQX` i `CatalogPrintQX` zawierają branch `catalog.id === "FM"`, który przekierowuje render do dedykowanych komponentów:

| Sekcja      | QX (QS, VR, TS, FOTA, QX) | FM override                                  |
|-------------|---------------------------|----------------------------------------------|
| Finishes    | `FinishesQX`              | `FinishesFM` (nagłówek „Decor", tylko RAL 9006) |
| Customization (Materials) | `MaterialsQX` | `MaterialsFM` (nagłówek „Decor", tylko RAL 9006) |
| Models (Packshots) | `PackshotsQX`      | `PackshotsFM` (chip „Decor", bez chipa „Frame") |
| Print: Finishes    | `FinishesPrintQX`  | `FinishesPrintFM`                             |
| Print: Packshots   | `PackshotsPrintQX` | `PackshotsPrintFM`                            |

Powód: FM to mebel płytowy — dekor pokrywa wszystkie powierzchnie (nie tylko blat), a stal występuje w jednym kolorze (RAL 9006), więc semantyka „Top / Frame combinations" jest niedopasowana. Pozostałe katalogi z `layoutType: "qx"` nadal renderują się oryginalnymi komponentami QX bez zmian.

### Statyczne generowanie

`generateStaticParams()` zwraca wszystkie ID z `public/catalogs/index.json` — Next.js prerenderuje stronę dla każdego katalogu na etapie build. Sitemap działa analogicznie.

---

## 3. Model treści (content schema)

Wszystkie treści katalogu mieszczą się w **plikach JSON** wewnątrz `public/catalogs/<ID>/`. Aplikacja nigdzie nie używa CMS-a — zmiany treści = edycja JSON-ów + commit do gita.

### `public/config.json` — konfiguracja globalna
```json
{
  "brandName": "METRO",
  "siteTitle": "METRO",
  "siteSubtitle": "Product catalogs — browse by collection",
  "footerText": "CONCEPT / CREATION / EXECUTION BY",
  "catalogListTitle": "Available catalogs"
}
```
Wartości domyślne są w [src/lib/catalog-loader.ts](../src/lib/catalog-loader.ts#L80) (`DEFAULT_GLOBAL_CONFIG`). Plik nadpisuje tylko wymienione klucze.

### `public/catalogs/index.json` — lista katalogów
```json
{ "catalogs": ["QX", "QS", "VR", "TS", "FM", "FOTA", "MCR800"] }
```
Kolejność wpływa na sortowanie na stronie głównej i w nawigacji stopki.

### `public/catalogs/<ID>/config.json` — konfiguracja katalogu
```json
{
  "meta": {
    "title": "METRO QX",
    "tagline": "modern office desk system",
    "description": "QX — Modular desk system...",
    "brandName": "METRO QX",
    "collectionName": "QX",
    "layoutType": "qx",
    "theme": "qx0"
  },
  "sections": [
    { "id": "overview",    "label": "Overview" },
    { "id": "gallery",     "label": "Gallery" },
    { "id": "finishes",    "label": "Finishes" },
    { "id": "packshots",   "label": "Models" },
    { "id": "dimensions",  "label": "Dimensions" },
    { "id": "materials",   "label": "Top & frame combinations" },
    { "id": "features",    "label": "Features" },
    { "id": "getting-started", "label": "Getting Started" },
    { "id": "codes",       "label": "Codes" }
  ]
}
```

- `meta.layoutType` — wybiera komponent layoutu (`qx` / `mcr800` / `type2` / `type3`).
- `meta.theme` — nazwa klasy motywu CSS dodawanej do wrappera strony (np. `qx0` → `.catalog-qx0`).
- `sections` — kolejność i etykiety sekcji w nawigacji oraz przy renderze (sekcja bez wpisu nie zostanie wyrenderowana).

### Sekcje — `<section>/content.json`
Każda sekcja ma swój `content.json` ładowany w [src/lib/catalog-loader.ts](../src/lib/catalog-loader.ts). Loader:
1. czyta surowy JSON,
2. normalizuje ścieżki obrazów do `/catalogs/<ID>/<section>/<plik>`,
3. dla obrazów rastrowych sondą `sharp` ustala wymiary (cache w pamięci),
4. wzbogaca strukturę o `srcset` z manifestu wariantów responsywnych,
5. wybrane sekcje (hero, packshots) waliduje przez Zod (`parseHeroContent`, `parsePackshotsContent`).

Pełne typy wynikowe znajdują się w [src/types/catalog.ts](../src/types/catalog.ts).

### Konwencje materiałów (price groups)
Wewnątrz tablic grup cenowych w `materials/content.json` kody `W…/U…/RAL…` muszą być posortowane **rosnąco numerycznie** (patrz feedback `feedback_material_codes_numeric_order.md`). Synchronizacja kolejności obowiązuje również w pliku swatchów na stronie design-system.

---

## 4. Przepływ danych (request lifecycle)

```
                ┌──────────────────────────────────────┐
                │  build / generateStaticParams        │
                │  read public/catalogs/index.json     │
                └──────────────┬───────────────────────┘
                               │
                               ▼
  /catalog/[catalogId]   →   loadCatalog(catalogId)        ── lib/catalog-loader.ts
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
   read config.json    read overview/...   read gallery/...
                               │                  │
                               ▼                  ▼
                    Zod validation       sharp metadata + manifest
                               │
                               ▼
                  CatalogData (znormalizowane)
                               │
                               ▼
         layoutMap[meta.layoutType] → <CatalogPageQX/MCR800/...>
                               │
                               ▼
                       SSR / static HTML → klient
```

Wszystkie ścieżki obrazów w gotowym `CatalogData` są absolutne (`/catalogs/QX/...`) i zawsze odpowiadają plikom fizycznym pod `public/catalogs/`.

---

## 5. Pipeline obrazów

1. Operator wrzuca pliki `.webp` w folder sekcji (np. `public/catalogs/QX/gallery/desk-detail.webp`).
2. `npm run images` (skrót do [scripts/process-images.mjs](../scripts/process-images.mjs)) wykonuje:
   - `assets:check` — fail jeśli ktoś wrzucił `.jpg/.png` zamiast WebP.
   - `recompress:gallery` — re-encoding bazowych plików galerii (q=82, idempotentnie).
   - `thumbnails` — generuje warianty `-256/-400/-512/-800/-1024/-1200/-1600/-1920/-2560w.webp` i odświeża [src/generated/responsive-image-manifest.json](../src/generated/responsive-image-manifest.json).
3. Krok `prebuild` w `package.json` uruchamia `npm run images` automatycznie przed każdym `next build`, więc świeży manifest trafia do bundla.
4. W trakcie renderu `next/image` używa custom loadera ([src/lib/image-loader.ts](../src/lib/image-loader.ts)) który dobiera odpowiedni wariant zamiast wywoływać `_next/image` na Vercelu.

Konwencje thumbnaili:
- `thumbs/<id>-home.webp` — kafelek strony głównej (hero scene).
- `thumbs/<id>-nav.webp` — kafelek nawigacji stopki (packshot z overview).

---

## 6. Generowanie PDF-ów

Każdy katalog ma statyczny plik `public/catalogs/<ID>/Download/metro-<id>.pdf` serwowany z floating-buttona „Download PDF".

Pipeline ([scripts/generate-catalog-pdfs.mjs](../scripts/generate-catalog-pdfs.mjs)):
1. Skrypt podnosi dev server (`next dev` na wolnym porcie) lub używa już działającego.
2. Dla każdego ID Puppeteer otwiera `/catalog/<id>/print?puppeteer=1` (osobny layout printowy w [src/app/catalog/[catalogId]/print/](../src/app/catalog/[catalogId]/print/) oraz komponenty `*PrintQX/MCR800.tsx`).
3. Strona printowa zamienia `<video>` na poster, eager-loaduje obrazy, scrolluje do końca.
4. `page.pdf()` zapisuje wynik do `Download/metro-<id>.pdf`.
5. `optimize-catalog-pdfs.mjs` kompresuje strumienie, `verify-catalog-pdfs.mjs` waliduje wielkość i liczbę stron.

Komendy:
```bash
npm run pdfs            # generacja
npm run pdfs:optimize   # optymalizacja
npm run pdfs:verify     # walidacja
npm run pdfs:all        # wszystkie trzy
```

**WAŻNE**: zmiany printowe muszą żyć w komponentach `*Print*.tsx` i nie wpływać na bazowy on-screen layout (patrz `feedback_print_layout_isolation.md`).

---

## 7. Wdrożenie (deploy)

### Hosting: Vercel
- Projekt podłączony do Vercel — konfiguracja w [vercel.json](../vercel.json):
  ```json
  { "git": { "deploymentEnabled": { "main": true } } }
  ```
- Każdy push na `main` startuje build produkcyjny na Vercelu.
- Pre-build na Vercelu wywołuje skrypt `prebuild` z `package.json` → przetwarza obrazy i odświeża manifest.
- `outputFileTracingExcludes` w [next.config.ts](../next.config.ts#L33) wyklucza `public/catalogs/**` i `public/shared/**` z trace'a serverless functions (200+ MB assetów byłoby trace'owane → przekroczyłoby limit 250 MB Vercela).
- `puppeteer-core` i `@sparticuz/chromium` są w `serverExternalPackages` — nie wchodzą do bundla, używają natywnych zależności Vercela.

### Pełen deploy z PDF-ami (z lokalnej maszyny)
```bash
npm run deploy:prod
# = npm run pdfs && npm run pdfs:optimize && npm run pdfs:verify && vercel --prod
```
Ten skrót generuje świeże PDF-y **lokalnie** (Puppeteer nie pracuje w cloud build), commit-uje je do `public/catalogs/<ID>/Download/`, po czym promotuje deployment na produkcję.

### Build lokalny vs Vercel
- Lokalny build używa zmiennej `NEXT_LOCAL_ISOLATED_DIST=1`, która kieruje wyjście do `.next-build` (zamiast `.next`) — pozwala uruchamiać dev i prod jednocześnie bez konfliktów.
- Vercel build używa standardowego `.next` (warunek `process.env.VERCEL === '1'`).

### Zmienne środowiskowe
- Konfigurowane przez `vercel env` (zarządzanie w Vercel Dashboard).
- Lokalnie: `.env.local` (już istnieje, nie commitowany).
- Aplikacja jest w 100% statyczna na poziomie treści — nie wymaga sekretów do działania UI.

### Domeny
- Domena podstawowa zarządzana w Vercel Dashboard.
- `getSiteUrl()` w [src/lib/site-url.ts](../src/lib/site-url.ts) dobiera URL do sitemap z `VERCEL_URL` / `NEXT_PUBLIC_SITE_URL`.

---

## 8. Skrypty NPM — ściąga

| Skrypt | Działanie |
|---|---|
| `npm run dev` | dev server Next.js (port 3000) |
| `npm run dev:turbo` | dev z Turbopackiem |
| `npm run build` | produkcyjny build (output w `.next-build` lokalnie) |
| `npm run start` | serwer produkcyjny |
| `npm run images` | pełen pipeline obrazów (audit + recompress + thumbnails) |
| `npm run images:force` | jak wyżej, ale wymusza re-generację wariantów |
| `npm run thumbnails` | tylko thumbnails + manifest |
| `npm run pdfs` | generuje wszystkie PDF-y katalogów |
| `npm run pdfs:optimize` | kompresuje PDF-y |
| `npm run pdfs:verify` | waliduje PDF-y |
| `npm run pdfs:all` | pdfs + optimize + verify |
| `npm run audit` | raport stanu assetów katalogów |
| `npm run audit:check` | exit 1 gdy assety nie spełniają wymogów |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (single run) |
| `npm run test:watch` | Vitest watch |
| `npm run deploy:prod` | pełen deploy do produkcji (pdf + vercel --prod) |
| `npm run clean` | czyści `.next`, `.next-build`, `node_modules/.cache` |
| `npm run kill:next:mac` | zabija proces dev servera na portach 3000–3009 |

---

## 9. Logika edycji treści

### Edycja istniejącego katalogu

1. Otwórz `public/catalogs/<ID>/<sekcja>/content.json`.
2. Zmodyfikuj treść (teksty, etykiety, opisy, listy materiałów).
3. **Obrazy**: wrzuć WebP do tego samego folderu, użyj nazwy pliku bez przedrostka `/`, np. `"packshotImage": "02_26_Metro_QX_SOLO_D_0000.webp"`.
4. Uruchom `npm run images`, żeby wygenerować warianty i odświeżyć manifest.
5. `npm run dev` + ręczna weryfikacja na `/catalog/<ID>`.
6. Commit zmian (JSON + obrazy + odświeżony `responsive-image-manifest.json`).

### Zmiana kolejności / etykiet sekcji
Edytuj tablicę `sections` w `public/catalogs/<ID>/config.json`. Usunięcie wpisu = ukrycie sekcji; dodanie wpisu wymaga, by katalog miał odpowiadający folder z `content.json`.

### Zmiany globalne (brand, footer)
[public/config.json](../public/config.json) — wartości nadpisują `DEFAULT_GLOBAL_CONFIG` w [src/lib/catalog-loader.ts](../src/lib/catalog-loader.ts#L80). Loader merge'uje `{ ...DEFAULT, ...data }`, więc można pominąć dowolne klucze.

### Dodanie nowego katalogu

1. Dodaj ID do `public/catalogs/index.json`.
2. Skopiuj folder istniejącego katalogu (np. `QX/`) jako szablon.
3. Edytuj `config.json` — `meta.title`, `meta.tagline`, `meta.collectionName`, `meta.layoutType`, `meta.theme`, `sections`.
4. Podmień treści w `*/content.json` i obrazy w folderach sekcji.
5. Wygeneruj thumbnaila: `thumbs/<id>-home.webp` (scena hero) i `thumbs/<id>-nav.webp` (packshot).
6. Dodaj kafelek w [src/app/page.tsx](../src/app/page.tsx) (sekcje strony głównej są obecnie hard-codowane — patrz „Punkty do dalszego rozwoju").
7. `npm run images && npm run pdfs && npm run dev`.

### Dodanie nowego typu layoutu

1. W [src/types/catalog.ts](../src/types/catalog.ts) rozszerz `CatalogLayoutType` o nowy literał (np. `'newdesk'`).
2. Stwórz folder [src/layouts/newdesk/](../src/layouts/) z plikami `CatalogPageNewdesk.tsx`, `CatalogPrintNewdesk.tsx`, `*Newdesk.tsx` dla każdej sekcji.
3. Zarejestruj komponent w `layoutMap` w [src/app/catalog/[catalogId]/page.tsx](../src/app/catalog/[catalogId]/page.tsx).
4. Ustaw `meta.layoutType: "newdesk"` w `config.json` katalogu.

### Walidacja i obowiązki przy zmianach UI
- Każda zmiana wpływająca na UI musi być odzwierciedlona w [src/app/design-system/page.tsx](../src/app/design-system/page.tsx) (patrz [AGENTS.md](../AGENTS.md)).
- Nowe tokeny → najpierw [src/app/globals.css](../src/app/globals.css) i (jeśli trzeba) [tailwind.config.ts](../tailwind.config.ts), zamiast hardcodować wartości w komponentach.
- `npm run typecheck && npm run lint && npm run test` przed PR-em.

---

## 10. Strona główna i nawigacja

- [src/app/page.tsx](../src/app/page.tsx) — strona główna ma trzy sekcje (Operational, Conference, Reception) z hard-codowanymi kafelkami i ścieżkami do `thumbs/<id>-home.webp`. To świadomy wybór — strona główna jest „brandingowa", nie generyczna.
- [src/components/catalog/CatalogNav.tsx](../src/components/catalog/CatalogNav.tsx) — wspólna nawigacja, w stopce dostaje listę katalogów z `getCatalogFooterEntries()`, które priorytetyzują `thumbs/<id>-nav.webp` z fallbackiem do `overview/packshot`.

---

## 11. API i SEO

- [src/app/api/catalogs/route.ts](../src/app/api/catalogs/route.ts) — JSON z listą katalogów, oznaczony nagłówkiem `Link` z `/api-catalog` (RFC 9727) w [next.config.ts](../next.config.ts#L48).
- [src/app/sitemap.ts](../src/app/sitemap.ts) — `/` + `/catalog/<id>` dla każdego ID, `lastModified = new Date()` na build time.
- [src/app/robots.txt](../src/app/robots.txt) — statyczny.
- `generateMetadata()` w `catalog/[catalogId]/page.tsx` ustawia `title` z `meta.title + meta.tagline`.

---

## 12. Testy

- Komponenty: `src/components/catalog/*.test.tsx`, `src/layouts/qx/*.test.tsx`.
- Loader: [src/lib/catalog-loader.test.ts](../src/lib/catalog-loader.test.ts).
- Schemata: [src/lib/schemas/schemas.test.ts](../src/lib/schemas/schemas.test.ts).
- Image utils: [src/lib/responsive-image.test.ts](../src/lib/responsive-image.test.ts).
- Sitemap: [src/app/sitemap.test.ts](../src/app/sitemap.test.ts).
- Middleware: [src/middleware.test.ts](../src/middleware.test.ts).
- Dostępność: testy z `jest-axe` w komponentach.

```bash
npm run test          # run-once
npm run test:watch
```

---

## 13. Izolacja stagów

Repo `__METRO_catalogs_stage3` to **osobny projekt**. Siostrzane katalogi `__METRO_catalogs` (stage1) i `__METRO_catalogs_stage2` mają własne stany i konwencje. Nie czytaj i nie kopiuj treści ani plików między tymi projektami (zob. `feedback_stage_isolation.md`).

---

## 14. Punkty do dalszego rozwoju

Pomysły na ewolucję, które warto rozważyć przy kolejnym sprincie:

1. **CMS warstwa na JSON** — obecnie edycja to manualne zmiany w plikach. Lekki interfejs (np. CMS headless z synchronizacją do gita, albo własna `/admin` z S3 backendem) odciążyłby redaktorów.
2. **Walidacja Zod dla wszystkich sekcji** — dziś tylko `hero` i `packshots` mają schematy; reszta jest typowana TS-em bez runtime validation. Pełne pokrycie wyłapie literówki w content.json przed deploy'em.
3. **Generyczna strona główna** — kafelki w `page.tsx` są zakodowane na sztywno. Można je generować z `index.json` + nowego `homepageGroups.json` (operational/conference/reception → lista ID).
4. **Cache PDF-ów per content hash** — `generate-catalog-pdfs.mjs` re-generuje wszystkie PDF-y zawsze. Hash treści `content.json` + invalidate przyspieszyłby `npm run deploy:prod`.
5. **Vercel AI Gateway / Vercel Agent** — możliwe wykorzystanie do automatycznych testów PR-ów (Vercel Agent Review) lub do generowania opisów produktów.
6. **Sandbox dla użytkownika** — `Vercel Sandbox` lub `/configurator` interaktywny do składania własnej konfiguracji (frame + desktop) z bezpośrednim eksportem do PDF.
7. **Wielojęzyczność** — wszystkie `content.json` po angielsku; struktura na `i18n` (PL/EN/DE) wymagałaby równoległej tablicy sekcji albo per-locale folderu.
8. **Layouty `type2`, `type3`** — zarezerwowane w `CatalogLayoutType` ale renderują placeholder. Czekają na designy dla nowych linii produktowych.
9. **Strict ESLint / dependency audit** — `knip` już zintegrowany; można dodać `codebase-cleanup:deps-audit` jako pre-commit hook.
10. **Migration to next/image responsywne wszędzie** — jeszcze kilka miejsc używa custom `responsiveImg()` helpera; pełna migracja do `next/image` ujednolici pipeline.
11. **MCR800 dedykowane assety** — MCR800 obecnie używa packshotów z QS (zarówno `thumbs/-nav.webp` jak i `overview/`). Wymiana na własną sesję zdjęciową doprecyzuje brand.
12. **Sign in with Vercel + analityka** — jeśli pojawi się część B2B (zamówienia / cenniki), można szybko zintegrować logowanie przez Vercel OAuth + Vercel Analytics.

---

## 15. Szybki onboarding dla nowego deva

```bash
git clone <repo> && cd __METRO_catalogs_stage3
npm install
npm run images        # generacja wariantów obrazów + manifest
npm run dev           # → http://localhost:3000

# przed PR-em:
npm run typecheck && npm run lint && npm run test
```

Kluczowe pliki do przeczytania w kolejności:
1. [public/catalogs/README.md](../public/catalogs/README.md) — szablon treści.
2. [src/types/catalog.ts](../src/types/catalog.ts) — kontrakty domeny.
3. [src/lib/catalog-loader.ts](../src/lib/catalog-loader.ts) — całe ładowanie treści.
4. [src/app/catalog/[catalogId]/page.tsx](../src/app/catalog/[catalogId]/page.tsx) — dispatch layoutów.
5. [src/layouts/qx/CatalogPageQX.tsx](../src/layouts/qx/CatalogPageQX.tsx) — przykładowy layout sekcji.
6. [AGENTS.md](../AGENTS.md) — zasady design systemu i konwencje pracy.
