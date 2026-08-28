export function buildIdempotencyScope(
  operation: string,
  businessSlug: string,
  idempotencyKey: string,
): string {
  return `${operation}:${businessSlug}:${idempotencyKey}`;
}
