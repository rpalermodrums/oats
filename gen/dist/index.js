#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fetcher_1 = require("./fetcher");
const validator_1 = require("./validator");
const generator_1 = require("./generator");
const config_1 = require("./config");
const promises_1 = require("fs/promises");
const path_1 = require("path");
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    try {
        switch (command) {
            case 'init':
                await (0, config_1.initConfig)();
                break;
            case 'gen':
            case undefined:
                await generate(args[1]);
                break;
            case '--version':
                const pkg = await Promise.resolve().then(() => __importStar(require('../package.json')));
                console.log(pkg.version);
                break;
            default:
                console.error(`Unknown command: ${command}`);
                process.exit(1);
        }
    }
    catch (error) {
        console.error('Error:', error.message);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}
async function generate(urlOverride) {
    const config = await (0, config_1.loadConfig)();
    const schemaUrl = urlOverride || config.schema;
    if (!schemaUrl) {
        throw new Error('No schema URL provided. Use "oats init" or pass URL as argument');
    }
    console.log(`📥 Fetching schema from ${schemaUrl}...`);
    const schema = await (0, fetcher_1.fetchSchema)(schemaUrl);
    console.log('✓ Validating OpenAPI schema...');
    const validated = await (0, validator_1.validateSchema)(schema);
    console.log('🔧 Generating TypeScript types...');
    const output = await (0, generator_1.generateTypes)(validated, config);
    const outputPath = (0, path_1.resolve)(process.cwd(), config.output);
    console.log(`💾 Writing to ${outputPath}...`);
    await (0, promises_1.mkdir)((0, path_1.dirname)(outputPath), { recursive: true });
    await (0, promises_1.writeFile)(outputPath, output, 'utf-8');
    console.log('✅ Done!');
}
main();
//# sourceMappingURL=index.js.map