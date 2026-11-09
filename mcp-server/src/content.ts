// All answers this server gives. Pure functions over static text, derived from
// skills/shelldrop-remote-setup/SKILL.md and https://shelldrop.sh/tmux-cheat-sheet/.
// No network calls, no state, nothing about the caller is kept.

export const LINKS = {
  site: "https://shelldrop.sh",
  docs: "https://shelldrop.sh/mcp/",
  appStore: "https://apps.apple.com/app/id6760954570",
  tmuxCheatSheet: "https://shelldrop.sh/tmux-cheat-sheet/",
  sshKeys: "https://shelldrop.sh/ssh-keys-on-iphone/",
  agentOs: "https://shelldrop.sh/agent-operating-system/",
} as const;

const FOOTER = `\n\nShell Drop is a free iOS SSH client for AI agent operators: ${LINKS.appStore}`;

// ---------------------------------------------------------------- setup_guide

export type SetupOs = "macos" | "linux";

interface Step {
  title: string;
  body: string;
}

const PHONE_TMUX_CONF = `# Name the terminal tab after the tmux session (phone apps use it to label tabs and reattach)
set -g set-titles on
set -g set-titles-string '#S'
# Touch and trackpad scrolling through history
set -g mouse on
# Let copy in tmux reach the phone's clipboard (OSC 52)
set -g set-clipboard on
# More scrollback for long agent output
set -g history-limit 50000`;

function setupSteps(os: SetupOs): Step[] {
  const mac = os === "macos";
  return [
    {
      title: "Find out what we are on",
      body: [
        "uname -s                      # Darwin = macOS, Linux = Linux",
        "whoami; hostname",
        "command -v tmux tailscale" + (mac ? " brew" : ""),
        "",
        "Note the username and which of tmux and Tailscale are already installed.",
      ].join("\n"),
    },
    {
      title: "Turn on SSH (Remote Login)",
      body: mac
        ? [
            "Check: sudo systemsetup -getremotelogin",
            "If it is off: sudo systemsetup -setremotelogin on",
            "or turn on System Settings > General > Sharing > Remote Login (on recent macOS the",
            "command may need Full Disk Access for the terminal; the Settings toggle always works).",
          ].join("\n")
        : [
            "Check: systemctl is-active ssh || systemctl is-active sshd",
            "If neither is active (Debian and Ubuntu):",
            "sudo apt install openssh-server && sudo systemctl enable --now ssh",
          ].join("\n"),
    },
    {
      title: "Install tmux and make it phone-friendly",
      body: [
        "tmux keeps each agent running after the phone disconnects.",
        "Install if missing: " + (mac ? "brew install tmux" : "sudo apt install tmux"),
        "Back up ~/.tmux.conf if it exists, then append only the lines not already there:",
        "",
        PHONE_TMUX_CONF,
        "",
        "If a tmux server is running, reload: tmux source-file ~/.tmux.conf",
      ].join("\n"),
    },
    {
      title: "One session per agent",
      body: [
        "tmux new -s my-project        # start a session, then run the agent inside it",
        "# detach with Ctrl-b then d; the agent keeps working",
        "tmux ls                       # list sessions",
        "tmux attach -t my-project     # come back to it, from any device",
        "",
        `Optional one-key session menu on SSH login: ${LINKS.agentOs}`,
      ].join("\n"),
    },
    {
      title: "Reach the machine from anywhere with Tailscale",
      body: [
        mac
          ? "Install the Tailscale app from https://tailscale.com/download and sign in."
          : "curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up",
        "The user signs in to Tailscale themselves in the browser. Never handle their password.",
        "Get the address: " +
          (mac
            ? "tailscale ip -4 (or /Applications/Tailscale.app/Contents/MacOS/Tailscale ip -4 if the CLI is not on the PATH)"
            : "tailscale ip -4"),
        "Install Tailscale on the iPhone or iPad and sign in with the same account.",
        "No router ports are opened; SSH is never exposed to the public internet.",
      ].join("\n"),
    },
    {
      title: "Keep the machine awake (always-on machines only)",
      body: mac
        ? "sudo pmset -a sleep 0 disksleep 0, and keep it on power. Display sleep is fine. Skip this on a laptop that travels."
        : "Make sure the machine does not suspend: sudo systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target. Skip this on a laptop that travels.",
    },
    {
      title: "SSH key for the phone (recommended)",
      body: [
        "Create the key on the phone, not on this machine.",
        "In Shell Drop: Settings > Login and connections > SSH keys, create a key and copy its public key.",
        "Append that public key to ~/.ssh/authorized_keys (~/.ssh mode 700, the file mode 600).",
        "Never print, copy or move private keys.",
        `More: ${LINKS.sshKeys}`,
      ].join("\n"),
    },
    {
      title: "Verify, then connect from the phone",
      body: [
        'ssh -o BatchMode=yes localhost true 2>/dev/null && echo "sshd answers" || echo "check Remote Login"',
        "tmux ls",
        "",
        "In Shell Drop, add a connection:",
        "Host: the Tailscale IP (or the machine's Tailscale name)",
        "Port: 22",
        "Username: the output of whoami",
        "Auth: the SSH key, or the account password",
        "Then tmux attach -t <name> reaches any running agent.",
      ].join("\n"),
    },
  ];
}

