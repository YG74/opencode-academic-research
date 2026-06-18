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

## Remaining failures not caused by the directory layout

After the above changes the following upstream tests still fail for reasons
unrelated to the `skills/` layout:

- `scripts/test_eval_harness_workflow.py` (8 errors) — expects
  `.github/workflows/eval-harness.yml`, which is not present in the port.
- `scripts/test_check_v3_6_8_mark_read_commands.py::TestMarkReadCommandsLint::test_real_repo_passes` —
  `commands/ars-mark-read.md` and `commands/ars-unmark-read.md` are missing the
  required `model: sonnet` token.
- `scripts/test_run_guard_launcher.py` (21 failures) — expects
  `hooks/run_guard.sh`, which is not present in the port.
