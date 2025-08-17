# @oats/gen

A minimal OpenAPI→TypeScript generator that prioritizes simplicity, reliability, and future extensibility.

## Features

- ✅ **Simple & Fast** - Minimal dependencies, quick generation
- ✅ **Type-Safe** - Generates accurate TypeScript types from OpenAPI 3.x schemas  
- ✅ **Zero Config** - Works out of the box, configure when needed
- ✅ **Helper Types** - Includes utility types for extracting request/response types
- ✅ **Local & Remote** - Supports both local files and HTTP URLs
- ✅ **Framework Ready** - Tested with Django REST Framework + django-spectacular
- ✅ **Runtime Validation** - Optional Zod schema generation for runtime type safety

## Installation

```bash
npm install @oats/gen

# Optional: Install Zod for runtime validation
npm install zod
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

## Runtime Validation with Zod

Enable Zod schema generation for runtime type safety:

```json
{
  "schema": "http://localhost:8000/openapi.json",
  "output": "src/api/types.ts",
  "options": {
    "generateZod": true,
    "zodOutput": "src/api/types.zod.ts"  // Optional, defaults to types.zod.ts
  }
}
```

### Using Generated Zod Schemas

```typescript
import { UserSchema, validateUser, safeParseUser } from './api/types.zod';

// Validate API response (throws on invalid data)
async function getUser(id: number) {
  const response = await fetch(`/api/users/${id}/`);
  const data = await response.json();
  return validateUser(data); // Throws ZodError if invalid
}

// Safe parsing (returns result object)
async function safeGetUser(id: number) {
  const response = await fetch(`/api/users/${id}/`);
  const data = await response.json();
  const result = safeParseUser(data);
  
  if (result.success) {
    return result.data; // Typed as User
  } else {
    console.error('Validation failed:', result.error);
    throw new Error('Invalid API response');
  }
}

// Use schemas directly
const userData = { /* ... */ };
const user = UserSchema.parse(userData); // Runtime validation
```

### Zod Features

Generated Zod schemas include:
- **Email validation** for email fields
- **URL validation** for URL fields  
- **DateTime validation** for date-time fields
- **String length constraints** from OpenAPI maxLength
- **Number constraints** from minimum/maximum
- **Integer validation** for integer types
- **Optional field handling**
- **Enum validation** for enum types

## Configuration

### Environment Variables

```json
{
  "schema": "${API_URL:-http://localhost:8000}/openapi.json",
  "output": "src/api/types.ts"
}
```

### All Options

```json
{
  "schema": "http://localhost:8000/openapi.json",
  "output": "src/api/types.ts",
  "options": {
    "includeHelpers": true,      // Include ResponseBody/RequestBody helpers
    "versionCheck": false,        // Check API version compatibility
    "dateFormat": "string",       // Date format: "string" | "Date"
    "generateZod": false,         // Generate Zod schemas
    "zodOutput": "src/api/schemas.ts"  // Custom Zod output path
  }
}
```

## Commands

- `oats init` - Create configuration file
- `oats gen [url]` - Generate types from schema
- `oats watch [url]` - Watch schema for changes and regenerate automatically
- `oats --version` - Show version

### Watch Mode

Keep your types in sync during development:

```bash
# Watch with default settings (polls every 2s)
npx oats watch

# Watch with custom interval (milliseconds)
npx oats watch --interval 5000

# Quiet mode (only show errors)
npx oats watch --quiet

# Watch with retries for flaky connections
npx oats watch --retries 10

# Watch with desktop notifications
npx oats watch --notify

# Watch a specific URL
npx oats watch http://localhost:8000/api/schema/
```

**Features:**
- 🔄 **Smart diffing** - Only regenerates when schema actually changes (hash comparison)
- 📁 **File watching** - Instant updates for local schema files using chokidar
- 🌐 **HTTP polling** - Configurable intervals for remote schemas
- 🔁 **Auto-retry** - Handles temporary backend failures with exponential backoff
- 🤫 **Quiet mode** - Reduce console noise during development
- 🔔 **Notifications** - Optional desktop notifications on schema changes

### Developer Workflow Integration

#### Single Command Development

Add to your `package.json` for a seamless fullstack workflow:

```json
{
  "scripts": {
    "dev": "concurrently \"npm:dev:*\" --kill-others-on-fail",
    "dev:backend": "python manage.py runserver",
    "dev:frontend": "next dev",
    "dev:types": "oats watch --quiet"
  }
}
```

Now just run `npm run dev` to start everything with automatic type synchronization.

#### VS Code Integration

Create `.vscode/tasks.json` for automatic type watching on project open:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Watch API Types",
      "type": "shell",
      "command": "npx oats watch --quiet",
      "isBackground": true,
      "runOptions": {
        "runOn": "folderOpen"
      }
    }
  ]
}
```

#### CI/CD Pipeline

Ensure types stay in sync with the API in your CI pipeline:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx oats gen ${{ secrets.API_URL }}/schema
      - name: Check for uncommitted changes
        run: |
          if [[ -n $(git status --porcelain) ]]; then
            echo "Types are out of sync with API"
            git diff
            exit 1
          fi
```

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