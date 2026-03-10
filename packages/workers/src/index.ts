import { TradingRuntimeDO } from './durable-objects/TradingRuntimeDO.js';

export { TradingRuntimeDO };

export function bootstrapWorkers(config?: ConstructorParameters<typeof TradingRuntimeDO>[0]) {
  const runtime = new TradingRuntimeDO(config);
  return runtime.tick();
}
