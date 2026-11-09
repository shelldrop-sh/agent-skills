// Shell Drop remote MCP server (Cloudflare Worker).
// Streamable HTTP, stateless: a fresh server per request, no sessions, no storage,
// no auth, no user data. Inputs are never logged.
// Only the default export lives here: Workers reject other named exports from the entry module.

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { LINKS } from "./content.js";
import { buildServer } from "./server.js";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, Mcp-Protocol-Version",
};

function withCors(res: Response): Response {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  return out;
}

async function handleMcp(request: Request): Promise<Response> {
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
    maxRequestBodySize: 64 * 1024,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    // JSON responses are fully built before handleRequest resolves.
    void server.close();
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/mcp") {
      // Stateless: no server-initiated stream (GET) and no session to end (DELETE).
      if (request.method !== "POST") {
        return new Response("Method not allowed\n", { status: 405, headers: { Allow: "POST", ...CORS } });
      }
      return withCors(await handleMcp(request));
    }

    if (url.pathname === "/" && request.method === "GET") {
      // Browsers land on the connector page; the body still names the endpoint for anything that reads it.
      return new Response(
        `Shell Drop MCP server. Streamable HTTP endpoint: ${url.origin}/mcp\n` +
          "Read-only. Tools: setup_guide, tmux_howto, generate_tmux_conf, troubleshoot_connection.\n" +
          `Docs: ${LINKS.docs}\n`,
        { status: 302, headers: { Location: LINKS.docs, "Content-Type": "text/plain; charset=utf-8", ...CORS } },
      );
    }
    return new Response("Not found\n", { status: 404, headers: CORS });
  },
};
