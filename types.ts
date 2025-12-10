export type TestStatus = 'IDLE' | 'PASSED' | 'FAILED' | 'SKIPPED';

export interface TestStep {
  id: string;
  action: string;
  expectedResult: string;
}

export interface TestCase {
  id: string;
  title: string;
  description?: string;
  steps: TestStep[];
  priority: 'Low' | 'Medium' | 'High';
}

export type Role = 'ADMIN' | 'MEMBER' | 'OBSERVER';

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  cases: TestCase[];
  permissions?: Record<string, Role>; // Map userId to Role
  targetConfig?: {
    appType: 'WEB' | 'DESKTOP';
    appAddress: string;
    testEmail?: string;
    executionMode?: 'MANUAL' | 'AUTOMATED';
    mockAssets?: string[]; // List of file names available in the virtual file system
  };
}

export interface TestResult {
  caseId: string;
  status: TestStatus;
  notes?: string;
  timestamp: string;
}

export interface TestRun {
  id: string;
  suiteId: string;
  suiteName: string;
  startTime: string;
  endTime?: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  results: Record<string, TestResult>; // Map caseId to result
}

export type IssueStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type IssuePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Issue {
  id: string;
  key: string; // e.g. ISS-1
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  assignee?: string; // Stores user.name
  createdAt: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'ASSIGNMENT' | 'SYSTEM';
  read: boolean;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string; // Emoji or URL
}

export type ViewState = 'DASHBOARD' | 'SUITES' | 'RUNNER' | 'HISTORY' | 'ISSUES';