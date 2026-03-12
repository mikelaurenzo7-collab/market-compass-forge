import { TradingRuntimeDO } from './durable-objects/TradingRuntimeDO.js';
import { StoreSocialRuntimeDO } from './durable-objects/StoreSocialRuntimeDO.js';

export { TradingRuntimeDO, StoreSocialRuntimeDO };
export type { TradingConfig } from './durable-objects/TradingRuntimeDO.js';
export type { StoreSocialConfig, StoreSocialFamily } from './durable-objects/StoreSocialRuntimeDO.js';

export function bootstrapWorkers(config?: ConstructorParameters<typeof TradingRuntimeDO>[0]) {
  const runtime = new TradingRuntimeDO(config);
  return runtime.tick();
}
