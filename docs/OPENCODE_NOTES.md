# OpenCode notes

This document covers OpenCode runtime mechanics that matter for `opencode-academic-research`. It is reference material for maintainers and curious users. End-user setup lives in [`SETUP.md`](SETUP.md).

---

## 1. Discovery model

OpenCode discovers skills, commands, and plugins by walking three directories:

```
~/.config/opencode/
├── skills/<name>/SKILL.md
├── commands/<name>.md
└── plugins/<name>.ts
```

(`$XDG_CONFIG_HOME/opencode/` if `XDG_CONFIG_HOME` is set.)

Project-level overrides live in `.opencode/` at the workspace root. This port ships at user level via `install.sh` symlinks, not at project level, so the skills are available in every OpenCode session regardless of working directory.

### Skill discovery

A skill is "any directory under `skills/` with a `SKILL.md` whose YAML frontmatter parses cleanly." OpenCode reads only the frontmatter on discovery; the body is loaded lazily when the skill activates. Required fields:

- `name` — string, must match directory name.
- `description` — string, used by the model to decide when to use the skill.

Recommended fields used in this repo:

- `version` — string (semver-ish).
- `license` — string.
- `compatibility` — space-separated runtimes (`opencode claude-code`).
- `allowed-tools` — comma-separated tool names the skill is allowed to call.
- `data_access_level` — `raw` / `redacted` / `verified_only` (upstream convention).
- `task_type` — `open-ended` or `outcome-gradable` (upstream convention).

### Command discovery

Slash commands are markdown files under `commands/` with YAML frontmatter. Required:

- `description` — what the command does, shown in the `/` palette.

Recommended:

- `agent` — which agent runs the command (`build`, `general`, `plan`). This port uses `build` since the commands may write files.
- `model` — optional per-command model override (e.g. `vllm/qwen3.6`). OpenCode's command schema supports this field; the port uses it to map upstream's `model: sonnet` light-command routing.
- `compatibility: opencode` — declares the command targets OpenCode.

OpenCode **does** support per-command model pinning through the `model:` frontmatter field. The active session model is used only when the command omits `model:`.

### Plugin discovery

Plugins are TypeScript files under `plugins/` exporting a `Plugin` from `@opencode-ai/plugin`. OpenCode loads them at startup and registers their hook handlers.

---

## 2. Plugin runtime

### Hook surface

`@opencode-ai/plugin` exposes hooks including:

- `session.created` — fires when a new session starts. This is notification-only; it cannot modify the system prompt.
- `chat.message` — fires for each new user message.
- `chat.params` — fires before sending the prompt to the model.
- `experimental.chat.system.transform` — fires before every LLM request and lets a plugin mutate the assembled system prompt array in place.
- `tool.execute.before` / `tool.execute.after` — fire around tool calls.

The port's `plugins/ars-session-loaded.ts` uses `experimental.chat.system.transform` to prepend a concise ARS capability block on the first request of each session, which is the closest OpenCode equivalent to the upstream Claude Code `SessionStart` `additionalContext` injection.

### Runtime requirements

The plugin needs the `@opencode-ai/plugin` package installed at runtime. The repo's `package.json` declares it as a dev dependency; running `bun install` in the repo fetches it. If `bun install` is skipped, OpenCode loads the plugin file, the import fails, and the plugin silently does not run — there is no visible error.

### Why a plugin and not a system prompt

OpenCode's plugin runtime does not support emitting `additionalContext` on session creation the way Claude Code does. The closest equivalent is `experimental.chat.system.transform`, which mutates the system prompt before each LLM request. The port uses that hook to inject a concise capability reminder on the first request of a session, so the model still knows the ARS feature set (environment flags, token budgets, slash commands) without relying on the discovery layer alone.

Note: `experimental.chat.system.transform` is marked experimental and may be replaced by V2 plugin "Context Sources". If it is removed, the fallback is to load the same text through `opencode.json` instructions (e.g. `ARS_CAPABILITIES.md`).

---

## 3. Permission rules

