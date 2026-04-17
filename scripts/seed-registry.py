"""Seed the Supabase registry_entries table from scanner/registry-index.json.

Idempotent — safe to re-run. Creates the table/indexes if missing, upserts rows.

Usage:
    DATABASE_URL=postgresql://user:pw@host:5432/postgres python3 scripts/seed-registry.py

Or with Supabase pooler (URL in the prod env):
    DATABASE_URL=postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres \\
        python3 scripts/seed-registry.py
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

import asyncpg


def parse_iso(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    # accept "...Z" by swapping to "+00:00" for fromisoformat
    s = value.rstrip("Z")
    if s != value:
        s = s + "+00:00"
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None

REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY_FILE = REPO_ROOT / "scanner" / "registry-index.json"

SCHEMA_SQL = """
create table if not exists registry_entries (
  slug text primary key,
  server text,
  version text,
  grade text,
  score int,
  tool_count int,
  categories jsonb,
  findings jsonb,
  top_findings jsonb,
  risk_profile jsonb,
  scanned_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists registry_entries_grade_idx on registry_entries (grade);
create index if not exists registry_entries_score_idx on registry_entries (score);
create index if not exists registry_entries_scanned_at_idx on registry_entries (scanned_at);
"""

UPSERT_SQL = """
insert into registry_entries (
  slug, server, version, grade, score, tool_count,
  categories, findings, top_findings, risk_profile, scanned_at, updated_at
)
values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
on conflict (slug) do update set
  server = excluded.server,
  version = excluded.version,
  grade = excluded.grade,
  score = excluded.score,
  tool_count = excluded.tool_count,
  categories = excluded.categories,
  findings = excluded.findings,
  top_findings = excluded.top_findings,
  risk_profile = excluded.risk_profile,
  scanned_at = excluded.scanned_at,
  updated_at = now();
"""


def normalize_dsn(dsn: str) -> str:
    """asyncpg does not accept the postgresql+asyncpg:// scheme — strip it."""
    return dsn.replace("postgresql+asyncpg://", "postgresql://", 1)


async def main() -> None:
    dsn = os.environ.get("DATABASE_URL")
    if not dsn:
        sys.stderr.write("DATABASE_URL is required\n")
        sys.exit(1)
    dsn = normalize_dsn(dsn)

    if not REGISTRY_FILE.exists():
        sys.stderr.write(f"registry file not found: {REGISTRY_FILE}\n")
        sys.exit(1)

    print(f"loading {REGISTRY_FILE} ...")
    with REGISTRY_FILE.open() as fh:
        data: dict[str, dict] = json.load(fh)
    print(f"  {len(data)} entries")

    conn = await asyncpg.connect(dsn, statement_cache_size=0)
    try:
        print("applying schema ...")
        await conn.execute(SCHEMA_SQL)

        print(f"upserting {len(data)} rows ...")
        rows = []
        for slug, entry in data.items():
            rows.append((
                slug,
                entry.get("server"),
                entry.get("version"),
                entry.get("grade"),
                entry.get("score"),
                entry.get("toolCount"),
                json.dumps(entry.get("categories")) if entry.get("categories") is not None else None,
                json.dumps(entry.get("findings")) if entry.get("findings") is not None else None,
                json.dumps(entry.get("topFindings")) if entry.get("topFindings") is not None else None,
                json.dumps(entry.get("riskProfile")) if entry.get("riskProfile") is not None else None,
                parse_iso(entry.get("scannedAt")),
            ))
        # batch in chunks of 500 to keep query size reasonable
        batch_size = 500
        total = len(rows)
        for i in range(0, total, batch_size):
            chunk = rows[i:i + batch_size]
            await conn.executemany(UPSERT_SQL, chunk)
            print(f"  {min(i + batch_size, total)} / {total}")

        count = await conn.fetchval("select count(*) from registry_entries")
        print(f"done. registry_entries now has {count} rows.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
