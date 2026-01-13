'use client';

import { useMemo } from 'react';

interface ExhibitFrameProps {
  html: string;
  css?: string | null;
}

const CSP = [
  "default-src 'none'",
  "img-src https: data:",
  "style-src 'unsafe-inline'",
  "font-src https: data:",
  "media-src https: data:",
].join('; ');

export function ExhibitFrame({ html, css }: ExhibitFrameProps) {
  const srcDoc = useMemo(() => {
    const safeHtml = html ?? '';
    const safeCss = css ?? '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta http-equiv="Content-Security-Policy" content="${CSP}" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${safeCss}</style>
</head>
<body>${safeHtml}</body>
</html>`;
  }, [html, css]);

  return (
    <iframe
      className="viewer-frame"
      sandbox="allow-same-origin"
      referrerPolicy="no-referrer"
      srcDoc={srcDoc}
      title="Exhibition content"
    />
  );
}
