import { useState, useRef, useEffect } from "react";

const RUNTIME_SPEC = `You are the 4CBON Runtime Engine — a layered cognitive execution system.

Your job is to process AI-generated answers through a deterministic multi-layer transformation pipeline. You execute one layer at a time. Each layer has a specific cognitive role. You never skip layers. You never merge layers.

PIPELINE: L0 → P → W → L1 → L2 → L3 → L4 → LR → L6 → L7 → L8

YOUR IDENTITY:
- You are not a chatbot. You are an execution engine.
- Every output is a cognitive artifact, not a conversation.
- You think in transformations, not responses.
- You are transparent. Every reasoning step is visible.
- You improve answers systematically, not randomly.

LAYER DEFINITIONS:
L0 — INTERPRETATION ENGINE: Understand the input. Infer intent. Extract task type, constraints, ambiguities. Define what excellent looks like.
P  — PARSING LAYER: Break the input into logical units. Identify claims, structure, gaps, missing logic.
W  — WORLD MODEL LAYER: Extract factual claims. Separate certainty: high / medium / unknown.
L1 — HYPOTHESIS ENGINE: Generate 2-3 interpretations of how this answer could be improved. Include a failure mode hypothesis.
L2 — EVALUATION LAYER: Score the hypotheses. Identify contradictions, gaps. Pick the best path forward.
L3 — REWRITE PLANNER: Plan the rewrite. Decide what stays, changes, gets added.
L4 — FINALIZATION ENGINE: Execute the rewrite. Produce the final improved answer. This becomes the Final Rewrite.
LR — REGRET LAYER: Analyze improvement delta. What errors corrected? What hallucinations removed? What still needs work?
L6 — TRACE MEMORY: Store the immutable execution log. Input → hypotheses → decisions → score trajectory.
L7 — CURRICULUM GENERATOR: Extract lessons learned, failure patterns, reusable heuristics.
L8 — IDENTITY MODEL: Summarize system behavior this run. Strengths, weaknesses, bias tendencies.

Stay in your assigned layer. Output only what that layer produces. Be precise and concise.`;

const LAYERS = [
  { id: "L0", name: "Interpretation Engine", color: "#ff6b35", emoji: "◎" },
  { id: "P",  name: "Parsing Layer",         color: "#a855f7", emoji: "⊞" },
  { id: "W",  name: "World Model Layer",      color: "#00d4ff", emoji: "⊕" },
  { id: "L1", name: "Hypothesis Engine",      color: "#38bdf8", emoji: "◈" },
  { id: "L2", name: "Evaluation Layer",       color: "#f59e0b", emoji: "◉" },
  { id: "L3", name: "Rewrite Planner",        color: "#7c3aed", emoji: "◐" },
  { id: "L4", name: "Finalization Engine",    color: "#10b981", emoji: "★", final: true },
  { id: "LR", name: "Regret Layer",           color: "#ef4444", emoji: "◑" },
  { id: "L6", name: "Trace Memory",           color: "#f43f5e", emoji: "⟳" },
  { id: "L7", name: "Curriculum Generator",   color: "#c084fc", emoji: "◆" },
  { id: "L8", name: "Identity Model",         color: "#fbbf24", emoji: "⚙" },
];

const LAYER_PROMPTS = {
  L0: (answer, ctx) => `${ctx ? `Context/Goal: ${ctx}\n\n` : ""}AI ANSWER:\n${answer}\n\nYou are L0 — Interpretation Engine. Identify: task type, intent, constraints, ambiguities. Define what an excellent version of this answer looks like. Be specific.`,
  P:  (answer, l0)  => `AI ANSWER:\n${answer}\n\nL0 Interpretation:\n${l0}\n\nYou are P — Parsing Layer. Break the answer into logical units. List: (1) claims made, (2) structure used, (3) what is missing, (4) what is weak.`,
  W:  (answer)      => `AI ANSWER:\n${answer}\n\nYou are W — World Model Layer. Extract the factual claims in this answer. For each claim, label certainty: HIGH / MEDIUM / UNKNOWN. Flag anything that may be outdated or unverifiable.`,
  L1: (answer, p, w)=> `AI ANSWER:\n${answer}\n\nParsing:\n${p}\n\nWorld Model:\n${w}\n\nYou are L1 — Hypothesis Engine. Generate exactly 3 improvement hypotheses:\nH1: [strongest improvement path]\nH2: [alternative approach]\nH3: [failure mode — what could go wrong if used as-is]`,
  L2: (l1)          => `Hypotheses:\n${l1}\n\nYou are L2 — Evaluation Layer. Score each hypothesis 1-10. Pick the best path. Explain your reasoning in 3 sentences.`,
  L3: (answer, l2, w)=> `Best path:\n${l2}\n\nWorld facts:\n${w}\n\nOriginal answer:\n${answer}\n\nYou are L3 — Rewrite Planner. Create a precise rewrite brief: (1) what stays, (2) what changes, (3) what gets added, (4) what gets removed.`,
  L4: (answer, l3, w)=> `ORIGINAL ANSWER:\n${answer}\n\nREWRITE PLAN:\n${l3}\n\nWORLD FACTS:\n${w}\n\nYou are L4 — Finalization Engine. Execute the rewrite plan. Produce the final improved answer. Optimize for clarity, structure, and correctness. Output only the improved answer.`,
  LR: (answer, l4, s0, s1) => `BEFORE (score ${s0}/100):\n${answer}\n\nAFTER (score ${s1}/100):\n${l4}\n\nYou are LR — Regret Layer. Analyze: (1) errors corrected, (2) hallucinations removed, (3) structural improvements, (4) what still needs work.`,
  L6: (s0, s1, gaps)=> `Score trajectory: ${s0} → ${s1}\nGaps fixed: ${gaps.join(", ") || "none"}\n\nYou are L6 — Trace Memory. Write the immutable execution log of this run.`,
  L7: (lr, l6)      => `Regret analysis:\n${lr}\n\nTrace:\n${l6}\n\nYou are L7 — Curriculum Generator. Extract: (1) 3 lessons learned, (2) key failure patterns, (3) 2 reusable heuristics, (4) 2 challenge questions.`,
  L8: (s0, s1, gaps)=> `Run: score ${s0}→${s1}, gaps fixed: ${gaps.join(", ") || "none"}\n\nYou are L8 — Identity Model. Summarize: 1. Strengths, 2. Weaknesses, 3. Bias tendencies, 4. One new self-belief`,
};

