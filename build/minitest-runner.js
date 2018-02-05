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
const path = require("path");
const throat = require("throat");
const output_parser_1 = require("./output-parser");
class CancelRun extends Error {
    constructor(message) {
        super(message);
        this.name = "CancelRun";
    }
}
exports.CancelRun = CancelRun;
class MinitestRunner {
    constructor(globalConfig, outputParser = new output_parser_1.default()) {
        this.globalConfig = globalConfig;
        this.outputParser = outputParser;
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
                    return this.runTest(test)
                        .then(result => {
                        onResult(test, result);
                    })
                        .catch(error => onFailure(test, error));
                }));
            }));
        });
    }
    runTest(test) {
        return __awaiter(this, void 0, void 0, function* () {
            const start = new Date();
            return new Promise((resolve, reject) => {
                const libPath = path.join(this.globalConfig.rootDir, "lib");
                const testPath = path.join(this.globalConfig.rootDir, "test");
                const child = Child.spawn("ruby", [`-I"${libPath}:${testPath}"`, `"${test.path}"`], {
                    cwd: this.globalConfig.rootDir,
                    shell: true
                });
                let stdout = "";
                child.stdout.setEncoding("utf-8");
                child.stdout.on("data", data => {
                    stdout += data;
                });
                child.stdout.on("error", error => {
                    reject(error);
                });
                child.stdout.on("close", () => {
                    let result = [];
                    try {
                        result = stdout.toString().split("\n");
                    }
                    catch (error) {
                        reject(error);
                    }
                    const report = this.outputParser.parse(test, result, start);
                    resolve(report);
                });
            });
        });
    }
}
exports.default = MinitestRunner;
