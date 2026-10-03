# Taste
- For feature work, wants every feature decomposed into small todos grouped into 5 task tiers by difficulty, and all features grouped into 5 feature tiers by difficulty — a strict hierarchy of feature tier → feature → task tier → task. Confidence: 0.85
- Makes exactly one git commit per completed task/todo — never one commit per feature. Confidence: 0.85
- Wants completed work committed and pushed to origin/main (approves this as the default wrap-up), not left sitting uncommitted. Confidence: 0.6
- Wants project documentation written so other AI agents/LLMs can understand the project cold (e.g., an agent-facing entry doc at the repo root such as AGENTS.md). Confidence: 0.75
- Prefers docs that describe *what the product is* and deliberately defer architectural/product decisions until explicitly asked ("no architectural decisions yet"). Confidence: 0.7
- Expects shipped features to be verified against the actually-running/deployed site (fetching rendered HTML, checking for the expected markers, testing navigation), not just source inspection or a local build. Confidence: 0.7
- Wants features to "just work" with minimal manual setup — favors built-in defaults over required env configuration so a plain commit/push is enough to go live. Confidence: 0.6