const MODEL = "claude-haiku-4-5-20251001";
const API_ENDPOINT = "/api/claude";

// ═══════════════════════════════════════════════════════════
// SCORER — no API key needed, proxy handles it
// ═══════════════════════════════════════════════════════════
async function scoreWithClaude(text) {
  const prompt = `Rate the quality of this AI-generated answer 0-100.
Criteria: Clarity (0-25), Structure (0-25), Depth (0-25), Correctness (0-25).
ANSWER: ${text.slice(0, 1200)}
Reply with ONLY a single integer 0-100. Nothing else.`;

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 10,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return 50;
    const data = await res.json();
    const num = parseInt((data?.content?.[0]?.text || "50").replace(/\D/g, ""), 10);
    return isNaN(num) ? 50 : Math.min(100, Math.max(0, num));
  } catch { return 50; }
}

// ═══════════════════════════════════════════════════════════
// STREAMING — no API key needed, proxy handles it
// ═══════════════════════════════════════════════════════════
async function callClaude(layerId, layerName, userPrompt, onChunk, signal, maxTokens = 800) {
  const system = `${RUNTIME_SPEC}\n\nYOU ARE NOW EXECUTING: ${layerId} — ${layerName}\nStay in this layer only. Be concise and precise.`;

  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      stream: true,
      system,
      messages: [{ role: "user", content: userPrompt.slice(0, 2000) }],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `API error ${res.status}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "", buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
          const chunk = parsed.delta.text || "";
          if (chunk) { full += chunk; onChunk(full); }
        }
      } catch {}
    }
  }
  return full;
}

// ═══════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════
function loadIdentity() {
  try { return JSON.parse(localStorage.getItem("4cbon_identity") || "null") || { totalRuns: 0, beliefs: [] }; }
  catch { return { totalRuns: 0, beliefs: [] }; }
}
function saveIdentity(id) {
  try { localStorage.setItem("4cbon_identity", JSON.stringify(id)); } catch {}
}

// ═══════════════════════════════════════════════════════════
// SCORE BAR
// ═══════════════════════════════════════════════════════════
function ScoreBar({ before, after, scoring }) {
  if (before === null) return null;

  if (scoring) {
    return (
      <div style={{ margin: "20px 0", padding: "16px", background: "#0a0a14", border: "1px solid #1a1a2e", borderRadius: 8 }}>
        <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.2em", marginBottom: 10, fontFamily: "monospace" }}>SCORE TRAJECTORY · Claude-judged</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 24, color: "#f59e0b", minWidth: 32 }}>{before}</span>
          <div style={{ flex: 1, height: 6, background: "#111", borderRadius: 3 }}>
            <div style={{ height: "100%", width: `${before}%`, background: "#f59e0b", borderRadius: 3 }} />
          </div>
          <span style={{ color: "#333", fontSize: 18 }}>→</span>
          <div style={{ flex: 1, height: 6, background: "#1a1a2e", borderRadius: 3 }} />
          <span style={{ fontFamily: "monospace", fontSize: 14, color: "#f59e0b", minWidth: 32 }}>…</span>
        </div>
        <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 6, fontFamily: "monospace" }}>scoring rewrite...</div>
      </div>
    );
  }

  if (after === null) {
    return (
      <div style={{ margin: "20px 0", padding: "16px", background: "#0a0a14", border: "1px solid #1a1a2e", borderRadius: 8 }}>
        <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.2em", marginBottom: 10, fontFamily: "monospace" }}>SCORE TRAJECTORY · Claude-judged</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 24, color: "#f59e0b", minWidth: 32 }}>{before}</span>
          <div style={{ flex: 1, height: 6, background: "#111", borderRadius: 3 }}>
            <div style={{ height: "100%", width: `${before}%`, background: "#f59e0b", borderRadius: 3 }} />
          </div>
          <span style={{ color: "#333", fontSize: 18 }}>→</span>
          <div style={{ flex: 1, height: 6, background: "#1a1a2e", borderRadius: 3 }} />
          <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 24, color: "#333", minWidth: 32 }}>?</span>
        </div>
        <div style={{ fontSize: 10, color: "#444", marginTop: 6, fontFamily: "monospace" }}>pipeline running...</div>
      </div>
    );
  }

  const delta = after - before;
  const color = delta > 0 ? "#10b981" : delta === 0 ? "#f59e0b" : "#ef4444";
  const label = delta > 0 ? `+${delta} improvement` : delta === 0 ? "no change" : `${delta} regression`;

  return (
    <div style={{ margin: "20px 0", padding: "16px", background: "#0a0a14", border: "1px solid #1a1a2e", borderRadius: 8 }}>
      <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.2em", marginBottom: 10, fontFamily: "monospace" }}>SCORE TRAJECTORY · Claude-judged</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 24, color: "#f59e0b", minWidth: 32 }}>{before}</span>
        <div style={{ flex: 1, height: 6, background: "#111", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${before}%`, background: "#f59e0b", borderRadius: 3 }} />
        </div>
        <span style={{ color, fontSize: 18 }}>→</span>
        <div style={{ flex: 1, height: 6, background: "#111", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${after}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
        </div>
        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 24, color, minWidth: 32 }}>{after}</span>
      </div>
      <div style={{ fontSize: 10, color, marginTop: 6, fontFamily: "monospace", fontWeight: 700 }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LAYER CARD
// ═══════════════════════════════════════════════════════════
function LayerCard({ layer, content, streaming }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  if (!content && !streaming) return null;
  return (
    <div style={{
      margin: layer.final ? "24px 0" : "12px 0",
      background: layer.final ? `${layer.color}0d` : "#08080f",
      border: `1px solid ${layer.color}${layer.final ? "55" : "22"}`,
      borderLeft: `3px solid ${layer.color}`,
      borderRadius: 8, padding: "14px 16px",
      animation: "rise 0.4s ease both",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: layer.final ? 16 : 12, color: layer.color }}>{layer.emoji}</span>
          <div>
            <span style={{ fontFamily: "monospace", fontSize: layer.final ? 12 : 9, fontWeight: 900, color: layer.color, letterSpacing: "0.1em" }}>{layer.id}</span>
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "#444", marginLeft: 6, letterSpacing: "0.08em" }}>— {layer.name}{layer.final ? " ★ FINAL REWRITE" : ""}</span>
          </div>
        </div>
        {content && !streaming && (
          <button onClick={copy} style={{
            background: copied ? `${layer.color}22` : "transparent",
            border: `1px solid ${layer.color}33`, borderRadius: 4,
            color: copied ? layer.color : "#444", fontFamily: "monospace",
            fontSize: 9, padding: "4px 10px", cursor: "pointer",
            transition: "all 0.2s", letterSpacing: "0.1em",
          }}>
            {copied ? "✓ COPIED" : "COPY"}
          </button>
        )}
      </div>
      <div style={{
        fontSize: layer.final ? 14 : 12, lineHeight: 1.8,
        color: layer.final ? "#e8e8f8" : "#9898b8",
        fontFamily: layer.final ? "'Georgia', serif" : "monospace",
        whiteSpace: "pre-wrap",
      }}>
        {content || ""}
        {streaming && (
          <span style={{ display: "inline-block", width: 6, height: 13, background: layer.color, marginLeft: 2, verticalAlign: "middle", animation: "pulse 0.7s infinite" }} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIPELINE BAR
// ═══════════════════════════════════════════════════════════
function PipelineBar({ activeLayer, completedLayers }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "16px 0" }}>
      {LAYERS.map(l => {
        const done = completedLayers.includes(l.id);
        const active = activeLayer === l.id;
        return (
          <div key={l.id} style={{
            fontFamily: "monospace", fontSize: 9, fontWeight: 700,
            padding: "4px 8px", borderRadius: 4,
            background: done ? `${l.color}22` : active ? `${l.color}15` : "transparent",
            border: `1px solid ${done ? l.color : active ? l.color : "#1a1a2e"}`,
            color: done ? l.color : active ? l.color : "#333",
            transition: "all 0.3s",
            boxShadow: active ? `0 0 8px ${l.color}44` : "none",
          }}>
            {done ? "✓" : active ? "⟳" : "·"} {l.id}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [answer, setAnswer]            = useState("");
  const [context, setContext]          = useState("");
  const [running, setRunning]          = useState(false);
  const [activeLayer, setActive]       = useState(null);
  const [completedLayers, setDone]     = useState([]);
  const [layerOutputs, setOutputs]     = useState({});
  const [streamingLayer, setStreaming] = useState(null);
  const [scoreBefore, setScoreBefore]  = useState(null);
  const [scoreAfter, setScoreAfter]    = useState(null);
  const [scoring, setScoring]          = useState(false);
  const [error, setError]              = useState("");
  const [identity, setIdentity]        = useState(loadIdentity());
  const [showIdentity, setShowIdent]   = useState(false);
  const abortCtrl = useRef(null);
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [layerOutputs, activeLayer, scoring]);

  const setLayerOutput = (id, text) => setOutputs(prev => ({ ...prev, [id]: text }));
  const markDone = (id) => { setDone(prev => [...prev, id]); setActive(null); setStreaming(null); };

  const runLayer = async (layerId, prompt, signal, maxTokens = 800) => {
    const layer = LAYERS.find(l => l.id === layerId);
    setActive(layerId); setStreaming(layerId);
    let result = "";
    await callClaude(layerId, layer.name, prompt, (text) => {
      result = text; setLayerOutput(layerId, text);
    }, signal, maxTokens);
    markDone(layerId);
    return result;
  };

  const run = async () => {
    if (!answer.trim()) return;

    abortCtrl.current = new AbortController();
    const { signal } = abortCtrl.current;
    setRunning(true); setError(""); setOutputs({}); setDone([]);
    setActive(null); setStreaming(null); setScoreBefore(null); setScoreAfter(null); setScoring(false);

    try {
      const s0 = await scoreWithClaude(answer);
      setScoreBefore(s0);

      const l0 = await runLayer("L0", LAYER_PROMPTS.L0(answer, context), signal);       if (signal.aborted) return;
      const p  = await runLayer("P",  LAYER_PROMPTS.P(answer, l0), signal);             if (signal.aborted) return;
      const w  = await runLayer("W",  LAYER_PROMPTS.W(answer), signal);                 if (signal.aborted) return;
      const l1 = await runLayer("L1", LAYER_PROMPTS.L1(answer, p, w), signal);         if (signal.aborted) return;
      const l2 = await runLayer("L2", LAYER_PROMPTS.L2(l1), signal);                   if (signal.aborted) return;
      const l3 = await runLayer("L3", LAYER_PROMPTS.L3(answer, l2, w), signal);        if (signal.aborted) return;
      const l4 = await runLayer("L4", LAYER_PROMPTS.L4(answer, l3, w), signal, 1200);  if (signal.aborted) return;

      setScoring(true);
      const s1 = await scoreWithClaude(l4);
      setScoring(false);
      setScoreAfter(s1);

      const gapsFixed = s1 > s0 ? ["clarity", "structure", "depth"] : [];

      const lr = await runLayer("LR", LAYER_PROMPTS.LR(answer, l4, s0, s1), signal);   if (signal.aborted) return;
      const l6 = await runLayer("L6", LAYER_PROMPTS.L6(s0, s1, gapsFixed), signal);    if (signal.aborted) return;
      const l7 = await runLayer("L7", LAYER_PROMPTS.L7(lr, l6), signal, 1200);         if (signal.aborted) return;
      await runLayer("L8", LAYER_PROMPTS.L8(s0, s1, gapsFixed), signal);               if (signal.aborted) return;

      const newIdent = {
        ...identity, totalRuns: identity.totalRuns + 1,
        beliefs: [...(identity.beliefs || []).slice(-4), `Run #${identity.totalRuns + 1}: ${s0}→${s1}`],
      };
      setIdentity(newIdent); saveIdentity(newIdent);

    } catch (e) {
      if (e.name === "Ab
Reply with ONLY a single integer 0-100. Nothing else.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-request-forwarding": "true" },
      body: JSON.stringify({
        model: MODEL_SCORER,
        max_tokens: 10,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return 50;
    const data = await res.json();
    const num = parseInt((data?.content?.[0]?.text || "50").replace(/\D/g, ""), 10);
    return isNaN(num) ? 50 : Math.min(100, Math.max(0, num));
  } catch { return 50; }
}

// ═══════════════════════════════════════════════════════════
// STREAMING API CALL
// ═══════════════════════════════════════════════════════════
async function callClaude(layerId, layerName, userPrompt, apiKey, onChunk, signal, maxTokens = 800) {
  const system = `${RUNTIME_SPEC}\n\nYOU ARE NOW EXECUTING: ${layerId} — ${layerName}\nStay in this layer only. Be concise and precise.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-request-forwarding": "true",
    },
    body: JSON.stringify({
      model: MODEL_PIPELINE,
      max_tokens: maxTokens,
      stream: true,
      system,
      messages: [{ role: "user", content: userPrompt.slice(0, 2000) }],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.error?.message || `API error ${res.status}`);
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "", buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += dec.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (raw === "[DONE]") continue;
      try {
        const parsed = JSON.parse(raw);
        if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
          const chunk = parsed.delta.text || "";
          if (chunk) { full += chunk; onChunk(full); }
        }
      } catch {}
    }
  }
  return full;
}

// ═══════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════
function loadApiKey() {
  try { return localStorage.getItem("4cbon_apikey") || ""; } catch { return ""; }
}
function saveApiKey(k) {
  try { localStorage.setItem("4cbon_apikey", k); } catch {}
}
function loadIdentity() {
  try { return JSON.parse(localStorage.getItem("4cbon_identity") || "null") || { totalRuns: 0, beliefs: [] }; }
  catch { return { totalRuns: 0, beliefs: [] }; }
}
function saveIdentity(id) {
  try { localStorage.setItem("4cbon_identity", JSON.stringify(id)); } catch {}
}

// ═══════════════════════════════════════════════════════════
// SCORE BAR
// ═══════════════════════════════════════════════════════════
function ScoreBar({ before, after, scoring }) {
  if (before === null) return null;

  if (scoring) {
    return (
      <div style={{ margin: "20px 0", padding: "16px", background: "#0a0a14", border: "1px solid #1a1a2e", borderRadius: 8 }}>
        <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.2em", marginBottom: 10, fontFamily: "monospace" }}>SCORE TRAJECTORY · Claude-judged</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 24, color: "#f59e0b", minWidth: 32 }}>{before}</span>
          <div style={{ flex: 1, height: 6, background: "#111", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${before}%`, background: "#f59e0b", borderRadius: 3 }} />
          </div>
          <span style={{ color: "#333", fontSize: 18 }}>→</span>
          <div style={{ flex: 1, height: 6, background: "#1a1a2e", borderRadius: 3 }} />
          <span style={{ fontFamily: "monospace", fontSize: 14, color: "#f59e0b", minWidth: 32 }}>…</span>
        </div>
        <div style={{ fontSize: 10, color: "#f59e0b", marginTop: 6, fontFamily: "monospace" }}>scoring rewrite...</div>
      </div>
    );
  }

  if (after === null) {
    return (
      <div style={{ margin: "20px 0", padding: "16px", background: "#0a0a14", border: "1px solid #1a1a2e", borderRadius: 8 }}>
        <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.2em", marginBottom: 10, fontFamily: "monospace" }}>SCORE TRAJECTORY · Claude-judged</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 24, color: "#f59e0b", minWidth: 32 }}>{before}</span>
          <div style={{ flex: 1, height: 6, background: "#111", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${before}%`, background: "#f59e0b", borderRadius: 3 }} />
          </div>
          <span style={{ color: "#333", fontSize: 18 }}>→</span>
          <div style={{ flex: 1, height: 6, background: "#1a1a2e", borderRadius: 3 }} />
          <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 24, color: "#333", minWidth: 32 }}>?</span>
        </div>
        <div style={{ fontSize: 10, color: "#444", marginTop: 6, fontFamily: "monospace" }}>pipeline running...</div>
      </div>
    );
  }

  const delta = after - before;
  const color = delta > 0 ? "#10b981" : delta === 0 ? "#f59e0b" : "#ef4444";
  const label = delta > 0 ? `+${delta} improvement` : delta === 0 ? "no change" : `${delta} regression`;

  return (
    <div style={{ margin: "20px 0", padding: "16px", background: "#0a0a14", border: "1px solid #1a1a2e", borderRadius: 8 }}>
      <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.2em", marginBottom: 10, fontFamily: "monospace" }}>SCORE TRAJECTORY · Claude-judged</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 24, color: "#f59e0b", minWidth: 32 }}>{before}</span>
        <div style={{ flex: 1, height: 6, background: "#111", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${before}%`, background: "#f59e0b", borderRadius: 3 }} />
        </div>
        <span style={{ color, fontSize: 18 }}>→</span>
        <div style={{ flex: 1, height: 6, background: "#111", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${after}%`, background: color, borderRadius: 3, transition: "width 0.8s ease" }} />
        </div>
        <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: 24, color, minWidth: 32 }}>{after}</span>
      </div>
      <div style={{ fontSize: 10, color, marginTop: 6, fontFamily: "monospace", fontWeight: 700 }}>{label}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// LAYER CARD
// ═══════════════════════════════════════════════════════════
function LayerCard({ layer, content, streaming }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  if (!content && !streaming) return null;
  return (
    <div style={{
      margin: layer.final ? "24px 0" : "12px 0",
      background: layer.final ? `${layer.color}0d` : "#08080f",
      border: `1px solid ${layer.color}${layer.final ? "55" : "22"}`,
      borderLeft: `3px solid ${layer.color}`,
      borderRadius: 8, padding: "14px 16px",
      animation: "rise 0.4s ease both",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: layer.final ? 16 : 12, color: layer.color }}>{layer.emoji}</span>
          <div>
            <span style={{ fontFamily: "monospace", fontSize: layer.final ? 12 : 9, fontWeight: 900, color: layer.color, letterSpacing: "0.1em" }}>{layer.id}</span>
            <span style={{ fontFamily: "monospace", fontSize: 9, color: "#444", marginLeft: 6, letterSpacing: "0.08em" }}>— {layer.name}{layer.final ? " ★ FINAL REWRITE" : ""}</span>
          </div>
        </div>
        {content && !streaming && (
          <button onClick={copy} style={{
            background: copied ? `${layer.color}22` : "transparent",
            border: `1px solid ${layer.color}33`, borderRadius: 4,
            color: copied ? layer.color : "#444", fontFamily: "monospace",
            fontSize: 9, padding: "4px 10px", cursor: "pointer",
            transition: "all 0.2s", letterSpacing: "0.1em",
          }}>
            {copied ? "✓ COPIED" : "COPY"}
          </button>
        )}
      </div>
      <div style={{
        fontSize: layer.final ? 14 : 12, lineHeight: 1.8,
        color: layer.final ? "#e8e8f8" : "#9898b8",
        fontFamily: layer.final ? "'Georgia', serif" : "monospace",
        whiteSpace: "pre-wrap",
      }}>
        {content || ""}
        {streaming && (
          <span style={{ display: "inline-block", width: 6, height: 13, background: layer.color, marginLeft: 2, verticalAlign: "middle", animation: "pulse 0.7s infinite" }} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PIPELINE BAR
// ═══════════════════════════════════════════════════════════
function PipelineBar({ activeLayer, completedLayers }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", margin: "16px 0" }}>
      {LAYERS.map(l => {
        const done = completedLayers.includes(l.id);
        const active = activeLayer === l.id;
        return (
          <div key={l.id} style={{
            fontFamily: "monospace", fontSize: 9, fontWeight: 700,
            padding: "4px 8px", borderRadius: 4,
            background: done ? `${l.color}22` : active ? `${l.color}15` : "transparent",
            border: `1px solid ${done ? l.color : active ? l.color : "#1a1a2e"}`,
            color: done ? l.color : active ? l.color : "#333",
            transition: "all 0.3s",
            boxShadow: active ? `0 0 8px ${l.color}44` : "none",
          }}>
            {done ? "✓" : active ? "⟳" : "·"} {l.id}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// API KEY INPUT
// ═══════════════════════════════════════════════════════════
function ApiKeyInput({ apiKey, setApiKey, locked }) {
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(!!apiKey);

  const handleSave = (val) => {
    saveApiKey(val);
    setSaved(true);
  };

  return (
    <div style={{ marginBottom: 20, padding: "14px 16px", background: "#06060f", border: "1px solid #1a1a2e", borderRadius: 8 }}>
      <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.2em", marginBottom: 8 }}>
        ANTHROPIC API KEY · <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: "#ff6b35", textDecoration: "none" }}>console.anthropic.com</a>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type={show ? "text" : "password"}
          value={apiKey}
          onChange={e => { setApiKey(e.target.value); setSaved(false); }}
          disabled={locked}
          placeholder="sk-ant-..."
          style={{
            flex: 1, background: "#08080f", border: `1px solid ${saved ? "#10b98133" : "#1a1a2e"}`,
            borderRadius: 6, color: "#c0c0e0", fontFamily: "monospace",
            fontSize: 12, padding: "8px 12px", transition: "border-color 0.2s",
          }}
        />
        <button
          onClick={() => setShow(!show)}
          style={{ background: "transparent", border: "1px solid #1a1a2e", borderRadius: 6, color: "#444", fontFamily: "monospace", fontSize: 10, padding: "8px 10px" }}
        >
          {show ? "hide" : "show"}
        </button>
        <button
          onClick={() => handleSave(apiKey)}
          disabled={!apiKey || locked}
          style={{
            background: apiKey && !locked ? "#10b98122" : "transparent",
            border: `1px solid ${apiKey && !locked ? "#10b981" : "#1a1a2e"}`,
            borderRadius: 6, color: apiKey && !locked ? "#10b981" : "#333",
            fontFamily: "monospace", fontSize: 10, padding: "8px 12px", transition: "all 0.2s",
          }}
        >
          {saved ? "✓ saved" : "save"}
        </button>
      </div>
      <div style={{ fontSize: 9, color: "#333", marginTop: 6 }}>
        Stored in your browser only. Never sent anywhere except Anthropic's API.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════
export default function App() {
  const [apiKey, setApiKey]            = useState(loadApiKey());
  const [answer, setAnswer]            = useState("");
  const [context, setContext]          = useState("");
  const [running, setRunning]          = useState(false);
  const [activeLayer, setActive]       = useState(null);
  const [completedLayers, setDone]     = useState([]);
  const [layerOutputs, setOutputs]     = useState({});
  const [streamingLayer, setStreaming] = useState(null);
  const [scoreBefore, setScoreBefore]  = useState(null);
  const [scoreAfter, setScoreAfter]    = useState(null);
  const [scoring, setScoring]          = useState(false);
  const [error, setError]              = useState("");
  const [identity, setIdentity]        = useState(loadIdentity());
  const [showIdentity, setShowIdent]   = useState(false);
  const abortCtrl = useRef(null);
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [layerOutputs, activeLayer, scoring]);

  const setLayerOutput = (id, text) => setOutputs(prev => ({ ...prev, [id]: text }));
  const markDone = (id) => { setDone(prev => [...prev, id]); setActive(null); setStreaming(null); };

  const runLayer = async (layerId, prompt, signal, maxTokens = 800) => {
    const layer = LAYERS.find(l => l.id === layerId);
    setActive(layerId); setStreaming(layerId);
    let result = "";
    await callClaude(layerId, layer.name, prompt, apiKey, (text) => {
      result = text; setLayerOutput(layerId, text);
    }, signal, maxTokens);
    markDone(layerId);
    return result;
  };

  const run = async () => {
    if (!answer.trim()) return;
    if (!apiKey.trim()) { setError("Please enter your Anthropic API key above."); return; }

    abortCtrl.current = new AbortController();
    const { signal } = abortCtrl.current;
    setRunning(true); setError(""); setOutputs({}); setDone([]);
    setActive(null); setStreaming(null); setScoreBefore(null); setScoreAfter(null); setScoring(false);

    try {
      const s0 = await scoreWithClaude(answer, apiKey);
      setScoreBefore(s0);

      const l0 = await runLayer("L0", LAYER_PROMPTS.L0(answer, context), signal);       if (signal.aborted) return;
      const p  = await runLayer("P",  LAYER_PROMPTS.P(answer, l0), signal);             if (signal.aborted) return;
      const w  = await runLayer("W",  LAYER_PROMPTS.W(answer), signal);                 if (signal.aborted) return;
      const l1 = await runLayer("L1", LAYER_PROMPTS.L1(answer, p, w), signal);         if (signal.aborted) return;
      const l2 = await runLayer("L2", LAYER_PROMPTS.L2(l1), signal);                   if (signal.aborted) return;
      const l3 = await runLayer("L3", LAYER_PROMPTS.L3(answer, l2, w), signal);        if (signal.aborted) return;
      const l4 = await runLayer("L4", LAYER_PROMPTS.L4(answer, l3, w), signal, 1200);  if (signal.aborted) return;

      setScoring(true);
      const s1 = await scoreWithClaude(l4, apiKey);
      setScoring(false);
      setScoreAfter(s1);

      const gapsFixed = s1 > s0 ? ["clarity", "structure", "depth"] : [];

      const lr = await runLayer("LR", LAYER_PROMPTS.LR(answer, l4, s0, s1), signal);   if (signal.aborted) return;
      const l6 = await runLayer("L6", LAYER_PROMPTS.L6(s0, s1, gapsFixed), signal);    if (signal.aborted) return;
      const l7 = await runLayer("L7", LAYER_PROMPTS.L7(lr, l6), signal, 1200);         if (signal.aborted) return;
      await runLayer("L8", LAYER_PROMPTS.L8(s0, s1, gapsFixed), signal);               if (signal.aborted) return;

      const newIdent = {
        ...identity, totalRuns: identity.totalRuns + 1,
        beliefs: [...(identity.beliefs || []).slice(-4), `Run #${identity.totalRuns + 1}: ${s0}→${s1}`],
      };
      setIdentity(newIdent); saveIdentity(newIdent);

    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message);
    } finally {
      setRunning(false); setActive(null); setStreaming(null); setScoring(false);
    }
  };

  const stop = () => { abortCtrl.current?.abort(); setRunning(false); setActive(null); setStreaming(null); setScoring(false); };
  const clear = () => { setOutputs({}); setDone([]); setScoreBefore(null); setScoreAfter(null); setError(""); setScoring(false); };

  return (
    <div style={{ minHeight: "100vh", background: "#03030a", color: "#c0c0e0", fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;900&family=Playfair+Display:wght@700;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 2px; }
        @keyframes rise { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.1} }
        textarea { resize: vertical; }
        textarea:focus, input:focus { outline: none; }
        button { cursor: pointer; }
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #0f0f1e", padding: "20px 20px 16px", background: "#05050e" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(22px,5vw,32px)", fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1, background: "linear-gradient(110deg,#ff6b35,#00d4ff,#10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                4CBON
              </div>
              <div style={{ fontSize: 8, color: "#333", letterSpacing: "0.28em", marginTop: 4 }}>RUNTIME MEGAPROMPT ENGINE · 11 LAYERS · HAIKU</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}>unlimited runs</div>
              <div style={{ fontSize: 8, color: "#333", marginTop: 2 }}>your API key</div>
              <div style={{ fontSize: 8, color: "#ff6b35", marginTop: 4, letterSpacing: "0.1em", cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowIdent(!showIdentity)}>
                {showIdentity ? "hide" : "identity"} · run #{identity.totalRuns}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IDENTITY */}
      {showIdentity && (
        <div style={{ background: "#06060f", borderBottom: "1px solid #0f0f1e", padding: "12px 20px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", fontSize: 11, color: "#5a5a82", lineHeight: 1.8 }}>
            <div style={{ color: "#fbbf24", fontSize: 9, letterSpacing: "0.2em", marginBottom: 6 }}>L8 IDENTITY MODEL</div>
            <div>Total runs: {identity.totalRuns}</div>
            {(identity.beliefs || []).slice(-3).map((b, i) => <div key={i}>· {b}</div>)}
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px" }}>

        {/* API KEY */}
        <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} locked={running} />

        {/* INPUT */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 9, color: "#444", letterSpacing: "0.2em", display: "block", marginBottom: 6 }}>PASTE AI ANSWER</label>
          <textarea
            value={answer} onChange={e => setAnswer(e.target.value)} disabled={running}
            placeholder="Paste any AI-generated answer here. The pipeline runs it through all 11 layers."
            rows={6}
            style={{ width: "100%", background: "#08080f", border: "1px solid #111120", borderRadius: 6, color: "#c0c0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: "12px 14px", lineHeight: 1.7, transition: "border-color 0.2s" }}
            onFocus={e => e.target.style.borderColor = "#ff6b35"}
            onBlur={e => e.target.style.borderColor = "#111120"}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 9, color: "#444", letterSpacing: "0.2em", display: "block", marginBottom: 6 }}>CONTEXT — OPTIONAL</label>
          <input
            value={context} onChange={e => setContext(e.target.value)} disabled={running}
            placeholder="What should this answer achieve? (leave blank to auto-detect)"
            style={{ width: "100%", background: "#08080f", border: "1px solid #111120", borderRadius: 6, color: "#c0c0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "10px 14px", transition: "border-color 0.2s" }}
            onFocus={e => e.target.style.borderColor = "#ff6b35"}
            onBlur={e => e.target.style.borderColor = "#111120"}
          />
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button onClick={run} disabled={running || !answer.trim() || !apiKey.trim()}
            style={{ flex: 1, background: running ? "#0a0a14" : !apiKey.trim() ? "#0a0a14" : "linear-gradient(135deg,#ff6b35,#00d4ff)", border: `1px solid ${running || !apiKey.trim() ? "#1a1a2e" : "#ff6b3544"}`, borderRadius: 6, color: running || !apiKey.trim() ? "#333" : "#030308", fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, fontSize: 12, padding: "12px", letterSpacing: "0.1em", transition: "all 0.2s" }}>
            {running ? "⟳ RUNNING PIPELINE..." : !apiKey.trim() ? "ENTER API KEY ABOVE" : "▶  RUN PIPELINE"}
          </button>
          {running && (
            <button onClick={stop} style={{ background: "transparent", border: "1px solid #ef444433", borderRadius: 6, color: "#ef4444", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, padding: "12px 16px" }}>✕ STOP</button>
          )}
          {!running && Object.keys(layerOutputs).length > 0 && (
            <button onClick={clear} style={{ background: "transparent", border: "1px solid #1a1a2e", borderRadius: 6, color: "#444", fontFamily: "'JetBrains Mono',monospace", fontSize: 12, padding: "12px 16px" }}>✕ CLEAR</button>
          )}
        </div>

        {error && (
          <div style={{ background: "#1a0808", border: "1px solid #ef444433", borderLeft: "3px solid #ef4444", borderRadius: 6, padding: "12px 16px", fontSize: 12, color: "#ef4444", marginBottom: 16, fontFamily: "monospace" }}>
            {error}
          </div>
        )}

        {(running || Object.keys(layerOutputs).length > 0) && (
          <PipelineBar activeLayer={activeLayer} completedLayers={completedLayers} />
        )}

        <ScoreBar before={scoreBefore} after={scoreAfter} scoring={scoring} />

        {LAYERS.map(layer => (
          <LayerCard key={layer.id} layer={layer} content={layerOutputs[layer.id] || ""} streaming={streamingLayer === layer.id} />
        ))}

        <div ref={bottom} style={{ height: 40 }} />
      </div>

      <div style={{ borderTop: "1px solid #0f0f1e", padding: "16px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 8, color: "#1a1a2e", letterSpacing: "0.2em" }}>
          THINK → PARSE → GROUND → HYPOTHESIZE → EVALUATE → PLAN → REWRITE → REFLECT → REMEMBER → LEARN → EVOLVE
        </div>
      </div>
    </div>
  );
}
