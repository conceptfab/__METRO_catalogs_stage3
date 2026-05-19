# Raport PageSpeed Insights mobile – `metro-catalogs-stage3.vercel.app/catalog/QX`

## Przegląd
Test mobilny dla strony `https://metro-catalogs-stage3.vercel.app/catalog/QX` uzyskał wynik wydajności 89/100, przy 100/100 dla Accessibility, 100/100 dla Best Practices i 92/100 dla SEO.[cite:1] Pomiar wykonano w emulacji Moto G Power, przy spowolnieniu do 4G i podczas cold load, więc wyniki dobrze pokazują zachowanie na słabszym urządzeniu i wolniejszym łączu.[cite:1]

## Najważniejsze metryki mobile
Największym ograniczeniem nie jest interaktywność, tylko szybkość dostarczenia głównej treści wizualnej.[cite:1] First Contentful Paint wynosi 1,0 s, Largest Contentful Paint 3,5 s, Total Blocking Time 50 ms, Cumulative Layout Shift 0 oraz Speed Index 3,8 s.[cite:1]

| Metryka | Wynik | Ocena |
|---|---:|---|
| Performance | 89 | Dobra, blisko strefy 90+ [cite:1] |
| FCP | 1,0 s | Bardzo dobry start renderu [cite:1] |
| LCP | 3,5 s | Główne pole do poprawy [cite:1] |
| TBT | 50 ms | Bardzo dobry, JS nie blokuje mocno [cite:1] |
| CLS | 0 | Wzorowa stabilność layoutu [cite:1] |
| Speed Index | 3,8 s | Do poprawy przez lepszy above-the-fold [cite:1] |

## Co poprawić najpierw
### 1. Obrazy i element LCP
Lighthouse wskazuje „Ulepsz dostarczanie obrazów” z szacowanym potencjałem redukcji transferu o 372 KiB, więc to jest największa pojedyncza rezerwa wydajności w tym raporcie.[cite:1] Ponieważ LCP wynosi 3,5 s, należy zaczą+-+-+-+-media uwagę przede wszystkim na hero image, główne zdjęcie katalogu albo największy baner widoczny nad foldem.[cite:1]

Rekomendacje wdrożeniowe:
- Konwertować obrazy do AVIF lub WebP, jeśli jeszcze nie są zoptymalizowane.[cite:1]
- Serwować responsywne warianty przez `srcset` i `sizes`, aby mobile nie pobierał desktopowych rozmiarów.
- Ustawić preload dla obrazu LCP, jeśli jest kluczowy dla pierwszego ekranu.
- Sprawdzić, czy komponent `next/image` nie ładuje zbyt dużego assetu albo bez `priority` dla najważniejszego obrazu.
- Ograniczyć liczbę dużych miniaturek widocznych od razu po wejściu na stronę.

### 2. Zasoby blokujące renderowanie
Raport pokazuje „Prośby o zablokowanie renderowania” z potencjalnym zyskiem około 100 ms.[cite:1] To nie jest krytyczny problem, ale warto go domknąć, bo przy wyniku 89 nawet małe oszczędności mogą podbić stronę ponad 90 punktów.[cite:1]

Rekomendacje wdrożeniowe:
- Zinline’ować krytyczny CSS dla pierwszego widoku.
- Odraczać niekrytyczne style i skrypty, szczególnie dla sekcji poniżej pierwszego ekranu.
- Ograniczyć fonty ładowane na starcie, zwłaszcza wiele wag i subsetów.
- Upewnić się, że zewnętrzne skrypty marketingowe lub analityczne nie startują zbyt wcześnie.

### 3. Nieużywany CSS i starszy JavaScript
Lighthouse wskazuje 10 KiB możliwej redukcji nieużywanego CSS oraz 12 KiB starszego kodu JavaScript.[cite:1] To nie są ogromne liczby, ale w mobile każda redukcja payloadu pomaga poprawić Speed Index i czas dojścia do pełnego renderu.[cite:1]

Rekomendacje wdrożeniowe:
- Przejrzeć globalne style i usunąć klasy, które nie są używane na stronie katalogu.
- Ograniczyć duże biblioteki UI lub utility importowane globalnie.
- Sprawdzić transpilation target i upewnić się, że nie jest wysyłany zbędny legacy JS dla nowoczesnych przeglądarek.[cite:1]
- W Next.js rozważyć dynamic import dla komponentów poniżej folda lub rzadziej używanych widgetów.

### 4. Główny wątek i animacje
Diagnostyka wykryła 2 długie zadania w głównym wątku oraz 1 animowany element z nieskomponowaną animacją.[cite:1] TBT jest już niski, więc problem nie jest pilny, ale warto go poprawić, aby uniknąć regresji przy dalszym rozwoju strony.[cite:1]

Rekomendacje wdrożeniowe:
- Przenieść animacje na `transform` i `opacity`, unikając animowania `top`, `left`, `width`, `height`.
- Ograniczyć koszt JS wykonywanego tuż po mount, szczególnie w komponentach galerii i filtrów.
- Sprawdzić, czy nie ma ciężkiego formatowania danych lub synchronizowanych pomiarów DOM przy pierwszym renderze.

## SEO i kwestie techniczne
SEO uzyskało 92/100, a główny wykryty problem to nieprawidłowy plik `robots.txt` z jednym błędem.[cite:1] Jeśli katalog ma być indeksowany, ten punkt należy poprawić szybko, bo może wpływać na dostęp robotów do strony.[cite:1]

Rekomendacje wdrożeniowe:
- Zweryfikować publiczny adres `https://metro-catalogs-stage3.vercel.app/robots.txt`.
- Sprawdzić, czy plik zwraca status 200, poprawny `Content-Type` i prawidłową składnię.
- Jeśli to środowisko staging, zdecydować świadomie, czy indeksacja ma być zablokowana; jeśli tak, błąd może być akceptowalny biznesowo, ale powinien być celowy, nie przypadkowy.[cite:1]

## Priorytety działań
Największy wpływ na wynik mobile powinny dać zmiany wokół obrazu LCP i ogólnej optymalizacji obrazów, bo właśnie tam raport pokazuje najwyższy potencjał oszczędności transferu.[cite:1] Drugim krokiem powinno być ograniczenie render-blocking resources i porządki w CSS/JS, a dopiero potem dopracowanie animacji i długich zadań.[cite:1]

| Priorytet | Zadanie | Wpły-cookie? | Oczekiwany efekt |
|---|---|---|---|
| P1 | Optymalizacja obrazów i elementu LCP | Wysoki | Lepszy LCP i Speed Index [cite:1] |
| P1 | `priority/preload` dla głównego obrazu above the fold | Wysoki | Szybszy render kluczowej treści |
| P2 | Redukcja render-blocking CSS/JS | Średni | +kilkadziesiąt do ~100 ms [cite:1] |
| P2 | Usunięcie nieużyzeugego CSS i ograniczenie legacy JS | Średni | Mniejszy payload mobile [cite:1] |
| P3 | Poprawa animacji i analiza long tasks | Niski/średni | Większa odporność na regresje [cite:1] |
| P1 | Naprawa `robots.txt` | Wysoki dla SEO | Poprawna indeksacja [cite:1] |

## Wniosek operacyjny
Strona mobilna jest już w dobrej kondycji technicznej, bo ma bardzo niski TBT, zerowy CLS i wysoki ogólny wynik 89/100.[cite:1] Najbardziej opłacalna poprawka to optymalizacja obrazów i elementu LCP, a najszybszy techniczny „quick win” poza tym to usunięcie błędu `robots.txt` oraz ograniczenie render-blocking resources.[cite:1]
