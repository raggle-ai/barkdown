import { useCallback, useState } from "react";

/**
 * Clipboard write with a short copied state, shared by the copy buttons.
 * Returns `copied` so buttons can swap their icon after a copy.
 */
export function useCopyToClipboard(resetMs = 1800) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    (text: string) => {
      void navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), resetMs);
      });
    },
    [resetMs],
  );

  return { copied, copy };
}
