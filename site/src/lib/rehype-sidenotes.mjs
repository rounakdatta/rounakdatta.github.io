// Markdown footnotes ([^1]) become margin notes, Tufte style: beside the line they explain on a
// wide screen, and opened in place by tapping the number on a narrow one. A footnote at the
// bottom of a long note made the reader jump away and back; the note belongs where it's read.
//
// Markup (all phrasing content, so it is valid inside the paragraph it annotates):
//   <span class="sidenote-anchor">
//     <input type="checkbox" id="sn-1" class="sidenote-toggle" aria-label="Show note">
//     <label for="sn-1" class="sidenote-number"></label>
//     <span class="sidenote" role="note"><span class="sidenote-mark"></span> …</span>
//   </span>
// The input comes first so its focus ring can show on the number, and the numbers come from a
// CSS counter shared with the <Sidenote> MDX component.

import { createHash } from 'node:crypto';

const el = (tagName, properties, children = []) => ({ type: 'element', tagName, properties, children });
const text = (value) => ({ type: 'text', value });

const hasProp = (node, name) => node?.properties && (name in node.properties);

function findAll(node, test, out = []) {
  if (test(node)) out.push(node);
  for (const child of node.children ?? []) findAll(child, test, out);
  return out;
}

const textOf = (node) => (node.type === 'text' ? node.value : (node.children ?? []).map(textOf).join(' '));

/**
 * A footnote's content as inline nodes: paragraphs joined by line breaks, back-links removed.
 * A list or code block can't live inside the sentence it annotates, so it is kept as plain text.
 */
function inlineContent(li) {
  const parts = [];
  for (const block of li.children ?? []) {
    if (block.type !== 'element') continue;
    const inline = block.tagName === 'p' ? block.children : [text(textOf(block).replace(/\s+/g, ' ').trim())];
    const kids = inline.filter(
      (k) => !(k.type === 'element' && k.tagName === 'a' && hasProp(k, 'dataFootnoteBackref')),
    );
    if (parts.length) parts.push(el('br', {}));
    parts.push(...kids);
  }
  // Drop the space left before a removed back-link.
  const last = parts.at(-1);
  if (last?.type === 'text') last.value = last.value.replace(/\s+$/, '');
  return parts;
}

export default function rehypeSidenotes() {
  return (tree, file) => {
    // Several documents can share a page (the home page renders two), so ids carry the document's.
    const doc = createHash('sha1').update(String(file?.path ?? '')).digest('hex').slice(0, 6);
    const section = findAll(tree, (n) => n.type === 'element' && n.tagName === 'section' && hasProp(n, 'dataFootnotes'))[0];
    if (!section) return;

    const notes = new Map();
    for (const li of findAll(section, (n) => n.type === 'element' && n.tagName === 'li')) {
      notes.set(String(li.properties.id), inlineContent(li));
    }

    let number = 0;
    const replaceRefs = (parent) => {
      if (!parent.children) return;
      parent.children = parent.children.map((node) => {
        const link = node.type === 'element' && node.tagName === 'sup' ? node.children?.find((c) => hasProp(c, 'dataFootnoteRef')) : null;
        if (!link) {
          replaceRefs(node);
          return node;
        }
        const id = decodeURIComponent(String(link.properties.href).slice(1));
        const content = notes.get(id);
        if (!content) return node;
        number += 1;
        const key = `sn-${doc}-${number}`;
        return el('span', { className: ['sidenote-anchor'] }, [
          el('input', { type: 'checkbox', id: key, className: ['sidenote-toggle'], ariaLabel: 'Show note' }),
          el('label', { htmlFor: key, className: ['sidenote-number'] }),
          el('span', { className: ['sidenote'], role: 'note' }, [
            el('span', { className: ['sidenote-mark'], ariaHidden: 'true' }),
            text(' '),
            ...content,
          ]),
        ]);
      });
    };
    replaceRefs(tree);

    // Every footnote now lives beside its line; the list at the bottom would only repeat them.
    const removeSection = (parent) => {
      if (!parent.children) return;
      parent.children = parent.children.filter((c) => c !== section);
      parent.children.forEach(removeSection);
    };
    removeSection(tree);
  };
}
