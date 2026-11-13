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
- Java 21+
- pnpm
- Python 3 (for database seeding)

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

### Linting

```bash
pnpm lint
```

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
