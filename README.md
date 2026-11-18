# Dzienniczek holterowski | Łapa na Pulsie

Dzienniczek obserwacji opiekuna w czasie badania Holter EKG psa lub kota: aktywności, sen, podane leki, objawy. Podgląd, PDF, wydruk i wysyłka PDF przez program pocztowy opiekuna na **kardiologia@lapanapulsie.pl**.

Ta sama technologia i publikacja co „Oddechy pod kontrolą”: React + Vite + Tailwind, GitHub → Netlify, ten sam branding (kolory, Montserrat, logo, przyciski).

- Dane opiekuna zapisują się tylko w jego przeglądarce (bez konta, bez serwera). Do przychodni trafiają dopiero, gdy opiekun wyśle PDF.
- Godziny są zapisywane jako tekst (np. „22:40”) – bez stref czasowych, więc podgląd, PDF i e-mail pokazują dokładnie to, co wpisał opiekun.

---

## Część 1. Publikacja (tak jak Oddechy)

1. **GitHub** → **+** → **New repository** → nazwa `holter` → **Private** → bez README → **Create repository**.
2. **uploading an existing file** → przeciągnij **całą zawartość** rozpakowanego folderu `dzienniczek-holterowski` (to, co jest w środku) → **Commit changes**. Najlepiej w Chrome.
3. **Netlify** → **Add new project** → **Import an existing project** → **GitHub** → wybierz `holter`.
   Build command `npm run build`, publish directory `dist` (Netlify odczyta to samo). → **Deploy**.
   Jeśli pierwsze konto Netlify ma limit – użyj drugiego (tego z linki.lapanapulsie.pl).
4. **Nazwa projektu**: Project configuration → Change project name → np. `lapa-holter`.
5. **Subdomena** (zrób to przed rozdaniem linku – zmiana adresu = pusty dzienniczek u opiekunów):
   - Netlify → Domain management → Add a domain → `holter.lapanapulsie.pl` → Verify → Add domain.
   - cyber_Folks → Edycja strefy DNS → nowy rekord **CNAME**: nazwa `holter`, wartość `lapa-holter.netlify.app`.
   - HTTPS włączy się samo (od kilku minut do kilku godzin).

## Jak działa „Wyślij do lekarza”

Strona internetowa nie może sama otworzyć poczty jednocześnie z załącznikiem i wpisanym adresem (to ograniczenie telefonów), dlatego:

- **Telefon / tablet:** adres kardiologia@lapanapulsie.pl trafia do schowka, a otwiera się systemowe „Udostępnij” z dołączonym PDF, tematem i treścią. Opiekun wybiera Pocztę lub Gmail i wkleja adres w polu „Do”.
- **Komputer:** PDF się pobiera, a program pocztowy otwiera się z adresem, tematem i treścią – opiekun dołącza pobrany plik.
- Aplikacja nie pokazuje „wysłano”, bo nie ma jak tego sprawdzić – prosi opiekuna o sprawdzenie w poczcie.

Temat: „Dzienniczek holterowski — [imię zwierzęcia] [nazwisko opiekuna] — [data rozpoczęcia badania]”.

---

## Dla programisty

```bash
npm install
npm run dev      # podgląd
npm run build    # sprawdzenie typów + budowa
npm run test     # testy: czas/północ, walidacja, raport, PDF, treść e-maila
```

```
src/core/      typy, czas (bez stref), walidacja, model raportu, PDF, treść e-maila
src/lib/       zapis w przeglądarce, generowanie PDF, udostępnianie / e-mail
src/components, src/pages   interfejs
```

Zmiana adresu odbiorcy: `RECIPIENT_EMAIL` w `src/core/labels.ts`.
Czcionka Montserrat: SIL Open Font License 1.1 (`public/fonts/OFL.txt`).
