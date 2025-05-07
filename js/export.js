// Export CSV
const exportCSV = () => {
  const results = Array.from(document.querySelectorAll('#results-container tr')).map(row => {
    const url = row.querySelector('.url a').textContent;
    const status = row.querySelector('.status-tag').textContent.replace(/✔️|🔄|❌|🕒|⚠️|❓/, '').trim();
    const isRisky = row.querySelector('.status-tag').textContent.includes('Risky') ? 'Yes' : 'No';
    const redirectChain = row.querySelector('.details').textContent.includes('Redirect Chain') ?
                          row.querySelector('.details').textContent.split('Redirect Chain: ')[1] : 'None';
    return `"${url.replace(/"/g, '""')}",${status},${isRisky},"${redirectChain.replace(/"/g, '""')}"`;
  });

  const csv = ['URL,Status,Risky,Redirect Chain', ...results].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `linkcheckr-pro-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Export PDF
const exportPDF = () => {
  const element = document.createElement('div');
  element.className = 'pdf-content';
  element.innerHTML = `
    <h1>LinkCheckr Pro Report</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <p>Link Health: ${document.getElementById('health-score').textContent}</p>
    <p>Summary: Total: ${document.getElementById('summary-total').textContent} | OK: ${document.getElementById('summary-ok').textContent} | Redirects: ${document.getElementById('summary-redirects').textContent} | Broken: ${document.getElementById('summary-broken').textContent} | Risky: ${document.getElementById('summary-risky').textContent}</p>
    <h2>Results</h2>
    <table>
      <tr>
        <th>URL</th>
        <th>Status</th>
        <th>Risky</th>
        <th>Redirect Chain</th>
      </tr>
      ${Array.from(document.querySelectorAll('#results-container tr')).map(row => `
        <tr>
          <td>${row.querySelector('.url a').textContent}</td>
          <td class="${row.querySelector('.status-tag').classList[1]}">${row.querySelector('.status-tag').textContent.replace(/✔️|🔄|❌|🕒|⚠️|❓/, '').trim()}</td>
          <td>${row.querySelector('.status-tag').textContent.includes('Risky') ? 'Yes' : 'No'}</td>
          <td>${row.querySelector('.details').textContent.includes('Redirect Chain') ? row.querySelector('.details').textContent.split('Redirect Chain: ')[1] : 'None'}</td>
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

// Event Listeners
document.getElementById('export-csv').addEventListener('click', exportCSV);
document.getElementById('export-pdf').addEventListener('click', exportPDF);
