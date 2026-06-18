# OpenCode 版 ARS 安裝指南

本指南說明如何在 macOS、Linux 或 Windows（WSL）上安裝 OpenCode 移植版 Academic Research Skills。

上游 Claude Code 插件請見 [`Imbad0202/academic-research-skills`](https://github.com/Imbad0202/academic-research-skills) 或 [`timpara/academic-research-skills`](https://github.com/timpara/academic-research-skills)。本指南僅適用於 OpenCode。

---

## 1. 前置需求

### 必需

- **[OpenCode](https://opencode.ai)** — 依官方說明為你的平台安裝。
- **[bun](https://bun.sh)** — TypeScript 外掛（`plugins/ars-session-loaded.ts`）執行環境。
- **[uv](https://docs.astral.sh/uv/)** — `scripts/` 下 Python 驗證腳本的套件管理器。
- **git** — 用來 clone repo。
- **模型提供商** — Anthropic、OpenAI、GitHub Copilot、Google 或任何 OpenCode 支援的提供商。以 `opencode auth login` 完成認證。

### 選用

- **Pandoc** — DOCX 輸出需要（`format-convert` 模式 → DOCX）。`brew install pandoc` / `apt install pandoc`。
- **tectonic** — APA 7.0 PDF 編譯需要。見 [tectonic-typesetting.github.io](https://tectonic-typesetting.github.io)。
- **Source Han Serif TC**（思源宋體）— 繁體中文 PDF 渲染需要。可從 [Google Fonts](https://fonts.google.com/noto/specimen/Noto+Serif+TC) 下載。
- **Git Bash**（僅 Windows）— 選用的 `PreToolUse` 寫入範圍守衛啟動器是 POSIX shell 腳本，透過 `bash` 呼叫。Git for Windows 內建 Git Bash。

如果只需要 Markdown 輸出，可跳過選用工具。

---

## 2. 安裝

```bash
# 1. Clone
git clone https://github.com/YG74/opencode-academic-research.git
cd opencode-academic-research

# 2. 將 skills、commands、plugins 軟鏈到 OpenCode 設定
./install.sh

# 3. 安裝外掛執行環境（在 repo 內）
bun install

# 4. 安裝 Python 驗證依賴（在 repo 內）
uv sync --extra dev
```

`install.sh` 會把 `~/.config/opencode/{skills,commands,plugins}/` 軟鏈到你的 clone。在這裡修改檔案，下一次 OpenCode 工作階段就會生效。

常用旗標：

- `./install.sh --dry-run` — 只印出會做什麼，不實際執行。
- `./install.sh --force` — 覆蓋既有檔案（會備份成 `*.bak`）。
- `./install.sh --uninstall` — 移除軟鏈。

### 檔案對應

| Repo 內來源 | 軟鏈到 |
|---|---|
| `skills/<name>/` | `~/.config/opencode/skills/<name>` |
| `commands/ars-*.md` | `~/.config/opencode/commands/ars-*.md` |
| `plugins/ars-session-loaded.ts` | `~/.config/opencode/plugins/ars-session-loaded.ts` |

若你將 `XDG_CONFIG_HOME` 設為 `~/.config` 以外的路徑，腳本會尊重該設定。

---

## 3. 驗證

在任何工作目錄開啟 OpenCode 並執行：

```
/ars-plan
```

你應該會看到 `academic-paper` skill 用蘇格拉底對話詢問你的論文。

單發測試：

```
/ars-lit-review "你的主題"
```

`academic-paper` skill 應該會產出一段文獻回顧。

若沒反應，見 [疑難排解](#5-疑難排解)。

---

## 4. 選用設定

### 模型選擇

OpenCode 從你的工作階段設定選擇模型，而不是從 skill frontmatter。上游 Claude Code 外掛針對部分指令（`/ars-full`、`/ars-reviewer`、`/ars-revision-coach`）釘選 `model: opus` 以取得深度；在 OpenCode 中，請為這些指令選用 `kimi-for-coding/k2p7`（Kimi K2.7），其餘輕量指令可用 `vllm/qwen3.6`（本機 Qwen3.6-27B）。

### 環境變數

Python 驗證腳本與部分 agent 層會讀取以下選用環境變數：

| 旗標 | 版本 | 作用 | 參考 |
|---|---|---|---|
| `S2_API_KEY` | v3.3 | Semantic Scholar API key（速率從 1 req/s 提升到 10 req/s） | `scripts/semantic_scholar_client.py` |
| `ARS_CLAIM_AUDIT=1` | v3.8 | 啟用 Stage 4→5 選用的 claim-faithfulness 稽核 | `shared/handoff_schemas.md` |
| `ARS_CROSS_MODEL=1` | v3.0 | 在誠信閘門（Stage 2.5、4.5）啟用跨模型驗證 | 下方「跨模型驗證」 |
| `ARS_CROSS_MODEL_SAMPLE_INTERVAL` | v3.5.0 | 跨模型誠信檢查取樣間隔（advisory） | `shared/cross_model_verification.md` |
| `ARS_PASSPORT_RESET=1` | v3.6.3 | 將每個 FULL checkpoint 提升為 context-reset 邊界 | `skills/academic-pipeline/references/passport_as_reset_boundary.md` |
| `ARS_SOCRATIC_READING_PROBE=1` | v3.5.1 | 在 Socratic Mentor 啟用選用的閱讀檢查探針 | `skills/deep-research/agents/socratic_mentor_agent.md` |
| `ARS_SOCRATIC_ADJACENT_PROBE=1` | v3.13.0 | 在探索性 Socratic 工作階段啟用選用的相鄰框架探針 | `skills/deep-research/agents/socratic_mentor_agent.md` |
| `ARS_VERIFICATION_CACHE_PATH` | v3.11 | 覆寫引用驗證快取位置。不是開關 — 快取預設開啟，此變數只改路徑 | `scripts/verification_cache.py` |

在 shell rc 檔設定，或每次指令前傳入。

### 引用驗證快取（v3.11，#182）

決定性的引用存在性閘門（#182）會對 Semantic Scholar、OpenAlex、Crossref、arXiv 交叉檢查每筆引用。為了避免跨草稿重複查詢，結果會存在本機 SQLite 中。

- **無需設定。** 快取會在首次使用時自動建立在 `~/.cache/ars/verification.db`；項目 90 天後過期。arXiv resolver 不需要 API key。
- **搬移位置**：`export ARS_VERIFICATION_CACHE_PATH=/your/path.db`（例如跨專案共用或放在更快磁碟）。
- **失效單筆引用**：`/ars-cache-invalidate <citation_key>` — 移除該 key 的所有快取列（四家 resolver、所有查詢形式）；若無快取則為冪等 no-op。

快取為單一程序 SQLite WAL；多使用者同時存取同一快取檔案不在範圍內。

### 跨模型驗證（選用）

ARS 在 OpenCode 中可只用單一模型運作。若要更高信心，可啟用第二個 AI 模型獨立驗證誠信檢查並挑戰魔鬼代言人。

v3.13.0 的 provider-agnostic verifier 接受 OpenAI-compatible endpoint（MiMo、DeepSeek、self-hosted）以及第一方 OpenAI。 grounded 的第一方 OpenAI 路徑會保留，且**不會**透過通用 `OPENAI_BASE_URL` proxy 路由，因此現有 proxy 使用者不會被默默降級。

#### 快速設定

```bash
# 步驟 1：設定 API key（擇一或兩者）
export OPENAI_API_KEY="sk-your-key-here"        # GPT-5.4 Pro 用
export GOOGLE_AI_API_KEY="AIza-your-key-here"    # Gemini 3.1 Pro 用

# 步驟 2：選擇跨模型驗證模型
export ARS_CROSS_MODEL="gpt-5.4-pro"            # 推理最強
# 或：export ARS_CROSS_MODEL="gemini-3.1-pro-preview"  # 事實驗證強

# 步驟 3：照常執行 OpenCode — 跨模型驗證會自動啟動
opencode
```

#### 啟用後的差異

| 功能 | 無跨模型 | 有跨模型 |
|---|---|---|
| 誠信驗證 | 單一模型 100% 檢查 | + 30% 樣本由第二模型獨立驗證 |
| Devil's Advocate | 單一模型 DA | + 跨模型產生獨立批評，新增發現會併入 |
| Peer Review | 5 位 reviewer（同模型） | 同 5 位 + 跨模型 DA critique / calibration 支援 |

#### 成本

完整 pipeline 約增加 $0.60–1.10 跨模型 API 成本（GPT-5.4 Pro 計價）。詳細見 [`shared/cross_model_verification.md`](../shared/cross_model_verification.md)。

#### 沒有 API key？沒問題

未設定 `ARS_CROSS_MODEL` 時，一切行為與原本完全相同。跨模型功能完全隱形且不增加開銷。

---

## 5. 疑難排解

### `/ars-plan` 沒被辨識

檢查軟鏈是否存在：

```bash
ls -la ~/.config/opencode/commands/ | grep ars-
ls -la ~/.config/opencode/skills/ | grep -E 'academic|deep-research'
```

若目錄為空，重新執行 `./install.sh` 並檢查權限錯誤。

### 工作階段啟動時外掛沒跑

```bash
ls -la ~/.config/opencode/plugins/ars-session-loaded.ts
cd ~/projects/opencode-academic-research && bun install
```

外掛會 import `@opencode-ai/plugin`。若未在 repo 內執行 `bun install`，import 會靜默失敗。

### Python 腳本報 `ModuleNotFoundError`

```bash
cd ~/projects/opencode-academic-research
uv sync --extra dev
uv run python -c "import yaml, ruamel.yaml, jsonschema; print('ok')"
```

請一律用 `uv run` 執行腳本，才能讀到專案 venv。直接用 `python scripts/...` 不會有相依套件。

### Pandoc / tectonic / PDF 編譯失敗

`format-convert` 轉 DOCX 需要 `pandoc` 在 PATH。轉 PDF 需要 `tectonic`，繁體中文還需要系統層安裝 `Source Han Serif TC`。若缺少，會退回 Markdown 輸出。

### `uv sync` 失敗：`invalid peer certificate: UnknownIssuer`

部分 Linux 發行版的 `uv` 預設看不到系統 CA bundle：

```bash
# 選項 A：使用系統 TLS stack
uv sync --extra dev --native-tls

# 選項 B：明確指向系統憑證 bundle
SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt uv sync --extra dev --native-tls
```

若兩者皆失敗，你的發行版 CA bundle 路徑不同 — 檢查 `/etc/pki/tls/certs/ca-bundle.crt`（RHEL/Fedora）或發行版文件。

### 沒有 `bun`

若無法透過官方腳本安裝 `bun`（例如沒有 `unzip` 也沒有 sudo），可改用 npm：

```bash
npm install -g bun
bun --version  # 應顯示 1.x
```

### 上游文件提到 `/plugin marketplace add`

該指令僅適用於 Claude Code。在 OpenCode 請改用 `git clone` + `./install.sh`。若發現文件仍有這類過時引用，請開 issue 或 PR — 維護者希望清除所有這類引用。

---

## 6. 更新

拉取最新上游變更：

```bash
cd ~/projects/opencode-academic-research
git fetch upstream
git checkout -b sync/<date>
git merge upstream/main
# 解決衝突；執行 MIGRATION.md §3 的合併後檢查清單
git checkout main && git merge sync/<date>
```

完整合併後檢查清單（frontmatter 重新套用、hook→plugin 同步等）見 [`MIGRATION.md`](../MIGRATION.md)。

---

## 7. 解除安裝

```bash
cd ~/projects/opencode-academic-research
./install.sh --uninstall
```
