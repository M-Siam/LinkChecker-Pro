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

  // Play Scan Complete Animation
  const playScanCompleteEffect = () => {
    try {
      const audio = new Audio('assets/complete.mp3');
      audio.play().catch(err => {
        console.warn('Audio playback failed:', err);
        const resultsSection = document.querySelector('.results-section');
        resultsSection.style.animation = 'pulseScore 0.6s ease';
        setTimeout(() => resultsSection.style.animation = '', 600);
      });
    } catch (err) {
      console.warn('Audio file missing:', err);
      const resultsSection = document.querySelector('.results-section');
      resultsSection.style.animation = 'pulseScore 0.6s ease';
      setTimeout(() => resultsSection.style.animation = '', 600);
    }
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
  const resultsContent = document.querySelector('.results-content');
  const loadingOverlay = document.querySelector('.loading-overlay');
  const scanProgress = document.getElementById('scan-progress');
  const progressBar = document.getElementById('progress-bar');
  const scanStatus = document.getElementById('scan-status');

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

  // Tips Toggle
  const toggleTipsButton = document.getElementById('toggle-tips');
  const showTipsButton = document.getElementById('show-tips');

  showTipsButton.addEventListener('click', () => {
    tipsPanel.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    showTip();
  });

  toggleTipsButton.addEventListener('click', () => {
    tipsPanel.classList.add('hidden');
    resultsContent.classList.remove('hidden');
  });

  // Auto-Save Results
  const saveResults = (results) => {
    localStorage.setItem('linkcheckr_results', JSON.stringify(results));
    console.log('Results saved to localStorage');
  };

  const loadResults = () => {
    const saved = localStorage.getItem('linkcheckr_results');
    if (saved) {
      const results = JSON.parse(saved);
      displayResults(results);
      updateHealthScore(results);
      updateSummary(results);
      resultsContent.classList.remove('hidden');
      showToast('Loaded previous scan results');
    }
  };

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

    const useProxy = document.getElementById('use-proxy').checked;
    console.log('Scanning with CORS proxy:', useProxy);

    loadingOverlay.classList.remove('hidden');
    tipsPanel.classList.remove('hidden');
    resultsContent.classList.add('hidden');
    scanProgress.classList.remove('hidden');
    showTip();

    const tipInterval = setInterval(showTip, 4000);
    const results = [];
    let completed = 0;
    const total = urls.length;

    const updateProgress = () => {
      completed++;
      const progress = (completed / total) * 100;
      progressBar.style.setProperty('--progress', `${progress}%`);
      const statusCounts = {
        ok: results.filter(r => r.status === 'ok').length,
        redirect: results.filter(r => r.status === 'redirect').length,
        broken: results.filter(r => r.status === 'broken').length,
        risky: results.filter(r => r.status === 'risky').length
      };
      scanStatus.textContent = `${completed}/${total} URLs, OK: ${statusCounts.ok}, Redirects: ${statusCounts.redirect}, Broken: ${statusCounts.broken}, Risky: ${statusCounts.risky}`;
    };

    for (const url of urls) {
      try {
        const result = await scanLinks([url], useProxy);
        results.push(...result);
        updateProgress();
      } catch (error) {
        console.warn(`Error scanning ${url}:`, error);
        results.push({
          url,
          status: 'unknown',
          redirectChain: [url],
          error: 'Scan failed',
          timestamp: new Date().toISOString(),
          isRisky: false
        });
        updateProgress();
      }
    }

    clearInterval(tipInterval);
    displayResults(results);
    updateHealthScore(results);
    updateSummary(results);
    saveResults(results);
    loadingOverlay.classList.add('hidden');
    tipsPanel.classList.add('hidden');
    scanProgress.classList.add('hidden');
    resultsContent.classList.remove('hidden');
    playScanCompleteEffect();
    showToast('Scan completed successfully');
    window.scrollTo({ top: resultsSection.offsetTop, behavior: 'smooth' });
  };

  document.getElementById('start-scan').addEventListener('click', startScan);
  document.getElementById('scan-again').addEventListener('click', () => {
    urlInput.value = '';
    updateLinkCount();
    resultsContent.classList.add('hidden');
    startScan();
  });

  // Batch Actions
  document.getElementById('batch-actions').addEventListener('click', () => {
    const results = JSON.parse(localStorage.getItem('linkcheckr_results') || '[]');
    const failedUrls = results
      .filter(r => ['broken', 'timeout', 'unreachable'].includes(r.status))
      .map(r => r.url);

    if (!results.length) {
      showToast('No results to process', 'error');
      return;
    }

    const action = prompt(
      'Batch Actions:\n1. Copy all OK URLs\n2. Copy all broken URLs\n3. Retry failed URLs\nEnter number (1-3):'
    );

    if (action === '1') {
      const okUrls = results.filter(r => r.status === 'ok').map(r => r.url);
      navigator.clipboard.writeText(okUrls.join('\n')).then(() => {
        showToast('OK URLs copied to clipboard');
      });
    } else if (action === '2') {
      const brokenUrls = results.filter(r => r.status === 'broken').map(r => r.url);
      navigator.clipboard.writeText(brokenUrls.join('\n')).then(() => {
        showToast('Broken URLs copied to clipboard');
      });
    } else if (action === '3' && failedUrls.length) {
      urlInput.value = failedUrls.join('\n');
      updateLinkCount();
      startScan();
    } else {
      showToast('Invalid action or no failed URLs', 'error');
    }
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
      let insights = '';

      switch (result.status) {
        case 'ok':
          statusClass = 'status-ok';
          statusText = 'OK';
          statusIcon = '✅';
          tooltip = 'Link is accessible and functioning correctly.';
          insights = 'No action needed. Link is healthy.';
          break;
        case 'redirect':
          statusClass = 'status-redirect';
          statusText = 'Redirect';
          statusIcon = '🔁';
          tooltip = 'Link redirects to another URL. Check if the destination is intended.';
          insights = 'Verify the redirect destination for relevance and SEO impact.';
          break;
        case 'broken':
          statusClass = 'status-broken';
          statusText = 'Broken';
          statusIcon = '❌';
          tooltip = 'Link is inaccessible (e.g., HTTP 404). Check the URL or contact the site owner.';
          insights = 'Fix or remove broken links to improve user experience and SEO.';
          break;
        case 'timeout':
          statusClass = 'status-timeout';
          statusText = 'Timeout';
          statusIcon = '⚠️';
          tooltip = 'Request timed out. The server may be down or slow.';
          insights = 'Retry the scan or check server status.';
          break;
        case 'unreachable':
          statusClass = 'status-unreachable';
          statusText = 'Unreachable';
          statusIcon = '⚠️';
          tooltip = 'Link could not be reached (e.g., DNS or CORS issue). Try enabling CORS proxy or HTTPS.';
          insights = 'Check DNS settings or enable CORS proxy in settings.';
          break;
        case 'invalid':
          statusClass = 'status-invalid';
          statusText = 'Invalid';
          statusIcon = '🛑';
          tooltip = 'Invalid URL format. Ensure the URL is correctly formatted.';
          insights = 'Correct the URL format and rescan.';
          break;
        case 'risky':
          statusClass = 'status-risky';
          statusText = 'Risky';
          statusIcon = '⚠️';
          tooltip = 'Blacklisted domain. Avoid linking to potentially harmful sites.';
          insights = 'Remove or replace risky links. Verify with Google Safe Browsing.';
          break;
        default:
          statusClass = 'status-unknown';
          statusText = 'Unknown';
          statusIcon = '⚠️';
          tooltip = 'Unknown error occurred during scanning.';
          insights = 'Retry the scan or check for network issues.';
      }

      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(result.url)}`;
      const details = [];
      if (result.redirectChain.length > 1) {
        details.push(`Redirect Chain: ${result.redirectChain.join(' → ')}`);
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
        <div class="insights">${insights}</div>
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

      cards.forEach(card => {
        const status = card.classList[1];
        card.style.display = filterValue === 'all' || status === filterValue ? 'block' : 'none';
      });

      const sortedCards = cards.sort((a, b) => {
        const resultA = results.find(r => r.url === a.querySelector('.url').textContent);
        const resultB = results.find(r => r.url === b.querySelector('.url').textContent);
        if (sortValue === 'status') {
          const order = { risky: 0, broken: 1, redirect: 2, ok: 3, timeout: 4, unreachable: 5, invalid: 6, unknown: 7 };
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

    document.getElementById('popup-ok').textContent = ok;
    document.getElementById('popup-redirects').textContent = redirects;
    document.getElementById('popup-broken').textContent = broken;
    document.getElementById('popup-risky').textContent = risky;
  };

  // Health Score
  const updateHealthScore = (results) => {
    const total = results.length;
    const ok = results.filter(r => r.status === 'ok').length;
    const redirects = results.filter(r => r.status === 'redirect').length;
    const broken = results.filter(r => r.status === 'broken').length;
    const risky = results.filter(r => r.status === 'risky').length;

    const score = Math.round((ok / total) * 100);
    const okProgress = (ok / total) * 100;
    const redirectProgress = (redirects / total) * 100;
    const brokenProgress = (broken / total) * 100;
    const riskyProgress = (risky / total) * 100;

    document.getElementById('health-score').textContent = `${score}%`;
    const progressCircle = document.getElementById('progress-circle');
    progressCircle.style.setProperty('--ok-progress', okProgress);
    progressCircle.style.setProperty('--redirect-progress', redirectProgress);
    progressCircle.style.setProperty('--broken-progress', brokenProgress);
    progressCircle.style.setProperty('--risky-progress', riskyProgress);
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
Recommendations: Fix broken links to improve SEO and user experience. Verify risky links with Google Safe Browsing.
---
© 2025 SIAM. All rights reserved.
https://m-siam.github.io/LinkChecker-Pro/
    `;
    navigator.clipboard.writeText(summary).then(() => {
      showToast('Summary copied to clipboard');
    });
  });

  // Export PDF
  document.getElementById('export-pdf').addEventListener('click', () => {
    exportToPDF();
  });

  // Export CSV
  document.getElementById('export-csv').addEventListener('click', () => {
    exportToCSV();
  });

  // Load Saved Results
  loadResults();
});
