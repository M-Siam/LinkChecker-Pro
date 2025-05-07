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
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  } else {
    console.error('Theme toggle button not found');
  }

  // Smart Tips
  const tips = [
    'Too many redirects hurt SEO.',
    'Broken links reduce user trust.',
    'Check links monthly to stay clean.'
  ];

  const showRandomTip = () => {
    const tipText = document.getElementById('tip-text');
    if (tipText) {
      tipText.textContent = tips[Math.floor(Math.random() * tips.length)];
    }
  };
  showRandomTip();
  setInterval(showRandomTip, 5000);

  // Link Input Handling
  const urlInput = document.getElementById('url-input');
  const fileInput = document.getElementById('file-input');
  const linkCount = document.getElementById('link-count');

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

  if (urlInput) {
    urlInput.addEventListener('input', updateLinkCount);
  } else {
    console.error('URL input not found');
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const urls = content.split('\n').map(url => url.trim()).filter(url => isValidUrl(url));
        urlInput.value = urls.join('\n');
        updateLinkCount();
        console.log('File uploaded, URLs loaded:', urls);
      };
      reader.readAsText(file);
    });
  } else {
    console.error('File input not found');
  }

  // Start Scan
  const startScanButton = document.getElementById('start-scan');
  if (startScanButton) {
    startScanButton.addEventListener('click', async () => {
      console.log('Start Scan button clicked');
      
      const rawUrls = urlInput.value.split('\n').map(url => url.trim()).filter(url => url);
      const urls = rawUrls.map(url => isValidUrl(url)).filter(url => url);

      if (!urls.length) {
        alert('Please enter at least one valid URL (e.g., https://example.com).');
        console.warn('No valid URLs provided');
        return;
      }

      if (urls.length < rawUrls.length) {
        alert('Some URLs were invalid and skipped. Ensure URLs include http:// or https://.');
        console.warn('Invalid URLs skipped:', rawUrls.filter(url => !isValidUrl(url)));
      }

      const loadingOverlay = document.querySelector('.loading-overlay');
      const resultsSection = document.querySelector('.results-section');

      if (loadingOverlay && resultsSection) {
        console.log('Showing loading overlay');
        loadingOverlay.classList.remove('hidden');
        resultsSection.classList.add('hidden');
      } else {
        console.error('Loading overlay or results section not found');
      }

      try {
        console.log('Initiating scan for URLs:', urls);
        const results = await scanLinks(urls);
        console.log('Displaying results:', results);
        displayResults(results);
        updateHealthScore(results);
        updateSummary(results);

        console.log('Hiding loading overlay, showing results');
        loadingOverlay.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        window.scrollTo({ top: resultsSection.offsetTop, behavior: 'smooth' });
      } catch (error) {
        console.error('Scan failed:', error);
        alert('An error occurred during scanning. Please check the console for details.');
        if (loadingOverlay) {
          loadingOverlay.classList.add('hidden');
        }
      }
    });
  } else {
    console.error('Start Scan button not found');
  }

  // Display Results
  const displayResults = (results) => {
    console.log('Rendering results:', results);
    const container = document.getElementById('results-container');
    if (!container) {
      console.error('Results container not found');
      return;
    }
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
          tooltip = 'Link is accessible and working';
          break;
        case 'redirect':
          statusClass = 'status-redirect';
          statusText = 'Redirected';
          statusIcon = '🔄';
          tooltip = 'Link redirects to another URL';
          break;
        case 'broken':
          statusClass = 'status-broken';
          statusText = 'Broken';
          statusIcon = '❌';
          tooltip = 'Link is inaccessible (error)';
          break;
        case 'timeout':
          statusClass = 'status-timeout';
          statusText = 'Timeout';
          statusIcon = '🕒';
          tooltip = 'Request timed out after 8 seconds';
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
          tooltip = 'Link is on a blacklisted domain';
          break;
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
        <a href="${result.url}" class="url" target="_blank">${result.url}</a>
        <span class="status-tag ${statusClass}" data-tooltip="${tooltip}">
          <span class="status-icon">${statusIcon}</span> ${statusText}
        </span>
        <div class="details">${details.join('<br>')}</div>
        <div class="timestamp">Scanned: ${new Date(result.timestamp).toLocaleString()}</div>
      `;

      container.appendChild(card);
    });

    // Toggle Risky/Broken
    const toggleRiskyBroken = document.getElementById('toggle-risky-broken');
    if (toggleRiskyBroken) {
      toggleRiskyBroken.addEventListener('change', () => {
        const cards = document.querySelectorAll('.result-card');
        cards.forEach(card => {
          const isRiskyOrBroken = card.classList.contains('risky') || card.classList.contains('broken');
          card.style.display = toggleRiskyBroken.checked && !isRiskyOrBroken ? 'none' : 'block';
        });
      });
    }
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
    const healthScore = document.getElementById('health-score');
    const progressCircle = document.getElementById('progress-circle');
    if (healthScore && progressCircle) {
      healthScore.textContent = `${score}%`;
      progressCircle.style.setProperty('--progress', `${score}%`);
      console.log('Health score updated:', score);
    } else {
      console.error('Health score or progress circle not found');
    }
  };
});
