# Architecture Decisions & Next Steps

## Current State (Phase 1 Complete)

We've successfully implemented a basic watch mode that provides:
- File system watching for local schemas
- HTTP polling for remote schemas  
- Smart diffing with SHA-256 hashing
- CLI integration with configurable options
- Basic retry logic with exponential backoff

## Next Steps Prioritization

### Phase 2: Enhanced Developer Experience (1-2 weeks)

#### 2.1 Better Error Handling & Recovery

**Current Issue:** When the backend is down or returns invalid schemas, the watcher fails silently or floods the console.

**Options:**

1. **Circuit Breaker Pattern**
   - **Implementation:** After N failures, stop polling for M seconds
   - **Pros:** Prevents flooding, reduces resource usage
   - **Cons:** May miss quick recovery, adds complexity
   - **Decision:** Implement with configurable thresholds

2. **Progressive Backoff**
   - **Implementation:** Increase interval after each failure
   - **Pros:** Self-adjusting, handles flaky connections well
   - **Cons:** Slow recovery detection
   - **Decision:** Combine with circuit breaker

3. **Schema Validation Cache**
   - **Implementation:** Keep last valid schema, show diff on validation failure
   - **Pros:** Helps debug schema issues
   - **Cons:** Memory overhead
   - **Decision:** Implement with --debug flag

**Recommended Approach:**
```typescript
class SmartRetryStrategy {
  private failures = 0;
  private baseInterval: number;
  private maxInterval: number;
  
  getNextInterval(): number {
    // Exponential backoff with jitter
    const backoff = Math.min(
      this.baseInterval * Math.pow(2, this.failures),
      this.maxInterval
    );
    return backoff + Math.random() * 1000; // Add jitter
  }
  
  onSuccess() {
    this.failures = 0;
  }
  
  onFailure() {
    this.failures++;
  }
}
```

#### 2.2 Performance Optimizations

**Current Issue:** Large schemas (>10MB) cause noticeable lag during generation.

**Options:**

1. **Incremental Generation**
   - **Implementation:** Only regenerate changed endpoints/schemas
   - **Pros:** Massive speed improvement for large APIs
   - **Cons:** Complex diff algorithm, potential for drift
   - **Trade-off:** Start with endpoint-level diffing

2. **Worker Thread Generation**
   - **Implementation:** Move generation to worker thread
   - **Pros:** Non-blocking, better UX
   - **Cons:** Complexity, memory overhead
   - **Decision:** Implement for schemas >1MB

3. **Schema Caching**
   - **Implementation:** Cache parsed schemas in memory
   - **Pros:** Faster subsequent generations
   - **Cons:** Memory usage
   - **Decision:** LRU cache with size limit

**Recommended Implementation:**
```typescript
// Incremental generation strategy
interface SchemaDiff {
  added: Set<string>;
  modified: Set<string>;
  removed: Set<string>;
}

class IncrementalGenerator {
  async generateDiff(oldSchema: OpenAPI, newSchema: OpenAPI): Promise<SchemaDiff> {
    // Compare paths and components
    // Return only changed items
  }
  
  async applyDiff(diff: SchemaDiff, existingTypes: string): Promise<string> {
    // Surgically update only changed sections
    // Preserve unchanged code
  }
}
```

### Phase 3: Advanced Watch Features (2-3 weeks)

#### 3.1 Multi-Schema Support

**Use Case:** Microservices with multiple API endpoints

**Options:**

1. **Parallel Watching**
   ```json
   {
     "schemas": [
       { "url": "http://users-api/schema", "output": "src/api/users.ts" },
       { "url": "http://posts-api/schema", "output": "src/api/posts.ts" }
     ]
   }
   ```
   - **Pros:** Independent schemas, parallel generation
   - **Cons:** Multiple watchers, resource usage
   - **Decision:** Best for true microservices

2. **Schema Composition**
   ```json
   {
     "schemas": {
       "users": "http://users-api/schema",
       "posts": "http://posts-api/schema"
     },
     "output": "src/api/types.ts",
     "compose": true
   }
   ```
   - **Pros:** Single output file, unified types
   - **Cons:** Namespace conflicts, complex merging
   - **Decision:** Best for related services

3. **Federation Pattern**
   ```typescript
   // Generated federation file
   export * as UsersAPI from './users.types';
   export * as PostsAPI from './posts.types';
   export * as SharedTypes from './shared.types';
   ```
   - **Pros:** Clear separation, no conflicts
   - **Cons:** More complex imports
   - **Decision:** Recommended default

