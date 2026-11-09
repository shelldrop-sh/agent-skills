// The MCP server definition: four read-only tools over static text.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  LINKS,
  generateTmuxConf,
  setupGuide,
  tmuxHowto,
  troubleshootConnection,
} from "./content.js";

export const SERVER_NAME = "shelldrop";
export const SERVER_VERSION = "0.1.0";

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });

export function buildServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION, websiteUrl: LINKS.docs },
    {
      instructions:
        "Read-only help for running AI coding agents (Claude Code, Codex, any CLI agent) on a Mac or Linux machine " +
        "and reaching them from an iPhone or iPad over SSH with tmux and Tailscale, using the Shell Drop app. " +
        "The tools return text; they never change anything on any machine.",
    },
  );

  server.registerTool(
    "setup_guide",
    {
      title: "Setup guide",
      description:
        "Step-by-step guide to set up a macOS or Linux machine so AI agents can be run and checked from an iPhone or iPad: SSH, tmux, Tailscale, keep-awake, SSH key, verify.",
      inputSchema: { os: z.enum(["macos", "linux"]).describe("The machine's operating system") },
      annotations: { title: "Setup guide", ...READ_ONLY },
    },
    async ({ os }) => text(setupGuide(os)),
  );

  server.registerTool(
    "tmux_howto",
    {
      title: "tmux how-to",
      description:
        "Exact tmux commands for common tasks from a phone: attach, detach, list, kill, scrollback, mouse, copy, rename, new session, windows and panes.",
      inputSchema: {
        task: z.string().min(1).max(200).describe('What the user wants to do, e.g. "detach without killing the agent"'),
      },
      annotations: { title: "tmux how-to", ...READ_ONLY },
    },
    async ({ task }) => text(tmuxHowto(task)),
  );

  server.registerTool(
    "generate_tmux_conf",
    {
      title: "Generate tmux.conf",
      description:
        "Return a phone-friendly ~/.tmux.conf snippet (session-name titles, mouse scrolling, OSC 52 clipboard, long history, optional Ctrl-a prefix) plus how to apply it.",
      inputSchema: {
        mouse: z.boolean().optional().describe("Mouse and touch scrolling (default true)"),
        set_titles: z.boolean().optional().describe("Publish the session name as the terminal title (default true)"),
        set_clipboard: z.boolean().optional().describe("OSC 52 clipboard to the phone (default true)"),
        history_limit: z.number().int().optional().describe("Scrollback lines per pane, clamped to 2000-1000000 (default 50000)"),
        prefix: z.enum(["C-b", "C-a"]).optional().describe("Prefix key (default stock C-b)"),
      },
      annotations: { title: "Generate tmux.conf", ...READ_ONLY },
    },
    async (opts) => text(generateTmuxConf(opts)),
  );

  server.registerTool(
    "troubleshoot_connection",
    {
      title: "Troubleshoot connection",
      description:
        "Fixes for common phone-to-machine problems: connection timeout, connection refused, tmux \"can't find session\", copy from tmux not reaching the phone.",
      inputSchema: {
        symptom: z.string().min(1).max(200).describe('What goes wrong, e.g. "connection refused" or "copy not working"'),
      },
      annotations: { title: "Troubleshoot connection", ...READ_ONLY },
    },
    async ({ symptom }) => text(troubleshootConnection(symptom)),
  );

  return server;
}