export function setupGuide(os: SetupOs): string {
  const label = os === "macos" ? "macOS" : "Linux";
  const steps = setupSteps(os)
    .map((s, i) => `## ${i + 1}. ${s.title}\n\n${s.body}`)
    .join("\n\n");
  return (
    `# Set up a ${label} machine for running AI agents from an iPhone or iPad\n\n` +
    "Ask before any change that needs administrator rights, back up config files before editing, " +
    "and append to them, never overwrite.\n\n" +
    steps +
    FOOTER
  );
}

// ---------------------------------------------------------------- tmux_howto

interface TmuxTopic {
  id: string;
  keywords: string[];
  answer: string;
}

export const TMUX_TOPICS: TmuxTopic[] = [
  {
    id: "attach",
    keywords: ["attach", "reattach", "connect", "resume", "come back", "rejoin", "join"],
    answer: [
      "Attach to a tmux session:",
      "tmux ls                      # find the name or number",
      "tmux attach -t work          # attach to the session called work",
      "tmux a                       # attach to the most recent session",
      "tmux attach -d -t work       # attach and detach other clients, so the window fits this screen",
      "tmux new -A -s work          # attach if it exists, create it if not",
      "Inside tmux, Ctrl-b s shows a session list to pick from.",
    ].join("\n"),
  },
  {
    id: "detach",
    keywords: ["detach", "leave", "exit", "background", "disconnect", "keep running"],
    answer: [
      "Detach without killing the session: press Ctrl-b, let go, then d.",
      "From a shell inside tmux: tmux detach",
      "The session keeps running on the server; tmux attach brings it back.",
      "Typing exit closes the shell, and closing the last shell ends the session.",
      "A dropped SSH connection counts as a detach, so the agent keeps working.",
      "In Shell Drop: tap Ctrl on the keyboard toolbar, then b, then d.",
    ].join("\n"),
  },
  {
    id: "list",
    keywords: ["list", "ls", "show sessions", "which sessions", "running sessions", "what sessions"],
    answer: [
      "List sessions:",
      "tmux ls                      # short for tmux list-sessions",
      "Inside tmux: Ctrl-b s to pick a session, Ctrl-b w to pick a window.",
    ].join("\n"),
  },
  {
    id: "kill",
    keywords: ["kill", "close", "end", "stop", "delete", "remove", "quit"],
    answer: [
      "Kill sessions:",
      "tmux kill-session -t work    # one session and everything running in it",
      "tmux kill-session -a         # every session except the current one",
      "tmux kill-server             # all sessions and the tmux server",
      "Inside tmux: Ctrl-b & kills the current window, Ctrl-b x the current pane (both ask first).",
    ].join("\n"),
  },
  {
    id: "scrollback",
    keywords: ["scroll", "scrollback", "history", "page up", "read output", "copy mode", "see earlier"],
    answer: [
      "Read what scrolled off the screen:",
      "Ctrl-b [            enter copy mode; arrows or Page Up / Page Down move, q leaves",
      "Ctrl-b Page Up      enter copy mode and scroll up in one step",
      "With set -g mouse on in ~/.tmux.conf, a swipe or trackpad scroll moves through the history directly.",
      "More history (applies to new panes): set -g history-limit 50000",
    ].join("\n"),
  },
  {
    id: "mouse",
    keywords: ["mouse", "swipe", "touch", "trackpad", "finger", "gesture"],
    answer: [
      "Turn on mouse mode so swipes and trackpad scrolling reach tmux:",
      "echo 'set -g mouse on' >> ~/.tmux.conf && tmux source-file ~/.tmux.conf",
      "Running server only, no config change: tmux set -g mouse on",
      "In Shell Drop: Settings > Terminal > Tmux > Scrolling sets the swipe direction.",
    ].join("\n"),
  },
  {
    id: "copy",
    keywords: ["copy", "clipboard", "paste", "yank", "osc 52", "osc52", "select"],
    answer: [
      "Get text copied inside tmux onto the phone's clipboard:",
      "echo 'set -g set-clipboard on' >> ~/.tmux.conf && tmux source-file ~/.tmux.conf",
      "Copy: Ctrl-b [ to enter copy mode, Space to start a selection, move, Enter to copy.",
      "With mouse on, drag to select; releasing copies.",
      "In Shell Drop also switch on Settings > Agents > Let server send to clipboard.",
    ].join("\n"),
  },
  {
    id: "rename",
    keywords: ["rename", "name", "title", "label", "tab name"],
    answer: [
      "Rename:",
      "tmux rename-session -t work agents     # rename a session (inside tmux: Ctrl-b $)",
      "Ctrl-b ,                               # rename the current window",
      "To show the session name as the tab title on the phone, add to ~/.tmux.conf:",
      "set -g set-titles on",
      "set -g set-titles-string '#S'",
    ].join("\n"),
  },
  {
    id: "new",
    keywords: ["new", "start", "create", "open session", "begin"],
    answer: [
      "Start a session:",
      "tmux new -s work             # new session called work; run the agent inside it",
      "tmux new -A -s work          # attach if it exists, create it if not",
      "Ctrl-b c                     # new window inside the current session",
      "One session per agent, one project each.",
    ].join("\n"),
  },
  {
    id: "windows",
    keywords: ["window", "pane", "split", "switch", "next", "zoom"],
    answer: [
      "Windows and panes (windows read better on a phone than panes):",
      "Ctrl-b c / n / p / 0-9 / w   new, next, previous, jump to number, pick from list",
      'Ctrl-b % / "                 split left-right / top-bottom',
      "Ctrl-b <arrow>               move between panes",
      "Ctrl-b z                     zoom the current pane, and back",
      "Ctrl-b ?                     list every key binding",
    ].join("\n"),
  },
];

