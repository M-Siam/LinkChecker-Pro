// Ensure DOM is fully loaded
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
        const results = await scanLinks(urls); // From scanner.js
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
    const container = document.querySelector('#results-container tbody');
    if (!container) {
      console.error('Results container not found');
      return;
    }
    container.innerHTML = '';

    results.forEach((result, index) => {
      const row = document.createElement('tr');
      row.id = `result-${index}`;
      row.className = result.status === 200 ? 'ok' : '';

      let statusClass = '';
      let statusText = '';
      let statusIcon = '';
      let tooltip = '';

      switch (result.status) {
        case 200:
          statusClass = 'status-200';
          statusText = 'OK';
          statusIcon = '✔️';
          tooltip = 'Link is accessible and working';
          break;
        case 301:
        case 302:
          statusClass = 'status-redirect';
          statusText = 'Redirected';
          statusIcon = '🔄';
          tooltip = 'Link redirects to another URL';
          break;
        case 404:
        case 500:
          statusClass = 'status-broken';
          statusText = 'Broken';
          statusIcon = '❌';
          tooltip = 'Link is inaccessible (error)';
          break;
        case 'timeout':
          statusClass = 'status-timeout';
          statusText = 'Timed Out';
          statusIcon = '🕒';
          tooltip = 'Request timed out after 8 seconds';
          break;
        case 'risky':
          statusClass = 'status-risky';
          statusText = 'Risky / Spam';
          statusIcon = '⚠️';
          tooltip = 'Link is on a blacklisted domain';
          break;
        default:
          statusClass = 'status-unknown';
          statusText = 'Unknown';
          statusIcon = '❓';
          tooltip = 'Unable to determine link status';
      }

      const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(result.url)}`;
      const details = [];
      if (result.redirectChain.length > 1) {
        details.push(`Redirect Chain: ${result.redirectChain.join(' → ')}`);
      }
      if (result.error) {
        details.push(result.error);
      }

      row.innerHTML = `
        <td><img src="${faviconUrl}" class="favicon" alt="Favicon"></td>
        <td class="url"><a href="${result.url}" target="_blank">${result.url}</a></td>
        <td><span class="status-tag ${statusClass}" data-tooltip="${tooltip}"><span class="status-icon">${statusIcon}</span> ${statusText}</span></td>
        <td class="details">${details.join('<br>')}</td>
        <td><button class="rescan-button" data-url="${result.url}">Rescan</button></td>
      `;

      container.appendChild(row);
    });

    // Add rescan event listeners
    document.querySelectorAll('.rescan-button').forEach(button => {
      button.addEventListener('click', async () => {
        const url = button.dataset.url;
        console.log(`Rescanning URL: ${url}`);
        const loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
          loadingOverlay.classList.remove('hidden');
        }

        try {
          const result = await rescanLink(url);
          const results = Array.from(document.querySelectorAll('#results-container tr')).map(row => {
            const rowUrl = row.querySelector('.url a').href;
            return rowUrl === url ? result : {
              url: rowUrl,
              status: row.querySelector('.status-tag').textContent.includes('OK') ? 200 :
                      row.querySelector('.status-tag').textContent.includes('Redirected') ? 301 :
                      row.querySelector('.status-tag').textContent.includes('Broken') ? 404 :
                      row.querySelector('.status-tag').textContent.includes('Risky') ? 'risky' :
                      row.querySelector('.status-tag').textContent.includes('Timed Out') ? 'timeout' : 'unknown',
              redirectChain: row.querySelector('.details').textContent.includes('Redirect Chain') ?
                            row.querySelector('.details').textContent.split('Redirect Chain: ')[1].split(' → ') : [],
              isRisky: row.querySelector('.status-tag').textContent.includes('Risky'),
              error: row.querySelector('.details').textContent.includes('Redirect Chain') ?
                     null : row.querySelector('.details').textContent
            };
          });
          displayResults(results);
          updateHealthScore(results);
          updateSummary(results);
        } catch (error) {
          console.error('Rescan failed:', error);
          alert('Rescan failed. Please check the console for details.');
        } finally {
          if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
          }
        }
      });
    });

    // Toggle OK links
    const toggleOk = document.getElementById('toggle-ok');
    if (toggleOk) {
      toggleOk.addEventListener('change', () => {
        const okRows = document.querySelectorAll('#results-container tr.ok');
        okRows.forEach(row => {
          row.classList.toggle('hidden', toggleOk.checked);
        });
      });
    }
  };

  // Update Summary
  const updateSummary = (results) => {
    const total = results.length;
    const ok = results.filter(r => r.status === 200).length;
    const redirects = results.filter(r => r.status === 301 || r.status === 302).length;
    const broken = results.filter(r => r.status === 404 || r.status === 500).length;
    const risky = results.filter(r => r.status === 'risky').length;

    document.getElementById('summary-total').textContent = total;
    document.getElementById('summary-ok').textContent = ok;
    document.getElementById('summary-redirects').textContent = redirects;
    document.getElementById('summary-broken').textContent = broken;
    document.getElementById('summary-risky').textContent = risky;
  };

  // Health Score
  const updateHealthScore = (results) => {
    const validLinks = results.filter(r => r.status === 200).length;
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
