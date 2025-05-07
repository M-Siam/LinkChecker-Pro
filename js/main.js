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
  const urls = urlInput.value.split('\n').filter(url => url.trim());
  linkCount.textContent = urls.length;
};

urlInput.addEventListener('input', updateLinkCount);

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const content = event.target.result;
    const urls = content.split('\n').filter(url => url.trim());
    urlInput.value = urls.join('\n');
    updateLinkCount();
  };
  reader.readAsText(file);
});

// Link Scanning
const startScan = async () => {
  const urls = urlInput.value.split('\n').filter(url => url.trim());
  if (!urls.length) {
    alert('Please enter at least one URL.');
    return;
  }

  document.querySelector('.loading-overlay').classList.remove('hidden');
  document.querySelector('.results-section').classList.add('hidden');

  const results = await scanLinks(urls);
  displayResults(results);
  updateHealthScore(results);

  document.querySelector('.loading-overlay').classList.add('hidden');
  document.querySelector('.results-section').classList.remove('hidden');
  window.scrollTo({ top: document.querySelector('.results-section').offsetTop, behavior: 'smooth' });
};

const scanLinks = async (urls) => {
  const results = await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      const status = response.status;
      let redirectChain = [];

      if (status === 301 || status === 302) {
        redirectChain = await getRedirectChain(url);
      }

      const domain = new URL(url).hostname;
      const isRisky = blacklist.includes(domain);

      return { url, status, redirectChain, isRisky };
    } catch (error) {
      return { url, status: 'unknown', redirectChain: [], isRisky: false };
    }
  }));
  return results;
};

const getRedirectChain = async (url) => {
  const chain = [url];
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    if (response.headers.get('location')) {
      const nextUrl = response.headers.get('location');
      chain.push(nextUrl);
      const subChain = await getRedirectChain(nextUrl);
      chain.push(...subChain);
    }
  } catch (error) {}
  return chain;
};

// Display Results
const displayResults = (results) => {
  const container = document.getElementById('results-container');
  container.innerHTML = '';

  results.forEach(result => {
    const item = document.createElement('div');
    item.className = 'result-item glass';

    let statusClass = '';
    if (result.status === 200) statusClass = 'status-200';
    else if (result.status === 301 || result.status === 302) statusClass = 'status-redirect';
    else if (result.status === 404 || result.status === 500) statusClass = 'status-error';
    else statusClass = 'status-unknown';

    item.innerHTML = `
      <p><strong>URL:</strong> <a href="${result.url}" target="_blank">${result.url}</a></p>
      <p><span class="status-tag ${statusClass}">${result.status === 'unknown' ? 'Unknown' : result.status}</span></p>
      ${result.isRisky ? '<p><span class="status-tag risk-warning">⚠️ Spam/Malware Domain</span></p>' : ''}
      ${result.redirectChain.length > 1 ? `<p class="redirect-chain">Redirect Chain: ${result.redirectChain.join(' → ')}</p>` : ''}
    `;
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

// Export CSV
const exportCSV = () => {
  const results = Array.from(document.querySelectorAll('.result-item')).map(item => {
    const url = item.querySelector('a').textContent;
    const status = item.querySelector('.status-tag').textContent;
    const isRisky = item.querySelector('.risk-warning') ? 'Yes' : 'No';
    const redirectChain = item.querySelector('.redirect-chain')?.textContent.replace('Redirect Chain: ', '') || 'None';
    return `${url},${status},${isRisky},${redirectChain}`;
  });

  const csv = ['URL,Status,Risky,Redirect Chain', ...results].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `linkcheckr-pro-report-${new Date().toISOString()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Export PDF
const exportPDF = () => {
  const element = document.querySelector('.results-section');
  const opt = {
    margin: 1,
    filename: `linkcheckr-pro-report-${new Date().toISOString()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
};

// Event Listeners
document.getElementById('start-scan').addEventListener('click', startScan);
document.getElementById('export-csv').addEventListener('click', exportCSV);
document.getElementById('export-pdf').addEventListener('click', exportPDF);