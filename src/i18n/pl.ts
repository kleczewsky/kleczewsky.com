import type { Dict } from "./en";

/* Typed against the English dictionary: a missing key fails
   `npm run typecheck`. Polish runs 15-20% longer than English,
   where that breaks a layout, fix the layout, not the translation. */

const pl: Dict = {
  meta: {
    siteName: "Kleczewsky",
    tagline: "Senior Full-Stack Developer",
    description:
      "Eryk Kleczewski: senior full-stack developer i tech lead. Buduję i utrzymuję produkcyjne systemy w Laravelu i Reakcie, od platform zdrowotnych po SaaS obsługujący 200 tys. użytkowników miesięcznie. Dostępny do współpracy i pracy na etat.",
  },
  nav: {
    about: "O mnie",
    work: "Projekty",
    lab: "Lab",
    contact: "Kontakt",
    languageLabel: "Język",
    skipToContent: "Przejdź do treści",
    menu: "Menu",
    close: "Zamknij",
  },
  chapter: {
    home: "Start",
    about: "O mnie",
    work: "Projekty",
    lab: "Lab",
    contact: "Kontakt",
    system: "System",
  },
  status: {
    available: "Dostępny",
    availableLong: "Otwarty na współpracę i pracę na etat",
    location: "Europa · Zdalnie",
  },
  home: {
    role: "Full-stack developer",
    stack: "Laravel · Livewire · Filament · React · WebGL",
    intro:
      "Buduję oprogramowanie produkcyjne i zostaję z nim po wdrożeniu: platformę rezerwacyjną używaną przez setki restauracji, usługę zdrowotną dla ogólnopolskiej sieci sklepów i system SaaS obsługujący 200 tysięcy użytkowników miesięcznie.",
    toWork: "Zobacz projekty",
    toContact: "Zacznijmy projekt",
    scroll: "Przewiń",
    more: "Więcej",
  },
  hire: {
    kind: "Usługa",
    mark: "Zakres współpracy",
    lead: "Trzy rzeczy, o które pytają najczęściej. Stały zakres albo współpraca ciągła, działa jedno i drugie.",
    items: [
      {
        title: "Produkcyjne systemy w Laravelu",
        body: "Rezerwacje, płatności, panele administracyjne, w których ktoś pracuje po osiem godzin dziennie. Laravel z Livewire i FilamentPHP, na czystej architekturze, gotowy do przekazania i utrzymania.",
        tags: ["Laravel", "Livewire", "Filament", "MySQL"],
      },
      {
        title: "Front-end, który ma się zachowywać",
        body: "Interfejsy w Reakcie, widgety osadzane na cudzych stronach i renderujące się poprawnie w cudzym CSS, oraz WebGL tam, gdzie interfejs faktycznie na to zasługuje.",
        tags: ["React", "TypeScript", "WebGL", "Vite"],
      },
      {
        title: "Przejęcie istniejącego systemu",
        body: "Wejście w cudzy kod i doprowadzenie go do stabilności: czyszczenie lat długu technicznego, skrócenie czasu ładowania kluczowej funkcji o 80% i raportowanie błędów wdrożone przed pierwszą awarią, a nie po niej.",
        tags: ["Kolejki", "Integracje", "Monitoring"],
      },
    ],
  },
  hud: {
    tier: "Tryb",
    localTime: "Czas",
    status: "Status",
  },
  work: {
    lead: "Produkty, które działają, mają realny ruch i wciąż są rozwijane.",
    live: "Działa",
    offline: "Wyłączony",
    visit: "Otwórz stronę",
    role: "Rola",
    client: "Klient",
    year: "Rok",
    stack: "Stack",
    previous: "Poprzedni projekt",
    next: "Następny projekt",
  },

  stack: {
    mark: "Z czym pracuję",
    lead: "Narzędzia, po które sięgam najpierw, i do czego naprawdę używam każdego z nich.",
    items: [
      {
        term: "Laravel",
        desc: "Większość tego, co wdrażam. Kolejki, zadania cykliczne i panel, którego ktoś używa cały dzień.",
      },
      {
        term: "Livewire i Filament",
        desc: "Interaktywne panele bez drugiej bazy kodu, którą trzeba utrzymywać w zgodzie.",
      },
      {
        term: "React i TypeScript",
        desc: "Do interfejsów z realnym stanem po stronie klienta i do wszystkiego, co osadzam na cudzej stronie.",
      },
      {
        term: "WebGL i three.js",
        desc: "Tam, gdzie interfejs na to zasługuje. Ta strona jest przykładem.",
      },
    ],
  },
  about: {
    lead: "Zamieniam złożone wymagania biznesowe w skalowalne, wydajne produkty: od platform zdrowotnych dla ogólnopolskiej marki po system SaaS obsługujący 200 tysięcy użytkowników miesięcznie.",
    dossier: "Profil",
    baseLabel: "Baza",
    stackLabel: "Stack",
    statusLabel: "Status",
    body: [
      {
        mark: "Stack",
        text: "Większość tego, co buduję, to PHP i Laravel, z FilamentPHP i czystą architekturą pod spodem. Na froncie dopasowuję się do potrzeb projektu: React albo własny ekosystem Laravela, Blade i Livewire.",
      },
      {
        mark: "Ograniczenia",
        text: "Lubię problemy z prawdziwym ograniczeniem. Widget rezerwacyjny, który musi renderować się poprawnie w cudzym CSS. Katalog kilkuset pozycji, w którym całym produktem jest to, czy ktoś znajdzie właściwą. Płatność, w której trybem awarii jest czyjś lek.",
      },
      {
        mark: "Efekty",
        text: "Skupiam się na mierzalnych efektach: skróciłem czas ładowania kluczowego flow rezerwacji o 80%, wyczyściłem lata zaległego długu technicznego i prowadziłem funkcje od pierwszego szkicu aż po produkcję. Czytam dokumentację, piszę testy dla ścieżek, którymi idą pieniądze, i wdrażam raportowanie błędów przed pierwszą awarią, a nie po niej.",
      },
    ],
    figures: [
      {
        kicker: "Skala",
        value: "200 tys.",
        label: "Użytkowników miesięcznie na platformie SaaS, którą rozwijam.",
      },
      { kicker: "Szybkość", value: "80%", label: "Krócej ładuje się kluczowe flow rezerwacji." },
      {
        kicker: "Diagnoza",
        value: "15 min",
        label: "Tyle zajęło rozwiązanie problemu, który blokował zespół od tygodni.",
      },
    ],
    nowHeading: "Teraz",
    now: "Rozwijam architekturę backendu i wydajność systemu SaaS o dużym ruchu (150 do 200 tysięcy użytkowników miesięcznie) jako senior full-stack developer.",
  },
  lab: {
    lead: "Małe, samodzielne eksperymenty: canvas, shadery, animacja. Każdy działa na żywo i ma opublikowane źródło.",
    pending: "Pierwsze wpisy pojawią się wkrótce.",
  },
  contact: {
    lead: "Otwarty na współpracę i pracę na etat. Najszybciej złapiesz mnie mailem.",
    emailLabel: "E-mail",
    elsewhere: "Gdzie indziej",
    responseNote: "Odpowiadam w ciągu dnia lub dwóch.",
  },
  language: {
    switchTo: "View in English",
    dismiss: "Zamknij",
  },
  notFound: {
    code: "404",
    title: "Brak sygnału",
    body: "Tej strony tu nie ma. Sprawdź listę projektów albo wróć na start.",
    home: "Wróć na start",
  },
};

export default pl;
