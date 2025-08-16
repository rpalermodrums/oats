import $RefParser from '@apidevtools/json-schema-ref-parser';
import { OpenAPIV3 } from 'openapi-types';

export async function validateSchema(schema: any): Promise<OpenAPIV3.Document> {
  const dereferenced = await $RefParser.dereference(schema) as any;
  
  if (!dereferenced.openapi || !dereferenced.openapi.startsWith('3.')) {
    throw new Error('Only OpenAPI 3.x is supported');
  }
  
  if (!dereferenced.paths || Object.keys(dereferenced.paths).length === 0) {
    throw new Error('Schema has no paths defined');
  }
  
  return dereferenced as OpenAPIV3.Document;
}