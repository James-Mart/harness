# Harness UI

Standalone Vite + React + TypeScript app for editing and simulating agent harnesses. The editor renders harnesses as a node graph, lets you edit structure in **Edit** mode, and plays deterministic mock runs in **Run** mode.

## Quick start

From a clean checkout:

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/`). The **Tracker** harness loads by default.

1. Click **Run** in the toolbar (below the header).
2. Click **Step** repeatedly. Items move through the graph; keep going until the status reads **fixpoint**.
3. Optionally click **Eunomio** in the header toggle, then **Run** → **Step** again to simulate the other seeded harness.

That path is enough to install, start the app, and complete a simulated run.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer (see `engines` in `package.json`)
- npm (bundled with Node)

## Switch harnesses

Use the **Tracker** | **Eunomio** toggle in the header:

| Seed        | What you see                                          |
| ----------- | ----------------------------------------------------- |
| **Tracker** | Issue-tracker work loop (epic → branch → commit flow) |
| **Eunomio** | PR-review harness (partition → planner → accept flow) |

Each seed has a matching simulation script. Switching harnesses resets the editor to that seed's graph.

## Run a simulation

1. Pick **Tracker** or **Eunomio** with the header toggle.
2. Click **Run**. The canvas locks for editing; a run overlay appears.
3. Click **Step** to advance one simulation tick. Items move with staggered timing; work-pool containers show ready / in-flight / done counts.
4. Adjust **Speed** (0.5×–8×) to change how fast transitions animate.
5. Click **Reset** to restart from the harness snapshot taken when you entered Run mode.
6. Click **Edit** to leave Run mode and edit again.

Keep stepping until the status reads **fixpoint**.

## Other commands

| Command           | Description                                  |
| ----------------- | -------------------------------------------- |
| `npm run build`   | Typecheck and build for production           |
| `npm run preview` | Preview the production build locally         |
| `npm run test`    | Run unit tests (Vitest) and e2e (Playwright) |
| `npm run lint`    | Run ESLint and Prettier check                |
| `npm run format`  | Format the tree with Prettier                |

## Appendix: dev-only demo harnesses

In development, `?seed=` loads a **demo** harness and hides the Tracker | Eunomio toggle (only when a demo override is set):

| URL query             | Harness                   | Mock simulation                                      |
| --------------------- | ------------------------- | ---------------------------------------------------- |
| `?seed=base`          | Minimal foreach loop      | Runnable script                                      |
| `?seed=workpool`      | Work-pool fan-out         | Runnable script                                      |
| `?seed=branching`     | Branching foreach         | Runnable script                                      |
| `?seed=wiring-cues`   | Advisory wiring cues      | Visualization only (empty script → instant fixpoint) |
| `?seed=workpool-cues` | Work-pool validation cues | Visualization only (empty script → instant fixpoint) |

Example: `http://localhost:5173/?seed=workpool`

Use the header toggle for Tracker and Eunomio; do not rely on `?seed=tracker` / `?seed=eunomio` for the runbook path (those only set the initial seed key and leave the toggle visible).
