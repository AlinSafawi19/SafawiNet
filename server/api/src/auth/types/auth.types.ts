import { Request } from 'express';

/**
 * JWT payload structure from the authentication token
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  iat: number; // Issued at
  exp: number; // Expires at
  type: 'access' | 'refresh';
  familyId?: string;
  sessionId?: string;
}

/**
 * Extended Express Request with authenticated user information
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

/**
 * Request body for revoking all user sessions
 */
export interface RevokeUserSessionsBody {
  reason?: string;
}

/**
 * Response for revoke operations
 */
export interface RevokeResponse {
  revokedCount: number;
  message: string;
}

/**
 * Security audit information response
 */
export interface SecurityAuditInfo {
  activeSessions: number;
  totalSessions: number;
  lastLogin: Date | null;
  suspiciousActivity: boolean;
}

/**
 * Session information for API responses
 */
export interface SessionResponse {
  id: string;
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;
  location?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  isCurrent: boolean;
  lastActiveAt: string; // ISO date string for API responses
  createdAt: string; // ISO date string for API responses
}

/**
 * Paginated sessions response
 */
export interface PaginatedSessionsResponse {
  sessions: SessionResponse[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Notification metadata for security alerts
 */
export interface SecurityAlertMetadata {
  sessionId?: string;
  action?: string;
  revokedCount?: number;
  [key: string]: unknown;
}
