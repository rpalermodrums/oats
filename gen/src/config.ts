import { readFile } from 'fs/promises';
import { resolve } from 'path';

export interface Config {
  schema: string;
  output: string;
  options?: {
    includeHelpers?: boolean;
    versionCheck?: boolean;
    dateFormat?: 'string' | 'Date';
    generateZod?: boolean;
    zodOutput?: string;
  };
}

const DEFAULT_CONFIG: Config = {
  schema: process.env.API_URL ? `${process.env.API_URL}/openapi.json` : '',
  output: 'src/api/types.ts'
};

export async function loadConfig(): Promise<Config> {
  const configPath = resolve(process.cwd(), 'oats.json');
  
  try {
    const content = await readFile(configPath, 'utf-8');
    const userConfig = JSON.parse(content);
    
    return {
      ...DEFAULT_CONFIG,
      ...userConfig,
      schema: expandEnvVars(userConfig.schema || DEFAULT_CONFIG.schema)
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function initConfig(): Promise<void> {
  const configPath = resolve(process.cwd(), 'oats.json');
  const config: Config = {
    schema: process.env.API_URL ? `${process.env.API_URL}/openapi.json` : 'http://localhost:8000/openapi.json',
    output: 'src/api/types.ts',
    options: {
      includeHelpers: true,
      versionCheck: false,
      dateFormat: 'string',
      generateZod: false
    }
  };
  
  const { writeFile } = await import('fs/promises');
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  console.log('✅ Created oats.json config file');
}

function expandEnvVars(str: string): string {
  return str.replace(/\$\{([^}]+)\}/g, (_, expr) => {
    const [varName, defaultValue] = expr.split(':-');
    return process.env[varName] || defaultValue || '';
  });
}