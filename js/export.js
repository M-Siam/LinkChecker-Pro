const exportCSV = () => {
  const results = Array.from(document.querySelectorAll('.result-card')).map(card => {
    const url = card.querySelector('.url').textContent;
    const status = card.querySelector('.status-tag').textContent.replace(/[✅🔄❌🕒⚠️]/, '').trim();
    const isRisky = card.querySelector('.status-tag').textContent.includes('Risky') ? 'Yes' : 'No';
    const redirectChain = card.querySelector('.details').textContent.includes('Redirect Chain') ?
                          card.querySelector('.details').textContent.split('Redirect Chain: ')[1] : 'None';
    const timestamp = card.querySelector('.timestamp').textContent.replace('Scanned: ', '');
    return `"${url.replace(/"/g, '""')}",${status},${isRisky},"${redirectChain.replace(/"/g, '""')}","${timestamp}"`;
  });

  const csv = ['URL,Status,Risky,Redirect Chain,Timestamp', ...results].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `linkcheckr-pro-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

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
        <th>Timestamp</th>
      </tr>
      ${Array.from(document.querySelectorAll('.result-card')).map(card => `
        <tr>
          <td>${card.querySelector('.url').textContent}</td>
          <td class="${card.querySelector('.status-tag').classList[1]}">${card.querySelector('.status-tag').textContent.replace(/[✅🔄❌🕒⚠️]/, '').trim()}</td>
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

document.getElementById('export-csv').addEventListener('click', exportCSV);
document.getElementById('export-pdf').addEventListener('click', exportPDF);
