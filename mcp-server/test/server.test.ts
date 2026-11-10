import { describe, expect, it } from "vitest";
import worker from "../src/index.js";
import {
  generateTmuxConf,
  setupGuide,
  tmuxHowto,
  troubleshootConnection,
} from "../src/content.js";

const ENDPOINT = "https://mcp.shelldrop.sh/mcp";
const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  "Mcp-Protocol-Version": "2025-06-18",
};

async function rpc(method: string, params: unknown = {}, id: number | null = 1) {
  const body = id === null ? { jsonrpc: "2.0", method, params } : { jsonrpc: "2.0", id, method, params };
  const res = await worker.fetch(new Request(ENDPOINT, { method: "POST", headers: HEADERS, body: JSON.stringify(body) }));
  const raw = await res.text();
  return { status: res.status, headers: res.headers, json: raw ? JSON.parse(raw) : null };
}

async function call(name: string, args: Record<string, unknown>) {
  const r = await rpc("tools/call", { name, arguments: args });
  expect(r.status).toBe(200);
  return r.json.result as { content: { type: string; text: string }[]; isError?: boolean };
}

const NO_DASHES = /[\u2014\u2013]|--(?!-)(?= )/;

describe("content", () => {
  it("setup guide differs per OS and covers every step", () => {
    const mac = setupGuide("macos");
    const linux = setupGuide("linux");
    expect(mac).toContain("systemsetup -setremotelogin on");
    expect(mac).toContain("brew install tmux");
    expect(linux).toContain("systemctl enable --now ssh");
    expect(linux).toContain("apt install tmux");
    for (const g of [mac, linux]) {
      expect(g).toContain("## 8. Verify");
      expect(g).toContain("set -g set-clipboard on");
      expect(g).not.toContain("apps.apple.com"); // no promotional footer
    }
  });

  it.each([
    ["attach to my session", "tmux attach -t work"],
    ["how do I detach", "Ctrl-b, let go, then d"],
    ["list sessions", "tmux ls"],
    ["kill a session", "tmux kill-session -t work"],
    ["scroll up through history", "Ctrl-b ["],
    ["mouse", "set -g mouse on"],
    ["copy text to my phone", "set -g set-clipboard on"],
    ["rename session", "tmux rename-session"],
  ])("tmux_howto %s", (task, expected) => {
    expect(tmuxHowto(task)).toContain(expected);
  });

  it("tmux_howto falls back with the topic list", () => {
    expect(tmuxHowto("make me a sandwich")).toContain("Topics covered:");
  });

  it("generate_tmux_conf defaults and options", () => {
    const d = generateTmuxConf();
    expect(d).toContain("set -g mouse on");
    expect(d).toContain("set-titles-string '#S'");
    expect(d).toContain("history-limit 50000");
    expect(d).not.toContain("prefix C-a");
    const c = generateTmuxConf({ mouse: false, prefix: "C-a", history_limit: 5 });
    expect(c).not.toContain("mouse on");
    expect(c).toContain("set -g prefix C-a");
    expect(c).toContain("history-limit 2000");
  });

  it.each([
    ["connection timed out", "Tailscale"],
    ["Connection refused", "Remote Login"],
    ["can't find session work", "tmux ls"],
    ["copy not working", "set-clipboard on"],
  ])("troubleshoot %s", (symptom, expected) => {
    expect(troubleshootConnection(symptom)).toContain(expected);
  });

  it("no em or en dashes in any answer", () => {
    const all = [
      setupGuide("macos"),
      setupGuide("linux"),
      generateTmuxConf(),
      ...["attach", "detach", "list", "kill", "scroll", "mouse", "copy", "rename", "zzz"].map(tmuxHowto),
      ...["timeout", "refused", "can't find session", "copy", "zzz"].map(troubleshootConnection),
    ].join("\n");
    expect(all).not.toMatch(NO_DASHES);
  });
});

describe("worker over Streamable HTTP", () => {
  it("initialize", async () => {
    const r = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "0" },
    });
    expect(r.status).toBe(200);
    expect(r.json.result.serverInfo.name).toBe("shelldrop");
    expect(r.json.result.capabilities.tools).toBeDefined();
    expect(r.headers.get("mcp-session-id")).toBeNull(); // stateless
  });

  it("notifications/initialized is accepted", async () => {
    const r = await rpc("notifications/initialized", {}, null);
    expect(r.status).toBe(202);
  });

  it("tools/list returns four read-only tools", async () => {
    const r = await rpc("tools/list");
    const tools = r.json.result.tools as { name: string; annotations: { readOnlyHint: boolean } }[];
    expect(tools.map((t) => t.name).sort()).toEqual(
      ["generate_tmux_conf", "setup_guide", "tmux_howto", "troubleshoot_connection"],
    );
    for (const t of tools) expect(t.annotations.readOnlyHint).toBe(true);
  });

  it("tools/call each tool", async () => {
    expect((await call("setup_guide", { os: "linux" })).content[0].text).toContain("openssh-server");
    expect((await call("tmux_howto", { task: "detach" })).content[0].text).toContain("tmux detach");
    expect((await call("generate_tmux_conf", { prefix: "C-a" })).content[0].text).toContain("set -g prefix C-a");
    expect((await call("troubleshoot_connection", { symptom: "refused" })).content[0].text).toContain("Remote Login");
  });

  it("bad arguments come back as a tool error", async () => {
    const r = await call("setup_guide", { os: "windows" });
    expect(r.isError).toBe(true);
  });

  it("GET /mcp is refused in stateless mode", async () => {
    const res = await worker.fetch(new Request(ENDPOINT, { method: "GET", headers: { Accept: "text/event-stream" } }));
    expect(res.status).toBe(405);
  });

  it("root describes the endpoint, unknown paths 404", async () => {
    const root = await worker.fetch(new Request("https://mcp.shelldrop.sh/"));
    expect(await root.text()).toContain("/mcp");
    expect(root.status).toBe(302);
    expect(root.headers.get("Location")).toBe("https://shelldrop.sh/mcp/");
    const nope = await worker.fetch(new Request("https://mcp.shelldrop.sh/nope"));
    expect(nope.status).toBe(404);
  });
});
