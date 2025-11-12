(function () {
  const isChromeStorage = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local);

  function getStorage(keys, cb) {
    if (isChromeStorage) return chrome.storage.local.get(keys, cb);
    const res = {};
    keys.forEach(k => res[k] = localStorage.getItem(k));
    cb(res);
  }

  function setStorage(obj, cb) {
    if (isChromeStorage) return chrome.storage.local.set(obj, cb);
    Object.keys(obj).forEach(k => {
      if (typeof obj[k] === 'undefined' || obj[k] === null) localStorage.removeItem(k);
      else localStorage.setItem(k, obj[k]);
    });
    if (cb) cb();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('cgKey');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearBtn');

    getStorage(['coingeckoKey'], (res) => {
      if (res && res.coingeckoKey) input.value = res.coingeckoKey;
    });

    saveBtn.addEventListener('click', () => {
      const val = input.value && input.value.trim();
      setStorage({ coingeckoKey: val || null }, () => {
        alert('Saved');
      });
    });

    clearBtn.addEventListener('click', () => {
      input.value = '';
      setStorage({ coingeckoKey: null }, () => {
        alert('Cleared');
      });
    });
  });
})();
