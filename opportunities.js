const tableBody = document.querySelector('#opTable tbody');
const thresholdInput = document.getElementById('threshold');

function render(top) {
  tableBody.innerHTML = '';
  top.forEach((t, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${t.symbol}</td><td>${t.normalized.toFixed(1)}%</td><td>${t.components && t.components.traderInfluence ? 'Trader influence+' : ''}</td>`;
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
