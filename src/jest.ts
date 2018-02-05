interface GlobalConfig {
  maxWorkers: number;
  rootDir: string;
}

interface TestWatcher {
  isInterrupted: () => boolean;
  isWatchMode: () => boolean;
}

interface Test {
  duration?: number;
  path: string;
}

type SerializableError = {
  code?: number;
  message: string;
  stack?: string;
  type?: string;
};

interface TestRunnerOptions {
  serial: boolean;
}

type Status = "passed" | "failed" | "skipped" | "pending";

interface Callsite {
  column: number;
  line: number;
}

interface AssertionResult {
  ancestorTitles: string[];
  duration?: number;
  failureMessages: string[];
  fullName: string;
  location?: Callsite;
  numPassingAsserts: number;
  status: Status;
  title: string;
}

interface TestResult {
  displayName?: string;
  failureMessage?: string;
  leaks: boolean;
  numFailingTests: number;
  numPassingTests: number;
  numPendingTests: number;
  perfStats: {
    end: number;
    start: number;
  };
  skipped: boolean;
  snapshot: {
    added: number;
    fileDeleted: boolean;
    matched: number;
    unchecked: number;
    uncheckedKeys: string[];
    unmatched: number;
    updated: number;
  };
  sourceMaps: { [sourcePath: string]: string };
  testExecError?: SerializableError;
  testFilePath: string;
  testResults: Array<AssertionResult>;
}

type OnTestStart = (Test) => Promise<void>;
type OnTestFailure = (Test, SerializableError) => Promise<any>;
type OnTestSuccess = (Test, TestResult) => Promise<any>;
