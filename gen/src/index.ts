#!/usr/bin/env node

import { fetchSchema } from './fetcher';
import { validateSchema } from './validator';
import { generateTypes } from './generator';
import { generateZodSchemas } from './zod-generator';
import { loadConfig, initConfig, type Config } from './config';
import { writeFile, mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'init':
        await initConfig();
        break;
      
      case 'gen':
      case undefined:
        await generate(args[1]);
        break;
      
      case '--version':
        const pkg = await import('../package.json');
        console.log(pkg.version);
        break;
      
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

async function generate(urlOverride?: string) {
  const config = await loadConfig();
  const schemaUrl = urlOverride || config.schema;
  
  if (!schemaUrl) {
    throw new Error('No schema URL provided. Use "oats init" or pass URL as argument');
  }

  console.log(`📥 Fetching schema from ${schemaUrl}...`);
  const schema = await fetchSchema(schemaUrl);
  
  console.log('✓ Validating OpenAPI schema...');
  const validated = await validateSchema(schema);
  
  console.log('🔧 Generating TypeScript types...');
  const output = await generateTypes(validated, config);
  
  const outputPath = resolve(process.cwd(), config.output);
  console.log(`💾 Writing to ${outputPath}...`);
  
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, output, 'utf-8');
  
  // Generate Zod schemas if enabled
  if (config.options?.generateZod) {
    console.log('🔧 Generating Zod schemas...');
    const zodOutput = await generateZodSchemas(validated, config);
    
    // Determine Zod output path
    const zodOutputPath = config.options.zodOutput 
      ? resolve(process.cwd(), config.options.zodOutput)
      : outputPath.replace(/\.ts$/, '.zod.ts');
    
    console.log(`💾 Writing Zod schemas to ${zodOutputPath}...`);
    await writeFile(zodOutputPath, zodOutput, 'utf-8');
  }
  
  console.log('✅ Done!');
}

main();