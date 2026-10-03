#!/usr/bin/env python3
"""Nightly backup of the Lemyte database to this computer (Supabase's Free Plan has no backups of its own).

What is saved, in ~/lemyte-backups/<YYYY-MM-DD>/:
  gate.<table>.jsonl.gz   every row of every table in the gate schema (one JSON object per line)
  auth_users.jsonl.gz     accounts: id, email, name and dates (no password hashes; restored users reset passwords)
  schema.json.gz          columns, keys, indexes, row-security policies, functions, enum types and grants
  manifest.json           row count and checksum per table, and the backup's total size

Egress (the transfer Supabase meters): before downloading a table, Postgres computes an md5 of the whole table and
sends only that. If it matches the newest previous backup, the file is copied locally and nothing is downloaded.
The question bank (~8 MB) changes rarely, so a typical night downloads well under 1 MB.

Safety: every download loop is bounded by the row count measured first (never "until empty"), and each backup is
checked: the rows written must equal the rows counted. A failed backup is deleted, never kept half-written.
Uses SUPABASE_ACCESS_TOKEN from .env.local (Management API, read-only queries). Keeps the newest 30 backups.

Run by hand:  python3 scripts/backup/backup_db.py
Restore help: see scripts/backup/README.md
"""
import datetime
import gzip
import hashlib
import json
import os
import re
import shutil
import sys
import time
import urllib.error
import urllib.request

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEST = os.path.expanduser(os.environ.get("LEMYTE_BACKUP_DIR", "~/lemyte-backups"))
PROJECT = "rqmgmlhltjylgkvgnokh"
KEEP = 30
CHUNK = 1000

_env = open(os.path.join(REPO, ".env.local")).read()
TOKEN = re.search(r"^SUPABASE_ACCESS_TOKEN=(.+)$", _env, re.M).group(1).strip().strip('"')


def sql(query: str):
    body = json.dumps({"query": query}).encode()
    for attempt in range(4):
        req = urllib.request.Request(
            f"https://api.supabase.com/v1/projects/{PROJECT}/database/query",
            data=body,
            headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json", "User-Agent": "lemyte-backup"},
        )
        try:
            return json.loads(urllib.request.urlopen(req, timeout=120).read())
        except urllib.error.HTTPError as e:
            if e.code < 500 and e.code != 429 or attempt == 3:
                raise RuntimeError(f"query failed ({e.code}): {e.read()[:200]!r}") from None
        except (urllib.error.URLError, TimeoutError):
            if attempt == 3:
                raise
        time.sleep(5 * (attempt + 1))


def tables():
    return sql("""
      select c.relname as t,
             (select string_agg(quote_ident(a.attname), ',' order by array_position(i.indkey, a.attnum))
                from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
               where i.indrelid = c.oid and i.indisprimary) as pk
        from pg_class c where c.relnamespace = 'gate'::regnamespace and c.relkind = 'r' order by 1""")


def fingerprint(source: str, order: str):
    """Row count and md5 of all rows, computed in Postgres (only ~50 bytes leave the database)."""
    r = sql(f"select count(*)::bigint n, md5(coalesce(string_agg(t::text, E'\\n' order by {order}), '')) h from {source} t")[0]
    return int(r["n"]), r["h"]


def export(source: str, order: str, n: int, path: str):
    """Download exactly n rows in fixed-size chunks; the loop is bounded by n, never by 'until a page is empty'."""
    written = 0
    with gzip.open(path, "wt", encoding="utf-8") as out:
        for start in range(0, n, CHUNK):
            rows = sql(f"select row_to_json(t)::text j from (select * from {source} x order by {order} "
                       f"offset {start} limit {CHUNK}) t")
            for r in rows:
                out.write(r["j"] + "\n")
            written += len(rows)
    if written != n:
        raise RuntimeError(f"{source}: wrote {written} rows, expected {n}")


def previous_backup(today_dir: str):
    if not os.path.isdir(DEST):
        return None
    done = sorted(d for d in os.listdir(DEST)
                  if os.path.isfile(os.path.join(DEST, d, "manifest.json")) and os.path.join(DEST, d) != today_dir)
    return os.path.join(DEST, done[-1]) if done else None


def save_table(name, source, order, out_dir, prev, prev_manifest, manifest):
    n, h = fingerprint(source, order)
    path = os.path.join(out_dir, f"{name}.jsonl.gz")
    old = prev_manifest.get("tables", {}).get(name)
    if prev and old and old["rows"] == n and old["md5"] == h and os.path.exists(os.path.join(prev, f"{name}.jsonl.gz")):
        shutil.copy2(os.path.join(prev, f"{name}.jsonl.gz"), path)
        how = "unchanged (copied)"
    else:
        export(source, order, n, path)
        how = "downloaded"
    manifest["tables"][name] = {"rows": n, "md5": h, "how": how}
    print(f"  {name:34} {n:>7} rows  {how}")


