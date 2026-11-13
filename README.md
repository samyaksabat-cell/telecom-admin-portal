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
