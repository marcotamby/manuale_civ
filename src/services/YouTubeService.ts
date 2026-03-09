import youtubeData from '../data/youtube_videos.json';

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
}

export async function fetchRecentVideos(): Promise<YouTubeVideo[]> {
  try {
    const channelId = 'UC3u3yk6Hk7SSDsbz6Nw-BXg';
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    
    // Lista di base dai video storici (JSON)
    const baseVideos: YouTubeVideo[] = youtubeData;
    const seenIds = new Set(baseVideos.map(v => v.id));

    // Prova a recuperare video recentissimi via RSS per integrare il JSON
    try {
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`);
      if (response.ok) {
        const data = await response.json();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.contents, "text/xml");
        const entries = xmlDoc.getElementsByTagName("entry");
        
        const recentVideos: YouTubeVideo[] = [];
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const id = entry.getElementsByTagName("yt:videoId")[0]?.textContent || "";
          const title = entry.getElementsByTagName("title")[0]?.textContent || "";
          if (id && !seenIds.has(id)) {
            recentVideos.push({
              id,
              title,
              thumbnail: `https://img.youtube.com/vi/${id}/mqdefault.jpg`
            });
          }
        }
        // Ritorna i nuovi video seguiti da quelli nel JSON
        return [...recentVideos, ...baseVideos];
      }
    } catch (rssError) {
      console.warn("RSS feed non disponibile, uso solo il database JSON:", rssError);
    }
    
    return baseVideos;
  } catch (error) {
    console.error("Errore nel recupero dei video da YouTube:", error);
    return youtubeData;
  }
}

