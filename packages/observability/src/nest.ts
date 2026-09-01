import { Global, Module } from '@nestjs/common';
import { AsyncCallContext, CallContext } from './index.js';

@Global()
@Module({
  providers: [{ provide: CallContext, useClass: AsyncCallContext }],
  exports: [CallContext],
})
export class CallContextModule {}
