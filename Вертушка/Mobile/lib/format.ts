const ARTIST_DISCRIMINATOR_RE = /\s*\(\d+\)\s*$/;

export function cleanArtistName(name: string | null | undefined): string {
  if (!name) return '';
  return name.replace(ARTIST_DISCRIMINATOR_RE, '').trim();
}
