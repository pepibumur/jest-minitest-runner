"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Child = require("child_process");
const throat = require("throat");
class CancelRun extends Error {
    constructor(message) {
        super(message);
        this.name = "CancelRun";
    }
}
exports.CancelRun = CancelRun;
class MinitestRunner {
    constructor(globalConfig) {
        this.globalConfig = globalConfig;
    }
    runTests(tests, watcher, onStart, onResult, onFailure, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const mutex = throat(this.globalConfig.maxWorkers);
            return Promise.all(tests.map(test => {
                return mutex(() => __awaiter(this, void 0, void 0, function* () {
                    if (watcher.isInterrupted()) {
                        throw new CancelRun();
                    }
                    yield onStart(test);
                    return this.runTest(test.path)
                        .then(result => {
                        onResult(test, result);
                    })
                        .catch(error => onFailure(test, error));
                }));
            }));
        });
    }
    runTest(testPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = new Date();
            return new Promise((resolve, reject) => {
                const child = Child.spawn("ruby", ["-I'lib:test'", testPath]);
                let stdout = "";
                child.stdout.setEncoding("utf-8");
                // eslint-disable-next-line no-return-assign
                child.stdout.on("data", data => (stdout += data));
                child.stdout.on("error", error => reject(error));
                child.stdout.on("close", () => {
                    let result = [];
                    try {
                        result = stdout.toString().split("\n");
                    }
                    catch (error) {
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
        });
    }
    parseMinitestOutput(relativeTestPath, start, output) {
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
    result(report) {
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
exports.default = MinitestRunner;
