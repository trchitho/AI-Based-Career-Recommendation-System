export function joinUrl(base: string | undefined, path: string): string {
  const normalizedBase = (base || window.location.origin).replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
}
