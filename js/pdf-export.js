const exportPDF = () => {
  const element = document.createElement('div');
  element.className = 'pdf-content';
  element.innerHTML = `
    <style>
      .pdf-content { font-family: Poppins, sans-serif; color: #1a1c23; padding: 20px; }
      h1 { font-size: 24px; color: #3D5AFE; }
      p { font-size: 14px; margin: 10px 0; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th, td { border: 1px solid #e0e0e0; padding: 8px; text-align: left; font-size: 12px; }
      th { background: #f8f9fa; }
      .status-ok { color: #4caf50; }
      .status-redirect { color: #ffb300; }
      .status-broken { color: #e53935; }
      .status-timeout, .status-unreachable { color: #6b7280; }
      .status-risky { color: #ff5722; }
      img.logo { width: 40px; float: right; }
    </style>
    <img src="assets/logo.svg" class="logo" alt="LinkCheckr Pro Logo">
    <h1>LinkCheckr Pro Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <p>Link Health: ${document.getElementById('health-score').textContent}</p>
    <p>Summary: Total: ${document.getElementById('summary-total').textContent} | OK: ${document.getElementById('summary-ok').textContent} | Redirects: ${document.getElementById('summary-redirects').textContent} | Broken: ${document.getElementById('summary-broken').textContent} | Risky: ${document.getElementById('summary-risky').textContent}</p>
    <table>
      <tr>
        <th>URL</th>
        <th>Status</th>
        <th>Risky</th>
        <th>Redirect Chain</th>
        <th>Timestamp</th>
      </tr>
      ${Array.from(document.querySelectorAll('.result-card')).map(card => `
        <tr>
          <td>${card.querySelector('.url').textContent}</td>
          <td class="${card.querySelector('.status-tag').classList[1]}">${card.querySelector('.status-tag').textContent.replace(/[✅🔁❌🕒⚠️]/, '').trim()}</td>
          <td>${card.querySelector('.status-tag').textContent.includes('Risky') ? 'Yes' : 'No'}</td>
          <td>${card.querySelector('.details').textContent.includes('Redirect Chain') ? card.querySelector('.details').textContent.split('Redirect Chain: ')[1] : 'None'}</td>
          <td>${card.querySelector('.timestamp').textContent.replace('Scanned: ', '')}</td>
        </tr>
      `).join('')}
    </table>
  `;

  document.body.appendChild(element);
  const opt = {
    margin: 0.5,
    filename: `linkcheckr-pro-report-${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save().then(() => {
    document.body.removeChild(element);
  });
};

document.getElementById('export-pdf').addEventListener('click', exportPDF);
