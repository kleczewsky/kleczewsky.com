import type { Locale } from "../routes";

export type Text = Record<Locale, string>;

export interface CaseStudy {
  id: string;
  index: string;
  /** Display name. Not translated — it is a product name. */
  name: string;
  status: "live" | "offline" | null;
  /** External links. More than one when a project spans properties. */
  links?: { label: string; url: string }[];
  summary: Text;
}

const PLACEHOLDER: Text = {
  en: "Placeholder: real copy pending.",
  pl: "Placeholder: właściwy opis w przygotowaniu.",
};

export const WORK: CaseStudy[] = [
  {
    id: "zjedzmy",
    index: "01",
    name: "Zjedz.my",
    status: "live",
    links: [{ label: "zjedz.my", url: "https://zjedz.my" }],
    summary: {
      en: "A restaurant booking platform I helped scale: cut the core search flow's load time by over 80%, shipped the React Native app end to end, and built out chat, reviews and the Reserve with Google integration.",
      pl: "Platforma rezerwacji stolików, którą pomagałem rozwijać: skróciłem czas ładowania głównej wyszukiwarki o ponad 80%, samodzielnie wdrożyłem aplikację w React Native oraz zbudowałem czat, opinie i integrację Reserve with Google.",
    },
  },
  {
    id: "slinger",
    index: "02",
    name: "Slinger",
    status: "live",
    links: [
      { label: "slingerstore.com", url: "https://slingerstore.com" },
      { label: "portalstrzelca.pl", url: "https://portalstrzelca.pl" },
    ],
    summary: PLACEHOLDER,
  },
  {
    id: "plusrecepta",
    index: "03",
    name: "PlusRecepta",
    status: "offline",
    summary: {
      en: "An online prescription and consultation platform built for Super-Pharm, a 45-year-old Polish health and beauty chain. I led development from the ground up and consulted on the wider technology stack.",
      pl: "Platforma e-recept i konsultacji online zbudowana dla Super-Pharm, sieci z 45-letnią tradycją na rynku zdrowia i urody. Prowadziłem jej rozwój od podstaw i doradzałem przy doborze technologii.",
    },
  },
  {
    id: "superpharm",
    index: "04",
    name: "Super-Pharm",
    status: null,
    summary: {
      en: "Internal tools for Super-Pharm's business operations: automated marketing management, billing, and other back-office workflows. Along the way I ran Git and version-control training, sanity-checked external contractors' work, and once cleared a problem others had been stuck on for weeks in about fifteen minutes.",
      pl: "Wewnętrzne narzędzia dla działów operacyjnych Super-Pharm: automatyzacja zarządzania marketingiem, rozliczenia i inne procesy back-office. Przy okazji prowadziłem szkolenia z Gita i kontroli wersji, weryfikowałem pracę zewnętrznych wykonawców i raz rozwiązałem problem, z którym inni zmagali się od tygodni, w około piętnaście minut.",
    },
  },
];
