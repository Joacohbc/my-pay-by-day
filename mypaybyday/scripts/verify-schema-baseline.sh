#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
backend_dir="$repo_root/mypaybyday"
migrations_dir="$backend_dir/src/main/resources/db/migration"
entity_ddl="$(mktemp -t entity-schema.XXXXXX.sql)"
trap 'rm -f "$entity_ddl"' EXIT

echo "==> Exporting schema from current JPA entities via Hibernate"
(
  cd "$backend_dir"
  ./mvnw -q test -B \
    -Dtest=MigrationsBootTest \
    -Dquarkus.hibernate-orm.scripts.generation=create \
    -Dquarkus.hibernate-orm.scripts.generation.create-target="$entity_ddl"
)

echo "==> Diffing Flyway migrations against entity schema"
python3 "$backend_dir/scripts/diff_schema.py" "$entity_ddl" "$migrations_dir"
