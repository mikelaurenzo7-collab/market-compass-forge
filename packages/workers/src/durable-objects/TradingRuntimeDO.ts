export class TradingRuntimeDO {
  private lastHeartbeat = Date.now();

  tick() {
    this.lastHeartbeat = Date.now();
    return { ok: true, loopSeconds: 1 };
  }
}
