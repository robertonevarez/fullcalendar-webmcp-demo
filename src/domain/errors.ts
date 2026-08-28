export const ErrorCodes = {
  BUSINESS_NOT_FOUND: 'BUSINESS_NOT_FOUND',
  SERVICE_NOT_FOUND: 'SERVICE_NOT_FOUND',
  OUTSIDE_SERVICE_AREA: 'OUTSIDE_SERVICE_AREA',
  LOCATION_REQUIRED: 'LOCATION_REQUIRED',
  INVALID_TIME_RANGE: 'INVALID_TIME_RANGE',
  NO_AVAILABILITY: 'NO_AVAILABILITY',
  SLOT_UNAVAILABLE: 'SLOT_UNAVAILABLE',
  RESOURCE_UNAVAILABLE: 'RESOURCE_UNAVAILABLE',
  APPOINTMENT_NOT_FOUND: 'APPOINTMENT_NOT_FOUND',
  APPOINTMENT_NOT_RESCHEDULABLE: 'APPOINTMENT_NOT_RESCHEDULABLE',
  APPOINTMENT_ALREADY_CANCELLED: 'APPOINTMENT_ALREADY_CANCELLED',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly retryable = false,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function toErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      ok: false as const,
      error: {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
        field: error.field,
      },
    };
  }
  return {
    ok: false as const,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
      retryable: true,
    },
  };
}

export function ok<T>(data: T) {
  return { ok: true as const, data };
}
