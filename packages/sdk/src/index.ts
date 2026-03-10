import type { BotFamily } from '@beastbots/shared';

export interface BotManifest {
  id: string;
  family: BotFamily;
  name: string;
  description: string;
}

export function defineBot(manifest: BotManifest): BotManifest {
  return manifest;
}
