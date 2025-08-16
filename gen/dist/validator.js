"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSchema = validateSchema;
const json_schema_ref_parser_1 = __importDefault(require("@apidevtools/json-schema-ref-parser"));
async function validateSchema(schema) {
    const dereferenced = await json_schema_ref_parser_1.default.dereference(schema);
    if (!dereferenced.openapi || !dereferenced.openapi.startsWith('3.')) {
        throw new Error('Only OpenAPI 3.x is supported');
    }
    if (!dereferenced.paths || Object.keys(dereferenced.paths).length === 0) {
        throw new Error('Schema has no paths defined');
    }
    return dereferenced;
}
//# sourceMappingURL=validator.js.map