# Technical Trade-offs & Design Decisions

## Core Architecture Trade-offs

### 1. Monolithic vs Modular Package Structure

#### Current: Monolithic Package
```
@oats/gen (single package with all features)
```

#### Alternative: Modular Packages
```
@oats/core
@oats/generator
@oats/watcher
@oats/cli
@oats/plugins
```

**Trade-off Analysis:**

| Aspect | Monolithic | Modular |
|--------|-----------|---------|
| **Installation** | ✅ Single npm install | ❌ Multiple packages to manage |
| **Bundle Size** | ❌ Includes unused features | ✅ Pick only what you need |
| **Maintenance** | ✅ Easier versioning | ❌ Complex dependency management |
| **Breaking Changes** | ❌ Affects all users | ✅ Isolated to specific packages |
| **Testing** | ✅ Single test suite | ❌ Cross-package integration tests |
| **Publishing** | ✅ Single publish | ❌ Coordinated releases |

**Decision:** Start monolithic, refactor to modular at v2.0 when API is stable.

**Rationale:** 
- Faster iteration in early stages
- Easier for users to adopt
- Can split later without breaking changes using re-exports

### 2. Type Generation Strategy

#### Current: Template-Based Generation
```typescript
// Direct string concatenation
output.push(`export interface ${name} {`);
```

#### Alternative: AST-Based Generation
```typescript
// Using TypeScript Compiler API
const interfaceDeclaration = ts.createInterfaceDeclaration(
  undefined,
  [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
  name,
  undefined,
  undefined,
  properties
);
```

**Trade-off Analysis:**

| Aspect | Template-Based | AST-Based |
|--------|---------------|-----------|
| **Performance** | ✅ Fast, minimal overhead | ❌ Slower, AST construction overhead |
| **Correctness** | ❌ Potential syntax errors | ✅ Guaranteed valid TypeScript |
| **Flexibility** | ✅ Easy to customize output | ❌ Limited by AST structure |
| **Maintainability** | ❌ String manipulation | ✅ Type-safe transformations |
| **Dependencies** | ✅ None | ❌ TypeScript compiler dependency |
| **Debugging** | ✅ Easy to understand | ❌ Complex AST debugging |

**Decision:** Template-based with validation step.

**Rationale:**
- 10x faster for large schemas
- Output is predictable and debuggable
- Can add TypeScript validation as post-process step

### 3. Watch Mode Implementation

#### Current: Polling + File Watching Hybrid
```typescript
if (isHttpUrl(schema)) {
  pollInterval = setInterval(check, 2000);
} else {
  chokidar.watch(schemaPath);
}
```

#### Alternatives Considered:

**A. Pure Polling**
```typescript
setInterval(() => checkAllSources(), interval);
```
- ✅ Consistent behavior
- ✅ Simple implementation
- ❌ Wasteful for local files
- ❌ Delayed change detection

**B. File System Events Only**
```typescript
fs.watch(schemaPath, regenerate);
```
- ✅ Instant local changes
- ✅ Zero overhead
- ❌ Doesn't work for HTTP
- ❌ Platform differences

**C. Push-Based (WebSocket/SSE)**
```typescript
ws.on('schema-change', regenerate);
```
- ✅ Real-time updates
- ✅ Efficient
- ❌ Requires server support
- ❌ Complex reconnection logic

**Decision:** Hybrid approach with progressive enhancement.

**Rationale:**
- Best performance for each source type
- Graceful fallback for unsupported features
- Can add WebSocket when servers support it

### 4. Schema Caching Strategy

#### Current: Hash-Based Invalidation
```typescript
const hash = sha256(JSON.stringify(schema));
if (hash !== lastHash) regenerate();
```

#### Alternatives:

**A. Timestamp-Based**
```typescript
if (schema.lastModified > lastGenerated) regenerate();
```
- ✅ Faster check
- ❌ Requires server support
- ❌ Time sync issues

**B. Deep Diff**
```typescript
const changes = deepDiff(oldSchema, newSchema);
if (changes.length > 0) regenerateChanged(changes);
```
- ✅ Precise change detection
- ✅ Enables incremental generation
- ❌ Memory intensive
- ❌ Complex implementation

**C. Version-Based**
```typescript
if (schema.info.version !== lastVersion) regenerate();
```
- ✅ Semantic versioning
- ❌ Requires manual version bumps
- ❌ Misses non-breaking changes

**Decision:** Hash with optional deep diff for incremental generation.

**Rationale:**
- Hash is fast and reliable
- Deep diff can be opt-in for performance
- No external dependencies

## Performance Trade-offs

### 5. Memory vs Speed Optimization

#### Current: Balanced Approach
```typescript
class Generator {
  private cache = new LRUCache(100); // Limited cache
  
  generate(schema) {
    // Cache frequently used, regenerate rest
  }
}
```

#### Alternative A: Memory-Optimized
```typescript
class Generator {
  // No caching, streaming generation
  async *generateStream(schema) {
    yield* processInChunks(schema);
  }
}
```
- ✅ Minimal memory usage
- ✅ Can handle huge schemas
- ❌ Slower regeneration
- ❌ No incremental updates

#### Alternative B: Speed-Optimized
```typescript
class Generator {
  private cache = new Map(); // Unlimited cache
  
  generate(schema) {
    // Cache everything
  }
}
```
- ✅ Instant regeneration
- ✅ Perfect for incremental
- ❌ High memory usage
- ❌ Memory leaks risk

**Decision:** Configurable with sensible defaults.

```typescript
{
  "performance": {
    "mode": "balanced", // or "speed" or "memory"
    "cacheSize": 100,
    "streaming": false
  }
}
```

**Rationale:**
- Different projects have different needs
- Defaults work for 90% of users
- Power users can optimize

### 6. Parallel Processing

#### Current: Sequential Generation
```typescript
for (const endpoint of endpoints) {
  await generateEndpoint(endpoint);
}
```

#### Alternative: Parallel Generation
```typescript
await Promise.all(
  endpoints.map(endpoint => generateEndpoint(endpoint))
);
```

**Trade-off Analysis:**

| Approach | Pros | Cons |
|----------|------|------|
| **Sequential** | Predictable memory usage, Simple debugging | Slower for large schemas |
| **Parallel** | 3-5x faster for large schemas | Memory spikes, Race conditions |
| **Worker Threads** | CPU parallelism, Isolated failures | Complex communication, Overhead for small schemas |
| **Batched** | Balanced performance, Controlled concurrency | More complex implementation |

**Decision:** Batched parallel with configurable concurrency.

```typescript
class BatchedGenerator {
  async generate(items: any[], batchSize = 10) {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.all(batch.map(this.generateOne));
    }
  }
}
```

**Rationale:**
- Prevents memory explosions
- Still gets parallelism benefits
- Tunable for different systems

## Developer Experience Trade-offs

### 7. Configuration Complexity

#### Current: Minimal Config
```json
{
  "schema": "http://api/schema",
  "output": "types.ts"
}
```

#### Alternative: Comprehensive Config
```json
{
  "schema": {
    "url": "http://api/schema",
    "headers": {},
    "timeout": 5000
  },
  "output": {
    "path": "types.ts",
    "format": "typescript",
    "style": "interface"
  },
  "generation": {
    "mode": "strict",
    "helpers": true,
    "validation": "zod"
  },
  "watch": {
    "interval": 2000,
    "retries": 3
  }
}
```

**Trade-off:**
- Simple config = Easy to start, Limited flexibility
- Complex config = Powerful, Overwhelming for beginners

**Decision:** Progressive disclosure with defaults.

```typescript
// Minimal works
{ "schema": "url", "output": "file.ts" }

// Can be expanded when needed
{
  "schema": "url",
  "output": "file.ts",
  "options": { /* advanced */ }
}
```

**Rationale:**
- Zero-config for common case
- Power when you need it
- Backwards compatible

### 8. Error Handling Philosophy

#### Current: Fail Fast with Clear Errors
```typescript
throw new DetailedError('What went wrong', 'How to fix it');
```

#### Alternative: Graceful Degradation
```typescript
try {
  return generateOptimalTypes();
} catch {
  return generateFallbackTypes();
}
```

**Trade-off Analysis:**

| Fail Fast | Graceful Degradation |
|-----------|---------------------|
| ✅ Predictable behavior | ✅ Always produces output |
| ✅ Catches issues early | ✅ Better user experience |
| ❌ Can block development | ❌ May hide problems |
| ❌ Requires manual fixes | ❌ Partial types confusing |

**Decision:** Configurable strictness levels.

```typescript
enum StrictnessLevel {
  STRICT = 'strict',     // Fail on any issue
  NORMAL = 'normal',     // Fail on critical issues
  LENIENT = 'lenient'   // Try to generate something
}
```

**Rationale:**
- Development wants strict
- Production wants lenient
- CI/CD wants normal

## Ecosystem Trade-offs

### 9. Plugin Architecture

#### Current: Hook-Based Plugins
```typescript
interface Plugin {
  beforeGenerate?(schema): schema;
  afterGenerate?(types): types;
}
```

#### Alternative: Middleware Pattern
```typescript
type Middleware = (next: Generator) => Generator;
```

**Trade-off:**

| Hook-Based | Middleware |
|------------|------------|
| ✅ Easy to understand | ✅ More powerful |
| ✅ Clear plugin boundaries | ✅ Full control |
| ❌ Limited interception points | ❌ Can break everything |
| ✅ Safer | ❌ Complex debugging |

**Decision:** Hooks with escape hatch.

```typescript
interface Plugin {
  // Safe hooks for common cases
  hooks?: PluginHooks;
  
  // Escape hatch for advanced usage
  middleware?: Middleware;
}
```

**Rationale:**
- 90% of plugins just need hooks
- Power users can use middleware
- Can sandbox hooks for safety

### 10. Framework Integration Level

#### Options:

**A. Pure Types (Current)**
```typescript
// Just generate types
export interface User { ... }
```

**B. Runtime Client**
```typescript
// Generate typed API client
export const api = {
  getUser: (id: string) => fetch(`/users/${id}`)
};
```

**C. Full SDK**
```typescript
// Generate everything
export class UserService { ... }
export const userValidators = { ... }
export const userMocks = { ... }
```

**Trade-off Analysis:**

| Aspect | Pure Types | Runtime Client | Full SDK |
|--------|-----------|---------------|----------|
| **Bundle Size** | ✅ Minimal | 🔶 Moderate | ❌ Large |
| **Flexibility** | ✅ Use any HTTP client | 🔶 Some flexibility | ❌ Opinionated |
| **Features** | ❌ Basic | 🔶 Good | ✅ Everything |
| **Maintenance** | ✅ Simple | 🔶 Moderate | ❌ Complex |
| **Breaking Changes** | ✅ Rare | 🔶 Occasional | ❌ Frequent |

**Decision:** Pure types by default, clients via plugins.

**Rationale:**
- Types are universally useful
- Clients are opinionated
- Plugins let users choose

## Future-Proofing Trade-offs

### 11. OpenAPI Version Support

#### Current: 3.0.x Focus
```typescript
if (version.startsWith('3.0')) {
  return generateTypes(schema);
}
```

#### Options:
- Support 2.0 (Swagger)
- Support 3.1.x
- Support AsyncAPI
- Support GraphQL

**Trade-off:**
- More formats = Larger user base, Complex codebase
- Single format = Simple and reliable, Limited reach

**Decision:** OpenAPI 3.x with plugin adapters.

```typescript
// Core supports OpenAPI 3.x
const core = new Generator(openapi3Schema);

// Plugins adapt other formats
const swagger2Plugin = new Swagger2Adapter();
const graphqlPlugin = new GraphQLAdapter();
```

**Rationale:**
- OpenAPI 3.x is the standard
- Plugins can add other formats
- Core stays simple

### 12. Breaking Change Strategy

#### Option A: Strict SemVer
- Major version for any breaking change
- Could reach v20.0.0 quickly

#### Option B: Scheduled Releases
- Breaking changes bundled annually
- Like Angular/Node.js

#### Option C: Perpetual Beta
- Stay in 0.x.x
- Breaking changes anytime

**Decision:** Strict SemVer with migration tools.

```typescript
// Provide migration tool
npx @oats/gen migrate --from 1.0 --to 2.0

// Codemods for common changes
npx @oats/gen codemod update-imports
```

**Rationale:**
- Predictability for enterprise users
- Migration tools reduce pain
- Trust through stability

## Conclusion

These trade-offs prioritize:

1. **Simplicity over Features** - Easy to start, powerful when needed
2. **Performance over Perfection** - Fast defaults, correctness via options
3. **Stability over Innovation** - Predictable behavior, experimental via plugins
4. **Developer Experience over Purity** - Practical solutions over theoretical ideals

Each decision can be revisited as we learn from real-world usage, but the architecture supports evolution without revolution.