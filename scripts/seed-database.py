#!/usr/bin/env python3
"""Seed database with production-like data for Telecom Demo Admin Portal."""

import sqlite3
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    from faker import Faker
except ImportError:
    print("Error: faker is required. Install with: pip install faker")
    print("Or run: pip install -r scripts/requirements.txt")
    exit(1)

DB_PATH = Path(__file__).parent.parent / "backend" / "app.db"
SEED = 42

random.seed(SEED)
fake = Faker()
Faker.seed(SEED)


def utc_now() -> datetime:
    """Current time as naive UTC, the zone the backend reads stored timestamps in."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_sqlite_timestamp(dt: datetime) -> str:
    """Convert datetime to SQLite JDBC compatible timestamp format."""
    return dt.strftime("%Y-%m-%d %H:%M:%S.") + f"{dt.microsecond // 1000:03d}"

PLANS = [
    ("Basic", 29.99, 5, 500, 500, True),
    ("Standard", 49.99, 15, 1000, None, True),
    ("Premium", 69.99, 30, None, None, True),
    ("Unlimited", 89.99, None, None, None, True),
    ("Family Share", 119.99, 50, None, None, True),
    ("Business Starter", 79.99, 25, 2000, 1000, True),
    ("Business Pro", 149.99, 100, None, None, True),
    ("Student", 24.99, 10, 500, 500, True),
]

DEVICE_MODELS = [
    "iPhone 15 Pro", "iPhone 15", "iPhone 15 Plus", "iPhone 14",
    "Samsung Galaxy S24 Ultra", "Samsung Galaxy S24", "Samsung Galaxy A54",
    "Google Pixel 8 Pro", "Google Pixel 8", "Google Pixel 7a",
    "OnePlus 12", "OnePlus 11", "Motorola Edge 40",
    "Xiaomi 14", "Nothing Phone 2",
]

TICKET_SUBJECTS = [
    ("Billing inquiry", "I have a question about charges on my last bill"),
    ("Service outage", "Cannot make calls or use data in my area"),
    ("Plan upgrade request", "Would like to upgrade to a higher plan"),
    ("Device issue", "Having problems with my phone"),
    ("International roaming", "Need to enable international roaming for upcoming trip"),
    ("Data usage concern", "My data seems to be depleting faster than expected"),
    ("Account security", "Want to update my security settings and password"),
    ("New SIM request", "Lost my SIM card and need a replacement"),
    ("Voicemail setup", "Need help setting up my voicemail"),
    ("Payment issue", "My payment was declined, need assistance"),
    ("Coverage question", "Checking if there's coverage in a specific area"),
    ("Family plan setup", "Want to add family members to my plan"),
    ("Contract renewal", "Questions about my contract renewal options"),
    ("Number transfer", "Want to port my number from another carrier"),
    ("App not working", "The Telecom Demo app keeps crashing"),
    ("Slow data speeds", "My internet connection is very slow"),
    ("Unable to send SMS", "Text messages are not being delivered"),
    ("Call quality issues", "Experiencing dropped calls and poor audio"),
    ("Refund request", "Requesting refund for overcharges"),
    ("Account access", "Cannot log into my account"),
]


def create_tables(conn: sqlite3.Connection):
    """Create tables matching JPA entity schema (plural table names)."""
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            monthly_price NUMERIC(10,2) NOT NULL,
            data_limit_gb INTEGER,
            minutes_limit INTEGER,
            sms_limit INTEGER,
            is_active BOOLEAN NOT NULL DEFAULT 1
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            phone VARCHAR(255) NOT NULL,
            plan_id BIGINT NOT NULL,
            status VARCHAR(255) NOT NULL DEFAULT 'ACTIVE',
            balance NUMERIC(10,2) NOT NULL DEFAULT 0,
            activated_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL,
            FOREIGN KEY (plan_id) REFERENCES plans(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            imei VARCHAR(255) NOT NULL UNIQUE,
            model VARCHAR(255) NOT NULL,
            sim_number VARCHAR(255) NOT NULL UNIQUE,
            customer_id BIGINT,
            status VARCHAR(255) NOT NULL DEFAULT 'AVAILABLE',
            assigned_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS usage_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id BIGINT NOT NULL,
            type VARCHAR(255) NOT NULL,
            quantity NUMERIC(10,2) NOT NULL,
            cost NUMERIC(10,2) NOT NULL,
            recorded_at TIMESTAMP NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS support_tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id BIGINT NOT NULL,
            subject VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            priority VARCHAR(255) NOT NULL DEFAULT 'MEDIUM',
            status VARCHAR(255) NOT NULL DEFAULT 'OPEN',
            created_at TIMESTAMP NOT NULL,
            resolved_at TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
    """)
    
    conn.commit()


