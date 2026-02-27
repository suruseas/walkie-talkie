export function getDashboardHTML(adminToken: string): string {
return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Walkie-Talkie</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-base: #09090b;
    --bg-raised: #111114;
    --bg-surface: #18181b;
    --bg-hover: #1f1f23;
    --border: rgba(255,255,255,0.06);
    --border-subtle: rgba(255,255,255,0.04);
    --text-primary: #ececef;
    --text-secondary: #71717a;
    --text-tertiary: #52525b;
    --accent: #818cf8;
    --accent-soft: rgba(129,140,248,0.12);
    --green: #34d399;
    --green-soft: rgba(52,211,153,0.12);
    --green-border: rgba(52,211,153,0.2);
    --red: #f87171;
    --red-soft: rgba(248,113,113,0.1);
    --red-border: rgba(248,113,113,0.2);
    --radius: 10px;
    --font: 'DM Sans', -apple-system, sans-serif;
    --mono: 'Geist Mono', ui-monospace, monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--font);
    background: var(--bg-base);
    color: var(--text-primary);
    height: 100vh;
    display: flex;
    flex-direction: column;
    -webkit-font-smoothing: antialiased;
  }

  /* Header */
  header {
    height: 52px;
    padding: 0 20px;
    background: var(--bg-raised);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 14px;
    flex-shrink: 0;
    backdrop-filter: blur(12px);
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 9px;
  }
  .logo-icon {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    background: linear-gradient(135deg, var(--accent), #a78bfa);
    display: grid;
    place-items: center;
  }
  .logo-icon svg {
    width: 13px;
    height: 13px;
    fill: none;
    stroke: #fff;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  header h1 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
  }
  .header-sep {
    width: 1px;
    height: 18px;
    background: var(--border);
  }
  #status {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 100px;
    background: var(--green-soft);
    color: var(--green);
    border: 1px solid var(--green-border);
    transition: all 0.25s ease;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  #status::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 6px var(--green);
  }
  #status.disconnected {
    background: var(--red-soft);
    color: var(--red);
    border-color: var(--red-border);
  }
  #status.disconnected::before {
    background: var(--red);
    box-shadow: 0 0 6px var(--red);
  }
  .header-spacer { flex: 1; }
  .clear-btn {
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
    padding: 4px 12px;
    background: transparent;
    color: var(--text-tertiary);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .clear-btn:hover {
    color: var(--text-secondary);
    border-color: rgba(255,255,255,0.1);
    background: var(--bg-hover);
  }
  .clear-btn:active {
    transform: scale(0.97);
  }

  /* Main */
  .container {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Sidebar */
  #sidebar {
    width: 220px;
    background: var(--bg-raised);
    border-right: 1px solid var(--border);
    padding: 16px 12px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .sidebar-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-tertiary);
    padding: 0 8px;
  }
  #user-list {
    list-style: none;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  #user-list li {
    padding: 7px 8px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-radius: 8px;
    transition: background 0.15s ease;
  }
  #user-list li:hover {
    background: var(--bg-hover);
  }
  .user-info {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }
  .user-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 8px rgba(52,211,153,0.35);
    flex-shrink: 0;
  }
  .user-name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text-primary);
  }
  .kick-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-tertiary);
    font-family: var(--mono);
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    opacity: 0;
    flex-shrink: 0;
  }
  #user-list li:hover .kick-btn {
    opacity: 1;
  }
  .kick-btn:hover {
    border-color: var(--red-border);
    color: var(--red);
    background: var(--red-soft);
  }
  #stop-all {
    width: 100%;
    padding: 8px;
    background: var(--red-soft);
    color: var(--red);
    border: 1px solid var(--red-border);
    border-radius: 8px;
    font-family: var(--font);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  #stop-all:hover {
    background: rgba(248,113,113,0.18);
    border-color: rgba(248,113,113,0.35);
  }
  #stop-all:active {
    transform: scale(0.98);
  }

  /* Messages */
  #messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    scrollbar-width: thin;
    scrollbar-color: var(--bg-surface) transparent;
  }
  #messages::-webkit-scrollbar { width: 5px; }
  #messages::-webkit-scrollbar-track { background: transparent; }
  #messages::-webkit-scrollbar-thumb { background: var(--bg-surface); border-radius: 8px; }

  .msg {
    padding: 10px 14px;
    border-radius: var(--radius);
    font-size: 16px;
    line-height: 1.6;
    max-width: 100%;
    animation: slideIn 0.25s cubic-bezier(0.16,1,0.3,1);
    border: 1px solid transparent;
  }
  .msg .time {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--text-tertiary);
    margin-right: 8px;
  }
  .msg .from {
    font-weight: 600;
    color: var(--accent);
  }
  .msg .to {
    font-family: var(--mono);
    font-size: 14px;
    color: var(--text-tertiary);
    margin-left: 2px;
  }
  .msg .content {
    margin-top: 4px;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-primary);
  }
  .msg.message {
    background: var(--bg-surface);
    border-color: var(--border-subtle);
  }
  .msg.message:hover {
    border-color: var(--border);
  }
  .msg.system {
    background: transparent;
    font-size: 15px;
    color: var(--text-tertiary);
    max-width: 100%;
    padding: 6px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .msg.system::before {
    content: "";
    flex: 0 0 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--green);
  }
  .msg.system.leave::before {
    background: var(--red);
  }
  .msg.system strong {
    color: var(--text-secondary);
    font-weight: 500;
  }
  .empty {
    color: var(--text-tertiary);
    text-align: center;
    margin-top: 36vh;
    font-size: 13px;
  }

  /* Message area wrapper */
  .message-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  /* Input bar */
  .input-bar {
    padding: 12px 16px;
    background: var(--bg-raised);
    border-top: 1px solid var(--border);
    display: flex;
    align-items: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }
  .input-bar select {
    font-family: var(--mono);
    font-size: 12px;
    padding: 8px 10px;
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    outline: none;
    cursor: pointer;
    flex-shrink: 0;
    margin-bottom: 1px;
  }
  .input-bar select:focus {
    border-color: var(--accent);
  }
  .input-bar textarea {
    flex: 1;
    font-family: var(--font);
    font-size: 13px;
    padding: 8px 12px;
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    outline: none;
    resize: none;
    overflow-y: hidden;
    line-height: 1.5;
    min-height: 36px;
    max-height: 120px;
    field-sizing: content;
  }
  .input-bar textarea::placeholder {
    color: var(--text-tertiary);
  }
  .input-bar textarea:focus {
    border-color: var(--accent);
  }
  .send-btn {
    font-family: var(--font);
    font-size: 12px;
    font-weight: 600;
    padding: 8px 16px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;
  }
  .send-btn:hover {
    opacity: 0.85;
  }
  .send-btn:active {
    transform: scale(0.97);
  }
  .send-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
