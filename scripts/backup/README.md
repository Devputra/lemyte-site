# Database backups

Supabase's Free Plan keeps no backups, so `backup_db.py` saves the whole database to this computer every night.

- **Where:** `~/lemyte-backups/<date>/` (newest 30 kept). Each folder has one `.jsonl.gz` file per table,
  `auth_users.jsonl.gz` (accounts without password hashes), `schema.json.gz` and `manifest.json`.
- **When:** 21:40 every night, via a systemd user timer. If the laptop was off, it runs at the next start-up.
- **Cost in egress:** unchanged tables are not downloaded (an md5 computed inside Postgres is compared first), so a
  normal night transfers well under 1 MB. A full first backup is about 10 MB.
- **Keep a copy off this laptop:** once a week, copy `~/lemyte-backups` to a USB drive or Google Drive. A backup
  that lives only on the same laptop is lost with the laptop.

## Check it is working

```bash
systemctl --user list-timers lemyte-backup.timer           # next run
journalctl --user -u lemyte-backup.service -n 20 -o cat    # last run's output ("OK: ..." or "BACKUP FAILED: ...")
ls ~/lemyte-backups                                        # one folder per night
```

Run one now: `systemctl --user start lemyte-backup.service` (or `python3 scripts/backup/backup_db.py`).

## Timer files (in ~/.config/systemd/user/)

`lemyte-backup.service`: `Type=oneshot`, `WorkingDirectory=/home/devputra/lemyte-site`,
`ExecStart=/usr/bin/python3 /home/devputra/lemyte-site/scripts/backup/backup_db.py`.
`lemyte-backup.timer`: `OnCalendar=*-*-* 21:40`, `Persistent=true`, `RandomizedDelaySec=10m`; enabled with
`systemctl --user enable --now lemyte-backup.timer`.

## Restoring

Each line of a table file is one row as JSON. To put rows back into a table (example: one table, run in the
Supabase SQL editor or with `/tmp/claude-1001/ce/sql.py`-style Management API calls):

```sql
insert into gate.<table>
select * from json_populate_recordset(null::gate.<table>, '<json array of rows>'::json)
on conflict do nothing;
```

Restore tables parents-first (subjects, topics, plans, blueprint_profiles, question_versions, test_versions,
test_version_questions, then attempts and their children, then payment_orders, access_passes, payment_events).
`schema.json.gz` lists every column, constraint, index, policy, function, enum and grant, for rebuilding a project
from scratch. Accounts (`auth_users`) must be re-created through Supabase Auth (admin API) with the same ids; their
owners then use "Forgot password".
