import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'section',
  'article',
  'div',
  'span',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'img',
  'video',
  'source',
  'a',
  'figure',
  'figcaption',
  'blockquote',
  'hr',
  'br',
];

const allowedAttributes: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
  video: ['src', 'poster', 'controls', 'preload', 'muted', 'loop', 'autoplay'],
  source: ['src', 'type'],
  '*': ['class', 'id', 'style', 'data-*'],
};

export function sanitizeExhibitionHtml(raw: string | null | undefined) {
  if (!raw) {
    return '';
  }

  return sanitizeHtml(raw, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'data'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  });
}
