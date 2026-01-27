/**
 * Device Capabilities Detection
 * 
 * Detects device performance characteristics to make smart decisions
 * about client-side vs server-side processing.
 * 
 * Uses various browser APIs:
 * - navigator.deviceMemory (RAM)
 * - navigator.hardwareConcurrency (CPU cores)
 * - navigator.connection (network speed)
 * - Performance API (memory pressure)
 * - Battery Status API (power saving)
 */

export interface DeviceCapabilities {
  // Hardware
  memoryGB: number | null;          // Device RAM in GB (null if unavailable)
  cpuCores: number;                  // Logical CPU cores
  
  // Device type
  isMobile: boolean;
  isLowEndDevice: boolean;
  
  // Performance
  performanceScore: number;          // 0-100 score
  jsHeapSizeMB: number | null;       // Current JS heap usage
  jsHeapLimitMB: number | null;      // JS heap limit
  memoryPressure: 'low' | 'medium' | 'high';
  
  // Power
  isOnBattery: boolean | null;
  batteryLevel: number | null;       // 0-1
  isLowPower: boolean;
  
  // Network
  connectionType: string | null;     // 'wifi', '4g', '3g', '2g', etc.
  downlinkMbps: number | null;       // Estimated download speed
  isSlowConnection: boolean;
  
  // Recommendation
  recommendation: 'client' | 'server' | 'either';
  reasons: string[];
}

// Thresholds for performance decisions
const THRESHOLDS = {
  // Memory
  LOW_MEMORY_GB: 2,                  // Below 2GB = low memory device
  CRITICAL_MEMORY_GB: 1,             // Below 1GB = very constrained
  
  // CPU
  LOW_CPU_CORES: 2,                  // 2 or fewer cores = limited
  
  // Heap
  HIGH_HEAP_USAGE_PERCENT: 0.7,      // 70% heap used = memory pressure
  
  // Battery
  LOW_BATTERY_PERCENT: 0.2,          // Below 20% = save power
  
  // Network (for fallback viability)
  SLOW_CONNECTION_MBPS: 1,           // Below 1 Mbps = slow
  
  // File size adjustments
  MOBILE_FILE_SIZE_MULTIPLIER: 0.5,  // Mobile devices get half the file size limit
  LOW_MEMORY_FILE_SIZE_MULTIPLIER: 0.3,
};

/**
 * Detect device memory (Chrome, Edge, Opera only)
 */
function getDeviceMemory(): number | null {
  // @ts-ignore - deviceMemory is not in all TypeScript definitions
  return navigator.deviceMemory ?? null;
}

/**
 * Get CPU core count
 */
function getCPUCores(): number {
  return navigator.hardwareConcurrency || 4; // Default to 4 if unavailable
}

/**
 * Check if device is mobile
 */
function isMobileDevice(): boolean {
  // Check user agent
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  // Check touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check screen size
  const isSmallScreen = window.innerWidth < 768;
  
  return isMobileUA || (hasTouch && isSmallScreen);
}

/**
 * Get JS heap memory info (Chrome only)
 */
function getHeapInfo(): { usedMB: number | null; limitMB: number | null } {
  // @ts-ignore - memory is Chrome-specific
  const memory = performance?.memory;
  if (!memory) {
    return { usedMB: null, limitMB: null };
  }
  
  return {
    usedMB: Math.round(memory.usedJSHeapSize / (1024 * 1024)),
    limitMB: Math.round(memory.jsHeapSizeLimit / (1024 * 1024)),
  };
}

/**
 * Get network connection info
 */
function getConnectionInfo(): { type: string | null; downlink: number | null } {
  // @ts-ignore - connection is not in all TypeScript definitions
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!connection) {
    return { type: null, downlink: null };
  }
  
  return {
    type: connection.effectiveType || connection.type || null,
    downlink: connection.downlink ?? null,
  };
}

/**
 * Get battery status (async)
 */
async function getBatteryInfo(): Promise<{ onBattery: boolean | null; level: number | null }> {
  try {
    // @ts-ignore - getBattery is not in all TypeScript definitions
    if (!navigator.getBattery) {
      return { onBattery: null, level: null };
    }
    
    // @ts-ignore
    const battery = await navigator.getBattery();
    return {
      onBattery: !battery.charging,
      level: battery.level,
    };
  } catch {
    return { onBattery: null, level: null };
  }
}

/**
 * Calculate memory pressure level
 */
