# @oats/gen

A minimal OpenAPI→TypeScript generator that prioritizes simplicity, reliability, and future extensibility.

## Features

- ✅ **Simple & Fast** - Minimal dependencies, quick generation
- ✅ **Type-Safe** - Generates accurate TypeScript types from OpenAPI 3.x schemas
- ✅ **Zero Config** - Works out of the box, configure when needed
- ✅ **Helper Types** - Includes utility types for extracting request/response types
- ✅ **Local & Remote** - Supports both local files and HTTP URLs

## Installation

```bash
npm install @oats/gen
```

## Quick Start

### 1. Initialize Configuration (Optional)

```bash
npx oats init
```

This creates an `oats.json` config file:

```json
{
  "schema": "http://localhost:8000/openapi.json",
  "output": "src/api/types.ts"
}
```

### 2. Generate Types

```bash
# Using config file
npx oats gen

# Or specify URL directly
npx oats gen https://api.example.com/openapi.json

# Or use local file
npx oats gen ./openapi.json
```

## Example Output

Given this OpenAPI schema:

```json
{
  "openapi": "3.0.0",
  "paths": {
    "/users": {
      "get": {
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/User" }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" }
        },
        "required": ["id", "name"]
      }
    }
  }
}
```

Generates:

```typescript
export interface Paths {
  "/users": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": User[];
          };
        };
      };
    };
  };
}

export interface User {
  id: string;
  name: string;
}

// Type helpers
export type ResponseBody<
  P extends keyof Paths,
  M extends keyof Paths[P],
  S extends number = 200
> = Paths[P][M] extends { responses: Record<S, { content: { "application/json": infer R } }> }
  ? R
  : never;

export type RequestBody<
  P extends keyof Paths,
  M extends keyof Paths[P]
> = Paths[P][M] extends { requestBody: { content: { "application/json": infer R } } }
  ? R
  : never;
```

## Usage with Type Helpers

```typescript
import type { Paths, ResponseBody, RequestBody } from './api/types';

// Extract response type for GET /users
type UsersResponse = ResponseBody<"/users", "get">; // User[]

// Extract request body type for POST /users
type CreateUserRequest = RequestBody<"/users", "post">; // CreateUser

// Use with your HTTP client
async function getUsers(): Promise<UsersResponse> {
  const response = await fetch('/api/users');
  return response.json();
}
```

## Configuration

### Environment Variables

```json
{
  "schema": "${API_URL:-http://localhost:8000}/openapi.json",
  "output": "src/api/types.ts"
}
```

### Options

```json
{
  "schema": "http://localhost:8000/openapi.json",
  "output": "src/api/types.ts",
  "options": {
    "includeHelpers": true,
    "versionCheck": false,
    "dateFormat": "string"
  }
}
```

## Commands

- `oats init` - Create configuration file
- `oats gen [url]` - Generate types from schema
- `oats --version` - Show version

## Requirements

- Node.js 18+ (for native fetch support)
- OpenAPI 3.0.x or 3.1.x schemas

## Development

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build
npm run build

# Test
npm test
```

## License

MIT