# ThinkTank - Game With A Purpose for AI Reasoning

A gamified crowdsourcing platform that collects human judgments on AI reasoning quality. Players identify wasteful or redundant steps in AI reasoning chains, contributing data to train Process Reward Models.

**Live Demo:** [https://vanthienha199.github.io/thinktank/](https://vanthienha199.github.io/thinktank/)

---

## What is this?

ThinkTank turns the tedious task of evaluating AI reasoning into an engaging game. Instead of asking experts to annotate thousands of reasoning steps, we let anyone play and contribute.

| Problem | Solution |
|---------|----------|
| AI models often "overthink" - repeating calculations, stating obvious facts, verifying unnecessarily | Players flag these wasteful steps |
| Expert annotation is expensive and slow | Gamification enables crowdsourcing at scale |
| No good public datasets for Process Reward Models | ThinkTank generates this training data |

---

## Game Modes

| Mode | Description | Goal |
|------|-------------|------|
| **Expert Calibration** | Progress through 4 difficulty levels (Novice → Master) | Complete 3 queries per level to unlock the next |
| **Consensus** | See how your judgments compare to the community | Match the majority vote |
| **Speed Trial** | 60-second challenge | Analyze as many chains as possible |

---

## Screenshots

### Home Dashboard
![Home](assets/images/Home.png)

### Gameplay - Flagging Wasteful Steps
![Gameplay](assets/images/Target.png)

### Level Progression
![Levels](assets/images/Graduation-cap.png)

---

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Storage:** localStorage (no backend required)
- **Fonts:** Orbitron, Rajdhani (Google Fonts)
- **Theme:** Cyberpunk

No build tools. No dependencies. Just open `index.html` in a browser.

---

## Project Structure

```
thinktank/
├── index.html          # Splash screen
├── onboarding.html     # 3-slide tutorial
├── signup.html         # Profile creation
├── home.html           # Main dashboard
├── levels.html         # Difficulty selection
├── gameplay.html       # Core game interface
├── result.html         # Post-game results
├── consensus.html      # Consensus mode
├── speed.html          # Speed trial mode
├── leaderboard.html    # Global rankings
├── profile.html        # User stats
├── gallery.html        # Demo overview
└── assets/
    └── images/         # All PNG icons
```

---

## How to Run

1. Clone the repository
```bash
git clone https://github.com/vanthienha199/thinktank.git
```

2. Open `index.html` in your browser

That's it. No installation needed.

---

## Research Context

This project supports research on **Process Reward Models (PRMs)** at VinUniversity under Professor Di Wu.

PRMs evaluate the quality of each step in an AI's reasoning chain, not just the final answer. ThinkTank collects human judgments on which steps are:
- Redundant (repeating what was already said)
- Wasteful (unnecessary verification)
- Off-track (doesn't contribute to the solution)

This data can train reward models to prefer efficient reasoning over verbose chains.

---

## Inspiration

- **Foldit** - Crowdsourcing protein folding through games
- **ESP Game** - Using games to label images
- **Galaxy Zoo** - Citizen science for astronomy

ThinkTank applies the same "Game With A Purpose" (GWAP) concept to AI reasoning evaluation.

---

## Author

**Ha Le**
VinUniversity
Contact: halevanthien@gmail.com

---

## License

MIT License - See [LICENSE](LICENSE) file
