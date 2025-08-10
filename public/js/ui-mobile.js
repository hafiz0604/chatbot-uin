document.addEventListener('DOMContentLoaded', function() {
  const historyToggle = document.getElementById('showHistoryBtn');
  const historyPanel = document.getElementById('chat-history');
  const overlay = document.querySelector('.history-overlay');
  const closeBtn = document.querySelector('.close-history');
  function isMobile() { return window.innerWidth <= 900; }
  function showHistory() {
    if (historyPanel) historyPanel.classList.add('active');
    if (overlay) overlay.classList.add('active');
  }
  function hideHistory() {
    if (historyPanel) historyPanel.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }
  if (historyToggle && historyPanel && overlay) {
    historyToggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (isMobile()) showHistory();
    });
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        hideHistory();
      });
    }
    overlay.addEventListener('click', function() { hideHistory(); });
    window.addEventListener('resize', function() { if (!isMobile()) hideHistory(); });
  }
  // Saat load halaman, pastikan sidebar tertutup di mobile
  if (window.innerWidth <= 900) {
    if (historyPanel) historyPanel.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }
});