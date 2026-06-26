# 4CBON Event Log — Setup Instructions

## 1. Supabase table (run this SQL once in the Supabase SQL editor)

```sql
create table if not exists event_log (
  id bigserial primary key,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  run_id text,
  created_at timestamptz not null default now()
);

-- Append-only enforcement: no updates or deletes allowed at the DB level
revoke update, delete on event_log from public;
revoke update, delete on event_log from authenticated;
revoke update, delete on event_log from anon;
```

This makes the table genuinely immutable — even a bug in the app code cannot edit or delete a past event, only insert new ones. If a correction is ever needed, insert a new row with `event_type: "CORRECTION"` referencing the original event's id in `details`.

## 2. Backend handler (add to your `/api/claude` serverless function)

Add this case to whatever switch/if-chain handles `_action`:

```js
if (body._action === "log_event") {
  const { error } = await supabase
    .from("event_log")
    .insert({
      event_type: body.eventType,
      details: body.details,
      run_id: body.runId,
    });
  if (error) console.error("log_event failed:", error);
  return res.status(200).json({ ok: true });
}
```

## 3. Querying the evidence later

To answer "how many times has LP actually fired" — no more relying on memory or chat history:

```sql
select count(*) from event_log where event_type = 'LP_FIRED';
```

To see the full timeline for a specific run:

```sql
select * from event_log where run_id = 'run_142_...' order by created_at asc;
```

To get a weekly summary (the "evidence aggregation" stage):

```sql
select event_type, count(*) as occurrences
from event_log
where created_at > now() - interval '7 days'
group by event_type
order by occurrences desc;
```

## Event types now logged automatically

- `OPERATING_MODE_SELECTED` — every run, records s0 and which mode was chosen
- `UPSTREAM_TRUNCATION` — when the L2 integrity guard halts the pipeline
- `LP_FIRED` — when LP detects and blocks a structural inversion
- `L4_HALT` — when L4's execution fails or is too short
- `RUN_OUTCOME` — every successful full completion, with score delta

This is the "Stage 1: Event logging" layer from the three-stage process. Stage 2 (evidence aggregation) is the SQL queries above — could later become a small dashboard. Stage 3 (certification) stays manual: a human reviews the evidence and updates `4cbon-status-table.md` accordingly.
