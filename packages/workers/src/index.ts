import { TradingRuntimeDO } from './durable-objects/TradingRuntimeDO.js';

export function bootstrapWorkers() {
  const runtime = new TradingRuntimeDO();
  return runtime.tick();
}