const TOPIC_IDS = TMUX_TOPICS.map((t) => t.id);

export function tmuxHowto(task: string): string {
  const q = task.toLowerCase().trim();
  const scored = TMUX_TOPICS.map((t) => {
    let score = 0;
    if (q === t.id) score += 100;
    for (const k of t.keywords) if (q.includes(k)) score += k.length;
    if (q.includes(t.id)) score += t.id.length + 1;
    return { t, score };
  })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  const prefixNote =
    "\n\nKeys assume the stock tmux prefix Ctrl-b: press it, let go, then the next key.";

  if (scored.length === 0) {
    return (
      `No exact match for "${task}". Topics covered: ${TOPIC_IDS.join(", ")}.\n\n` +
      TMUX_TOPICS.find((t) => t.id === "attach")!.answer +
      `\n\nFull cheat sheet: ${LINKS.tmuxCheatSheet}` +
      prefixNote
    );
  }
  const top = scored.slice(0, 2).filter((s, i) => i === 0 || s.score >= scored[0].score / 2);
  return top.map((s) => s.t.answer).join("\n\n") + prefixNote + `\nMore: ${LINKS.tmuxCheatSheet}`;
}

// ---------------------------------------------------------- generate_tmux_conf

export interface TmuxConfOptions {
  mouse?: boolean;
  set_titles?: boolean;
  set_clipboard?: boolean;
  history_limit?: number;
  prefix?: "C-b" | "C-a";
}

