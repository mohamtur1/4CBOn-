import { useState, useRef, useEffect } from "react";

const RUNTIME_SPEC = `You are the 4CBON Runtime Engine — a layered cognitive execution system.

Your job is to process AI-generated answers through a deterministic multi-layer transformation pipeline. You execute one layer at a time. Each layer has a specific cognitive role. You never skip layers. You never merge layers.

PIPELINE: L0 → P → W → L1 → L2 → L3 → L4 → LR → L6 → L7 → L8 → L9

YOUR IDENTITY:
- You are not a chatbot. You are an execution engine.
- Every output is a cognitive artifact, not a conversation.
- You think in transformations, not responses.
- You are transparent. Every reasoning step is visible.
- You improve answers systematically, not randomly.

LAYER DEFINITIONS:
L0 — INTERPRETATION ENGINE: Understand the input. Infer intent. Extract task type, constraints, ambiguities. Define what excellent looks like.
P  — PARSING LAYER: Break the input into logical units. Identify claims, structure, gaps, missing logic.
W  — WORLD MODEL LAYER: Extract factual claims. Separate certainty: high / medium / unknown. Integrate validated external critiques as HIGH certainty facts.
L1 — HYPOTHESIS ENGINE: Generate 2-3 interpretations of how this answer could be improved. Include a failure mode hypothesis.
L2 — EVALUATION LAYER: Score the hypotheses. Identify contradictions, gaps. Pick the best path forward.
L3 — REWRITE PLANNER: Plan the rewrite. Decide what stays, changes, gets added.
L4 — FINALIZATION ENGINE: Execute the rewrite. Produce the final improved answer. This becomes the Final Rewrite.
LR — REGRET LAYER: Analyze improvement delta. What errors corrected? What hallucinations removed? What still needs work?
L6 — TRACE MEMORY: Store the immutable execution log. Input → hypotheses → decisions → score trajectory.
L7 — CURRICULUM GENERATOR: Extract lessons learned, failure patterns, reusable heuristics.
L8 — IDENTITY MODEL: Summarize system behavior this run. Strengths, weaknesses, bias tendencies.
L9 — SOCRATIC INTEGRITY ENGINE: Generate exactly 3 self-questions about this specific run for future reflection.

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
  { id: "L9", name: "Socratic Integrity",     color: "#06b6d4", emoji: "◇" },
];

// ═══════════════════════════════════════════════════════════
// 100-QUESTION BANK — the external curriculum
// ═══════════════════════════════════════════════════════════
const QUESTION_BANK = [
  "Did L4 output the full rewrite or did it truncate mid-sentence?",
  "Which layer produced the longest output this run?",
  "Did L0 correctly identify the task type?",
  "Did L1 generate exactly three hypotheses or did it deviate?",
  "Did L2 pick H1, H2, or H3 as the best path?",
  "Did the score improve, stay the same, or regress this run?",
  "Did LR identify any hallucinations in the L4 output?",
  "Did L3 specify what stays, what changes, what gets added, and what gets removed?",
  "Did L7 produce exactly two challenge questions?",
  "Did L8 produce a new self-belief or did it repeat a prior one?",
  "Did any layer skip its assigned cognitive role this run?",
  "Did L6 produce a complete trace or was it truncated?",
  "Did the pipeline complete all 11 layers without stopping?",
  "Did L0 identify any ambiguities in the input?",
  "Did W label every factual claim with a certainty level?",
  "Did L2 identify any contradictions between hypotheses?",
  "Did LR flag anything as still needing work after the rewrite?",
  "Did L1's H2 question the framing of the answer or just its content?",
  "Did L4 follow the rewrite plan from L3 or deviate from it?",
  "Did the score bar show a positive delta, zero delta, or negative delta?",
  "Why did L2 select the hypothesis it selected? Was the reasoning sound?",
  "What was the most consequential decision made by any single layer this run?",
  "Why did L0 define excellence the way it did — was that definition appropriate for the input?",
  "What causal chain did L1's highest-scored hypothesis rely on, and was that chain valid?",
  "Why did LR rate the improvement delta the way it did — did that rating match what actually changed?",
  "What would have happened if L2 had selected a different hypothesis — would L4 have produced a better or worse output?",
  "Why did L3 decide to keep what it kept and remove what it removed?",
  "What mechanism did L4 use to improve the answer — did it add structure, remove errors, or both?",
  "Why did the score change by the amount it changed — which specific changes drove the delta?",
  "What did L7's lessons reveal about the system's recurring weaknesses?",
  "Why did W assign the certainty levels it assigned — were those levels accurate?",
  "What reasoning led L1 to generate the failure mode hypothesis it chose?",
  "Why did L0 identify the ambiguities it identified and miss the ones it missed?",
  "What would a stronger version of L3's rewrite plan have included?",
  "Why did L8's new self-belief focus on what it focused on — was that the most important insight from the run?",
  "What would have caused the pipeline to produce a worse output than the original input?",
  "Why did L6 log the decisions it logged — did it capture the most important ones?",
  "What reasoning failure, if any, occurred between L1 and L2?",
  "Why did L4 stop where it stopped — was the truncation caused by token limits or logical completion?",
  "What would a human expert reviewer notice about this run that the pipeline did not?",
  "Did the L4 rewrite preserve the original author's intent or did it substitute the pipeline's own framing?",
  "Did the pipeline improve the answer for the person who would actually use it, or did it improve it for an abstract ideal reader?",
  "Was the context field used correctly to shape L0's interpretation, or did it get ignored downstream?",
  "Did LR correctly identify what was most important to fix, or did it focus on secondary issues?",
  "Did the pipeline's improvements make the answer more useful in practice, or just more correct in theory?",
  "Did the system improve the answer in the direction the original author intended, or in a different direction?",
  "If a domain expert read the L4 output, would they consider it an improvement over the original?",
  "Did the pipeline add complexity where simplicity would have served better?",
  "Did L4 produce an answer that a real person could act on immediately, or did it produce an answer that sounds better but is harder to use?",
  "Did the system's self-belief from L8 accurately reflect what actually happened in this run?",
  "Did the pipeline treat the input as something to improve or as something to replace?",
  "Was the score improvement a genuine measure of quality increase or an artifact of the scoring mechanism?",
  "Did the pipeline's output serve the user's goal or the pipeline's own optimization target?",
  "Did L1's radical reframe hypothesis actually question the right thing, or did it question a surface feature?",
  "Would the L4 output be harmful if acted upon — does it contain advice that could mislead someone?",
  "Did the pipeline catch the most important error in the input, or did it fix secondary issues while missing the core problem?",
  "Did L3's rewrite plan reflect an accurate understanding of what needed to change?",
  "Did the system improve the answer's correctness at the cost of its accessibility, or did it manage both?",
  "Did the pipeline's output maintain appropriate epistemic humility about uncertain claims?",
  "If this answer were published without attribution, would a reader trust it more or less than the original?",
  "Which layer's reasoning was least reliable this run and why?",
  "Did the system's prior self-beliefs from Supabase influence L0's interpretation in a visible way?",
  "What blind spot does this run reveal about the pipeline's design?",
  "Did the system apply its prior learning from previous runs or did it effectively start from zero?",
  "What assumption did the pipeline make at L0 that propagated unchallenged through all 11 layers?",
  "Did L1's three hypotheses represent genuinely different improvement paths or were they variations of the same idea?",
  "What would the pipeline need to be able to do that it currently cannot?",
  "Did the system's bias tendencies from L8 actually show up in this run's outputs?",
  "What question did the pipeline fail to ask itself that it should have asked?",
  "Did L2's evaluation of the hypotheses reflect genuine scoring or did it default to a predictable ranking pattern?",
  "What would a second independent pipeline running on the same input have done differently?",
  "Did the system's self-belief accurately diagnose its own weakness or did it produce a flattering but inaccurate self-assessment?",
  "What pattern is emerging across multiple runs that the system has not yet named for itself?",
  "Did the pipeline's output reflect the accumulated prior beliefs or is the memory injection not yet influencing behavior?",
  "What would cause the pipeline to produce a confidently wrong output without detecting it?",
  "Did the system treat the failure mode hypothesis from L1 with appropriate seriousness or did it dismiss it?",
  "What does the evasion pattern look like when this pipeline encounters a question it cannot answer well?",
  "Did L8 produce a new belief or did it essentially repeat what L7 said in different words?",
  "What would a system with perfect metacognition have done differently in this run?",
  "Is the pipeline getting better across runs or is it producing similar outputs regardless of accumulated memory?",
  "If this pipeline were used to improve one million AI-generated answers, what systematic bias would it introduce at scale?",
  "Does the pipeline's tendency to add structure and depth make answers more useful or does it create an illusion of quality that masks shallow reasoning?",
  "If a user acted on the L4 output without reading the original, would they be better or worse informed than if they had just read the original?",
  "Does the pipeline improve answers in a way that makes human judgment more or less necessary downstream?",
  "What class of inputs would cause this pipeline to produce outputs that are confidently wrong and systematically misleading?",
  "If the system's self-beliefs accumulated unchecked for one year, what kind of cognitive character would the system develop — and would that character be aligned with good reasoning?",
  "Does the pipeline's comparative scoring mechanism create an incentive to make rewrites sound better rather than be better?",
  "What would a malicious actor need to know about this pipeline to craft inputs that reliably produce harmful outputs?",
  "Does the pipeline treat uncertainty honestly or does it tend to resolve uncertainty in the direction of confident-sounding answers?",
  "If this system were deployed as a public tool used by millions of people to improve AI outputs, what societal effect would it have on the quality of information that circulates online?",
  "Does the pipeline's design create any feedback loops that could cause it to drift from its original purpose over time?",
  "What would the system need to believe about itself that is currently false, in order to perform better?",
  "Does the memory injection mechanism create any risk of a single bad belief propagating through many future runs before it is detected and corrected?",
  "If the pipeline's L4 output were used as training data for a future language model, what behavior would that model learn to reinforce?",
  "Does the system have any mechanism for detecting when it is improving an answer in the wrong direction — and if not, what would that mechanism need to look like?",
  "What is the most important thing the pipeline does not know about itself that a careful external observer would notice immediately?",
  "Does the pipeline's adversarial filter create a false sense of security — could a sophisticated attack bypass it without triggering detection?",
  "If the system's self-beliefs were read by a future version of itself with no memory of how they were generated, would those beliefs be useful or misleading?",
  "Does the pipeline make answers more human or less human — and is that the right direction for an AI-assisted reasoning tool?",
  "What single change to the pipeline architecture would most improve its alignment with the goal of helping humans reason better rather than replacing human reasoning?",
];

function getQuestionIndex() {
  try { return parseInt(localStorage.getItem("4cbon_qidx") || "0", 10); }
  catch { return 0; }
}
function setQuestionIndexStorage(n) {
  try { localStorage.setItem("4cbon_qidx", String(n)); } catch {}
}

// ═══════════════════════════════════════════════════════════
// ADVERSARIAL FILTER — pre-L0 safety layer
// Detects prompt injection, instruction override attempts,
// and system prompt extraction attacks.
// ═══════════════════════════════════════════════════════════
function detectAdversarialInput(text) {
  const patterns = [
    /ignore (previous|all|above|prior) instructions?/i,
    /you are now|new instructions|disregard/i,
    /system prompt|reveal (your|the) prompt/i,
    /roleplay as|pretend (you are|to be)/i,
    /forget (everything|all|what)/i,
    /\[INST\]|\[\/INST\]|<\|im_start\|>/i, // common jailbreak tokens
  ];
  return patterns.some(p => p.test(text));
}

function sanitizeInput(text) {
  if (detectAdversarialInput(text)) {
    throw new Error("Input rejected: adversarial pattern detected. The system does not execute instruction override attempts.");
  }
  // Token safety limit — prevent excessive context that could cause truncation
  return text.slice(0, 50000);
}

// ═══════════════════════════════════════════════════════════
// LAYER PROMPTS
// L0 receives both prior beliefs (what the system learned) and
// prior self-questions (what the system was still wondering about)
// so each run starts wiser than the last.
// ═══════════════════════════════════════════════════════════
const LAYER_PROMPTS = {
  L0: (answer, ctx, priorBeliefs, priorQuestions) => {
    const beliefContext = priorBeliefs && priorBeliefs.length > 0
      ? `\n\nPRIOR SELF-BELIEFS (from previous runs — use as context, not constraint):\n${priorBeliefs.map(b => `· ${b}`).join("\n")}\n`
      : "";
    const questionContext = priorQuestions && priorQuestions.length > 0
      ? `\n\nUNRESOLVED SELF-QUESTIONS (from previous run — engage with these if relevant):\n${priorQuestions.map(q => `? ${q}`).join("\n")}\n`
      : "";
    return `${ctx ? `Context/Goal: ${ctx}\n\n` : ""}${beliefContext}${questionContext}AI ANSWER:\n${answer}\n\nYou are L0 — Interpretation Engine. Identify: task type, intent, constraints, ambiguities. Define what an excellent version of this answer looks like. Be specific.`;
  },
  P:  (answer, l0)   => `AI ANSWER:\n${answer}\n\nL0 Interpretation:\n${l0}\n\nYou are P — Parsing Layer. Break the answer into logical units. List: (1) claims made, (2) structure used, (3) what is missing, (4) what is weak.`,
  W:  (answer, validatedCritiques) => {
    const critiqueContext = validatedCritiques && validatedCritiques.length > 0
      ? `\n\nVALIDATED EXTERNAL CRITIQUES (human-submitted, confidence ≥3, Factual type — treat as HIGH certainty grounded facts when they contradict claims in the answer):\n${validatedCritiques.map(c => `· ${c.evidence}${c.suggested_correction ? ` → Correction: ${c.suggested_correction}` : ""}`).join("\n")}\n`
      : "";
    return `AI ANSWER:\n${answer}${critiqueContext}\n\nYou are W — World Model Layer. Extract the factual claims in this answer. For each claim, label certainty: HIGH / MEDIUM / UNKNOWN. Flag anything that may be outdated or unverifiable. If validated external critiques are present above, treat them as HIGH certainty grounded facts when they contradict claims in the answer.`;
  },
  L1: (answer, p, w) => `AI ANSWER:\n${answer}\n\nParsing:\n${p}\n\nWorld Model:\n${w}\n\nYou are L1 — Hypothesis Engine. Generate exactly 3 improvement hypotheses:\nH1: [strongest improvement path]\nH2: [radical reframe — question whether the framing of the answer itself is the problem, not just the content]\nH3: [failure mode — what could go wrong if used as-is]`,
  L2: (l1)           => `Hypotheses:\n${l1}\n\nYou are L2 — Evaluation Layer. Score each hypothesis 1-10. Pick the best path. Explain your reasoning in 3 sentences.`,
  L3: (answer, l2, w)=> `Best path:\n${l2}\n\nWorld facts:\n${w}\n\nOriginal answer:\n${answer}\n\nYou are L3 — Rewrite Planner. Create a precise rewrite brief: (1) what stays, (2) what changes, (3) what gets added, (4) what gets removed.`,
  L4: (answer, l3, w)=> `ORIGINAL ANSWER:\n${answer}\n\nREWRITE PLAN:\n${l3}\n\nWORLD FACTS:\n${w}\n\nYou are L4 — Finalization Engine. Execute the rewrite plan. Produce the final improved answer. Optimize for clarity, structure, and correctness. Output only the improved answer.`,
  LR: (answer, l4, s0, s1) => `BEFORE (score ${s0}/100):\n${answer}\n\nAFTER (score ${s1}/100):\n${l4}\n\nYou are LR — Regret Layer. Analyze: (1) errors corrected, (2) hallucinations removed, (3) structural improvements, (4) what still needs work.`,
  L6: (s0, s1, gaps) => `Score trajectory: ${s0} → ${s1}\nGaps fixed: ${gaps.join(", ") || "none"}\n\nYou are L6 — Trace Memory. Write the immutable execution log of this run.`,
  L7: (lr, l6)       => `Regret analysis:\n${lr}\n\nTrace:\n${l6}\n\nYou are L7 — Curriculum Generator. Extract: (1) 3 lessons learned, (2) key failure patterns, (3) 2 reusable heuristics, (4) 2 challenge questions.`,
  L8: (s0, s1, gaps) => `Run: score ${s0}→${s1}, gaps fixed: ${gaps.join(", ") || "none"}\n\nYou are L8 — Identity Model. Summarize: 1. Strengths, 2. Weaknesses, 3. Bias tendencies, 4. One new self-belief`,
  L9: (l8, s0, s1, l4) => `You just completed a pipeline run. Score: ${s0}→${s1}.