def schema_snapshot():
    q = {
        "columns": """select table_name, column_name, data_type, udt_name, is_nullable, column_default, ordinal_position
                      from information_schema.columns where table_schema = 'gate' order by table_name, ordinal_position""",
        "constraints": """select conrelid::regclass::text tbl, conname, pg_get_constraintdef(oid) def from pg_constraint
                          where connamespace = 'gate'::regnamespace order by 1, 2""",
        "indexes": "select tablename, indexname, indexdef from pg_indexes where schemaname = 'gate' order by 1, 2",
        "row_security": """select relname, relrowsecurity from pg_class where relnamespace = 'gate'::regnamespace
                           and relkind = 'r' order by 1""",
        "policies": "select * from pg_policies where schemaname in ('gate', 'public') order by tablename, policyname",
        "functions": """select n.nspname, p.proname, pg_get_functiondef(p.oid) def from pg_proc p
                        join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('gate', 'public')
                        and p.prokind = 'f' order by 1, 2""",
        "enums": """select t.typname, string_agg(e.enumlabel, ',' order by e.enumsortorder) labels from pg_type t
                    join pg_enum e on e.enumtypid = t.oid where t.typnamespace = 'gate'::regnamespace group by 1 order by 1""",
        "grants": """select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) privileges
                     from information_schema.role_table_grants where table_schema = 'gate' group by 1, 2 order by 1, 2""",
    }
    return {k: sql(v) for k, v in q.items()}


def heartbeat(ok: bool, detail: dict):
    """Record the outcome in gate.system_heartbeats so /admin/system can show when the last backup ran."""
    try:
        sql("insert into gate.system_heartbeats (name, at, ok, detail) values ('backup', now(), "
            f"{'true' if ok else 'false'}, '{json.dumps(detail).replace(chr(39), chr(39) * 2)}'::jsonb) "
            "on conflict (name) do update set at = excluded.at, ok = excluded.ok, detail = excluded.detail")
    except Exception as e:  # the backup itself matters more than the report
        print(f"(could not record heartbeat: {e})", file=sys.stderr)


def main():
    today = datetime.date.today().isoformat()
    out_dir = os.path.join(DEST, today)
    tmp_dir = out_dir + ".partial"
    shutil.rmtree(tmp_dir, ignore_errors=True)
    os.makedirs(tmp_dir)
    prev = previous_backup(out_dir)
    prev_manifest = json.load(open(os.path.join(prev, "manifest.json"))) if prev else {}
    manifest = {"started": datetime.datetime.now().isoformat(timespec="seconds"), "project": PROJECT, "tables": {}}
    print(f"Backup {today} -> {out_dir}" + (f" (unchanged tables copied from {os.path.basename(prev)})" if prev else ""))
    try:
        for row in tables():
            if not row["pk"]:
                raise RuntimeError(f"gate.{row['t']} has no primary key; cannot order a safe export")
            save_table(f"gate.{row['t']}", f"gate.{row['t']}", row["pk"], tmp_dir, prev, prev_manifest, manifest)
        save_table("auth_users",
                   "(select id, email, created_at, email_confirmed_at, last_sign_in_at, raw_user_meta_data from auth.users)",
                   "id", tmp_dir, prev, prev_manifest, manifest)
        with gzip.open(os.path.join(tmp_dir, "schema.json.gz"), "wt", encoding="utf-8") as f:
            json.dump(schema_snapshot(), f)
        manifest["finished"] = datetime.datetime.now().isoformat(timespec="seconds")
        manifest["bytes"] = sum(os.path.getsize(os.path.join(tmp_dir, f)) for f in os.listdir(tmp_dir))
        json.dump(manifest, open(os.path.join(tmp_dir, "manifest.json"), "w"), indent=1)
        shutil.rmtree(out_dir, ignore_errors=True)
        os.rename(tmp_dir, out_dir)
    except Exception:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise
    # keep the newest KEEP complete backups
    done = sorted(d for d in os.listdir(DEST) if os.path.isfile(os.path.join(DEST, d, "manifest.json")))
    for old in done[:-KEEP]:
        shutil.rmtree(os.path.join(DEST, old), ignore_errors=True)
    total_rows = sum(t["rows"] for t in manifest["tables"].values())
    downloaded = sum(1 for t in manifest["tables"].values() if t["how"] == "downloaded")
    print(f"OK: {len(manifest['tables'])} tables, {total_rows} rows, {manifest['bytes'] / 1e6:.1f} MB on disk")
    heartbeat(True, {"tables": len(manifest["tables"]), "rows": total_rows, "bytes": manifest["bytes"],
                     "downloaded_tables": downloaded, "kept": min(len(done), KEEP)})


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # make failures visible in the systemd journal and on /admin/system, exit non-zero
        print(f"BACKUP FAILED: {e}", file=sys.stderr)
        heartbeat(False, {"error": str(e)[:300]})
        sys.exit(1)
