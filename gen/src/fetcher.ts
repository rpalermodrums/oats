import { readFile } from 'fs/promises';
import type { OpenAPIV3 } from 'openapi-types';

export async function fetchSchema(source: string): Promise<OpenAPIV3.Document> {
  let content: string;

  if (source.startsWith('http://') || source.startsWith('https://')) {
    const response = await fetch(source, {
      headers: {
        Accept: 'application/json, application/yaml, text/yaml',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
    }

    content = await response.text();
  } else {
    content = await readFile(source, 'utf-8');
  }

  try {
    return JSON.parse(content);
  } catch {
    throw new Error('Schema must be valid JSON (YAML support coming soon)');
  }
}
