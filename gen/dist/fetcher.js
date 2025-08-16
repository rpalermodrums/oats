"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSchema = fetchSchema;
const promises_1 = require("fs/promises");
async function fetchSchema(source) {
    let content;
    if (source.startsWith('http://') || source.startsWith('https://')) {
        const response = await fetch(source, {
            headers: {
                'Accept': 'application/json, application/yaml, text/yaml'
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
        }
        content = await response.text();
    }
    else {
        content = await (0, promises_1.readFile)(source, 'utf-8');
    }
    try {
        return JSON.parse(content);
    }
    catch {
        throw new Error('Schema must be valid JSON (YAML support coming soon)');
    }
}
//# sourceMappingURL=fetcher.js.map