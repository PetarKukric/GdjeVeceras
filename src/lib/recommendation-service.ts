import prisma from './prisma';
import {  Status } from '@prisma/client';

export const RECOMMENDATION_SAVE_THRESHOLD = 3;

export async function getPersonalizedRecommendations(userId: string, limit: number = 4) {
  // 1. Get user's favorited events to build preference profile
  const favorites = await prisma.eventFavorite.findMany({
    where: { userId },
    include: {
      event: {
        select: {
          category: true,
          venueId: true,
        },
      },
    },
  });

  // If user has few saves, use cold start fallback
  if (favorites.length < RECOMMENDATION_SAVE_THRESHOLD) {
    return getColdStartRecommendations(userId, limit);
  }

  // 2. Calculate preference scores
  const categoryScores: Record<string, number> = {};
  const venueScores: Record<string, number> = {};

  favorites.forEach((fav) => {
    const { category, venueId } = fav.event;
    categoryScores[category] = (categoryScores[category] || 0) + 1;
    venueScores[venueId] = (venueScores[venueId] || 0) + 1;
  });

  // 3. Get candidate events (upcoming, published, not already favorited)
  const favoritedEventIds = favorites.map((f) => f.eventId);
  const now = new Date();

  const candidates = await prisma.event.findMany({
    where: {
      status: Status.PUBLISHED,
      startDateTime: { gte: now },
      id: { notIn: favoritedEventIds },
    },
    include: {
      venue: true,
      _count: {
        select: { favorites: true },
      },
    },
  });

  // 4. Score candidates
  const scoredCandidates = candidates.map((event) => {
    let score = 0;
    let reason = '';

    // Category match (highest priority)
    const catScore = categoryScores[event.category] || 0;
    if (catScore > 0) {
      score += catScore * 10;
      if (catScore >= 2) {
        reason = `Zato što često čuvaš ${event.category === 'PARTY' ? 'DJ događaje' : 'koncerte'}`;
      } else {
        reason = 'Slično događajima koje si sačuvao';
      }
    }

    // Venue match
    const vScore = venueScores[event.venueId] || 0;
    if (vScore > 0) {
      score += vScore * 5;
      if (!reason) reason = `Često čuvaš događaje iz lokala ${event.venue.name}`;
    }

    // Popularity boost
    const popCount = event._count.favorites;
    score += Math.floor(popCount / 2);

    // Recency boost (events happening sooner)
    const hoursUntil = (event.startDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < 24) score += 5;

    return { ...event, score, recommendationReason: reason };
  });

  // 5. Sort by score and return
  return scoredCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function getColdStartRecommendations(userId: string | null, limit: number = 4) {
  const now = new Date();
  
  // Exclude already favorited if user is logged in
  let excludeIds: string[] = [];
  if (userId) {
    const favorites = await prisma.eventFavorite.findMany({
      where: { userId },
      select: { eventId: true },
    });
    excludeIds = favorites.map((f) => f.eventId);
  }

  // Just return popular/featured upcoming events
  return await prisma.event.findMany({
    where: {
      status: Status.PUBLISHED,
      startDateTime: { gte: now },
      id: { notIn: excludeIds },
    },
    orderBy: [
      { promoted: 'desc' },
      { featured: 'desc' },
      { favorites: { _count: 'desc' } },
      { startDateTime: 'asc' },
    ],
    take: limit,
    include: {
      venue: true,
      _count: {
        select: { favorites: true },
      },
    },
  });
}