**Implementation Priority:** Start with parallel watching (simplest), then add composition.

#### 3.2 WebSocket Support

**Use Case:** Real-time schema updates without polling

**Options:**

1. **Server-Sent Events (SSE)**
   - **Pros:** Simple, HTTP-based, automatic reconnection
   - **Cons:** One-way communication, limited browser support
   - **Implementation:** `EventSource` API

2. **WebSocket with Reconnection**
   - **Pros:** Bi-directional, widely supported
   - **Cons:** Complex reconnection logic
   - **Implementation:** `ws` package with exponential backoff

3. **Socket.io Integration**
   - **Pros:** Fallbacks, rooms, acknowledgments
   - **Cons:** Heavy dependency, server-side requirements
   - **Decision:** Overkill for our use case

**Recommended:** SSE for simplicity, WebSocket as enhancement
```typescript
class SSEWatcher {
  private eventSource: EventSource;
  
  connect(url: string) {
    this.eventSource = new EventSource(`${url}/schema-changes`);
    
    this.eventSource.onmessage = (event) => {
      const change = JSON.parse(event.data);
      if (change.type === 'schema-updated') {
        this.regenerate();
      }
    };
    
    this.eventSource.onerror = () => {
      // Automatic reconnection handled by EventSource
      console.log('Reconnecting to schema changes stream...');
    };
  }
}
```

### Phase 4: IDE & Framework Integration (3-4 weeks)

#### 4.1 Language Server Protocol (LSP)

**Goal:** Real-time type checking and autocomplete in IDEs

**Architecture:**
```typescript
class OatsLanguageServer {
  // Provides:
  // - Hover information for API endpoints
  // - Autocomplete for paths and methods
  // - Go-to-definition for schema types
  // - Real-time validation against schema
}
```

**Trade-offs:**
- **Pros:** Best possible DX, IDE-agnostic
- **Cons:** Significant complexity, maintenance burden
- **Decision:** Build after stable v1.0

#### 4.2 Framework-Specific Plugins

**Priority Order:**

1. **Next.js Plugin**
   ```typescript
   // next.config.js
   const withOats = require('@oats/next-plugin');
   
   module.exports = withOats({
     schemas: ['http://api/schema'],
     watch: process.env.NODE_ENV === 'development'
   });
   ```

2. **Vite Plugin**
   ```typescript
   // vite.config.ts
   import oats from '@oats/vite-plugin';
   
   export default {
     plugins: [
       oats({
         schemas: ['./openapi.json'],
         hmr: true // Hot module replacement
       })
     ]
   };
   ```

3. **Webpack Plugin**
   - Lower priority due to declining usage
   - Focus on Next.js which uses Webpack internally

### Phase 5: Advanced Type Generation (4-6 weeks)

#### 5.1 Type Versioning & Migration

**Problem:** Breaking API changes require manual type updates

**Solution Options:**

1. **Version Coexistence**
   ```typescript
   // Generated
   export namespace v1 {
     export interface User { name: string; }
   }
   export namespace v2 {
     export interface User { firstName: string; lastName: string; }
   }
   
   // Migration helper
   export function migrateUserV1ToV2(user: v1.User): v2.User {
     return {
       firstName: user.name.split(' ')[0],
       lastName: user.name.split(' ')[1] || ''
     };
   }
   ```

2. **Deprecation Warnings**
   ```typescript
   export interface User {
     /** @deprecated Use firstName and lastName instead */
     name?: string;
     firstName: string;
     lastName: string;
   }
   ```

3. **Breaking Change Detection**
   - Compare schemas and generate migration guide
   - Fail CI if breaking changes detected without version bump

**Recommendation:** Implement deprecation warnings first (simplest), then version coexistence.

#### 5.2 Runtime Type Guards

**Current:** Zod schemas for validation
**Enhancement:** Generate efficient type guards

```typescript
// Generated type guard
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).name === 'string'
  );
}

// With deep validation
export function isValidUser(value: unknown): value is User {
  try {
    UserSchema.parse(value);
    return true;
  } catch {
    return false;
  }
}
```

### Phase 6: Ecosystem & Community (Ongoing)

#### 6.1 Plugin System

