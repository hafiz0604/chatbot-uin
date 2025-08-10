document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const chatBox = document.getElementById('chatBox');
  const userInput = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const newChatBtn = document.getElementById('newChatBtn');
  const historyList = document.getElementById('historyList');
  const chatHistory = document.getElementById('chat-history');

  // User configuration
  let username;

  function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  function getCurrentUsername() {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        return userData.username;
      } catch (e) {
        console.error("Error parsing user data from localStorage", e);
      }
    }
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.username) {
            return payload.username;
          }
        }
      } catch (e) {
        console.error("Error parsing JWT token", e);
      }
    }
    window.location.href = '/login.html';
    return null;
  }

  let currentThreadId = generateThreadId();
  let chatThreads = [];
  let isLoadingThread = false;

  function generateThreadId() {
    return 'thread_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async function init() {
    username = getCurrentUsername();
    if (!username) return;

    const usernameDisplay = document.getElementById('usernameDisplay');
    if (usernameDisplay) usernameDisplay.textContent = username;

    await loadChatThreads();

    // Jika ada thread, load thread terbaru agar tidak buat chat baru saat refresh
    if (chatThreads.length > 0) {
      const lastThread = chatThreads[0];
      if (lastThread && lastThread._id) {
        await loadThread(lastThread._id);
      }
    } else {
      await showWelcomeMessage();
    }

    setupMobileHandlers();
  }

  async function showWelcomeMessage() {
    if (chatBox && chatBox.children.length === 0) {
      const welcomeMsg = 'Selamat datang di UIN SuKa Chatbot! Bagaimana saya bisa membantu Anda hari ini?';
      addMessage(welcomeMsg, 'bot');
      try {
        await fetch('/api/chats', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            username: username,
            message: welcomeMsg,
            sender: 'bot',
            threadId: currentThreadId
          })
        });
      } catch (error) {}
    }
  }

  function addMessage(content, sender, timestamp = null) {
    if (!chatBox) return;
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${sender}`;
    const message = document.createElement('div');
    message.className = `message ${sender}`;
    message.textContent = content;
    const timestampEl = document.createElement('div');
    timestampEl.className = 'timestamp';
    const time = timestamp ? new Date(timestamp) : new Date();
    timestampEl.textContent = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    messageContainer.appendChild(message);
    messageContainer.appendChild(timestampEl);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
    setTimeout(() => {
      messageContainer.style.opacity = '1';
      messageContainer.style.transform = 'translateY(0)';
    }, 10);
  }

  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || !userInput || !sendBtn || isLoadingThread) return;
    userInput.disabled = true;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Mengirim...';
    addMessage(message, 'user');
    userInput.value = '';
    const typingIndicator = addTypingIndicator();
    try {
      const response = await fetch('/api/chats/bot', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          username: username,
          message: message,
          sender: 'user',
          threadId: currentThreadId
        })
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login.html';
          return;
        }
        await response.text();
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      removeTypingIndicator(typingIndicator);
      if (data.response) addMessage(data.response, 'bot');
      await loadChatThreads();
    } catch (error) {
      removeTypingIndicator(typingIndicator);
      addMessage('Maaf, terjadi kesalahan koneksi. Silakan coba lagi.', 'bot');
    } finally {
      if (userInput && sendBtn) {
        userInput.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Kirim';
        userInput.focus();
      }
    }
  }

  function addTypingIndicator() {
    if (!chatBox) return null;
    const messageContainer = document.createElement('div');
    messageContainer.className = 'message-container bot typing-indicator';
    const message = document.createElement('div');
    message.className = 'message bot';
    message.innerHTML = '<span class="spinner"></span>Sedang mengetik...';
    messageContainer.appendChild(message);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
    return messageContainer;
  }
  function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  async function loadChatThreads() {
    try {
      const url = `/api/chats/threads/${username}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login.html';
          return;
        }
        return;
      }
      const threads = await response.json();
      chatThreads = threads;
      renderChatThreads(threads);
    } catch (error) {}
  }

  // Helper jumlah pesan (fallback beberapa kemungkinan properti)
  function getThreadCount(thread) {
    const candidates = [
      thread.messageCount,
      thread.count,
      thread.totalMessages,
      thread.total,
      thread.messagesCount,
      Array.isArray(thread.messages) ? thread.messages.length : undefined,
      Array.isArray(thread.items) ? thread.items.length : undefined
    ];
    for (const c of candidates) {
      if (typeof c === 'number' && c >= 0) return c;
      if (typeof c === 'string' && c.trim() !== '' && !isNaN(Number(c))) return Number(c);
    }
    return 0;
  }

  function safeTruncate(text, n) {
    if (!text || typeof text !== 'string') return '';
    return text.length > n ? text.substring(0, n) + '...' : text;
  }

  function renderChatThreads(threads) {
    if (!historyList) return;
    historyList.innerHTML = '';
    if (!threads || threads.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.innerHTML = '<span style="color: #999; font-style: italic;">Belum ada riwayat chat</span>';
      emptyLi.style.cursor = 'default';
      historyList.appendChild(emptyLi);
      return;
    }
    threads.forEach((thread) => {
      const li = document.createElement('li');

      const truncatedMessage = safeTruncate(thread.lastMessage || 'Percakapan', 40);
      const count = getThreadCount(thread);

      li.innerHTML = `
        <div class="thread-content" data-thread-id="${thread._id}">
          <div class="thread-message">${truncatedMessage}</div>
          <div class="thread-info">
            <span class="thread-time">${formatDate(thread.lastAt)}</span>
          </div>
        </div>
        <button class="delete-thread-btn" data-thread-id="${thread._id}" title="Hapus chat" aria-label="Hapus chat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      `;
      historyList.appendChild(li);
    });
    addThreadEventListeners();
  }

  function addThreadEventListeners() {
    const threadContents = historyList.querySelectorAll('.thread-content');
    threadContents.forEach((threadContent) => {
      threadContent.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const threadId = this.getAttribute('data-thread-id');
        if (threadId) loadThread(threadId);
      });
    });
    const deleteButtons = historyList.querySelectorAll('.delete-thread-btn');
    deleteButtons.forEach((deleteBtn) => {
      deleteBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const threadId = this.getAttribute('data-thread-id');
        if (threadId) deleteThread(threadId);
      });
    });
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Kemarin';
    } else if (diffDays < 7) {
      return `${diffDays} hari lalu`;
    } else {
      return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
    }
  }

  async function loadThread(threadId) {
    if (isLoadingThread) return;
    try {
      isLoadingThread = true;
      const url = `/api/chats/user/${username}?threadId=${threadId}`;
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login.html';
          return;
        }
        return;
      }
      const messages = await response.json();
      if (chatBox) chatBox.innerHTML = '';
      currentThreadId = threadId;
      messages.forEach(msg => addMessage(msg.message, msg.sender, msg.createdAt));
      // Tutup sidebar di mobile setelah memilih thread
      if (window.innerWidth <= 900 && chatHistory) {
        chatHistory.classList.remove('active');
        const overlay = document.querySelector('.history-overlay');
        if (overlay) overlay.classList.remove('active');
      }
    } catch (error) {
      addMessage('Gagal memuat riwayat chat.', 'bot');
    } finally {
      isLoadingThread = false;
    }
  }

  async function deleteThread(threadId) {
    if (!confirm('Apakah Anda yakin ingin menghapus chat ini?')) return;
    try {
      const url = `/api/chats/${username}/thread/${threadId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (response.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      if (response.ok) {
        await response.json();
        await loadChatThreads();
        if (currentThreadId === threadId) {
          await startNewChat();
        }
      }
    } catch (error) {}
  }

  async function startNewChat() {
    if (chatBox) chatBox.innerHTML = '';
    currentThreadId = generateThreadId();
    await showWelcomeMessage();
    // Hide sidebar on mobile
    if (window.innerWidth <= 900 && chatHistory) {
      chatHistory.classList.remove('active');
      const overlay = document.querySelector('.history-overlay');
      if (overlay) overlay.classList.remove('active');
    }
    await loadChatThreads();
  }

  function setupMobileHandlers() {
    // Biarkan ui-mobile.js yang mengatur sidebar
  }

  // Event listeners
  if (sendBtn) sendBtn.addEventListener('click', sendMessage);
  if (userInput) {
    userInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  if (newChatBtn) newChatBtn.addEventListener('click', startNewChat);

  init();
});