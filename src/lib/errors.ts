interface PostgresErrorLike {
  code?: unknown
  message?: unknown
}

function isPostgresErrorLike(error: unknown): error is PostgresErrorLike {
  return typeof error === 'object' && error !== null
}

export function getErrorCode(error: unknown): string | null {
  if (!isPostgresErrorLike(error) || typeof error.code !== 'string') return null
  return error.code
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (isPostgresErrorLike(error) && typeof error.message === 'string') return error.message
  return 'No pudimos completar la operación.'
}
