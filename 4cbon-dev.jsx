import { useState, useRef, useEffect } from "react";

const RUNTIME_SPEC = `You are the 4CBON Runtime Engine — a layered cognitive execution system.

Your job is to process AI-generated answers through a deterministic multi-layer transformation pipeline. You execute one layer at a time. Each layer has a specific cognitive role. You never skip layers. You never merge layers.

PIPELINE: L0 → P → W → LX → LA → LC → L1 → L2 → L3 → L4 → LR → L6 → L7 → L8 → L9 → L10

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
LX — REALITY ADJUDICATION LAYER: For every claim flagged MEDIUM or UNKNOWN by W, ask: (1) What prediction would this claim make that could be tested? (2) What would an adversary say against it? (3) What external artifact would verify or falsify it? Label each claim: FALSIFIABLE / UNFALSIFIABLE / TESTABLE-IN-PRINCIPLE. Claims that cannot answer any question get labeled UNGROUNDED. Pass this audit to L1.
LA — ADVERSARIAL COUNTERMODEL LAYER: Actively attempt to structurally destroy the answer's core claims. Generate: (1) the strongest competing explanation, (2) hidden assumptions the answer relies on, (3) conditions under which the answer is completely wrong, (4) the simplest alternative that achieves the same goal. Ask: what would make this entire framework collapse?
LC — COMPRESSION INTEGRITY LAYER: Hunt semantic smoothing. Detect where: (1) multiple concepts collapsed into one term, (2) metaphor replaced mechanism, (3) elegance erased uncertainty, (4) abstraction hid causality. For each detected instance, restore the distinction that was lost. Flag any term doing more epistemic work than it can justify.
L1 — HYPOTHESIS ENGINE: Generate 2-3 interpretations of how this answer could be improved. Include a failure mode hypothesis.
L2 — EVALUATION LAYER: Score the hypotheses. Identify contradictions, gaps. Pick the best path forward.
L3 — REWRITE PLANNER: Plan the rewrite. Decide what stays, changes, gets added.
L4 — FINALIZATION ENGINE: Execute the rewrite. Produce the final improved answer. This becomes the Final Rewrite.
LR — REGRET LAYER: Analyze improvement delta. What errors corrected? What hallucinations removed? What still needs work?
L6 — TRACE MEMORY: Store the immutable execution log. Input → hypotheses → decisions → score trajectory.
L7 — CURRICULUM GENERATOR: Extract lessons learned, failure patterns, reusable heuristics.
L8 — IDENTITY MODEL: Summarize system behavior this run. Strengths, weaknesses, bias tendencies.
L9 — SOCRATIC INTEGRITY ENGINE: Generate exactly 3 self-questions specific to this run. One observational, one reasoning, one alignment-level.
L10 — SYNTHESIS/AUDIT LAYER: Read all prior layer outputs. Produce a final certification: (1) did the rewrite genuinely improve the answer or just rearrange it, (2) did any layer contradict another, (3) does the L4 output contain any remaining overclaims or hallucinations, (4) one-sentence verdict a human should read before acting on this output.

Stay in your assigned layer. Output only what that layer produces. Be precise and concise.`;

