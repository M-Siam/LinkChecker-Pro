// Export CSV
const exportCSV = () => {
  const results = Array.from(document.querySelectorAll('.result-item')).map(item => {
    const url = item.querySelector('a').textContent;
    const status = item.querySelector('.status-tag').textContent;
    const isRisky = item.querySelector('.risk-warning') ? 'Yes' : 'No';
    const redirectChain = item.querySelector('.redirect-chain')?.textContent.replace('Redirect Chain: ', '') || 'None';
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
    <h2>Results</h2>
    <table>
      <tr>
        <th>URL</th>
        <th>Status</th>
        <th>Risky</th>
        <th>Redirect Chain</th>
      </tr>
      ${Array.from(document.querySelectorAll('.result-item')).map(item => `
        <tr>
          <td>${item.querySelector('a').textContent}</td>
          <td class="${item.querySelector('.status-tag').classList[1]}">${item.querySelector('.status-tag').textContent}</td>
          <td>${item.querySelector('.risk-warning') ? 'Yes' : 'No'}</td>
          <td>${item.querySelector('.redirect-chain')?.textContent.replace('Redirect Chain: ', '') || 'None'}</td>
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