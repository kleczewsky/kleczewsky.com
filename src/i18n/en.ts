/* Source dictionary. pl.ts is typed against it, so a missing or
   misspelled key fails typecheck rather than rendering "undefined". */

const en = {
  meta: {
    siteName: "Kleczewsky",
    tagline: "Senior Full-Stack Developer",
    description:
      "Eryk Kleczewski: senior full-stack developer and tech lead. I build and run production Laravel and React systems, from healthcare platforms to a SaaS product carrying 200k monthly users. Available for contract work and full-time roles.",
  },
  nav: {
    about: "About",
    work: "Work",
    lab: "Lab",
    contact: "Contact",
    languageLabel: "Language",
    skipToContent: "Skip to content",
    menu: "Menu",
    close: "Close",
  },
  chapter: {
    home: "Index",
    about: "About",
    work: "Work",
    lab: "Lab",
    contact: "Contact",
    system: "System",
  },
  status: {
    available: "Available for work",
    availableLong: "Open to contracts and full-time roles",
    location: "Europe · Remote",
  },
  home: {
    role: "Full-stack engineer",
    stack: "Laravel · Livewire · Filament · React · WebGL",
    intro:
      "I build production software and I stay with it after launch: a booking platform used by hundreds of restaurants, a healthcare service for a national retail chain, and a SaaS product carrying 200k monthly users.",
    toWork: "See the work",
    toContact: "Start a project",
    scroll: "Scroll",
    more: "More",
  },
  hire: {
    mark: "Hire me for",
    /** Goes on every service card's meta row, next to its number. */
    kind: "Service",
    lead: "Three things I get asked for most. Fixed scope or ongoing, both work.",
    items: [
      {
        title: "Production Laravel systems",
        body: "Booking flows, payments, admin panels somebody uses for eight hours a day. Laravel with Livewire and FilamentPHP, on clean architecture, built to be handed over and maintained.",
        tags: ["Laravel", "Livewire", "Filament", "MySQL"],
      },
      {
        title: "Front-ends that have to behave",
        body: "React interfaces, embeddable widgets that render correctly inside a stranger's stylesheet, and WebGL where the interface actually earns it.",
        tags: ["React", "TypeScript", "WebGL", "Vite"],
      },
      {
        title: "Taking over a system that already exists",
        body: "Inheriting a codebase and making it stable: clearing years of technical debt, cutting a core flow's load time by 80%, and putting error reporting in before the first incident rather than after it.",
        tags: ["Queues", "Integrations", "Observability"],
      },
    ],
  },
  hud: {
    tier: "Tier",
    override: "override",
    localTime: "Local",
    status: "Status",
  },
  boot: {
    /** One is picked at random per load. Keep the count in step with index.html. */
    titles: [
      "Midnight run",
      "Showtime",
      "Systems up",
      "Hello, stranger",
      "Hold tight...",
      "200 OK",
    ],
    /** What is in progress once each milestone has been reached. */
    stages: {
      start: "Probing device",
      tier: "Fetching scene",
      chunk: "Building city",
      link: "Linking shaders",
      compiled: "Drawing first frame",
      ready: "Ready",
      lost: "Scene unavailable",
    },
    skip: "Press any key to skip",
    skipTouch: "Tap to skip",
  },
  work: {
    lead: "Products that are live, carrying real traffic, and still being changed.",
    live: "Live",
    offline: "Offline",
    visit: "Visit site",
    role: "Role",
    client: "Client",
    year: "Year",
    stack: "Stack",
    previous: "Previous project",
    next: "Next project",
  },

  /* Definitions, not a logo wall: what each tool is actually used
       for. */
  stack: {
    mark: "What I work with",
    lead: "The tools I reach for first, and what I actually use each of them for.",
    items: [
      {
        term: "Laravel",
        desc: "Most of what I ship. Queues, scheduled work, and the admin somebody uses all day.",
      },
      {
        term: "Livewire · Filament",
        desc: "Interactive panels without a second codebase to keep in sync.",
      },
      {
        term: "React · TypeScript",
        desc: "For interfaces with real client state, and for anything embedded in a page I do not own.",
      },
      {
        term: "WebGL · three.js",
        desc: "Where the interface earns it. This page is the example.",
      },
    ],
  },
  about: {
    lead: "I turn complex business requirements into scalable, high-performing products: from healthcare platforms for a national retail brand to a SaaS system carrying 200k monthly users.",
    dossier: "Profile",
    baseLabel: "Base",
    stackLabel: "Stack",
    statusLabel: "Status",
    body: [
      {
        mark: "Stack",
        text: "Most of what I build is PHP and Laravel, with FilamentPHP and clean architecture underneath. On the frontend I adapt to what the project needs: React, or Laravel's own Blade and Livewire.",
      },
      {
        mark: "Constraints",
        text: "I like problems where the constraint is real. A booking widget that has to render correctly inside a stranger's stylesheet. A directory of several hundred entries where the whole product is whether someone can find the right one. A payment flow where the failure mode is somebody's medication.",
      },
      {
        mark: "Outcomes",
        text: "I focus on measurable outcomes: I've cut load times by 80% on a core booking flow, cleared out years of legacy technical debt, and taken features from the first sketch through to production. I read the docs, write the tests for the paths that carry money, and put error reporting in before the first incident rather than after it.",
      },
    ],
    figures: [
      { kicker: "Scale", value: "200K", label: "Monthly users on the SaaS platform I work on." },
      { kicker: "Speed", value: "80%", label: "Cut from a core booking flow's load time." },
      {
        kicker: "Triage",
        value: "15 min",
        label: "To clear a problem that had blocked a team for weeks.",
      },
    ],
    nowHeading: "Now",
    now: "Driving backend architecture and performance work on a high-traffic SaaS platform (150k to 200k monthly users) as a senior full-stack developer.",
  },
  lab: {
    lead: "Small self-contained experiments: canvas, shaders, motion. Each one runs live and ships its source.",
    pending: "First drops land shortly.",
  },
  contact: {
    lead: "Open to contract work and full-time roles. The fastest way to reach me is email.",
    emailLabel: "Email",
    elsewhere: "Elsewhere",
    responseNote: "I reply within a day or two.",
  },
  language: {
    switchTo: "Zobacz po polsku",
    dismiss: "Dismiss",
  },
  notFound: {
    code: "404",
    title: "No signal",
    body: "That page is not here. Try the work index or head back to the start.",
    home: "Back to the start",
  },
};

export default en;
export type Dict = typeof en;
