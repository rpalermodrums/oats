# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Development:**
- `npm run dev` - Run the CLI tool directly with tsx for development
- `npm run build` - Compile TypeScript to JavaScript in dist/
- `npm test` - Run tests with Vitest
- `npm run prepublishOnly` - Build before publishing (runs automatically)

**CLI Usage:**
- `npx oats init` - Create oats.json configuration file
- `npx oats gen [url]` - Generate TypeScript types from OpenAPI schema
- `npx oats gen` - Generate using schema URL from oats.json config
- `npx oats --version` - Show version

## Architecture

This is a minimal OpenAPI to TypeScript code generator with a straightforward pipeline:

1. **CLI Entry** (`src/index.ts`) - Command parsing and orchestration
2. **Fetcher** (`src/fetcher.ts`) - Downloads OpenAPI schemas from URLs or local files
3. **Validator** (`src/validator.ts`) - Validates OpenAPI schema format
4. **Generator** (`src/generator.ts`) - Core type generation engine that converts OpenAPI schemas to TypeScript
5. **Zod Generator** (`src/zod-generator.ts`) - Optional Zod schema generation for runtime validation
6. **Config** (`src/config.ts`) - Configuration management for oats.json

**Key Generation Logic:**
- Creates a `Paths` interface mapping API endpoints to their request/response types
- Generates TypeScript interfaces from OpenAPI components/schemas
- Includes helper types (`ResponseBody`, `RequestBody`) for extracting types from the Paths interface
- Supports path/query parameters, request bodies, and response types
- Optional Zod schema generation with runtime validators and safe parsers
- Zod schemas include format validation (email, URL, datetime) and constraints (min/max length)

**Configuration:**
- `oats.json` - Main config file with schema URL, output path, and options
- `tsconfig.json` - TypeScript compilation targeting ES2022/CommonJS
- `vitest.config.ts` - Test configuration for Node environment

The tool outputs a single TypeScript file containing all generated types, designed for importing into client applications for type-safe API interactions.

## Testing & Framework Integration

**Django REST Framework Integration:**
- Successfully tested with django-spectacular for OpenAPI schema generation
- Handles complex API structures including nested relationships, pagination, and CRUD operations
- Test setup in `test-django-api/` directory with User/Post models and ViewSets
- Django server runs on port 8001 during testing to avoid conflicts

**Test Commands:**
- Django: `cd test-django-api && source venv/bin/activate && python manage.py runserver 8001`
- Generate from Django: `npm run dev -- gen http://localhost:8001/api/schema/`
- Or download first: `curl -H "Accept: application/json" http://localhost:8001/api/schema/ -o schema.json`

The generator correctly handles django-spectacular's output including:
- Model serializers with proper field types and optionality
- ViewSet endpoints with pagination parameters
- Foreign key relationships and nested data
- Custom actions like `/users/{id}/posts/`