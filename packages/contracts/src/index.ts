/**
 * @paygate/contracts - Data Transfer Contracts & Schemas
 * Powered by Zod schemas and OpenAPI 3.1 definitions
 */

import { z } from 'zod';

export const ProviderEnum = z.enum(['bkash', 'nagad', 'rocket', 'upay', 'cellfin']);
export type ProviderType = z.infer<typeof ProviderEnum>;

export const CreatePaymentRequestSchema = z.object({
  plan_id: z.string().min(1, 'plan_id is required'),
  order_id: z.string().min(1, 'order_id is required'),
  provider: ProviderEnum.optional().default('bkash'),
  callback_url: z.string().url().optional(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
});
export type CreatePaymentRequest = z.infer<typeof CreatePaymentRequestSchema>;

export const CreatePaymentResponseSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  amount_paisa: z.number().int().positive(),
  currency: z.literal('BDT'),
  reference: z.string().length(8),
  provider: ProviderEnum,
  wallet: z.object({
    provider: z.string(),
    number: z.string(),
    holder_name: z.string(),
  }),
  pay_url: z.string(),
  expires_at: z.string(),
});
export type CreatePaymentResponse = z.infer<typeof CreatePaymentResponseSchema>;

export const ConfirmPaymentClaimRequestSchema = z.object({
  trx_id: z.string().min(4).max(32),
});
export type ConfirmPaymentClaimRequest = z.infer<typeof ConfirmPaymentClaimRequestSchema>;

export const ConfirmPaymentClaimResponseSchema = z.object({
  outcome: z.enum(['matched', 'conflict', 'already_claimed', 'no_evidence', 'expired_claim']),
  status: z.enum(['confirming', 'paid', 'needs_review', 'expired']),
  message: z.string().optional(),
  error: z.string().optional(),
  attemptsRemaining: z.number().optional(),
  isLocked: z.boolean().optional(),
});
export type ConfirmPaymentClaimResponse = z.infer<typeof ConfirmPaymentClaimResponseSchema>;

export const SmsIngestRequestSchema = z.object({
  sender: z.string(),
  raw_sms: z.string().min(5),
  sim_slot: z.union([z.literal(1), z.literal(2)]).optional().default(1),
  client_msg_id: z.string().optional(),
});
export type SmsIngestRequest = z.infer<typeof SmsIngestRequestSchema>;

export const SmsIngestResponseSchema = z.object({
  received: z.boolean(),
  txnId: z.string().optional(),
  matchedPaymentId: z.string().optional(),
  error: z.string().optional(),
  details: z.string().optional(),
});
export type SmsIngestResponse = z.infer<typeof SmsIngestResponseSchema>;

export const WebhookPaidPayloadSchema = z.object({
  event: z.literal('payment.paid'),
  payment_id: z.string(),
  order_id: z.string(),
  amount_paisa: z.number().int().positive(),
  net_paisa: z.number().int().positive(),
  provider: ProviderEnum,
  trx_id: z.string(),
  reference: z.string(),
  paid_at: z.string(),
});
export type WebhookPaidPayload = z.infer<typeof WebhookPaidPayloadSchema>;

export const paygateOpenApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'PayGate MFS API',
    version: '4.0.0',
    description: 'Bangladeshi MFS Verifier Gateway API for bKash, Nagad, Rocket, Upay, and Cellfin',
  },
  servers: [
    { url: 'https://api.example.com', description: 'Production API' },
    { url: '/v1', description: 'Local Dev Gateway' },
  ],
  paths: {
    '/payments': {
      post: {
        summary: 'Create payment session',
        operationId: 'createPayment',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePaymentRequest' } } },
        },
        responses: {
          '201': {
            description: 'Payment created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePaymentResponse' } } },
          },
        },
      },
    },
    '/pay/{id}/confirm': {
      post: {
        summary: 'Confirm customer payment with TrxID',
        operationId: 'confirmPaymentClaim',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ConfirmPaymentClaimRequest' } } },
        },
        responses: {
          '200': {
            description: 'Matching evaluation result',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ConfirmPaymentClaimResponse' } } },
          },
        },
      },
    },
    '/sms/webhook': {
      post: {
        summary: 'Ingest forwarded SMS from Super Admin Android handset',
        operationId: 'ingestForwardedSms',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SmsIngestRequest' } } },
        },
        responses: {
          '200': {
            description: 'SMS parsed and matched',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SmsIngestResponse' } } },
          },
        },
      },
    },
  },
} as const;
