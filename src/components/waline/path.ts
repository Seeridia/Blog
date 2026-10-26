/**
 * Waline 用 path 区分页面。博客统一使用无尾斜杠路径，
 * 根路径保留 `/`，例如避免 `/links` 与 `/links/` 被当成两篇文章。
 */
export const normalizeWalinePath = (pathname: string): string => {
  const pathOnly = pathname.split(/[?#]/u, 1)[0] || '/'

  return pathOnly === '/' ? '/' : pathOnly.replace(/\/+$/u, '')
}
