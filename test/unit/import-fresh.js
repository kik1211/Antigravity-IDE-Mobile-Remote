export async function importFresh(relativePath, parentUrl = import.meta.url) {
  const url = new URL(relativePath, parentUrl);
  url.searchParams.set(
    'cacheBust',
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  return import(url.href);
}
