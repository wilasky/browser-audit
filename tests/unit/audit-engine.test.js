import { describe, it, expect } from 'vitest';
import { calculateScore, scoreLabel } from '../../extension/background/audit-engine.js';

// calculateScore and scoreLabel are pure functions — no chrome mocks needed

describe('calculateScore', () => {
  it('returns 100 when all checks pass', () => {
    const results = [
      { status: 'pass', weight: 10 },
      { status: 'pass', weight: 8 },
    ];
    expect(calculateScore(results)).toBe(100);
  });

  it('deducts full weight for fail', () => {
    const results = [
      { status: 'fail', weight: 10 },
      { status: 'pass', weight: 10 },
    ];
    // lost 10 of 20 total weight → 50
    expect(calculateScore(results)).toBe(50);
  });

  it('deducts half weight for warn', () => {
    const results = [
      { status: 'warn', weight: 10 },
      { status: 'pass', weight: 10 },
    ];
    // lost 5 of 20 → 75
    expect(calculateScore(results)).toBe(75);
  });

  it('ignores skipped checks from weight total', () => {
    const results = [
      { status: 'pass', weight: 10 },
      { status: 'skipped', weight: 15 },
    ];
    // skipped excluded → 10/10 → 100
    expect(calculateScore(results)).toBe(100);
  });

  it('returns 100 when all checks are skipped', () => {
    const results = [{ status: 'skipped', weight: 10 }];
    expect(calculateScore(results)).toBe(100);
  });

  it('clamps to 0 on catastrophic failures', () => {
    const results = [
      { status: 'fail', weight: 15 },
      { status: 'fail', weight: 10 },
      { status: 'fail', weight: 8 },
    ];
    expect(calculateScore(results)).toBe(0);
  });

  it('mixes warn and fail correctly', () => {
    const results = [
      { status: 'fail', weight: 10 },   // -10
      { status: 'warn', weight: 10 },   // -5
      { status: 'pass', weight: 10 },   // 0
    ];
    // lost 15 of 30 → 50
    expect(calculateScore(results)).toBe(50);
  });
});

describe('scoreLabel', () => {
  it('returns Excelente for 90-100', () => {
    expect(scoreLabel(100).label).toBe('Excelente');
    expect(scoreLabel(90).label).toBe('Excelente');
    expect(scoreLabel(100).level).toBe('green');
  });

  it('returns Bueno for 75-89', () => {
    expect(scoreLabel(89).label).toBe('Bueno');
    expect(scoreLabel(75).label).toBe('Bueno');
  });

  it('returns Mejorable for 60-74', () => {
    expect(scoreLabel(74).label).toBe('Mejorable');
    expect(scoreLabel(60).label).toBe('Mejorable');
    expect(scoreLabel(60).level).toBe('amber');
  });

  it('returns Riesgo moderado for 40-59', () => {
    expect(scoreLabel(59).label).toBe('Riesgo moderado');
    expect(scoreLabel(40).label).toBe('Riesgo moderado');
  });

  it('returns Riesgo elevado for 20-39', () => {
    expect(scoreLabel(39).label).toBe('Riesgo elevado');
    expect(scoreLabel(20).label).toBe('Riesgo elevado');
    expect(scoreLabel(20).level).toBe('red');
  });

  it('returns Riesgo crítico for 0-19', () => {
    expect(scoreLabel(19).label).toBe('Riesgo crítico');
    expect(scoreLabel(0).label).toBe('Riesgo crítico');
  });
});
