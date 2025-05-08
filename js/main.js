document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing...');

  // Theme Toggle
  const toggleTheme = () => {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    console.log('Theme toggled to:', localStorage.getItem('theme'));
  };

  // Initialize Theme
  if (localStorage.getItem('theme') === 'light') {
    document.body.classList.remove('dark-mode');
    document.body.classList.add('light-mode');
  } else {
    document.body.classList.add('dark-mode');
  }

  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.addEventListener('click', toggleTheme);

  // Smart Tips
  const showTip = () => {
    const tipText = document.getElementById('tip-text');
    tipText.textContent = tips[Math.floor(Math.random() * tips.length)];
  };

  // Toast Notification
  const showToast = (message, type = 'success') => {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // Play Scan Complete Sound
  const playScanCompleteSound = () => {
    const audio = new Audio('assets/complete.mp3');
    audio.play().catch(err => console.warn('Audio playback failed:', err));
  };

  // Link Input Handling
  const urlInput = document.getElementById('url-input');
  const fileInput = document.getElementById('file-input');
  const fileUpload = document.getElementById('file-upload');
  const fileNameContainer = document.getElementById('file-name');
  const clearFileButton = document.getElementById('clear-file');
  const linkCount = document.getElementById('link-count');
  const tipsPanel = document.querySelector('.tips-panel');
  const resultsSection = document.querySelector('.results-section');
  const loadingOverlay = document.querySelector('.loading-overlay');

  const isValidUrl = (string) => {
    try {
      let url = string.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      new URL(url);
      return url;
    } catch (_) {
      return false;
    }
  };

  const updateLinkCount = () => {
    const urls = urlInput.value.split('\n').map(url => url.trim()).filter(url => isValidUrl(url));
    linkCount.textContent = urls.length;
    console.log('Updated link count:', urls.length);
  };

  urlInput.addEventListener('input', updateLinkCount);

  // Drag and Drop
  fileUpload.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUpload.classList.add('dragover');
  });

  fileUpload.addEventListener('dragleave', () => {
    fileUpload.classList.remove('dragover');
  });

  fileUpload.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUpload.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/plain' || file.type === 'text/csv')) {
      fileInput.files = e.dataTransfer.files;
      fileNameContainer.style.display = 'flex';
      fileNameContainer.querySelector('span').textContent = file.name;
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const urls = content.split('\n').map(url => url.trim()).filter(url => isValidUrl(url));
        urlInput.value = urls.join('\n');
        updateLinkCount();
        showToast('File uploaded successfully');
      };
      reader.readAsText(file);
    } else {
      showToast('Please upload a .txt or .csv file', 'error');
    }
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileNameContainer.style.display = 'flex';
    fileNameContainer.querySelector('span').textContent = file.name;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const urls = content.split('\n').map(url => url.trim()).filter(url => isValidUrl(url));
      urlInput.value = urls.join('\n');
      updateLinkCount();
      showToast('File uploaded successfully');
    };
    reader.readAsText(file);
  });

  clearFileButton.addEventListener('click', () => {
    fileInput.value = '';
    fileNameContainer.style.display = 'none';
    fileNameContainer.querySelector('span').textContent = '';
    urlInput.value = '';
    updateLinkCount();
    showToast('File cleared');
  });

  // Start Scan
  const startScan = async () => {
    const rawUrls = urlInput.value.split('\n').map(url => url.trim()).filter(url => url);
    const urls = rawUrls.map(url => isValidUrl(url)).filter(url => url);

    if (!urls.length) {
      showToast('Please enter at least one valid URL', 'error');
      return;
    }

    if (urls.length < rawUrls.length) {
      showToast('Some URLs were invalid and skipped', 'error');
    }

    loadingOverlay.classList.remove('hidden');
    tipsPanel.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    showTip();

    try {
      const results = await scanLinks(urls);
      displayResults(results);
      updateHealthScore(results);
      updateSummary(results);
      loadingOverlay.classList.add('hidden');
      tipsPanel.classList.add('hidden');
      resultsSection.classList.remove('hidden');
      playScanCompleteSound();
      showToast('Scan completed successfully');
      window.scrollTo({ top: resultsSection.offsetTop, behavior: 'smooth' });
    } catch (error) {
      console.error('Scan failed:', error);
      showToast('Scan failed. Please try again.', 'error');
      loadingOverlay.classList.add('hidden');
      tipsPanel.classList.add('hidden');
    }
  };

  document.getElementById('start-scan').addEventListener('click', startScan);
  document.getElementById('scan-again').addEventListener('click', () => {
    urlInput.value = '';
    updateLinkCount();
    resultsSection.classList.add('hidden');
    startScan();
  });

  // Display Results
  const displayResults = (results) => {
    const container = document.getElementById('results-container');
    container.innerHTML = '';

    results.forEach((result, index) => {
      const card = document.createElement('div');
      card.className = `result-card ${result.status}`;
      card.id = `result-${index}`;

      let statusClass = '';
      let statusText = '';
      let statusIcon = '';
      let tooltip = '';

      switch (result.status) {
        case 'ok':
          statusClass = 'status-ok';
          statusText = 'OK';
          statusIcon = '✅';
          tooltip = 'Link is accessible';
          break;
        case 'redirect':
          statusClass = 'status-redirect';
          statusText = 'Redirect';
          statusIcon = '🔁';
          tooltip = 'Link redirects to another URL';
          break;
        case 'broken':
          statusClass = 'status-broken';
          statusText = 'Broken';
          statusIcon = '❌';
          tooltip = 'Link is inaccessible';
          break;
        case 'timeout':
          statusClass = 'status-timeout';
          statusText = 'Timeout';
          statusIcon = '🕒';
          tooltip = 'Request timed out';
          break;
        case 'unreachable':
          statusClass = 'status-unreachable';
          statusText = 'Unreachable';
          statusIcon = '🕒';
          tooltip = 'Link could not be reached';
          break;
        case 'risky':
          statusClass = 'status-risky';
          statusText = 'Risky';
          statusIcon = '⚠️';
          tooltip = 'Blacklisted domain';
          break;
      }

      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(result.url)}`;
      const details = [];
      if (result.redirectChain.length > 1) {
        details.push(`Redirect Chain: ${result.redirectChain.join(' ➜ ')}`);
      }
      if (result.error) {
        details.push(result.error);
      }

      card.innerHTML = `
        <img src="${faviconUrl}" class="favicon" alt="Favicon">
        <div class="url-container">
          <a href="${result.url}" class="url" target="_blank">${result.url}</a>
          <button class="copy-btn" title="Copy URL">📋</button>
        </div>
        <span class="status-tag ${statusClass}" data-tooltip="${tooltip}">
          <span class="status-icon">${statusIcon}</span> ${statusText}
        </span>
        <div class="details">${details.join('<br>')}</div>
        <div class="timestamp">Scanned: ${new Date(result.timestamp).toLocaleString()}</div>
      `;

      card.querySelector('.copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(result.url).then(() => {
          showToast('URL copied to clipboard');
        });
      });

      container.appendChild(card);
    });

    // Filter and Sort
    const filterStatus = document.getElementById('filter-status');
    const sortBy = document.getElementById('sort-by');

    const applyFiltersAndSort = () => {
      const filterValue = filterStatus.value;
      const sortValue = sortBy.value;
      const cards = Array.from(document.querySelectorAll('.result-card'));

      // Filter
      cards.forEach(card => {
        const status = card.classList[1];
        card.style.display = filterValue === 'all' || status === filterValue ? 'block' : 'none';
      });

      // Sort
      const sortedCards = cards.sort((a, b) => {
        const resultA = results.find(r => r.url === a.querySelector('.url').textContent);
        const resultB = results.find(r => r.url === b.querySelector('.url').textContent);
        if (sortValue === 'status') {
          const order = { risky: 0, broken: 1, redirect: 2, ok: 3, timeout: 4, unreachable: 5 };
          return order[resultA.status] - order[resultB.status];
        } else if (sortValue === 'url') {
          return resultA.url.localeCompare(resultB.url);
        } else {
          return new Date(resultA.timestamp) - new Date(resultB.timestamp);
        }
      });

      container.innerHTML = '';
      sortedCards.forEach(card => container.appendChild(card));
    };

    filterStatus.addEventListener('change', applyFiltersAndSort);
    sortBy.addEventListener('change', applyFiltersAndSort);
  };

  // Update Summary
  const updateSummary = (results) => {
    const total = results.length;
    const ok = results.filter(r => r.status === 'ok').length;
    const redirects = results.filter(r => r.status === 'redirect').length;
    const broken = results.filter(r => r.status === 'broken').length;
    const risky = results.filter(r => r.status === 'risky').length;

    document.getElementById('summary-total').textContent = total;
    document.getElementById('summary-ok').textContent = ok;
    document.getElementById('summary-redirects').textContent = redirects;
    document.getElementById('summary-broken').textContent = broken;
    document.getElementById('summary-risky').textContent = risky;
  };

  // Health Score
  const updateHealthScore = (results) => {
    const validLinks = results.filter(r => r.status === 'ok').length;
    const score = Math.round((validLinks / results.length) * 100);
    document.getElementById('health-score').textContent = `${score}%`;
    document.getElementById('progress-circle').style.setProperty('--progress', `${score}%`);
  };

  // Copy Summary
  document.getElementById('copy-summary').addEventListener('click', () => {
    const summary = `
LinkCheckr Pro Scan Summary
Generated: ${new Date().toLocaleString()}
Link Health: ${document.getElementById('health-score').textContent}
Total: ${document.getElementById('summary-total').textContent}
OK: ${document.getElementById('summary-ok').textContent}
Redirects: ${document.getElementById('summary-redirects').textContent}
Broken: ${document.getElementById('summary-broken').textContent}
Risky: ${document.getElementById('summary-risky').textContent}
    `;
    navigator.clipboard.writeText(summary).then(() => {
      showToast('Summary copied to clipboard');
    });
  });
});
