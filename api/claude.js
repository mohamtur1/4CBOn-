// api/claude.js — 4CBON Vercel Serverless Proxy
//
// This file is the secure server-side bridge between the browser
// and both Anthropic's API and Supabase. The Anthropic API key
// and Supabase service key never touch the browser — they live
// here in Vercel's environment variables only.
//
// All requests from the frontend come through this single endpoint.
// The proxy routes them based on the _action field:
//   - No _action → forward to Anthropic streaming API
//   - _action present → handle as a Supabase database operation
//
// CORS is enforced via an origin allowlist so only our own
// deployed domains can call this proxy.

const isAllowedOrigin = (o) => {
  if (!o) return false;
  if (o === "https://4cbon.vercel.app") return true;
  if (o === "https://4-cb-on.vercel.app") return true;
  if (o === "http://localhost:3000") return true;
  if (o === "http://localhost:5173") return true;
  if (/^https:\/\/4cbon-[a-z0-9-]+\.vercel\.app$/.test(o)) return true;
  return false;
};

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

  // ═══════════════════════════════════════════════════════════
  // SUPABASE ACTION HANDLERS
  // Each _action block handles one database operation and returns
  // early so the Anthropic forwarding code never runs for these.
  // ═══════════════════════════════════════════════════════════

  // Save a new L8 identity belief after each completed run.
  // This is how the system builds cross-session memory —
  // each run deposits one belief into Supabase, and the next
  // run reads the last five beliefs back and injects them into L0.
  if (req.body && req.body._action === "save_belief") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const { belief, scoreBefore, scoreAfter, runNumber } = req.body;
    try {
      await fetch(`${supabaseUrl}/rest/v1/identity_beliefs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          belief,
          score_before: scoreBefore,
          score_after: scoreAfter,
          run_number: runNumber,
        }),
      });
      res.status(200).json({ saved: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // Load the last 5 identity beliefs for injection into L0.
  // The system arrives at each new run already knowing what
  // it learned from the previous five runs.
  if (req.body && req.body._action === "get_beliefs") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/identity_beliefs?order=created_at.desc&limit=5`,
        {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
        }
      );
      const beliefs = await response.json();
      res.status(200).json({ beliefs });
    } catch {
      res.status(200).json({ beliefs: [] });
    }
    return;
  }

  // Save an L9 self-generated question to Supabase.
  // L9 fires after every run and generates 3 questions specific
  // to what just happened. These inject into the next run's L0
  // as unresolved self-questions the system should engage with.
  if (req.body && req.body._action === "save_question") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const { runId, questionText, questionLevel, questionType } = req.body;
    try {
      await fetch(`${supabaseUrl}/rest/v1/l9_questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          run_id: runId,
          question_text: questionText,
          question_level: questionLevel,
          question_type: questionType,
        }),
      });
      res.status(200).json({ saved: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // Load the 3 most recent L9 self-questions for L0 injection.
  // These are things the system noticed but didn't fully resolve
  // in the previous run — carried forward as unfinished thinking.
  if (req.body && req.body._action === "get_recent_questions") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/l9_questions?order=created_at.desc&limit=3`,
        {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
        }
      );
      const questions = await response.json();
      res.status(200).json({ questions });
    } catch {
      res.status(200).json({ questions: [] });
    }
    return;
  }

  // Save user feedback to the feedback table.
  // The feedback box appears after every completed run.
  // Factual critiques with confidence ≥3 get routed into the
  // W layer prompt on future runs by the credibility parser.
  // injected: false means this critique hasn't been used yet.
  if (req.body && req.body._action === "save_feedback") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const { evidence, confidence, critique_type, suggested_correction, run_id } = req.body;
    try {
      await fetch(`${supabaseUrl}/rest/v1/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          evidence,
          confidence,
          critique_type,
          suggested_correction,
          run_id,
          injected: false,
        }),
      });
      res.status(200).json({ saved: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // CREDIBILITY PARSER — reads Factual critiques with confidence ≥3
  // that haven't been injected yet. The frontend calls this before
  // each run and passes the results into the W layer prompt as
  // validated external ground truth. This is how human knowledge
  // about what the pipeline gets wrong flows into the world model.
  if (req.body && req.body._action === "get_validated_critiques") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/feedback?critique_type=eq.Factual&confidence=gte.3&injected=eq.false&order=created_at.asc&limit=5`,
        {
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
        }
      );
      const critiques = await response.json();
      res.status(200).json({ critiques: Array.isArray(critiques) ? critiques : [] });
    } catch {
      res.status(200).json({ critiques: [] });
    }
    return;
  }

  // CREDIBILITY PARSER — marks critiques as injected after use.
  // Each critique trains the system exactly once, then is retired.
  // The injected: true flag tells future get_validated_critiques
  // queries to skip this row so it doesn't repeat every run.
  if (req.body && req.body._action === "mark_critiques_injected") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const { ids } = req.body;
    if (!ids || ids.length === 0) {
      res.status(200).json({ marked: 0 });
      return;
    }
    try {
      // PATCH each row in parallel — faster than sequential awaits
      await Promise.all(
        ids.map(id =>
          fetch(`${supabaseUrl}/rest/v1/feedback?id=eq.${id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${supabaseKey}`,
              "Prefer": "return=minimal",
            },
            body: JSON.stringify({ injected: true }),
          })
        )
      );
      res.status(200).json({ marked: ids.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // ANTHROPIC API FORWARDING
  // If no _action matched above, this is a regular pipeline layer
  // call. Forward it to Anthropic and stream the response back.
  // ═══════════════════════════════════════════════════════════
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "API key not configured" });
      return;
    }

    const body = req.body;
    const isStream = body.stream === true;

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
