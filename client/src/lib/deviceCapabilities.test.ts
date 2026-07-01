import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkCurrentMemoryPressure,
  formatCapabilities,
  getAdjustedFileSizeLimit,
  getDeviceCapabilities,
  shouldUseClientProcessing,
  type DeviceCapabilities,
} from './deviceCapabilities';

const originalMemory = (performance as any).memory;

function setNavigatorProp(name: string, value: unknown) {
  Object.defineProperty(navigator, name, { value, configurable: true });
}

function setHeap(usedMB?: number, limitMB?: number) {
  if (usedMB === undefined) {
    Object.defineProperty(performance, 'memory', { value: undefined, configurable: true });
  } else {
    Object.defineProperty(performance, 'memory', {
      value: { usedJSHeapSize: usedMB * 1024 * 1024, jsHeapSizeLimit: limitMB! * 1024 * 1024 },
      configurable: true,
    });
  }
}

function baseCaps(overrides: Partial<DeviceCapabilities> = {}): DeviceCapabilities {
  return {
    memoryGB: 8,
    cpuCores: 8,
    isMobile: false,
    isLowEndDevice: false,
    performanceScore: 95,
    jsHeapSizeMB: 100,
    jsHeapLimitMB: 1000,
    memoryPressure: 'low',
    isOnBattery: false,
    batteryLevel: 1,
    isLowPower: false,
    connectionType: '4g',
    downlinkMbps: 10,
    isSlowConnection: false,
    recommendation: 'client',
    reasons: ['Good device capabilities'],
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  setNavigatorProp('deviceMemory', undefined);
  setNavigatorProp('hardwareConcurrency', 4);
  setNavigatorProp('userAgent', 'Mozilla/5.0 desktop');
  setNavigatorProp('maxTouchPoints', 0);
  setNavigatorProp('connection', undefined);
  setNavigatorProp('getBattery', undefined);
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
  Object.defineProperty(performance, 'memory', { value: originalMemory, configurable: true });
});

describe('deviceCapabilities', () => {
  it('detects strong desktop capabilities and recommends client processing', async () => {
    setNavigatorProp('deviceMemory', 8);
    setNavigatorProp('hardwareConcurrency', 8);
    setNavigatorProp('connection', { effectiveType: '4g', downlink: 50 });
    setNavigatorProp('getBattery', vi.fn().mockResolvedValue({ charging: true, level: 0.9 }));
    setHeap(100, 1000);

    const caps = await getDeviceCapabilities();

    expect(caps).toMatchObject({
      memoryGB: 8,
      cpuCores: 8,
      isMobile: false,
      isLowEndDevice: false,
      memoryPressure: 'low',
      isLowPower: false,
      isSlowConnection: false,
      recommendation: 'client',
    });
    expect(caps.performanceScore).toBe(100);
    expect(caps.reasons).toContain('Good device capabilities');
  });

  it('detects mobile, low battery, slow connection and medium pressure', async () => {
    setNavigatorProp('deviceMemory', 1.5);
    setNavigatorProp('hardwareConcurrency', 2);
    setNavigatorProp('userAgent', 'Mozilla/5.0 iPhone Mobile');
    setNavigatorProp('maxTouchPoints', 5);
    Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
    setNavigatorProp('connection', { type: 'cellular', downlink: 0.5 });
    setNavigatorProp('getBattery', vi.fn().mockResolvedValue({ charging: false, level: 0.1 }));
    setHeap(600, 1000);

    const caps = await getDeviceCapabilities();

    expect(caps.isMobile).toBe(true);
    expect(caps.isLowEndDevice).toBe(true);
    expect(caps.memoryPressure).toBe('medium');
    expect(caps.isLowPower).toBe(true);
    expect(caps.isSlowConnection).toBe(true);
    expect(caps.recommendation).toBe('client');
    expect(caps.reasons).toEqual(expect.arrayContaining([
      'Low device performance',
      'Device on low battery - saving power',
      'Slow network - client processing avoids upload',
    ]));
  });

  it('recommends server for critical memory, high heap pressure, and low score', async () => {
    setNavigatorProp('deviceMemory', 0.5);
    setNavigatorProp('hardwareConcurrency', 1);
    setHeap(800, 1000);

    const caps = await getDeviceCapabilities();

    expect(caps.memoryPressure).toBe('high');
    expect(caps.performanceScore).toBe(5);
    expect(caps.recommendation).toBe('server');
    expect(caps.reasons[0]).toMatch(/Very low device performance|High memory pressure/);
  });

  it('recommends either for moderate device capabilities', async () => {
    setNavigatorProp('deviceMemory', 3);
    setNavigatorProp('hardwareConcurrency', 3);
    setHeap(100, 1000);

    const caps = await getDeviceCapabilities();

    expect(caps.performanceScore).toBe(85);
    expect(caps.recommendation).toBe('client');
  });

  it('reports memory pressure from heap or device memory', () => {
    setHeap(710, 1000);
    expect(checkCurrentMemoryPressure()).toBe('high');
    setHeap(510, 1000);
    expect(checkCurrentMemoryPressure()).toBe('medium');
    setHeap(undefined);
    setNavigatorProp('deviceMemory', 1.5);
    expect(checkCurrentMemoryPressure()).toBe('medium');
    setNavigatorProp('deviceMemory', 8);
    expect(checkCurrentMemoryPressure()).toBe('low');
  });

  it('adjusts file limits for low-end, mobile and memory pressure', () => {
    expect(getAdjustedFileSizeLimit(1000, baseCaps({ isLowEndDevice: true, memoryPressure: 'high' }))).toBe(150);
    expect(getAdjustedFileSizeLimit(1000, baseCaps({ isMobile: true, memoryPressure: 'medium' }))).toBe(375);
    expect(getAdjustedFileSizeLimit(1000, baseCaps())).toBe(1000);
  });

  it('decides whether to use client processing with clear reasons', () => {
    setHeap(100, 1000);
    expect(shouldUseClientProcessing(baseCaps(), 2000, 1000)).toMatchObject({ useClient: false });
    expect(shouldUseClientProcessing(baseCaps({ recommendation: 'server', reasons: ['server please'] }), 100, 1000))
      .toEqual({ useClient: false, reason: 'server please' });
    setHeap(800, 1000);
    expect(shouldUseClientProcessing(baseCaps(), 100, 1000).reason).toMatch(/High memory pressure/);
    setHeap(100, 1000);
    expect(shouldUseClientProcessing(baseCaps({ reasons: [] }), 100, 1000)).toEqual({
      useClient: true,
      reason: 'Device capable of local processing',
    });
  });

  it('formats capabilities with unknown values and battery details', () => {
    const formatted = formatCapabilities(baseCaps({
      memoryGB: null,
      jsHeapSizeMB: null,
      jsHeapLimitMB: null,
      isOnBattery: null,
      batteryLevel: null,
      connectionType: null,
      downlinkMbps: null,
      reasons: [],
    }));

    expect(formatted).toContain('Memory: Unknown');
    expect(formatted).toContain('On Battery: Unknown');
    expect(formatted).toContain('Reasons: None');
  });

  it('handles unavailable battery and connection APIs', async () => {
    setNavigatorProp('getBattery', vi.fn().mockRejectedValue(new Error('blocked')));
    setNavigatorProp('connection', undefined);
    setHeap(undefined);

    const caps = await getDeviceCapabilities();

    expect(caps.isOnBattery).toBeNull();
    expect(caps.batteryLevel).toBeNull();
    expect(caps.connectionType).toBeNull();
    expect(caps.downlinkMbps).toBeNull();
  });
});
