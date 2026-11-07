<p align="center"><img src="design/logo/kanbot-logo.png" alt="Kanbot" width="300"></p>

# Kanbot

**A personal sprint board with an AI teammate.** Kanbot brings a project backlog,
agile sprint planning, a four-column Kanban board, and an AI assistant into one
responsive productivity app.

## Features

- **Projects and authentication:** register, sign in, create projects, and switch
  between them.
- **Backlog:** create and organize todos, edit task details, set priority,
  story points, labels, and due dates, and plan work into sprints.
- **Sprint planning and tracking:** create and start sprints, monitor progress,
  review sprint history and velocity, and complete sprints.
- **Kanban board:** move active sprint tasks through **To Do**, **In Progress**,
  **In Review**, and **Done**.
- **My Week:** review overdue and upcoming tasks for the current week.
- **AI assistant:** generate todos, plan sprints, improve task descriptions,
  estimate story points, summarize sprints, and ask project-related questions.
  The backend includes a mock mode that works without an AI provider.
- **Productivity extras:** light and dark themes, responsive navigation,
  keyboard shortcuts, undo for supported actions, exports, and installable
  frontend assets.

Kanbot is designed for an individual. Team collaboration, sharing, and task
assignees are not part of the current product.

## Tech stack

| Area | Technologies |
|---|---|
| Frontend | React, TypeScript (strict), Vite, Tailwind CSS |
| Routing and server state | React Router, TanStack Query |
| Forms and validation | React Hook Form, Zod |
| Drag and drop | dnd-kit |
| Backend | Express 5, TypeScript, Zod |
| Persistence and authentication | JSON-file storage, JWT |
| AI integration | Built-in mock assistant or an OpenAI-compatible API |

## Requirements

- Node.js 20 or newer
- npm

The client and server are separate npm projects; install dependencies in each
directory.

## Run locally

Open two terminals from the repository root.

### 1. Start the API

```bash
cd server
npm install
```

Create a local `server/.env` using `server/.env.example` as a reference. Before
using it, make sure `AI_API_KEY` is empty to use the built-in mock assistant, or
replace it with your own provider key. Set a private, long random `JWT_SECRET`.
Never commit `.env` files or API keys, and do not copy credentials belonging to
someone else.

```bash
npm run seed
npm run dev
```

The API is available at `http://localhost:4000/api`; its health endpoint is
`http://localhost:4000/api/health`.

> **Warning:** `npm run seed` resets the local development database and inserts
> demo data. Do not run it if you need to preserve the data in `server/data`.

### 2. Start the frontend

```bash
cd client
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://localhost:5173`).
The client uses `http://localhost:4000/api` by default. To use a different API
URL, define `VITE_API_URL` in the client environment, for example:

```dotenv
VITE_API_URL=http://localhost:4000/api
```

For local development, the seeded demo account is `demo@kanbot.dev` with
password `password123`.

## Useful commands

Run these commands from the corresponding `client` or `server` directory.

| Project | Command | Purpose |
|---|---|---|
| Client | `npm run build` | Type-check and create the production build |
| Client | `npm run lint` | Run ESLint |
| Client | `npm test` | Run unit tests |
| Client | `npm run test:e2e` | Run Playwright end-to-end tests |
| Client | `npm run storybook` | Start the Storybook workbench |
| Client | `npm run preview` | Preview the production build |
| Server | `npm run build` | Compile the API |
| Server | `npm run typecheck` | Type-check without emitting files |
| Server | `npm run smoke` | Run API smoke tests against temporary data |
| Server | `npm run seed` | Reset and populate the development database |

Playwright may require installing its configured browser before the first
end-to-end test run.

## Repository structure

```text
client/                 React application
  src/api/              Typed API client and endpoint functions
  src/features/         Auth, projects, backlog, board, sprints, and AI
  src/shared/           Reusable UI components and utilities
server/                 Express API
  src/routes/           HTTP endpoints and request validation
  src/services/         Application and domain logic
  src/ai/               AI provider integration and mock assistant
  data/                 Local JSON database
docs/                   Product requirements and implementation/API plan
design/                 Logo and low-fidelity wireframes
```

## Pages

| Route | Purpose |
|---|---|
| `/login`, `/register` | Account access |
| `/projects` | Project list and project management |
| `/projects/:projectId/backlog` | Backlog and sprint planning |
| `/projects/:projectId/board` | Active sprint Kanban board |
| `/projects/:projectId/week` | Weekly task overview |
| `/projects/:projectId/sprints` | Sprint history and details |

## Documentation

- [Product requirements (English)](docs/REQUIREMENTS.en.md)
- [متطلبات المنتج (العربية)](docs/REQUIREMENTS.ar.md)
- [Implementation plan and API design (English)](docs/IMPLEMENTATION-PLAN.en.md)
- [خطة التنفيذ وتصميم API (العربية)](docs/IMPLEMENTATION-PLAN.ar.md)
- [Frontend documentation](client/README.md)
- [Backend documentation](server/README.md)

The API contract is defined in [`server/src/types/api.ts`](server/src/types/api.ts).
