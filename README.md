# TaskPulse — Annotation Console

A production-quality real-time task annotation dashboard built with **Next.js 14**, **Redux Toolkit**, **WebSockets**, and **Server-Sent Events (SSE)**. It demonstrates advanced front-end engineering patterns including stale-while-revalidate caching, data normalization at the API boundary, and streaming AI summaries.

---

## 📸 What is this project?

TaskPulse is an **Annotation Console** — a dashboard where users can view, filter, sort, and monitor annotation tasks in real time. Tasks are fetched from a REST API, kept live via WebSocket events, and each task can stream an AI-generated summary word-by-word using SSE.

Key engineering challenges this project solves:

- **Inconsistent backend data** — the mock server intentionally sends messy, non-uniform values (mixed-case enums, mixed timestamp formats, numeric-as-string fields). The app normalizes everything at the API boundary so the UI always sees clean typed domain models.
- **Real-time updates** — a WebSocket connection pushes live `task.updated`, `task.assigned`, and `annotation.created` events, which are merged into the Redux store without full re-fetches.
- **Offline-first UX** — IndexedDB (via `localforage`) caches the last fetched task list. On repeat visits, users see data instantly while the network revalidates in the background.

---

## 🗂️ Project Structure

```
TaskPulse/
├── frontend/          # Next.js 14 app (the UI)
│   ├── src/
│   │   ├── app/           # Next.js App Router pages & layout
│   │   ├── components/    # UI components (task list, filters, details, summary)
│   │   │   ├── common/        # Shared components (TaskTicker, StaleIndicator)
│   │   │   ├── filters/       # Filter bar (type, status, search, sort)
│   │   │   ├── task-lists/    # Paginated task list + task cards
│   │   │   ├── task-details/  # Task detail panel (shown on selection)
│   │   │   └── summary/       # SSE-streamed AI summary renderer
│   │   ├── features/
│   │   │   └── tasks/         # Redux slice, thunks, and selectors
│   │   ├── hooks/         # Custom hooks (useTaskFeed — WebSocket, useStreamSummary — SSE)
│   │   ├── lib/           # Pure logic: normalize.ts, cacheService.ts
│   │   ├── services/      # HTTP layer (taskService via Axios)
│   │   ├── store/         # Redux store configuration
│   │   ├── tests/         # Unit tests (normalize, selectors, TaskCard)
│   │   ├── types/         # TypeScript domain types (Task, RawTask, enums)
│   │   └── utils/         # Shared utilities
│   └── package.json
│
└── mock-server/       # Express + WebSocket mock API
    ├── src/
    │   ├── index.ts       # Server entry — REST, WebSocket, SSE
    │   └── data.ts        # Static mock task data & summaries
    └── package.json
```

---

## ⚙️ How It Works

### Data Flow

```
Mock Server (port 4000)
    │
    ├── GET /api/tasks?page=1&pageSize=10   → REST (JSON)
    ├── GET /api/tasks/:id/summary          → SSE (streaming text)
    └── ws://localhost:4000/ws             → WebSocket (live events)
         │
         ▼
Frontend (port 3000)
    │
    ├── taskService (Axios)         → HTTP fetches
    ├── normalize.ts                → Converts RawTask → Task
    ├── Redux Store (RTK)           → Single source of truth
    │   ├── taskSlice               → State + reducers
    │   ├── thunks.ts               → Async side effects
    │   └── selectors.ts            → Memoized derived state
    ├── useTaskFeed (WebSocket)     → Live patches into Redux
    ├── useStreamSummary (SSE)      → Word-by-word summary render
    └── localforage (IndexedDB)     → Stale-while-revalidate cache
```

### 1. Task Fetching & Normalization

When the page loads:
1. `initTasksFromCache` thunk loads the last saved tasks from **IndexedDB** instantly — users see data with zero network wait.
2. `fetchTasks` thunk fires an Axios request to `GET /api/tasks` and the response is passed through `normalize.ts`.
3. `normalize.ts` converts every `RawTask` into a typed `Task` domain model — handling mixed-case enums, numeric-as-string counts, and dual timestamp formats — so reducers and UI components never deal with raw backend quirks.
4. Tasks are stored in Redux using `createEntityAdapter` (normalized `{ ids[], entities{} }` shape) for O(1) lookups.
5. The fresh data is written back to IndexedDB as the new cache.

### 2. Real-Time WebSocket Updates

A persistent WebSocket connection (`ws://localhost:4000/ws`) is managed by the `useTaskFeed` hook:

