# OpenClaw Token Optimization Guide
## Reduce Your AI Costs by 90%+

**What You'll Achieve:**
- 90%+ token cost reduction
- 5 minutes to implement
- No complex setup

| Feature | Benefit |
|---------|---------|
| Free Local LLM | Heartbeats cost $0 |
| Smart 3-Tier Routing | Right model for the job |
| Session Management | Stop wasting context |

---

## The Problem

Default OpenClaw config prioritizes capability over cost. You're probably burning tokens on routine tasks that don't need expensive models.

## The Solution: 6 Key Optimizations

Combined, these take a **$70-90/month bill down to $3-5/month**.

| Time Period | Before | After |
|-------------|--------|-------|
| Daily | $2-3 | **$0.10** |
| Monthly | $70-90 | **$3-5** |
| Yearly | $800+ | **$40-60** |

---

# Part 1: Session Initialization

## The Problem
Your agent loads 50KB of history on every message — wasting 2-3M tokens per session.

## The Solution

Add to your system prompt:

```
SESSION INITIALIZATION RULE:
On every session start:
1. Load ONLY: SOUL.md, USER.md, IDENTITY.md, memory/YYYY-MM-DD.md
2. DO NOT auto-load: MEMORY.md, session history, prior messages
3. When user asks about prior context: use memory_search() on demand
4. Update memory/YYYY-MM-DD.md at end of session
```

**Results:**
- Before: 50KB context, $0.40/session
- After: 8KB context, $0.05/session

---

# Part 2: 3-Tier Model Routing

Use the right model for the right job:

| Tier | Model | Cost/1M Tokens | Use Case |
|------|-------|----------------|----------|
| 🟢 Free | Ollama (llama3.2:3b) | $0 | Heartbeats, simple checks |
| 🟡 Mid | MiniMax M2.5 | $0.30/$1.10 | Default: coding, content, automation |
| 🔴 High | Claude Sonnet 4.6 | $3.00/$15.00 | Architecture, security, complex reasoning |

## Config (~/.openclaw/openclaw.json)

```json
{
  "agents": {
    "defaults": {
      "model": { "primary": "minimax/minimax-m2.5" }
    },
    "models": {
      "anthropic/claude-sonnet-4-6": {
        "alias": "sonnet",
        "provider": "anthropic",
        "apiKey": "$ANTHROPIC_API_KEY"
      },
      "minimax/minimax-m2.5": {
        "alias": "minimax",
        "provider": "openrouter",
        "apiKey": "$OPENROUTER_API_KEY"
      },
      "ollama/llama3.2:3b": {
        "alias": "local",
        "provider": "ollama",
        "endpoint": "http://localhost:11434"
      }
    }
  }
}
```

## System Prompt Rules

```
MODEL SELECTION RULE:
- Default: MiniMax M2.5 (minimax)
- Switch to Sonnet ONLY for: architecture, security, complex debugging, strategic planning
- Use Local (Ollama) for: heartbeats, file checks, yes/no routing
- When in doubt: Try MiniMax first
```

**Cost Impact:**
- Heartbeats: $5-15/mo → $0/mo
- 100 routine tasks/day: $45/mo → $3.30/mo
- 5 complex tasks/day: $22/mo → $3.75/mo

---

# Part 3: Heartbeat to Ollama

## Step 1: Install Ollama

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2:3b
```

## Step 2: Configure Heartbeat

```json
{
  "heartbeat": {
    "every": "1h",
    "model": "ollama/llama3.2:3b",
    "session": "main",
    "target": "telegram",
    "prompt": "Check: Any blockers, opportunities, or progress updates needed?"
  }
}
```

## Step 3: Verify

```bash
ollama serve
ollama run llama3.2:3b "respond with OK"
```

**Results:** $5-15/month → $0/month for heartbeats

---

# Part 4: Rate Limits & Budgets

Add to system prompt:

```
RATE LIMITS:
- 5 seconds minimum between API calls
- 10 seconds between web searches
- Max 5 searches per batch, then 2-minute break
- Batch similar work (one request for 10 leads, not 10)
- If 429 error: STOP, wait 5 minutes, retry

DAILY BUDGET: $2 (warning at 75%)
MONTHLY BUDGET: $50 (warning at 75%)
```

| Limit | Prevents |
|-------|----------|
| 5s between calls | Rapid-fire token burn |
| 10s between searches | Search loops |
| 5 searches max/batch | Runaway research |
| Budget warnings | Surprise bills |

---

# Part 5: Workspace File Templates

## SOUL.md

```markdown
# SOUL.md

## Core Principles
[Your agent principles]

## Model Selection
- Default: MiniMax M2.5 (minimax)
- Sonnet: architecture, security, complex reasoning
- Local: heartbeats, simple checks

## Rate Limits
5s between API calls, 10s between searches, max 5/batch then 2min break
```

## USER.md

```markdown
# USER.md

- **Name:** [Your name]
- **Timezone:** [Your timezone]
- **Mission:** [What you're building]

## Success Metrics
- [Metric 1]
- [Metric 2]
```

**Tip:** Keep these lean. Every line costs tokens.

---

# Part 6: Prompt Caching

*90% discount on reused content*

## How It Works

| Request | Cost |
|---------|------|
| First request | Full price |
| Within 5 min (cached) | 10% of normal |

## What to Cache

| ✓ Cache | ❌ Don't Cache |
|---------|---------------|
| SOUL.md | Daily memory files |
| USER.md | Recent messages |
| TOOLS.md | Tool outputs |
| Reference docs | |

## Config

```json
{
  "agents": {
    "defaults": {
      "cache": {
        "enabled": true,
        "ttl": "5m",
        "priority": "high"
      }
    },
    "models": {
      "anthropic/claude-sonnet-4-6": {
        "cache": true
      },
      "minimax/minimax-m2.5": {
        "cache": false
      }
    }
  }
}
```

**Note:** Caching works with direct Anthropic API (not OpenRouter). MiniMax is already cheap enough that caching overhead > savings.

---

# Quick Reference

## Model Tier Summary

| Tier | Model | Alias | Cost/1M | When |
|------|-------|-------|---------|------|
| 🟢 Free | Ollama llama3.2:3b | local | $0 | Heartbeats, checks |
| 🟡 Mid | MiniMax M2.5 | minimax | $0.30/$1.10 | Default |
| 🔴 High | Claude Sonnet 4.6 | sonnet | $3/$15 | Complex reasoning |

## Checklist

- [ ] Added SESSION INITIALIZATION RULE to system prompt
- [ ] Updated config with 3-tier models (local, minimax, sonnet)
- [ ] Set MiniMax as primary/default model
- [ ] Added MODEL SELECTION RULE to system prompt
- [ ] Configured ANTHROPIC_API_KEY (direct Sonnet access)
- [ ] Configured OPENROUTER_API_KEY (MiniMax access)
- [ ] Installed Ollama + pulled llama3.2:3b
- [ ] Added heartbeat config pointing to Ollama
- [ ] Added RATE LIMITS to system prompt
- [ ] Created SOUL.md and USER.md
- [ ] Verified with `openclaw shell session_status`

## Verify It's Working

```bash
openclaw shell session_status
```

**Expected:**
- Context size: 2-8KB (not 50KB+)
- Default model: MiniMax M2.5
- Heartbeat: Ollama/local
- Daily costs: $0.10-0.50

---

*Adapted for MAI operations by Kobe*