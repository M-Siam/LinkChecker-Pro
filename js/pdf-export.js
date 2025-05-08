const exportPDF = () => {
  const element = document.createElement('div');
  element.className = 'pdf-content';
  element.innerHTML = `
    <style>
      .pdf-content {
        font-family: 'Poppins', sans-serif;
        color: #1a1c23;
        padding: 20px;
        background: #ffffff;
        width: 8.27in; /* A4 width */
        min-height: 11.69in; /* A4 height */
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      h1 {
        font-size: 24px;
        color: #3D5AFE;
        font-weight: 600;
      }
      .logo {
        width: 40px;
        height: 40px;
      }
      p {
        font-size: 14px;
        margin: 10px 0;
        color: #1a1c23;
      }
      .summary {
        background: #f8f9fa;
        padding: 10px;
        border-radius: 8px;
        margin: 10px 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        font-size: 12px;
      }
      th, td {
        border: 1px solid #e0e0e0;
        padding: 8px;
        text-align: left;
      }
      th {
        background: #f1f3f5;
        font-weight: 600;
        color: #1a1c23;
      }
      .status-ok { color: #4caf50; }
      .status-redirect { color: #ffb300; }
      .status-broken { color: #e53935; }
      .status-timeout, .status-unreachable { color: #6b7280; }
      .status-risky { color: #ff5722; }
      .footer {
        position: absolute;
        bottom: 20px;
        width: calc(8.27in - 40px);
        text-align: center;
        font-size: 10px;
        color: #6b7280;
      }
    </style>
    <div class="header">
      <h1>LinkCheckr Pro Report</h1>
      <img src="assets/logo.svg" class="logo" alt="LinkCheckr Pro Logo">
    </div>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <div class="summary">
      <p><strong>Link Health:</strong> ${document.getElementById('health-score').textContent}</p>
      <p><strong>Summary:</strong> Total: ${document.getElementById('summary-total').textContent} | OK: ${document.getElementById('summary-ok').textContent} | Redirects: ${document.getElementById('summary-redirects').textContent} | Broken: ${document.getElementById('summary-broken').textContent} | Risky: ${document.getElementById('summary-risky').textContent}</p>
    </div>
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
    <div class="footer">
      <p>© 2025 SIAM. All rights reserved.</p>
    </div>
  `;

  document.body.appendChild(element);
  const opt = {
    margin: [0.5, 0.5, 1, 0.5], // Ensure space for footer
    filename: `linkcheckr-pro-report-${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save().then(() => {
    document.body.removeChild(element);
  });
};

const exportCSV = () => {
  const rows = [
    ['URL', 'Status', 'Risky', 'Redirect Chain', 'Timestamp'],
    ...Array.from(document.querySelectorAll('.result-card')).map(card => [
      `"${card.querySelector('.url').textContent}"`,
      `"${card.querySelector('.status-tag').textContent.replace(/[✅🔁❌🕒⚠️]/, '').trim()}"`,
      `"${card.querySelector('.status-tag').textContent.includes('Risky') ? 'Yes' : 'No'}"`,
      `"${card.querySelector('.details').textContent.includes('Redirect Chain') ? card.querySelector('.details').textContent.split('Redirect Chain: ')[1] : 'None'}"`,
      `"${card.querySelector('.timestamp').textContent.replace('Scanned: ', '')}"`
    ])
  ];

  const csvContent = rows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `linkcheckr-pro-report-${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

document.getElementById('export-pdf').addEventListener('click', exportPDF);
document.getElementById('export-csv').addEventListener('click', exportCSV);
