const tableBody = document.querySelector('#opTable tbody');
const thresholdInput = document.getElementById('threshold');

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function render(top) {
  tableBody.innerHTML = '';
  top.forEach((t, i) => {
    const tr = document.createElement('tr');
    const reasons = Array.isArray(t?.rationale?.reasons) && t.rationale.reasons.length
      ? t.rationale.reasons.map(reason => `<div class="reason">${escapeHtml(reason)}</div>`).join('')
      : (t?.rationale?.summary ? `<div class="reason">${escapeHtml(t.rationale.summary)}</div>` : '');
    const fallback = (!reasons && t?.components?.traderInfluence > 0)
      ? '<div class="reason">Pro trader flow trending long</div>'
      : '';
    tr.innerHTML = `<td>${i + 1}</td><td>${escapeHtml(t.symbol)}</td><td>${Number(t.normalized).toFixed(1)}%</td><td>${reasons || fallback || '—'}</td>`;
    if (t.normalized >= parseFloat(thresholdInput.value || 85)) tr.classList.add('high');
    tableBody.appendChild(tr);
  });
}

if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'trendiq:scannerUpdate' || msg.type === 'trendiq:topOpportunities') {
      render(msg.top || msg.topList || []);
    }
  });
}
