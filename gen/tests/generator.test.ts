import { describe, it, expect } from 'vitest';
import { generateTypes } from '../src/generator';

describe('generateTypes', () => {
  it('generates interface for simple endpoint', async () => {
    const schema = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            },
            required: ['id', 'name']
          }
        }
      }
    };
    
    const output = await generateTypes(schema, { output: '', schema: '' });
    
    expect(output).toContain('export interface Paths');
    expect(output).toContain('export interface User');
    expect(output).toContain('id: string;');
    expect(output).toContain('name: string;');
    expect(output).toContain('"/users": {');
    expect(output).toContain('get: {');
  });

  it('handles path parameters correctly', async () => {
    const schema = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users/{id}': {
          get: {
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' }
              }
            ],
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            },
            required: ['id']
          }
        }
      }
    };
    
    const output = await generateTypes(schema, { output: '', schema: '' });
    
    expect(output).toContain('parameters: {');
    expect(output).toContain('path: {');
    expect(output).toContain('id: string;');
  });

  it('generates type helpers when enabled', async () => {
    const schema = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            responses: {
              200: {
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    const output = await generateTypes(schema, { 
      output: '', 
      schema: '',
      options: { includeHelpers: true }
    });
    
    expect(output).toContain('// Type helpers');
    expect(output).toContain('ResponseBody<');
    expect(output).toContain('RequestBody<');
  });
});