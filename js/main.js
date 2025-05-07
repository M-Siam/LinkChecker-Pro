// Theme Toggle
const toggleTheme = () => {
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode');
  localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
};

// Initialize Theme
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.remove('dark-mode');
  document.body.classList.add('light-mode');
} else {
  document.body.classList.add('dark-mode');
}

document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

// Smart Tips
const tips = [
  'Too many redirects hurt SEO.',
  'Broken links reduce user trust.',
  'Check links monthly to stay clean.'
];

const showRandomTip = () => {
  const tipText = document.getElementById('tip-text');
  tipText.textContent = tips[Math.floor(Math.random() * tips.length)];
};
showRandomTip();
setInterval(showRandomTip, 5000);

// Link Input Handling
const urlInput = document.getElementById('url-input');
const fileInput = document.getElementById('file-input');
const linkCount = document.getElementById('link-count');

const isValidUrl = (string) => {
  try {
    // Ensure URL has protocol (http:// or https://)
    if (!string.startsWith('http://') && !string.startsWith('https://')) {
      string = 'https://' + string;
    }
    new URL(string);
    return string;
  } catch (_) {
    return false;
  }
};

const updateLinkCount = () => {
  const urls = urlInput.value.split('\n').map(url => url.trim()).filter(url => isValidUrl(url));
  linkCount.textContent = urls.length;
};

urlInput.addEventListener('input', updateLinkCount);

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target.result;
    const urls = content.split('\n').map(url => url.trim()).filter(url => isValidUrl(url));
    urlInput.value = urls.join('\n');
    updateLinkCount();
  };
  reader.readAsText(file);
});

// Start Scan
document.getElementById('start-scan').addEventListener('click', async () => {
  const rawUrls = urlInput.value.split('\n').map(url => url.trim()).filter(url => url);
  const urls = rawUrls.map(url => isValidUrl(url)).filter(url => url);
  
  if (!urls.length) {
    alert('Please enter at least one valid URL (e.g., https://example.com).');
    return;
  }

  if (urls.length < rawUrls.length) {
    alert('Some URLs were invalid and skipped. Ensure URLs include http:// or https://.');
  }

  const loadingOverlay = document.querySelector('.loading-overlay');
  const resultsSection = document.querySelector('.results-section');
  
  loadingOverlay.classList.remove('hidden');
  resultsSection.classList.add('hidden');

  try {
    const results = await scanLinks(urls); // From scanner.js
    displayResults(results);
    updateHealthScore(results);
    
    loadingOverlay.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    window.scrollTo({ top: resultsSection.offsetTop, behavior: 'smooth' });
  } catch (error) {
    console.error('Scan failed:', error);
    alert('An error occurred during scanning. Please check the console for details.');
    loadingOverlay.classList.add('hidden');
  }
});

// Display Results
const displayResults = (results) => {
  const container = document.getElementById('results-container');
  container.innerHTML = '';

  results.forEach((result, index) => {
    const item = document.createElement('div');
    item.className = 'result-item glass';
    item.id = `result-${index}`;

    let statusClass = '';
    let statusText = result.status;
    if (result.status === 200) {
      statusClass = 'status-200';
      statusText = '200 OK';
    } else if (result.status === 301 || result.status === 302) {
      statusClass = 'status-redirect';
      statusText = `${result.status} Redirect`;
    } else if (result.status === 404 || result.status === 500) {
      statusClass = 'status-error';
      statusText = `${result.status} Error`;
    } else {
      statusClass = 'status-unknown';
      statusText = 'Unknown';
    }

    item.innerHTML = `
      <div class="result-header">
        <p><strong>URL:</strong> <a href="${result.url}" target="_blank">${result.url}</a></p>
        <span class="status-tag ${statusClass}">${statusText}</span>
      </div>
      <div class="result-details">
        ${result.isRisky ? '<p><span class="status-tag risk-warning">⚠️ Spam/Malware Domain</span></p>' : ''}
        ${result.redirectChain.length > 1 ? `<p class="redirect-chain">Redirect Chain: ${result.redirectChain.join(' → ')}</p>` : ''}
        ${result.error ? `<p class="error-message">Note: ${result.error}</p>` : ''}
      </div>
    `;

    item.querySelector('.result-header').addEventListener('click', () => {
      item.classList.toggle('active');
    });

    container.appendChild(item);
  });
};

// Health Score
const updateHealthScore = (results) => {
  const validLinks = results.filter(r => r.status === 200).length;
  const score = Math.round((validLinks / results.length) * 100);
  document.getElementById('health-score').textContent = `${score}%`;
  document.getElementById('progress-circle').style.setProperty('--progress', `${score}%`);
};
