import { useMemo, memo } from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  jsonLd?: object;
  subtitle?: string;
}

export const SEO = memo(({ 
  title = 'Manuale Civ - Age of Empires 4 Guides', 
  description = 'Il manuale definitivo per Age of Empires 4. Build order, civiltà, strategie e molto altro.',
  image = 'https://manualeciv.it/header-bg.png', 
  url = 'https://manualeciv.it',
  type = 'website',
  jsonLd,
  subtitle
}: SEOProps) => {
  const siteTitle = title.includes('Manuale Civ') ? title : `${title} | Manuale Civ`;

  // Dynamic OG image URL - Memoized for performance
  const finalImageUrl = useMemo(() => {
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : 'https://manualeciv.it';
      const ogImageUrl = new URL(`${base}/api/og`);
      ogImageUrl.searchParams.set('title', title.replace(' | Manuale Civ', ''));
      ogImageUrl.searchParams.set('description', description.length > 100 ? description.substring(0, 97) + '...' : description);
      ogImageUrl.searchParams.set('image', image.startsWith('http') ? image : `${base}${image}`);
      if (subtitle) ogImageUrl.searchParams.set('subtitle', subtitle);
      return ogImageUrl.toString();
    } catch (e) {
      return image.startsWith('http') ? image : `https://manualeciv.it${image}`;
    }
  }, [title, description, image, subtitle]);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{siteTitle}</title>
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : url} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={finalImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={typeof window !== 'undefined' ? window.location.href : url} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={finalImageUrl} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
});
