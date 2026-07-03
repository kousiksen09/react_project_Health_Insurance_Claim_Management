export type RunStatus =
  // Shared intake
  | 'queued'
  // Bug-fix pipeline (unchanged)
  | 'analyzing'
  | 'patch_created'
  | 'validating'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'pr_created'
  // PBI pipeline — planning gate (Gate 1) precedes coding
  | 'planning'
  | 'awaiting_plan_approval'
  | 'plan_approved'
  | 'plan_rejected'
  | 'coding'
  | 'test_generation'
  | 'ai_review'
  | 'doc_update'
  // Post-PR lifecycle (both pipelines, once ADO/CI wiring is enabled)
  | 'deploying'
  | 'deployed'
  | 'deploy_failed'
  | 'awaiting_uat'
  | 'uat_rejected'
  | 'released'
  | 'failed';

/** Work item source system. 'ado' is the primary path; email/chat remain for local demo/testing. */
export type IntakeSource = 'email' | 'chat' | 'ado';

/** Reference back to the originating Azure DevOps work item, when source === 'ado'. */
export interface AdoWorkItemRef {
  workItemId: number;
  workItemType: string;
  workItemUrl: string;
  organization: string;
  project: string;
  areaPath?: string;
  iterationPath?: string;
  tags?: string[];
  state: string;
}

export interface BugIntakePayload {
  contractVersion: '1.0.0' | '1.1.0';
  /** Absent/undefined is treated as 'bug' for backwards compatibility with existing payloads. */
  type?: 'bug';
  source: IntakeSource;
  messageId: string;
  receivedAt: string;
  reporter: { email: string; name?: string };
  bug: {
    title: string;
    description: string;
    stepsToReproduce?: string[];
    expectedBehavior?: string;
    actualBehavior?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    component?: 'frontend' | 'backend' | 'fullstack' | 'unknown';
    affectedArea?: string;
    environment?: string;
  };
  metadata: {
    emailSubject: string;
    rawEmailSnippet?: string;
    labels?: string[];
    externalTicketId?: string | null;
    ado?: AdoWorkItemRef;
  };
}

/** Product Backlog Item intake — always sourced from ADO, always goes through the planning gate. */
export interface PbiIntakePayload {
  contractVersion: '1.1.0';
  type: 'pbi';
  source: 'ado';
  messageId: string;
  receivedAt: string;
  reporter: { email: string; name?: string };
  ado: AdoWorkItemRef;
  pbi: {
    title: string;
    description: string;
    /** Raw ADO acceptance-criteria field; may be empty — the agent then drafts ACs itself. */
    acceptanceCriteria?: string;
    storyPoints?: number;
    priority?: 1 | 2 | 3 | 4;
    assignedTo?: { email: string; name?: string };
  };
  metadata: {
    adoEventType: string;
    rawWebhookSnippet?: string;
    labels?: string[];
  };
}

export type WorkItemIntakePayload = BugIntakePayload | PbiIntakePayload;

export interface CommandResult {
  name: string;
  command: string;
  cwd: string;
  exitCode: number;
  durationMs: number;
  stdoutTail?: string;
  stderrTail?: string;
  note?: string;
}

export interface TestCounts {
  passed: number;
  failed: number;
  skipped: number;
}

export interface TestGapRecommendation {
  layer: 'backend' | 'frontend';
  priority: 'high' | 'medium';
  title: string;
  description: string;
  suggestedPath: string;
  rationale: string;
}

export interface ValidationBuildResult {
  success: boolean;
  skipped: boolean;
  errorCount?: number;
}

export interface ValidationTestResult extends TestCounts {
  ran: boolean;
  weak?: boolean;
}

export interface ValidationResult {
  implemented: true;
  buildPassed: boolean;
  testsPassed: boolean;
  passed: boolean;
  strictMode: boolean;
  testSummary: string;
  failureReason: string | null;
  commands: CommandResult[];
  build: {
    backend: ValidationBuildResult;
    frontend: ValidationBuildResult;
  };
  tests: {
    backend: ValidationTestResult;
    frontend: ValidationTestResult;
  };
  detectedCommands: unknown;
  testGapRecommendations: TestGapRecommendation[];
  implementationNote?: string;
}

