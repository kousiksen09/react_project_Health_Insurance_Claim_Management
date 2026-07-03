import { z } from 'zod';

const adoWorkItemRefSchema = z.object({
  workItemId: z.number().int().positive(),
  workItemType: z.string().min(1),
  workItemUrl: z.string().min(1),
  organization: z.string().min(1),
  project: z.string().min(1),
  areaPath: z.string().optional(),
  iterationPath: z.string().optional(),
  tags: z.array(z.string()).optional(),
  state: z.string().min(1),
});

export const bugIntakeSchema = z.object({
  contractVersion: z.enum(['1.0.0', '1.1.0']),
  type: z.literal('bug').optional(),
  source: z.enum(['email', 'chat', 'ado']),
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
    ado: adoWorkItemRefSchema.optional(),
  }),
});

export const pbiIntakeSchema = z.object({
  contractVersion: z.literal('1.1.0'),
  type: z.literal('pbi'),
  source: z.literal('ado'),
  messageId: z.string().min(1),
  receivedAt: z.string().min(1),
  reporter: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
  ado: adoWorkItemRefSchema,
  pbi: z.object({
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(20000),
    acceptanceCriteria: z.string().optional(),
    storyPoints: z.number().optional(),
    priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    assignedTo: z.object({ email: z.string().email(), name: z.string().optional() }).optional(),
  }),
  metadata: z.object({
    adoEventType: z.string().min(1),
    rawWebhookSnippet: z.string().optional(),
    labels: z.array(z.string()).optional(),
  }),
});

/**
 * Discriminated on `type`. Existing bug payloads without a `type` field default to
 * 'bug' at the route layer before validation (see runs.ts) to stay backwards compatible.
 */
export const workItemIntakeSchema = z.union([bugIntakeSchema, pbiIntakeSchema]);

export const approveRunSchema = z.object({
  approvedBy: z.string().email(),
  comment: z.string().optional(),
  createPr: z.boolean().optional().default(false),
});

export const rejectRunSchema = z.object({
  rejectedBy: z.string().email(),
  reason: z.string().optional(),
});

export const approvePlanSchema = z.object({
  approvedBy: z.string().email(),
  comment: z.string().optional(),
});

export const rejectPlanSchema = z.object({
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

export const deployStatusSchema = z.object({
  status: z.enum(['in_progress', 'succeeded', 'failed']),
  environment: z.string().optional(),
  url: z.string().optional(),
  pipelineRunUrl: z.string().optional(),
  note: z.string().optional(),
});

export const uatApproveSchema = z.object({
  approvedBy: z.string().email(),
  comment: z.string().optional(),
});

export const uatRejectSchema = z.object({
  rejectedBy: z.string().email(),
  reason: z.string().optional(),
});

/** Shape the planning agent must emit inside a <PLAN>...</PLAN> fence. Validated before any code is written. */
export const workItemPlanSchema = z.object({
  summary: z.string().min(1),
  acceptanceCriteria: z
    .array(
      z.object({
        id: z.string().min(1),
        given: z.string().min(1),
        when: z.string().min(1),
        then: z.string().min(1),
      }),
    )
    .min(1),
  affectedAreas: z.array(z.object({ layer: z.string().min(1), path: z.string().min(1) })),
  tasks: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        layer: z.enum(['frontend', 'backend', 'db', 'infra', 'other']),
        files: z.array(z.string()),
        changeType: z.enum(['add', 'modify', 'delete']),
        estimateLoc: z.number().nonnegative(),
        dependsOn: z.array(z.string()).default([]),
      }),
    )
    .min(1),
  edgeCases: z.array(z.string()).min(1),
  scenarioCoverage: z
    .array(
      z.object({
        acId: z.string(),
        edgeCase: z.string(),
        covered: z.boolean(),
        note: z.string().optional(),
      }),
    )
    .default([]),
  risks: z.array(z.object({ level: z.enum(['high', 'med', 'low']), text: z.string().min(1) })).default([]),
  openQuestions: z.array(z.string()).default([]),
  outOfScope: z.array(z.string()).default([]),
  requiresMigration: z.boolean().default(false),
  requiresApiContractChange: z.boolean().default(false),
  estimatedTotalLoc: z.number().nonnegative(),
  releaseImpact: z.enum(['patch', 'minor', 'major']).default('patch'),
});
