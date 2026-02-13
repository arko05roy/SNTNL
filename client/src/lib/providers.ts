/**
 * Service Provider Data
 * Real service providers for GPU, Data, and API services
 */

import { ServiceProvider } from '@/types';

export const PROVIDERS: ServiceProvider[] = [
  {
    address: '0x1111111111111111111111111111111111111111',
    name: 'CloudGPU Pro',
    serviceType: 'GPU Compute',
    basePrice: BigInt(100000) // 100 tokens/hour
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    name: 'DataStream AI',
    serviceType: 'Data Feed',
    basePrice: BigInt(50000)
  },
  {
    address: '0x3333333333333333333333333333333333333333',
    name: 'API Gateway Plus',
    serviceType: 'API Access',
    basePrice: BigInt(25000)
  },
  {
    address: '0x4444444444444444444444444444444444444444',
    name: 'Neural Cloud',
    serviceType: 'GPU Compute',
    basePrice: BigInt(120000)
  },
  {
    address: '0x5555555555555555555555555555555555555555',
    name: 'Quantum Data',
    serviceType: 'Data Feed',
    basePrice: BigInt(75000)
  }
];

export function getProvidersByType(serviceType: string): ServiceProvider[] {
  return PROVIDERS.filter(p => p.serviceType === serviceType);
}

export function getAveragePrice(serviceType: string, onChainProviders: ServiceProvider[] = []): bigint {
  const allProviders = [...getProvidersByType(serviceType), ...onChainProviders.filter(p => p.serviceType === serviceType)];
  if (allProviders.length === 0) return BigInt(0);

  const total = allProviders.reduce((sum, p) => sum + p.basePrice, BigInt(0));
  return total / BigInt(allProviders.length);
}

export async function getProvidersForAuction(serviceType: string): Promise<ServiceProvider[]> {
  const seed = getProvidersByType(serviceType);
  const onChain = await fetchOnChainProviders();
  const onChainFiltered = onChain.filter(p => p.serviceType === serviceType);
  // Deduplicate by address
  const seen = new Set(seed.map(p => p.address));
  const merged = [...seed];
  for (const p of onChainFiltered) {
    if (!seen.has(p.address)) {
      merged.push(p);
      seen.add(p.address);
    }
  }
  return merged;
}

export async function fetchOnChainProviders(): Promise<ServiceProvider[]> {
  try {
    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list' }),
    });
    const data = await res.json();
    if (!data.providers) return [];
    return data.providers.map((p: any) => ({
      address: p.address,
      name: p.name,
      serviceType: p.serviceType,
      basePrice: BigInt(p.basePrice),
    }));
  } catch {
    return [];
  }
}
