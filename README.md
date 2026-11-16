# Telecom Demo Admin Portal

A telecom user administration system built with Next.js and Spring Boot.

> **Demo use only:** This project uses generated sample data and an unauthenticated local API.
> Do not use real customer data or expose the application to the public internet.

## Features

- **Dashboard** - KPI cards and charts showing business metrics
- **Customer Management** - CRUD operations for subscriber accounts
- **Plan Management** - Service plan catalog (Basic, Standard, Premium, Unlimited, Family)
- **Device Inventory** - Track devices and SIM cards with assignment status
- **Usage Records** - View call, data, and SMS usage history
- **Support Tickets** - Customer service ticket management

## Tech Stack

**Frontend:**

- Next.js 16 with App Router
- React 19
- Tailwind CSS 4
- shadcn/ui components
- Recharts (via shadcn/ui)
- TypeScript

**Backend:**

- Spring Boot 4.0
- Java 21
- Gradle
- SQLite (auto-seeded with demo data)

## Getting Started

### Prerequisites

- Node.js 22+
- JDK 21 (the Gradle toolchain requires Java 21, not just a JRE)
- pnpm 10.33.4
- Python 3 (for database seeding)

### Managed runtime setup (recommended)

The repository's `mise.toml` installs Node 22, Eclipse Temurin JDK 21, and the
pnpm version used in CI. This works even when Java is not installed on the host.
Install [mise](https://mise.jdx.dev/getting-started.html), then run from the
repository root:

```bash
mise trust
mise install
mise exec -- pnpm install --frozen-lockfile
mise run test:smoke
```

The smoke check lists frontend tests without executing them, then executes
`InstantTextConverterTest` (three backend unit tests). It does not run the full
suite, start application servers, or require Python or a seeded database.
The first run needs network access to download runtimes, Gradle, and dependencies.

`mise run` and `mise exec --` set both `PATH` and `JAVA_HOME` for the selected JDK,
without requiring shell activation. Prefix the other commands below with
`mise exec --` when using this setup, for example `mise exec -- pnpm test:backend`.

If managing runtimes yourself, set `JAVA_HOME` to your JDK 21 directory (not its
`bin` directory), and add `$JAVA_HOME/bin` to `PATH`. On macOS, the JDK directory
is typically the installation's `Contents/Home`. Check `java -version` and
`javac -version` before running Gradle. If Gradle reports that `JAVA_HOME` is
unset or Java is missing, use the managed setup above or correct these variables.

### Setup

#### Dev Container (recommended)

Install Docker and the VS Code Dev Containers extension, then run
**Dev Containers: Reopen in Container** from the command palette. The container
provides Java 21, Node.js 22, pnpm 10.33.4 (matching `package.json`), Python 3.12,
and TypeScript, Java, Python, ESLint, and Prettier editor extensions.

The first creation installs the locked Node dependencies and the Python seeder
dependencies into `.devcontainer/.venv`. The Python environment is selected
automatically in container terminals, so no manual activation is needed.
The backend uses the checked-in Gradle wrapper.

In the container terminal, seed demo data when needed, then start both services:

```bash
pnpm setup:db
pnpm dev
```

Ports 3000 (frontend) and 8080 (backend) are forwarded to localhost. Keep forwarded
ports private, since the API is unauthenticated. Container creation and reopening
do not seed or reset the database; `pnpm setup:db` replaces existing demo data.
Rebuild the container after changing its toolchain configuration. Run
`bash .devcontainer/setup.sh` to reinstall dependencies without rebuilding.

#### Local setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
pnpm bootstrap    # Install deps + seed database with production-like data
```

Or install without seeding:

```bash
pnpm install
```

### Environment Variables

No credentials or external services are required for local development. All
environment variables below are optional; the app works with the listed defaults.
The committed [`.env.example`](.env.example) contains safe local values:

```bash
cp .env.example .env.local
```

Run this once from the repository root, without overwriting an existing local
configuration. Keep secrets out of `.env.example`; `.env.local` is git-ignored.

| Variable                | Default                 | Used by                                                                             |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------------- |
| `BACKEND_URL`           | `http://localhost:8080` | Next.js server-side `/api` proxy and Playwright API tests/backend readiness check   |
| `FRONTEND_URL`          | `http://localhost:3000` | Playwright browser target/frontend readiness check, not the frontend listening port |
| `PORT`                  | `3000`                  | Next.js listening port                                                              |
| `SERVER_PORT`           | `8080`                  | Spring Boot listening port                                                          |
| `SPRING_DATASOURCE_URL` | `jdbc:sqlite:app.db`    | Spring Boot datasource override; normally leave unset                               |

Use origins without `/api` or trailing slashes for `BACKEND_URL` and `FRONTEND_URL`.
For local port changes, keep `BACKEND_URL` in sync with `SERVER_PORT` and
`FRONTEND_URL` in sync with `PORT`. These URLs select targets; they do not change
server ports. The API has no authentication, so keep it local and use only demo data.

Next.js automatically loads `.env.local` for `BACKEND_URL`. Spring Boot and
Playwright do **not** load it automatically, and Next.js needs `PORT` in the shell
environment before startup. In a POSIX shell, export the file before running the
combined app or browser tests:

```bash
# From the repository root, after editing your trusted local configuration:
set -a
. ./.env.local
set +a
pnpm dev
# Or, in a shell with the same exported variables:
# pnpm test:e2e
```

Use the same export step before `pnpm dev:backend` or `pnpm start` when overriding
defaults. Restart development servers after changes. Next.js resolves API rewrites
at build time for production, so set `BACKEND_URL` before `pnpm build` and rebuild
when it changes.

The default SQLite path resolves to `backend/app.db` when using the pnpm backend
scripts. The Python seeder always writes that file, even if you override
`SPRING_DATASOURCE_URL`; it will not seed a different database. No database username
or password is needed.

Leave `NODE_ENV` to Next.js (`development` for dev, `production` for build/start).
CI sets `CI` for Playwright's stricter checks, retries, and server reuse policy;
leave it unset for normal local development.

### Database Seeding

The Python seeder (`scripts/seed-database.py`) generates production-like data:

| Entity          | Count    |
| --------------- | -------- |
| Plans           | 8        |
| Customers       | 500      |
| Devices         | 600      |
| Usage Records   | ~220,000 |
| Support Tickets | 250      |

```bash
pnpm setup:db   # Run seeder
pnpm reset:db   # Delete DB + re-seed
```

Keep the Python environment activated when running `pnpm setup:db` or `pnpm reset:db`.
These commands replace existing demo data.

### Development

Run both frontend and backend:

```bash
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080

Or run separately:

```bash
pnpm dev:frontend   # Frontend only
pnpm dev:backend    # Backend only
```

### Testing

```bash
pnpm test           # Frontend + backend unit/integration tests
pnpm test:frontend  # Vitest
pnpm test:backend   # Gradle test
pnpm test:e2e       # Playwright browser/API tests
```

For a bounded check, use `mise run test:smoke`. With the prerequisites already
configured manually, its individual commands are:

```bash
pnpm exec vitest list
cd backend
./gradlew --rerun-tasks test --tests com.example.telecom.InstantTextConverterTest
```

`--rerun-tasks` ensures the selected Java tests execute rather than being reported
as up-to-date or restored from cache. Results are written to
`backend/build/reports/tests/test/index.html`.

### Linting

```bash
pnpm lint
```

### Building

After installing the dependencies, build the frontend and backend from the
repository root:

```bash
pnpm build          # Build the frontend production bundle
pnpm build:backend  # Build the backend with the Gradle wrapper
```

`pnpm build` runs the Next.js production build. `pnpm build:backend` runs
`./gradlew build` in `backend/`, compiling and packaging the Spring Boot
application and running its configured checks. To run the backend build directly:

```bash
cd backend
./gradlew build
```

### Build performance tracking

CI measures wall-clock duration of the frontend production build and the backend
`build -x test --profile` step, excluding dependency installation, earlier checks,
and baseline downloads. Failed builds retain their exit code and timing too.
Each job adds a build performance summary and uploads a
`frontend-build-performance` or `backend-build-performance` artifact containing
`metrics.json`, retained for 90 days. Metrics include duration, command, commit,
run/attempt, runner OS/architecture, exit code, and Next.js cache-hit state.
Backend cache state is reported as unknown; see setup-gradle's summary for details.

Using a read-only Actions token, the tracker downloads the matching artifact from
the latest successful `main` CI run. Successful builds with the same command and
runner OS/architecture report the duration difference. A slowdown exceeding
**both 20% and 10 seconds** emits a warning, not a flaky merge gate. Missing,
expired, or incompatible baselines do not block builds. The first successful main
run after merging establishes the baseline. Download artifacts from successive
CI runs to inspect trends; this is build-step timing, not total pipeline latency.

Next.js compiler data in `.next/cache` is restored using a lockfile-scoped cache
with per-commit keys. An exact cache miss can still restore an older compatible
cache. Gradle's task-output build cache is enabled and persisted by setup-gradle.
The separate `gradle-build-profile` artifact includes task/configuration timing
and cache/up-to-date outcomes to identify expensive tasks. Compare similar cache
conditions before acting on a warning; use profiles to target optimizations
rather than raising the warning thresholds.

To collect the same metrics locally after installing dependencies:

```bash
python3 scripts/measure_build.py --component frontend --output build-metrics/frontend/metrics.json -- pnpm build
python3 scripts/measure_build.py --component backend --cwd backend --output build-metrics/backend/metrics.json -- ./gradlew build -x test --profile
python3 -m unittest discover -s scripts -p 'test_measure_build.py'
```

Local collection skips the GitHub baseline lookup. Metrics are git-ignored;
Gradle profiles are under `backend/build/reports/profile/`.

### Backend logging

The backend uses Spring Boot's built-in Logstash JSON console format. Each SLF4J
event is one JSON line with `@timestamp`, `level`, `logger_name`, `thread_name`,
and `message`. Exceptions appear in the escaped `stack_trace` field, so multiline
messages and stack traces do not split records. The startup banner is disabled
to keep application stdout machine-readable.

Existing SLF4J calls need no changes. For searchable event fields, use SLF4J's
fluent API, for example:

```java
LOG.atInfo().addKeyValue("event", "timestamp_migration")
    .addKeyValue("updated_values", updated).log("Normalized legacy timestamps");
```

MDC fields are also included. Clear any MDC values in a `finally` block to avoid
leaking context between requests. Never log customer details, request bodies,
credentials, or tokens.

Standard Spring Boot overrides still work, for example
`LOGGING_LEVEL_COM_EXAMPLE_TELECOM=DEBUG` for application debug logs. If file
logging is enabled with `LOGGING_FILE_NAME`, also set
`LOGGING_STRUCTURED_FORMAT_FILE=logstash` to use the same JSON format there.

## Application Pages

| Page      | URL          | Description           |
| --------- | ------------ | --------------------- |
| Dashboard | `/dashboard` | KPIs and charts       |
| Customers | `/customers` | Subscriber management |
| Plans     | `/plans`     | Service plan catalog  |
| Devices   | `/devices`   | Device/SIM inventory  |
| Usage     | `/usage`     | Usage records         |
| Tickets   | `/tickets`   | Support tickets       |

## API Endpoints

| Endpoint           | Methods                | Description          |
| ------------------ | ---------------------- | -------------------- |
| `/api/health`      | GET                    | Health check         |
| `/api/customers`   | GET, POST, PUT, DELETE | Customer CRUD        |
| `/api/plans`       | GET, POST, PUT, DELETE | Plan CRUD            |
| `/api/devices`     | GET, POST, PUT, DELETE | Device CRUD          |
| `/api/usage`       | GET                    | Usage records        |
| `/api/tickets`     | GET, POST, PUT, DELETE | Ticket CRUD          |
| `/api/dashboard/*` | GET                    | Dashboard statistics |

## API Documentation

Customer, device, and plan list endpoints accept `page` (zero-based) and `size`
(maximum 1000), and retain their array response format. Check the `X-Has-Next`
and `X-Total-Count` response headers to retrieve the complete collection.

The backend normalizes legacy epoch-millisecond timestamps to UTC text on
startup, before becoming ready. Back up an existing database before upgrading.
For device PUT requests, `customerId: null` clears the assignment; `ASSIGNED`
requires a customer.

Start the backend, then open the Swagger UI at
`http://localhost:8080/swagger-ui.html`.

## Project Structure

```
├── app/                    # Next.js pages
│   ├── dashboard/          # Dashboard with KPIs/charts
│   ├── customers/          # Customer management
│   ├── plans/              # Plan management
│   ├── devices/            # Device inventory
│   ├── usage/              # Usage records
│   └── tickets/            # Support tickets
├── backend/                # Spring Boot backend
│   └── src/main/java/com/example/telecom/
│       ├── model/          # JPA entities
│       ├── repository/     # Spring Data repos
│       └── controller/     # REST controllers
├── scripts/                # Utility scripts
│   ├── seed-database.py    # Production-like data seeder
│   └── requirements.txt    # Python dependencies
├── components/             # React components
│   └── ui/                 # shadcn/ui components
├── hooks/                  # Custom React hooks
└── lib/                    # Utilities
```

## License

No open-source license is granted. See `LICENSE`.
