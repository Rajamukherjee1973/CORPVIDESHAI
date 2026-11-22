# AI agents

- All AI agents run through one LangGraph mesh (agents/mesh.server.ts) using one LangChain gateway client (agents/llm.server.ts) inside server handlers; deterministic dispatch prevents overlap and keeps keys server-side.
- Agent "training" is owner-scoped reviewer examples (few-shot recall) plus JSONL export; weights never change and ratings never cross accounts.
- Statutory graph retrieval uses the semantic retriever, local expansion retains local provenance, and malformed QA fails closed; prevents unsupported evidence from being marked verified.
