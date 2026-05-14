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
