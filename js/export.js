const exportCsvBtn = document.getElementById('export-csv');
const exportPdfBtn = document.getElementById('export-pdf');

function exportToCsv(results) {
    const headers = ['URL', 'Status', 'Status Code', 'Redirect Chain', 'Risk Warning'];
    const rows = results.map(r => [
        r.url,
        r.statusText,
        r.statusCode || 'Unknown',
        r.redirectChain.join(' → '),
        r.isRisky ? 'Spam/Malware Domain' : ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LinkCheckr_Pro_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function exportToPdf(results) {
    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.background = document.body.className.includes('dark-mode') ? '#1a1a2e' : '#ffffff';
    element.style.color = document.body.className.includes('dark-mode') ? '#e0e0e0' : '#333';
    element.innerHTML = `
        <h1 style="background: linear-gradient(45deg, #00f260, #0575e6); -webkit-background-clip: text; background-clip: text; color: transparent;">
            LinkCheckr Pro Report
        </h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Link Health: ${document.getElementById('health-score').textContent}</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
                <tr style="background: rgba(255, 255, 255, 0.1);">
                    <th style="padding: 10px; border: 1px solid rgba(255, 255, 255, 0.3);">URL</th>
                    <th style="padding: 10px; border: 1px solid rgba(255, 255, 255, 0.3);">Status</th>
                    <th style="padding: 10px; border: 1px solid rgba(255, 255, 255, 0.3);">Redirect Chain</th>
                    <th style="padding: 10px; border: 1px solid rgba(255, 255, 255, 0.3);">Risk</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(r => `
                    <tr style="background: ${r.statusCode === 200 ? 'rgba(0, 255, 0, 0.1)' : r.statusCode >= 300 && r.statusCode < 400 ? 'rgba(255, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'};">
                        <td style="padding: 10px; border: 1px solid rgba(255, 255, 255, 0.3);">${r.url}</td>
                        <td style="padding: 10px; border: 1px solid rgba(255, 255, 255, 0.3);">${r.statusText} (${r.statusCode || 'Unknown'})</td>
                        <td style="padding: 10px; border: 1px solid rgba(255, 255, 255, 0.3);">${r.redirectChain.join(' → ')}</td>
                        <td style="padding: 10px; border: 1px solid rgba(255, 255, 255, 0.3);">${r.isRisky ? '⚠️ Spam/Malware' : ''}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    const opt = {
        margin: 1,
        filename: `LinkCheckr_Pro_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

exportCsvBtn.addEventListener('click', () => exportToCsv(window.scanResults || []));
exportPdfBtn.addEventListener('click', () => exportToPdf(window.scanResults || []));