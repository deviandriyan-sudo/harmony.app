# Applied migration archive

These two files are exact schema migration statements recorded in the existing database's migration history. They are an audit archive, not a complete bootstrap sequence. Do not replay against production or a new database until all prerequisite schema migrations, including earlier manual RC3N protections, have been reconciled. The repository is public; do not archive production row dumps, employee identifiers, tokens or credentials here.

Read-only contract inventory: `node scripts/audit-database-contract.mjs`. Metadata SQL: `node scripts/audit-database-contract.mjs --sql`. The optional `--check` mode uses psql/libpq connection variables from a secure runtime and fails on missing literal relations, simple columns or named RPC parameters. Dynamic query targets, role grants, RLS, business logic, and actual API behavior need separate tests. The scanner is not proof of production readiness.
