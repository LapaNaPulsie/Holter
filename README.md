# Dzienniczek holterowski | Łapa na Pulsie

Dzienniczek obserwacji opiekuna w czasie badania Holter EKG psa lub kota: aktywności, sen, podane leki, objawy. Podgląd, PDF, wydruk i **wysyłka z aplikacji na kardiologia@lapanapulsie.pl** (PDF w załączniku).

Ta sama technologia i publikacja co „Oddechy pod kontrolą”: React + Vite + Tailwind, GitHub → Netlify, ten sam branding (kolory, Montserrat, logo, przyciski).

- Dane opiekuna zapisują się tylko w jego przeglądarce (bez konta). Do przychodni trafiają dopiero po „Wyślij do lekarza”.
- Godziny są zapisywane jako tekst (np. „22:40”) – bez stref czasowych, więc podgląd, PDF i e-mail pokazują dokładnie to, co wpisał opiekun.
- PDF do pobrania i PDF w e-mailu powstają z tych samych danych tym samym kodem.

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

Aplikacja działa od razu (wpisy, podgląd, PDF, druk). **Wysyłka e-mail ruszy dopiero po Części 2.** Do tego czasu przycisk „Wyślij do lekarza” pokazuje: „Wysyłka z aplikacji nie jest jeszcze uruchomiona. Pobierz PDF…”.

---

## Część 2. Uruchomienie wysyłki e-mail

Wybierz **jeden** wariant.

### Wariant A (prostszy) – skrzynka w Twojej domenie przez SMTP

Dla poczty @lapanapulsie.pl prowadzonej na serwerze cyber_Folks. Bez zmian w DNS.

1. W panelu cyber_Folks załóż skrzynkę nadawczą, np. `dzienniczek@lapanapulsie.pl`, z mocnym hasłem.
2. W panelu (konfiguracja programu pocztowego dla tej skrzynki) odczytaj **serwer poczty wychodzącej (SMTP)** i port **465 (SSL/TLS)**.
3. Netlify → projekt → **Project configuration → Environment variables → Add a variable**. Dodaj:

| Key | Value |
|---|---|
| `SMTP_HOST` | serwer SMTP z panelu |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `dzienniczek@lapanapulsie.pl` |
| `SMTP_PASS` | hasło tej skrzynki |
| `MAIL_FROM` | `Dzienniczek holterowski <dzienniczek@lapanapulsie.pl>` |

4. **Deploys → Trigger deploy → Deploy project** (zmienne działają po nowej publikacji).

### Wariant B – usługa Resend

Gdy poczta domeny nie jest na cyber_Folks albo SMTP nie zadziała.

1. Załóż konto na resend.com → **Domains → Add domain** → `lapanapulsie.pl` (region EU).
2. Resend pokaże rekordy DNS (TXT/MX dla DKIM i SPF). Dodaj je w cyber_Folks → Edycja strefy DNS. Poczekaj na status **Verified**.
3. Resend → **API Keys → Create** (uprawnienie: Sending access).
4. Netlify → Environment variables: `RESEND_API_KEY` = klucz, `MAIL_FROM` = `Dzienniczek holterowski <dzienniczek@lapanapulsie.pl>`.
5. Trigger deploy.

(Jeśli ustawisz oba warianty, dodaj `EMAIL_PROVIDER` = `smtp` albo `resend`.)

### Opcjonalnie
- `RATE_LIMIT_SECRET` – dowolny losowy ciąg (min. 20 znaków); do anonimizacji adresów IP w limicie wysyłek.

### Test po konfiguracji (obowiązkowo)
1. Otwórz `https://holter.lapanapulsie.pl` → uzupełnij dane testowe („Test”, „Testowa”) → dodaj 1 wpis.
2. PDF i wysyłka → Wyślij do lekarza → Potwierdzam.
3. Musi pojawić się: „Dzienniczek został przekazany do wysyłki na adres kardiologia@lapanapulsie.pl”, a w skrzynce kardiologii – wiadomość z PDF.
4. Sprawdź też folder SPAM. Jeśli jest błąd: Netlify → Logs → Functions → `send-diary` – widać tylko kody (np. `provider_error:smtp_535` = złe hasło), bez danych pacjenta.
5. Na koniec w aplikacji: Informacje → Rozpocznij nowy dzienniczek.

---

## Zabezpieczenia wysyłki

- Adres odbiorcy jest wpisany na stałe w kodzie serwera – nie da się go zmienić z przeglądarki.
- Klucze i hasła są tylko w zmiennych środowiskowych Netlify.
- Dane są ponownie sprawdzane na serwerze; PDF jest generowany na serwerze (nie da się podmienić załącznika).
- Sukces pokazuje się dopiero po przyjęciu wiadomości przez usługę pocztową.
- Ten sam dzienniczek (identyczna treść) nie zostanie wysłany drugi raz; blokada podwójnego kliknięcia.
- Pole-pułapka na boty, sprawdzenie źródła żądania, limit: 6 wysyłek/godz. i 20/dobę z jednego IP, 200/dobę łącznie.
- Logi i magazyn (Netlify Blobs `holter-wysylki`) zawierają tylko kody i skróty (hash) – nigdy treść dzienniczka.

---

## Dla programisty

```bash
npm install
npm run dev      # podgląd (bez funkcji wysyłki)
npm run build    # sprawdzenie typów + budowa
npm run test     # testy: czas/północ, walidacja, raport, PDF, wysyłka (atrapa poczty)
```

```
src/core/      logika wspólna dla przeglądarki i serwera: typy, czas, walidacja, model raportu, PDF
src/lib/       zapis w przeglądarce, PDF po stronie klienta, wywołanie wysyłki
src/components, src/pages   interfejs
netlify/functions/send-diary.mts   funkcja wysyłki
netlify/lib/   send-core.ts (logika + limity + idempotencja), mailers.ts (SMTP / Resend)
```

Zmiana adresu odbiorcy: `RECIPIENT_EMAIL` w `src/core/labels.ts` (używany przez serwer).
Czcionka Montserrat: SIL Open Font License 1.1 (`public/fonts/OFL.txt`).
