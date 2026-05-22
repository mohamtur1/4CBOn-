// api/claude.js — 4CBON Vercel Serverless Proxy
//
// Secure bridge between browser and Anthropic API + Supabase.
// API keys never touch the browser — they live in Vercel env vars.
//
// FREEMIUM GATE: 3 free runs per day per IP address.
// Tracked server-side in Supabase run_limits table.
// Cannot be bypassed by clearing localStorage.
//
// Routing logic:
//   _action present → Supabase database operation (always returns 200)
//   no _action + stream:true → check gate, then forward to Anthropic
//   no _action + stream:false → forward to Anthropic (scorer calls, not gated)

const FREE_RUNS_PER_DAY = 3;

const isAllowedOrigin = (o) => {
  if (!o) return false;
  if (o === "https://4cbon.vercel.app") return true;
  if (o === "https://4cbon.com") return true;
  if (o === "https://www.4cbon.com") return true;
  if (o === "http://localhost:3000") return true;
  if (o === "http://localhost:5173") return true;
  if (/^https:\/\/4cbon-[a-z0-9-]+\.vercel\.app$/.test(o)) return true;
  return false;
};

// Safely get Supabase credentials
function getCreds() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

// Get the caller's IP address from Vercel headers
function getIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

// Check if this IP has runs remaining today.
// Returns { allowed: bool, remaining: number, used: number }
async function checkRunLimit(ip) {
  const creds = getCreds();
  if (!creds) return { allowed: true, remaining: FREE_RUNS_PER_DAY, used: 0 };

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    // Look up today's count for this IP
    const res = await fetch(
      `${creds.url}/rest/v1/run_limits?ip=eq.${encodeURIComponent(ip)}&run_date=eq.${today}&select=run_count`,
      { headers: { "apikey": creds.key, "Authorization": `Bearer ${creds.key}` } }
    );
    if (!res.ok) return { allowed: true, remaining: FREE_RUNS_PER_DAY, used: 0 };

    const rows = await res.json();
    const used = rows.length > 0 ? rows[0].run_count : 0;
    const remaining = Math.max(0, FREE_RUNS_PER_DAY - used);

    return { allowed: used < FREE_RUNS_PER_DAY, remaining, used };
  } catch {
    // If check fails, allow the run — don't punish users for infra issues
    return { allowed: true, remaining: FREE_RUNS_PER_DAY, used: 0 };
  }
}

// Increment the run count for this IP today.
// Uses upsert so first run creates the row, subsequent runs increment it.
async function incrementRunCount(ip) {
  const creds = getCreds();
  if (!creds) return;

  const today = new Date().toISOString().slice(0, 10);

  try {
    // Try to insert a new row first
    const insertRes = await fetch(`${creds.url}/rest/v1/run_limits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": creds.key,
        "Authorization": `Bearer ${creds.key}`,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ ip, run_date: today, run_count: 1 }),
    });

    // If insert fails due to unique constraint (row exists), increment instead
    if (insertRes.status === 409 || insertRes.status === 400) {
      await fetch(
        `${creds.url}/rest/v1/run_limits?ip=eq.${encodeURIComponent(ip)}&run_date=eq.${today}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": creds.key,
            "Authorization": `Bearer ${creds.key}`,
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({ run_count: 999 }), // will be overridden by SQL below
        }
      );

      // Use SQL to do atomic increment
      await fetch(`${creds.url}/rest/v1/rpc/increment_run_count`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": creds.key,
          "Authorization": `Bearer ${creds.key}`,
        },
        body: JSON.stringify({ p_ip: ip, p_date: today }),
      }).catch(() => {});
    }
  } catch {} // fail silently — don't break the pipeline over counter issues
}

