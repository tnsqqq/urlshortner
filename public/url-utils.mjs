export function isValidShortId(shortId) {
  return /^[0-9A-Za-z]{9}$/.test(shortId);
}

export function getShortIdFromInput(input, origin) {
  if (isValidShortId(input)) {
    return input;
  }

  try {
    const url = new URL(input);
    const match = url.pathname.match(/^\/([0-9A-Za-z]{9})$/);
    return url.origin === origin && !url.username && !url.password && !url.search && !url.hash
      ? match?.[1] || null
      : null;
  } catch {
    return null;
  }
}
