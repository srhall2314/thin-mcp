# Contributing

This repo defines a principle ([README.md](./README.md)), a spec ([SPEC.md](./SPEC.md)), and a minimal reference implementation ([`reference/`](./reference/)).

## What's welcome

- **Issues** — clarification questions, ambiguity in the spec, missing edge cases, broken links.
- **PRs for typos, formatting, and clarity.** Light copy edits help.
- **PRs to the reference** that more clearly demonstrate the spec. Small only — resist adding features the spec doesn't require.
- **PRs proposing other-language references** (Python, Go, etc.) — open an issue first so we can discuss whether/how before code lands.

## What's not welcome yet

- **Spec extensions.** New required fields, new tools, new transports. Open an issue to discuss before opening a PR. The bar is high — the spec stays minimal on purpose.
- **Production concerns in the reference.** Auth, persistence, scaling. The reference exists to show the wire format; production concerns belong in production implementations like [Joshua](https://usejoshua.com).

## The bar

The principle is **discovery, not mediation**. If a change makes the spec or the reference fatter, it has to earn its weight. When in doubt: leave it out.

## Versioning

The spec is currently **v0.1 — Draft**. Field names and the union of `auth_block.source` values may still change. Once **v1.0** ships, breaking changes will be versioned (Thin MCP v2, etc.) rather than rolled into the existing spec.
