// Lesson checks can stand on their own; a theory link is optional, not fabricated.
export function isCheckAvailable(check, theories) {
  if (check.deleted) return false;
  if (!check.theoryId) return check.lessonIds?.length > 0;
  return theories.some((t) => t.id === check.theoryId && !t.deleted);
}
