-- Match scripts/seed-database.py, including timestamp affinity and inline foreign keys.
-- Hibernate's SQLite create-drop schema does not create the foreign keys.
CREATE TABLE plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    monthly_price NUMERIC(10,2) NOT NULL,
    data_limit_gb INTEGER,
    minutes_limit INTEGER,
    sms_limit INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT 1
);
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(255) NOT NULL,
    plan_id BIGINT NOT NULL REFERENCES plans(id),
    status VARCHAR(255) NOT NULL DEFAULT 'ACTIVE',
    balance NUMERIC(10,2) NOT NULL DEFAULT 0,
    activated_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL
);
CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    imei VARCHAR(255) NOT NULL UNIQUE,
    model VARCHAR(255) NOT NULL,
    sim_number VARCHAR(255) NOT NULL UNIQUE,
    customer_id BIGINT REFERENCES customers(id),
    status VARCHAR(255) NOT NULL DEFAULT 'AVAILABLE',
    assigned_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL
);
CREATE TABLE usage_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    type VARCHAR(255) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    cost NUMERIC(10,2) NOT NULL,
    recorded_at TIMESTAMP NOT NULL
);
CREATE TABLE support_tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id BIGINT NOT NULL REFERENCES customers(id),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(255) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(255) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL,
    resolved_at TIMESTAMP
);
