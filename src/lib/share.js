export function gameUrl(id) {
  return `${window.location.origin}/game?id=${encodeURIComponent(id)}`;
}

/**
 * Opens the share sheet, falling back to the clipboard. Must be called directly
 * from a tap handler: Safari refuses navigator.share() after an await.
 * With `file`, shares that (e.g. a result image) where supported.
 * Resolves to 'shared' | 'copied' | 'cancelled' | 'failed'.
 */
export async function shareLink(url, text, { copyText, file } = {}) {
  // An image card shares much better than text where the phone supports it.
  if (file && navigator.canShare && navigator.share) {
    let ok = false;
    try {
      ok = navigator.canShare({ files: [file] });
    } catch (e) {
      ok = false;
    }
    if (ok) {
      try {
        await navigator.share({ files: [file], text: copyText || `${text} ${url}` });
        return 'shared';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'cancelled';
      }
    }
  }
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
