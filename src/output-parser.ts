import type JestTestRunner from "jest-runner";
import type { AssertionResult, TestResult } from "@jest/test-result";

export interface OutputParsing {
  parse(
    test: JestTestRunner.Test,
    output: string[],
    startData: Date
  ): TestResult;
}

export default class OutputParser implements OutputParsing {
  parse(
    test: JestTestRunner.Test,
    output: string[],
    startDate: Date
  ): TestResult {
    const result: TestResult = {
      leaks: false,
      numFailingTests: 0,
      numPassingTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      openHandles: [],
      perfStats: {
        start: +startDate,
        end: +new Date(),
      },
      skipped: false,
      snapshot: {
        added: 0,
        fileDeleted: false,
        matched: 0,
        unchecked: 0,
        uncheckedKeys: [],
        unmatched: 0,
        updated: 0,
      },
      sourceMaps: {},
      testExecError: null,
      testFilePath: test.path,
      testResults: [],
    };
    output.forEach((line, index, lines) => {
      if (line.includes("Failure:")) {
        const failingTestLine = lines[index + 1];
        const failingMessage = lines[index + 2];
        const regex = /(.+#(.+))\s\[.+:([0-9]+)\]:/i;
        const regexMatches = regex.exec(failingTestLine);
        let title: string | null;
        let testLine: number | null;
        let testFullName: string | null;
        if (regexMatches && regexMatches.length != 0) {
          testFullName = regexMatches[1];
          title = regexMatches[2];
          testLine = Number(regexMatches[3]);
        }
        const assertionResult: AssertionResult = {
          ancestorTitles: [],
          failureMessages: [failingMessage],
          fullName: failingTestLine,
          numPassingAsserts: 1,
          status: "failed",
          title: title,
        };
        if (testLine) {
          assertionResult["location"] = {
            column: 0,
            line: testLine,
          };
        }
        result.testResults.push(assertionResult);
      } else {
        const resultRegex = /([0-9]+) runs, ([0-9]+) assertions, ([0-9]+) failures, ([0-9]+) errors, ([0-9]+) skips/i;
        const regexMatches = resultRegex.exec(line);
        if (regexMatches && regexMatches.length != 0) {
          result.numFailingTests += Number(regexMatches[3]);
          result.numPassingTests +=
            Number(regexMatches[2]) - Number(regexMatches[3]);
        }
      }
    });
    if (result.testResults.length == 0) {
      result.testResults.push({
        ancestorTitles: [],
        failureMessages: [],
        fullName: test.path,
        numPassingAsserts: 1,
        status: "passed",
        title: `All tests in ${test.path}`,
      });
    }
    return result;
  }
}
