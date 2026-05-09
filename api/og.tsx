import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // ?title=<title>
    const title = searchParams.get('title') || 'Manuale Civ';
    const description = searchParams.get('description') || 'Age of Empires 4 Guides';
    const image = searchParams.get('image') || 'https://manualeciv.it/header-bg.png';
    const subtitle = searchParams.get('subtitle') || '';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0b',
            backgroundImage: `radial-gradient(circle at center, rgba(10, 10, 11, 0.5) 0%, rgba(10, 10, 11, 0.9) 100%), url("${image}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Decorative Border */}
          <div
            style={{
              position: 'absolute',
              inset: 20,
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 20,
            }}
          />

          {/* Logo Area */}
          <div
            style={{
              position: 'absolute',
              top: 60,
              left: 80,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: '#d4af37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: 'black',
                fontSize: 28,
                boxShadow: '0 4px 12px rgba(212, 175, 55, 0.3)',
              }}
            >
              M
            </div>
            <div style={{ color: 'white', fontSize: 28, fontWeight: 'bold', letterSpacing: -0.5 }}>
              Manuale Civ
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 80px',
              textAlign: 'center',
            }}
          >
            {subtitle && (
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: '#d4af37',
                  textTransform: 'uppercase',
                  letterSpacing: 4,
                  marginBottom: 20,
                }}
              >
                {subtitle}
              </div>
            )}
            <div
              style={{
                fontSize: 72,
                fontWeight: 'bold',
                color: 'white',
                lineHeight: 1.1,
                marginBottom: 30,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 32,
                color: '#9ca3af',
                maxWidth: 800,
                lineHeight: 1.4,
              }}
            >
              {description}
            </div>
          </div>

          {/* Bottom Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              right: 60,
              display: 'flex',
              padding: '10px 24px',
              backgroundColor: 'rgba(212, 175, 55, 0.15)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: 100,
              color: '#d4af37',
              fontSize: 20,
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            Age of Empires IV
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