function calculateMemoryPressure(
  heapUsedMB: number | null, 
  heapLimitMB: number | null,
  deviceMemoryGB: number | null
): 'low' | 'medium' | 'high' {
  // Check heap usage
  if (heapUsedMB && heapLimitMB) {
    const heapUsageRatio = heapUsedMB / heapLimitMB;
    if (heapUsageRatio > THRESHOLDS.HIGH_HEAP_USAGE_PERCENT) {
      return 'high';
    }
    if (heapUsageRatio > 0.5) {
      return 'medium';
    }
  }
  
  // Check device memory
  if (deviceMemoryGB !== null) {
    if (deviceMemoryGB < THRESHOLDS.CRITICAL_MEMORY_GB) {
      return 'high';
    }
    if (deviceMemoryGB < THRESHOLDS.LOW_MEMORY_GB) {
      return 'medium';
    }
  }
  
  return 'low';
}

/**
 * Calculate overall performance score (0-100)
 */
function calculatePerformanceScore(
  memoryGB: number | null,
  cpuCores: number,
  isMobile: boolean,
  memoryPressure: 'low' | 'medium' | 'high'
): number {
  let score = 100;
  
  // Memory deductions
  if (memoryGB !== null) {
    if (memoryGB < THRESHOLDS.CRITICAL_MEMORY_GB) score -= 40;
    else if (memoryGB < THRESHOLDS.LOW_MEMORY_GB) score -= 20;
    else if (memoryGB < 4) score -= 10;
  }
  
  // CPU deductions
  if (cpuCores <= 1) score -= 30;
  else if (cpuCores <= THRESHOLDS.LOW_CPU_CORES) score -= 15;
  else if (cpuCores <= 4) score -= 5;
  
  // Mobile deduction
  if (isMobile) score -= 15;
  
  // Memory pressure deduction
  if (memoryPressure === 'high') score -= 25;
  else if (memoryPressure === 'medium') score -= 10;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine recommendation based on all factors
 */
function determineRecommendation(
  performanceScore: number,
  isLowPower: boolean,
  isSlowConnection: boolean,
  memoryPressure: 'low' | 'medium' | 'high'
): { recommendation: 'client' | 'server' | 'either'; reasons: string[] } {
  const reasons: string[] = [];
  
  // Strong indicators for server
  if (performanceScore < 30) {
    reasons.push('Very low device performance score');
    return { recommendation: 'server', reasons };
  }
  
  if (memoryPressure === 'high') {
    reasons.push('High memory pressure detected');
    return { recommendation: 'server', reasons };
  }
  
  // Moderate indicators
  if (performanceScore < 50) {
    reasons.push('Low device performance');
  }
  
  if (isLowPower) {
    reasons.push('Device on low battery - saving power');
  }
  
  // If we have moderate concerns but good connection, prefer server
  if (reasons.length > 0 && !isSlowConnection) {
    return { recommendation: 'server', reasons };
  }
  
  // If slow connection, prefer client even with moderate concerns
  if (isSlowConnection) {
    reasons.push('Slow network - client processing avoids upload');
    return { recommendation: 'client', reasons };
  }
  
  // Good device, good connection - either works
  if (performanceScore >= 70) {
    reasons.push('Good device capabilities');
    return { recommendation: 'client', reasons };
  }
  
  return { recommendation: 'either', reasons: ['Moderate device capabilities'] };
}

/**
 * Get comprehensive device capabilities
 * Call this once on app load and cache the result
 */
export async function getDeviceCapabilities(): Promise<DeviceCapabilities> {
  const memoryGB = getDeviceMemory();
  const cpuCores = getCPUCores();
  const isMobile = isMobileDevice();
  const { usedMB: jsHeapSizeMB, limitMB: jsHeapLimitMB } = getHeapInfo();
  const { type: connectionType, downlink: downlinkMbps } = getConnectionInfo();
  const { onBattery: isOnBattery, level: batteryLevel } = await getBatteryInfo();
  
  const memoryPressure = calculateMemoryPressure(jsHeapSizeMB, jsHeapLimitMB, memoryGB);
  
  const isLowEndDevice = 
    (memoryGB !== null && memoryGB < THRESHOLDS.LOW_MEMORY_GB) ||
    cpuCores <= THRESHOLDS.LOW_CPU_CORES;
  
  const isLowPower = 
    isOnBattery === true && 
    batteryLevel !== null && 
    batteryLevel < THRESHOLDS.LOW_BATTERY_PERCENT;
  
  const isSlowConnection = 
    downlinkMbps !== null && 
    downlinkMbps < THRESHOLDS.SLOW_CONNECTION_MBPS;
  
  const performanceScore = calculatePerformanceScore(
    memoryGB, 
    cpuCores, 
    isMobile, 
    memoryPressure
  );
  
  const { recommendation, reasons } = determineRecommendation(
    performanceScore,
    isLowPower,
    isSlowConnection,
    memoryPressure
  );
  
  return {
    memoryGB,
    cpuCores,
    isMobile,
    isLowEndDevice,
    performanceScore,
    jsHeapSizeMB,
    jsHeapLimitMB,
    memoryPressure,
    isOnBattery,
    batteryLevel,
    isLowPower,
    connectionType,
    downlinkMbps,
    isSlowConnection,
    recommendation,
    reasons,
  };
}

/**
 * Quick check for current memory pressure (can be called frequently)
 */
export function checkCurrentMemoryPressure(): 'low' | 'medium' | 'high' {
  const { usedMB, limitMB } = getHeapInfo();
  const memoryGB = getDeviceMemory();
  return calculateMemoryPressure(usedMB, limitMB, memoryGB);
}

/**
 * Get adjusted file size limit based on device capabilities
 */
export function getAdjustedFileSizeLimit(
  baseLimit: number, 
  capabilities: DeviceCapabilities
): number {
  let multiplier = 1;
  
  if (capabilities.isLowEndDevice) {
    multiplier *= THRESHOLDS.LOW_MEMORY_FILE_SIZE_MULTIPLIER;
  } else if (capabilities.isMobile) {
    multiplier *= THRESHOLDS.MOBILE_FILE_SIZE_MULTIPLIER;
  }
  
  if (capabilities.memoryPressure === 'high') {
    multiplier *= 0.5;
  } else if (capabilities.memoryPressure === 'medium') {
    multiplier *= 0.75;
  }
  
  return Math.round(baseLimit * multiplier);
}

/**
 * Should we use client-side processing based on device capabilities?
 */
export function shouldUseClientProcessing(
  capabilities: DeviceCapabilities,
  fileSizeBytes: number,
  baseFileSizeLimit: number
): { useClient: boolean; reason: string } {
  // Check adjusted file size limit
  const adjustedLimit = getAdjustedFileSizeLimit(baseFileSizeLimit, capabilities);
  if (fileSizeBytes > adjustedLimit) {
    return { 
      useClient: false, 
      reason: `File too large for this device (${Math.round(fileSizeBytes / 1024 / 1024)}MB > ${Math.round(adjustedLimit / 1024 / 1024)}MB limit)` 
    };
  }
  
  // Check recommendation
  if (capabilities.recommendation === 'server') {
    return { 
      useClient: false, 
      reason: capabilities.reasons.join('; ') 
    };
  }
  
  // Check current memory pressure (real-time check)
  const currentPressure = checkCurrentMemoryPressure();
  if (currentPressure === 'high') {
    return { 
      useClient: false, 
      reason: 'High memory pressure - using server to prevent crashes' 
    };
  }
  
  return { 
    useClient: true, 
    reason: capabilities.reasons.join('; ') || 'Device capable of local processing' 
  };
}

/**
 * Format capabilities for display/debugging
 */
export function formatCapabilities(capabilities: DeviceCapabilities): string {
  const lines = [
    `Performance Score: ${capabilities.performanceScore}/100`,
    `Recommendation: ${capabilities.recommendation.toUpperCase()}`,
    ``,
    `Hardware:`,
    `  Memory: ${capabilities.memoryGB ? capabilities.memoryGB + ' GB' : 'Unknown'}`,
    `  CPU Cores: ${capabilities.cpuCores}`,
    `  Mobile: ${capabilities.isMobile ? 'Yes' : 'No'}`,
    `  Low-End: ${capabilities.isLowEndDevice ? 'Yes' : 'No'}`,
    ``,
    `Memory:`,
    `  Heap Used: ${capabilities.jsHeapSizeMB ? capabilities.jsHeapSizeMB + ' MB' : 'Unknown'}`,
    `  Heap Limit: ${capabilities.jsHeapLimitMB ? capabilities.jsHeapLimitMB + ' MB' : 'Unknown'}`,
    `  Pressure: ${capabilities.memoryPressure}`,
    ``,
    `Power:`,
    `  On Battery: ${capabilities.isOnBattery === null ? 'Unknown' : capabilities.isOnBattery ? 'Yes' : 'No'}`,
    `  Battery Level: ${capabilities.batteryLevel !== null ? Math.round(capabilities.batteryLevel * 100) + '%' : 'Unknown'}`,
    `  Low Power: ${capabilities.isLowPower ? 'Yes' : 'No'}`,
    ``,
    `Network:`,
    `  Type: ${capabilities.connectionType || 'Unknown'}`,
    `  Speed: ${capabilities.downlinkMbps ? capabilities.downlinkMbps + ' Mbps' : 'Unknown'}`,
    `  Slow: ${capabilities.isSlowConnection ? 'Yes' : 'No'}`,
    ``,
    `Reasons: ${capabilities.reasons.join(', ') || 'None'}`,
  ];
  
  return lines.join('\n');
}
