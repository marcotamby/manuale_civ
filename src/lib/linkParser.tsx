import React from 'react';

/**
 * Parses a string and converts markdown links like [Text](url) and plain URLs into clickable React anchor tags.
 */
export function renderTextWithLinks(text: string): React.ReactNode {
  if (!text) return null;

  // Match either [markdown label](url) OR a plain HTTP/S URL
  const regex = /\[([^\]]+)\]\(([^\s)]+)\)|(https?:\/\/[^\s<>]+)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    const [, markdownLabel, markdownUrl, plainUrl] = match;

    // Push text before the match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    if (plainUrl) {
      parts.push(
        <a
          key={key++}
          href={plainUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-cyan-400 hover:text-cyan-300 transition-colors break-all"
        >
          {plainUrl}
        </a>
      );
    } else if (markdownLabel && markdownUrl) {
      const isInternal = markdownUrl.startsWith('/');
      let href = markdownUrl;
      if (!isInternal && !/^https?:\/\//i.test(markdownUrl)) {
        href = `https://${markdownUrl}`;
      }
      parts.push(
        <a
          key={key++}
          href={href}
          target={isInternal ? undefined : "_blank"}
          rel={isInternal ? undefined : "noopener noreferrer"}
          className="underline text-cyan-400 hover:text-cyan-300 transition-colors font-bold"
        >
          {markdownLabel}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
