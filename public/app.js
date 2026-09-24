const form = document.getElementById('urlForm');
const urlInput = document.getElementById('urlInput');
const message = document.getElementById('message');
const shortUrlCard = document.getElementById('shortUrlCard');
const shortUrl = document.getElementById('shortUrl');
const urlList = document.getElementById('urlList');
const statusBadge = document.getElementById('statusBadge');
const refreshBtn = document.getElementById('refreshBtn');

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
    statusBadge.textContent = data.databaseMode === 'mongo' ? 'MongoDB mode' : 'Memory mode';
  } catch (error) {
    statusBadge.textContent = 'Memory mode';
  }
}

async function loadUrls() {
  try {
    const response = await fetch('/url');
    const items = await response.json();

    if (!items.length) {
      urlList.innerHTML = '<div class="url-item"><div class="url-meta">No URLs created yet.</div></div>';
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

    shortUrl.href = data.shortUrl;
    shortUrl.textContent = data.shortUrl;
    shortUrlCard.classList.remove('hidden');
    setMessage('Short URL created successfully!', 'success');
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
