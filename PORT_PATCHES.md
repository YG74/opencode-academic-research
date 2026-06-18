# OpenCode port patches

This file records the local changes made to the OpenCode port of
`Imbad0202/academic-research-skills` so they can be re-applied after future
upstream syncs.

## Directory-layout compatibility symlinks

Upstream expects the four skill directories at the repository root:

- `deep-research/`
- `academic-paper/`
- `academic-pipeline/`
- `academic-paper-reviewer/`

OpenCode auto-discovers skills under `skills/<name>/SKILL.md`, so this port
keeps the real directories under `skills/`.  To satisfy upstream path
assumptions without moving the real directories, add relative symlinks at the
root:

```bash
ln -s skills/deep-research deep-research
ln -s skills/academic-paper academic-paper
ln -s skills/academic-pipeline academic-pipeline
ln -s skills/academic-paper-reviewer academic-paper-reviewer
```

These symlinks must be committed; several tests materialise the repo with
`git archive HEAD | tar -x`, so uncommitted symlinks are invisible to them.

## `scripts/check_v3_10_134_write_scope.py` — normalise `skills/` paths

The I5 roster-exhaustiveness check globs the real tree, so it sees agents as
`skills/<name>/agents/...` rather than the upstream canonical
`<name>/agents/...`.  A small port-specific helper `_canonical_rel` strips the
leading `skills/` segment before comparing against `BUCKET_A_AGENT_FILES` and
`BUCKET_BCD_AGENT_FILES`.

Re-apply after sync: re-introduce the `_canonical_rel` helper and use it in
place of `md.relative_to(REPO_ROOT).as_posix()` and
`md.resolve().relative_to(REPO_ROOT).as_posix()` inside the I5 loop.

## `hooks/run_guard.sh` and `scripts/announce-ars-loaded.sh` — restore upstream launchers

The upstream Claude Code plugin invokes the write-scope guard and session-start
announce through POSIX shell launchers. Copy these files verbatim from upstream
and commit them:

- `hooks/run_guard.sh`
- `scripts/announce-ars-loaded.sh`

## `.claude/settings.json` — OMO-compatible hook registration

Upstream declares the hooks in `hooks/hooks.json`, which oh-my-openagent (OMO)
does not read. Instead, the port commits `.claude/settings.json` at the repo
root with `pluginRoot: "."` so that `${CLAUDE_PLUGIN_ROOT}` resolves to the
repo root for both `PreToolUse` and `SessionStart` commands.

Re-apply after sync: if upstream changes `hooks/hooks.json`, mirror those
changes into `.claude/settings.json` using the `pluginRoot` pattern.

## `plugins/ars-session-loaded.ts` — OpenCode plugin context injection

OpenCode does not support Claude Code's `additionalContext` emission on
`SessionStart`. The port registers the legacy
`experimental.chat.system.transform` hook and prepends a concise ARS capability
reminder to the system prompt on the first request of each session. This is a
best-effort parity measure; if OpenCode removes the hook, the fallback is to
load the same text through `opencode.json` instructions (e.g.
`ARS_CAPABILITIES.md`).

## Command model routing

OpenCode slash commands support an optional `model:` frontmatter field. The
port maps upstream's `model: sonnet` light-command routing to the user's local
model:

- Light commands: `model: vllm/qwen3.6`
- Heavy commands (`/ars-full`, `/ars-reviewer`, `/ars-revision-coach`): no
  `model:` line, so they inherit the session model (e.g. `kimi-for-coding/k2p7`)

`scripts/check_v3_6_8_mark_read_commands.py` and its unit test are patched to
accept either `model: sonnet` or `model: vllm/qwen3.6`.

## `.github/workflows/eval-harness.yml`

The upstream eval-harness workflow is copied verbatim. The Python eval scripts
already exist in the port; the workflow runs them on PRs touching scoring or
generation logic.

## Dependency pins

- `rfc3339-validator>=0.1.4` is added to `pyproject.toml` so that
  `jsonschema`'s `format=date-time` checks are actually enforced.
- `pypdf` is listed under `dev` optional dependencies so the submission-package
  verifier tests can run without being skipped.

## Remaining known gaps

- Marketplace install (`/plugin marketplace add`) has no OpenCode equivalent;
  the port installs via `git clone + ./install.sh + bun install`.
- Plugin-shipped agents (`agents/*`) exist as files but are not registered as
  top-level agents the way Claude Code's plugin manifest does. OpenCode loads
  them on demand through skill references.
- The `.claude/CLAUDE.md` project instructions are replaced by `AGENTS.md` plus
  the plugin-injected capability block.
