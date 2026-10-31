// An image alone in its paragraph is a figure, and its markdown title is the caption:
//
//   ![What the photo shows, for someone who can't see it](photo.jpg "What I want to say about it")
//
// Notes used to hand-write <figure><img src="/images/…"> in HTML, which skipped Astro's image
// pipeline (so readers downloaded 4624px originals) and had no alt text at all.

const isBlank = (node) => node.type === 'text' && !node.value.trim();

// Astro hands an image node's properties to getImage(), so these decide what a reader downloads.
// Without them a note's photos were WebP at sizes up to their full 1500px, though the reading
// column is never wider than about 46rem (750px).
const PROSE_IMAGE = {
  format: 'avif',
  quality: 60,
  widths: [480, 800, 1200, 1600],
  sizes: '(max-width: 34rem) calc(100vw - 2.2rem), 46rem',
};

const isLocalImage = (node) =>
  node.tagName === 'img' && typeof node.properties?.src === 'string' && !/^(https?:)?\/\//.test(node.properties.src);

export default function rehypeFigure() {
  return (tree) => {
    // A photo among a note's opening blocks is the largest thing on its first screen: fetch it at
    // once. Further down, photos stay lazy, so nobody pays for what they never scroll to.
    let first = true;
    const prepare = (img, nearTop) => {
      Object.assign(img.properties, PROSE_IMAGE);
      if (first && nearTop) Object.assign(img.properties, { loading: 'eager', fetchpriority: 'high' });
      first = false;
    };
    const walk = (parent, nearTop) => {
      if (!parent.children) return;
      let block = 0;
      parent.children = parent.children.map((node) => {
        const top = parent === tree ? node.type === 'element' && block++ < 3 : nearTop;
        if (node.type !== 'element') return node;
        if (isLocalImage(node)) prepare(node, top);
        if (node.tagName === 'p') {
          const content = node.children.filter((child) => !isBlank(child));
          const img = content[0];
          if (content.length === 1 && img.type === 'element' && img.tagName === 'img') {
            if (isLocalImage(img)) prepare(img, top);
            const caption = img.properties?.title;
            if (caption) delete img.properties.title;
            return {
              type: 'element',
              tagName: 'figure',
              properties: {},
              children: caption
                ? [img, { type: 'element', tagName: 'figcaption', properties: {}, children: [{ type: 'text', value: String(caption) }] }]
                : [img],
            };
          }
        }
        walk(node, top);
        return node;
      });
    };
    walk(tree, true);
  };
}
