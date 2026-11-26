export function gameUrl(id) {
  return `${window.location.origin}/game?id=${encodeURIComponent(id)}`;
}

/**
 * Opens the share sheet, falling back to the clipboard. Must be called directly
 * from a tap handler: Safari refuses navigator.share() after an await.
 * Resolves to 'shared' | 'copied' | 'cancelled' | 'failed'.
 */
export async function shareLink(url, text, { copyText } = {}) {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Yelnats', text, url });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(copyText || url);
    return 'copied';
  } catch (e) {
    return 'failed';
  }
}