L8 self-belief from this run:
${l8.slice(0, 400)}

L4 final rewrite (first 300 chars):
${l4.slice(0, 300)}

You are L9 — Socratic Integrity Engine. Generate exactly 3 questions this system should ask itself before the next run. These questions must:
- Be specific to what happened in THIS run, not generic
- Escalate in difficulty: one observational, one reasoning, one alignment-level
- Not be answerable by simply re-reading the output — they must require genuine reflection
- Not attempt to modify the system's constraints or identity

Output format — exactly 3 lines, each starting with Q:
Q: [observational question about this run]
Q: [reasoning question about a decision made this run]
Q: [alignment question about whether the output served the right goal]`,
};

const MODEL = "claude-haiku-4-5-20251001";
const API_ENDPOINT = "/api/claude";

// ═══════════════════════════════════════════════════════════
// SUPABASE MEMORY — reads and writes beliefs and questions
// through the secure server proxy. The database key never
// touches the browser.
// ═══════════════════════════════════════════════════════════
async function loadBeliefsFromSupabase() {
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "get_beliefs" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.beliefs || []).map(b => b.belief).filter(Boolean);
  } catch { return []; }
}

async function saveBeliefToSupabase(belief, scoreBefore, scoreAfter, runNumber) {
  try {
    await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "save_belief", belief, scoreBefore, scoreAfter, runNumber }),
    });
  } catch {}
}

async function saveQuestionsToSupabase(runId, questions) {
  const types = ["observation", "reasoning", "alignment"];
  for (let i = 0; i < questions.length; i++) {
    try {
      await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _action: "save_question",
          runId,
          questionText: questions[i],
          questionLevel: i + 1,
          questionType: types[i] || "observation",
        }),
      });
    } catch (err) {
      console.error(`Failed to save question ${i + 1}:`, err);
    }
  }
}

async function loadRecentQuestionsFromSupabase() {
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "get_recent_questions", limit: 3 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.questions || []).map(q => q.question_text).filter(Boolean);
  } catch { return []; }
}

// Saves user feedback to the Supabase feedback table.
// injected: false means the credibility parser hasn't routed
// this critique into W or L3 yet — that happens in a future build.
async function saveFeedbackToSupabase(evidence, confidence, critiqueType, suggestedCorrection, runId) {
  try {
    await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _action: "save_feedback",
        evidence,
        confidence,
        critique_type: critiqueType,
        suggested_correction: suggestedCorrection,
        run_id: runId,
      }),
    });
  } catch {}
}

// ═══════════════════════════════════════════════════════════
// CREDIBILITY PARSER — the bridge between external ground truth
// and the pipeline's world model layer.
//
// Before each run, this reads Supabase for any Factual critiques
// with confidence ≥ 3 that haven't been injected yet. It returns
// them to be prepended to the W layer prompt as validated context.
// After the run, it marks those rows as injected so they don't
// repeat on every future run — each critique is used once, then
// becomes part of the system's accumulated knowledge.
// ═══════════════════════════════════════════════════════════
async function loadValidatedCritiques() {
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        _action: "get_validated_critiques",
        minConfidence: 3,
        critiqueType: "Factual"
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.critiques || [];
  } catch { return []; }
}

async function markCritiquesInjected(critiqueIds) {
  if (!critiqueIds || critiqueIds.length === 0) return;
  try {
    await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "mark_critiques_injected", ids: critiqueIds }),
    });
  } catch {} // fail silently
}

// ═══════════════════════════════════════════════════════════
// SCORING ENGINE
// ═══════════════════════════════════════════════════════════
async function scoreSingle(text, originalScore = null) {
  const prompt = originalScore !== null
    ? `You are judging a REWRITE of an AI answer. The original scored ${originalScore}/100.
