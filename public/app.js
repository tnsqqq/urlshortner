import { getShortIdFromInput, isValidShortId } from './url-utils.mjs';

const form = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const message = document.getElementById('message');
const shortUrlCard = document.getElementById('shortUrlCard');
const shortUrl = document.getElementById('shortUrl');
const urlList = document.getElementById('urlList');
const statusBadge = document.getElementById('statusBadge');
const refreshBtn = document.getElementById('refreshBtn');
const copyBtn = document.getElementById('copyBtn');
const addLinkForm = document.getElementById('addLinkForm');
const addLinkInput = document.getElementById('addLinkInput');
const savedLinksKey = 'shortly.shortIds';
let urlRefreshInProgress = false;
let refreshQueued = false;
let hasLoadedUrlList = false;
const shortIdsPerRequest = 100;

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
      ? [...new Set(storedIds.filter(isValidShortId))]
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

async function loadUrls({ showLoading = false } = {}) {
  if (urlRefreshInProgress) {
    refreshQueued = true;
    return null;
  }

  urlRefreshInProgress = true;
  urlList.setAttribute('aria-busy', 'true');
  if (showLoading || !hasLoadedUrlList) {
    urlList.innerHTML = '<div class="url-item"><div class="url-meta">Loading link counts...</div></div>';
  }

  try {
    const shortIds = getSavedShortIds();
    const items = [];
    for (let index = 0; index < shortIds.length; index += shortIdsPerRequest) {
      const batch = shortIds.slice(index, index + shortIdsPerRequest);
      const response = await fetch(`/url?ids=${encodeURIComponent(batch.join(','))}`, {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load link counts');
      }
      if (!Array.isArray(data)) {
        throw new Error('The link stats response was invalid');
      }
      items.push(...data);
    }

    const itemsById = new Map(items.map((item) => [item.shortId, item]));
    const savedItems = shortIds
      .map((shortId) => itemsById.get(shortId))
      .filter(Boolean);

    if (!savedItems.length) {
      urlList.innerHTML = '<div class="url-item"><div class="url-meta"><span class="url-link secondary">No links saved in this browser yet. Add a short code or URL above.</span></div></div>';
      hasLoadedUrlList = true;
      return true;
    }

    urlList.innerHTML = savedItems
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
    hasLoadedUrlList = true;
    return true;
  } catch (error) {
    console.error('Unable to refresh link counts:', error);
    urlList.innerHTML = '<div class="url-item"><div class="url-meta">Unable to load current click counts. Try refreshing.</div></div>';
    hasLoadedUrlList = false;
    setMessage('Unable to refresh click counts. Please try again.', 'error');
    return false;
  } finally {
    urlRefreshInProgress = false;
    urlList.setAttribute('aria-busy', 'false');
    if (refreshQueued) {
      refreshQueued = false;
      loadUrls({ showLoading: true });
    }
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

addLinkForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const shortId = getShortIdFromInput(addLinkInput.value.trim(), window.location.origin);
  if (!shortId) {
    setMessage('Enter a valid short code or a short URL from this site.', 'error');
    return;
  }

  try {
    const response = await fetch(`/url?ids=${encodeURIComponent(shortId)}`, {
      cache: 'no-store',
    });
    const items = await response.json();

    if (!response.ok) {
      throw new Error(items.error || 'Unable to find short link');
    }
    if (!Array.isArray(items) || !items.some((item) => item.shortId === shortId)) {
      setMessage('Short link not found.', 'error');
      return;
    }
    if (!saveShortId(shortId)) {
      setMessage('This browser could not save the short link.', 'error');
      return;
    }

    addLinkInput.value = '';
    const refreshed = await loadUrls({ showLoading: true });
    if (refreshed) {
      setMessage('Link added to this dashboard.', 'success');
    }
  } catch (error) {
    setMessage(error.message, 'error');
  }
});

refreshBtn.addEventListener('click', async () => {
  await loadHealth();
  if (await loadUrls({ showLoading: true })) {
    setMessage('Analytics refreshed', 'success');
  }
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

function refreshDashboard() {
  loadHealth();
  loadUrls({ showLoading: true });
}

window.addEventListener('focus', refreshDashboard);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    refreshDashboard();
  }
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshDashboard();
  }
});

setInterval(() => {
  if (!document.hidden) {
    loadUrls();
  }
}, 15000);

setInterval(() => {
  if (!document.hidden) {
    loadHealth();
  }
}, 5000);

loadHealth();
loadUrls({ showLoading: true });
