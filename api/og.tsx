import { ImageResponse } from '@vercel/og';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // ?title=<title>
    const title = searchParams.get('title') || 'Manuale Civ';
    const description = searchParams.has('description') ? searchParams.get('description') : 'Age of Empires 4 Guides';
    const image = searchParams.get('image') || 'https://aoe4guide.it/header-bg.png';
    const subtitle = searchParams.has('subtitle') ? searchParams.get('subtitle') : '';

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
            backgroundColor: '#121214',
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.7)), url("${image}")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Main Container with Glassmorphism effect for content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '40px 60px',
              borderRadius: '24px',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              maxWidth: '90%',
              textAlign: 'center',
            }}
          >
            {subtitle && (
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 'bold',
                  color: '#d4af37',
                  textTransform: 'uppercase',
                  letterSpacing: 6,
                  marginBottom: 16,
                }}
              >
                {subtitle}
              </div>
            )}
            <div
              style={{
                fontSize: 64,
                fontWeight: 'bold',
                color: 'white',
                lineHeight: 1.1,
                marginBottom: description ? 24 : 0,
              }}
            >
              {title}
            </div>
            {description && (
              <div
                style={{
                  fontSize: 32,
                  color: '#e5e7eb',
                  lineHeight: 1.4,
                }}
              >
                {description}
              </div>
            )}
          </div>

          {/* Logo Branding */}
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: 60,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#d4af37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: 'black',
                fontSize: 22,
              }}
            >
              M
            </div>
            <div style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>
              Manuale Civ
            </div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 40,
              right: 60,
              color: '#9ca3af',
              fontSize: 18,
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
