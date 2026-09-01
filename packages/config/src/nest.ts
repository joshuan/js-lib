import { Module, type DynamicModule, type InjectionToken, type Provider } from '@nestjs/common';
import type { ConfigLoader } from './index.js';
import { TypedConfig } from './index.js';

@Module({})
class SharedConfigModule {}

export function createConfigModule<T extends object>(options: {
  readonly token: InjectionToken;
  readonly loader: ConfigLoader<T>;
  readonly global?: boolean;
}): DynamicModule {
  const provider: Provider = {
    provide: options.token,
    useFactory: (): TypedConfig<T> => options.loader.load(),
  };
  return {
    module: SharedConfigModule,
    global: options.global ?? true,
    providers: [provider],
    exports: [provider],
  };
}
