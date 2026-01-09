/**
 * Clipboard utilities (User Website).
 *
 * Some environments (embedded previews / sandboxed iframes / non-secure contexts)
 * block the async Clipboard API. This module provides a best-effort fallback that
 * works in more places using a temporary textarea + document.execCommand('copy').
 */

// PUBLIC_INTERFACE
export async function copyTextToClipboard(text) {
  /**
   * Copy plain text to clipboard using the best available strategy.
   *
   * Strategy:
   * 1) Try navigator.clipboard.writeText (requires permissions and usually a secure context).
   * 2) Fallback to document.execCommand('copy') via a temporary textarea.
   *
   * Returns:
   * - { ok: true } on success
   * - { ok: false, reason: string } on failure
   */
  const value = String(text ?? "");

  // 1) Modern async clipboard
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return { ok: true };
    }
  } catch (e) {
    // Continue to fallback. In many sandboxed contexts this throws a SecurityError.
  }

  // 2) Legacy execCommand fallback
  const fallbackOk = execCommandCopyFallback(value);
  if (fallbackOk) return { ok: true };

  return { ok: false, reason: "Clipboard blocked or unsupported in this environment." };
}

function execCommandCopyFallback(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;

    // Prevent iOS zoom and keep it unobtrusive
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.left = "-1000px";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";

    document.body.appendChild(ta);

    // Must focus/select for execCommand('copy') to work
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    const ok = typeof document.execCommand === "function" && document.execCommand("copy");
    document.body.removeChild(ta);

    return Boolean(ok);
  } catch {
    return false;
  }
}
