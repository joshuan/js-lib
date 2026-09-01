export type SharedNextConfigOptions = {
  readonly optimizePackageImports?: readonly string[];
  readonly legacyBuildLint?: boolean;
  readonly overrides?: Readonly<Record<string, unknown>>;
};

export declare function createNextConfig(
  options?: SharedNextConfigOptions,
): Readonly<Record<string, unknown>>;
