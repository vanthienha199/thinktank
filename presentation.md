---
marp: true
theme: uncover
class: invert
paginate: true
backgroundColor: #0a0a1a
color: #e0e0e0
style: |
  section {
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 28px;
  }
  h1, h2 {
    color: #00f0ff;
  }
  h3, h4 {
    color: #ff00ff;
    margin-bottom: 10px;
  }
  table {
    font-size: 0.7em;
    margin: 0 auto;
  }
  th {
    background: rgba(0,240,255,0.2);
    color: #00f0ff;
    padding: 8px 12px;
  }
  td {
    padding: 6px 12px;
  }
  code {
    background: rgba(0,240,255,0.1);
    color: #00f0ff;
  }
  ul, ol {
    font-size: 0.85em;
  }
---

# ThinkTank

### Crowdsourcing Human Judgments for AI Reasoning Efficiency

**Ha Le**
Advisor: Professor Di Wu
*Unary Lab, ECE Department, UCF*

February 12, 2026

---

## The Problem
#### AI Agents Waste Compute on Unnecessary Reasoning

**Q: What is 15% of 80?**

| Step | Content | |
|:----:|---------|:---:|
| 1 | "I need to calculate 15% of 80..." | |
| 2 | "15% = 15/100 = 0.15" | ⚠️ |
| 3 | "Let me verify..." | ⚠️ |
| 4 | "0.15 × 80 = 12" | |
| 5 | "Let me double-check..." | ⚠️ |
| 6 | "The answer is 12." | |

*Kim et al., "The Cost of Dynamic Reasoning" (2025)*

---

## Research Gap

| Challenge | Current State |
|-----------|---------------|
| Which steps are wasteful? | **No ground truth exists** |
| How to train PRMs? | **Need step-level labels** |
| Expert annotation? | **Expensive, doesn't scale** |

<br>

### Key Insight
Human consensus can create ground truth for reasoning efficiency

---

## Solution: ThinkTank GWAP
*Game With A Purpose* for crowdsourcing reasoning labels

<div style="display:flex; justify-content:center; align-items:center; gap:8px; margin:20px 0; font-size:0.6em;">
<div style="background:rgba(168,85,247,0.3); border:2px solid #a855f7; padding:12px 16px; border-radius:8px; text-align:center;">Players see<br>reasoning chains</div>
<span style="color:#00f0ff; font-size:1.5em;">→</span>
<div style="background:rgba(168,85,247,0.3); border:2px solid #a855f7; padding:12px 16px; border-radius:8px; text-align:center;">Flag steps as<br>"wasteful"</div>
<span style="color:#00f0ff; font-size:1.5em;">→</span>
<div style="background:rgba(168,85,247,0.3); border:2px solid #a855f7; padding:12px 16px; border-radius:8px; text-align:center;">Consensus<br>emerges</div>
<span style="color:#00f0ff; font-size:1.5em;">→</span>
<div style="background:rgba(0,255,136,0.3); border:2px solid #00ff88; padding:12px 16px; border-radius:8px; text-align:center;">Training data<br>for PRMs</div>
</div>

**Inspiration:** Foldit, ESP Game, Galaxy Zoo

---

## Platform Overview

| Game Modes | Gamification |
|------------|--------------|
| **Expert Calibration** - 4 difficulty levels | Points & Leaderboard |
| **Consensus Challenge** - Compare with community | Level progression |
| **Speed Trial** - 60-second time attack | Real-time feedback |

<br>

### Live at: [vanthienha199.github.io/thinktank](https://vanthienha199.github.io/thinktank/)

---

## Pilot Results (6 Days)

| Metric | Value |
|--------|-------|
| Users | **19** |
| Judgments | **206** |
| Chains | **82** |
| Avg Time | **23 seconds** |

<br>

| Label Type | Steps |
|------------|-------|
| High Consensus (>70%) - "Wasteful" | **84** |
| Low Consensus (<30%) - "Useful" | **116** |

---

## Key Findings

| Pattern | Consensus | Interpretation |
|---------|-----------|----------------|
| "Let me restate the problem..." | >80% | Consistently wasteful |
| Verification on simple math | >70% | Usually wasteful |
| Core calculations | <10% | Consistently useful |
| Final answer statement | <5% | Never wasteful |

<br>

**200 steps** now have high-confidence labels

---

## User Engagement

| User | Points | Level |
|------|--------|-------|
| Hhf | 144 | Master |
| Vợ Anh | 126 | Master |
| AnhThu | 98 | Master |
| thuta | 58 | Master |
| Skibidi Geo | 50 | Master |

- **Top 3 users:** 62% of all judgments
- **7 users** reached Master level
- **23 sec avg** per judgment (users reading, not skipping)

---

## Research Applications

### 1. PRM Training Data
High-consensus labels → Train reward models to prefer efficient reasoning

### 2. Compute Optimization
Identify wasteful patterns → Prune unnecessary reasoning at inference

### 3. Living Benchmark
Continuous human feedback → Dynamic evaluation of reasoning efficiency

---

## Next Steps

| Short-term | Long-term |
|------------|-----------|
| Scale to 50+ users | Publish dataset on HuggingFace |
| Add real LLM outputs (GPT-4, Claude) | Pilot PRM training experiments |
| Calculate Fleiss' Kappa | Workshop paper submission |

---

## Conclusion

ThinkTank demonstrates that **gamification** can effectively crowdsource **step-level reasoning labels** from non-experts.

<br>

**In 6 days:** 19 users, 206 judgments, 200 labeled steps

<br>

### Live Demo: [vanthienha199.github.io/thinktank](https://vanthienha199.github.io/thinktank/)

<br>

**Thank you! Questions?**
