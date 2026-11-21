const form = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const message = document.getElementById('message');
const shortUrlCard = document.getElementById('shortUrlCard');
const shortUrl = document.getElementById('shortUrl');
const urlList = document.getElementById('urlList');
const statusBadge = document.getElementById('statusBadge');
const refreshBtn = document.getElementById('refreshBtn');
const copyBtn = document.getElementById('copyBtn');
const savedLinksKey = 'shortly.shortIds';

function getShortUrl(shortId) {
  return `${window.location.origin}/${shortId}`;
}

function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

async function loadHealth() {
  try {
    const response = await fetch('/health');
    const data = await response.json();
    statusBadge.textContent = response.ok ? 'PostgreSQL mode' : 'Database unavailable';
  } catch (error) {
    statusBadge.textContent = 'Database unavailable';
  }
}

function getSavedShortIds() {
  try {
    const storedIds = JSON.parse(window.localStorage.getItem(savedLinksKey) || '[]');
    return Array.isArray(storedIds)
      ? [...new Set(storedIds.filter((id) => typeof id === 'string'))]
      : [];
  } catch (error) {
    console.error('Unable to read saved links from localStorage:', error);
    return [];
  }
}

function saveShortId(shortId) {
  try {
    const ids = getSavedShortIds().filter((id) => id !== shortId);
    window.localStorage.setItem(savedLinksKey, JSON.stringify([shortId, ...ids]));
    return true;
  } catch (error) {
    console.error('Unable to save link in localStorage:', error);
    return false;
  }
}

async function loadUrls() {
  try {
    const shortIds = getSavedShortIds();
    const response = await fetch(`/url?ids=${encodeURIComponent(shortIds.join(','))}`, {
      cache: 'no-store',
    });
    const items = await response.json();

    if (!items.length) {
      urlList.innerHTML = '<div class="url-item"><div class="url-meta"><span class="url-link secondary">No URLs created yet.</span></div></div>';
      return;
    }

    urlList.innerHTML = items
      .map(
        (item) => {
          const shortLink = getShortUrl(item.shortId);
          return `
            <div class="url-item">
              <div class="url-meta">
                <a class="url-link" href="${shortLink}" target="_blank" rel="noreferrer">${shortLink}</a>
                <a class="url-link secondary" href="${item.redirectURL}" target="_blank" rel="noreferrer">${item.redirectURL}</a>
              </div>
              <div class="click-count">${item.totalClicks} clicks</div>
            </div>
          `;
        }
      )
      .join('');
  } catch (error) {
    urlList.innerHTML = '<div class="url-item"><div class="url-meta">Unable to load URLs.</div></div>';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const originalUrl = urlInput.value.trim();

  try {
    setMessage('Creating short link...', '');
    const response = await fetch('/url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: originalUrl }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to create short link');
    }

    const saved = saveShortId(data.shortId);
    shortUrl.href = data.shortUrl;
    shortUrl.textContent = data.shortUrl;
    shortUrlCard.classList.remove('hidden');
    setMessage(
      saved
        ? 'Short URL created successfully!'
        : 'Short URL created, but this browser could not save it to localStorage.',
      saved ? 'success' : 'error'
    );
    urlInput.value = '';
    await loadUrls();
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

refreshBtn.addEventListener('click', async () => {
  await loadHealth();
  await loadUrls();
  setMessage('Analytics refreshed', 'success');
});

copyBtn.addEventListener('click', async () => {
  if (!shortUrl.href || shortUrl.href === `${window.location.origin}/#`) {
    return;
  }

  try {
    await navigator.clipboard.writeText(shortUrl.textContent);
    setMessage('Short link copied', 'success');
  } catch (error) {
    setMessage('Copy unavailable in this browser', 'error');
  }
});

window.addEventListener('focus', () => {
  loadHealth();
  loadUrls();
});

setInterval(() => {
  loadHealth();
  loadUrls();
}, 5000);

loadHealth();
loadUrls();
