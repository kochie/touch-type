export default function myImageLoader({ src, width, quality }) {
    return `file:///${src}?w=${width}&q=${quality || 75}`;
  }