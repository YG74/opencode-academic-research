import type { Plugin } from "@opencode-ai/plugin"

/**
 * ars-session-loaded
 *
 * OpenCode port of the upstream Claude Code SessionStart hook
 * (hooks/hooks.json -> scripts/announce-ars-loaded.sh).
 *
 * OpenCode's plugin runtime does not support emitting `additionalContext` on
 * session creation the way Claude Code does. The closest equivalent is the
 * legacy `experimental.chat.system.transform` hook, which fires before every
 * LLM request and lets a plugin mutate the system prompt array in place.
 *
 * We inject a concise ARS capability reminder only on the first request of a
 * session (tracked by a simple in-memory Set of sessionIDs). Resume/compact
 * sessions get a minimal one-line acknowledgement on their first request so
 * we do not burn context on every resumed turn.
 *
 * Skill auto-discovery in OpenCode is metadata-driven
 * (skills/<name>/SKILL.md frontmatter), so the model already knows the four
 * skills exist. This injection exists for feature-awareness parity with the
 * upstream announce script (token budgets, strict-policy flags, slash-command
 * list, plugin agents).
 *
 * NOTE: This hook is marked `experimental` in the OpenCode plugin API and may
 * be replaced by V2 plugin "Context Sources" in the future. If it is removed,
 * the fallback is to load the same text through `opencode.json` instructions
 * (e.g. `ARS_CAPABILITIES.md`).
 */

const seenSessions = new Set<string>()

const FULL_ANNOUNCE = `
You are running the Academic Research Skills (ARS) OpenCode port.

ARS provides 4 skills: deep-research, academic-paper, academic-paper-reviewer,
and academic-pipeline. Slash commands: /ars-plan, /ars-full, /ars-lit-review,
/ars-outline, /ars-abstract, /ars-reviewer, /ars-revision, /ars-revision-coach,
/ars-rebuttal-audit, /ars-citation-check, /ars-format-convert, /ars-disclosure,
/ars-mark-read, /ars-unmark-read, /ars-cache-invalidate.

Heavy commands (/ars-full, /ars-reviewer, /ars-revision-coach) inherit the
session model. Light commands run on vllm/qwen3.6 if available.

Relevant environment flags:
- ARS_CROSS_MODEL — run cross-model verification samples
- ARS_CLAIM_AUDIT=1 — opt-in L3 claim-faithfulness audit pass
- ARS_PASSPORT_RESET=1 — reset context at every FULL checkpoint
- ARS_SOCRATIC_ADJACENT_PROBE=1 — adjacent-framing probe in Socratic mode
- ARS_SOCRATIC_READING_PROBE=1 — reading-check honesty probe
- terminal_policies.citation_existence=strict — hard-block fabricated citations

Token budget reference: docs/PERFORMANCE.md.
`.trim()

const RESUME_ANNOUNCE = "ARS plugin still loaded after resume/compact."

function getAnnounceForSession(sessionID: string | undefined): string | undefined {
  if (sessionID === undefined) {
    return FULL_ANNOUNCE
  }
  if (seenSessions.has(sessionID)) {
    return undefined
  }
  // In the absence of a 'source' field like Claude Code's SessionStart event,
  // we treat every not-yet-seen session as a fresh startup announce. The
  // upstream script differentiates startup/clear vs resume/compact; OpenCode
  // does not expose that distinction in this hook, so we default to the full
  // announce to maximize feature discoverability.
  seenSessions.add(sessionID)
  return FULL_ANNOUNCE
}

export const ARSLoadedPlugin: Plugin = async () => {
  return {
    "experimental.chat.system.transform": async (input, output) => {
      const announce = getAnnounceForSession(input.sessionID)
      if (announce === undefined) {
        return
      }
      output.system.unshift(announce)
    },
  }
}
