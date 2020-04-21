import * as Child from "child_process";
import * as path from "path";
import throat from "throat";
import OutputParser, { OutputParsing } from "./output-parser";

import type { Config as JestConfig } from "@jest/types";
import type JestTestRunner from "jest-runner";
import type { TestResult as JestTestResult } from "@jest/test-result";

export class CancelRun extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "CancelRun";
  }
}

// https://github.com/microsoft/TypeScript/issues/471#issuecomment-381842426
type PublicProperties<T> = {
  [P in keyof T]: T[P];
};

/**
 * Jumping through hoops to:
 * - Type check the constructor according to upstream's TestRunner class:
 *   https://www.typescriptlang.org/docs/handbook/interfaces.html#class-types
 * - Type check the implementation of the class has all of the upstream methods.
 */
const MinitestRunner: {
  new (...args: ConstructorParameters<typeof JestTestRunner>);
} = class MinitestRunner implements PublicProperties<JestTestRunner> {
  constructor(
    private globalConfig: JestConfig.GlobalConfig,
    private context?: JestTestRunner.TestRunnerContext,
    private outputParser?: OutputParsing
  ) {
    this.outputParser = outputParser || new OutputParser();
  }

  async runTests(
    tests: JestTestRunner.Test[],
    watcher: JestTestRunner.TestWatcher,
    onStart: JestTestRunner.OnTestStart,
    onResult: JestTestRunner.OnTestSuccess,
    onFailure: JestTestRunner.OnTestFailure,
    _options: JestTestRunner.TestRunnerOptions
  ): Promise<void> {
    const mutex = throat(this.globalConfig.maxWorkers);
    return Promise.all(
      tests.map((test) => {
        return mutex(async () => {
          if (watcher.isInterrupted()) {
            throw new CancelRun();
          }
          await onStart(test);
          return this.runTest(test)
            .then((result) => {
              onResult(test, result);
            })
            .catch((error) => onFailure(test, error));
        });
      })
    ) as Promise<any>;
  }

  private async runTest(test: JestTestRunner.Test) {
    const start = new Date();
    return new Promise<JestTestResult>((resolve, reject) => {
      const libPath = path.join(this.globalConfig.rootDir, "lib");
      const testPath = path.join(this.globalConfig.rootDir, "test");
      const child = Child.spawn(
        "ruby",
        [`-I"${libPath}:${testPath}"`, `"${test.path}"`],
        {
          cwd: this.globalConfig.rootDir,
          shell: true,
        }
      );
      let stdout = "";
      child.stdout.setEncoding("utf-8");
      child.stdout.on("data", (data) => {
        stdout += data;
      });
      child.stdout.on("error", (error) => {
        reject(error);
      });
      child.stdout.on("close", () => {
        let result: string[] = [];
        try {
          result = stdout.toString().split("\n");
        } catch (error) {
          reject(error);
        }
        const report = this.outputParser.parse(test, result, start);
        resolve(report);
      });
    });
  }
};

export default MinitestRunner;
