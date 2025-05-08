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
    tipText.style.opacity = '0';
    setTimeout(() => {
      tipText.textContent = tips[Math.floor(Math.random() * tips.length)];
      tipText.style.opacity = '1';
    }, 300);
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
        resultsSection.style.animation = 'pulseScore 0.5s ease';
        setTimeout(() => resultsSection.style.animation = '', 500);
      });
    } catch (err) {
      console.warn('Audio file missing:', err);
      const resultsSection = document.querySelector('.results-section');
      resultsSection.style.animation = 'pulseScore 0.5s ease';
      setTimeout(() => resultsSection.style.animation = '', 500);
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
  toggleTipsButton.addEventListener('click', () => {
    tipsPanel.classList.add('hidden');
    resultsContent.classList.remove('hidden');
  });

  // Start Scan
  let scanInProgress = false;
  const startScan = async () => {
    if (scanInProgress) return;
    scanInProgress = true;

    const rawUrls = urlInput.value.split('\n').map(url => url.trim()).filter(url => url);
    const urls = rawUrls.map(url => isValidUrl(url)).filter(url => url);

    if (!urls.length) {
      showToast('Please enter at least one valid URL', 'error');
      scanInProgress = false;
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
    showTip();

    const tipInterval = setInterval(showTip, 4000);

    try {
      const results = await scanLinks(urls, useProxy);
      clearInterval(tipInterval);
      displayResults(results);
      updateHealthScore(results);
      updateSummary(results);
      loadingOverlay.classList.add('hidden');
      resultsContent.classList.remove('hidden');
      playScanCompleteEffect();
      showToast('Scan completed successfully');
      window.scrollTo({ top: resultsSection.offsetTop, behavior: 'smooth' });
    } catch (error) {
      clearInterval(tipInterval);
      console.error('Scan failed:', error);
      showToast('Scan failed. Please try again.', 'error');
      loadingOverlay.classList.add('hidden');
      tipsPanel.classList.add('hidden');
    } finally {
      scanInProgress = false;
    }
  };

  document.getElementById('start-scan').addEventListener('click', startScan);
  document.getElementById('scan-again').addEventListener('click', () => {
    urlInput.value = '';
    updateLinkCount();
    resultsContent.classList.add('hidden');
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
      card.style.setProperty('--index', index);

      let statusClass = '';
      let statusText = '';
      let statusIcon = '';
      let tooltip = '';

      switch (result.status) {
        case 'ok':
          statusClass = 'status-ok';
          statusText = 'OK';
          statusIcon = '✅';
          tooltip = 'Link is fully accessible and secure';
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
          tooltip = 'Link is inaccessible (HTTP 400–599)';
          break;
        case 'timeout':
          statusClass = 'status-timeout';
          statusText = 'Timeout';
          statusIcon = '⚠️';
          tooltip = 'Request timed out after 10 seconds';
          break;
        case 'unreachable':
          statusClass = 'status-unreachable';
          statusText = 'Unreachable';
          statusIcon = '⚠️';
          tooltip = 'Unable to reach server (CORS, DNS, or protocol issue)';
          break;
        case 'invalid':
          statusClass = 'status-invalid';
          statusText = 'Invalid';
          statusIcon = '🛑';
          tooltip = 'Invalid URL format';
          break;
        case 'risky':
          statusClass = 'status-risky';
          statusText = 'Risky';
          statusIcon = '⚠️';
          tooltip = 'Domain is blacklisted';
          break;
        default:
          statusClass = 'status-unknown';
          statusText = 'Unknown';
          statusIcon = '⚠️';
          tooltip = 'Unknown error occurred';
      }

      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(result.url)}&sz=32`;
      const details = [];
      if (result.redirectChain.length > 1) {
        details.push(`Redirect Chain: ${result.redirectChain.join(' → ')}`);
      }
      if (result.error) {
        details.push(result.error);
      }

      card.innerHTML = `
        <div class="card-header">
          <img src="${faviconUrl}" class="favicon" alt="Favicon" onerror="this.src='assets/favicon.ico'">
          <div class="url-container">
            <a href="${result.url}" class="url url-tooltip" target="_blank" data-full-url="${result.url}" aria-label="Visit ${result.url}">${result.url}</a>
            <button class="copy-btn" title="Copy URL" aria-label="Copy URL">📋</button>
          </div>
        </div>
        <div class="status-badge ${statusClass}" data-tooltip="${tooltip}" role="status">
          <span class="status-icon">${statusIcon}</span>
          <span class="status-text">${statusText}</span>
        </div>
        <div class="details-container">
          <div class="details">${details.join('<br>')}</div>
        </div>
        <button class="toggle-details" aria-label="Toggle Details">${details.length ? 'Show Details ▼' : 'No Details'}</button>
        <div class="timestamp">Scanned: ${new Date(result.timestamp).toLocaleString()}</div>
      `;

      card.querySelector('.copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(result.url).then(() => {
          showToast('URL copied to clipboard');
        });
      });

      if (details.length) {
        const toggleDetails = card.querySelector('.toggle-details');
        toggleDetails.addEventListener('click', () => {
          const detailsContainer = card.querySelector('.details-container');
          detailsContainer.classList.toggle('expanded');
          toggleDetails.textContent = detailsContainer.classList.contains('expanded') ? 'Hide Details ▲' : 'Show Details ▼';
        });
      } else {
        card.querySelector('.toggle-details').disabled = true;
      }

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
  };

  // Health Score and Dynamic Progress Circle
  const updateHealthScore = (results) => {
    const total = results.length;
    const ok = results.filter(r => r.status === 'ok').length;
    const redirects = results.filter(r => r.status === 'redirect').length;
    const broken = results.filter(r => r.status === 'broken').length;
    const risky = results.filter(r => r.status === 'risky').length;
    const others = total - ok - redirects - broken - risky;

    const score = Math.round((ok / total) * 100);
    document.getElementById('health-score').textContent = `${score}%`;

    const okPercent = (ok / total) * 100;
    const redirectPercent = (redirects / total) * 100;
    const brokenPercent = (broken / total) * 100;
    const riskyPercent = (risky / total) * 100;
    const otherPercent = (others / total) * 100;

    const isDarkMode = document.body.classList.contains('dark-mode');
    const okColor = isDarkMode ? '#00FFE0' : '#4CAF50';
    const redirectColor = '#FFB300';
    const brokenColor = '#E53935';
    const riskyColor = '#FF5722';
    const otherColor = '#6B7280';

    let gradient = '';
    let currentAngle = 0;

    if (okPercent > 0) {
      gradient += `${okColor} ${currentAngle}% ${currentAngle + okPercent}%`;
      currentAngle += okPercent;
      if (currentAngle < 100) gradient += ', ';
    }
    if (redirectPercent > 0) {
      gradient += `${redirectColor} ${currentAngle}% ${currentAngle + redirectPercent}%`;
      currentAngle += redirectPercent;
      if (currentAngle < 100) gradient += ', ';
    }
    if (brokenPercent > 0) {
      gradient += `${brokenColor} ${currentAngle}% ${currentAngle + brokenPercent}%`;
      currentAngle += brokenPercent;
      if (currentAngle < 100) gradient += ', ';
    }
    if (riskyPercent > 0) {
      gradient += `${riskyColor} ${currentAngle}% ${currentAngle + riskyPercent}%`;
      currentAngle += riskyPercent;
      if (currentAngle < 100) gradient += ', ';
    }
    if (otherPercent > 0) {
      gradient += `${otherColor} ${currentAngle}% ${currentAngle + otherPercent}%`;
    }

    const progressCircle = document.getElementById('progress-circle');
    progressCircle.style.background = `conic-gradient(${gradient})`;
    progressCircle.style.setProperty('--progress-color', okPercent >= 50 ? okColor : brokenPercent + riskyPercent >= 50 ? brokenColor : redirectColor);
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
});