`opencode.json` at the repo root declares permission rules so OpenCode knows which commands the user has pre-approved for ARS:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "permission": {
    "bash": {
      "uv *": "allow",
      "uvx *": "allow",
      "pytest *": "allow",
      "ruff *": "allow",
      "python scripts/*": "allow"
    }
  }
}
```

These rules apply when the project is opened as a workspace. They do NOT apply when the skills run in some other workspace; in that case OpenCode uses the rules from that workspace's own `opencode.json` plus the user's `~/.config/opencode/opencode.json`. If you use ARS often, copy the relevant rules into your user config.

---

## 4. Model selection

OpenCode picks the model from session settings or the global default. The port preserves the upstream's implicit recommendation in comments but does not enforce it:

| Skill / mode | Upstream recommended | OpenCode equivalent |
|---|---|---|
| `academic-pipeline` full | Opus | Claude 4.7 Opus / GPT-5 Pro |
| `academic-paper-reviewer` full | Opus | Claude 4.7 Opus / GPT-5 Pro |
| `academic-paper` revision-coach | Opus | Claude 4.7 Opus / GPT-5 Pro |
| All other commands | Sonnet | Claude 4.7 Sonnet / GPT-5 Mini |
| Never | Haiku | (skip Claude Haiku / GPT-5 Nano) |

Set your session model in OpenCode before running the heavier commands.

---

## 5. Skill lazy-loading

When a skill activates, OpenCode loads `SKILL.md` plus any referenced files (e.g., agent prompts under `<skill>/agents/`, references under `<skill>/references/`). This is similar to upstream Claude Code's behavior.

The upstream skills reference files using relative paths from `SKILL.md`. The port keeps these paths intact. Where the upstream referenced `.claude/CLAUDE.md`, the port rewrote the reference to `AGENTS.md (project root)` — see the sed pass in the porting commits for the exact diff.

---

## 6. Known limitations

### 6.1 No cross-agent dispatch like Claude Code's plugin agents

Upstream v3.7.0 introduced "plugin-shipped agents" (`agents/synthesis_agent.md`, `agents/research_architect_agent.md`, `agents/report_compiler_agent.md`) as symlinks into `deep-research/agents/`. These were special in Claude Code because the plugin manifest registered them as top-level agents.

OpenCode does not (yet) have a comparable concept. The files still exist in this repo under `agents/`, and the skills' internal Task-tool dispatch still finds them via the existing relative paths. The user-facing `Task` tool sees them as ordinary agent files. There is no functional regression, just one less layer of indirection.

### 6.2 Python script invocation

Several commands (`/ars-mark-read`, `/ars-unmark-read`) shell out to Python scripts under `scripts/`. The commands assume `python` resolves to a Python with the deps installed. If you used `uv` (recommended), prefix with `uv run` or activate the venv. The `opencode.json` permission rules already allow `uv` and `python scripts/*` so OpenCode will not prompt.

### 6.3 SessionStart timing

`session.created` fires after OpenCode initializes the session but before the first user message. If you add UI-facing output to the plugin, be aware some clients buffer log messages until after the first model response.

---

## 7. Why not a single mega-skill?

We considered packaging the four skills as a single `academic-research-suite` skill (matching the Codex CLI sibling distribution shape). We kept four because:

1. OpenCode's skill model rewards small, well-scoped descriptions for routing accuracy.
2. The upstream skill boundary maps to the routing protocol in `shared/references/intent_clarification_protocol.md`; collapsing them would require rewriting the routing rules.
3. Periodic upstream syncs are simpler when the file layout matches upstream.

---

## 8. References

- OpenCode docs: [`opencode.ai/docs`](https://opencode.ai/docs)
- `@opencode-ai/plugin` package: [`opencode.ai/docs/plugins/`](https://opencode.ai/docs/plugins/)
- Upstream Claude Code plugin: [`Imbad0202/academic-research-skills`](https://github.com/Imbad0202/academic-research-skills)
- Maintained Claude Code fork: [`timpara/academic-research-skills`](https://github.com/timpara/academic-research-skills)
