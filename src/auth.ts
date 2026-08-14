export function isAuthorized(opts: {
  allowAllUsers: boolean
  allowedUserIds: number[]
  userId?: number
}): boolean {
  if (opts.allowAllUsers) return true
  if (opts.userId === undefined) return false
  return opts.allowedUserIds.includes(opts.userId)
}
