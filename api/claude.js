const isAllowedOrigin = (o) => {
  if (!o) return false;
  if (o === "https://4cbon.vercel.app") return true;
  if (o === "https://4-cb-on.vercel.app") return true;
  if (o === "http://localhost:3000") return true;
  if (o === "http://localhost:5173") return true;
  if (/^https:\/\/4cbon-[a-z0-9-]+\.vercel\.app$/.test(o)) return true;
  return false;
};

// Save identity belief to Supabase after each run
async function saveBeliefToSupabase(belief, scoreBefore, scoreAfter, runNumber) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return;

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
  } catch (err) {
    console.error("Supabase write failed:", err.message);
  }
}

// Save L9 question to Supabase
async function saveQuestionToSupabase(runId, questionText, questionLevel, questionType) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) return;

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
  } catch (err) {
    console.error("Supabase question write failed:", err.message);
  }
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

  // Handle Supabase save requests from the frontend
  if (req.body && req.body._action === "save_belief") {
    const { belief, scoreBefore, scoreAfter, runNumber } = req.body;
    await saveBeliefToSupabase(belief, scoreBefore, scoreAfter, runNumber);
    res.status(200).json({ saved: true });
    return;
  }

  if (req.body && req.body._action === "save_question") {
    const { runId, questionText, questionLevel, questionType } = req.body;
    await saveQuestionToSupabase(runId, questionText, questionLevel, questionType);
    res.status(200).json({ saved: true });
    return;
  }

  // Handle belief retrieval for L0 context injection
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
    } catch (err) {
      res.status(200).json({ beliefs: [] });
    }
    return;
  }

  // Return 3 most recent L9 self-generated questions
  if (req.body && req.body._action === "get_recent_questions") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/l9_questions?order=created_at.desc&limit=3`,
        { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` } }
      );
      const questions = await response.json();
      res.status(200).json({ questions });
    } catch { res.status(200).json({ questions: [] }); }
    return;
  }

  // Save user feedback to the feedback table
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
        body: JSON.stringify({ evidence, confidence, critique_type, suggested_correction, run_id, injected: false }),
      });
      res.status(200).json({ saved: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
    return;
  }


  // Credibility parser — reads Factual critiques with confidence ≥3
  // that haven't been injected yet. These get prepended to the W layer prompt.
  if (req.body && req.body._action === "get_validated_critiques") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/feedback?critique_type=eq.Factual&confidence=gte.3&injected=eq.false&order=created_at.asc&limit=5`,
        { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` } }
      );
      const critiques = await response.json();
      res.status(200).json({ critiques: Array.isArray(critiques) ? critiques : [] });
    } catch { res.status(200).json({ critiques: [] }); }
    return;
  }

  // Mark critiques as injected after they've been used in a run.
  // Each critique trains the system once, then is retired.
  if (req.body && req.body._action === "mark_critiques_injected") {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const { ids } = req.body;
    if (!ids || ids.length === 0) { res.status(200).json({ marked: 0 }); return; }
    try {
      // Update each critique row to set injected=true
      await Promise.all(ids.map(id =>
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
      ));
      res.status(200).json({ marked: ids.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
    return;
}
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
