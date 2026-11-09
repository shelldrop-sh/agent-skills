# shelldrop-mcp

Read-only remote MCP server for Shell Drop, intended for `https://mcp.shelldrop.sh/mcp`. A stateless Cloudflare Worker speaking Streamable HTTP: a fresh MCP server per request, JSON responses, no sessions, no storage, no auth, no logging of inputs.

```bash
npm install
npm test            # unit tests plus JSON-RPC over the Worker's fetch handler
npm run typecheck
npx wrangler dev    # local server at http://localhost:8787/mcp
```

Tools: `setup_guide`, `tmux_howto`, `generate_tmux_conf`, `troubleshoot_connection`. All answers live in `src/content.ts`, derived from `../skills/shelldrop-remote-setup/SKILL.md` and https://shelldrop.sh/tmux-cheat-sheet/.

Deploy: `npx wrangler deploy` (custom domain mcp.shelldrop.sh). GET / redirects to the docs page https://shelldrop.sh/mcp/.
