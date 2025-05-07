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

const updateLinkCount = () => {
  const urls = urlInput.value.split('\n').filter(url => url.trim() && isValidUrl(url));
  linkCount.textContent = urls.length;
};

const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

urlInput.addEventListener('input', updateLinkCount);

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target.result;
    const urls = content.split('\n').filter(url => url.trim() && isValidUrl(url));
    urlInput.value = urls.join('\n');
    updateLinkCount();
  };
  reader.readAsText(file);
});

// Start Scan
document.getElementById('start-scan').addEventListener('click', async () => {
  const urls = urlInput.value.split('\n').filter(url => url.trim() && isValidUrl(url));
  if (!urls.length) {
    alert('Please enter at least one valid URL.');
    return;
  }

  document.querySelector('.loading-overlay').classList.remove('hidden');
  document.querySelector('.results-section').classList.add('hidden');

  const results = await scanLinks(urls); // From scanner.js
  displayResults(results);
  updateHealthScore(results);

  document.querySelector('.loading-overlay').classList.add('hidden');
  document.querySelector('.results-section').classList.remove('hidden');
  window.scrollTo({ top: document.querySelector('.results-section').offsetTop, behavior: 'smooth' });
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
    if (result.status === 200) statusClass = 'status-200';
    else if (result.status === 301 || result.status === 302) statusClass = 'status-redirect';
    else if (result.status === 404 || result.status === 500) statusClass = 'status-error';
    else statusClass = 'status-unknown';

    item.innerHTML = `
      <div class="result-header">
        <p><strong>URL:</strong> <a href="${result.url}" target="_blank">${result.url}</a></p>
        <span class="status-tag ${statusClass}">${result.status === 'unknown' ? 'Unknown' : result.status}</span>
      </div>
      <div class="result-details">
        ${result.isRisky ? '<p><span class="status-tag risk-warning">⚠️ Spam/Malware Domain</span></p>' : ''}
        ${result.redirectChain.length > 1 ? `<p class="redirect-chain">Redirect Chain: ${result.redirectChain.join(' → ')}</p>` : ''}
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