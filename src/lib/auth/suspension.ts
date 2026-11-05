export function isAccountSuspended(user: { banned_until?: string }): boolean {
  return Boolean(user.banned_until && Date.parse(user.banned_until) > Date.now());
}
