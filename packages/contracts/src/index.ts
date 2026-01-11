/**
 * Contracts package for L-Osiris NFC Platform
 * 
 * This package contains:
 * - OpenAPI specifications (openapi/public-v1.yaml, openapi/internal-v1.yaml)
 * - Event schemas (events/event-envelope.schema.json)
 */

export const CONTRACTS_VERSION = '0.1.0';

export const EVENT_TYPES = {
  NFC_TAG_SCANNED: 'nfc.tag.scanned',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  ENTRY_CREATED: 'entry.created',
  ENTRY_UPDATED: 'entry.updated',
} as const;