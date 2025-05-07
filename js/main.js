document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded, initializing...');

  // Drag and Drop
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  if (dropZone && fileInput) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => e.preventDefault());
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.type === 'text/plain' || file.type === 'text/csv')) {
        handleFile(file);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && (file.type === 'text/plain' || file.type === 'text/csv')) {
        handleFile(file);
      }
    });

    function handleFile(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        const urls = content.split('\n').map(url => url.trim()).filter(url => isValidUrl(url));
        urlInput.value = urls.join('\n');
        updateLinkCount();
        console.log('File uploaded, URLs loaded:', urls);
      };
      reader.readAsText(file);
    }
  }

  // Link Input Handling
  const urlInput = document.getElementById('url-input');
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

    results.forEach((result) => {
      const item = document.createElement('div');
      item.className = 'result-item';

      let statusText = '';
      let statusClass = '';

      switch (result.status) {
        case 'ok':
          statusText = 'OK';
          statusClass = 'status-ok';
          break;
        case 'redirect':
          statusText = 'Redirected';
          statusClass = 'status-redirect';
          break;
        case 'broken':
          statusText = result.error || 'Connection Failed';
          statusClass = 'status-broken';
          break;
        case 'timeout':
          statusText = 'Timeout';
          statusClass = 'status-timeout';
          break;
        case 'unreachable':
          statusText = 'Connection Failed';
          statusClass = 'status-unreachable';
          break;
        case 'risky':
          statusText = 'Risky';
          statusClass = 'status-risky';
          break;
      }

      item.innerHTML = `
        <span class="url">${result.url}</span>
        <span class="status ${statusClass}">${statusText}</span>
      `;

      container.appendChild(item);
    });

    // Toggle Risky/Broken
    const toggleRiskyBroken = document.getElementById('toggle-risky-broken');
    if (toggleRiskyBroken) {
      toggleRiskyBroken.addEventListener('change', () => {
        const items = document.querySelectorAll('.result-item');
        items.forEach(item => {
          const isRiskyOrBroken = item.querySelector('.status').classList.contains('status-risky') || item.querySelector('.status').classList.contains('status-broken');
          item.style.display = toggleRiskyBroken.checked && !isRiskyOrBroken ? 'none' : 'flex';
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
    const score = Math.round((validLinks / results.length) * 100) || 0;
    const healthScore = document.getElementById('health-score');
    const progressCircle = document.getElementById('progress-circle');
    if (healthScore && progressCircle) {
      healthScore.textContent = `${score}%`;
      progressCircle.style.setProperty('--progress', `${score}%`);
      console.log('Health score updated:', score);
    }
  };
});
