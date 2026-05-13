# Raport weryfikacji manualnej dostępności

**Data wykonania:** _do uzupełnienia_
**Wykonawca:** _do uzupełnienia (imię, nazwisko, rola)_
**Środowisko:** macOS 15.x / Chrome 132+ / VoiceOver / Firefox 134+ / axe DevTools 4.x
**Build pod testem:** `npm run build && npm start` (port 3000) — commit referencyjny: _do uzupełnienia_
**Strony reprezentatywne:**
1. `/` (strona startowa katalogu)
2. `/catalog/QX` (kolekcja QX)
3. `/catalog/QS` (kolekcja QS)

**Stosowany dokument odniesienia:** [docs/raport-dostepnosci-2026-05-07.md](./raport-dostepnosci-2026-05-07.md)

---

## A. Lighthouse Accessibility (Chrome DevTools)

| Strona | Wynik (0–100) | Liczba zaleceń | Screenshot |
|--------|---------------|----------------|------------|
| `/`           | _TBD_ | _TBD_ | `screenshots/lighthouse/home.png` |
| `/catalog/QX` | _TBD_ | _TBD_ | `screenshots/lighthouse/qx.png` |
| `/catalog/QS` | _TBD_ | _TBD_ | `screenshots/lighthouse/qs.png` |

**Próg akceptacji:** ≥95 na każdej stronie.
**Komentarze do zaleceń (jeśli były):** _TBD_

---

## B. axe DevTools (Deque)

| Strona | Violations | Needs review | Best practices |
|--------|------------|--------------|----------------|
| `/`           | _TBD_ | _TBD_ | _TBD_ |
| `/catalog/QX` | _TBD_ | _TBD_ | _TBD_ |
| `/catalog/QS` | _TBD_ | _TBD_ | _TBD_ |

**Próg akceptacji:** 0 violations na każdej stronie.
**Lista violations (jeśli były):** _TBD_

---

## C. Walka z klawiaturą — pełna obsługa Tab/Shift+Tab/Enter/Escape/strzałki

| Scenariusz | Wynik |
|---|---|
| Tab od początku strony — kolejność fokusa zgodna z wizualną | _TBD_ |
| Skip link widoczny po pierwszym Tabie, działa po Enter | _TBD_ |
| Otwórz Lightbox z Gallery — Tab cyklicznie krąży w modalu | _TBD_ |
| Escape zamyka Lightbox, fokus wraca na miniaturę | _TBD_ |
| Strzałki ←/→ nawigują w Lightbox | _TBD_ |
| Hero slider — strzałki ←/→ zmieniają slajd, autoplay zatrzymany przy interakcji | _TBD_ |
| MaterialsOptionGroup — Tab po opcjach, Space/Enter wybiera | _TBD_ |
| FinishesQX modal preview — focus trap + Escape | _TBD_ |
| PackshotsQX lightbox — focus trap + Escape | _TBD_ |
| Brak focus traps na nieoczekiwanych elementach (np. Carousel autoplay nie kradnie fokusa) | _TBD_ |

---

## D. Czytnik ekranu (VoiceOver — macOS)

Sekwencja testowa: VO+→ przejście liniowe + VO+U rotor (Headings, Landmarks, Links, Form Controls).

| Scenariusz | Wynik |
|---|---|
| `<h1>` per katalog jest pierwszym nagłówkiem — VO odczytuje tytuł kolekcji | _TBD_ |
| Rotor Landmarks pokazuje `<header>`, `<nav aria-label="Catalog sections">`, `<main>`, `<footer>` | _TBD_ |
| MaterialsOptionGroup — VO ogłasza nazwę grupy (z `aria-labelledby`) i każdą opcję jako kolor + nazwę | _TBD_ |
| ColorChip tooltip — VO ogłasza pełną etykietę (np. „Frame: RAL 9006 White") na fokus | _TBD_ |
| Lightbox przy otwarciu — VO ogłasza `dialog`, tytuł i licznik „Image N of M: <alt>" | _TBD_ |
| `aria-live="polite"` na liczniku Lightbox — przejście slajdu odczytane bez zatrzymywania nawigacji | _TBD_ |
| FeaturesQX video — VO nie odczytuje wideo (`aria-hidden="true"`), za to odczytuje `sr-only` opis | _TBD_ |
| Skip link odczytany jako pierwszy element po wejściu na stronę | _TBD_ |
| `aria-current="location"` w nawigacji — VO ogłasza aktywną sekcję jako „bieżącą lokalizację" | _TBD_ |

**Komentarze:** _TBD_

---

## E. Reflow i zoom

| Scenariusz | Wynik |
|---|---|
| Chrome DevTools → Responsive 320×640 → strona `/` renderuje bez poziomego scrollbara | _TBD_ |
| 320×640 → `/catalog/QX` renderuje bez poziomego scrollbara | _TBD_ |
| Zoom 200% (Cmd+`+`) na `/catalog/QX` — czytelny tekst, brak utraty treści, brak poziomego scrolla | _TBD_ |
| Zoom 400% (WCAG AAA 1.4.10) — content adapts (best-effort, nie wymagane przez AA) | _TBD_ |

---

## F. Wnioski

_Do uzupełnienia po zakończeniu testów A–E:_
- [ ] Wszystkie 3 strony osiągnęły Lighthouse ≥95 i axe 0 violations.
- [ ] Klawiatura w pełni funkcjonalna we wszystkich 10 scenariuszach.
- [ ] Czytnik ekranu poprawnie ogłasza wszystkie kluczowe elementy.
- [ ] Reflow 320 px i zoom 200% bez błędów.

**Ostateczny werdykt:** _PASS / FAIL z listą blokerów_

---

**Podpis:** _____________________
**Data:** _______________
