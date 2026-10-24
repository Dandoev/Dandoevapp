'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong - DandoEv</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', backgroundColor: '#F8FAFC', color: '#0F172A' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: '#EEF2F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', color: '#0A154F', marginBottom: '24px' }}>
            !
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', color: '#0A154F' }}>
            Something went wrong
          </h1>
          <p style={{ maxWidth: '420px', color: '#475569', fontSize: '14px', lineHeight: '1.6', marginBottom: '32px' }}>
            An unexpected error occurred. Please try refreshing or return to the main application.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: '#0A154F',
                color: '#FFFFFF',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#0A154F',
                border: '1px solid #CBD5E1',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              Back to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