export default async function handler(req, res) {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ error: "Forbidden origin", origin });
    return;
  }

  const action = req.body && req.body._action;

  // ─────────────────────────────────────────────────────────
  // SUPABASE ACTION HANDLERS — always return 200
  // ─────────────────────────────────────────────────────────

  if (action === "save_belief") {
    const creds = getCreds();
    if (!creds) { res.status(200).json({ saved: false }); return; }
    const { belief, scoreBefore, scoreAfter, runNumber } = req.body;
    try {
      await fetch(`${creds.url}/rest/v1/identity_beliefs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": creds.key, "Authorization": `Bearer ${creds.key}`, "Prefer": "return=minimal" },
        body: JSON.stringify({ belief, score_before: scoreBefore, score_after: scoreAfter, run_number: runNumber }),
      });
      res.status(200).json({ saved: true });
    } catch { res.status(200).json({ saved: false }); }
    return;
  }

  if (action === "get_beliefs") {
    const creds = getCreds();
    if (!creds) { res.status(200).json({ beliefs: [] }); return; }
    try {
      const r = await fetch(`${creds.url}/rest/v1/identity_beliefs?order=created_at.desc&limit=5`, { headers: { "apikey": creds.key, "Authorization": `Bearer ${creds.key}` } });
      const beliefs = r.ok ? await r.json() : [];
      res.status(200).json({ beliefs: Array.isArray(beliefs) ? beliefs : [] });
    } catch { res.status(200).json({ beliefs: [] }); }
    return;
  }

  if (action === "save_question") {
    const creds = getCreds();
    if (!creds) { res.status(200).json({ saved: false }); return; }
    const { runId, questionText, questionLevel, questionType } = req.body;
    try {
      await fetch(`${creds.url}/rest/v1/l9_questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": creds.key, "Authorization": `Bearer ${creds.key}`, "Prefer": "return=minimal" },
        body: JSON.stringify({ run_id: runId, question_text: questionText, question_level: questionLevel, question_type: questionType }),
      });
      res.status(200).json({ saved: true });
    } catch { res.status(200).json({ saved: false }); }
    return;
  }

  if (action === "get_recent_questions") {
    const creds = getCreds();
    if (!creds) { res.status(200).json({ questions: [] }); return; }
    try {
      const r = await fetch(`${creds.url}/rest/v1/l9_questions?order=created_at.desc&limit=3`, { headers: { "apikey": creds.key, "Authorization": `Bearer ${creds.key}` } });
      const questions = r.ok ? await r.json() : [];
      res.status(200).json({ questions: Array.isArray(questions) ? questions : [] });
    } catch { res.status(200).json({ questions: [] }); }
    return;
  }

  if (action === "save_feedback") {
    const creds = getCreds();
    if (!creds) { res.status(200).json({ saved: false }); return; }
    const { evidence, confidence, critique_type, suggested_correction, run_id } = req.body;
    try {
      await fetch(`${creds.url}/rest/v1/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": creds.key, "Authorization": `Bearer ${creds.key}`, "Prefer": "return=minimal" },
        body: JSON.stringify({ evidence, confidence, critique_type, suggested_correction, run_id, injected: false }),
      });
      res.status(200).json({ saved: true });
    } catch { res.status(200).json({ saved: false }); }
    return;
  }

  if (action === "get_validated_critiques") {
    const creds = getCreds();
    if (!creds) { res.status(200).json({ critiques: [] }); return; }
    try {
      const r = await fetch(
        `${creds.url}/rest/v1/feedback?select=id,evidence,suggested_correction,confidence,run_id&critique_type=eq.Factual&confidence=gte.3&injected=eq.false&order=created_at.asc&limit=5`,
        { headers: { "apikey": creds.key, "Authorization": `Bearer ${creds.key}` } }
      );
      if (!r.ok) { res.status(200).json({ critiques: [] }); return; }
      const critiques = await r.json();
      res.status(200).json({ critiques: Array.isArray(critiques) ? critiques : [] });
    } catch { res.status(200).json({ critiques: [] }); }
    return;
  }

  if (action === "mark_critiques_injected") {
    const creds = getCreds();
    if (!creds) { res.status(200).json({ marked: 0 }); return; }
    const { ids } = req.body;
    if (!ids || ids.length === 0) { res.status(200).json({ marked: 0 }); return; }
    try {
      await Promise.all(ids.map(id =>
        fetch(`${creds.url}/rest/v1/feedback?id=eq.${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "apikey": creds.key, "Authorization": `Bearer ${creds.key}`, "Prefer": "return=minimal" },
          body: JSON.stringify({ injected: true }),
        })
      ));
      res.status(200).json({ marked: ids.length });
    } catch { res.status(200).json({ marked: 0 }); }
    return;
  }

  // Check run limit status without incrementing (for UI display)
  if (action === "get_run_status") {
    const ip = getIP(req);
    const status = await checkRunLimit(ip);
    res.status(200).json(status);
    return;
  }

  // ─────────────────────────────────────────────────────────
  // ANTHROPIC API FORWARDING
  // Streaming calls (layer execution) are gated.
  // Non-streaming calls (scorer, L9) are not gated.
  // ─────────────────────────────────────────────────────────
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "API key not configured" });
      return;
    }

    const body = req.body;
    const isStream = body.stream === true;

    // ── FREEMIUM GATE ──
    // Only gate streaming calls — these are the actual pipeline layer runs.
    // Scorer calls and L9 (non-streaming) are not gated because they're
    // internal to a run that was already gated at L0.
    if (isStream) {
      const ip = getIP(req);
      const { allowed, remaining } = await checkRunLimit(ip);

      if (!allowed) {
        // Return a special error that the frontend recognises as the run limit
        res.status(429).json({
          error: "daily_limit_reached",
          message: `You've used your ${FREE_RUNS_PER_DAY} free runs for today. Upgrade to Pro for unlimited access.`,
          remaining: 0,
        });
        return;
      }

      // Increment before the run so concurrent requests can't cheat the gate
      await incrementRunCount(ip);
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (isStream) {
      res.status(upstream.status);
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      const data = await upstream.json();
      res.status(upstream.status).json(data);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
};
