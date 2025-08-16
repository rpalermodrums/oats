# @oats/gen

A minimal OpenAPI→TypeScript generator that prioritizes simplicity, reliability, and future extensibility.

## Features

- ✅ **Simple & Fast** - Minimal dependencies, quick generation
- ✅ **Type-Safe** - Generates accurate TypeScript types from OpenAPI 3.x schemas  
- ✅ **Zero Config** - Works out of the box, configure when needed
- ✅ **Helper Types** - Includes utility types for extracting request/response types
- ✅ **Local & Remote** - Supports both local files and HTTP URLs
- ✅ **Framework Ready** - Tested with Django REST Framework + django-spectacular

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

// Type-safe API client example
class ApiClient {
  async getUser(id: number): Promise<ResponseBody<"/api/users/{id}/", "get">> {
    const response = await fetch(`/api/users/${id}/`);
    return response.json();
  }
  
  async createPost(data: RequestBody<"/api/posts/", "post">): Promise<ResponseBody<"/api/posts/", "post">> {
    const response = await fetch('/api/posts/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.json();
  }
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

## Why @oats/gen?

### Compared to OpenAPI Generator

- **Faster & Lighter** - Minimal dependencies vs heavy Java toolchain
- **Better TypeScript** - Purpose-built for modern TS patterns and utilities
- **Zero Config** - Works immediately without complex setup
- **Framework Agnostic** - Generate types, use any HTTP client you prefer

### Compared to orval, swagger-typescript-api

- **Simpler** - Focused on type generation, not code generation
- **More Reliable** - Fewer dependencies, less surface area for bugs  
- **Better Utilities** - Ergonomic helper types for extracting request/response types
- **Future-Proof** - Designed for extensibility without breaking changes

## Requirements

- Node.js 18+ (for native fetch support)
- OpenAPI 3.0.x or 3.1.x schemas

## Framework Integration

### Django REST Framework

@oats/gen works seamlessly with Django REST Framework and django-spectacular:

```python
# settings.py
INSTALLED_APPS = [
    'rest_framework',
    'drf_spectacular',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Your API',
    'DESCRIPTION': 'Your API description',
    'VERSION': '1.0.0',
}
```

```python
# urls.py
from drf_spectacular.views import SpectacularAPIView

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
]
```

Generate types from your Django API:

```bash
npx oats gen http://localhost:8000/api/schema/
```

The generator produces complete TypeScript definitions for:
- **Model interfaces** with proper field types and optionality
- **API endpoints** with path/query parameters and request/response types
- **Nested relationships** and foreign key references
- **Pagination** structures and metadata
- **CRUD operations** with appropriate HTTP methods

### Other Frameworks

@oats/gen is designed to work with any OpenAPI 3.x compliant API. Popular frameworks include:

- **FastAPI** (Python) - Native OpenAPI support
- **Spring Boot** (Java) - With springdoc-openapi
- **Express** (Node.js) - With swagger-jsdoc or similar
- **ASP.NET Core** (C#) - With Swashbuckle.AspNetCore
- **Ruby on Rails** - With rswag or similar

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