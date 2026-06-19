import { z } from 'zod';

export const bugIntakeSchema = z.object({
  contractVersion: z.literal('1.0.0'),
  source: z.enum(['email', 'chat']),
  messageId: z.string().min(1),
  receivedAt: z.string().min(1),
  reporter: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
  bug: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(8000),
    stepsToReproduce: z.array(z.string()).optional(),
    expectedBehavior: z.string().optional(),
    actualBehavior: z.string().optional(),
    severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    component: z.enum(['frontend', 'backend', 'fullstack', 'unknown']).optional(),
    affectedArea: z.string().optional(),
    environment: z.string().optional(),
  }),
  metadata: z.object({
    emailSubject: z.string().min(1),
    rawEmailSnippet: z.string().optional(),
    labels: z.array(z.string()).optional(),
    externalTicketId: z.string().nullable().optional(),
  }),
});

export const approveRunSchema = z.object({
  approvedBy: z.string().email(),
  comment: z.string().optional(),
  createPr: z.boolean().optional().default(false),
});

export const rejectRunSchema = z.object({
  rejectedBy: z.string().email(),
  reason: z.string().optional(),
});

export const createPrSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  draft: z.boolean().optional().default(false),
});

export const cancelRunSchema = z.object({
  cancelledBy: z.string().email(),
  reason: z.string().optional(),
});
