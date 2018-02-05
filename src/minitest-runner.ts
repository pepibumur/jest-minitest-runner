import * as Child from "child_process";
import * as path from "path";
import * as throat from "throat";
import OutputParser, { OutputParsing } from "./output-parser";

export class CancelRun extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "CancelRun";
  }
}

export default class MinitestRunner {
  globalConfig: GlobalConfig;
  outputParser: OutputParsing;

  constructor(
    globalConfig: GlobalConfig,
    outputParser: OutputParsing = new OutputParser()
  ) {
    this.globalConfig = globalConfig;
    this.outputParser = outputParser;
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
          return this.runTest(test)
            .then(result => {
              onResult(test, result);
            })
            .catch(error => onFailure(test, error));
        });
      })
    );
  }

  private async runTest(test: Test) {
    const start = new Date();
    return new Promise((resolve, reject) => {
      const libPath = path.join(this.globalConfig.rootDir, "lib");
      const testPath = path.join(this.globalConfig.rootDir, "test");
      const child = Child.spawn(
        "ruby",
        [`-I"${libPath}:${testPath}"`, `"${test.path}"`],
        {
          cwd: this.globalConfig.rootDir,
          shell: true
        }
      );
      let stdout = "";
      child.stdout.setEncoding("utf-8");
      child.stdout.on("data", data => {
        stdout += data;
      });
      child.stdout.on("error", error => {
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
}