| Event               | What happens                                           |
|---------------------|--------------------------------------------------------|
| `task.updated`      | Patches `status` + `updatedAt` on the existing entity |
| `task.assigned`     | Patches `assignee` on the existing entity              |
| `annotation.created`| Increments `annotationCount` by 1                     |

Events for unknown task IDs (tasks on other pages) are silently ignored. The hook reconnects automatically using **exponential backoff** (1s → 2s → 4s → max 30s).

### 3. Streaming AI Summaries (SSE)

When a user selects a task and requests its summary:
1. The `useStreamSummary` hook opens an `EventSource` to `GET /api/tasks/:id/summary`.
2. The server streams the summary 2 words at a time every 80ms, ending with a `[DONE]` sentinel.
3. The front-end accumulates the text and renders it through a safe markdown pipeline:

   ```
   react-markdown → remark-gfm → rehype-raw → rehype-sanitize
   ```

   `rehype-sanitize` prevents XSS — `<script>`, `onerror`, `javascript:` URIs, and all other dangerous HTML are stripped. `dangerouslySetInnerHTML` is never used.

### 4. Stale-While-Revalidate Cache

```
Page mount
 ├── Load from IndexedDB → show data instantly (isStale = true)
 └── Fetch from server   → update data (isStale = false)
```

A `StaleIndicator` badge appears while `isStale === true` so users know data may be slightly behind. Cache failures (e.g. private/incognito mode) are caught silently and the app falls back to server-only mode.

### 5. Client-Side Filtering & Sorting

The `selectFilteredSortedTasks` memoized selector applies filters on the Redux entity map:
- **Filter by type** (IMAGE, VIDEO, TEXT, UNKNOWN)
- **Filter by status** (TODO, IN_PROGRESS, DONE, QA, BLOCKED, UNKNOWN)
- **Search** by task title (case-insensitive substring match)
- **Sort** by `updatedAt` or `annotationCount` (ascending/descending)

Server-side pagination (`page`, `pageSize`) is applied first; client-side filters narrow down the fetched page.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** v9+

### 1. Start the Mock Server

```bash
cd mock-server
npm install
npm run dev
```

The server starts on `http://localhost:4000`.

Available endpoints:
- `GET /api/tasks?page=1&pageSize=10` — paginated task list
- `GET /api/tasks/:id/summary` — SSE streamed summary
- `ws://localhost:4000/ws` — WebSocket live events

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Tests

```bash
cd frontend
npm test
```

Tests cover:
- `normalize.test.ts` — all normalization edge cases (unknown types, mixed timestamps, non-numeric counts)
- `selectors.test.ts` — filter, sort, and search selector logic
- `TaskCard.test.tsx` — component rendering with React Testing Library

---

## 🛠️ Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| **Next.js 14** (App Router) | React framework & routing |
| **Redux Toolkit** | State management (`createEntityAdapter`, `createAsyncThunk`) |
| **React-Redux** | React bindings for Redux |
| **Axios** | HTTP client |
| **localforage** | IndexedDB wrapper for offline caching |
| **react-markdown** + **rehype-sanitize** | Safe markdown rendering for SSE summaries |
| **Tailwind CSS** | Utility-first styling |
| **TypeScript** | Full type safety |
| **Jest** + **React Testing Library** | Unit testing |

### Mock Server

| Technology | Purpose |
|---|---|
| **Express** | REST API server |
| **ws** | WebSocket server |
| **TypeScript** + **ts-node** | Typed server code |

---

## 📐 Architecture Decisions

See [`frontend/DECISIONS.md`](./frontend/DECISIONS.md) for a detailed breakdown of every major engineering decision, including:

1. **Normalization strategy** — why and how raw data is normalized at the API boundary
2. **Redux architecture** — why `createEntityAdapter`, how the state shape was designed
3. **WebSocket merge strategy** — how live events are applied as targeted patches
4. **SSE + Markdown pipeline** — why the rehype plugin order matters for XSS safety
5. **IndexedDB stale-while-revalidate** — the cache read/write flow
6. **Bug hunt** — 5 real React bugs found and fixed in `TaskTicker.tsx` (stale closures, memory leaks, reference vs value equality, empty dependency arrays, direct Redux mutation)

---

## 🐛 Known Limitations

- **Client-side filtering on server-paginated data** — filters apply only to the currently loaded page, not the full dataset. A production system would send filters as server-side query params.
- **No authentication** — the mock server has no auth layer.
- **No optimistic updates** — annotation count increments are applied immediately but not rolled back if a subsequent fetch shows a different value.
- **No error boundary** — a React Error Boundary would prevent full-app crashes on unexpected component errors.

---

## 📄 License

MIT
