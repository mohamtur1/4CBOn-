# 4CBON Engineering Status Table

*Last updated: June 2026*

Purpose: separate verified claims from assumed claims. "Code reviewed" and "confirmed in production" are different statuses — don't conflate them.

| Component | Status | Evidence |
|---|---|---|
| LP inversion detection | ✅ Working | Standalone isolated tester confirmed YES/NO logic correct on clean input. End-to-end test: caught inversion buried in 3-hypothesis synthesis, pipeline halted correctly. |
| Upstream integrity guard (L2 truncation/refusal check) | ✅ Working | False positive (matching "halt" as a topic word) found and fixed. Regex tightened to specific refusal phrases. Re-tested clean. |
| L4 halt cascade | ✅ Working | Multiple confirmed runs — L4 halts cleanly on `EXECUTION_ABORTED` or sub-500-char output, downstream layers (LR–L10) do not run on failed execution. |
| operatingMode / HIGH_QUALITY scrutiny mode | ⏳ Code verified, runtime confirmation pending | Code review confirms correct wiring: `s0 >= 68` → `operatingMode` → passed into `L2()` → branches correctly into strict scrutiny prompt with NO_REWRITE option. Prior failed test likely run against stale deployed version (same upload-lag pattern as LP bug). Needs one clean live retest to close out. |
| Artifact distillation (LX/LA/LC compressed before L1) | ✅ Working | Used successfully across many runs this week; reduces context load passed to L1. |
| Structured belief schema (JSON to Supabase) | ⚠️ Built, not confirmed | Code writes JSON object with run/score/scope/timestamp/status fields. Never explicitly verified the JSON is landing correctly in Supabase — needs a direct DB check. |
| W layer external source annotation | ⚠️ Built, not specifically tested | Added instruction for W to note what external source type would verify UNKNOWN claims. Not yet observed in a real run output. |
| Autonomous batch run (⟫⟫ RUN ALL) | ✅ Working | Completed 96/96 questions twice, auto-generates and submits feedback, self-belief written after each run. |
| Halt condition — old hard score halt (`if s0 >= 68`) | ❌ Removed | Replaced entirely by operatingMode routing. Caused poor UX (dead-ended strong inputs). No longer in codebase. |
| Kaggle benchmark submission | 🚫 Blocked | Account not phone-verified. Rate-limited on verification attempts. Packages (`kaggle`, `kaggle-benchmarks`) installed and authenticated successfully in Colab — ready to proceed once verification clears. |
| LinkedIn / Reddit distribution | ⏸️ Deprioritized | Reddit post stuck 22 days in moderation, low traction. Decided to deprioritize in favor of Kaggle credibility play. |

---

## Status legend
- ✅ Working — confirmed via direct test, reproducible
- ⏳ Pending — code reviewed/built, awaiting live confirmation
- ⚠️ Unverified — built, exists in code, never directly observed working
- ❌ Removed — deprecated, replaced by something else
- 🚫 Blocked — external dependency preventing progress

## Update rule
Every time something is fixed or tested, update this table same day. Don't rely on memory of "I think that one's fixed" — if it's not in this table with evidence, treat it as unverified.

---

## DATA FLOW FAILURE MAP (CONFIRMED INCIDENTS)

| Layer / Component | Observed Failure | Root Cause (as actually discovered) | Fix Applied | Data Flow Breakpoint Type | Confidence Level |
|---|---|---|---|---|---|
| LP (Policy Translation) | LP produced full policy-document-style output instead of a simple YES/NO verdict; later, faithfully evaluated nonsense when upstream layers failed | LP was receiving corrupted, truncated, or refusal-language L2 output and evaluating it as if it were valid; separately, role framing in LP's own prompt caused it to drift into L2-style table output | (1) Stripped role framing from LP prompt, forced minimal YES/NO format, capped tokens at 5; (2) Added upstream guard before LP runs — checks L2 output for truncation or refusal language and halts pipeline before LP sees broken input | Input boundary violation — no validation gate on data entering LP | Verified in Run |
| L10 (Synthesis/Audit) | L10 repeatedly reported L4 output as "truncated mid-sentence" and certified runs as FAILED, even when the displayed L4 output looked complete | L10's own prompt function contained a hardcoded `l4.slice(0, 600)` — L10 was only ever shown the first 600 characters of L4's actual output, regardless of true length, and had no way to know it was looking at a partial slice | Removed the slice; L10 now receives L4's full, untruncated text, with explicit instruction not to assume truncation unless there is genuinely no closing punctuation | Observation truncation — the audit layer's input window did not match the real artifact size | Verified in Code (confirmed root cause via direct code inspection; re-run after fix produced different, non-truncation-based critique from L10) |
| operatingMode (L2 HIGH_QUALITY routing) | L2 consistently produced the standard scoring-table format even when input score was well above the 68 threshold and `operatingMode` was correctly calculated as "HIGH_QUALITY" | The static, system-level RUNTIME_SPEC description of L2's job ("Score the hypotheses. Identify contradictions, gaps. Pick the best path forward.") was anchoring model behavior more strongly than the mode-specific instruction in the user message | First attempt (explicit override line in system prompt) did not work. Second attempt — removed "you are L2" role framing from the HIGH_QUALITY branch, forced a terse PROCEED/NO_REWRITE decision format, capped tokens at 50 — produced a structural change away from the old table format | Instruction hierarchy conflict — system-level role definition overrode mode-specific runtime instruction | Verified in Run (partial — format changed from old table, exact PROCEED/NO_REWRITE syntax not yet confirmed in a clean test) |
| L2 (task-fit / complexity bias) | Consistent ~16-point score regression (88→72) across multiple runs on the same input; L4 added technically correct, higher-depth content that overshot the apparent audience level of the original answer | L2 had no mechanism to evaluate whether a hypothesis matched the apparent audience or task — it scored hypotheses on correctness and impact only, treating "more accurate detail" as inherently positive regardless of fit | Added a task-inference preamble (apparent audience / task / expected depth / confidence) before scoring; added three new evaluation dimensions (Audience Fit, Complexity Cost, Net Utility); added three decision states (PROCEED / PRESERVE / ESCALATE) replacing the implicit always-rewrite default | Objective misalignment — the evaluation layer optimized for technical correctness without a fitness-to-purpose constraint | Suspected (fix built and deployed; re-run not yet completed to confirm the consistent regression pattern is resolved) |

