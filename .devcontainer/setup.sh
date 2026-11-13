#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

pnpm install --frozen-lockfile
python3 -m venv .devcontainer/.venv
.devcontainer/.venv/bin/python -m pip install --require-hashes --requirement scripts/requirements.txt

# Seeding replaces existing data, so leave it as an explicit developer action.
printf '\nDependencies installed. Run pnpm setup:db to seed demo data, then pnpm dev.\n'
