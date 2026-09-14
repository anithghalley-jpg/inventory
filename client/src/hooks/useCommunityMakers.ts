import { useMemo } from 'react';
import { MakerStripe } from '@/components/MakerStripesRack';

export interface ProcessedMakerUser {
  user: any;
  accessTags: string[];
  sessionStripes: MakerStripe[];
  sessionTags: string[];
  effectiveTags: string[];
  totalMilestones: number;
  isFab: boolean;
  hasFaCert: boolean;
  tier: 1 | 2 | 3 | 4;
  tierName: string;
}

// Sort tags so Fab Academy certification tags appear first
export function sortMakerTags(tags: string[] = []): string[] {
  return [...tags].sort((a, b) => {
    const isFA_a = a.toLowerCase().startsWith('fa 20') || a.toLowerCase().includes('fab academy');
    const isFA_b = b.toLowerCase().startsWith('fa 20') || b.toLowerCase().includes('fab academy');
    if (isFA_a && !isFA_b) return -1;
    if (!isFA_a && isFA_b) return 1;
    return a.localeCompare(b);
  });
}

export function getMakerMilestoneTier(totalMilestones: number, hasFaCert: boolean): { tier: 1 | 2 | 3 | 4; tierName: string } {
  if (hasFaCert || totalMilestones >= 7) {
    return { tier: 4, tierName: 'Fab Expert & Senior Contributor' };
  }
  if (totalMilestones >= 4) {
    return { tier: 3, tierName: 'Experienced Craftsman' };
  }
  if (totalMilestones >= 2) {
    return { tier: 2, tierName: 'Active Maker' };
  }
  return { tier: 1, tierName: 'Explorer' };
}

export function useCommunityMakers(
  allUsers: any[] = [],
  stripesMap: Record<string, MakerStripe[]> = {},
  searchQuery: string = '',
  selectedCategory: string = 'all'
) {
  return useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const allTagsSet = new Set<string>();

    // 1. Process all users in a single O(N) pass
    const processedAll: ProcessedMakerUser[] = allUsers.map((u) => {
      const emailKey = (u.email || '').toLowerCase();
      const rawTags: string[] = Array.isArray(u.tags) ? u.tags : [];
      const accessTags = sortMakerTags(rawTags);
      const sessionStripes = stripesMap[emailKey] || [];

      const sessionTags = sessionStripes
        .map((s) => (s.char || s.title?.charAt(0)?.toUpperCase() || '').trim())
        .filter(Boolean);

      const effectiveTags = Array.from(new Set([...accessTags, ...sessionTags]));

      effectiveTags.forEach((t) => allTagsSet.add(t));

      const hasFaCert = accessTags.some(
        (t) => t.toLowerCase().startsWith('fa 20') || t.toLowerCase().includes('fab academy')
      );
      const totalMilestones = accessTags.length + sessionStripes.length;
      const isFab = Boolean(hasFaCert || totalMilestones >= 4);
      const { tier, tierName } = getMakerMilestoneTier(totalMilestones, hasFaCert);

      return {
        user: u,
        accessTags,
        sessionStripes,
        sessionTags,
        effectiveTags,
        totalMilestones,
        isFab,
        hasFaCert,
        tier,
        tierName,
      };
    });

    const availableCategories = Array.from(allTagsSet).sort();

    // 2. Filter by search query & category selection
    const filtered = processedAll.filter((item) => {
      const u = item.user;
      const matchesSearch =
        !normalizedQuery ||
        (u.name || '').toLowerCase().includes(normalizedQuery) ||
        (u.email || '').toLowerCase().includes(normalizedQuery) ||
        (u.customTagline || '').toLowerCase().includes(normalizedQuery);

      const matchesCategory =
        selectedCategory === 'all' || item.effectiveTags.includes(selectedCategory);

      return matchesSearch && matchesCategory;
    });

    // 3. Sort by milestone count descending, then name alphabetically
    filtered.sort((a, b) => {
      if (b.totalMilestones !== a.totalMilestones) {
        return b.totalMilestones - a.totalMilestones;
      }
      return (a.user.name || '').localeCompare(b.user.name || '');
    });

    // 4. Partition into category sections for the dashboard
    const fabMakers = filtered.filter((item) => item.isFab);
    const certifiedMakers = filtered.filter((item) => !item.isFab && item.effectiveTags.length > 0);
    const communityMakers = filtered.filter((item) => !item.isFab && item.effectiveTags.length === 0);

    return {
      allProcessed: processedAll,
      filteredUsers: filtered,
      fabMakers,
      certifiedMakers,
      communityMakers,
      availableCategories,
      totalCount: filtered.length,
    };
  }, [allUsers, stripesMap, searchQuery, selectedCategory]);
}
