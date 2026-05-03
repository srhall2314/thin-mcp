# Thin MCP — Reference Implementation

A minimal MCP server that conforms to the [Thin MCP spec](../SPEC.md). About 80 lines of TypeScript with hardcoded sample tools (Stripe, Notion). No database, no auth, no users — the point is to show the wire format.

## Run

```sh
npm install
npm start
```

The server speaks MCP over stdio. Connect any MCP client (Claude Desktop, Cursor, your own loop) to the command `npm start` from this directory.

## Try it with the MCP Inspector

```sh
npm run inspect
```

This launches Anthropic's official inspector against the local server. From there you can:

1. Call `list_user_tools` — returns an array with `id`, `slug`, `summary`, `auth_type` for each tool.
2. Call `fetch_user_tool` with one of the ids — returns the six spec-required detail fields.

## What this demonstrates

Every field returned matches a section in [../SPEC.md](../SPEC.md):

| SPEC field     | Where it comes from in this reference                                           |
| -------------- | ------------------------------------------------------------------------------- |
| `source_url`   | Hardcoded URL to the API's machine-readable spec.                               |
| `source_type`  | `"openapi"` for both sample tools.                                              |
| `spec`         | Inline string. In a production server this is fetched/cached from `source_url`. |
| `docs_url`     | Hardcoded URL to the human-facing docs page.                                    |
| `auth_block`   | Pointer object (env var name or vault path). **Never the credential itself.**   |
| `user_context` | Free-text note about how this entry should be used (or `null`).                 |

## What this does NOT include

- **A database.** The spec doesn't require one — sample data is in-memory.
- **User accounts or per-user scoping.** A Thin MCP server may scope tools per user, but the spec is silent on how.
- **Credential resolution.** The spec is explicit: the agent resolves the pointer in its own runtime. This server returns pointers and stops.
- **HTTP/SSE transport.** Stdio is simpler for local; the wire shape is identical regardless of transport.

If you want a production implementation that adds those things on top of the spec, see [Joshua](https://usejoshua.com).

## License

MIT — see [LICENSE](./LICENSE). The repo's prose (README.md, SPEC.md, etc.) is CC BY 4.0; this code is MIT so you can copy it freely.
