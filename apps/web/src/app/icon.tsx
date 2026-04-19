import { ImageResponse } from 'next/og';

/**
 * App Router dynamic favicon. Renders a monospace "G" monogram on the brand
 * dark background, matching the AppHeader wordmark style. Uses Next's built-in
 * `ImageResponse` (same engine as @vercel/og) so we avoid bundling another
 * graphics library and avoid committing a static binary asset.
 *
 * Browsers will request /icon at 32x32 by default; Next inlines this into the
 * <head> as <link rel="icon">.
 */

export const size = { width: 32, height: 32 } as const;
export const contentType = 'image/png';

export default function Icon(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0d12',
          color: '#f2ede4',
          fontSize: 22,
          fontWeight: 700,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          letterSpacing: '-0.05em',
        }}
      >
        G
      </div>
    ),
    size,
  );
}
