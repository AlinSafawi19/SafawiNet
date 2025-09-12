/**
 * JWT payload interface for authentication tokens
 */
export interface JwtPayload {
  sub: string;
  email: string;
  verified: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Type guard to check if a value is a valid JWT payload
 */
export function isJwtPayload(payload: unknown): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as JwtPayload).sub === 'string' &&
    typeof (payload as JwtPayload).email === 'string' &&
    typeof (payload as JwtPayload).verified === 'boolean'
  );
}
