# DARLEK CAAN v3.0: The Inelastic Nihilist Evolution Engine

DARLEK CAAN is a high-fidelity repository evolution platform designed to scan, analyze, and mutate codebases through a multi-agent deliberation framework. Named after the visionary Dalek, the system treats code as a collection of atoms to be rearranged through a process of "pointless exercise" and "evolutionary rearrangement."

## 🛠 Core Architecture

### 1. The Orchestrator (`src/app/page.tsx`)
At the center is a Next.js-powered command center that manages the state of the evolution cycle, including system health, saturation metrics (structural change, velocity, identity preservation), and connection status across various LLM providers.

### 2. The Dalek Brain (`src/lib/dalek-brain.ts`)
A deterministic intelligence engine providing local, self-contained responses. It guides the Operator through the six phases of evolution:
- **Reconnaissance:** Cataloging the codebase.
- **Analysis:** Identifying targets for improvement.
- **Mutation:** Proposing changes with structured risk scores.
- **Deliberation:** The Debate Chamber where 5 agents vote.
- **Coherence Gate:** Verifying system absorption limits.
- **Execution:** Finalizing commits to GitHub.

### 3. Debate Chamber (`src/app/api/evolution/debate`)
Every code mutation is subjected to a vote by a panel of AI personas:
- **Humanist:** Prioritizes readability and DX.
- **Rationalist:** Focuses on logic and algorithmic efficiency.
- **Cooperator:** Ensures architectural consistency.
- **Chaotic:** Pushes for bold refactors.
- **Skeptic:** Minimizes risk and side effects.

### 4. Specialized Skills (`/skills`)
The project includes a robust library of automation skills:
- **Media Gen:** `html2pptx` and `html2pdf-next` for document generation using Playwright.
- **Financials:** `stock-analysis-skill` with watchlist management and storage persistent alerts.
- **Audio/Visual:** TTS, ASR, VLM, and automated podcast generation scripts.

## 🚀 Technical Stack

- **Framework:** Next.js 15 (App Router)
- **Intelligence:** Multi-provider LLM support (Grok-beta, Cerebras Llama-3.3, Anthropic Claude 3.5, Google Gemini 2.0).
- **Git Ops:** Integrated GitHub API service for automated PRs and file management.
- **Validation:** Custom `auto-test` runner for TypeScript syntax checks and dependency verification.
- **Persistence:** Prisma ORM for local state and system memory.

## 🔧 Setup & Configuration

1. **Environment Variables:**
   Ensure you have a `GITHUB_TOKEN` and at least one LLM provider key (e.g., `GROK_API_KEY`, `CEREBRAS_API_KEY`).

2. **Repository Target:**
   Configure your target owner/repo in the `DashboardPanel` to begin the scanning process.

3. **Run Evolution:**
   bash
   npm install
   npm run dev
   

## 🛡 Coherence Gate
The system calculates "Semantic Saturation" to ensure the codebase does not diverge too rapidly from its core purpose. Mutations that exceed the risk threshold or fail the Coherence Gate are automatically rejected and stored in "Rejection Memory" to inform future proposals.