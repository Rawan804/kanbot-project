# Kanbot — Frontend (client)

Kanbot is a personal project-management app: projects, a backlog, agile sprints, a
Kanban board, and an AI assistant. This package is the **frontend only**; the
Express backend lives in `../server` and is not modified here.

## Tech stack (and why)

| Concern | Choice | Reason |
|---|---|---|
| Framework | React 19 + TypeScript (strict) + Vite | Project default. |
| Routing | React Router v7 | Installed; one layout route for private pages. |
| Server state | TanStack Query v5 | Caching, loading/error states, invalidation. Server data lives **only** here. |
| Forms | React Hook Form + Zod (`@hookform/resolvers`) | Required for project forms; the auth feature keeps its own `useZodForm` hook. |
| Client UI state | React `useState` (component-local) | Only UI-only state (dialog/drawer open) — never a copy of server data. |
| Auth | Zustand store (`features/auth`) | Existing; reused as-is. |
| Styling | Tailwind CSS 3.4 | Utility classes with the design tokens below. |
| Icons | Inline SVG components (`shared/components/icons.tsx`) | No icon library is installed; shipping a small set avoids a dependency. |

> TypeScript is configured with `verbatimModuleSyntax` (type-only imports use
> `import type`) and `erasableSyntaxOnly` (no `enum` — plain `const` objects +
> union types are used instead).

## Scripts

```bash
npm run dev             # Vite dev server (run manually)
npm run build           # tsc -b (type-check) && vite build
npm run lint            # eslint
npm test                # Vitest unit tests
npm run test:e2e        # Playwright browser tests
npm run storybook       # Storybook component workbench
npm run build-storybook # Build the Storybook site
npm run preview         # Preview the production build
```

The API base URL comes from `VITE_API_URL` (defaults to `http://localhost:4000/api`).

## Folder structure

```
src/
├── main.tsx, app/           # providers, routing, protected shell and global navigation
├── api/                     # typed API client and endpoint functions
├── features/
│   ├── auth/                # login, registration and session state
│   ├── projects/            # project list, forms, cards and query hooks
│   ├── backlog/             # todo list, inline editing, filters, bulk actions and DnD
│   ├── board/               # active-sprint Kanban board
│   ├── sprints/             # lifecycle, templates, history, exports and charts
│   └── ai/                  # todo generation, sprint planning and suggestions
├── shared/                  # reusable components, icons and styling utilities
└── types/                   # API contract types
```

## Routing

| Path | Page | Guard |
|---|---|---|
| `/login`, `/register` | Login / Register | guest only |
| `/` | → redirect to `/projects` | private |
| `/projects` | Projects list | private |
| `/projects/:projectId` | → redirect to its backlog | private |
| `/projects/:projectId/backlog` | Project backlog, todo management and sprint planning | private |
| `/projects/:projectId/week` | Due and overdue todos for the current week | private |
| `/projects/:projectId/board` | Active sprint Kanban board | private |
| `/projects/:projectId/sprints` | Sprint history and details | private |
| `*` | 404 | n/a |

Private pages share one layout: `ProtectedRoute → AppShell (Sidebar + Topbar + Outlet + AIDrawer)`.
The **selected project is derived from the URL** (`useParams`), never stored
separately — so reloading a project URL keeps the selection, and switching
projects just navigates (which updates the URL).

## Product features

- Backlog and sprint tasks support drag-and-drop, inline title/point editing,
  label and due-date indicators, label filtering, and multi-select bulk actions.
- "My Week" surfaces overdue and current-week tasks. Task moves and queued
  deletions can be undone during the undo window.
- Sprint history includes velocity and active-sprint burndown charts, CSV and
  Markdown exports, and built-in duration/capacity planning templates.
- Keyboard shortcuts include `Ctrl/Cmd+K` for the command palette, `?` for
  shortcut help, `C` to create a task, `/` to focus backlog search, and `G`
  then `B` to open the board. A mobile bottom navigation is available on small
  screens.
- AI tools include todo generation, sprint planning, todo improvement and
  story-point estimation prompts, contextual suggestions, daily stand-up
  prompting, and a simulated response typewriter. Suggestions are reviewable
  before saving.
- A service worker precaches static app assets for installability and offline
  loading. Server-backed actions still require a network connection; API
  responses are not runtime-cached.

Theme preference and up to 30 chat messages per project are stored in browser
`localStorage`; chat history is device-local and is not synchronized to the
backend or other devices.

## Frontend quality checks

- Unit tests use Vitest and Testing Library.
- Playwright E2E tests use mocked API responses and do not require a live
  backend. Install the configured Chromium browser before running them.
