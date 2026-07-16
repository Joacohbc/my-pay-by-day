#!/usr/bin/env python3
"""Deterministically compares the Flyway-applied schema against the schema the JPA
entities currently produce, at (table, column, type, not-null, primary-key) granularity.

Usage: diff_schema.py <entity_ddl.sql> <migrations_dir>

Exits 0 when the migrations reproduce the entity schema exactly, 1 on any drift.
"""
import re
import sqlite3
import sys
from pathlib import Path


def schema_of(statements):
    conn = sqlite3.connect(":memory:")
    conn.executescript(statements)
    tables = {}
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    )
    for (table,) in rows:
        columns = {}
        for _cid, name, col_type, not_null, _default, primary_key in conn.execute(
            f"PRAGMA table_info('{table}')"
        ):
            columns[name] = (col_type.upper(), not_null, primary_key)
        tables[table] = columns
    conn.close()
    return tables


def migrations_ddl(migrations_dir):
    version = lambda path: int(re.match(r"V(\d+)__", path.name).group(1))
    scripts = sorted(Path(migrations_dir).glob("V*__*.sql"), key=version)
    if not scripts:
        sys.exit(f"No migration scripts found in {migrations_dir}")
    return "\n".join(script.read_text() for script in scripts)


def report_drift(migrated, entities):
    drift = []
    for table in sorted(set(migrated) - set(entities)):
        drift.append(f"table only in migrations: {table}")
    for table in sorted(set(entities) - set(migrated)):
        drift.append(f"table only in entities:   {table}")
    for table in sorted(set(migrated) & set(entities)):
        cols_migrated, cols_entities = migrated[table], entities[table]
        for column in sorted(set(cols_migrated) | set(cols_entities)):
            if cols_migrated.get(column) != cols_entities.get(column):
                drift.append(
                    f"{table}.{column}: migrations={cols_migrated.get(column)} "
                    f"entities={cols_entities.get(column)}"
                )
    return drift


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    entity_ddl_path, migrations_dir = sys.argv[1], sys.argv[2]
    migrated = schema_of(migrations_ddl(migrations_dir))
    entities = schema_of(Path(entity_ddl_path).read_text())
    drift = report_drift(migrated, entities)
    if drift:
        print("Schema drift detected between migrations and JPA entities:")
        for line in drift:
            print(f"  - {line}")
        sys.exit(1)
    print(f"OK: {len(migrated)} tables match between migrations and JPA entities.")


if __name__ == "__main__":
    main()
