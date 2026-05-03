# Thin MCP — Spec v0.1

A Thin MCP server is an MCP server that returns three things for every tool it exposes: a pointer to the tool's documentation, a pointer to the credential, and use context. After delivering these, the server steps out of the request path. The agent makes the real HTTP call.

This document defines the wire-level shape.

---

## Required tools

A Thin MCP server **MUST** expose at least these two tools over the standard MCP transport.

### `list_user_tools`

The directory. Names, summaries, IDs.

**Input:** none.

**Output:** an array of tool entries, each with at minimum:

```json
{
  "id": "string",
  "slug": "string",
  "summary": "string",
  "auth_type": "bearer | basic | oauth | none"
}
```

`id` is the handle the agent passes to `fetch_user_tool`. Implementations MAY add fields (display name, verified flag, last-used timestamp) but MUST NOT remove the four above.

### `fetch_user_tool`

The detail. Returns the three required affordances for one tool.

**Input:**

```json
{ "id": "string" }
```

The id returned by `list_user_tools`.

**Output:**

```json
{
  "source_url":   "string | null",
  "source_type":  "openapi | mcp | webmcp | capability_md | inline",
  "spec":         "string",
  "docs_url":     "string | null",
  "auth_block":   { ... },
  "user_context": "string | null"
}
```

The fields below are the contract. `source_url` + `source_type` + `spec` together form the **API documentation** affordance; `auth_block` is the **auth shape**; `user_context` is the **use context**. `docs_url` is recommended-but-optional.

---

## The three required affordances

### 1. API documentation — `source_url` + `source_type` + `spec` (and optional `docs_url`)

What's possible at the endpoint. Returned across three required fields:

- **`source_url`** *(string | null)* — pointer to the canonical spec document (OpenAPI, GraphQL SDL, `llms.txt`, or a markdown capability doc). Preferred — the agent can re-fetch to see the live shape. May be `null` for purely inline tools.
- **`source_type`** *(enum)* — what kind of spec it is: `"openapi" | "mcp" | "webmcp" | "capability_md" | "inline"`. Tells the agent how to read the content.
- **`spec`** *(string)* — the spec content itself, cached at registration time. Always present; for tools with a live `source_url`, the agent SHOULD prefer re-fetching the URL but MAY fall back to the cached `spec`.

And one optional addition:

- **`docs_url`** *(string | null, optional but recommended)* — the human-facing documentation landing page (e.g. `https://docs.stripe.com/api`), distinct from `source_url` which points at the machine-readable spec. Agents SHOULD use this to find examples, error catalogs, and rate-limit notes that aren't in the formal spec.

If the upstream API ships a new endpoint, a Thin MCP server doesn't need to be updated — the agent re-fetches `source_url` and reads the new doc.

### 2. `auth_block` — auth shape (a pointer, never a credential)

A discriminated union. The server tells the agent **where the credential lives**, never the credential itself.

```typescript
type AuthBlock =
  | {
      type: "bearer" | "basic";
      source: "env" | "1password" | "doppler" | "infisical" | "aws" | "custom";
      key_name?: string;       // for source: "env"
      vault_path?: string;     // for vault sources
    }
  | { type: "oauth" }
  | { type: "none" };
```

Resolution happens in the **agent's runtime**, not the server's. This is the load-bearing security claim of Thin MCP: a compromised Thin MCP server cannot leak credentials it never held.

Implementations MAY add new `source` values for credential systems not listed; agents SHOULD treat unknown sources as opaque and surface a resolution error rather than fabricate.

### 3. `user_context` — when to reach for this tool

A free-text string, written by the user who registered the tool, that tells the agent when to use this entry vs. another. Examples:

- `"Production. Real transactions only."`
- `"Test mode. Safe for experiments. Never use for real customer data."`
- `"Internal staging Postgres. Read-only credential."`

May be `null` if the user provided none, but the field MUST be present in the response. This is the field that turns a list of capabilities into a decision and is the most commonly omitted in Fat MCP implementations.

---

