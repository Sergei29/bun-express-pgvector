## Task title

- Refactor Server into Bun Workspace Monorepo with React/Vite/Tailwind Frontend
- We have an existing Bun.js + Express + Drizzle ORM backend operating with a `pgvector` PostgreSQL Docker container. We need to refactor this single-app repository into a structured Monorepo (Workspace) containing two distinct projects: the existing `backend` server and a new `frontend` React + Vite + Tailwind CSS client.
- Your task is to reorganize the folder structure, configure the top-level workspace files, initialize the client, and set up smooth local development workflows (including handling routing/proxies and CORS).

## Context

Read the document completely and for each step:

1. Determine if it depends on the output of another step, or if it's independent.
1. Group independent steps that could run in parallel via subagents.
1. Estimate whether the step is simple/mechanical (good fit for Haiku)
   or requires real reasoning/judgment (needs Sonnet or Opus).
   Present this as a plan before executing anything.

## Target Directory Structure:

```text
bun-express-books-club-pgvector-api/
├── package.json         # Root package.json managing workspaces
├── backend/             # Current existing Express app (moved here)
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
└── frontend/            # New React + Vite + Tailwind app (created here)
    ├── src/
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

## Steps

### Step 1: Reorganize the Repository & Root Workspace

Move all existing server-related files, folders (src, drizzle, etc.), configurations (tsconfig.json, drizzle.config.ts), and dependencies into a new subdirectory named /backend.

Create a brand new root-level package.json file at the exact root of the repository.

Configure Bun Workspaces: Set up the root package.json with the workspaces array referencing ["backend", "frontend"].

Add Orchestration Scripts: Implement scripts using the concurrently package so a developer can run bun run dev from the root to start both apps simultaneously.

```json
"scripts": {
  "dev:backend": "cd backend && bun dev",
  "dev:frontend": "cd frontend && bun dev",
  "dev": "bun x concurrently \"bun run dev:backend\" \"bun run dev:frontend\"",
  "check-all": "[ update script to run on both frontend and backend applications ]"
}
```

### Step 2: Initialize the Frontend Application

Scaffold a brand new React + TypeScript SPA application inside a directory named /frontend using Vite (bun create vite frontend --template react-ts).

Clean up any default boilerplate assets in the frontend that are unnecessary for a clean start.

### Step 3: Configure Tailwind CSS on the Client

Install tailwindcss, postcss, and autoprefixer as devDependencies inside the /frontend directory.

Generate and configure frontend/tailwind.config.js to watch files matching ./index.html and ./src//*.{js,ts,jsx,tsx}.

Update frontend/src/index.css to properly import the three foundational @tailwind directives.

### Step 4: Establish Backend CORS Compatibility

Update the Express initialization file inside /backend (e.g., src/index.ts or src/app.ts).

Install the cors npm package and its TypeScript types if not already present.

Wire up the CORS middleware globally to accept incoming traffic explicitly originating from the local Vite development server port (typically http://localhost:5173).

### Step 5: Configure Vite Dev Server Proxy

Modify frontend/vite.config.ts to implement a clean local development proxy.

Any request hitting the frontend dev server matching the /api route prefix should be automatically proxied directly to the backend Express server port (e.g., http://localhost:3000), stripping out absolute domain URLs in the React fetch codebase.

## Acceptance criteria

- Workspace Sync: Running bun install at the absolute root must seamlessly install all dependencies for both backend and frontend simultaneously using Bun's shared lockfile.
- Concurrent Startup: Running bun run dev from the root must boot up the Express server and the Vite dev pipeline side-by-side cleanly in the terminal.
- Connectivity: Ensure the frontend can execute a sample fetch('/api/books/search?q=...') request smoothly without triggering a browser CORS block or failing connection loops.
- all checks pass, the husky pre-commit checks run on both frontend and backend applications