/** Gate 1 (PBI planning) approval state. Not applicable to the bug-fix pipeline. */
export interface PlanApprovalState {
  required: boolean;
  status: 'not_applicable' | 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
  /** True when the pipeline itself blocked the plan (oversized, migration, high risk) rather than a human. */
  autoBlocked: boolean;
  autoBlockReason: string | null;
}

export interface PlanTask {
  id: string;
  title: string;
  layer: 'frontend' | 'backend' | 'db' | 'infra' | 'other';
  files: string[];
  changeType: 'add' | 'modify' | 'delete';
  estimateLoc: number;
  dependsOn: string[];
}

export interface PlanAcceptanceCriterion {
  id: string;
  given: string;
  when: string;
  then: string;
}

export interface PlanRisk {
  level: 'high' | 'med' | 'low';
  text: string;
}

/** Structured output of the planning stage (Gate 1). Persisted to plan.json/plan.md artifacts. */
export interface WorkItemPlan {
  summary: string;
  acceptanceCriteria: PlanAcceptanceCriterion[];
  affectedAreas: Array<{ layer: string; path: string }>;
  tasks: PlanTask[];
  edgeCases: string[];
  scenarioCoverage: Array<{ acId: string; edgeCase: string; covered: boolean; note?: string }>;
  risks: PlanRisk[];
  openQuestions: string[];
  outOfScope: string[];
  requiresMigration: boolean;
  requiresApiContractChange: boolean;
  estimatedTotalLoc: number;
  releaseImpact: 'patch' | 'minor' | 'major';
}

/** Slice of WorkItemPlan kept on the RunResult for quick access (full plan lives in plan.json). */
export interface PlanSummary {
  summary: string;
  acceptanceCriteriaCount: number;
  taskCount: number;
  edgeCaseCount: number;
  openQuestions: string[];
  risks: PlanRisk[];
  requiresMigration: boolean;
  requiresApiContractChange: boolean;
  estimatedTotalLoc: number;
  releaseImpact: 'patch' | 'minor' | 'major';
}

export interface CoverageFileDelta {
  file: string;
  baseLinePct: number | null;
  headLinePct: number | null;
  deltaPct: number | null;
}

export interface CoverageDeltaSummary {
  ran: boolean;
  weak: boolean;
  minThresholdPct: number;
  files: CoverageFileDelta[];
  note?: string;
}

export interface AiReviewSummary {
  ran: boolean;
  issuesFound: number;
  highSeverityCount: number;
  summary: string;
  reviewArtifact?: string;
}

export interface DeployState {
  status: 'pending' | 'in_progress' | 'succeeded' | 'failed';
  environment: string;
  url?: string;
  pipelineRunUrl?: string;
  startedAt?: string;
  finishedAt?: string;
  note?: string;
}

export interface UatState {
  status: 'not_applicable' | 'pending' | 'approved' | 'rejected';
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectedReason: string | null;
}

export interface ReleaseState {
  merged: boolean;
  mergeCommitSha?: string;
  tag?: string;
  releasedAt?: string;
  adoClosed: boolean;
  error?: string;
}

export interface RunResult {
  runId: string;
  status: RunStatus;
  /** Discriminates the pipeline this run follows; mirrors intake.type ('bug' default when absent). */
  type: 'bug' | 'pbi';
  createdAt: string;
  updatedAt: string;
  intake: WorkItemIntakePayload;
  planApproval: PlanApprovalState;
  plan?: PlanSummary;
  analysis?: {
    bugSummary: string;
    rootCauseSummary: string;
    changedFiles: string[];
    agentRunId?: string;
    implementationNote?: string;
  };
  validation?: {
    passed: boolean;
    buildPassed: boolean;
    testsPassed: boolean;
    strictMode: boolean;
    testSummary: string;
    failureReason: string | null;
    commands: CommandResult[];
    build: {
      backend: ValidationBuildResult;
      frontend: ValidationBuildResult;
    };
    tests: {
      backend: ValidationTestResult;
      frontend: ValidationTestResult;
    };
    testGapRecommendations?: TestGapRecommendation[];
    implementationNote?: string;
  };
  coverage?: CoverageDeltaSummary;
  aiReview?: AiReviewSummary;
  git?: {
    baseBranch: string;
    branchName: string;
    commits: Array<{ sha: string; message: string }>;
    pushed: boolean;
    prUrl: string | null;
    prNumber?: number;
    implementationNote?: string;
  };
  approval: {
    required: boolean;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy: string | null;
    approvedAt: string | null;
    rejectedBy: string | null;
    rejectedAt: string | null;
    rejectedReason: string | null;
    comment?: string | null;
  };
  deploy?: DeployState;
  uat: UatState;
  release?: ReleaseState;
  artifactsPath: string;
  error: { code: string; message: string } | null;
}

