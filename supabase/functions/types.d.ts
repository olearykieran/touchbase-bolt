// Declare Deno types for TypeScript
declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
    toObject(): Record<string, string>;
  };
}

// Declare module for Supabase functions
declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (req: Request) => Promise<Response> | Response): void;
  export interface ServeInit {
    port?: number;
    hostname?: string;
    handler?: (req: Request) => Promise<Response> | Response;
    onError?: (error: unknown) => Promise<Response> | Response;
    signal?: AbortSignal;
  }
}

declare module 'npm:@supabase/supabase-js@2.39.3' {
  export * from '@supabase/supabase-js';
}

declare module 'npm:openai@4.28.0' {
  export * from 'openai';
}
