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
                const child = Child.spawn("go", ["test", testPath]);
                reject("It failed");
            });
        });
    }
}
exports.default = MinitestRunner;