export interface StartRunResponse {
  runId: string;
  status: RunStatus;
  branchName: string;
  createdAt: string;
  links: {
    self: string;
    artifacts: string;
  };
}

export interface ApproveRunRequest {
  approvedBy: string;
  comment?: string;
  /** Explicit opt-in. Default false — no PR until reviewer approves and optionally requests PR. */
  createPr?: boolean;
}

export interface RejectRunRequest {
  rejectedBy: string;
  reason?: string;
}

export interface ApprovalReviewSummary {
  runId: string;
  status: RunStatus;
  decision: 'pending' | 'approved' | 'rejected';
  recommendedAction:
    | 'review_and_approve'
    | 'review_with_caution'
    | 'already_approved'
    | 'already_rejected'
    | 'none';
  workItem: {
    type: 'bug' | 'pbi';
    title: string;
    description: string;
    severity: string;
    component: string;
    reporterEmail: string;
    reporterName?: string;
    adoUrl?: string;
  };
  patch: {
    branchName: string;
    baseBranch: string;
    changedFiles: string[];
    bugSummary: string;
    rootCauseSummary: string;
    commitCount: number;
  };
  validation: {
    passed: boolean;
    buildPassed: boolean;
    testsPassed: boolean;
    testSummary: string;
    failureReason: string | null;
  };
  review: {
    pending: boolean;
    canApprove: boolean;
    canReject: boolean;
    checklist: string[];
    decision: {
      status: 'approved' | 'rejected';
      by: string | null;
      at: string | null;
      comment: string | null;
      reason: string | null;
    } | null;
  };
  email: {
    subject: string;
    bodyPlain: string;
    bodyHtml: string;
  };
  api: {
    approve: {
      method: string;
      path: string;
      bodyExample: ApproveRunRequest;
      note: string;
    };
    reject: {
      method: string;
      path: string;
      bodyExample: RejectRunRequest;
    };
    createPr: {
      method: string;
      path: string;
      note: string;
    };
  };
  links: {
    self: string;
    artifacts: string;
    approvalSummary: string;
  };
  artifactsPath: string;
}

export interface CreatePrRequest {
  title?: string;
  body?: string;
  draft?: boolean;
}

export interface CancelRunRequest {
  cancelledBy: string;
  reason?: string;
}

export interface ApprovePlanRequest {
  approvedBy: string;
  comment?: string;
}

export interface RejectPlanRequest {
  rejectedBy: string;
  reason?: string;
}

export interface DeployStatusRequest {
  status: 'in_progress' | 'succeeded' | 'failed';
  environment?: string;
  url?: string;
  pipelineRunUrl?: string;
  note?: string;
}

export interface UatApproveRequest {
  approvedBy: string;
  comment?: string;
}

export interface UatRejectRequest {
  rejectedBy: string;
  reason?: string;
}

export interface PlaceholderResult {
  implemented: false;
  phase: string;
  message: string;
}

export interface GitBranchResult {
  success: boolean;
  branchName: string;
  baseBranch: string;
  commands: CommandResult[];
  warnings: string[];
  error?: string;
}

export interface GitPushResult {
  success: boolean;
  branchName: string;
  pushed: boolean;
  commitCreated: boolean;
  commands: CommandResult[];
  error?: string;
}

export interface PullRequestResult {
  success: boolean;
  prUrl: string | null;
  prNumber: number | null;
  title: string;
  body: string;
  draft: boolean;
  alreadyExisted: boolean;
  error?: string;
}

export interface AnalysisResult {
  bugSummary: string;
  rootCauseSummary: string;
  repoWarnings: string[];
  commands: CommandResult[];
}

export interface AgentRunResult {
  mode: 'cursor' | 'dry_run';
  success: boolean;
  agentRunId?: string;
  agentId?: string;
  bugSummary: string;
  rootCauseSummary: string;
  changedFiles: string[];
  commandsExecuted: CommandResult[];
  promptArtifact: string;
  transcriptArtifact: string;
  durationMs?: number;
  error?: string;
  implementationNote?: string;
}