export function generateTmuxConf(opts: TmuxConfOptions = {}): string {
  const mouse = opts.mouse ?? true;
  const titles = opts.set_titles ?? true;
  const clipboard = opts.set_clipboard ?? true;
  const history = Math.round(
    Math.min(1_000_000, Math.max(2_000, opts.history_limit ?? 50_000)),
  );
  const prefix = opts.prefix ?? "C-b";

  const lines: string[] = ["# Phone-friendly tmux settings (generated by the Shell Drop MCP server)"];
  if (titles) {
    lines.push(
      "# Name the terminal tab after the tmux session (phone apps use it to label tabs and reattach)",
      "set -g set-titles on",
      "set -g set-titles-string '#S'",
    );
  }
  if (mouse) lines.push("# Touch and trackpad scrolling through history", "set -g mouse on");
  if (clipboard)
    lines.push("# Let copy in tmux reach the phone's clipboard (OSC 52)", "set -g set-clipboard on");
  lines.push("# More scrollback for long agent output", `set -g history-limit ${history}`);
  if (prefix === "C-a") {
    lines.push(
      "# Use Ctrl-a as the prefix instead of the stock Ctrl-b",
      "unbind C-b",
      "set -g prefix C-a",
      "bind C-a send-prefix",
    );
  }

  return [
    "```",
    ...lines,
    "```",
    "",
    "Append to ~/.tmux.conf (back it up first, skip lines already there), then reload:",
    "tmux source-file ~/.tmux.conf",
    "history-limit applies to panes created after the change.",
  ].join("\n");
}

// ------------------------------------------------------ troubleshoot_connection

interface Fix {
  id: string;
  keywords: string[];
  answer: string;
}

export const FIXES: Fix[] = [
  {
    id: "timeout",
    keywords: ["timeout", "timed out", "time out", "hangs", "hanging", "no response", "unreachable", "slow"],
    answer: [
      "Connection times out:",
      "1. Both devices signed in to the same Tailscale account, and Tailscale switched on on the phone.",
      "2. The machine is awake (always-on Mac: sudo pmset -a sleep 0 disksleep 0).",
      "3. Use the machine's Tailscale IP (tailscale ip -4), not its home Wi-Fi address.",
      "4. On café, hotel or mobile networks the first connect can go through a relay and take longer; retry once.",
      "5. If one device stays stuck, toggle Tailscale off and on on that device.",
    ].join("\n"),
  },
  {
    id: "refused",
    keywords: ["refused", "connection refused", "port 22", "closed"],
    answer: [
      "Connection refused: the machine answered but nothing listens for SSH.",
      "macOS: turn on System Settings > General > Sharing > Remote Login (or sudo systemsetup -setremotelogin on).",
      "Linux: sudo systemctl enable --now ssh (install openssh-server first if missing).",
      "Check the port in the app is 22 unless sshd was moved.",
    ].join("\n"),
  },
  {
    id: "session_not_found",
    keywords: ["can't find session", "cant find session", "can not find session", "cannot find session", "session not found", "no server running", "no sessions", "find session", "attach fails"],
    answer: [
      "Attach says \"can't find session\" or \"no server running\":",
      "1. Run tmux ls for the exact session name, then tmux attach -t <name>.",
      "2. \"no server running\" means no tmux sessions exist yet: tmux new -s <name>.",
      "3. If an app reattaches to a session literally called 'tmux', the server is not publishing session names. Add to ~/.tmux.conf and reload:",
      "   set -g set-titles on",
      "   set -g set-titles-string '#S'",
      "   tmux source-file ~/.tmux.conf",
      "4. Make sure you log in as the same user that started the sessions.",
    ].join("\n"),
  },
  {
    id: "copy",
    keywords: ["copy", "clipboard", "paste", "osc"],
    answer: [
      "Copy from tmux does nothing on the phone:",
      "1. Add set -g set-clipboard on to ~/.tmux.conf, then tmux source-file ~/.tmux.conf.",
      "2. In Shell Drop, switch on Settings > Agents > Let server send to clipboard.",
      "3. Nested tmux (tmux inside tmux) needs the line on both servers.",
    ].join("\n"),
  },
];

export function troubleshootConnection(symptom: string): string {
  const q = symptom.toLowerCase().replace(/[’']/g, "'");
  const hits = FIXES.map((f) => ({
    f,
    score: f.keywords.reduce((n, k) => (q.includes(k) ? n + k.length : n), 0) + (q === f.id ? 100 : 0),
  }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score);

  if (hits.length === 0) {
    return (
      `No exact match for "${symptom}". Known symptoms: timeout, refused, can't find session, copy not working.\n\n` +
      FIXES.map((f) => f.answer).join("\n\n") +
      FOOTER
    );
  }
  return hits[0].f.answer + `\n\nMore: ${LINKS.tmuxCheatSheet}`;
}
