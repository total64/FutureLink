export function homeFor(role) {
  if (role === 'PROVIDER') return '/org'
  if (role === 'ADMIN') return '/admin'
  return '/dashboard'
}