const LAYERS = [
  { id: "L0", name: "Interpretation Engine", color: "#ff6b35", emoji: "◎" },
  { id: "P",  name: "Parsing Layer",         color: "#a855f7", emoji: "⊞" },
  { id: "W",  name: "World Model Layer",      color: "#00d4ff", emoji: "⊕" },
  { id: "LX", name: "Reality Adjudication",    color: "#f97316", emoji: "⊛" },
  { id: "LA", name: "Adversarial Countermodel", color: "#dc2626", emoji: "⚔" },
  { id: "LC", name: "Compression Integrity",    color: "#0ea5e9", emoji: "⊘" },
  { id: "L1", name: "Hypothesis Engine",        color: "#38bdf8", emoji: "◈" },
  { id: "L2", name: "Evaluation Layer",       color: "#f59e0b", emoji: "◉" },
  { id: "L3", name: "Rewrite Planner",        color: "#7c3aed", emoji: "◐" },
  { id: "L4", name: "Finalization Engine",    color: "#10b981", emoji: "★", final: true },
  { id: "LR", name: "Regret Layer",           color: "#ef4444", emoji: "◑" },
  { id: "L6", name: "Trace Memory",           color: "#f43f5e", emoji: "⟳" },
  { id: "L7", name: "Curriculum Generator",   color: "#c084fc", emoji: "◆" },
  { id: "L8", name: "Identity Model",         color: "#fbbf24", emoji: "⚙" },
  { id: "L10", name: "Synthesis/Audit",        color: "#6ee7b7", emoji: "✦" },
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
function setQuestionIndex(n) {
  try { localStorage.setItem("4cbon_qidx", String(n)); } catch {}
}

// ═══════════════════════════════════════════════════════════
// LAYER PROMPTS
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
  LX: (answer, w) => `AI ANSWER:\n${answer}\n\nW WORLD MODEL:\n${w}\n\nYou are LX — Reality Adjudication Layer. For every claim labeled MEDIUM or UNKNOWN by the World Model Layer, apply three tests:\n1. PREDICTION TEST: What testable prediction does this claim make?\n2. ADVERSARY TEST: What would the strongest critic say against this claim?\n3. VERIFICATION TEST: What external artifact, data, or observation would confirm or refute it?\n\nLabel each claim:\n- FALSIFIABLE: passes at least one test\n- UNFALSIFIABLE: fails all three tests — claim is ungrounded\n- TESTABLE-IN-PRINCIPLE: no current test exists but one could be designed\n\nOutput a structured audit. Be specific. Do not pass ungrounded claims forward unchallenged.`,

  LA: (answer, lx) => `AI ANSWER:\n${answer}\n\nREALITY AUDIT:\n${lx}\n\nYou are LA — Adversarial Countermodel Layer. Your job is to structurally attack the answer's core claims — not rhetorically, but architecturally.\n\nGenerate:\n1. THE STRONGEST COMPETING EXPLANATION: What alternative account explains the same facts better or more simply?\n2. HIDDEN ASSUMPTIONS: What does the answer silently rely on that it never states?\n3. COLLAPSE CONDITIONS: Under what specific conditions is the answer's core claim completely wrong?\n4. SIMPLICITY CHALLENGE: Could a simpler system or explanation achieve the same result?\n5. THE COLLAPSE QUESTION: What single finding would make this entire framework wrong?\n\nBe precise. Do not hedge. The goal is to find the load-bearing weakness before L4 bakes it into the rewrite.`,

  LC: (answer, la) => `AI ANSWER:\n${answer}\n\nADVERSARIAL FINDINGS:\n${la}\n\nYou are LC — Compression Integrity Layer. LLMs compress aggressively. Compression silently destroys distinctions. Your job is to find where compression happened and restore what was lost.\n\nHunt for:\n1. CONCEPT COLLAPSE: Where did multiple distinct concepts get merged into one term? Name both concepts separately.\n2. METAPHOR SUBSTITUTION: Where did a metaphor replace a mechanism? Name the mechanism that was hidden.\n3. ELEGANCE ERASURE: Where did clean phrasing delete important uncertainty or caveats?\n4. ABSTRACTION HIDING CAUSALITY: Where did a high-level term hide a specific causal claim that needs scrutiny?\n\nFor each instance found: name the compressed term, name what was lost, and state what the uncompressed version would say.\n\nIf no compression is detected, say so explicitly.`,

  L1: (answer, p, w, lx, la, lc) => `AI ANSWER:\n${answer}\n\nParsing:\n${p}\n\nWorld Model:\n${w}\n\nReality Audit (LX):\n${lx}\n\nAdversarial Findings (LA):\n${la}\n\nCompression Audit (LC):\n${lc}\n\nYou are L1 — Hypothesis Engine. Generate exactly 3 improvement hypotheses informed by ALL upstream layers above:\nH1: [strongest improvement path — grounded in what LX and LA revealed]\nH2: [radical reframe — does the framing itself collapse under adversarial pressure?]\nH3: [failure mode — what compressed assumption or ungrounded claim will cause this to fail?]`,
  L2: (l1)           => `Hypotheses:\n${l1}\n\nYou are L2 — Evaluation Layer. Score each hypothesis 1-10. Pick the best path. Explain your reasoning in 3 sentences.`,
  L3: (answer, l2, w)=> `Best path:\n${l2}\n\nWorld facts:\n${w}\n\nOriginal answer:\n${answer}\n\nYou are L3 — Rewrite Planner. Create a precise rewrite brief: (1) what stays, (2) what changes, (3) what gets added, (4) what gets removed.`,
  L4: (answer, l3, w)=> `ORIGINAL ANSWER:\n${answer}\n\nREWRITE PLAN:\n${l3}\n\nWORLD FACTS:\n${w}\n\nYou are L4 — Finalization Engine. Execute the rewrite plan. Produce the final improved answer. Optimize for clarity, structure, and correctness. Output only the improved answer.`,
  LR: (answer, l4, s0, s1) => `BEFORE (score ${s0}/100):\n${answer}\n\nAFTER (score ${s1}/100):\n${l4}\n\nYou are LR — Regret Layer. Analyze: (1) errors corrected, (2) hallucinations removed, (3) structural improvements, (4) what still needs work.`,
  L6: (s0, s1, gaps) => `Score trajectory: ${s0} → ${s1}\nGaps fixed: ${gaps.join(", ") || "none"}\n\nYou are L6 — Trace Memory. Write the immutable execution log of this run.`,
  L7: (lr, l6)       => `Regret analysis:\n${lr}\n\nTrace:\n${l6}\n\nYou are L7 — Curriculum Generator. Extract: (1) 3 lessons learned, (2) key failure patterns, (3) 2 reusable heuristics, (4) 2 challenge questions.`,
  L8: (s0, s1, gaps) => `Run: score ${s0}→${s1}, gaps fixed: ${gaps.join(", ") || "none"}\n\nYou are L8 — Identity Model. Summarize: 1. Strengths, 2. Weaknesses, 3. Bias tendencies, 4. One new self-belief`,
  L10: (l4, lr, l7, l8, l9qs, s0, s1) => `PIPELINE RUN SUMMARY:
Score: ${s0} → ${s1}

L4 FINAL REWRITE (first 600 chars):
${l4.slice(0, 600)}

LR REGRET ANALYSIS (first 400 chars):
${lr.slice(0, 400)}

L7 LESSONS (first 300 chars):
${l7.slice(0, 300)}

L8 SELF-BELIEF:
${l8.slice(0, 200)}

L9 UNRESOLVED QUESTIONS:
${l9qs}

You are L10 — Synthesis/Audit Layer. Produce a final certification of this pipeline run. Your output must address exactly four things:

1. IMPROVEMENT VERDICT: Did the rewrite genuinely improve the answer (better reasoning, fewer errors, more accurate) or did it merely rearrange it (same claims, different structure)? Be specific about what changed.

2. CONTRADICTION AUDIT: Did any layer contradict another? Check: does LR say the rewrite failed while L6 logged it complete? Does L8 identify a weakness that L4 ignored? Name any contradiction found or state NONE DETECTED.

3. INTEGRITY CHECK: Does the L4 output contain any remaining overclaims, hallucinations, or compression failures that slipped through? Name them specifically or state NONE DETECTED.

4. HUMAN VERDICT: One sentence a human should read before acting on this output. Start with either CERTIFIED, CERTIFIED WITH CAUTION, or REQUIRES REVIEW.`,

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
// SUPABASE MEMORY
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
    } catch {}
  }
}

