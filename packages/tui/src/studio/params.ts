import { StudioProtocolError } from './errors.js';

export function requireRecord(value: unknown, label = 'params'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new StudioProtocolError(-32602, `${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new StudioProtocolError(-32602, `${field} must be a non-empty string.`);
  }
  return value;
}

export function requireSessionIdParam(params: unknown): string {
  return requireText(requireRecord(params).sessionId, 'sessionId');
}