def clear_data(conn: sqlite3.Connection):
    """Clear all existing data."""
    cursor = conn.cursor()
    cursor.execute("DELETE FROM usage_records")
    cursor.execute("DELETE FROM support_tickets")
    cursor.execute("DELETE FROM devices")
    cursor.execute("DELETE FROM customers")
    cursor.execute("DELETE FROM plans")
    conn.commit()
    print("Cleared existing data")


def seed_plans(conn: sqlite3.Connection) -> list[int]:
    """Seed plans and return list of plan IDs."""
    cursor = conn.cursor()
    plan_ids = []
    
    for name, price, data, minutes, sms, active in PLANS:
        cursor.execute("""
            INSERT INTO plans (name, monthly_price, data_limit_gb, minutes_limit, sms_limit, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (name, price, data, minutes, sms, 1 if active else 0))
        plan_ids.append(cursor.lastrowid)
    
    conn.commit()
    print(f"Created {len(PLANS)} plans")
    return plan_ids


def seed_customers(conn: sqlite3.Connection, plan_ids: list[int], count: int = 500) -> list[int]:
    """Seed customers and return list of customer IDs."""
    cursor = conn.cursor()
    customer_ids = []
    statuses = ["ACTIVE"] * 80 + ["SUSPENDED"] * 10 + ["CANCELLED"] * 10
    now = utc_now()
    
    print(f"Creating {count} customers...")
    
    emails_used = set()
    for i in range(count):
        first_name = fake.first_name()
        last_name = fake.last_name()
        
        base_email = f"{first_name.lower()}.{last_name.lower()}@{fake.free_email_domain()}"
        email = base_email
        suffix = 1
        while email in emails_used:
            email = f"{first_name.lower()}.{last_name.lower()}{suffix}@{fake.free_email_domain()}"
            suffix += 1
        emails_used.add(email)
        
        phone = fake.phone_number()
        plan_id = random.choice(plan_ids)
        status = random.choice(statuses)
        balance = round(random.uniform(0, 150), 2) if status == "ACTIVE" else 0
        created_at = now - timedelta(days=random.randint(1, 365))
        
        cursor.execute("""
            INSERT INTO customers (first_name, last_name, email, phone, plan_id, status, balance, activated_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (first_name, last_name, email, phone, plan_id, status, balance, to_sqlite_timestamp(created_at), to_sqlite_timestamp(created_at)))
        customer_ids.append(cursor.lastrowid)
        
        if (i + 1) % 100 == 0:
            print(f"  Created {i + 1}/{count} customers")
    
    conn.commit()
    print(f"Created {count} customers")
    return customer_ids


def seed_devices(conn: sqlite3.Connection, customer_ids: list[int], count: int = 600) -> list[int]:
    """Seed devices and return list of device IDs."""
    cursor = conn.cursor()
    device_ids = []
    now = utc_now()
    
    cursor.execute("SELECT id FROM customers WHERE status = 'ACTIVE'")
    active_customer_ids = [row[0] for row in cursor.fetchall()]
    
    customers_needing_devices = active_customer_ids.copy()
    random.shuffle(customers_needing_devices)
    
    print(f"Creating {count} devices...")
    
    for i in range(count):
        imei = f"35{random.randint(100000000000, 999999999999)}"
        sim_number = f"8901{random.randint(1000000000000000, 9999999999999999)}"
        model = random.choice(DEVICE_MODELS)
        
        if customers_needing_devices:
            customer_id = customers_needing_devices.pop()
            status = "ASSIGNED"
            assigned_at = now - timedelta(days=random.randint(1, 180))
        elif i < count * 0.85:
            if random.random() < 0.3 and active_customer_ids:
                customer_id = random.choice(active_customer_ids)
                status = "ASSIGNED"
                assigned_at = now - timedelta(days=random.randint(1, 180))
            else:
                customer_id = None
                status = "AVAILABLE"
                assigned_at = None
        elif i < count * 0.93:
            customer_id = None
            status = "AVAILABLE"
            assigned_at = None
        elif i < count * 0.97:
            customer_id = None
            status = "DAMAGED"
            assigned_at = None
        else:
            customer_id = None
            status = "LOST"
            assigned_at = None
        
        created_at = utc_now()
        cursor.execute("""
            INSERT INTO devices (imei, model, sim_number, customer_id, status, assigned_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (imei, model, sim_number, customer_id, status, to_sqlite_timestamp(assigned_at) if assigned_at else None, to_sqlite_timestamp(created_at)))
        device_ids.append(cursor.lastrowid)
        
        if (i + 1) % 100 == 0:
            print(f"  Created {i + 1}/{count} devices")
    
    conn.commit()
    print(f"Created {count} devices")
    return device_ids


def seed_usage_records(conn: sqlite3.Connection, customer_ids: list[int], days: int = 90):
    """Seed usage records for the past N days."""
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM customers WHERE status = 'ACTIVE'")
    active_customer_ids = [row[0] for row in cursor.fetchall()]
    
    now = utc_now()
    usage_types = ["CALL", "DATA", "SMS"]
    records = []
    
    print(f"Creating usage records for {days} days...")
    
    for day_offset in range(days):
        record_date = now - timedelta(days=day_offset)
        is_weekday = record_date.weekday() < 5
        
        for customer_id in active_customer_ids:
            for usage_type in usage_types:
                if random.random() > 0.25:
                    num_records = random.randint(1, 5) if is_weekday else random.randint(1, 3)
                    
                    for _ in range(num_records):
                        hour = random.choices(
                            range(24),
                            weights=[1, 1, 1, 1, 1, 2, 3, 5, 7, 8, 8, 7, 7, 7, 8, 8, 7, 6, 5, 4, 3, 2, 2, 1]
                        )[0]
                        record_time = min(now, record_date.replace(hour=hour, minute=random.randint(0, 59)))
                        
                        if usage_type == "CALL":
                            quantity = random.randint(1, 45)
                            cost = round(quantity * 0.05, 2)
                        elif usage_type == "DATA":
                            quantity = random.randint(10, 800)
                            cost = round(quantity * 0.01, 2)
                        else:
                            quantity = random.randint(1, 15)
                            cost = round(quantity * 0.02, 2)
                        
                        records.append((customer_id, usage_type, quantity, cost, to_sqlite_timestamp(record_time)))
        
        if (day_offset + 1) % 10 == 0:
            print(f"  Processed {day_offset + 1}/{days} days ({len(records)} records so far)")
    
    cursor.executemany("""
        INSERT INTO usage_records (customer_id, type, quantity, cost, recorded_at)
        VALUES (?, ?, ?, ?, ?)
    """, records)
    
    conn.commit()
    print(f"Created {len(records)} usage records")


def seed_support_tickets(conn: sqlite3.Connection, customer_ids: list[int], count: int = 250):
    """Seed support tickets."""
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM customers WHERE status IN ('ACTIVE', 'SUSPENDED')")
    eligible_customer_ids = [row[0] for row in cursor.fetchall()]
    
    priorities = ["LOW"] * 20 + ["MEDIUM"] * 50 + ["HIGH"] * 25 + ["URGENT"] * 5
    statuses = ["OPEN"] * 30 + ["IN_PROGRESS"] * 25 + ["RESOLVED"] * 35 + ["CLOSED"] * 10
    now = utc_now()
    
    print(f"Creating {count} support tickets...")
    
    for i in range(count):
        customer_id = random.choice(eligible_customer_ids)
        subject, description = random.choice(TICKET_SUBJECTS)
        
        description = f"{description}. {fake.sentence()}"
        
        priority = random.choice(priorities)
        status = random.choice(statuses)
        created_at = now - timedelta(days=random.randint(0, 60), hours=random.randint(0, 23))
        
        if status in ("RESOLVED", "CLOSED"):
            resolved_at = created_at + timedelta(
                days=random.randint(0, 7),
                hours=random.randint(1, 48)
            )
            if resolved_at > now:
                resolved_at = now
        else:
            resolved_at = None
        
        cursor.execute("""
            INSERT INTO support_tickets (customer_id, subject, description, priority, status, created_at, resolved_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (customer_id, subject, description, priority, status, to_sqlite_timestamp(created_at), 
              to_sqlite_timestamp(resolved_at) if resolved_at else None))
        
        if (i + 1) % 50 == 0:
            print(f"  Created {i + 1}/{count} tickets")
    
    conn.commit()
    print(f"Created {count} support tickets")


def main():
    print("=" * 60)
    print("Telecom Demo Database Seeder")
    print("=" * 60)
    print(f"Database: {DB_PATH}")
    print()
    
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    
    try:
        create_tables(conn)
        clear_data(conn)
        
        print()
        plan_ids = seed_plans(conn)
        customer_ids = seed_customers(conn, plan_ids, count=500)
        seed_devices(conn, customer_ids, count=600)
        seed_usage_records(conn, customer_ids, days=90)
        seed_support_tickets(conn, customer_ids, count=250)
        
        print()
        print("=" * 60)
        print("Seeding complete!")
        print("=" * 60)
        
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM plans")
        print(f"  Plans: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM customers")
        print(f"  Customers: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM devices")
        print(f"  Devices: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM usage_records")
        print(f"  Usage Records: {cursor.fetchone()[0]}")
        cursor.execute("SELECT COUNT(*) FROM support_tickets")
        print(f"  Support Tickets: {cursor.fetchone()[0]}")
        
    finally:
        conn.close()


if __name__ == "__main__":
    main()
