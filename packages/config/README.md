# @joshuan/config

Typed environment loading without owning an application's schema.

```ts
const config = defineConfig({
  parse: (env) => AppSchema.safeParse(env),
  isProduction: (values) => values.NODE_ENV === 'production',
  productionChecks: [
    (values) => (values.APP_BASE_URL.startsWith('https://') ? [] : ['APP_BASE_URL must be https']),
  ],
});

export const loadConfig = config.load;
```

`@joshuan/config/nest` exposes a small dynamic-module binding. The core entrypoint has no framework
dependency.
