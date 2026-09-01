declare module "pg" {
  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<T = unknown>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
    end(): Promise<void>;
  }

  export class Client {
    constructor(config?: Record<string, unknown>);
    connect(): Promise<void>;
    query<T = unknown>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
    end(): Promise<void>;
  }
}