</style>
</head>
<body>
  <header>
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24"><path d="M12 10v10"/><path d="M8 20h8"/><circle cx="12" cy="6" r="2"/><path d="M5 3c2.8 2.8 4 5 4 7" opacity=".6"/><path d="M19 3c-2.8 2.8-4 5-4 7" opacity=".6"/></svg>
      </div>
      <h1>Walkie-Talkie</h1>
    </div>
    <div class="header-sep"></div>
    <span id="status">connected</span>
    <div class="header-spacer"></div>
    <button class="clear-btn" id="clear-btn">Clear</button>
  </header>
  <div class="container">
    <div id="sidebar">
      <span class="sidebar-label">On Air</span>
      <ul id="user-list"></ul>
      <button id="stop-all">Stop All</button>
    </div>
    <div class="message-area">
      <div id="messages">
        <div class="empty">Waiting for transmissions...</div>
      </div>
      <div class="input-bar">
        <select id="send-to">
          <option value="@all">@all</option>
        </select>
        <textarea id="send-input" placeholder="Send a message..." rows="1"></textarea>
        <button class="send-btn" id="send-btn">Send</button>
      </div>
    </div>
  </div>
  <script>
    const ADMIN_TOKEN = "${adminToken}";
    const adminHeaders = { "Content-Type": "application/json", "Authorization": "Bearer " + ADMIN_TOKEN };
    const messagesEl = document.getElementById("messages");
    const userListEl = document.getElementById("user-list");
    const statusEl = document.getElementById("status");
    const users = new Set();

    function formatTime(ts) {
      return new Date(ts).toLocaleTimeString();
    }

    function clearEmpty() {
      const empty = messagesEl.querySelector(".empty");
      if (empty) empty.remove();
    }

    function scrollBottom() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function kick(name) {
      fetch("/kick", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ name }),
      });
    }

    function renderUsers() {
      userListEl.innerHTML = "";
      for (const u of users) {
        const li = document.createElement("li");
        const info = document.createElement("span");
        info.className = "user-info";
        info.innerHTML = '<span class="user-dot"></span><span class="user-name">' + u + '</span>';
        const btn = document.createElement("button");
        btn.className = "kick-btn";
        btn.textContent = "kick";
        btn.onclick = () => kick(u);
        li.appendChild(info);
        li.appendChild(btn);
        userListEl.appendChild(li);
      }
      if (typeof updateSendTo === "function") updateSendTo();
    }

    function addMessage(html, cls) {
      clearEmpty();
      const div = document.createElement("div");
      div.className = "msg " + cls;
      div.innerHTML = html;
      messagesEl.appendChild(div);
      scrollBottom();
    }

    document.getElementById("stop-all").onclick = () => {
      fetch("/kick-all", { method: "POST", headers: adminHeaders });
    };

    // Send from dashboard
    const sendToEl = document.getElementById("send-to");
    const sendInputEl = document.getElementById("send-input");
    const sendBtnEl = document.getElementById("send-btn");

    function updateSendTo() {
      const current = sendToEl.value;
      sendToEl.innerHTML = '<option value="@all">@all</option>';
      for (const u of users) {
        const opt = document.createElement("option");
        opt.value = "@" + u;
        opt.textContent = "@" + u;
        sendToEl.appendChild(opt);
      }
      if ([...sendToEl.options].some(o => o.value === current)) {
        sendToEl.value = current;
      }
    }

    function sendMessage() {
      const content = sendInputEl.value.trim();
      if (!content) return;
      fetch("/admin-send", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ to: sendToEl.value, content }),
      }).then(() => {
        sendInputEl.value = "";
        sendInputEl.style.height = "auto";
        sendInputEl.focus();
      });
    }

    sendBtnEl.onclick = sendMessage;

    sendInputEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.isComposing) return;
      if (!e.shiftKey && !e.metaKey) { e.preventDefault(); sendMessage(); }
      // Shift+Enter: let browser insert newline naturally
    });

    // Auto-resize textarea
    sendInputEl.addEventListener("input", () => {
      sendInputEl.style.height = "auto";
      sendInputEl.style.height = Math.min(sendInputEl.scrollHeight, 120) + "px";
      sendInputEl.style.overflowY = sendInputEl.scrollHeight > 120 ? "auto" : "hidden";
    });

    // Clear button
    document.getElementById("clear-btn").onclick = () => {
      messagesEl.innerHTML = '<div class="empty">Waiting for transmissions...</div>';
    };

    // Fetch initial user list
    fetch("/users").then(r => r.json()).then(data => {
      for (const u of data.users) users.add(u);
      renderUsers();
    }).catch(() => {});

    const es = new EventSource("/events");

    es.onmessage = (e) => {
      const ev = JSON.parse(e.data);

      if (ev.type === "join") {
        users.add(ev.name);
        renderUsers();
        addMessage(
          '<span class="time">' + formatTime(ev.timestamp) + '</span>' +
          '<strong>' + ev.name + '</strong> joined the channel',
          "system"
        );
      } else if (ev.type === "leave") {
        users.delete(ev.name);
        renderUsers();
        addMessage(
          '<span class="time">' + formatTime(ev.timestamp) + '</span>' +
          '<strong>' + ev.name + '</strong> left the channel',
          "system leave"
        );
      } else if (ev.type === "message") {
        addMessage(
          '<span class="time">' + formatTime(ev.timestamp) + '</span>' +
          '<span class="from">' + ev.from + '</span> ' +
          '<span class="to">&rarr; ' + ev.to + '</span>' +
          '<div class="content">' + ev.content.replace(/</g, "&lt;") + '</div>',
          "message"
        );
      }
    };

    es.onopen = () => {
      statusEl.textContent = "connected";
      statusEl.className = "";
    };

    es.onerror = () => {
      statusEl.textContent = "disconnected";
      statusEl.className = "disconnected";
    };
  </script>
</body>
</html>`;
}
