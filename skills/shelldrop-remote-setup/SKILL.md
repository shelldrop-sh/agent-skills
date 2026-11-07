---
name: shelldrop-remote-setup
description: Set up a Mac or Linux machine so you can run and check on AI coding agents (Claude Code, Codex, any CLI agent) from an iPhone or iPad over SSH, using tmux to keep sessions alive and Tailscale to reach the machine from anywhere. Use when the user asks to "set up my Mac for my phone", "run Claude Code from my iPhone", "reach this machine over SSH from my phone", "keep my agents running when I disconnect", or to connect the Shell Drop app to this machine.
---

# Set up this machine for phone access

Goal: the user can open an SSH app on their iPhone or iPad (this skill is written for
[Shell Drop](https://shelldrop.sh), a free iOS SSH client for AI agent operators), connect to this
machine from anywhere, and land in their running agent sessions, which survive disconnects.

Work through the steps in order. Check what is already set up before changing anything.

## Ground rules

- **Ask before every change that needs administrator rights** (`sudo`, System Settings, installing
  software). Say what the command does in one line and wait for a yes.
- **Back up any config file before editing it** (`cp ~/.zshrc ~/.zshrc.bak-$(date +%Y%m%d)`).
- **Append to config files, never overwrite them.** Skip any line that is already present.
- **Never print, copy or move private keys.** Only public keys (`.pub`) are ever shown.
- Do not open ports on the router or expose SSH to the public internet. Tailscale is the route in.
- If a step fails, stop and tell the user what failed and what they can do, in plain words.

## 1. Find out what we are on

```bash
uname -s                      # Darwin = macOS, Linux = Linux
whoami; hostname
command -v tmux tailscale brew
```

Report back: the OS, the username, and which of tmux and Tailscale are already installed.

## 2. Turn on SSH (Remote Login)

**macOS:** check with `sudo systemsetup -getremotelogin`. If it is off, ask, then either
`sudo systemsetup -setremotelogin on`, or have the user turn on
**System Settings > General > Sharing > Remote Login** (on recent macOS the command may need
Full Disk Access for the terminal; the Settings toggle always works).

**Linux:** `systemctl is-active ssh || systemctl is-active sshd`. If neither is active, ask, then
install and enable OpenSSH (`sudo apt install openssh-server && sudo systemctl enable --now ssh`
on Debian and Ubuntu).

## 3. Install tmux and make it phone-friendly

tmux keeps each agent running in its own session after the phone disconnects, so a dropped
connection on a train or a locked screen never stops the agent.

- Install if missing: `brew install tmux` (macOS, Homebrew) or `sudo apt install tmux` (Linux).
- Append these lines to `~/.tmux.conf` (only the ones not already there):

```
# Name the terminal tab after the tmux session (phone apps use it to label tabs and reattach)
set -g set-titles on
set -g set-titles-string '#S'
# Touch and trackpad scrolling through history
set -g mouse on
# Let copy in tmux reach the phone's clipboard (OSC 52)
set -g set-clipboard on
# More scrollback for long agent output
set -g history-limit 50000
```

- If a tmux server is running, reload: `tmux source-file ~/.tmux.conf`.

## 4. One session per agent

Each agent gets its own named session, one project each:

```bash
tmux new -s my-project        # start a session, then run the agent inside it
# detach with Ctrl-b then d; the agent keeps working
tmux ls                       # list sessions
tmux attach -t my-project     # come back to it, from any device
```

Optional, ask first: a one-key login menu so every SSH login lists the running sessions and attaches
with a single keypress. Append this to `~/.zshrc` (zsh, the macOS default):

```zsh
# One-key tmux session menu on SSH login (skips when already inside tmux)
_session_picker() {
  command -v tmux >/dev/null && tmux ls >/dev/null 2>&1 || { echo "no tmux sessions"; return; }
  echo; echo "Welcome operator."; echo
  local _keys=(q w e r t y u i o p a s d f g h j k l z x c v b n m)
  local _sessions=("${(@f)$(tmux ls -F '#S')}")
  local i=1 s
  for s in "${_sessions[@]}"; do echo "  ${_keys[$i]}) $s"; ((i++)); done
  echo; echo -n "> "; local _pick; read _pick
  [[ -z "$_pick" ]] && return
  local idx=${_keys[(i)${_pick:l}]} _target
  (( idx >= 1 && idx <= ${#_sessions[@]} )) && _target="${_sessions[$idx]}" || _target="$_pick"
  [[ -n "$TMUX" ]] && tmux switch-client -t "$_target" || tmux attach -t "$_target"
}
alias go='_session_picker'
[[ -z "$TMUX" && -n "$SSH_CONNECTION" ]] && _session_picker
```

Full walkthrough of this layout: https://shelldrop.sh/agent-operating-system/

## 5. Reach the machine from anywhere with Tailscale

Tailscale gives the machine a private address the phone can reach on any network, with no ports
opened to the internet.

- Install if missing (ask first): the Tailscale app from https://tailscale.com/download on macOS, or
  `curl -fsSL https://tailscale.com/install.sh | sh` on Linux, then `sudo tailscale up`.
- The user signs in to Tailscale themselves in the browser. Never handle their password.
- Get the address: `tailscale ip -4` (on macOS, if the CLI is not on the PATH, use
  `/Applications/Tailscale.app/Contents/MacOS/Tailscale ip -4`).
- Tell the user to install Tailscale on the iPhone or iPad and sign in with the same account.

## 6. Keep the machine awake (always-on machines only)

Ask first. On a Mac that should stay reachable: `sudo pmset -a sleep 0 disksleep 0` and keep it on
power. Display sleep is fine. Skip this on a laptop the user carries around.

## 7. SSH key for the phone (recommended)

Passwords work, but a key is safer and faster. The key is created on the phone, not here:

1. In Shell Drop, go to **Settings > Login and connections > SSH keys** and create a key, then copy
   its public key.
2. The user pastes the public key to you. Append it to `~/.ssh/authorized_keys`
   (create `~/.ssh` with mode 700 and the file with mode 600 if missing). Never add a key the user
   did not give you.

## 8. Verify, then hand over the connection details

```bash
ssh -o BatchMode=yes localhost true 2>/dev/null && echo "sshd answers" || echo "check Remote Login"
tmux ls
```

Then give the user exactly what to type into the app, on separate lines:

- **Host:** the Tailscale IP from step 5 (or the machine's Tailscale name)
- **Port:** 22
- **Username:** the output of `whoami`
- **Auth:** the SSH key from step 7, or the account password

In Shell Drop: add a new connection with these details, then tap its card. They should land in
the login menu (step 4) or a shell; `tmux attach -t <name>` reaches any running agent.

Shell Drop is free on the App Store: https://apps.apple.com/app/id6760954570

## Troubleshooting

- **Connection times out:** both devices signed in to the same Tailscale account? Tailscale on the
  phone switched on? On café or hotel Wi-Fi the first connect can take longer; retry once.
- **"Connection refused":** Remote Login (step 2) is off.
- **Attach says "can't find session":** run `tmux ls` for the exact name; check the two
  `set-titles` lines in step 3 are present.
- **Copy from tmux does nothing on the phone:** `set -g set-clipboard on` is missing.

More: tmux commands for a phone https://shelldrop.sh/tmux-cheat-sheet/ ,
SSH keys and agent forwarding on iPhone https://shelldrop.sh/ssh-keys-on-iphone/
