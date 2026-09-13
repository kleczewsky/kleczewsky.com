/** CV evidence for the public agent profile. Dates retain the supplied role overlaps. */
export const CV_SKILLS = {
  backend: ["PHP", "Laravel", "Livewire", "FilamentPHP", "MySQL", "Redis", "Laravel Horizon"],
  frontend: [
    "JavaScript",
    "Tailwind CSS",
    "Bootstrap",
    "SCSS",
    "HTML",
    "Responsive Web Design",
    "jQuery",
    "kepler.gl",
  ],
  workflow: ["Git", "PhpStorm", "Jira", "Confluence", "Scrum", "XDebug", "Figma", "Postman"],
  api_documentation: ["Swagger", "Scribe (Laravel)"],
  other: ["WordPress", "Mentoring", "Code Review"],
};

export const EXPERIENCE = [
  {
    employer: "Confidential",
    role: "Senior Full Stack Developer",
    start_date: "2025-09",
    end_date: null,
    project_ids: ["confidential-saas"],
    working_arrangement: "Remote",
    highlights: [
      "Develops a SaaS platform serving 100,000–200,000 monthly active users.",
      "Migrated the critical payment flow to event-driven architecture in Laravel and optimized ORM usage to remove performance bottlenecks.",
      "Eliminates legacy technical debt and owns features from requirements through deployment.",
      "Collaborates on the product roadmap to align architecture with user growth and availability needs.",
    ],
  },
  {
    employer: "Super-Pharm",
    role: "Laravel Tech Lead",
    start_date: "2025-01",
    end_date: "2025-08",
    working_arrangement: "Remote",
    project_ids: ["superpharm", "plusrecepta"],
    highlights: [
      "Provided technical analysis for digital health and internal tooling initiatives.",
      "Identified a simpler shipment-tracking implementation that removed blockers for an external development team.",
      "Mentored developers and conducted Git training to improve collaborative code management.",
    ],
  },
  {
    employer: "Super-Pharm",
    role: "Full Stack Developer",
    start_date: "2023-05",
    end_date: "2025-04",
    working_arrangement: "Remote",
    project_ids: ["plusrecepta", "superpharm"],
    highlights: [
      "Led PlusRecepta.pl development from concept to its public launch in January 2024.",
      "Advocated Livewire and FilamentPHP to accelerate delivery.",
      "Built internal tools for marketing automation, employee self service, and location discovery.",
      "Improved performance, stability, and usability across the healthcare platform and internal tools.",
    ],
  },
  {
    employer: "Zjedz.my",
    role: "Full Stack Developer",
    start_date: "2021-07",
    end_date: "2023-05",
    working_arrangement: "Hybrid",
    project_ids: ["zjedzmy"],
    highlights: [
      "Re-engineered booking availability search; the portfolio reports an over 80% reduction in the main search flow's load time.",
      "Built a canvas-based floor planner with drag-and-drop reservation management.",
      "Integrated Reserve with Google and Point-of-Sale systems.",
      "Contributed across the system architecture and worked directly with clients and users.",
    ],
  },
  {
    employer: "Freelance",
    role: "Web Developer and Consultant",
    start_date: "2021-01",
    end_date: "2021-08",
    working_arrangement: "Remote",
    highlights: [
      "Managed the full project lifecycle for web development and consulting clients.",
      "Used proof-of-concept and MVP strategies to align technical solutions with business goals.",
    ],
  },
];
