/** Gravatar URL for an email (SHA-256, trimmed + lowercased). */
export async function gravatarUrl(email: string, size = 64): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon&r=g`;
}
