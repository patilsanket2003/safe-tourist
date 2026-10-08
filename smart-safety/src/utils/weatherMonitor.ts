/**
 * Weather Provider Monitoring and Health Dashboard
 * 
 * Provides real-time monitoring of weather provider health, usage, and performance.
 * Can be used for debugging, analytics, and system health checks.
 */

import { getProviderStatus, resetProviderStatus } from './weatherClient';

interface ProviderMetrics {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: string;
  errorRate: number;
  lastError: string | null;
  lastSuccess: string | null;
  consecutiveErrors: number;
  totalErrors: number;
}

/**
 * Get formatted provider health status
 */
export function getProviderHealth(): ProviderMetrics[] {
  const status = getProviderStatus();
  const metrics: ProviderMetrics[] = [];
  
  for (const [key, provider] of Object.entries(status)) {
    const errorRate = provider.errorCount > 0 
      ? (provider.consecutiveErrors / provider.errorCount * 100) 
      : 0;
    
    let health: 'healthy' | 'degraded' | 'down' = 'healthy';
    if (provider.consecutiveErrors >= 3) {
      health = 'down';
    } else if (provider.consecutiveErrors > 0 || errorRate > 50) {
      health = 'degraded';
    }
    
    metrics.push({
      name: provider.name,
      status: health,
      uptime: provider.lastSuccess 
        ? `Last successful: ${new Date(provider.lastSuccess).toLocaleString()}` 
        : 'Never successful',
      errorRate: parseFloat(errorRate.toFixed(2)),
      lastError: provider.lastError 
        ? new Date(provider.lastError).toLocaleString() 
        : null,
      lastSuccess: provider.lastSuccess 
        ? new Date(provider.lastSuccess).toLocaleString() 
        : null,
      consecutiveErrors: provider.consecutiveErrors,
      totalErrors: provider.errorCount,
    });
  }
  
  return metrics;
}

/**
 * Log provider health to console with color coding
 */
export function logProviderHealth(): void {
  const metrics = getProviderHealth();
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('        WEATHER PROVIDER HEALTH STATUS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  metrics.forEach((metric, index) => {
    const statusTag =
      metric.status === 'healthy' ? 'OK' :
      metric.status === 'degraded' ? 'WARN' : 'DOWN';

    console.log(`[${statusTag}] ${metric.name}`);
    console.log(`   Status: ${metric.status.toUpperCase()}`);
    console.log(`   Error Rate: ${metric.errorRate}%`);
    console.log(`   Consecutive Errors: ${metric.consecutiveErrors}`);
    console.log(`   Total Errors: ${metric.totalErrors}`);
    
    if (metric.lastSuccess) {
      console.log(`   Last Success: ${metric.lastSuccess}`);
    }
    if (metric.lastError) {
      console.log(`   Last Error: ${metric.lastError}`);
    }
    
    if (index < metrics.length - 1) {
      console.log('');
    }
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Get a summary of overall system health
 */
export function getSystemHealthSummary(): {
  overallStatus: 'healthy' | 'degraded' | 'critical';
  healthyProviders: number;
  totalProviders: number;
  recommendation: string;
} {
  const metrics = getProviderHealth();
  const healthyCount = metrics.filter(m => m.status === 'healthy').length;
  const degradedCount = metrics.filter(m => m.status === 'degraded').length;
  const downCount = metrics.filter(m => m.status === 'down').length;
  
  let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  let recommendation = 'All systems operational.';
  
  if (downCount === metrics.length) {
    overallStatus = 'critical';
    recommendation = 'CRITICAL: All weather providers are down. Check API keys and network connectivity.';
  } else if (downCount > 0 || degradedCount > metrics.length / 2) {
    overallStatus = 'degraded';
    recommendation = `WARNING: ${downCount} provider(s) down, ${degradedCount} degraded. System running on ${healthyCount} healthy provider(s).`;
  }
  
  return {
    overallStatus,
    healthyProviders: healthyCount,
    totalProviders: metrics.length,
    recommendation,
  };
}

/**
 * Periodic health check that can be run in the background
 */
export function startHealthMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
  console.log(`[Weather Monitor] Starting health monitoring (interval: ${intervalMs}ms)`);
  
  return setInterval(() => {
    const summary = getSystemHealthSummary();
    const timestamp = new Date().toISOString();
    
    if (summary.overallStatus !== 'healthy') {
      console.warn(`[Weather Monitor] ${timestamp} - ${summary.recommendation}`);
      logProviderHealth();
    } else {
      console.log(`[Weather Monitor] ${timestamp} - System healthy (${summary.healthyProviders}/${summary.totalProviders} providers)`);
    }
  }, intervalMs);
}

/**
 * Stop health monitoring
 */
export function stopHealthMonitoring(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  console.log('[Weather Monitor] Health monitoring stopped');
}

/**
 * Export provider metrics for external monitoring systems (Prometheus, DataDog, etc.)
 */
export function getPrometheusMetrics(): string {
  const metrics = getProviderHealth();
  const lines: string[] = [];
  
  lines.push('# HELP weather_provider_status Provider health status (1=healthy, 0.5=degraded, 0=down)');
  lines.push('# TYPE weather_provider_status gauge');
  
  metrics.forEach(metric => {
    const statusValue = 
      metric.status === 'healthy' ? 1 :
      metric.status === 'degraded' ? 0.5 : 0;
    lines.push(`weather_provider_status{provider="${metric.name}"} ${statusValue}`);
  });
  
  lines.push('');
  lines.push('# HELP weather_provider_error_rate Provider error rate percentage');
  lines.push('# TYPE weather_provider_error_rate gauge');
  
  metrics.forEach(metric => {
    lines.push(`weather_provider_error_rate{provider="${metric.name}"} ${metric.errorRate}`);
  });
  
  lines.push('');
  lines.push('# HELP weather_provider_consecutive_errors Consecutive errors count');
  lines.push('# TYPE weather_provider_consecutive_errors gauge');
  
  metrics.forEach(metric => {
    lines.push(`weather_provider_consecutive_errors{provider="${metric.name}"} ${metric.consecutiveErrors}`);
  });
  
  return lines.join('\n');
}

/**
 * React Native compatible log function
 */
export function logProviderHealthRN(): string {
  const metrics = getProviderHealth();
  
  let output = '\n--- WEATHER PROVIDER HEALTH ---\n\n';
  
  metrics.forEach(metric => {
    const statusTag =
      metric.status === 'healthy' ? 'OK' :
      metric.status === 'degraded' ? 'WARN' : 'DOWN';

    output += `[${statusTag}] ${metric.name}\n`;
    output += `  Status: ${metric.status.toUpperCase()}\n`;
    output += `  Error Rate: ${metric.errorRate}%\n`;
    output += `  Consecutive Errors: ${metric.consecutiveErrors}\n`;
    
    if (metric.lastSuccess) {
      output += `  Last Success: ${metric.lastSuccess}\n`;
    }
    
    output += '\n';
  });
  
  return output;
}

export { resetProviderStatus };
