interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: { last_row_id?: number; changes?: number };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface R2ObjectBody {
  body: ReadableStream;
  writeHttpMetadata(headers: Headers): void;
}

interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | Blob, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
}

declare module "cloudflare:workers" {
  export const env: {
    DB: D1Database;
    BUCKET: R2Bucket;
  };
}