- Storybook provides an isolated component workbench and builds separately
  from the production app.
- The app includes a React error boundary and PWA/offline status UI.

Deployment is intentionally a separate optional step; it requires deployment
accounts and environment configuration and is not performed by these scripts.

## API endpoints used

- `GET /projects` → `{ projects: ProjectWithStats[] }`
- `POST /projects` → 201 `{ project }` (409 on duplicate key, with `details[].path === 'key'`)
- `GET /projects/:id` → `{ project }`
- `PATCH /projects/:id` → `{ project }` (409 on duplicate key)
- `DELETE /projects/:id` → 204 (also deletes its todos + sprints)
- Todo create/edit/delete/move, sprint lifecycle, board, chat, generation,
  sprint planning and summaries use the typed functions in `src/api/`.

TanStack Query owns server state. Mutations invalidate the affected project,
todo, sprint and board queries; todo drag-and-drop uses optimistic list updates.

## Design system

The palette is centralized in `tailwind.config.js` under `kanbot.*` tokens.
Sidebar colors use theme-aware CSS variables in `src/index.css`, so its
background, text, borders, active state, and accents adapt to light and dark
mode through the same `kanbot-sidebar-*` tokens.

### Colour

| Token | Value | Used for |
|---|---|---|
| `kanbot.background` | `#F3F6FB` | Cool off-white app background |
| `kanbot.surface` | `#FFFFFF` | Cards and dialogs |
| `kanbot.sidebar` | `#FFFFFF` | Workspace navigation surface |
| `kanbot.text` / `kanbot.muted` | `#142746` / `#52627A` | Primary and secondary text |
| `kanbot.primary` / `kanbot.primary-soft` | `#1D4ED8` / `#E6F0FF` | Actions, focus states and active emphasis |
| `kanbot.sage` / `kanbot.sage-soft` | `#1D7A4D` / `#E6F5EC` | Active sprint and positive states |
| `kanbot.border` | `#D2DCE9` | Borders and dividers |
| Danger | Tailwind `red-700` on soft red surfaces | Destructive actions and errors |

Dark mode uses `#101827` background, `#182438` surfaces, `#141F30` sidebar,
`#E6EDF7` primary text, `#9AA9BD` secondary text, `#2B3A50` borders, and
`#5794F7` primary actions. Kanban columns use subtle blue, purple, orange, and
green status tints.

States never rely on colour alone: the active nav item gets a left accent **bar**
plus a tint; the delete control uses a trash **icon** + `aria-label`; the active
sprint shows a dot **and** the text "Active:".

### Typography & spacing

- Inter with a system UI fallback. Headings: `font-bold tracking-tight`.
- Radii: `rounded-lg` for inputs/buttons, `rounded-2xl` for cards/dialogs, `rounded-xl` for panels.
- Spacing scale follows Tailwind (4px base). Touch targets are ≥ 44px (`min-h-[44px]` / `h-9`+ icons).
- Shadows are subtle (`shadow-sm`, `hover:shadow-md`); transitions are 150ms.
- Focus uses the centralized primary token and a visible ring.

### Responsiveness

- ≥ 1024px: fixed 16rem (`w-64`) sidebar; main content offset by `lg:pl-64` and capped at `max-w-6xl`.
- < 1024px (tablet/mobile): the sidebar becomes a slide-in drawer with a scrim,
  opened from the Topbar hamburger; choosing a destination closes it.
- Dialogs are bottom-sheets on mobile and centred cards on ≥ 640px; both cap at
  ~92vh. The AI drawer is full-width on mobile and `max-w-lg` on larger screens.

### Accessibility

- Semantic landmarks (`aside`, `nav`, `header`, `main`, `article`) and real headings.
- Modals/drawer: portal + `role="dialog" aria-modal`, Escape to close, click-scrim
  to close, focus trap, and focus restored to the trigger on close.
- Scroll areas inside overlays carry `data-lenis-prevent` so smooth-scroll
  doesn't hijack them.
- Icon-only buttons have `aria-label`s; form fields use `label` + `aria-invalid` +
  `aria-describedby` for errors/hints.

## Notes

- **Page-level actions live in the page header**, not the Topbar. The Topbar holds
  global actions (Ask AI) and the page title/breadcrumb; per-page actions (e.g. the
  "New project" button) sit with their page. This keeps the Topbar route-agnostic
  and avoids an action-injection context (less abstraction).
- A project may have at most one active sprint. If the frontend receives
  inconsistent sprint data, it reports the conflict instead of choosing one or
  modifying sprint records.
- All productivity, AI and PWA enhancements are frontend-only and reuse the
  existing API contract; no backend changes are required.
