# Shell Drop agent skills

Run your AI coding agents on a Mac or Linux machine and check on them from your iPhone or iPad.

This repo holds the agent skill and the remote MCP server behind [Shell Drop](https://shelldrop.sh), a free iOS SSH client for AI agent operators. Give the skill to the agent on the machine you want to reach (Claude Code, Codex, Cursor, Hermes or any agent that reads skills) and it sets the machine up for you: SSH on, tmux sessions that survive a dropped connection, Tailscale so the phone can reach it from anywhere, and the exact details to type into the app.

## Install the skill

```bash
npx skills add shelldrop-sh/agent-skills
```

Then ask your agent something like "set up this Mac so I can run Claude Code from my iPhone".

## What the skill does

`skills/shelldrop-remote-setup/SKILL.md` walks the agent through, in order:

1. Finding out what the machine is (macOS or Linux, user, what is installed).
2. Turning on SSH (Remote Login on macOS, OpenSSH on Linux).
3. Installing tmux and adding phone-friendly settings: session names as tab titles, touch scrolling, clipboard to the phone, long scrollback.
4. One tmux session per agent, with an optional one-key session menu on SSH login.
5. Tailscale, so the phone reaches the machine on any network with no ports opened.
6. Keeping an always-on machine awake.
7. Adding the phone's SSH public key.
8. Verifying, then handing over host, port, username and auth.

It asks before anything that needs administrator rights, backs up config files before editing, appends instead of overwriting, and never touches private keys.

## The MCP server

A read-only remote MCP server at `https://mcp.shelldrop.sh/mcp` (Streamable HTTP, no sign-in, no key). Source in [`mcp-server/`](mcp-server/), a stateless Cloudflare Worker.

| Tool | What it returns |
|---|---|
| `setup_guide(os)` | The setup steps for `macos` or `linux` |
| `tmux_howto(task)` | Exact tmux commands for attach, detach, list, kill, scrollback, mouse, copy, rename and more |
| `generate_tmux_conf(options)` | A phone-friendly `~/.tmux.conf` snippet |
| `troubleshoot_connection(symptom)` | Fixes for timeouts, "connection refused", "can't find session" and copy not reaching the phone |

Every tool returns static text and is annotated read-only. The server stores nothing, keeps no sessions and does not log what you send it.

Add it to any MCP client as a Streamable HTTP server:

```json
{ "mcpServers": { "shelldrop": { "type": "streamable-http", "url": "https://mcp.shelldrop.sh/mcp" } } }
```

## Hermes Agent

This repo is also a portable Agent Plugins v1 package (`plugin.json`, `mcp.json`, `skills/`) for [Hermes Agent](https://github.com/NousResearch/hermes-agent):

```bash
hermes plugins install shelldrop   # once listed in the Hermes plugin catalog
hermes plugins enable shelldrop    # portable packages install disabled
```

The skill loads as `shelldrop:shelldrop-remote-setup` and the tools arrive as `mcp__shelldrop__setup_guide` and so on.

### Disclosure

- **Network calls:** only to `https://mcp.shelldrop.sh/mcp`, and only when the agent calls one of its tools. The server receives the tool arguments (an OS name, a short task or symptom phrase, tmux.conf options) and nothing else. It returns static text.
- **No telemetry, no storage:** the server keeps no sessions, writes nothing and does not log tool inputs.
- **No credentials:** nothing is stored or sent. No key, no sign-in.
- **The skill runs shell commands on your machine** through your agent, with your agent's own approval rules: checking what is installed, editing `~/.tmux.conf`, `~/.zshrc` (optional, asked first) and `~/.ssh/authorized_keys`, and, after asking, `sudo` commands to turn on SSH, install tmux or Tailscale and stop the machine sleeping. It installs Tailscale on Linux with Tailscale's official `curl | sh` installer, after asking.
- The package marks the server `untrusted`, so Hermes would ask before any tool that is not annotated read-only. All four are read-only.

## Links

- Shell Drop: https://shelldrop.sh
- App Store (free): https://apps.apple.com/app/id6760954570
- Tmux cheat sheet for phones: https://shelldrop.sh/tmux-cheat-sheet/
- SSH keys on iPhone: https://shelldrop.sh/ssh-keys-on-iphone/

## License

MIT, see [LICENSE](LICENSE).
