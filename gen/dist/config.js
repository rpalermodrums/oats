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
exports.loadConfig = loadConfig;
exports.initConfig = initConfig;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const DEFAULT_CONFIG = {
    schema: process.env.API_URL ? `${process.env.API_URL}/openapi.json` : '',
    output: 'src/api/types.ts'
};
async function loadConfig() {
    const configPath = (0, path_1.resolve)(process.cwd(), 'oats.json');
    try {
        const content = await (0, promises_1.readFile)(configPath, 'utf-8');
        const userConfig = JSON.parse(content);
        return {
            ...DEFAULT_CONFIG,
            ...userConfig,
            schema: expandEnvVars(userConfig.schema || DEFAULT_CONFIG.schema)
        };
    }
    catch {
        return DEFAULT_CONFIG;
    }
}
async function initConfig() {
    const configPath = (0, path_1.resolve)(process.cwd(), 'oats.json');
    const config = {
        schema: process.env.API_URL ? `${process.env.API_URL}/openapi.json` : 'http://localhost:8000/openapi.json',
        output: 'src/api/types.ts',
        options: {
            includeHelpers: true,
            versionCheck: false,
            dateFormat: 'string'
        }
    };
    const { writeFile } = await Promise.resolve().then(() => __importStar(require('fs/promises')));
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log('✅ Created oats.json config file');
}
function expandEnvVars(str) {
    return str.replace(/\$\{([^}]+)\}/g, (_, expr) => {
        const [varName, defaultValue] = expr.split(':-');
        return process.env[varName] || defaultValue || '';
    });
}
//# sourceMappingURL=config.js.map