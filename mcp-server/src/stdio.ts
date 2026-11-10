// Local stdio entry for the same MCP server, for clients and registries that
// run servers as a local process (for example Glama's checks). It reuses
// buildServer() unchanged; the Cloudflare Worker entry (index.ts) is not touched.
// Run: npm run stdio

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildServer } from "./server.js";

await buildServer().connect(new StdioServerTransport());
