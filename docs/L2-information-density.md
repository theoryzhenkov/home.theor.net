---
scope: L2
summary: "Decision log: information density proposals, verdicts, and where accepted ideas now live"
modified: 2026-03-19
reviewed: 2026-03-19
lifecycle: ephemeral
depends:
  - path: docs/L1-design-vision
  - path: docs/L2-info-architecture
  - path: docs/L1-relations
  - path: docs/L2-reading-experience
  - path: docs/L1-styles
---

# Information Density -- Decision Log

This document records the evaluation of information density proposals. Accepted ideas have been distributed to their natural home specs; this file preserves the decision history.

The guiding principle from L1-design-vision: **practical density** -- optimized for people who read. Every addition must earn its pixels by aiding comprehension or navigation.

## Decision table

| Rank | Idea | Verdict | Destination |
| ---- | ---- | ------- | ----------- |
| 1 | Graph focus button | **Accept** | `docs/L2-graph-viz` -- Focus affordance section |
| 2 | Backlink count in metadata strip | **Accept** | `docs/L2-info-architecture` -- Context line specification |
| 3 | Link type differentiation (solid/dashed/dotted underlines) | **Accept** | `docs/L3-link-system` -- Link type differentiation subsection |
| 4 | Connection count in metadata strip | **Revised to reject** | n/a -- graph focus link implicitly communicates connectedness; a raw number adds noise |
| 5 | Freshness signal (relative time, amber for stale) | **Accept** | `docs/L2-info-architecture` -- Context line specification |
| 6 | Section-level prev/next | **Defer** | n/a -- sound in principle but poor value/complexity ratio today |
| 7 | Section depth color indicators | **Reject** | n/a -- duplicates TOC, violates L1-styles neutral border rule |
| 8 | Reading progress by section | **Reject** | n/a -- header progress bar is sufficient; per-section tracking adds too much state |
| 9 | Word count per section | **Reject** | n/a -- page-level read time is the right granularity |
| 10 | Section-level edit dates | **Reject** | n/a -- fragile to implement, unsustainable authoring burden |
| 11 | Section maturity gradient | **Reject** | n/a -- weakest section determines perceived quality; split instead |
