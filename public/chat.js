const username = localStorage.getItem('username');
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const historyList = document.getElementById('historyList');

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// ===== THREAD MANAGEMENT =====
function generateThreadId() {
  return 'thread-' + Date.now() + '-' + Math.random().toString(36).substring(2,9);
}

// Ambil threadId aktif (atau buat baru jika belum ada)
let currentThreadId = localStorage.getItem('currentThreadId');
if (!currentThreadId) {
  currentThreadId = generateThreadId();
  localStorage.setItem('currentThreadId', currentThreadId);
}

// ===== RENDER CHAT =====
function renderChat(message, isUser, timestamp) {
  const container = document.createElement('div');
  container.className = 'message-container ' + (isUser ? 'user' : 'bot');

  const bubble = document.createElement('div');
  bubble.className = 'message ' + (isUser ? 'user' : 'bot');
  bubble.innerText = message;

  const time = document.createElement('div');
  time.className = 'timestamp';
  time.innerText = formatTime(timestamp || new Date());

  container.appendChild(bubble);
  container.appendChild(time);

  chatBox.appendChild(container);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ===== LOAD CHAT HISTORY UNTUK THREAD AKTIF =====
async function loadChatHistory() {
  chatBox.innerHTML = "";
  if (!username || !currentThreadId) return;

  const res = await fetch(`/api/chats/user/${username}?threadId=${currentThreadId}`);
  const chats = await res.json();

  chats.forEach(chat => {
    renderChat(chat.message, chat.sender === "user", chat.createdAt);
  });
}

// ===== LOAD DAFTAR THREAD KE SIDEBAR =====
async function loadThreads() {
  historyList.innerHTML = "";
  const res = await fetch(`/api/chats/threads/${username}`);
  const threads = await res.json();

  threads.forEach(thread => {
    const li = document.createElement('li');
    li.style.position = 'relative';

    // Teks last message di thread
    const msgSpan = document.createElement('span');
    msgSpan.textContent = thread.lastMessage || "Chat Baru";
    msgSpan.style.cursor = 'pointer';
    if(thread._id === currentThreadId) {
      li.style.backgroundColor = "#d9f0e6";
    }
    msgSpan.addEventListener('click', () => {
      currentThreadId = thread._id;
      localStorage.setItem('currentThreadId', currentThreadId);
      loadChatHistory();
      loadThreads();
    });
    li.appendChild(msgSpan);

    // Tombol hapus
    const delBtn = document.createElement('button');
    delBtn.textContent = "🗑️";
    delBtn.title = "Hapus riwayat ini";
    delBtn.style.float = "right";
    delBtn.style.marginLeft = "10px";
    delBtn.style.background = "none";
    delBtn.style.border = "none";
    delBtn.style.cursor = "pointer";
    delBtn.style.fontSize = "1.2em";
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      console.log("Coba hapus threadId:", thread._id);
      if(confirm("Yakin ingin menghapus riwayat percakapan ini?")) {
        const resp = await fetch(`/api/chats/thread/${username}/${encodeURIComponent(thread._id)}`, { method: 'DELETE' });
        console.log("Response hapus:", resp.status);
        if (resp.ok) {
          if(thread._id === currentThreadId) {
            currentThreadId = generateThreadId();
            localStorage.setItem('currentThreadId', currentThreadId);
            chatBox.innerHTML = "";
            userInput.value = "";
          }
          await loadThreads();
          await loadChatHistory();
        } else {
          alert("Gagal menghapus riwayat. Coba lagi.");
        }
      }
    });
    li.appendChild(delBtn);

    historyList.appendChild(li);
  }); // <- Perbaikan: tutup forEach di sini!
}

// ===== KIRIM PESAN =====
async function sendMessage() {
  console.log("Kirim diklik"); // DEBUG LOG
  const message = userInput.value.trim();
  if (!message) return;
  userInput.value = "";
  renderChat(message, true, new Date());

  // Simpan pesan user
  await fetch('/api/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      message,
      sender: 'user',
      threadId: currentThreadId
    })
  });

  // Kirim ke Dialogflow (PERBAIKI DI SINI)
  let botReply = 'Terjadi kesalahan saat menghubungi server.';
  try {
    const token = localStorage.getItem('token');
    // DEBUG LOG
    if (!token) console.warn("Token kosong di localStorage!");
    if (!username) console.warn("Username kosong di localStorage!");
    const payload = {
      message,
      sessionId: username,
      nim: username,
      originalDetectIntentRequest: {
        payload: {
          token: token,
          nim: username
        }
      }
    };
    console.log("Payload POST ke /api/dialogflow:", payload); // DEBUG: pastikan token dan nim benar!

    const res = await fetch('/api/dialogflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    botReply = data.reply || botReply;
  } catch (e) {
    console.error("Error kirim ke /api/dialogflow:", e);
  }

  renderChat(botReply, false, new Date());

  // Simpan pesan bot
  await fetch('/api/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username,
      message: botReply,
      sender: 'bot',
      threadId: currentThreadId
    })
  });

  // Refresh thread list dan scroll ke bawah
  loadThreads();
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ===== EVENT LISTENER =====
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') sendMessage();
});

newChatBtn.addEventListener('click', function () {
  // Buat thread baru
  currentThreadId = generateThreadId();
  localStorage.setItem('currentThreadId', currentThreadId);
  chatBox.innerHTML = "";
  userInput.value = "";
  userInput.focus();
  // Tambahkan thread baru ke sidebar
  loadThreads();
});

// Saat halaman dimuat, tampilkan history & sidebar
window.addEventListener('DOMContentLoaded', function() {
  loadChatHistory();
  loadThreads();
});