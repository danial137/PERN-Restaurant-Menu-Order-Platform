/** Build O(n) category lookup and sort once. Ideal for transforming API menu payloads. */
export function groupMenu(products, categories) {
  const byId = new Map(categories.map(category => [category.id, { ...category, products: [] }]));
  for (const product of products) {
    if (!product.active) continue;
    byId.get(product.categoryId)?.products.push(product);
  }
  return [...byId.values()].sort((a, b) => a.position - b.position);
}
/** Stable order, token based filtering. O(n*m) for n items and m keywords. */
export function searchMenu(items, query) {
  const tokens = query.trim().toLocaleLowerCase('fa').split(/\s+/).filter(Boolean);
  if (!tokens.length) return items;
  return items.filter(item => tokens.every(t => `${item.name} ${item.description ?? ''}`.toLocaleLowerCase('fa').includes(t)));
}
