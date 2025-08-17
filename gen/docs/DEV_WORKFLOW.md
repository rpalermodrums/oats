# Developer Workflow Guide

## Recommended Setup for Fullstack Development

### 1. Single Command Development (Recommended)

Add to your `package.json`:

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

Now just run:
```bash
npm run dev
```

Everything starts together, types stay in sync automatically.

### 2. VS Code Integration

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Watch API Types",
      "type": "shell",
      "command": "npx oats watch --quiet",
      "isBackground": true,
      "problemMatcher": {
        "pattern": {
          "regexp": "^(Error:.*)$",
          "message": 1
        },
        "background": {
          "activeOnStart": true,
          "beginsPattern": "^👀 Watching",
          "endsPattern": "^✅"
        }
      },
      "runOptions": {
        "runOn": "folderOpen"
      }
    }
  ]
}
```

Types regenerate automatically when you open the project.

### 3. Git Hooks for Team Consistency

Install husky:
```bash
npm install --save-dev husky
npx husky install
```

Add pre-commit hook:
```bash
npx husky add .husky/pre-commit "npx oats gen && git add src/api/types.ts"
```

This ensures committed code always has up-to-date types.

## Different Development Scenarios

### Scenario 1: Backend-First Development

When building the API first:

```bash
# Terminal 1: Backend with auto-reload
python manage.py runserver

# Terminal 2: Type watcher
npx oats watch --interval 1000

# Terminal 3: Frontend (when ready)
npm run dev
```

Types update within 1 second of saving backend changes.

### Scenario 2: Frontend-First Development (Mocking)

When designing UI before API exists:

1. Create a mock schema:
```yaml
# mock-schema.json
{
  "openapi": "3.0.0",
  "paths": {
    "/api/users": {
      "get": {
        "responses": {
          "200": {
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/User"
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
        }
      }
    }
  }
}
```

2. Watch the mock schema:
```bash
npx oats watch mock-schema.json
```

3. Switch to real API when ready:
```bash
npx oats watch http://localhost:8000/api/schema/
```

### Scenario 3: Microservices

For multiple API services:

```json
{
  "scripts": {
    "gen:users": "oats gen http://users-api:3001/schema -o src/api/users.ts",
    "gen:products": "oats gen http://products-api:3002/schema -o src/api/products.ts",
    "gen:all": "npm run gen:users && npm run gen:products",
    "watch:all": "concurrently \"npm:watch:*\"",
    "watch:users": "oats watch http://users-api:3001/schema -o src/api/users.ts",
    "watch:products": "oats watch http://products-api:3002/schema -o src/api/products.ts"
  }
}
```

### Scenario 4: CI/CD Pipeline

For production builds:

```yaml
# .github/workflows/ci.yml
name: CI
on: [push]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate fresh types
        run: npx oats gen ${{ secrets.API_URL }}/schema
        
      - name: Check for uncommitted changes
        run: |
          if [[ -n $(git status --porcelain) ]]; then
            echo "Error: Generated types are out of sync"
            git diff
            exit 1
          fi
```

## Performance Tips

### 1. Optimize Polling Interval

- **Local files**: Use 500ms (near-instant)
- **Local server**: Use 1000-2000ms 
- **Remote API**: Use 5000ms+
- **Production**: Don't watch, use CI/CD

### 2. Use Quiet Mode in Development

```bash
# Noisy (default)
npx oats watch

# Quiet (only errors)
npx oats watch --quiet

# Silent with notifications
npx oats watch --quiet --notify
```

### 3. Conditional Generation

Only regenerate in development:

```json
{
  "scripts": {
    "dev": "NODE_ENV=development concurrently \"npm:dev:*\"",
    "dev:types": "[ \"$NODE_ENV\" = \"development\" ] && oats watch || echo 'Skipping type generation'"
  }
}
```

## Troubleshooting

### Types not updating?

1. Check if watch is running:
```bash
ps aux | grep "oats watch"
```

2. Check for schema changes:
```bash
curl http://localhost:8000/api/schema/ | shasum
```

3. Force regeneration:
```bash
npx oats gen --no-cache
```

### High CPU usage?

Increase polling interval:
```bash
npx oats watch --interval 5000
```

### Too many console messages?

Use quiet mode:
```bash
npx oats watch --quiet
```

### Network errors?

Watch will auto-retry 3 times. For flaky connections:
```bash
npx oats watch --retries 10 --interval 5000
```

## Best Practices

1. **Always use watch mode during active development**
2. **Check types into git** (they're documentation)
3. **Use CI to verify types are up-to-date**
4. **Start watch with your dev server** (use concurrently)
5. **Use quiet mode** to reduce noise
6. **Match polling to your save frequency** (fast typist = shorter interval)
7. **Use local schema files when possible** (instant updates)

## Advanced: Custom Watch Script

For complex needs, create a custom watcher:

```typescript
// scripts/watch-types.ts
import { SchemaWatcher } from '@oats/gen/watcher';
import { loadConfig } from '@oats/gen/config';
import notifier from 'node-notifier';

async function main() {
  const config = await loadConfig();
  const watcher = new SchemaWatcher(config, {
    interval: 2000,
    quiet: true,
    diffOnly: true
  });
  
  watcher.on('generated', ({ hash }) => {
    notifier.notify({
      title: 'Types Updated',
      message: 'API types regenerated successfully',
      sound: false
    });
  });
  
  watcher.on('error', (error) => {
    notifier.notify({
      title: 'Type Generation Failed',
      message: error.message,
      sound: true
    });
  });
  
  await watcher.start();
}

main();
```

Run with:
```bash
npx tsx scripts/watch-types.ts
```