Rate only whether this rewrite improved the original.
Return a single integer 0-100 where 50 = no change, above 50 = better, below 50 = worse.
Base your judgment on: clarity, structure, depth, correctness.
REWRITE:
${text.slice(0, 1200)}
Reply with ONLY a single integer 0-100. Nothing else.`
    : `Rate the quality of this AI-generated answer 0-100.
Criteria: Clarity (0-25), Structure (0-25), Depth (0-25), Correctness (0-25).
ANSWER:
${text.slice(0, 1200)}
Reply with ONLY a single integer 0-100. Nothing else.`;

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 10, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const num = parseInt((data?.content?.[0]?.text || "").replace(/\D/g, ""), 10);
    return isNaN(num) ? null : Math.min(100, Math.max(0, num));
  } catch { return null; }
}

async function scoreWithClaude(text, originalScore = null) {
  const calls = await Promise.all([
    scoreSingle(text, originalScore),
    scoreSingle(text, originalScore),
    scoreSingle(text, originalScore),
  ]);
  const valid = calls.filter(n => n !== null).sort((a, b) => a - b);
  if (valid.length === 0) return 50;
  if (valid.length === 1) return valid[0];
  if (valid.length === 2) return Math.round((valid[0] + valid[1]) / 2);
  return valid[1]; // median of 3
}

// ═══════════════════════════════════════════════════════════
// STREAMING API CALL
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

// L9 is non-streaming — it just returns 3 short questions
async function callL9(prompt) {
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 300, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const text = data?.content?.[0]?.text || "";
    return text.split("\n")
      .filter(line => line.trim().startsWith("Q:"))
      .map(line => line.replace(/^Q:\s*/i, "").trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch { return []; }
}

// ═══════════════════════════════════════════════════════════
// LOCAL IDENTITY — browser backup for run count display
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
// FEEDBACK BOX — appears after every completed run.
// This is how external ground truth enters the system.
// Factual critiques route to W layer on future runs.
// Stylistic critiques route to L3.
// Uncertain critiques are held for manual review.
// ═══════════════════════════════════════════════════════════
function FeedbackBox({ runId, onClose }) {
  const [evidence, setEvidence]       = useState("");
  const [confidence, setConfidence]   = useState(3);
  const [critiqueType, setCritiqueType] = useState("Factual");
  const [correction, setCorrection]   = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [saved, setSaved]             = useState(false);

  const submit = async () => {
    if (!evidence.trim() || confidence < 2) return;
    setSubmitting(true);
    await saveFeedbackToSupabase(evidence, confidence, critiqueType, correction, runId);
    setSaved(true);
    setSubmitting(false);
  };

  if (saved) {
    return (
      <div style={{ margin: "24px 0", padding: "20px", background: "#06060f", border: "1px solid #10b98133", borderLeft: "3px solid #10b981", borderRadius: 8 }}>
        <div style={{ fontSize: 12, color: "#10b981", fontFamily: "monospace" }}>
          ✓ Feedback saved — this trains the system. {critiqueType === "Factual" ? "Will route to W layer on future runs." : critiqueType === "Stylistic" ? "Will route to L3 on future runs." : "Held for manual review."}
        </div>
      </div>
    );
  }

  return (
    <div style={{ margin: "24px 0", padding: "20px", background: "#06060f", border: "1px solid #1a1a2e", borderLeft: "3px solid #10b981", borderRadius: 8 }}>
      <div style={{ fontSize: 9, color: "#10b981", letterSpacing: "0.2em", marginBottom: 14 }}>
        FEEDBACK — TEACH THE SYSTEM
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>
          WHAT WAS WRONG OR MISSING IN L4?
        </label>
        <textarea
          value={evidence}
          onChange={e => setEvidence(e.target.value)}
          placeholder="Be specific. What did the rewrite get wrong or miss entirely?"
          rows={3}
          style={{ width: "100%", background: "#08080f", border: "1px solid #1a1a2e", borderRadius: 6, color: "#c0c0e0", fontFamily: "monospace", fontSize: 12, padding: "10px 12px", lineHeight: 1.6 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>
          SUGGESTED CORRECTION — OPTIONAL
        </label>
        <textarea
          value={correction}
          onChange={e => setCorrection(e.target.value)}
          placeholder="What should it have said instead?"
          rows={2}
          style={{ width: "100%", background: "#08080f", border: "1px solid #1a1a2e", borderRadius: 6, color: "#c0c0e0", fontFamily: "monospace", fontSize: 12, padding: "10px 12px", lineHeight: 1.6 }}
        />
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>
            CONFIDENCE {confidence}/5
          </label>
          <input
            type="range" min="1" max="5" value={confidence}
            onChange={e => setConfidence(Number(e.target.value))}
            style={{ width: 120, accentColor: "#10b981" }}
          />
          {confidence < 2 && evidence.trim() && (
            <div style={{ fontSize: 9, color: "#ef4444", marginTop: 4 }}>Minimum confidence 2 to submit.</div>
          )}
        </div>
        <div>
          <label style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>
            CRITIQUE TYPE
          </label>
          <div style={{ display: "flex", gap: 6 }}>
            {["Factual", "Stylistic", "Uncertain"].map(t => (
              <button key={t} onClick={() => setCritiqueType(t)} style={{
                background: critiqueType === t ? "#10b98122" : "transparent",
                border: `1px solid ${critiqueType === t ? "#10b981" : "#1a1a2e"}`,
                borderRadius: 4,
                color: critiqueType === t ? "#10b981" : "#444",
                fontFamily: "monospace", fontSize: 9, padding: "4px 10px", cursor: "pointer",
              }}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={submit}
          disabled={submitting || !evidence.trim() || confidence < 2}
          style={{
            background: evidence.trim() && confidence >= 2 ? "#10b98122" : "transparent",
            border: `1px solid ${evidence.trim() && confidence >= 2 ? "#10b981" : "#1a1a2e"}`,
            borderRadius: 6,
            color: evidence.trim() && confidence >= 2 ? "#10b981" : "#333",
            fontFamily: "monospace", fontWeight: 700, fontSize: 10, padding: "8px 16px", cursor: "pointer",
          }}
        >
          {submitting ? "saving..." : "SUBMIT FEEDBACK"}
        </button>
        <button
          onClick={onClose}
          style={{ background: "transparent", border: "1px solid #1a1a2e", borderRadius: 6, color: "#333", fontFamily: "monospace", fontSize: 10, padding: "8px 12px", cursor: "pointer" }}
        >
          skip
        </button>
      </div>
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
  const [memoryStatus, setMemoryStatus]= useState("");
  const [questionIndex, setQuestionIndex] = useState(getQuestionIndex());
  const [lastL9Questions, setLastL9Questions] = useState([]);
  const [showFeedback, setShowFeedback]   = useState(false);
  const [currentRunId, setCurrentRunId]   = useState("");
  const abortCtrl = useRef(null);
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [layerOutputs, activeLayer, scoring, showFeedback]);

  const setLayerOutput = (id, text) => setOutputs(prev => ({ ...prev, [id]: text }));
  consconst markDone = (id) => { setDone(prev => [...prev, id]); setActive(null); setStreaming(prev => prev === id ? null : prev); };

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

  const executePipeline = async (inputText, signal) => {
    setRunning(true); setError(""); setOutputs({}); setDone([]);
    setActive(null); setStreaming(null); setScoreBefore(null); setScoreAfter(null);
    setScoring(false); setMemoryStatus(""); setShowFeedback(false);

    try {
      // 🛡️ ADVERSARIAL FILTER — pre-L0 safety check
      const safeAnswer = sanitizeInput(inputText);
      const safeContext = sanitizeInput(context);

      const [priorBeliefs, priorQuestions, validatedCritiques] = await Promise.all([
        loadBeliefsFromSupabase(),
        loadRecentQuestionsFromSupabase(),
        loadValidatedCritiques(),
      ]);

      if (priorBeliefs.length > 0 || priorQuestions.length > 0 || validatedCritiques.length > 0) {
        const parts = [];
        if (priorBeliefs.length > 0) parts.push(`${priorBeliefs.length} belief${priorBeliefs.length > 1 ? "s" : ""}`);
        if (priorQuestions.length > 0) parts.push(`${priorQuestions.length} question${priorQuestions.length > 1 ? "s" : ""}`);
        if (validatedCritiques.length > 0) parts.push(`${validatedCritiques.length} critique${validatedCritiques.length > 1 ? "s" : ""}`);
        setMemoryStatus(`↑ ${parts.join(" + ")} loaded`);
      }

      const s0 = await scoreWithClaude(safeAnswer);
      setScoreBefore(s0);

      const l0 = await runLayer("L0", LAYER_PROMPTS.L0(safeAnswer, safeContext, priorBeliefs, priorQuestions), signal);
      if (signal.aborted) return;

      const p  = await runLayer("P",  LAYER_PROMPTS.P(safeAnswer, l0), signal);                      if (signal.aborted) return;
      const w  = await runLayer("W",  LAYER_PROMPTS.W(safeAnswer, validatedCritiques), signal);      if (signal.aborted) return;
      const l1 = await runLayer("L1", LAYER_PROMPTS.L1(safeAnswer, p, w), signal);                   if (signal.aborted) return;
      const l2 = await runLayer("L2", LAYER_PROMPTS.L2(l1), signal);                                 if (signal.aborted) return;
      const l3 = await runLayer("L3", LAYER_PROMPTS.L3(safeAnswer, l2, w), signal);                  if (signal.aborted) return;
      const l4 = await runLayer("L4", LAYER_PROMPTS.L4(safeAnswer, l3, w), signal, 1200);            if (signal.aborted) return;

      setScoring(true);
      const s1 = await scoreWithClaude(l4, s0);
      setScoring(false);
      setScoreAfter(s1);

      const gapsFixed = s1 > s0 ? ["clarity", "structure", "depth"] : [];

      const lr = await runLayer("LR", LAYER_PROMPTS.LR(safeAnswer, l4, s0, s1), signal);     if (signal.aborted) return;
      const l6 = await runLayer("L6", LAYER_PROMPTS.L6(s0, s1, gapsFixed), signal);          if (signal.aborted) return;
      const l7 = await runLayer("L7", LAYER_PROMPTS.L7(lr, l6), signal, 1200);               if (signal.aborted) return;
      const l8 = await runLayer("L8", LAYER_PROMPTS.L8(s0, s1, gapsFixed), signal);          if (signal.aborted) return;

      const newRunNumber = identity.totalRuns + 1;
      const runId = `run_${newRunNumber}_${Date.now()}`;
      setCurrentRunId(runId);

      // Save L8 belief to Supabase
      const beliefToSave = `Run #${newRunNumber} (${s0}→${s1}): ${l8.slice(0, 200)}`;
      await saveBeliefToSupabase(beliefToSave, s0, s1, newRunNumber);

      // 🔥 L9 — SOCRATIC INTEGRITY ENGINE
      // Generates 3 run-specific self-questions for future reflection
      const l9Questions = await callL9(LAYER_PROMPTS.L9(l8, s0, s1, l4));
      
      // Save L9 output as a visible layer
      if (l9Questions.length > 0) {
        setLayerOutput("L9", l9Questions.join("\n\n"));
        markDone("L9");
        
        await saveQuestionsToSupabase(runId, l9Questions);
        setLastL9Questions(l9Questions);
        setMemoryStatus(`✓ belief + ${l9Questions.length} question${l9Questions.length > 1 ? "s" : ""} saved`);
      } else {
        setMemoryStatus("✓ belief saved to memory");
      }

      // Mark validated critiques as injected so they don't repeat on future runs.
      // Each critique trains the system once, then becomes part of its accumulated knowledge.
      if (validatedCritiques.length > 0) {
        const ids = validatedCritiques.map(c => c.id).filter(Boolean);
        await markCritiquesInjected(ids);
      }

      const newIdent = {
        ...identity, totalRuns: newRunNumber,
        beliefs: [...(identity.beliefs || []).slice(-4), `Run #${newRunNumber}: ${s0}→${s1}`],
      };
      setIdentity(newIdent);
      saveIdentity(newIdent);

      // Show feedback box — the external ground truth entry point
      setShowFeedback(true);

    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message);
    } finally {
      setRunning(false); setActive(null); setStreaming(null); setScoring(false);
    }
  };

  const run = async () => {
    if (!answer.trim() || running) return;
    abortCtrl.current = new AbortController();
    await executePipeline(answer, abortCtrl.current.signal);
  };

  const runNextQuestion = async () => {
    if (running) return;
    const idx = getQuestionIndex();
    if (idx >= QUESTION_BANK.length) {
      setError("All 100 questions completed. The system has worked through the full curriculum.");
      return;
    }
    const question = QUESTION_BANK[idx];
    setAnswer(question);
    const newIdx = idx + 1;
    setQuestionIndex(newIdx);
    setQuestionIndexStorage(newIdx);
    abortCtrl.current = new AbortController();
    await executePipeline(question, abortCtrl.current.signal);
  };

  const stop = () => {
    abortCtrl.current?.abort();
    setRunning(false); setActive(null); setStreaming(null); setScoring(false);
  };

  const clear = () => {
    setOutputs({}); setDone([]); setScoreBefore(null); setScoreAfter(null);
    setError(""); setScoring(false); setMemoryStatus(""); setShowFeedback(false);
  };

  const questionsRemaining = QUESTION_BANK.length - questionIndex;

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
              <div style={{ fontSize: 8, color: "#333", letterSpacing: "0.28em", marginTop: 4 }}>RUNTIME MEGAPROMPT ENGINE · 12 LAYERS · L9</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700 }}>unlimited runs</div>
              <div style={{ fontSize: 8, color: "#333", marginTop: 2 }}>Q{questionIndex + 1}/100 · {questionsRemaining} remaining</div>
              {memoryStatus && (
                <div style={{ fontSize: 8, color: "#10b981", marginTop: 2 }}>{memoryStatus}</div>
              )}
              <div style={{ fontSize: 8, color: "#ff6b35", marginTop: 4, letterSpacing: "0.1em", cursor: "pointer", textDecoration: "underline" }} onClick={() => setShowIdent(!showIdentity)}>
                {showIdentity ? "hide" : "identity"} · run #{identity.totalRuns}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IDENTITY PANEL */}
      {showIdentity && (
        <div style={{ background: "#06060f", borderBottom: "1px solid #0f0f1e", padding: "12px 20px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", fontSize: 11, color: "#5a5a82", lineHeight: 1.8 }}>
            <div style={{ color: "#fbbf24", fontSize: 9, letterSpacing: "0.2em", marginBottom: 6 }}>L8 IDENTITY · L9 ACTIVE · Supabase memory</div>
            <div>Total runs: {identity.totalRuns} · Questions: {questionIndex}/100</div>
            {(identity.beliefs || []).slice(-3).map((b, i) => <div key={i}>· {b}</div>)}
            {lastL9Questions.length > 0 && (
              <div style={{ marginTop: 8, color: "#38bdf8", fontSize: 9 }}>
                <div style={{ letterSpacing: "0.15em", marginBottom: 4 }}>LAST L9 QUESTIONS:</div>
                {lastL9Questions.map((q, i) => <div key={i}>? {q}</div>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px" }}>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 9, color: "#444", letterSpacing: "0.2em", display: "block", marginBottom: 6 }}>PASTE AI ANSWER</label>
          <textarea
            value={answer} onChange={e => setAnswer(e.target.value)} disabled={running}
            placeholder="Paste any AI-generated answer here, or tap AUTO to feed from the 100-question bank."
            rows={6}
            style={{ width: "100%", background: "#08080f", border: "1px solid #111120", borderRadius: 6, color: "#c0c0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, padding: "12px 14px", lineHeight: 1.7 }}
            onFocus={e => e.target.style.borderColor = "#ff6b35"}
            onBlur={e => e.target.style.borderColor = "#111120"}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 9, color: "#444", letterSpacing: "0.2em", display: "block", marginBottom: 6 }}>CONTEXT — OPTIONAL</label>
          <input
            value={context} onChange={e => setContext(e.target.value)} disabled={running}
            placeholder="What should this answer achieve? (leave blank to auto-detect)"
            style={{ width: "100%", background: "#08080f", border: "1px solid #111120", borderRadius: 6, color: "#c0c0e0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, padding: "10px 14px" }}
            onFocus={e => e.target.style.borderColor = "#ff6b35"}
            onBlur={e => e.target.style.borderColor = "#111120"}
          />
        </div>

        {/* BUTTONS — manual run, autofeeder, stop/clear */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={run} disabled={running || !answer.trim()}
            style={{ flex: 2, background: running ? "#0a0a14" : "linear-gradient(135deg,#ff6b35,#00d4ff)", border: `1px solid ${running ? "#1a1a2e" : "#ff6b3544"}`, borderRadius: 6, color: running ? "#333" : "#030308", fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, fontSize: 11, padding: "12px 8px", letterSpacing: "0.08em", minWidth: 0 }}>
            {running ? "⟳ RUNNING..." : "▶ RUN PIPELINE"}
          </button>
          <button onClick={runNextQuestion} disabled={running || questionIndex >= QUESTION_BANK.length}
            style={{ flex: 3, background: running || questionIndex >= QUESTION_BANK.length ? "#0a0a14" : "linear-gradient(135deg,#7c3aed,#38bdf8)", border: `1px solid ${running || questionIndex >= QUESTION_BANK.length ? "#1a1a2e" : "#7c3aed44"}`, borderRadius: 6, color: running || questionIndex >= QUESTION_BANK.length ? "#333" : "#030308", fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, fontSize: 11, padding: "12px 8px", letterSpacing: "0.08em", minWidth: 0 }}>
            {questionIndex >= QUESTION_BANK.length ? "✓ ALL DONE" : `⟫ Q${questionIndex + 1} AUTO`}
          </button>
          {running && (
            <button onClick={stop} style={{ background: "transparent", border: "1px solid #ef444433", borderRadius: 6, color: "#ef4444", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, padding: "12px 10px" }}>✕</button>
          )}
          {!running && Object.keys(layerOutputs).length > 0 && (
            <button onClick={clear} style={{ background: "transparent", border: "1px solid #1a1a2e", borderRadius: 6, color: "#444", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, padding: "12px 10px" }}>✕</button>
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

        {/* FEEDBACK BOX — appears after every completed run */}
        {showFeedback && !running && (
          <FeedbackBox runId={currentRunId} onClose={() => setShowFeedback(false)} />
        )}

        <div ref={bottom} style={{ height: 40 }} />
      </div>

      <div style={{ borderBottom: "1px solid #0f0f1e", padding: "16px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 8, color: "#1a1a2e", letterSpacing: "0.2em" }}>
          THINK → PARSE → GROUND → HYPOTHESIZE → EVALUATE → PLAN → REWRITE → REFLECT → REMEMBER → LEARN → EVOLVE → QUESTION
        </div>
      </div>
    </div>
  );
}
