export type RunStatus =
  | 'queued'
  | 'analyzing'
  | 'patch_created'
  | 'validating'
  | 'awaiting_approval'
  | 'approved'
  | 'rejected'
  | 'pr_created'
  | 'failed';

export interface BugIntakePayload {
  contractVersion: '1.0.0';
  source: 'email' | 'chat';
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
  };
}

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

export interface RunResult {
  runId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  intake: BugIntakePayload;
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
  bug: {
    title: string;
    description: string;
    severity: string;
    component: string;
    reporterEmail: string;
    reporterName?: string;
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
