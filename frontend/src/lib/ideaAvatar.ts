const AVATAR_COLOR_CLASSES = ['bg-primary', 'bg-teal', 'bg-amber']

/** Ideas' avatar initial/color were the only per-submitter styling stored in mocks/ideas.ts —
 * derived here instead, now that submitters come from the backend (which has no concept of an
 * avatar color). Shared by IdeasBrowsePage and IdeaDetailPage. */
export function avatarColorClass(submitterName: string): string {
  const index = submitterName.charCodeAt(0) % AVATAR_COLOR_CLASSES.length
  return AVATAR_COLOR_CLASSES[index]
}
