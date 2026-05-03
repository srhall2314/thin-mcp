#!/usr/bin/env node
/**
 * Reference implementation of the Thin MCP Principle.
 *
 * Two tools — list_user_tools and fetch_user_tool — that return the
 * spec-required shape. Hardcoded sample data; no database, no auth,
 * no users. The point is to show the wire format.
 *
 * See ../SPEC.md for the contract this server satisfies.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// ---- Sample registry --------------------------------------------------------
// Each entry is one tool the user has registered. In a real implementation
// these come from your data store. Here they are hardcoded for clarity.

type AuthBlock =
  | { type: 'bearer' | 'basic'; source: 'env'; key_name: string }
  | { type: 'bearer' | 'basic'; source: '1password' | 'doppler' | 'infisical' | 'aws' | 'custom'; vault_path: string }
  | { type: 'oauth' }
  | { type: 'none' };

type Entry = {
  // List-level fields (returned by list_user_tools).
  id: string;
  slug: string;
  summary: string;
  auth_type: 'bearer' | 'basic' | 'oauth' | 'none';
  // Detail-level fields (returned by fetch_user_tool).
  source_url: string | null;
  source_type: 'openapi' | 'mcp' | 'webmcp' | 'capability_md' | 'inline';
  spec: string;
  docs_url: string | null;
  auth_block: AuthBlock;
  user_context: string | null;
};

const TOOLS: Entry[] = [
  {
    id: 'a1b2c3',
    slug: 'stripe',
    summary: 'Stripe payments API',
    auth_type: 'bearer',
    source_url: 'https://api.stripe.com/openapi.yaml',
    source_type: 'openapi',
    spec: 'openapi: 3.0.0\ninfo:\n  title: Stripe API\n  version: 2024-01-01\n…',
    docs_url: 'https://docs.stripe.com/api',
    auth_block: { type: 'bearer', source: 'env', key_name: 'STRIPE_API_KEY' },
    user_context: 'Production. Real transactions only.',
  },
  {
    id: 'c3d4e5',
    slug: 'notion',
    summary: 'Notion workspace API',
    auth_type: 'bearer',
    source_url: 'https://developers.notion.com/openapi.json',
    source_type: 'openapi',
    spec: 'openapi: 3.0.0\ninfo:\n  title: Notion API\n…',
    docs_url: 'https://developers.notion.com/reference/intro',
    auth_block: { type: 'bearer', source: '1password', vault_path: 'op://Personal/Notion/credential' },
    user_context: null,
  },
];

// ---- Server -----------------------------------------------------------------

const server = new McpServer({ name: 'thin-mcp-reference', version: '0.1.0' });

// list_user_tools — the menu.
server.tool(
  'list_user_tools',
  'List the registered tools available to the agent.',
  { query: z.string().optional() },
  async ({ query }) => {
    const q = query?.toLowerCase();
    const tools = TOOLS
      .filter((t) => !q || t.slug.includes(q) || t.summary.toLowerCase().includes(q))
      .map(({ id, slug, summary, auth_type }) => ({ id, slug, summary, auth_type }));
    return { content: [{ type: 'text', text: JSON.stringify({ tools }, null, 2) }] };
  },
);

// fetch_user_tool — the detail. Returns the six spec-required fields.
server.tool(
  'fetch_user_tool',
  'Fetch the full spec, auth pointer, and use context for one tool.',
  { id: z.string() },
  async ({ id }) => {
    const t = TOOLS.find((x) => x.id === id);
    if (!t) throw new Error(`No tool with id ${id}`);
    const detail = {
      source_url: t.source_url,
      source_type: t.source_type,
      spec: t.spec,
      docs_url: t.docs_url,
      auth_block: t.auth_block,
      user_context: t.user_context,
    };
    return { content: [{ type: 'text', text: JSON.stringify(detail, null, 2) }] };
  },
);

// ---- Boot -------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
