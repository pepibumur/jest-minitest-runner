"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class OutputParser {
    parse(test, output, startDate) {
        const result = {
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
                let title;
                let testLine;
                let testFullName;
                if (regexMatches && regexMatches.length != 0) {
                    testFullName = regexMatches[1];
                    title = regexMatches[2];
                    testLine = Number(regexMatches[3]);
                }
                const assertionResult = {
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
            }
            else {
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
exports.default = OutputParser;
