import { getStore } from "../data/store";

export interface AIProfile {
  userId: string;
  extractedSports: string[];
  extractedInterests: string[];
  moderationFlags: string[];
  updatedAt: string;
}

export function enqueueProfileEnrichment(userId: string): { queued: boolean } {
  const store = getStore();
  const profile = store.profiles.find((p) => p.userId === userId);

  if (!profile || !profile.allowsAiProfile) {
    return { queued: false };
  }

  const preferences = store.sportPreferences.filter((p) => p.userId === userId);
  const extractedSports = preferences.map((p) => p.sportId);

  const bioWords = profile.bio.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const sportKeywords = ["football", "basketball", "tennis", "running", "volleyball", "swimming"];
  const extractedInterests = bioWords.filter(
    (w) => sportKeywords.includes(w) || w.includes("sport") || w.includes("fitness")
  );

  const aiProfile: AIProfile = {
    userId,
    extractedSports,
    extractedInterests: [...new Set(extractedInterests)],
    moderationFlags: [],
    updatedAt: new Date().toISOString()
  };

  const globalAI = (globalThis as Record<string, unknown>);
  const profiles = (globalAI.aiProfiles as AIProfile[] | undefined) ?? [];
  globalAI.aiProfiles = [...profiles.filter((p) => p.userId !== userId), aiProfile];

  return { queued: true };
}

export function getAIProfile(userId: string): AIProfile | undefined {
  const globalAI = (globalThis as Record<string, unknown>);
  const profiles = (globalAI.aiProfiles as AIProfile[] | undefined) ?? [];

  return profiles.find((p) => p.userId === userId);
}

export function generateCompatibilityReport(userId: string) {
  const store = getStore();
  const scores = store.compatibilityScores.filter((s) => s.userId === userId);
  const recommendations = store.recommendations.filter((r) => r.userId !== userId);

  return {
    userId,
    totalScores: scores.length,
    averageScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0,
    topRecommendations: recommendations.slice(0, 5),
    generatedAt: new Date().toISOString()
  };
}
