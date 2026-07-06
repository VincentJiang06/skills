[REWRITE]
## Abstract

Multi-head self-attention lets a model weight input elements by their relevance to one another, and it now sits at the core of most neural architectures. Its empirical value is settled; what specialization the heads actually develop, and how they interact, is not. This paper analyzes attention patterns across model depth to ask how individual heads contribute to aggregating context. The pattern we find is consistent enough to state plainly: heads sort into functionally distinct groups by depth. Lower layers attend mostly to local and positional structure; higher layers carry the more abstract semantic relationships. That division matters for three things at once — interpretability, architectural design, and deciding which heads a large model can afford to drop.

## Introduction

Transformers replaced the recurrent sequence model because self-attention removed its central bottleneck. Each element can attend directly to every other element, so long-range dependencies are captured in parallel rather than step by step. This content-based routing is what underpins their results from machine translation through question answering.

What those results do not explain is the computation behind them. Transformers demonstrably learn rich, transferable representations, yet the internal steps that produce them are still largely a black box. Interpretability work has chipped at this — reading attention weights, probing intermediate representations, tracing the circuits behind specific behaviors — but it has not yet settled on a single account of how heads specialize, how they coordinate, and how their behavior shifts across layers and training regimes.

We approach that gap empirically, through three questions. Do heads hold consistent functional roles across different inputs? How does the division of labor among them change with depth? And how much of attention is redundant — can heads be pruned without meaningful loss? The first two questions are about understanding the model; the third turns that understanding to practical use, toward systems that are both more interpretable and cheaper to run. Section 2 reviews related work, Section 3 the methodology, and Section 4 the results and discussion.
