# Technical Engineering Notes & Roadmap Checklist

A curated roadmap of technical deep dives, system design breakdowns, and engineering writeups based on real production implementations across machine learning, systems programming, and backend architecture.

---

## 🔬 Deep-Dive Technical Writeups

### 1. Continuous Behavioral Biometrics with Neural Score Fusion (BehaveGuard)
- [ ] **Problem Formulation**: Why static passwords and one-time MFA fail against session hijacking and insider threats.
- [ ] **Dual-Stream Signal Processing**:
  - Keystroke dynamics: Digraph flight and dwell timing extraction.
  - Mouse kinematics: Curvature, velocity jitter, acceleration, and tremor measurement.
- [ ] **Model Architecture**:
  - Synchronous classical scoring: RobustScaler + profile centroids + RBF-SVM for immediate, millisecond-level verification.
  - Asynchronous neural fusion: BiLSTM (keystroke sequence) + Temporal Convolutional Network (TCN, mouse trajectory sequence).
- [ ] **Distributed Training Pipeline**:
  - Redis Streams job queue (`XADD`, `XAUTOCLAIM`) for background retraining workers.
  - Promotion gate: Held-out validation split evaluation before promoting candidate neural models to active production serving.
- [ ] **Security Signal Layer**:
  - Passive detection vs active blocks: rate limiting, replay payload hashing, and FAR boundary probing alerts.

---

### 2. Sub-5ms CLI Engineering in Go: Lessons from Building `frick`
- [ ] **The Latency Budget**: Why Python/Node CLIs feel sluggish for interactive shell hooks and how Go achieves sub-5ms cold starts.
- [ ] **Context Injection Engine**:
  - Capturing failed terminal exit codes and capturing shell history without pollution (`eval "$(frick init)"`).
  - Active directory traversal and virtualenv detection for accurate suggestion context.
- [ ] **Safety Tier Classification**:
  - Designing deterministic safety boundaries: `SAFE` (informational), `WARNING` (mutations), and `DANGER` (destructive commands requiring explicit `y/yes` confirmation).
- [ ] **Double-Frick / Self-Correction Loop**: Heuristics for detecting sequential failed corrections and pivoting suggestion strategies.
- [ ] **Cross-Platform Distribution**: Automated Homebrew tap maintenance (`BriskAM/homebrew-frick`) and multi-arch binary releases via GitHub Actions.

---

### 3. AST-Aware Codebase Chunking & Streaming RAG (Cortex)
- [ ] **The Failure of Naive Token Windowing**: Why standard fixed-size chunking destroys syntax trees, variable scopes, and class definitions.
- [ ] **Tree-Sitter AST Parsing**: Splitting code along function, method, and struct boundaries while preserving import context.
- [ ] **Multi-Artifact Indexing**: Joint vector indexing across git commit diffs, pull request discussions, and repository source code.
- [ ] **Async Ingestion Architecture**: Offloading heavy vectorization and ChromaDB writes to Celery workers with Redis brokers.
- [ ] **Streaming Chat APIs**: Server-Sent Events (SSE) implementation in Flask with token-by-token cited line-range references.

---

### 4. Plant Leaf Super-Resolution with Conditional GANs (LeafSR)
- [ ] **Architecture Design**: ESRGAN-lite with Residual-in-Residual Dense Blocks (RRDB) optimized for biological leaf venation patterns.
- [ ] **Training Stability & Optimizations**:
  - Automatic Mixed Precision (AMP) in PyTorch for $2\times$ training throughput.
  - Exponential Moving Average (EMA) weight checkpointing to eliminate GAN generator oscillation artifacts.
- [ ] **Production Packaging**: Containerizing PyTorch inference pipelines in minimal Docker images with smoke-test CI verification.

---

### 5. Zero-Knowledge Secrets Architecture (Keyway)
- [ ] **Cryptographic Storage**: PBKDF2-HMAC-SHA256 key derivation with high iteration counts and AES-GCM encryption.
- [ ] **Session Isolation**: Ephemeral, in-memory-only Redis key management ensuring master keys are never persisted to disk.
- [ ] **Containerized Deployment**: Multi-container Docker Compose setup with hardened PostgreSQL access rules.

---

## 🛠 Portfolio Site Polish & Future Enhancements

- [x] Soft light mode with smooth theme toggling and persistent storage.
- [x] Top navigation bar with section links, `⌘K` trigger, and anchor jump clearance.
- [x] Full-width frosted navbar backdrop to prevent text collision during scrolling.
- [x] Sharp brutalist corners (`rounded-none`) across all cards, buttons, and dialogs.
- [x] Conway's Game of Life background with click-to-spawn gliders/spaceships.
- [x] Tactile Game of Life controls (toolbar + hotkeys `Space`, `G`, `P`, `R`, `C`).
- [x] Web Audio API synthesized sound feedback (clicks & chimes) with toggle.
- [x] One-click Homebrew install copy snippet on the `frick` project card.
- [x] Promotion of `BehaveGuard` (mkgstf) and `frick` to top featured projects.
- [ ] Dynamic Open Graph (OG) social card generation.
- [ ] Interactive 3-line terminal simulator widget for `frick`.
