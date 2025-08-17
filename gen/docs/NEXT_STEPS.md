# NEXT_STEPS.md - Keeping Generated Types Fresh During Development

## Problem Statement

During fullstack development, API schemas change frequently. Developers need generated TypeScript types to stay in sync without:
- Manual intervention ("did you regenerate types?")
- Build slowdowns
- Context switching
- Stale type errors in the IDE

## Option 1: File Watcher Mode

**Implementation:**
```bash
npx oats watch
```
- Watch the OpenAPI endpoint/file for changes
- Regenerate types automatically when schema changes
- Use polling (HTTP) or file system watching (local files)

**Pros:**
- ✅ Zero manual intervention
- ✅ Near-instant updates for local files
- ✅ Works with any backend framework

**Cons:**
- ❌ Polling overhead for HTTP endpoints
- ❌ Requires separate terminal/process
- ❌ May regenerate unnecessarily during backend restarts
- ❌ No git commit hooks or CI integration

**Tradeoffs:**
- Best for: Local development with frequent schema changes
- Performance: Low overhead with smart diffing
- Complexity: Medium (need proper debouncing, error handling)

## Option 2: Backend Post-Save Hooks

**Implementation:**
```python
# Django example
@receiver(post_save)
def regenerate_types(sender, **kwargs):
    if sender in [User, Post]:  # API models
        subprocess.run(['npx', 'oats', 'gen'])
```

**Pros:**
- ✅ Types regenerate exactly when models change
- ✅ No polling overhead
- ✅ Integrated into backend workflow

**Cons:**
- ❌ Backend-specific implementation
- ❌ Requires backend code modification
- ❌ May slow down model saves
- ❌ Tight coupling between backend and frontend tooling

**Tradeoffs:**
- Best for: Teams that control both frontend and backend
- Performance: Adds ~200ms to model saves
- Complexity: High (backend-specific, needs subprocess management)

## Option 3: Git Pre-Commit Hooks

**Implementation:**
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run generate-types && git add src/api/types.ts"
    }
  }
}
```

**Pros:**
- ✅ Ensures committed code has correct types
- ✅ No runtime overhead
- ✅ Works with any backend

**Cons:**
- ❌ Doesn't help during development
- ❌ Can slow down commits
- ❌ May cause merge conflicts
- ❌ Requires backend to be running during commit

**Tradeoffs:**
- Best for: Ensuring production correctness
- Performance: Adds 1-2s to commit time
- Complexity: Low (just npm scripts)

## Option 4: IDE Integration / VS Code Extension

**Implementation:**
- VS Code extension that regenerates on save
- WebStorm file watcher
- Cursor AI rules

**Pros:**
- ✅ Seamless IDE experience
- ✅ Can show inline errors
- ✅ No terminal needed

**Cons:**
- ❌ IDE-specific solution
- ❌ Team needs same IDE/config
- ❌ Additional extension to maintain

**Tradeoffs:**
- Best for: Standardized team environments
- Performance: Fast (runs in background)
- Complexity: High (need to build/maintain extension)

## Option 5: Development Proxy with Auto-Generation

**Implementation:**
```typescript
// Next.js middleware example
export async function middleware(request: NextRequest) {
  if (request.url.includes('/api/')) {
    await exec('npx oats gen');  // Regenerate before API calls
  }
}
```

**Pros:**
- ✅ Generates just-in-time
- ✅ No wasted regenerations
- ✅ Framework integrated

**Cons:**
- ❌ Adds latency to first API call
- ❌ Framework-specific
- ❌ Complex error handling

**Tradeoffs:**
- Best for: Next.js/Remix apps with API routes
- Performance: 200-500ms on first request
- Complexity: Medium

## Option 6: npm Script Composition

**Implementation:**
```json
{
  "scripts": {
    "dev": "concurrently \"npm:dev:*\"",
    "dev:backend": "python manage.py runserver",
    "dev:frontend": "next dev",
    "dev:types": "nodemon --watch 'http://localhost:8000/api/schema' --exec 'oats gen'"
  }
}
```

**Pros:**
- ✅ Single command starts everything
- ✅ Works with any stack
- ✅ Easy to understand

**Cons:**
- ❌ Still requires polling for HTTP
- ❌ Output can be noisy
- ❌ Process management complexity

**Tradeoffs:**
- Best for: Monorepo setups
- Performance: Low overhead
- Complexity: Low

## Option 7: GraphQL-Style Codegen Watch

**Implementation:**
```yaml
# codegen.yml (similar to GraphQL Code Generator)
watch: true
schema: http://localhost:8000/api/schema/
generates:
  ./src/api/types.ts:
    interval: 2000  # Poll every 2s
    onSchemaChange: true
