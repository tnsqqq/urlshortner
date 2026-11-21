export function getShortIdFromUrl(input, origin) {
  try {
    const url = new URL(input);
    const match = url.pathname.match(/^\/([0-9A-Za-z]{9})$/);
    return url.origin === origin && !url.search && !url.hash ? match?.[1] || null : null;
  } catch {
    return null;
  }
}
