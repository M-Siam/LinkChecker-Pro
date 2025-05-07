// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const body = document.body;
const savedTheme = localStorage.getItem('theme') || 'dark-mode';
body.className = savedTheme;
themeToggle.textContent = savedTheme === 'dark-mode' ? '🌙' : '☀️';

themeToggle.addEventListener('click', () => {
    const newTheme = body.className === 'dark-mode' ? 'light-mode' : 'dark-mode';
    body.className = newTheme;
    themeToggle.textContent = newTheme === 'dark-mode' ? '🌙' : '☀️';
    localStorage.setItem('theme', newTheme);
});

// Input Handling
const urlInput = document.getElementById('url-input');
const fileUpload = document.getElementById('file-upload');
const linkCount = document.getElementById('link-count');
const startScan = document.getElementById('start-scan');
let urls = [];

function updateLinkCount() {
    urls = urlInput.value.split('\n').filter(url => url.trim() !== '');
    linkCount.textContent = urls.length;
}

urlInput.addEventListener('input', updateLinkCount);

fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target.result;
        if (file.type === 'text/csv') {
            urls = content.split('\n').map(line => line.split(',')[0].trim()).filter(url => url);
        } else {
            urls = content.split('\n').filter(url => url.trim());
        }
        urlInput.value = urls.join('\n');
        updateLinkCount();
    };
    reader.readAsText(file);
});

// Tips Panel
const tips = [
    'Too many redirects hurt SEO.',
    'Broken links reduce user trust.',
    'Check links monthly to stay clean.'
];
const tipText = document.getElementById('tip-text');
const tipsPanel = document.querySelector('.tips-panel');

function showRandomTip() {
    tipText.textContent = tips[Math.floor(Math.random() * tips.length)];
    tipsPanel.classList.remove('hidden');
}

// Scan Handling
const resultsSection = document.getElementById('results-section');
const loadingOverlay = document.getElementById('loading-overlay');

startScan.addEventListener('click', async () => {
    if (urls.length === 0) {
        alert('Please enter or upload at least one URL.');
        return;
    }

    loadingOverlay.classList.remove('hidden');
    showRandomTip();
    try {
        const results = await scanUrls(urls);
        window.scanResults = results; // Store for export
        displayResults(results);
        updateHealthScore(results);
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Scan failed:', error);
        alert('An error occurred during the scan. Please check the console for details.');
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

// Results Display
const resultsTable = document.getElementById('results-table');

function displayResults(results) {
    resultsTable.innerHTML = '';
    results.forEach(result => {
        const card = document.createElement('div');
        card.className = `result-card status-${result.statusCode || 'unknown'}`;
        card.innerHTML = `
            <p><strong>URL:</strong> ${result.url}</p>
            <p><strong>Status:</strong> ${result.statusText} (${result.statusCode || 'Unknown'})</p>
            ${result.redirectChain.length > 0 ? `<p class="redirect-chain"><strong>Redirect Chain:</strong> ${result.redirectChain.join(' → ')}</p>` : ''}
            ${result.isRisky ? '<p class="risk-warning">⚠️ Spam/Malware Domain</p>' : ''}
        `;
        resultsTable.appendChild(card);
    });
}

// Health Score
const healthScoreEl = document.getElementById('health-score');
const progressCircle = document.querySelector('.progress-ring__circle');

function updateHealthScore(results) {
    const validLinks = results.filter(r => r.statusCode === 200).length;
    const score = Math.round((validLinks / results.length) * 100);
    healthScoreEl.textContent = `${score}%`;
    const circumference = 326.56;
    const offset = circumference - (score / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
}
