# kleczewsky.com

My corner of the internet: a little about me, the things I build, and a night
city with room for a fireworks show.

[Visit kleczewsky.com](https://kleczewsky.com)

Built with Vite, React, TypeScript, and three.js. The pages are prerendered to
static HTML and hosted on GitHub Pages, with English and Polish versions.

## Take a look around

- **Home** introduces me, my work, and the kinds of projects I can help with.
- **Lab** is a collection of interactive experiments and small games. Have a play.
- **Connect** helps people and their agents prepare an introduction.
- **Design system** is a behind-the-scenes look at the site's colours, type, and components.

## The look and feel

A city at night, seen through the windows of a high floor. Blue skies, warm
windows, and red accents tie the scene and interface together. Chamfered panels,
small diagrams, and dotted lines carry that feeling through the rest of the site.

Colours, typography, and spacing live in [src/styles/tokens.css](src/styles/tokens.css).
The `/system` page shows them in use.

## Running locally

You'll need Node.js and npm. The deployment workflow uses Node.js 24.
From the project folder:

```sh
npm ci
npm run dev         # start the development server
```

Open the local URL printed in the terminal. For a preview of the production build:

```sh
npm run build       # build and prerender the site
npm run preview     # preview the finished build
```

`npm run typecheck` checks TypeScript, `npm run lint` checks the code, and
`npm run format:check` checks formatting.

## Exploring the code

If you're curious about how something works, here are a few starting points:

| What you're looking for                            | Where to find it                                                                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page layouts                                       | [src/pages](src/pages), including Home, Connect, Lab, the design system, and the 404 page                                                                           |
| The city and fireworks                             | [src/three](src/three); individual scene elements live in `scene/`, and `knobs.ts` holds the adjustable settings                                                    |
| Lab experiments and games                          | [src/lab](src/lab), with the page and controls in `src/pages/Lab.tsx`                                                                                               |
| Navigation, frame, and other shared UI             | [src/components](src/components)                                                                                                                                    |
| Projects, contact details, and agent context       | [src/content](src/content)                                                                                                                                          |
| Colours, typography, and shared styles             | [src/styles](src/styles); pages and components also have their own CSS files                                                                                        |
| English and Polish text                            | [src/i18n](src/i18n) for the main copy; Connect uses `src/content/connect-copy.ts`, Lab uses `src/lab/copy.ts`, and project summaries live in `src/content/work.ts` |
| Language handling, loading, and graphics support   | [src/lib](src/lib)                                                                                                                                                  |
| Routes and page assembly                           | [src/routes.ts](src/routes.ts), [src/App.tsx](src/App.tsx), and [src/entry-server.tsx](src/entry-server.tsx)                                                        |
| Icons, project marks, and the social preview image | [public](public)                                                                                                                                                    |
| Static page generation                             | [scripts/prerender.mjs](scripts/prerender.mjs)                                                                                                                      |
| GitHub Pages deployment                            | [.github/workflows/deploy.yml](.github/workflows/deploy.yml)                                                                                                        |

## Human friendly, agent ready

The `/connect` page offers another way to say hello. Visitors can prepare an
email about contract, full-time, or freelance work, or copy a brief into their
agent to explore my experience and help write an introduction.

Agents can also read `/profile.json`, `/agents.md`, and `/llms.txt` directly.
These files draw on the English portfolio content, including project descriptions
and the compact skills list. Email drafts open in the
visitor's email app for them to review and send.

This all works on GitHub Pages. There isn't an MCP server or email-sending backend
behind it; agents read the public files and use their own tools to help with a draft.

## Keeping my profile up to date

A small checklist for future me, for the next time I learn something new, ship a
project, or change what I'm looking for.

<details>
<summary>Open the profile update checklist</summary>

- [ ] **About me and my skills:** update [English](src/i18n/en.ts) and
      [Polish](src/i18n/pl.ts) together. The table below is a guide to the relevant keys.
- [ ] **Projects:** add or refresh the summaries, results, status, and links in
      [src/content/work.ts](src/content/work.ts). Each project has both languages.
- [ ] **Contact:** keep the email address and profile links in
      [src/content/links.ts](src/content/links.ts) current.
- [ ] **Ways to work together:** check the opportunity types, email drafts, and
      agent instructions in [src/content/agents.ts](src/content/agents.ts), plus
      both languages in [src/content/connect-copy.ts](src/content/connect-copy.ts).
      The availability sentence in the agent instructions needs a manual update too.
- [ ] **Link preview:** take a look at [public/og.png](public/og.png) if my title
      or positioning changes. It's a static image.

| What I'm updating                          | Keys in both language files                                       |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Professional title and search descriptions | `meta.tagline`, `meta.description`                                |
| Introduction and compact skills list       | `home.role`, `home.intro`, `home.stack`                           |
| About me and how I work                    | `about.lead`, `about.body`                                        |
| Results and numbers                        | `about.figures`; check the introduction and project summaries too |
| What I'm working on now                    | `about.nowHeading`, `about.now`                                   |
| Services and their technologies            | `hire.lead`, `hire.items`                                         |
| Detailed skills                            | `stack.lead`, `stack.items`                                       |
| Availability and location                  | `status.available`, `status.availableLong`, `status.location`     |
| Contact invitation and reply time          | `contact.lead`, `contact.responseNote`                            |

`home.role` is currently unused, and the “Now” block in `Home.tsx` is commented
out. Check that copy before bringing it back into the page.

### What updates automatically?

[src/content/agents.ts](src/content/agents.ts) builds the public context files:

| File            | Where its content comes from                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/profile.json` | English title, introduction, compact skills list, availability, services, project summaries, and contact details |
| `/agents.md`    | English title and location, plus the contact instructions written in `machineFiles`                              |
| `/llms.txt`     | English search description and links to the available context                                                    |

The longer About and skills sections aren't included in the agent profile yet.
For a new skill or achievement to appear there, add it to the compact skills
list, introduction, services, or a project summary, or extend `machineFiles`.

Page titles and descriptions are assembled by
[src/entry-server.tsx](src/entry-server.tsx), using the language files and
connection-page copy. [scripts/prerender.mjs](scripts/prerender.mjs) writes the
finished pages. Running `npm run build` refreshes these outputs; edits belong in
the source files rather than `dist` or `dist-server`.

Before publishing, run `npm run typecheck` and `npm run build`, then have a quick
look through both languages of the homepage and connection page. Read the three
context files too, especially after changing availability. One last look at the
live site after publishing helps catch anything that didn't make it through.

</details>

## Behind the windows

The city loads separately from the page, and simpler devices can skip the 3D
scene. In development, press the backtick key to open the scene controls and play
with the sky, lighting, and effects. The copy button exports the settings;
[src/three/knobs.ts](src/three/knobs.ts) holds the saved defaults.
