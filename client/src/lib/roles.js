export function homeFor(user) {
  const role = typeof user === 'string' ? user : user?.role
  if (role === 'PROVIDER') {
    const org = typeof user === 'object' ? user?.organization : null
    if (!org?.profileSubmitted || org.verificationStatus !== 'APPROVED') return '/org/profile'
    return '/org'
  }
  if (role === 'ADMIN') return '/admin'
  return '/dashboard'
}
