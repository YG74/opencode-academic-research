# Quick Start

Get from zero to your first AI-assisted research in 3 steps.

## Step 1: Install

```bash
# Install OpenCode
# See https://opencode.ai for the current installer for your platform.

# Clone this repo somewhere stable
git clone https://github.com/YG74/opencode-academic-research.git ~/opencode-academic-research

# Symlink skills, commands, and the plugin into your OpenCode config
cd ~/opencode-academic-research
./install.sh

# Install the plugin runtime and Python verification deps
bun install
uv sync --extra dev
```

OpenCode auto-discovers skills, commands, and plugins from `~/.config/opencode/{skills,commands,plugins}/`. See [docs/SETUP.md](docs/SETUP.md) for a manual symlink alternative, a global copy install, and troubleshooting.

## Step 2: Launch

```bash
opencode
```

## Step 3: Start researching

Tell OpenCode what you want to do. It will automatically pick the right skill and mode.

### Example: Guided research (Socratic mode)

```
You: "I have a vague idea about AI's impact on higher education quality assurance,
      but I'm not sure how to frame the research question. Can you guide me?"
```

OpenCode will enter Socratic mode — asking questions to help you clarify your thinking, not giving you answers directly. After 5-15 rounds of dialogue, you'll have a focused research question and methodology direction.

### Example: Write a paper

```
You: "Help me write a paper about the impact of declining birth rates
      on private universities in Taiwan"
```

### Example: Review an existing paper

```
You: "Review this paper" (then paste or attach the paper)
```

### Example: Full pipeline (research → write → review → revise → publish)

```
You: "I want to produce a complete research paper about how agentic AI
      is reshaping student learning outcome measurement"
```

This triggers the full 10-stage pipeline. Budget ~$4-6 in API costs and 2-4 hours of collaborative work.

## Which mode should I use?

| I want to... | Use this |
|-------------|----------|
| Explore a vague idea | `deep-research` socratic mode — just describe your interest |
| Get a quick literature summary | `deep-research` quick mode |
| Do a systematic review (PRISMA) | `deep-research` systematic-review mode |
| Write a paper from scratch | `academic-paper` full mode |
| Plan a paper chapter by chapter | `academic-paper` plan mode |
| Get my paper reviewed | `academic-paper-reviewer` full mode |
| Do everything end-to-end | `academic-pipeline` — say "I want a complete research paper" |

## What's next?

- [Full README](README.md) — all features, modes, installation options, and changelog
- [中文版](README.zh-TW.md) — Traditional Chinese version
- [Pipeline showcase](examples/showcase/) — real artifacts from a complete pipeline run
