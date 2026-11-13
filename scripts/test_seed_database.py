"""Seeder timestamp regression tests. Run with python -m unittest discover -s scripts."""
import importlib.util
import sqlite3
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("seeder", Path(__file__).with_name("seed-database.py"))
seeder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seeder)


class SeederTests(unittest.TestCase):
    def test_usage_never_extends_into_the_future_even_at_midnight(self):
        for now in (datetime(2025, 1, 1, 0, 0), datetime(2025, 1, 1, 23, 59, 59)):
            with self.subTest(now=now), sqlite3.connect(":memory:") as db, patch.object(seeder, "utc_now", return_value=now):
                seeder.create_tables(db)
                plans = seeder.seed_plans(db)
                customers = seeder.seed_customers(db, plans, count=30)
                seeder.seed_usage_records(db, customers, days=2)
                timestamps = [row[0] for row in db.execute("SELECT recorded_at FROM usage_records")]
                self.assertTrue(timestamps)
                self.assertLessEqual(max(timestamps), seeder.to_sqlite_timestamp(now))
                self.assertTrue(all(len(timestamp) == 23 for timestamp in timestamps))


if __name__ == "__main__":
    unittest.main()
