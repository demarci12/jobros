export function getMagicLinkRedirectTo() {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
}
