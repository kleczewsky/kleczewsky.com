import type { Locale } from "../routes";

export type Text = Record<Locale, string>;

export interface CaseStudy {
  id: string;
  index: string;
  /** Display name. Not translated: it is a product name. */
  name: string;
  status: "live" | "offline" | null;
  /** Monotone stamp on the slab, served from /marks. Omit and the
      slab carries its skyline watermark alone. */
  mark?: string;
  /** External links. More than one when a project spans properties. */
  links?: { label: string; url: string }[];
  summary: Text;
}

export const WORK: CaseStudy[] = [
  {
    id: "confidential-saas",
    index: "01",
    name: "SaaS · Confidential",
    status: null,
    summary: {
      en: "A SaaS platform serving 100,000–200,000 monthly active users. I migrated the critical payment flow to event-driven architecture in Laravel, optimized ORM usage, and worked through legacy technical debt. I own features from requirements to deployment and contribute to the product roadmap.",
      pl: "Platforma SaaS obsługująca 100–200 tys. aktywnych użytkowników miesięcznie. Przeniosłem kluczowy proces płatności do architektury zdarzeniowej w Laravelu, zoptymalizowałem użycie ORM i porządkowałem dług techniczny. Prowadzę funkcje od wymagań po wdrożenie i współtworzę plan rozwoju produktu.",
    },
  },
  {
    id: "superpharm",
    index: "02",
    name: "Super-Pharm",
    mark: "/marks/superpharm.svg",
    status: null,
    summary: {
      en: "As Laravel Tech Lead, I mentored developers, trained the team in Git, and reviewed external contractors’ work. My technical analysis simplified a shipment-tracking implementation and removed delivery blockers. I also built internal tools for marketing automation, employee self service, and location discovery.",
      pl: "Jako Laravel Tech Lead wspierałem rozwój programistów, prowadziłem szkolenia z Gita i weryfikowałem pracę zewnętrznych wykonawców. Moja analiza techniczna uprościła wdrożenie śledzenia przesyłek i usunęła blokady w realizacji. Tworzyłem też narzędzia do automatyzacji marketingu, samoobsługi pracowników i wyszukiwania lokalizacji.",
    },
  },
  {
    id: "plusrecepta",
    index: "03",
    name: "PlusRecepta",
    mark: "/marks/plusrecepta.svg",
    status: "offline",
    summary: {
      en: "An online prescription and consultation platform for Super-Pharm. As the main developer, I led it from concept to public launch in January 2024. I advocated Livewire and FilamentPHP to accelerate delivery, advised on the wider technology stack, and continued improving performance, stability, and usability.",
      pl: "Platforma e-recept i konsultacji online dla Super-Pharm. Jako główny programista prowadziłem ją od pomysłu do publicznego uruchomienia w styczniu 2024. Zaproponowałem Livewire i FilamentPHP, żeby przyspieszyć realizację, doradzałem przy doborze technologii i dalej poprawiałem wydajność, stabilność oraz wygodę obsługi.",
    },
  },
  {
    id: "zjedzmy",
    index: "04",
    name: "Zjedz.my",
    mark: "/marks/zjedzmy.svg",
    status: "live",
    links: [{ label: "zjedz.my", url: "https://zjedz.my" }],
    summary: {
      en: "A restaurant booking platform I helped scale. I cut the main search flow’s load time by over 80% and built chat and reviews. I also developed a canvas floor planner with drag-and-drop reservation management, and integrated Reserve with Google and Point-of-Sale systems.",
      pl: "Platforma rezerwacji stolików, którą pomagałem rozwijać. Skróciłem czas ładowania głównej wyszukiwarki o ponad 80% oraz dodałem czat i opinie. Zbudowałem też edytor układu sali na canvasie z obsługą rezerwacji przez przeciąganie i upuszczanie oraz integracje z Reserve with Google i systemami POS.",
    },
  },
  {
    id: "slinger",
    index: "05",
    name: "Slinger",
    mark: "/marks/slinger.svg",
    status: "live",
    links: [
      { label: "slingerstore.com", url: "https://slingerstore.com" },
      { label: "portalstrzelca.pl", url: "https://portalstrzelca.pl" },
    ],
    summary: {
      en: "My own product, from first sketch to checkout: 3D-printed magnetic mounts that organise a gun safe without drilling. I design the parts and run the Shopify store. Alongside it, I’m building Portal Strzelca, a searchable directory of shooting ranges that helps customers find the store.",
      pl: "Mój własny produkt, od pierwszego szkicu po sprzedaż: drukowane w 3D uchwyty magnetyczne, które pomagają uporządkować sejf na broń bez wiercenia. Projektuję części i prowadzę sklep na Shopify. Obok rozwijam Portal Strzelca, wyszukiwarkę strzelnic, przez którą klienci trafiają do sklepu.",
    },
  },
];
