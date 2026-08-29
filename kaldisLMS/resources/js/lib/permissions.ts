import type { SessionUser } from '@/types'

export function hasPermission(user: SessionUser | null | undefined, slug: string): boolean {
  if (!user) return false
  if (user.role_slug === 'admin') return true
  return user.permissions.includes(slug)
}

export function hasAnyPermission(user: SessionUser | null | undefined, slugs: string[]): boolean {
  return slugs.some((s) => hasPermission(user, s))
}
