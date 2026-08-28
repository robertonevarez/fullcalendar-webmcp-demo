import { Service, ServiceSearchResult } from '@/domain/types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}

export function searchServices(services: Service[], query?: string, limit = 5): ServiceSearchResult[] {
  if (!query?.trim()) {
    return services.slice(0, limit).map((service) => ({
      service_id: service.id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price_cents: service.price_cents,
      score: 0,
    }));
  }

  const queryTokens = tokenize(query);
  const scored = services.map((service) => {
    const haystack = tokenize(
      [service.name, service.description, ...service.keywords].join(' '),
    );
    let score = 0;
    for (const token of queryTokens) {
      if (haystack.some((word) => word.includes(token) || token.includes(word))) {
        score += 2;
      }
      if (service.keywords.some((keyword) => keyword.toLowerCase().includes(token))) {
        score += 3;
      }
      if (service.name.toLowerCase().includes(token)) {
        score += 4;
      }
    }
    return {
      service_id: service.id,
      name: service.name,
      description: service.description,
      duration_minutes: service.duration_minutes,
      price_cents: service.price_cents,
      score,
    };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
