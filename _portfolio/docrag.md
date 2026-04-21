---
title: "DocRAG"
excerpt: "Generate code from live documentation using Retrieval-Augmented Generation (RAG), with a CLI, a REST API, and a thin-client / fat-server install split."
date: 2025-01-01
github: https://github.com/abhishuoza/docRAG
header:
  teaser: /assets/images/portfolio/docrag-teaser.png
classes: wide
---

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/asciinema-player@3.10.0/dist/bundle/asciinema-player.css">
<style>
.layout--single .page__inner-wrap { max-width: 1100px; }

.docrag-cast-wrap {
  margin: 1.2rem 0 2rem;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #d8dee7;
  background: #0b0d12;
}
.docrag-cast-wrap .asciinema-player {
  font-size: 14px;
}
.docrag-cast-caption {
  font-size: 0.82rem;
  color: #6b7280;
  margin-top: -1.4rem;
  margin-bottom: 2rem;
  text-align: center;
}
</style>

DocRAG is a small tool that generates code grounded in live, up-to-date documentation instead of whatever the model happened to see during training. Point it at any docs URL, and it scrapes, chunks, embeds, retrieves the relevant sections, and feeds them to the LLM of your choice as context.

<div class="docrag-cast-wrap">
  <div id="docrag-cast"></div>
</div>
<div class="docrag-cast-caption">~1 minute. Press play, or space to pause.</div>

<script src="https://cdn.jsdelivr.net/npm/asciinema-player@3.10.0/dist/bundle/asciinema-player.min.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", function () {
    AsciinemaPlayer.create(
      "/assets/casts/docrag-demo.cast",
      document.getElementById("docrag-cast"),
      {
        idleTimeLimit: 2,
        poster: "npt:0:02",
        fit: "width",
        theme: "asciinema",
      }
    );
  });
</script>


The short demo above walks through the three-line happy path: inspect the CLI, check what's indexed, and generate CIFAR-10 DataLoader code grounded in the PyTorch tutorial. The generated snippet uses the tutorial's exact normalization constants and class tuple, which the model would not have nailed from general training alone.

Stack: Python, Typer, FastAPI, LangChain, ChromaDB, sentence-transformers. LLM backend is pluggable (OpenAI, Anthropic, or local HuggingFace models).

## About this project

The rise of sophisticated coding agents are leading to the major AI companies pushing towards longer and longer autonomy in systems, and admittedly it is the direction with the highest ROI. However I do think that in vigorously pursuing this direction, we are missing out on building tools that are smart, yet deterministic and reliable, which can be built upon. The open source community has a great opportunity to capitalize on this.

DocRAG is an instance of pursuing this direction. Rather than centering it around the model intelligence, I've approached centerering it around updated documentation. 

DocRAG works both as a CLI tool and a REST API powered by FastAPI, so you can use it from the terminal or integrate it into other tools. The packaging follows a thin-client / fat-server model: `pip install docrag` gives you a lightweight CLI (~50 MB) while heavy ML dependencies remain optional. If you'd rather not run the pipeline locally, the `--remote` flag lets you point the CLI at a remote DocRAG server instead. On the LLM side, DocRAG supports multiple backends including OpenAI, Anthropic, and local models such as Qwen2.5-Coder via HuggingFace Transformers. A TTL-based document cache avoids re-scraping pages you've already indexed, and built-in low-relevance warnings flag when retrieved context scores poorly so you know the output is falling back on general knowledge. For deployment, a single `docker compose up` command gets the full stack running.


<!-- Building DocRAG also allowed me to go through the process of understanding how Retrieval Augmented Generation works and to build a nice FastAPI tool using it. -->

## How it works

```
User ──> CLI (typer) ──┬──> Local RAGPipeline
                       │      Scraper (with TTL cache)
                       │      Retriever (ChromaDB + all-MiniLM-L6-v2 embeddings)
                       │      Generator (OpenAI / Anthropic / local HF)
                       │
                       └──> Remote server (httpx POST)
                              FastAPI ──> RAGPipeline (same as above)
```

Every command, whether it's `index`, `search`, or `generate`, runs the same `RAGPipeline` under the hood. The server wraps the same pipeline behind FastAPI endpoints, so the local and remote paths are literally the same code.

A few details that mattered more than I expected:

A TTL-based document cache, so you don't re-scrape the same docs each time you index. Default 24 hours, configurable via `DOCRAG_CACHE_TTL_HOURS`. The cache key is the canonicalized URL, so re-indexing is cheap.

A relevance check on retrieved chunks. ChromaDB returns a distance per chunk (lower is closer). If every retrieved chunk is above a threshold, DocRAG flags a low-relevance warning so the caller knows the model is falling back on general knowledge rather than the indexed docs. This is the difference between "generating code grounded in these docs" and "generating code that happens to include these docs." Without the warning, a RAG system silently degrades to a plain LLM call when retrieval misses.

Dependency groups, so `pip install docrag` gives you the thin CLI, `pip install docrag[server]` adds the full pipeline, and `pip install docrag[local]` extends that with torch and transformers for local models.

## Running it yourself

```bash
pip install docrag[server]
export OPENAI_API_KEY=sk-...  # or ANTHROPIC_API_KEY + DOCRAG_LLM_BACKEND=anthropic

docrag generate "parse HTML tables" \
  --url https://www.crummy.com/software/BeautifulSoup/bs4/doc/
```

That single command scrapes, chunks, embeds, indexes, retrieves, and generates. For repeat use against the same docs, split it into an `index` step (done once) and `generate` calls (done many times), so you don't re-pay the scrape and embed cost each time.

There's also a REST API (`uvicorn docrag.api:app`) and a `docker compose up` that starts the full stack.

## Musings

No matter how large context windows get, you can never fit the scale of the web, and keyword search is bound to miss important things that could be relevant for a project. I see novel embedding models in a well implemented RAG system as way to extract the best knowledge possible from the web. Atleast my intuition here is that this direction is underexplored.

## Resources

**Retrieval-Augmented Generation**

- Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., & Kiela, D. (2020). [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks](https://arxiv.org/abs/2005.11401). *NeurIPS 2020*. The original RAG paper.
- Gao, Y., Xiong, Y., Gao, X., Jia, K., Pan, J., Bi, Y., Dai, Y., Sun, J., Wang, M., & Wang, H. (2024). [Retrieval-Augmented Generation for Large Language Models: A Survey](https://arxiv.org/abs/2312.10997). *arXiv:2312.10997*. A recent survey covering naïve / advanced / modular RAG variants.

**Libraries used**

- [LangChain](https://python.langchain.com/). The glue around retrievers, document loaders, and LLM calls.
- [ChromaDB](https://www.trychroma.com/). The embedded vector store.
- [sentence-transformers](https://www.sbert.net/). `all-MiniLM-L6-v2` for dense embeddings; small, fast, good enough.
- [Typer](https://typer.tiangolo.com/) and [Rich](https://rich.readthedocs.io/). For the CLI surface shown in the demo.