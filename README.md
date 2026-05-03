# Thin MCP

MCP servers have real value. But in many cases that value is **discovery — not mediation**.

---

## The API is the primitive

Every tool call eventually becomes an API call. That's the primitive. That's where the work happens — at the endpoint, between the caller and the service, over HTTP, against a spec.

Everything else is a wrapper.

**Fat MCP** wraps the API in a server that sits in the middle of every call. **CLI** wraps system access in a shell interface. Both add layers. Both add opinions. Neither changes what the primitive is.

**Thin MCP** is built on a different premise: if the API is the primitive, the job of everything else is to get the agent to the API — then get out of the way.

Discovery, not mediation.

---

## What an agent actually needs

Strip away the scaffolding and an AI agent needs exactly three things to use a remote tool effectively.

### 1. API documentation

What's possible. Without it the agent is guessing at parameter names, response shapes, error handling. Best provided as a description plus a link to the OpenAPI spec, GraphQL SDL, or `llms.txt`. A link, not a snapshot — so the agent always has the most current shape.

### 2. Auth shape

How to show up. Not just that a credential exists, but where it lives, how it's passed, and what scope it carries. An agent that knows an API exists but can't authenticate is stuck. The shape can vary — an env var, a 1Password reference, Doppler, HashiCorp Vault, AWS Secrets Manager, a homegrown system. **The MCP server never holds the credential. It holds the pointer.**

### 3. Use context

When to reach for this tool over another. The most underappreciated of the three. An agent with fifty tools and no use context will pick the wrong one or punt the decision back to the user — which defeats the point. Use context is the judgment layer. It turns a list of capabilities into a decision.

Together, these three are everything. Not scaffolding around the API — the minimum viable understanding an agent needs to act independently.

See [SPEC.md](./SPEC.md) for the wire-level shape these three things take.

---

## Cross-agent, cross-project

A thin MCP directory is stateless and portable. Any agent, any project, any interface discovers the same tools the same way. The directory travels. The integrations don't get rebuilt every time the context changes.

It works anywhere MCP works — in agents, in pipelines, in chat. The same directory, the same tool definitions, available to a developer building an autonomous workflow and to a founder asking Claude a question on a Sunday afternoon.

One MCP connection for many different API services. Ideally a user can deliver many different APIs customized to the user or group for discovery. This is implementation dependent.

---

## Why not CLI?

CLI is a legitimate tool. Thin-MCP just solves a different problem.

A CLI is environment-bound. It lives on a machine, in a session, tied to a user's local context. Giving an agent CLI access is giving it unstructured capability — it can reach for anything, with no contract about what things are for, no scoped auth, no portable context. CLI doesn't travel — it doesn't work across projects, across agents, or in a chat window.

CLI is also already a wrapper. It wraps system calls the same way Fat MCP wraps APIs. The question was never whether to wrap. It was which wrapper actually serves the use case.

---

## Reference implementation

There are two:

**[`reference/server.ts`](./reference/server.ts)** — a minimal MCP server in this repo, ~80 lines of TypeScript with hardcoded sample data. No database, no auth, no users — just the wire format. Clone and run it to see exactly what a spec-compliant response looks like.

**[Joshua](https://usejoshua.com)** — a production implementation. Same two tools, real users, real registrations, real auth pointers across env vars / 1Password / Doppler / vaults. The agent makes the real HTTP request directly; Joshua never sees the credential and is never in the request path.

If you're building something else against this principle, the [SPEC](./SPEC.md) is the contract.

---

## The open problem

A Thin MCP server hands the agent a pointer to a credential. **The agent has to resolve that pointer.** That step — reading from env, calling 1Password CLI, hitting Doppler or AWS Secrets Manager, handling OAuth — is critical to the principle working in practice and is deliberately not in the spec. It's an agent-side, runtime-specific concern, and one shared library can't responsibly cover it for every environment.

The most useful thing someone reading this could contribute is a **reference resolver** for one of those sources. Open an issue if you're building one — we want to link it.

---

## Status

Draft. Comments and PRs welcome — particularly from anyone implementing or considering this shape.  
