export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
}

export async function fetchRecentVideos(): Promise<YouTubeVideo[]> {
  try {
    const channelId = 'UC3u3yk6Hk7SSDsbz6Nw-BXg';
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    
    // Usiamo un proxy CORS pubblico affidabile per recuperare l'RSS feed in produzione
    // Se fallisce, restituiamo un array vuoto
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(data.contents, "text/xml");
    
    const entries = xmlDoc.getElementsByTagName("entry");
    const videos: YouTubeVideo[] = [];
    
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const id = entry.getElementsByTagName("yt:videoId")[0]?.textContent || "";
      const title = entry.getElementsByTagName("title")[0]?.textContent || "";
      const thumbnail = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
      
      if (id) {
        videos.push({ id, title, thumbnail });
      }
    }
    
    return videos;
  } catch (error) {
    console.error("Errore nel recupero dei video da YouTube:", error);
    return [];
  }
}
