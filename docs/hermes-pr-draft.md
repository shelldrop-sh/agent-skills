# Hermes catalog PR draft

Target: `NousResearch/hermes-agent`, one new file `plugin-catalog/shelldrop.yaml` (copy of `docs/plugin-catalog/shelldrop.yaml` in this repo).

Before opening:

1. Push this repo to `github.com/shelldrop-sh/agent-skills` (public).
2. Deploy `mcp-server/` to `https://mcp.shelldrop.sh/mcp` and fill in the test results below.
3. Check the `sha` in the YAML is the commit you want reviewed (currently `dd4e7580a53e7bdac7ce957ec4c4f3973e6d5d2d`, the last commit before these docs). If anything under `skills/`, `plugin.json`, `mcp.json`, `README.md` or `mcp-server/` changes after that, re-pin to the new commit.
4. Re-run `hermes plugins validate --install-deps <fresh clone at that sha>`.

PR title: `feat(plugin-catalog): add shelldrop`

---

## What does this PR do?

Adds `plugin-catalog/shelldrop.yaml`, listing [Shell Drop's agent skills](https://github.com/shelldrop-sh/agent-skills) as a portable Agent Plugins v1 package (`plugin.json` + `mcp.json` + `skills/`), configuration only, no Python.

It helps a user set up a Mac or Linux machine so their AI coding agents can be run and checked from an iPhone or iPad over SSH: SSH on, tmux sessions that survive a dropped connection, Tailscale for the route in, the phone's SSH key, and the exact connection details at the end.

- **Skill:** `shelldrop:shelldrop-remote-setup`, the step-by-step setup procedure.
- **MCP server:** `shelldrop`, Streamable HTTP at `https://mcp.shelldrop.sh/mcp`, no key, no sign-in, four read-only tools: `setup_guide`, `tmux_howto`, `generate_tmux_conf`, `troubleshoot_connection`.

Submitted by the repository owner (rule 5). Shell Drop is a free iOS SSH client: https://shelldrop.sh

## Hermes surfaces used

Portable package loader only: one immediate skill from `skills/*/SKILL.md` and one Streamable HTTP MCP server from root `mcp.json`, marked `trust: untrusted` through `extensions."com.nousresearch.hermes".servers`. No hooks, middleware, tools registered in Python, env vars or config keys, so `capabilities` is empty.

## Disclosure (rule 13)

- **Network calls:** only to `https://mcp.shelldrop.sh/mcp`, only when the agent calls a Shell Drop tool. The server receives the tool arguments (an OS name, a short task or symptom phrase, tmux.conf options) and returns static text.
- **Server:** a stateless Cloudflare Worker; its full source is in the pinned repo under `mcp-server/`. No sessions, no storage, no logging of inputs, Workers observability off. Every tool is annotated `readOnlyHint: true`, and the package still marks the server untrusted.
- **Shell commands:** the skill has the agent run commands on the user's own machine, under Hermes's normal approvals. It reads system state, appends to `~/.tmux.conf`, optionally `~/.zshrc` (asked first) and `~/.ssh/authorized_keys` (only a public key the user supplies), backing files up first. After asking, it uses `sudo` to enable SSH, install tmux or Tailscale (Tailscale's official `curl -fsSL https://tailscale.com/install.sh | sh` on Linux) and stop an always-on Mac sleeping. It never reads, prints or moves private keys and never handles the user's Tailscale password.
- **Credentials:** none stored, read or sent.
- **Telemetry:** none.
- **Background processes:** none.
- The tool set is served by the remote server at runtime and is not covered by the pinned sha.

## Security scan

`hermes plugins validate` reports `caution` only, all from setup instructions in the skill and the static answer text in `mcp-server/src/content.ts`:

- `sudo_usage`: enabling Remote Login / OpenSSH, installing tmux, `pmset` keep-awake, `tailscale up`.
- `curl_pipe_shell`: Tailscale's official Linux installer, run only after the user agrees.
- `ssh_dir_access`: appending the user's own phone public key to `~/.ssh/authorized_keys`.

## How to test

```bash
hermes plugins install shelldrop --no-enable
hermes plugins enable shelldrop
hermes plugins validate --install-deps <checkout at the pinned sha>
```

Then in a chat: "Use the shelldrop remote setup skill to tell me what you would change on this machine", and call `mcp__shelldrop__tmux_howto` with `{"task": "detach"}`.

## Test results

Validate, clean clone at the pinned sha (local run, 2026-11-08, Hermes v0.23.0):

```
✓ portable manifest: plugin.json parses (Agent Plugins v1)
✓ manifest fields: name present
✓ config schema: not declared
✓ server trust: shelldrop: untrusted (Hermes asks before every write-capable tool call)
✓ security scan: caution
◆ Isolation: portable plugin (no Python): runs anywhere
Validation passed.
```

Live server, https://mcp.shelldrop.sh/mcp (2026-11-08):

| Check | Result |
|---|---|
| `initialize` returns serverInfo `shelldrop` 0.1.0, stateless (no `Mcp-Session-Id`) | Pass: serverInfo shelldrop 0.1.0, no session id header |
| `tools/list` returns the four tools, all `readOnlyHint: true` | Pass: 4 tools, 4 x readOnlyHint true |
| `setup_guide {"os":"macos"}` / `{"os":"linux"}` | Pass: both return the step list |
| `tmux_howto {"task":"detach"}` | Pass: Ctrl-b then d, `tmux detach` |
| `generate_tmux_conf {}` | Pass: phone-friendly snippet with set-titles, mouse, set-clipboard |
| `troubleshoot_connection {"symptom":"connection refused"}` | Pass: Remote Login / OpenSSH fix |
| Installed via `hermes plugins install --ref <sha>` + enable (isolated HERMES_HOME, Hermes v0.23.0) | Pass: installs and enables (install scan verdict `caution`, so a community install needs `--force` until listed); `hermes plugins doctor shelldrop` OK; `hermes mcp add` against the URL discovers all 4 tools |
| Skill appears as `shelldrop:shelldrop-remote-setup` in `skills_list` | Not verified in a live chat session (no model configured in the isolated test home) |

## Checklist

- [x] One file added: `plugin-catalog/shelldrop.yaml`
- [x] Full 40-character sha pin, `version` quoted
- [x] `hermes plugins validate --install-deps` passes at the pinned commit
- [x] Owner submission
- [x] No self-updating code, no compiled payloads, no credentials
