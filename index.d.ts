// Copyright 2026 Quantova Inc
// SPDX-License-Identifier: Apache-2.0 OR MIT

export type RecordType = 'registration' | 'declaration' | 'acknowledgement' | 'review';
export type Role = 'ethics' | 'declarant' | 'reviewer';

export interface Envelope {
  format: 'qdeclare/1';
  type: RecordType;
  algorithm: 'ML-DSA-65';
  signer: { id: string; publicKey: string };
  statement: Record<string, unknown>;
  signature: string;
  anchor?: unknown;
}

export interface KeyDescription {
  format: 'qdeclare-key/1';
  algorithm: 'ML-DSA-65';
  id: string;
  publicKey: string;
}

export type KeyRef = string | Uint8Array | KeyDescription;

export interface RegistrationOptions {
  key: Uint8Array;
  declarantKeyId: KeyRef;
  office: string;
  legalBasis: string;
  registeredAt?: string;
  note?: string;
}

export interface DeclarationOptions {
  key: Uint8Array;
  registration: Envelope;
  period: string;
  contentDigest?: string;
  content?: Uint8Array;
  contentSize?: number;
  corrects?: string;
  reason?: string;
  previous?: Envelope;
  first?: boolean;
  filedAt?: string;
  note?: string;
}

export interface AcknowledgementOptions {
  key: Uint8Array;
  declaration: Envelope;
  deadline: string;
  acknowledgedAt?: string;
  note?: string;
}

export interface ReviewOptions {
  key: Uint8Array;
  declaration: Envelope;
  outcomeDigest?: string;
  outcome?: Uint8Array;
  reviewedAt?: string;
  note?: string;
}

export interface VerifyOptions {
  type: RecordType;
  ethicsKeys?: KeyRef[];
  declarantKeys?: KeyRef[];
  reviewerKeys?: KeyRef[];
  records?: Envelope[];
  allSupplied?: boolean;
  party?: { field: string; identity: string; salt: Uint8Array };
  contentDigest?: string;
  content?: Uint8Array;
  outcomeDigest?: string;
  outcome?: Uint8Array;
  requireAnchor?: boolean;
  at?: string;
  maxAnchorDelay?: number;
  maxAnchorLookups?: number;
  keyStatus?: (keyId: string) => unknown;
  rpc?: string | string[];
  client?: unknown;
  clients?: Array<string | unknown>;
  trustSingleEndpoint?: boolean;
  trustCustomEndpoints?: boolean;
  allowLoopback?: boolean;
  endpointAllowList?: string[];
  expectedSender?: string | string[];
  contract?: string;
  trustCustomContract?: boolean;
}

export interface VerifyCheck {
  name: string;
  ok: boolean;
  detail: string;
  transport: boolean;
  indeterminate: boolean;
}

export interface VerifyResult {
  valid: boolean;
  status: 'valid' | 'invalid' | 'indeterminate';
  type: RecordType | null;
  checks: VerifyCheck[];
  endpoints: string[];
  officialEndpoints: boolean | null;
  notices: string[];
  facts: Record<string, unknown>;
  [field: string]: unknown;
}

export interface AnchorOptions {
  seed: Uint8Array;
  index: number;
  network?: 'testnet';
  rpc?: string | string[];
  client?: unknown;
  clients?: Array<string | unknown>;
  trustSingleEndpoint?: boolean;
  allowLoopback?: boolean;
  endpointAllowList?: string[];
  meter?: number;
  maxFee?: string | number;
  timeoutMs?: number;
  onPending?: (pending: unknown) => void | Promise<void>;
}

export function generateKey(): Uint8Array;
export function publicKey(key: Uint8Array): Uint8Array;
export function keyId(key: Uint8Array): string;
export function describeKey(key: Uint8Array): KeyDescription;
export function commitParty(identity: string, options?: { salt?: Uint8Array; secret?: Uint8Array; scope?: string }): { salt: Uint8Array; ref: string };
export function registration(options: RegistrationOptions): Envelope;
export function declaration(options: DeclarationOptions): Envelope;
export function acknowledgement(options: AcknowledgementOptions): Envelope;
export function review(options: ReviewOptions): Envelope;
export function create(type: RecordType, options: Record<string, unknown>): Envelope;
export function anchor(envelopes: Envelope | Envelope[], options: AnchorOptions): Promise<Envelope[]>;
export function complete(envelopes: Envelope | Envelope[], pending: unknown, options?: { rpc?: string | string[]; client?: unknown; clients?: Array<string | unknown>; trustSingleEndpoint?: boolean; allowLoopback?: boolean; endpointAllowList?: string[]; timeoutMs?: number }): Promise<Envelope[]>;
export function verify(envelope: unknown, options: VerifyOptions): Promise<VerifyResult>;
export function refOf(envelope: Envelope): string;
export function anchorDigest(envelope: Envelope): string;
export const FORMAT: 'qdeclare/1';
export const ALGORITHM: 'ML-DSA-65';
export const KIND: 1104;
export const TYPES: readonly RecordType[];
export const ROLES: readonly Role[];