```

**Pros:**
- ✅ Familiar pattern for GraphQL users
- ✅ Configurable polling/watching
- ✅ Can integrate with other codegen tools

**Cons:**
- ❌ Another config file
- ❌ Polling overhead
- ❌ May conflict with GraphQL codegen

**Tradeoffs:**
- Best for: Teams already using GraphQL codegen
- Performance: Moderate (configurable polling)
- Complexity: Medium

## Recommended Solution: Hybrid Approach

**Primary: File Watcher Mode with Smart Diffing**

```bash
npx oats watch --interval 2000 --diff-only
```

Features:
1. **Smart diffing** - Only regenerate if schema actually changed (compare hash)
2. **Configurable intervals** - 500ms for local files, 2000ms for HTTP
3. **Quiet mode** - Only log when types actually change
4. **Error recovery** - Continue watching even if generation fails
5. **Debouncing** - Wait for backend to stabilize before regenerating

**Secondary: Pre-commit Hook for Safety**

```json
{
  "scripts": {
    "type-check": "oats gen --check",  // Fails if types are stale
    "precommit": "npm run type-check"
  }
}
```

**Optional: Dev Script Integration**

```json
{
  "scripts": {
    "dev": "concurrently \"npm:dev:*\" --kill-others",
    "dev:app": "next dev",
    "dev:types": "oats watch --quiet"
  }
}
```

## Implementation Priority

### Phase 1: Watch Mode (Week 1)
- Basic file watching for local schemas
- HTTP polling with configurable interval
- Schema diffing to prevent unnecessary regeneration
- Simple console output

### Phase 2: Smart Diffing (Week 2)
- Hash comparison of schemas
- Incremental generation (only changed types)
- Better error messages
- Retry logic for network failures

### Phase 3: Developer Experience (Week 3)
- Quiet/verbose modes
- Desktop notifications on schema change
- Integration with common dev servers
- Performance metrics

### Phase 4: Advanced Features (Week 4)
- WebSocket support for real-time updates
- Multiple schema sources
- Parallel generation
- Type migration helpers

## Success Metrics

- **Speed**: Types regenerated within 500ms of schema change
- **Reliability**: 99% successful regeneration rate
- **Developer Satisfaction**: No manual type regeneration needed
- **Performance**: <1% CPU usage while watching

## Technical Decisions

1. **Use chokidar** for file watching (battle-tested, cross-platform)
2. **Use node-fetch with AbortController** for HTTP polling
3. **Store schema hash** in comment at top of generated file
4. **Use EventEmitter** pattern for extensibility
5. **Implement exponential backoff** for failed requests

## Next Immediate Steps

1. Implement basic watch mode with file system support
2. Add HTTP polling with configurable interval  
3. Implement schema hashing/diffing
4. Add quiet and verbose output modes
5. Write tests for watch mode scenarios
6. Update documentation with watch mode examples

## Long-term Vision

Eventually, @oats/gen could offer:
- **Language Server Protocol** support for real-time IDE integration
- **WebSocket subscriptions** to schema endpoints
- **Incremental compilation** for massive schemas
- **Type versioning** with migration support
- **Schema analytics** to track API evolution

The goal is to make type generation invisible—it should "just work" without developers thinking about it.