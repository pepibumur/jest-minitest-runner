"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Child = __importStar(require("child_process"));
const path = __importStar(require("path"));
const throat_1 = __importDefault(require("throat"));
const output_parser_1 = __importDefault(require("./output-parser"));
class CancelRun extends Error {
    constructor(message) {
        super(message);
        this.name = "CancelRun";
    }
}
exports.CancelRun = CancelRun;
/**
 * Jumping through hoops to:
 * - Type check the constructor according to upstream's TestRunner class:
 *   https://www.typescriptlang.org/docs/handbook/interfaces.html#class-types
 * - Type check the implementation of the class has all of the upstream methods.
 */
const MinitestRunner = class MinitestRunner {
    constructor(globalConfig, context, outputParser) {
        this.globalConfig = globalConfig;
        this.context = context;
        this.outputParser = outputParser;
        this.outputParser = outputParser || new output_parser_1.default();
    }
    runTests(tests, watcher, onStart, onResult, onFailure, _options) {
        return __awaiter(this, void 0, void 0, function* () {
            const mutex = throat_1.default(this.globalConfig.maxWorkers);
            return Promise.all(tests.map((test) => {
                return mutex(() => __awaiter(this, void 0, void 0, function* () {
                    if (watcher.isInterrupted()) {
                        throw new CancelRun();
                    }
                    yield onStart(test);
                    return this.runTest(test)
                        .then((result) => {
                        onResult(test, result);
                    })
                        .catch((error) => onFailure(test, error));
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
                    shell: true,
                });
                let stdout = "";
                child.stdout.setEncoding("utf-8");
                child.stdout.on("data", (data) => {
                    stdout += data;
                });
                child.stdout.on("error", (error) => {
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
};
exports.default = MinitestRunner;
