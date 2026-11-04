// Every link in the home page's own writing (content/home/) opens in a new tab, as Rounak wants:
// whoever follows one keeps the page they came from. Notes are written elsewhere and are left as
// they were. A screen reader hears that the tab is new, from the note the layout keeps for it.

export default function rehypeNewTab() {
  return (tree, file) => {
    if (!/[\\/]content[\\/]home[\\/]/.test(file.path ?? '')) return;
    const walk = (node) => {
      if (node.type === 'element' && node.tagName === 'a' && node.properties?.href) {
        Object.assign(node.properties, { target: '_blank', rel: ['noopener'], ariaDescribedBy: 'new-tab' });
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