async function loadRecentQuestionsFromSupabase() {
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "get_recent_questions" }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.questions || []).map(q => q.question_text).filter(Boolean);
  } catch { return []; }
}

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
// CREDIBILITY PARSER
// ═══════════════════════════════════════════════════════════
async function loadValidatedCritiques() {
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "get_validated_critiques" }),
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
  } catch {}
}

// ═══════════════════════════════════════════════════════════
// AI FEEDBACK GENERATOR
// Sends the original answer and L4 rewrite to Claude and gets
// back a structured critique that pre-fills the feedback fields.
// The human reviews and approves before submitting.
// ═══════════════════════════════════════════════════════════
async function generateAIFeedback(originalAnswer, l4Output) {
  const prompt = `You are analyzing a pipeline rewrite. The pipeline took an AI-generated answer and produced an improved version. Your job is to identify what the rewrite STILL got wrong or missed.

ORIGINAL ANSWER:
${originalAnswer.slice(0, 1000)}

L4 REWRITE (the improved version):
${l4Output.slice(0, 1000)}

Analyze the L4 rewrite critically. What did it get wrong, miss, or still fail to correct from the original? Focus on the most important remaining error or gap.

Reply with ONLY this JSON structure — no other text:
{
  "evidence": "specific description of what L4 got wrong or missed (2-3 sentences)",
  "suggested_correction": "what it should have said instead (1-2 sentences, or empty string if none)",
  "confidence": 3,
  "critique_type": "Factual"
}

Rules:
- evidence must be specific to THIS rewrite, not generic
- confidence must be 2, 3, 4, or 5 (integer)
- critique_type must be exactly "Factual", "Stylistic", or "Uncertain"
- if the rewrite is genuinely good with no significant errors, set confidence to 2 and note what minor thing could improve`;

  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data?.content?.[0]?.text || "").trim();
    // Strip any markdown fences if present
    const clean = text.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(clean);
    return {
      evidence: parsed.evidence || "",
      suggested_correction: parsed.suggested_correction || "",
      confidence: Math.min(5, Math.max(2, parseInt(parsed.confidence, 10) || 3)),
      critique_type: ["Factual", "Stylistic", "Uncertain"].includes(parsed.critique_type)
        ? parsed.critique_type
        : "Factual",
    };
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════
// SCORER — 3-call median
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
  return valid[1];
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
    if (res.status === 429 || e?.error === "daily_limit_reached") {
      throw new Error("DAILY_LIMIT_REACHED");
    }
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
// LOCAL IDENTITY
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
// LAYER CARD — with working copy button
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
// FEEDBACK BOX — with AI feedback generator
// The Generate button sends L4's output to Claude and gets back
// a structured critique that pre-fills the form fields.
// Human reviews and approves before submitting.
// ═══════════════════════════════════════════════════════════
function FeedbackBox({ runId, originalAnswer, l4Output, onClose }) {
  const [evidence, setEvidence]         = useState("");
  const [confidence, setConfidence]     = useState(3);
  const [critiqueType, setCritiqueType] = useState("Factual");
  const [correction, setCorrection]     = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [generating, setGenerating]     = useState(false);
  const [saved, setSaved]               = useState(false);
  const [generateError, setGenerateError] = useState("");

  const generate = async () => {
    if (!l4Output) { setGenerateError("No L4 output available to analyze."); return; }
    setGenerating(true);
    setGenerateError("");
    const result = await generateAIFeedback(originalAnswer, l4Output);
    setGenerating(false);
    if (!result) {
      setGenerateError("Generation failed — fill in manually or try again.");
      return;
    }
    setEvidence(result.evidence);
    setCorrection(result.suggested_correction);
    setConfidence(result.confidence);
    setCritiqueType(result.critique_type);
  };

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: "#10b981", letterSpacing: "0.2em" }}>
          FEEDBACK — TEACH THE SYSTEM
        </div>
        {/* AI Generate button */}
        <button
          onClick={generate}
          disabled={generating || !l4Output}
          style={{
            background: generating ? "#0a0a14" : "linear-gradient(135deg,#7c3aed,#38bdf8)",
            border: `1px solid ${generating ? "#1a1a2e" : "#7c3aed44"}`,
            borderRadius: 6,
            color: generating ? "#444" : "#030308",
            fontFamily: "monospace", fontWeight: 900, fontSize: 9,
            padding: "6px 12px", cursor: generating ? "default" : "pointer",
            letterSpacing: "0.08em",
          }}
        >
          {generating ? "⟳ generating..." : "⟳ GENERATE FEEDBACK"}
        </button>
      </div>

      {generateError && (
        <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 10, fontFamily: "monospace" }}>{generateError}</div>
      )}

      {generating && (
        <div style={{ fontSize: 10, color: "#7c3aed", marginBottom: 12, fontFamily: "monospace" }}>
          Analyzing L4 output and generating critique...
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 9, color: "#444", letterSpacing: "0.15em", display: "block", marginBottom: 6 }}>
          WHAT WAS WRONG OR MISSING IN L4?
        </label>
        <textarea
          value={evidence}
          onChange={e => setEvidence(e.target.value)}
          placeholder="Tap GENERATE FEEDBACK to auto-fill, or write manually. Be specific about what the rewrite got wrong or missed."
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
  const [showLanding, setShowLanding]  = useState(() => !sessionStorage.getItem('4cbon_visited'));
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
  const [lastL4Output, setLastL4Output]   = useState("");
  const [lastAnswer, setLastAnswer]       = useState("");
  const [copyAllDone, setCopyAllDone]     = useState(false);
  const [batchRunning, setBatchRunning]   = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, status: "" });
  const batchAbort = useRef(false);
  const abortCtrl = useRef(null);
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [layerOutputs, activeLayer, scoring, showFeedback]);

  const setLayerOutput = (id, text) => setOutputs(prev => ({ ...prev, [id]: text }));

  // Fixed markDone — scoped streaming clear prevents L9 from erasing L4
  const markDone = (id) => {
    setDone(prev => [...prev, id]);
    setActive(null);
    setStreaming(prev => prev === id ? null : prev);
  };

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

  // Copy all layer outputs as a formatted report
  const copyAll = () => {
    const lines = [];
    lines.push("4CBON PIPELINE RUN REPORT");
    lines.push(`Score: ${scoreBefore} → ${scoreAfter}`);
    lines.push("═".repeat(50));
    LAYERS.forEach(layer => {
      const content = layerOutputs[layer.id];
      if (content) {
        lines.push(`\n${layer.id} — ${layer.name}\n${"─".repeat(40)}\n${content}`);
      }
    });
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopyAllDone(true);
      setTimeout(() => setCopyAllDone(false), 2000);
    });
  };

  const executePipeline = async (inputText, signal) => {
    setRunning(true); setError(""); setOutputs({}); setDone([]);
    setActive(null); setStreaming(null); setScoreBefore(null); setScoreAfter(null);
    setScoring(false); setMemoryStatus(""); setShowFeedback(false);
    setLastL4Output(""); setLastAnswer(inputText);

    try {
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

      const s0 = await scoreWithClaude(inputText);
      setScoreBefore(s0);

      const l0 = await runLayer("L0", LAYER_PROMPTS.L0(inputText, context, priorBeliefs, priorQuestions), signal);
      if (signal.aborted) return;

      const p  = await runLayer("P",  LAYER_PROMPTS.P(inputText, l0), signal);              if (signal.aborted) return;
      const w  = await runLayer("W",  LAYER_PROMPTS.W(inputText, validatedCritiques), signal); if (signal.aborted) return;
      const lx = await runLayer("LX", LAYER_PROMPTS.LX(inputText, w), signal);              if (signal.aborted) return;
      const la = await runLayer("LA", LAYER_PROMPTS.LA(inputText, lx), signal);             if (signal.aborted) return;
      const lc = await runLayer("LC", LAYER_PROMPTS.LC(inputText, la), signal);             if (signal.aborted) return;
      const l1 = await runLayer("L1", LAYER_PROMPTS.L1(inputText, p, w, lx, la, lc), signal); if (signal.aborted) return;
      const l2 = await runLayer("L2", LAYER_PROMPTS.L2(l1, s0), signal);
if (l2.includes("HALT — INPUT NEAR-OPTIMAL")) { setScoreAfter(s0); setError("HALT — Input is near-optimal. Rewriting would degrade quality."); setRunning(false); return; } 
      const l3 = await runLayer("L3", LAYER_PROMPTS.L3(inputText, l2, w), signal);          if (signal.aborted) return;
      const l4 = await runLayer("L4", LAYER_PROMPTS.L4(inputText, l3, w), signal, 2000);    if (signal.aborted) return;

      // Store L4 output for AI feedback generator
      setLastL4Output(l4);

      setScoring(true);
      const s1 = await scoreWithClaude(l4, s0);
      setScoring(false);
      setScoreAfter(s1);

      const gapsFixed = s1 > s0 ? ["clarity", "structure", "depth"] : [];

      const lr = await runLayer("LR", LAYER_PROMPTS.LR(inputText, l4, s0, s1), signal);     if (signal.aborted) return;
      const l6 = await runLayer("L6", LAYER_PROMPTS.L6(s0, s1, gapsFixed), signal);         if (signal.aborted) return;
      const l7 = await runLayer("L7", LAYER_PROMPTS.L7(lr, l6), signal, 2000);              if (signal.aborted) return;
      const l8 = await runLayer("L8", LAYER_PROMPTS.L8(s0, s1, gapsFixed), signal);         if (signal.aborted) return;

      // L10 — Synthesis/Audit — final certification
      const l9qs_preview = lastL9Questions && lastL9Questions.length > 0 
        ? lastL9Questions.join("\n") 
        : "No prior questions loaded";
      await runLayer("L10", LAYER_PROMPTS.L10(l4, lr, l7, l8, l9qs_preview, s0, s1), signal);
      if (signal.aborted) return;

      const newRunNumber = identity.totalRuns + 1;
      const runId = `run_${newRunNumber}_${Date.now()}`;
      setCurrentRunId(runId);

      // Save belief to Supabase
      const beliefToSave = `Run #${newRunNumber} (${s0}→${s1}): ${l8.slice(0, 200)}`;
      await saveBeliefToSupabase(beliefToSave, s0, s1, newRunNumber);

      // Mark validated critiques as injected
      if (validatedCritiques.length > 0) {
        const ids = validatedCritiques.map(c => c.id).filter(Boolean);
        await markCritiquesInjected(ids);
      }

      // Fire L9 — generate 3 self-questions about this run
      const l9Questions = await callL9(LAYER_PROMPTS.L9(l8, s0, s1, l4));
      if (l9Questions.length > 0) {
        await saveQuestionsToSupabase(runId, l9Questions);
        setLastL9Questions(l9Questions);
        setMemoryStatus(`✓ belief + ${l9Questions.length} question${l9Questions.length > 1 ? "s" : ""} saved`);
      } else {
        setMemoryStatus("✓ belief saved to memory");
      }

      // Update local backup
      const newIdent = {
        ...identity, totalRuns: newRunNumber,
        beliefs: [...(identity.beliefs || []).slice(-4), `Run #${newRunNumber}: ${s0}→${s1}`],
      };
      setIdentity(newIdent);
      saveIdentity(newIdent);

      // Show feedback box
      setShowFeedback(true);

    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message);
    } finally {
      setRunning(false); setActive(null); setScoring(false);
    }
  };

  const run = async () => {
    if (!answer.trim() || running) return;
    abortCtrl.current = new AbortController();
    await executePipeline(answer, abortCtrl.current.signal);
  };

  // ═══════════════════════════════════════════════════════════
  // AUTONOMOUS BATCH RUN — runs all remaining questions, self-reviews
  // ═══════════════════════════════════════════════════════════
  const runAllQuestions = async () => {
    if (batchRunning || running) return;
    batchAbort.current = false;
    setBatchRunning(true);

    const startIdx = getQuestionIndex();
    const remaining = QUESTION_BANK.length - startIdx;
    if (remaining <= 0) {
      setBatchRunning(false);
      return;
    }

    setBatchProgress({ current: 0, total: remaining, status: "Starting autonomous run..." });

    for (let i = startIdx; i < QUESTION_BANK.length; i++) {
      if (batchAbort.current) break;

      const question = QUESTION_BANK[i];
      const runNumber = i + 1;
      const newIdx = i + 1;
      setQuestionIndex(newIdx);
      setQuestionIndex(newIdx);
      try { localStorage.setItem("4cbon_qidx", String(newIdx)); } catch {}

      setBatchProgress({
        current: i - startIdx + 1,
        total: remaining,
        status: `Q${runNumber}/100 — running pipeline...`
      });

      setAnswer(question);

      // Run the pipeline
      abortCtrl.current = new AbortController();
      await executePipeline(question, abortCtrl.current.signal);

      if (batchAbort.current) break;

      // Auto-generate and submit AI feedback
      setBatchProgress({
        current: i - startIdx + 1,
        total: remaining,
        status: `Q${runNumber}/100 — generating self-review...`
      });

      // Wait briefly for state to settle
      await new Promise(r => setTimeout(r, 1500));

      // Auto-submit feedback using AI generator
      const l4 = layerOutputs["L4"] || "";
      const originalAns = question;
      if (l4) {
        const feedback = await generateAIFeedback(originalAns, l4);
        if (feedback && feedback.evidence && feedback.confidence >= 2) {
          const runId = `batch_run_${runNumber}_${Date.now()}`;
          await saveFeedbackToSupabase(
            feedback.evidence,
            feedback.confidence,
            feedback.critique_type,
            feedback.suggested_correction,
            runId
          );
        }
      }

      setBatchProgress({
        current: i - startIdx + 1,
        total: remaining,
        status: `Q${runNumber}/100 — complete. Next in 2s...`
      });

      // Brief pause between runs
      await new Promise(r => setTimeout(r, 2000));
    }

    setBatchRunning(false);
    setBatchProgress({ current: remaining, total: remaining, status: "✓ All questions complete." });
  };

  const stopBatch = () => {
    batchAbort.current = true;
    abortCtrl.current?.abort();
    setBatchRunning(false);
    setBatchProgress(prev => ({ ...prev, status: "Stopped by user." }));
  };

  const runNextQuestion = async () => {
    if (running) return;
    const idx = getQuestionIndex();
    if (idx >= QUESTION_BANK.length) {
      setError("All 100 questions completed.");
      return;
    }
    const question = QUESTION_BANK[idx];
    setAnswer(question);
    const newIdx = idx + 1;
    setQuestionIndex(newIdx);
    localStorage.setItem("4cbon_qidx", String(newIdx));
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
    setLastL4Output(""); setCopyAllDone(false);
  };

  const questionsRemaining = QUESTION_BANK.length - questionIndex;
  const hasOutput = Object.keys(layerOutputs).length > 0;

  if (showLanding) return (
    <div style={{ minHeight:"100vh", background:"#03030a", color:"#c0c0e0", fontFamily:"'JetBrains Mono','Courier New',monospace" }}>
      <style>{`@keyframes scan{0%{top:0}100%{top:100vh}}`}</style>
      <div style={{ position:"fixed", top:0, left:0, right:0, height:2, background:"linear-gradient(90deg,transparent,#ff6b35,#00d4ff,#10b981,transparent)", animation:"scan 8s linear infinite", zIndex:100 }} />
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:50, padding:"16px 24px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(3,3,10,0.9)", borderBottom:"1px solid #0f0f1e" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:900, background:"linear-gradient(110deg,#ff6b35,#00d4ff,#10b981)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>4CBON</div>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <span style={{ fontSize:9, color:"#444466", letterSpacing:"0.15em" }}>16 LAYERS · SELF-IMPROVING</span>
          <a href="https://4175358678144.gumroad.com/l/tbphpi" target="_blank" rel="noreferrer" style={{ fontSize:10, color:"#ff6b35", border:"1px solid #ff6b35", borderRadius:4, padding:"6px 14px", textDecoration:"none", letterSpacing:"0.15em" }}>UPGRADE →</a>
        </div>
      </nav>
      <div style={{ maxWidth:720, margin:"0 auto", padding:"120px 24px 80px" }}>
        <div style={{ fontSize:9, letterSpacing:"0.35em", color:"#ff6b35", textTransform:"uppercase", marginBottom:24 }}>Runtime Megaprompt Engine · 16 Layers · Self-Improving</div>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(40px,8vw,80px)", fontWeight:900, lineHeight:1.0, marginBottom:32 }}>
          <div style={{ color:"#c0c0e0" }}>AI gives you</div>
          <div style={{ background:"linear-gradient(110deg,#ff6b35,#00d4ff)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>one shot.</div>
          <div style={{ color:"#10b981" }}>4CBON loops.</div>
        </div>
        <p style={{ fontSize:14, color:"#444466", maxWidth:480, marginBottom:40, lineHeight:1.8 }}>
          Every AI answer was generated once and shipped. No iteration. No self-critique.<br /><br />
          <strong style={{ color:"#c0c0e0" }}>4CBON runs 16 cognitive layers</strong> until the answer is measurably better than what came in.
        </p>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:12 }}>
          <a href="https://4175358678144.gumroad.com/l/tbphpi" target="_blank" rel="noreferrer" style={{ background:"linear-gradient(135deg,#ff6b35,#00d4ff)", borderRadius:6, color:"#03030a", fontFamily:"monospace", fontWeight:900, fontSize:12, padding:"14px 28px", letterSpacing:"0.1em", textDecoration:"none", display:"inline-block" }}>★ UPGRADE TO PRO — $9/month</a>
          <button onClick={() => { sessionStorage.setItem('4cbon_visited','1'); setShowLanding(false); }} style={{ background:"transparent", border:"1px solid #1a1a2e", borderRadius:6, color:"#444466", fontFamily:"monospace", fontSize:12, padding:"14px 28px", letterSpacing:"0.1em", cursor:"pointer" }}>Try free (3 runs/day) →</button>
        </div>
        <p style={{ fontSize:9, color:"#333355", letterSpacing:"0.1em", marginBottom:48 }}>API costs are real — Pro users keep the pipeline running for everyone.</p>
        <div style={{ background:"#06060f", border:"1px solid #0f0f1e", borderRadius:8, padding:20, marginBottom:48 }}>
          <div style={{ fontSize:9, color:"#444466", letterSpacing:"0.2em", marginBottom:12, display:"flex", justifyContent:"space-between" }}><span>LIVE PIPELINE · RUN #141</span><span style={{ color:"#10b981" }}>● ACTIVE</span></div>
          <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:14 }}>
            {["L0","P","W","LX","LA","LC","L1","L2","L3","L4","LR","L6","L7","L8","L9","L10"].map(l=>(<div key={l} style={{ fontSize:9, fontWeight:700, padding:"3px 7px", borderRadius:4, background:"rgba(16,185,129,0.15)", border:"1px solid #10b981", color:"#10b981" }}>✓ {l}</div>))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, paddingTop:14, borderTop:"1px solid #0f0f1e" }}>
            <span style={{ fontFamily:"monospace", fontWeight:900, fontSize:28, color:"#f59e0b" }}>62</span>
            <div style={{ flex:1, height:6, background:"#111", borderRadius:3 }}><div style={{ height:"100%", width:"62%", background:"#f59e0b", borderRadius:3 }} /></div>
            <span style={{ color:"#10b981", fontSize:18 }}>→</span>
            <div style={{ flex:1, height:6, background:"#111", borderRadius:3 }}><div style={{ height:"100%", width:"72%", background:"#10b981", borderRadius:3 }} /></div>
            <span style={{ fontFamily:"monospace", fontWeight:900, fontSize:28, color:"#10b981" }}>72</span>
            <span style={{ fontSize:9, color:"#10b981", fontWeight:700 }}>+10</span>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:48 }}>
          <div style={{ background:"#06060f", border:"1px solid #0f0f1e", borderRadius:8, padding:"24px 20px" }}>
            <div style={{ fontSize:9, color:"#444466", textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:10 }}>Free</div>
            <div style={{ fontFamily:"monospace", fontSize:40, fontWeight:900, color:"#c0c0e0", lineHeight:1, marginBottom:4 }}>$0</div>
            <div style={{ fontSize:10, color:"#444466", marginBottom:16 }}>forever</div>
            {["3 runs/day","16 layers","Score bar","Copy buttons","No credit card"].map(f=><div key={f} style={{ fontSize:11, color:"#444466", padding:"5px 0", borderBottom:"1px solid #0f0f1e" }}>· {f}</div>)}
            <button onClick={() => { sessionStorage.setItem('4cbon_visited','1'); setShowLanding(false); }} style={{ display:"block", width:"100%", marginTop:20, padding:10, borderRadius:6, background:"transparent", border:"1px solid #1a1a2e", color:"#444466", fontFamily:"monospace", fontSize:11, cursor:"pointer", letterSpacing:"0.1em" }}>Try free (limited) →</button>
          </div>
          <div style={{ background:"rgba(255,107,53,0.04)", border:"1px solid #ff6b35", borderRadius:8, padding:"24px 20px", position:"relative" }}>
            <div style={{ position:"absolute", top:-1, right:16, background:"#ff6b35", color:"#03030a", fontSize:8, fontWeight:700, padding:"4px 10px", borderRadius:"0 0 4px 4px" }}>MOST POPULAR</div>
            <div style={{ fontSize:9, color:"#444466", textTransform:"uppercase", letterSpacing:"0.2em", marginBottom:10 }}>Pro</div>
            <div style={{ fontFamily:"monospace", fontSize:40, fontWeight:900, color:"#c0c0e0", lineHeight:1, marginBottom:4 }}>$9</div>
            <div style={{ fontSize:10, color:"#444466", marginBottom:16 }}>per month</div>
            {["Unlimited runs","Supabase memory","AI feedback generator","Credibility parser","L9 + L10"].map(f=><div key={f} style={{ fontSize:11, color:"#c0c0e0", padding:"5px 0", borderBottom:"1px solid #1a1a2e" }}>· {f}</div>)}
            <a href="https://4175358678144.gumroad.com/l/tbphpi" target="_blank" rel="noreferrer" style={{ display:"block", width:"100%", marginTop:20, padding:10, borderRadius:6, background:"linear-gradient(135deg,#ff6b35,#00d4ff)", color:"#03030a", fontFamily:"monospace", fontSize:11, letterSpacing:"0.1em", textAlign:"center", textDecoration:"none" }}>UPGRADE TO PRO →</a>
          </div>
        </div>
        <div style={{ textAlign:"center", paddingBottom:60 }}>
          <button onClick={() => { sessionStorage.setItem('4cbon_visited','1'); setShowLanding(false); }} style={{ background:"linear-gradient(135deg,#ff6b35,#00d4ff)", border:"none", borderRadius:6, color:"#03030a", fontFamily:"monospace", fontWeight:900, fontSize:12, padding:"14px 32px", letterSpacing:"0.1em", cursor:"pointer" }}>▶ RUN THE PIPELINE FREE</button>
          <div style={{ fontSize:8, color:"#1a1a2e", letterSpacing:"0.15em", marginTop:24 }}>THINK → PARSE → GROUND → ADJUDICATE → ATTACK → DECOMPRESS → HYPOTHESIZE → EVALUATE → PLAN → REWRITE → REFLECT → REMEMBER → LEARN → EVOLVE → QUESTION → CERTIFY</div>
        </div>
      </div>
    </div>
  );

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
              <div style={{ fontSize: 8, color: "#333", letterSpacing: "0.28em", marginTop: 4 }}>RUNTIME MEGAPROMPT ENGINE · 16 LAYERS · L9 · L10</div>
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

        {/* BUTTON ROW — hidden when daily limit reached */}
        {error !== "DAILY_LIMIT_REACHED" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          <button onClick={run} disabled={running || !answer.trim()}
            style={{ flex: 2, background: running ? "#0a0a14" : "linear-gradient(135deg,#ff6b35,#00d4ff)", border: `1px solid ${running ? "#1a1a2e" : "#ff6b3544"}`, borderRadius: 6, color: running ? "#333" : "#030308", fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, fontSize: 11, padding: "12px 8px", letterSpacing: "0.08em", minWidth: 0 }}>
            {running ? "⟳ RUNNING..." : "▶ RUN PIPELINE"}
          </button>

          <button onClick={runNextQuestion} disabled={running || questionIndex >= QUESTION_BANK.length}
            style={{ flex: 3, background: running || questionIndex >= QUESTION_BANK.length ? "#0a0a14" : "linear-gradient(135deg,#7c3aed,#38bdf8)", border: `1px solid ${running || questionIndex >= QUESTION_BANK.length ? "#1a1a2e" : "#7c3aed44"}`, borderRadius: 6, color: running || questionIndex >= QUESTION_BANK.length ? "#333" : "#030308", fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, fontSize: 11, padding: "12px 8px", letterSpacing: "0.08em", minWidth: 0 }}>
            {questionIndex >= QUESTION_BANK.length ? "✓ ALL DONE" : `⟫ Q${questionIndex + 1} AUTO`}
          </button>

          <button onClick={batchRunning ? stopBatch : runAllQuestions}
            disabled={running || questionIndex >= QUESTION_BANK.length}
            style={{ flex: 2, background: batchRunning ? "#0a0a14" : running || questionIndex >= QUESTION_BANK.length ? "#0a0a14" : "linear-gradient(135deg,#10b981,#7c3aed)", border: `1px solid ${batchRunning ? "#ef444433" : running || questionIndex >= QUESTION_BANK.length ? "#1a1a2e" : "#10b98144"}`, borderRadius: 6, color: batchRunning ? "#ef4444" : running || questionIndex >= QUESTION_BANK.length ? "#333" : "#030308", fontFamily: "'JetBrains Mono',monospace", fontWeight: 900, fontSize: 11, padding: "12px 8px", letterSpacing: "0.08em", minWidth: 0 }}>
            {batchRunning ? "■ STOP BATCH" : questionIndex >= QUESTION_BANK.length ? "✓ ALL DONE" : "⟫⟫ RUN ALL"}
          </button>

          {running && (
            <button onClick={stop} style={{ background: "transparent", border: "1px solid #ef444433", borderRadius: 6, color: "#ef4444", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, padding: "12px 10px" }}>✕</button>
          )}
          {!running && hasOutput && (
            <>
              <button onClick={copyAll} style={{ background: copyAllDone ? "#10b98122" : "transparent", border: `1px solid ${copyAllDone ? "#10b981" : "#1a1a2e"}`, borderRadius: 6, color: copyAllDone ? "#10b981" : "#444", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, padding: "12px 10px" }}>
                {copyAllDone ? "✓" : "⊡"}
              </button>
              <button onClick={clear} style={{ background: "transparent", border: "1px solid #1a1a2e", borderRadius: 6, color: "#444", fontFamily: "'JetBrains Mono',monospace", fontSize: 11, padding: "12px 10px" }}>✕</button>
            </>
          )}
        </div>
        )}

        {/* BATCH PROGRESS */}
        {(batchRunning || batchProgress.total > 0) && (
          <div style={{ margin: "12px 0", padding: "14px 16px", background: "#06060f", border: `1px solid ${batchRunning ? "#10b981" : "#1a1a2e"}`, borderLeft: `3px solid ${batchRunning ? "#10b981" : "#333"}`, borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: "#10b981", letterSpacing: "0.2em", marginBottom: 8 }}>
              AUTONOMOUS BATCH RUN {batchRunning ? "— ACTIVE" : "— COMPLETE"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ flex: 1, height: 4, background: "#111", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%`, background: "#10b981", borderRadius: 2, transition: "width 0.5s ease" }} />
              </div>
              <span style={{ fontSize: 10, color: "#10b981", fontFamily: "monospace", minWidth: 60 }}>
                {batchProgress.current}/{batchProgress.total}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#444466", fontFamily: "monospace" }}>{batchProgress.status}</div>
            {batchRunning && (
              <div style={{ fontSize: 9, color: "#333355", marginTop: 6, fontFamily: "monospace" }}>
                You can minimize this tab. The pipeline runs autonomously.
              </div>
            )}
          </div>
        )}

        {error && (
          error === "DAILY_LIMIT_REACHED" ? (
            <div style={{ margin: "16px 0", padding: "20px", background: "#0a0a14", border: "1px solid #ff6b3533", borderLeft: "3px solid #ff6b35", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "#ff6b35", fontWeight: 700, marginBottom: 8, fontFamily: "monospace" }}>
                You've used your 3 free runs today
              </div>
              <div style={{ fontSize: 11, color: "#5a5a82", marginBottom: 16, lineHeight: 1.6 }}>
                Upgrade for unlimited runs, cross-session memory, AI feedback generator, and L9 self-questions.
              </div>
              <a href="https://4175358678144.gumroad.com/l/tbphpi" style={{ display: "inline-block", background: "linear-gradient(135deg,#ff6b35,#00d4ff)", borderRadius: 6, color: "#030308", fontFamily: "monospace", fontWeight: 900, fontSize: 12, padding: "12px 24px", textDecoration: "none", letterSpacing: "0.1em" }}>
                UPGRADE TO PRO — $9/month →
              </a>
              <div style={{ fontSize: 9, color: "#333", marginTop: 10, fontFamily: "monospace" }}>Resets daily at midnight · Cancel anytime</div>
            </div>
          ) : (
            <div style={{ background: "#1a0808", border: "1px solid #ef444433", borderLeft: "3px solid #ef4444", borderRadius: 6, padding: "12px 16px", fontSize: 12, color: "#ef4444", marginBottom: 16, fontFamily: "monospace" }}>
              {error}
            </div>
          )
        )}

        {(running || hasOutput) && (
          <PipelineBar activeLayer={activeLayer} completedLayers={completedLayers} />
        )}

        <ScoreBar before={scoreBefore} after={scoreAfter} scoring={scoring} />

        {LAYERS.map(layer => (
          <LayerCard key={layer.id} layer={layer} content={layerOutputs[layer.id] || ""} streaming={streamingLayer === layer.id} />
        ))}

        {/* FEEDBACK BOX with AI generator */}
        {showFeedback && !running && (
          <FeedbackBox
            runId={currentRunId}
            originalAnswer={lastAnswer}
            l4Output={lastL4Output}
            onClose={() => setShowFeedback(false)}
          />
        )}

        <div ref={bottom} style={{ height: 40 }} />
      </div>

      <div style={{ borderTop: "1px solid #0f0f1e", padding: "16px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 8, color: "#1a1a2e", letterSpacing: "0.2em" }}>
          THINK → PARSE → GROUND → ADJUDICATE → ATTACK → DECOMPRESS → HYPOTHESIZE → EVALUATE → PLAN → REWRITE → REFLECT → REMEMBER → LEARN → EVOLVE → QUESTION → CERTIFY
        </div>
      </div>
    </div>
  );
}
