import * as Child from "child_process";
import * as throat from "throat";

export class CancelRun extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "CancelRun";
  }
}

interface TestReport {
  passed: number;
  failed: number;
  failureMessage?: string;
  duration: number;
  end: number;
  name: string;
}

export default class MinitestRunner {
  globalConfig: GlobalConfig;

  constructor(globalConfig: GlobalConfig) {
    this.globalConfig = globalConfig;
  }

  async runTests(
    tests: Test[],
    watcher: TestWatcher,
    onStart: OnTestStart,
    onResult: OnTestSuccess,
    onFailure: OnTestFailure,
    options
  ) {
    const mutex = throat(this.globalConfig.maxWorkers);
    return Promise.all(
      tests.map(test => {
        return mutex(async () => {
          if (watcher.isInterrupted()) {
            throw new CancelRun();
          }
          await onStart(test);
          return this.runTest(test.path)
            .then(result => {
              onResult(test, result);
            })
            .catch(error => onFailure(test, error));
        });
      })
    );
  }

  private async runTest(testPath: string) {
    const start = new Date();
    return new Promise((resolve, reject) => {
      const child = Child.spawn("ruby", ["-I'lib:test'", testPath]);
      let stdout = "";
      child.stdout.setEncoding("utf-8");
      // eslint-disable-next-line no-return-assign
      child.stdout.on("data", data => (stdout += data));
      child.stdout.on("error", error => reject(error));
      child.stdout.on("close", () => {
        let result: string[] = [];
        try {
          result = stdout.toString().split("\n");
        } catch (error) {
          reject(error);
        }
        const report = this.parseMinitestOutput(testPath, start, result);
        const end = new Date();

        report.end = +end;
        report.duration = +end - +start;

        resolve({
          console: null,
          failureMessage: null,
          numFailingTests: report.failed || 0,
          numPassingTests: report.passed || 0,
          numPendingTests: 0,
          perfStats: {
            end: report.end,
            start
          },
          skipped: false,
          snapshot: {
            added: 0,
            fileDeleted: false,
            matched: 0,
            unchecked: 0,
            unmatched: 0,
            updated: 0
          },
          sourceMaps: {},
          testExecError: null,
          testFilePath: testPath,
          testResults: [this.result(report)]
        });
      });
    });
  }

  private parseMinitestOutput(
    relativeTestPath: string,
    start: Date,
    output: string[]
  ): TestReport {
    const report = {
      passed: 0,
      failed: 0,
      failureMessage: "",
      duration: 0,
      end: 0,
      name: relativeTestPath
    };
    // TODO
    return report;
  }

  private result(report: TestReport): AssertionResult {
    return {
      ancestorTitles: [],
      duration: report.duration,
      failureMessages: report.failed > 0 ? [report.failureMessage] : null,
      fullName: report.name,
      numPassingAsserts: report.failed === 0 ? 1 : 0,
      status: report.failed === 0 ? "passed" : "failed",
      title: report.name
    };
  }
}
