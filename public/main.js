const socket = io();
let userName = "";
let typing = false;
let typingTimeout;

const entryScreen = document.getElementById("entry-screen");
const chatScreen = document.getElementById("chat-screen");
const nameInput = document.getElementById("nameInput");
const msgInput = document.getElementById("msgInput");
const chatBox = document.getElementById("chat-box");
const greeting = document.getElementById("greeting");
const userList = document.getElementById("user-list");
const themeToggle = document.getElementById("theme-toggle");
const onlineCount = document.getElementById("online-count");
const dropdown = document.getElementById("dropdown-users");

function enterChat() {
  const name = nameInput.value.trim();
  if (!name) return;
  userName = name;
  localStorage.setItem("savedName", userName);
  entryScreen.style.display = "none";
  chatScreen.style.display = "block";
  greeting.innerText = `Welcome, ${userName}`;
  socket.emit("join", userName);
}

window.addEventListener("load", () => {
  const saved = localStorage.getItem("savedName");
  if (saved) {
    userName = saved;
    entryScreen.style.display = "none";
    chatScreen.style.display = "block";
    greeting.innerText = `Welcome, ${userName}`;
    socket.emit("join", userName);
  }

  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
    themeToggle.innerText = "☀️";
  }
});

function toggleTheme() {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  themeToggle.innerText = isDark ? "☀️" : "🌙";
}

function sendMessage() {
  const message = msgInput.value.trim();
  if (!message) return;
  const timestamp = Date.now();
  socket.emit("chat message", { user: userName, message, timestamp });
  msgInput.value = "";
  stopTyping();
}

msgInput.addEventListener("input", () => {
  if (!typing) {
    typing = true;
    socket.emit("typing", { user: userName, typing: true });
  }
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(stopTyping, 1000);
});

function stopTyping() {
  typing = false;
  socket.emit("typing", { user: userName, typing: false });
}

function formatTime(ts) {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  const date = new Date(ts);
  return date.toDateString();
}

let lastDate = "";

function addMessage({ user, message, timestamp }) {
  const dateStr = formatDate(timestamp);
  if (lastDate !== dateStr) {
    lastDate = dateStr;
    const divider = document.createElement("div");
    divider.className = "date-divider";
    divider.innerText = dateStr;
    chatBox.appendChild(divider);
  }

  const msgDiv = document.createElement("div");
  msgDiv.className = "message";
  msgDiv.classList.add(user === userName ? "outgoing" : "incoming");

  msgDiv.innerHTML = `
    <div>${message}</div>
    <div class="timestamp">${formatTime(timestamp)}</div>
  `;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function clearChat() {
  if (confirm("Clear your chat view?")) {
    chatBox.innerHTML = "";
    localStorage.setItem("chatClearedAt", Date.now());
  }
}

function toggleDropdown() {
  dropdown.classList.toggle("hidden");
}

socket.on("chat history", (messages) => {
  const clearedAt = parseInt(localStorage.getItem("chatClearedAt") || "0", 10);
  messages.forEach(msg => {
    if (!msg.timestamp || msg.timestamp > clearedAt) {
      addMessage(msg);
    }
  });
});

socket.on("chat message", (msg) => {
  const clearedAt = parseInt(localStorage.getItem("chatClearedAt") || "0", 10);
  if (!msg.timestamp || msg.timestamp > clearedAt) {
    addMessage(msg);
  }
});

socket.on("system message", (msg) => {
  const div = document.createElement("div");
  div.className = "message system";
  div.innerText = msg;
  chatBox.appendChild(div);
});

socket.on("user list", (users) => {
  onlineCount.innerText = `${users.length} online ⬇`;
  dropdown.innerHTML = users.map(user => `<li>${user}</li>`).join("");
});

socket.on("typing", ({ user, typing }) => {
  const id = `typing-${user}`;
  let el = document.getElementById(id);
  if (typing) {
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.className = "typing";
      el.innerText = `${user} is typing...`;
      chatBox.appendChild(el);
    }
  } else {
    if (el) el.remove();
  }
});
