import { watch } from 'chokidar';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import { fetchSchema } from './fetcher';
import { validateSchema } from './validator';
import { generateTypes } from './generator';
import { generateZodSchemas } from './zod-generator';
import { Config } from './config';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';

interface WatchOptions {
  interval?: number;
  quiet?: boolean;
  diffOnly?: boolean;
  retries?: number;
}

export class SchemaWatcher extends EventEmitter {
  private lastHash: string = '';
  private pollInterval?: NodeJS.Timeout;
  private retryCount: number = 0;
  
  constructor(
    private config: Config,
    private options: WatchOptions = {}
  ) {
    super();
    this.options = {
      interval: 2000,
      quiet: false,
      diffOnly: true,
      retries: 3,
      ...options
    };
  }
  
  async start(schemaUrl?: string): Promise<void> {
    const url = schemaUrl || this.config.schema;
    
    if (!url) {
      throw new Error('No schema URL provided');
    }
    
    if (!this.options.quiet) {
      console.log(`👀 Watching ${url} for changes...`);
    }
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      this.startHttpPolling(url);
    } else {
      this.startFileWatching(url);
    }
    
    // Generate initial types
    await this.checkAndGenerate(url);
  }
  
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
    }
    
    if (!this.options.quiet) {
      console.log('👋 Stopped watching for changes');
    }
  }
  
  private startFileWatching(filePath: string): void {
    const watcher = watch(filePath, {
      persistent: true,
      ignoreInitial: true
    });
    
    watcher.on('change', async () => {
      if (!this.options.quiet) {
        console.log('📝 File changed, regenerating types...');
      }
      await this.checkAndGenerate(filePath);
    });
    
    watcher.on('error', (error) => {
      console.error('Watch error:', error);
      this.emit('error', error);
    });
  }
  
  private startHttpPolling(url: string): void {
    this.pollInterval = setInterval(async () => {
      try {
        await this.checkAndGenerate(url);
        this.retryCount = 0;
      } catch (error) {
        this.retryCount++;
        
        if (this.retryCount <= (this.options.retries || 3)) {
          if (!this.options.quiet) {
            console.warn(`⚠️  Failed to fetch schema (attempt ${this.retryCount}/${this.options.retries})`);
          }
        } else {
          console.error('❌ Max retries reached. Still watching...');
          this.retryCount = 0;
        }
      }
    }, this.options.interval);
  }
  
  private async checkAndGenerate(source: string): Promise<void> {
    try {
      // Fetch schema
      const schema = await fetchSchema(source);
      
      // Check if schema changed
      if (this.options.diffOnly) {
        const schemaString = JSON.stringify(schema);
        const hash = createHash('sha256').update(schemaString).digest('hex');
        
        if (hash === this.lastHash) {
          return; // No changes
        }
        
        this.lastHash = hash;
      }
      
      // Validate schema
      const validated = await validateSchema(schema);
      
      // Generate TypeScript types
      const output = await generateTypes(validated, this.config);
      
      // Add hash as comment if diffing
      const finalOutput = this.options.diffOnly 
        ? `// Schema hash: ${this.lastHash}\n${output}`
        : output;
      
      // Write TypeScript types
      const outputPath = resolve(process.cwd(), this.config.output);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, finalOutput, 'utf-8');
      
      // Generate Zod schemas if enabled
      if (this.config.options?.generateZod) {
        const zodOutput = await generateZodSchemas(validated, this.config);
        const zodOutputPath = this.config.options.zodOutput 
          ? resolve(process.cwd(), this.config.options.zodOutput)
          : outputPath.replace(/\.ts$/, '.zod.ts');
        
        const finalZodOutput = this.options.diffOnly
          ? `// Schema hash: ${this.lastHash}\n${zodOutput}`
          : zodOutput;
        
        await writeFile(zodOutputPath, finalZodOutput, 'utf-8');
      }
      
      if (!this.options.quiet) {
        const time = new Date().toLocaleTimeString();
        console.log(`✅ [${time}] Types regenerated successfully`);
      }
      
      this.emit('generated', { hash: this.lastHash });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }
}

export async function watchCommand(
  urlOverride?: string,
  options: WatchOptions = {}
): Promise<void> {
  const { loadConfig } = await import('./config');
  const config = await loadConfig();
  const schemaUrl = urlOverride || config.schema;
  
  const watcher = new SchemaWatcher(config, options);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down watcher...');
    watcher.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    watcher.stop();
    process.exit(0);
  });
  
  try {
    await watcher.start(schemaUrl);
    
    // Keep process alive
    process.stdin.resume();
  } catch (error: any) {
    console.error('Failed to start watcher:', error.message);
    process.exit(1);
  }
}