# Agent guide

## Project and layout

This is a demo telecom administration portal: Next.js 16 App Router, React 19, TypeScript,
Tailwind CSS 4 and shadcn/ui, backed by Spring Boot 4, Java 21 and SQLite.

- `app/`: dashboard, customer, plan, device, usage and ticket routes.
- `components/`: shared React components; `components/ui/` contains UI primitives.
- `hooks/`: client-side data fetching and state; `lib/api.ts` contains shared HTTP helpers.
- `backend/src/main/java/com/example/telecom/`: controllers, JPA models, repositories and config.
- `backend/src/main/resources/application.yaml`: local database configuration.
- `__tests__/`: Vitest tests and setup; `backend/src/test/`: JUnit/Spring tests and fixtures.
- `e2e/`: Playwright browser/API tests; `scripts/`: Python seeder and its regression tests.
- `.github/workflows/ci.yml`: source of truth for CI checks.

## Setup and local development

Run commands from the repository root unless noted.

- Use Node.js 22+, pnpm **10.33.4** (pinned in `package.json`), Python 3 and **JDK 21**.
  Set `JAVA_HOME` to the JDK and put its `bin` on `PATH`. Use the checked-in Gradle wrapper,
  not a separately installed Gradle.
- Install JavaScript dependencies with `pnpm install --frozen-lockfile`.
- For database setup or seeder tests, first create and activate a Python environment:

  ```bash
  python3 -m venv .venv
  source .venv/bin/activate
  python3 -m pip install -r scripts/requirements.txt
  ```

- On a fresh/disposable database, run `pnpm setup:db`. `pnpm bootstrap` combines dependency
  installation and seeding. **Both replace existing demo data**, as does `pnpm reset:db`,
  which also deletes `backend/app.db`. Get approval before replacing an existing database.
  Keep the Python environment active for these commands.
- Start both services with `pnpm dev`, or separately with `pnpm dev:frontend` and
  `pnpm dev:backend`. Frontend: `http://localhost:3000`; backend: `http://localhost:8080`.
  Next.js rewrites `/api/*` to the backend; `BACKEND_URL` overrides the default backend URL.
- Backend health: `http://localhost:8080/api/health`; API docs:
  `http://localhost:8080/swagger-ui.html`.

## Build and verification

| Purpose                                             | Command                                                        |
| --------------------------------------------------- | -------------------------------------------------------------- |
| Frontend build                                      | `pnpm build`                                                   |
| Backend build (includes Gradle checks)              | `pnpm build:backend`                                           |
| Frontend lint and TypeScript check                  | `pnpm lint`                                                    |
| Backend static analysis (SpotBugs and PMD)          | `pnpm lint:backend`                                            |
| Formatting check (Prettier and Java Spotless)       | `pnpm format:check`                                            |
| Frontend tests                                      | `pnpm test:frontend`                                           |
| Backend tests                                       | `pnpm test:backend`                                            |
| Both test suites                                    | `pnpm test`                                                    |
| Coverage                                            | `pnpm test:frontend:coverage` and `pnpm test:backend:coverage` |
| Seeder regression tests (Python environment active) | `python3 -m unittest discover -s scripts`                      |
| Browser/API tests                                   | `pnpm test:e2e`                                                |

- For focused tests: `pnpm exec vitest run __tests__/path/to/file.test.tsx`, or
  `cd backend && ./gradlew test --tests 'com.example.telecom.controller.CustomerControllerTest'`.
  Replace the frontend path with the actual test file.
- Before E2E tests, install Chromium with `pnpm exec playwright install chromium` and seed
  a disposable local database. Playwright starts both dev servers and reuses running servers
  outside CI. Its tests can mutate data, so never point it at a database you need to preserve.
  See `playwright.config.ts` for `FRONTEND_URL` / `BACKEND_URL` and server settings.
- Add regression tests for behavior changes. Run the relevant focused tests, lint, formatting
  and builds for the area changed; run both suites and E2E for cross-stack behavior.
  For documentation-only changes, check the changed Markdown with
  `pnpm exec prettier --check AGENTS.md` (substitute other changed paths as needed).
- CI checks frontend formatting/lint/coverage/build, backend formatting/lint/coverage/build,
  and E2E. Note that `pnpm format:check` also needs Java, even for the frontend CI job.
  Report which checks ran and any failures or environment blockers; do not hide failures.

## Editing conventions

- Use strict TypeScript and the `@/` root import alias. Follow Prettier: two-space indentation,
  double quotes, no semicolons. Format Java with Spotless using `pnpm format:backend`.
  Avoid repository-wide formatting changes unrelated to the task.
- Keep page data fetching in hooks or server components. ESLint forbids importing `useEffect`
  in `app/` and disallows native `alert`, `confirm` and `prompt`; use the existing dialogs.
- Reuse `requireOk` and `fetchCollection` in `lib/api.ts`. Preserve the existing API contract:
  collection responses are arrays with `X-Has-Next` / `X-Total-Count` pagination headers.
  Check existing hooks and controllers for field naming: response fields can be snake_case
  while mutation payloads are camelCase.
- Preserve SQLite foreign-key enforcement and UTC timestamp handling. Update tests when changing
  persistence; backend tests normally use an isolated in-memory database. Startup migrates legacy
  timestamps, so back up an existing database before running a changed backend against it.
- Do not hand-edit generated `.next/`, `next-env.d.ts`, `*.tsbuildinfo`, `backend/build/`,
  coverage or test reports. Regenerate through the build/test commands. Keep lockfile changes
  tied to intentional dependency changes, and do not commit `.venv/`, local databases or secrets.

## Safety and delivery

- Demo use only: the API is unauthenticated. Use generated data, never real customer data,
  and do not expose the app to the public internet. See `README.md` and `SECURITY.md`.
- Preserve unrelated local changes. Keep patches focused and update documentation when commands
  or behavior change.
- Husky runs lint-staged on commit and enforces Conventional Commit subjects such as
  `docs: add agent instructions` or `fix(api): validate plan assignment`. Do not bypass hooks.
- In the PR, summarize the change, list validation results and disclose checks not run.