**Architecture:**
```typescript
interface OatsPlugin {
  name: string;
  version: string;
  
  // Hooks
  beforeFetch?(url: string): Promise<string>;
  afterFetch?(schema: OpenAPISchema): Promise<OpenAPISchema>;
  beforeGenerate?(schema: OpenAPISchema): Promise<OpenAPISchema>;
  afterGenerate?(code: string): Promise<string>;
  onWatch?(event: WatchEvent): void;
}

// Usage
{
  "plugins": [
    "@oats/plugin-mock-data",
    "@oats/plugin-graphql-codegen",
    "./custom-plugin.js"
  ]
}
```

**Core Plugins to Build:**
1. Mock data generation
2. API client generation
3. GraphQL schema conversion
4. Postman collection export
5. Custom type transformers

#### 6.2 Performance Benchmarks

**Metrics to Track:**
- Generation time vs schema size
- Memory usage during watch mode
- CPU usage during polling
- Time to first type after change

**Benchmark Suite:**
```typescript
const benchmarks = {
  small: { endpoints: 10, schemas: 5 },    // <100ms target
  medium: { endpoints: 50, schemas: 25 },   // <500ms target
  large: { endpoints: 200, schemas: 100 },  // <2s target
  enterprise: { endpoints: 1000, schemas: 500 } // <10s target
};
```

## Technical Debt & Refactoring

### Current Technical Debt

1. **Tight Coupling:** Generator and Watcher are tightly coupled
   - **Solution:** Extract interfaces, dependency injection
   - **Priority:** Medium

2. **Limited Testing:** No integration tests for watch mode
   - **Solution:** Add e2e tests with test server
   - **Priority:** High

3. **Error Messages:** Generic errors don't help debugging
   - **Solution:** Detailed error messages with suggestions
   - **Priority:** High

4. **Configuration:** No validation for oats.json
   - **Solution:** Zod schema for config validation
   - **Priority:** Medium

### Refactoring Priorities

1. **Extract Core Library**
   ```
   @oats/core - Schema parsing, validation
   @oats/generator - Type generation
   @oats/watcher - Watch mode
   @oats/cli - CLI interface
   ```

2. **Improve Testability**
   - Extract HTTP client interface
   - Mock file system in tests
   - Add integration test suite

3. **Performance Monitoring**
   - Add performance marks
   - Optional telemetry (opt-in)
   - Memory leak detection

## Decision Matrix

| Feature | Impact | Effort | Priority | Timeline |
|---------|--------|--------|----------|----------|
| Better error handling | High | Low | 1 | Week 1 |
| Incremental generation | High | High | 2 | Week 2-3 |
| Multi-schema support | Medium | Medium | 3 | Week 3-4 |
| WebSocket support | Low | Medium | 6 | Month 2 |
| LSP implementation | High | Very High | 8 | Month 3+ |
| Framework plugins | High | Medium | 4 | Week 4-5 |
| Type versioning | Medium | High | 7 | Month 2 |
| Plugin system | Medium | Medium | 5 | Week 5-6 |

## Risk Mitigation

### Performance Risks

**Risk:** Large schemas cause memory/CPU issues
**Mitigation:** 
- Streaming parser for huge schemas
- Worker threads for generation
- Configurable memory limits

### Compatibility Risks

**Risk:** Breaking changes in OpenAPI spec
**Mitigation:**
- Version detection and adaptation
- Support multiple spec versions
- Comprehensive test suite

### Adoption Risks

**Risk:** Users don't adopt due to complexity
**Mitigation:**
- Zero-config defaults
- Interactive init wizard
- Comprehensive examples
- Video tutorials

## Success Metrics

### Short Term (1 month)
- [ ] <500ms generation for medium schemas
- [ ] Zero crashes in 24h watch mode
- [ ] 90% of schemas generate valid TypeScript
- [ ] <1% CPU usage while watching

### Medium Term (3 months)
- [ ] 1000+ weekly npm downloads
- [ ] Support for 95% of OpenAPI 3.x features
- [ ] 5+ framework integrations
- [ ] <100ms incremental generation

### Long Term (6 months)
- [ ] 10,000+ weekly downloads
- [ ] Industry benchmark for performance
- [ ] De facto tool for OpenAPI→TS
- [ ] Active plugin ecosystem

## Conclusion

The path forward prioritizes:
1. **Reliability** - Better error handling and recovery
2. **Performance** - Incremental generation and caching
3. **Integration** - Framework plugins and multi-schema support
4. **Ecosystem** - Plugin system and community contributions

Each phase builds on the previous, ensuring we maintain stability while adding features. The modular architecture allows parallel development once the core is stable.