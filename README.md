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
