import { createClient } from '@supabase/supabase-js';

export const config = {
  runtime: 'edge',
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export default async function handler(req: Request) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path') || '';
    
    // Extract civId and boId from path (e.g., /civ/english/buildorders?bo=bo-123)
    const [cleanPath] = path.split('?');
    const civMatch = cleanPath.match(/^\/civ\/([^/]+)/);
    const civId = civMatch ? civMatch[1] : '';
    
    // Try to get boId from the main URL params (added by Vercel rewrite) or the path part
    let boId = url.searchParams.get('bo');
    if (!boId) {
      const params = new URLSearchParams(path.split('?')[1] || '');
      boId = params.get('bo');
    }

    let title = 'Manuale Civ - AoE4 Guides';
    let description = 'Build order, civiltà e strategie per Age of Empires 4.';
    let image = 'https://manualeciv.it/header-bg.png';
    let subtitle = '';

    if (civId) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      // Fetch civ data
      const { data: civ } = await supabase
        .from('civilizations')
        .select('name, flag, short_description, build_orders')
        .eq('id', civId)
        .single();

      if (civ) {
        title = `Guida Civiltà ${civ.name}`;
        description = (civ as any).short_description || `Strategie e build orders per ${civ.name}.`;
        image = civ.flag;
        subtitle = 'Guida Civiltà';

        if (boId && (civ as any).build_orders) {
          const bo = ((civ as any).build_orders as any[]).find(b => b.id === boId);
          if (bo) {
            title = `Build Order ${civ.name}: ${bo.title}`;
            description = bo.description || `Migliora il tuo gioco con questa build order per ${civ.name}.`;
            if (bo.banner_url) image = bo.banner_url;
            subtitle = 'Build Order';
          }
        }
      }
    }

    // Generate dynamic OG image URL
    const base = url.origin;
    
    // Prefer .png for flags if it's a relative path from public/civs
    let finalImage = image;
    if (!image.startsWith('http') && image.startsWith('/civs/') && image.endsWith('.webp')) {
      finalImage = image.replace('.webp', '.png');
    }
    
    const encodedImage = finalImage.startsWith('http') ? finalImage : `${base}${finalImage}`;
    const ogImageUrl = new URL(`${base}/api/og`);
    ogImageUrl.searchParams.set('title', title.replace(' | Manuale Civ', ''));
    ogImageUrl.searchParams.set('description', description.length > 100 ? description.substring(0, 97) + '...' : description);
    ogImageUrl.searchParams.set('image', encodeURI(encodedImage));
    if (subtitle) ogImageUrl.searchParams.set('subtitle', subtitle);

    const finalImageUrl = ogImageUrl.toString();

    // Return minimal HTML for bots
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <meta name="description" content="${description}" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="${title}" />
          <meta property="og:description" content="${description}" />
          <meta property="og:image" content="${finalImageUrl}" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${title}" />
          <meta name="twitter:description" content="${description}" />
          <meta name="twitter:image" content="${finalImageUrl}" />
          <meta http-equiv="refresh" content="0;url=${path}" />
        </head>
        <body>
          Se non vieni reindirizzato, <a href="${path}">clicca qui</a>.
        </body>
      </html>`,
      {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 's-maxage=3600, stale-while-revalidate',
        },
      }
    );
  } catch (e) {
    console.error(e);
    return new Response('Error generating SEO tags', { status: 500 });
  }
}
