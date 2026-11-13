// Solo para verificar tipos fuera de Deno (en el CI de Node). En Supabase corre Deno real.
declare const Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): unknown
  env: { toObject(): Record<string, string> }
}