## Worked example

A user has registered their production Stripe account in a Thin MCP server. An agent asks the server what's available, picks Stripe, and makes a charge.

```
# 1. discover what's registered
agent → server: list_user_tools()
  ← [
      { id: "a1b2…", slug: "stripe", summary: "Payments API", auth_type: "bearer" },
      { id: "c3d4…", slug: "notion", summary: "Workspace docs",   auth_type: "bearer" }
    ]

# 2. fetch the spec + where the key lives + use context
agent → server: fetch_user_tool("a1b2…")
  ← {
      source_url:   "https://api.stripe.com/openapi.yaml",
      source_type:  "openapi",
      spec:         "openapi: 3.0.0\n…",
      docs_url:     "https://docs.stripe.com/api",
      auth_block: {
        type:     "bearer",
        source:   "env",
        key_name: "STRIPE_API_KEY"
      },
      user_context: "Production. Real transactions only."
    }

# 3. agent resolves the key from its own runtime, hits the API
agent → stripe:
  curl https://api.stripe.com/v1/charges \
       -H "Authorization: Bearer $STRIPE_API_KEY"
  ← { id: "ch_3M…", amount: 2000, status: "succeeded" }
```

The Thin MCP server appears in steps 1 and 2 only. It is never in the request path of the actual API call. It never sees the key.

---

## Auth resolution — critical, but out of scope

The whole principle pivots on this: a Thin MCP server returns a **pointer** to where the credential lives, never the credential itself. The agent reads that pointer and resolves it in its own runtime — from an env var, a 1Password vault, a Doppler config, AWS Secrets Manager, or a system the spec doesn't yet name.

That resolution step is **load-bearing**. Without it, every Thin MCP server is a list of unusable pointers. Done badly, it leaks secrets across agents, projects, or processes that shouldn't see them.

It is also **deliberately out of scope for this spec**. Resolution is an agent-side concern, varies sharply per credential system, and depends on the runtime an agent happens to live in (a Node process, a Python notebook, a Claude Desktop session, a CI job). One spec can't responsibly cover all those shapes — and trying would pull Thin MCP back toward mediation, which is exactly what it's meant to avoid.

What the ecosystem needs, and this repo doesn't yet provide, are **reference resolvers** per source: small, focused, runtime-specific helpers that take an `auth_block` and return a credential. One per source — env, 1Password CLI, Doppler API, AWS Secrets Manager, Infisical, and so on. Production implementations like [Joshua](https://usejoshua.com) ship their own; the open question is whether a shared library is useful enough to standardize.

**This is the most valuable thing someone reading this spec could contribute.** If you're building one, open an issue — we want to link it.

## Out of scope (deliberately)

In addition to credential resolution (above), these also belong to the agent, not the server:

- **Request execution.** The agent talks to the API directly. No proxy, no middleware.
- **Response transformation.** The agent reads the raw API response.
- **Retry, rate-limit, error handling.** Whatever the agent already does for any HTTP call.

A server that performs any of these is, by definition, no longer thin.

---

## Compliance

A server is **Thin MCP compliant** if:

1. It exposes `list_user_tools` and `fetch_user_tool` with the shapes above.
2. `fetch_user_tool` returns all three required affordances for every tool:
   - API documentation (`source_url` + `source_type` + `spec`)
   - `auth_block`
   - `user_context`
3. The server does not hold or transmit credentials. `auth_block` is always a pointer.
4. The server does not proxy the underlying API call.

`docs_url` is recommended but optional — a server is still compliant without it.

That's it.

---

## Reference implementation

[Joshua](https://usejoshua.com) implements this spec. Source: [github.com/srhall2314/joshua-mcp-game](https://github.com/srhall2314/joshua-mcp-game). The `fetch_user_tool` response in `lib/mcp-core.ts` is the canonical shape this spec describes.

---

## Status

v0.1 — Draft. Field names and the union of `auth_block.source` values may change before v1.0. Once v1.0 ships, breaking changes will be versioned (Thin MCP v2, etc.).
