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
    id: "zjedzmy",
    index: "01",
    name: "Zjedz.my",
    mark: "/marks/zjedzmy.svg",
    status: "live",
    links: [{ label: "zjedz.my", url: "https://zjedz.my" }],
    summary: {
      en: "A restaurant booking platform I helped scale. I cut the main search flow’s load time by over 80%, delivered the React Native app from development to release, and built chat, reviews, and the Reserve with Google integration.",
      pl: "Platforma rezerwacji stolików, którą pomagałem rozwijać. Skróciłem czas ładowania głównej wyszukiwarki o ponad 80%, samodzielnie stworzyłem i wdrożyłem aplikację w React Native oraz dodałem czat, opinie i integrację Reserve with Google.",
    },
  },
  {
    id: "slinger",
    index: "02",
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
  {
    id: "plusrecepta",
    index: "03",
    name: "PlusRecepta",
    mark: "/marks/plusrecepta.svg",
    status: "offline",
    summary: {
      en: "An online prescription and consultation platform built for Super-Pharm. I led development from the ground up and advised on the wider technology stack.",
      pl: "Platforma e-recept i konsultacji online dla Super-Pharm. Prowadziłem jej rozwój od podstaw i doradzałem przy doborze technologii dla szerszego projektu.",
    },
  },
  {
    id: "superpharm",
    index: "04",
    name: "Super-Pharm",
    mark: "/marks/superpharm.svg",
    status: null,
    summary: {
      en: "Internal tools that simplified marketing, billing, and day-to-day operations. Alongside development, I trained the team in Git, reviewed external contractors’ work, and helped resolve technical blockers.",
      pl: "Wewnętrzne narzędzia usprawniające marketing, rozliczenia i codzienną pracę. Poza programowaniem prowadziłem szkolenia z Gita, weryfikowałem pracę zewnętrznych wykonawców i pomagałem rozwiązywać problemy techniczne blokujące zespół.",
    },
  },
];
