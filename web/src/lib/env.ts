export function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function mustGetEnvAny(names: string[]): { name: string; value: string } {
  for (const name of names) {
    const v = process.env[name];
    if (v) return { name, value: v };
  }
  throw new Error(`Missing required env var (one of): ${names.join(", ")}`);
}


