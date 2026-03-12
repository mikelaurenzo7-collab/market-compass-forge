import { describe, it, expect } from 'vitest';
import {
  BOT_TEMPLATES,
  getTemplateById,
  getTemplatesByFamily,
  getTemplatesByPlatform,
  getTemplatesByDifficulty,
  type BotTemplate,
} from '../templates';

describe('Bot Template Library', () => {
  describe('BOT_TEMPLATES', () => {
    it('has 14 templates total', () => {
      expect(BOT_TEMPLATES).toHaveLength(14);
    });

    it('has 5 trading templates', () => {
      const trading = BOT_TEMPLATES.filter(t => t.family === 'trading');
      expect(trading).toHaveLength(5);
    });

    it('has 3 store templates', () => {
      const store = BOT_TEMPLATES.filter(t => t.family === 'store');
      expect(store).toHaveLength(3);
    });

    it('has 3 social templates', () => {
      const social = BOT_TEMPLATES.filter(t => t.family === 'social');
      expect(social).toHaveLength(3);
    });

    it('has 3 workforce templates', () => {
      const workforce = BOT_TEMPLATES.filter(t => t.family === 'workforce');
      expect(workforce).toHaveLength(3);
    });

    it('all templates have unique IDs', () => {
      const ids = BOT_TEMPLATES.map(t => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all templates have required fields', () => {
      for (const t of BOT_TEMPLATES) {
        expect(t.id).toBeTruthy();
        expect(t.name).toBeTruthy();
        expect(['trading', 'store', 'social', 'workforce']).toContain(t.family);
        expect(t.platforms.length).toBeGreaterThan(0);
        expect(t.strategy).toBeTruthy();
        expect(t.description).toBeTruthy();
        expect(['beginner', 'intermediate', 'advanced']).toContain(t.difficulty);
        expect(['low', 'medium', 'high']).toContain(t.riskLevel);
        expect(t.estimatedSetupMinutes).toBeGreaterThan(0);
        expect(t.tags.length).toBeGreaterThan(0);
        expect(t.longDescription).toBeTruthy();
        expect(typeof t.defaultPaperMode).toBe('boolean');
        expect(typeof t.config).toBe('object');
      }
    });
  });

  describe('getTemplateById', () => {
    it('returns template for valid ID', () => {
      const t = getTemplateById('btc-dca-weekly');
      expect(t).toBeDefined();
      expect(t!.name).toBe('Bitcoin Weekly DCA');
      expect(t!.family).toBe('trading');
    });

    it('returns undefined for invalid ID', () => {
      expect(getTemplateById('nonexistent-template')).toBeUndefined();
    });

    it('returns every template by its own ID', () => {
      for (const template of BOT_TEMPLATES) {
        const found = getTemplateById(template.id);
        expect(found).toBeDefined();
        expect(found!.id).toBe(template.id);
      }
    });
  });

  describe('getTemplatesByFamily', () => {
    it('filters trading templates', () => {
      const results = getTemplatesByFamily('trading');
      expect(results).toHaveLength(5);
      expect(results.every(t => t.family === 'trading')).toBe(true);
    });

    it('filters store templates', () => {
      const results = getTemplatesByFamily('store');
      expect(results).toHaveLength(3);
      expect(results.every(t => t.family === 'store')).toBe(true);
    });

    it('filters social templates', () => {
      const results = getTemplatesByFamily('social');
      expect(results).toHaveLength(3);
      expect(results.every(t => t.family === 'social')).toBe(true);
    });

    it('filters workforce templates', () => {
      const results = getTemplatesByFamily('workforce');
      expect(results).toHaveLength(3);
      expect(results.every(t => t.family === 'workforce')).toBe(true);
    });
  });

  describe('getTemplatesByPlatform', () => {
    it('finds templates for coinbase', () => {
      const results = getTemplatesByPlatform('coinbase');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(t => t.platforms.includes('coinbase'))).toBe(true);
    });

    it('finds templates for shopify', () => {
      const results = getTemplatesByPlatform('shopify');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(t => t.platforms.includes('shopify'))).toBe(true);
    });

    it('returns empty for unknown platform', () => {
      expect(getTemplatesByPlatform('somefakeplatform')).toHaveLength(0);
    });
  });

  describe('getTemplatesByDifficulty', () => {
    it('filters beginner templates', () => {
      const results = getTemplatesByDifficulty('beginner');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(t => t.difficulty === 'beginner')).toBe(true);
    });

    it('filters intermediate templates', () => {
      const results = getTemplatesByDifficulty('intermediate');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(t => t.difficulty === 'intermediate')).toBe(true);
    });

    it('filters advanced templates', () => {
      const results = getTemplatesByDifficulty('advanced');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(t => t.difficulty === 'advanced')).toBe(true);
    });
  });

  describe('Template content quality', () => {
    it('trading templates default to paper mode', () => {
      const trading = getTemplatesByFamily('trading');
      expect(trading.every(t => t.defaultPaperMode === true)).toBe(true);
    });

    it('trading template configs include safety parameters', () => {
      const trading = getTemplatesByFamily('trading');
      for (const t of trading) {
        expect(t.config).toHaveProperty('maxPositionSizeUsd');
        expect(t.config).toHaveProperty('maxDailyLossUsd');
        expect(t.config).toHaveProperty('stopLossPercent');
      }
    });

    it('every template has a multiline longDescription', () => {
      for (const t of BOT_TEMPLATES) {
        expect(t.longDescription.length).toBeGreaterThan(50);
        expect(t.longDescription).toContain('\n');
      }
    });
  });
});
