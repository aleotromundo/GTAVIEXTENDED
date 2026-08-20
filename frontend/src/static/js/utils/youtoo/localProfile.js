const PROFILE_KEY = 'youtoo_local_profile_v1';
const MAX_SEARCHES = 40;
const MAX_ACTIVITY = 160;
const MAX_INTERESTS = 80;

const EMPTY_PROFILE = {
  version: 1,
  personalizationEnabled: true,
  searches: [],
  activity: [],
  interests: [],
  updatedAt: null,
};

function readProfile() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROFILE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_PROFILE };
    return {
      ...EMPTY_PROFILE,
      ...parsed,
      searches: Array.isArray(parsed.searches) ? parsed.searches : [],
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
      interests: Array.isArray(parsed.interests) ? parsed.interests : [],
    };
  } catch (error) {
    return { ...EMPTY_PROFILE };
  }
}

function writeProfile(profile) {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }));
  } catch (error) {
    // Private browsing or storage limits must not break playback or search.
  }
}

function normalize(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function upsertInterest(interests, type, key, delta) {
  const normalizedKey = normalize(key).toLocaleLowerCase();
  if (!normalizedKey) return interests;
  const current = interests.find((item) => item.type === type && item.key === normalizedKey);
  const now = new Date().toISOString();
  if (current) {
    current.weight = Math.max(-10000, Math.min(10000, (Number(current.weight) || 0) + delta));
    current.lastSignalAt = now;
  } else {
    interests.push({ type, key: normalizedKey, weight: delta, lastSignalAt: now });
  }
  return interests
    .sort((a, b) => b.weight - a.weight || new Date(b.lastSignalAt) - new Date(a.lastSignalAt))
    .slice(0, MAX_INTERESTS);
}

export function getLocalProfile() {
  return readProfile();
}

export function setLocalPersonalization(enabled) {
  const profile = readProfile();
  profile.personalizationEnabled = Boolean(enabled);
  writeProfile(profile);
  return profile;
}

export function clearLocalProfile() {
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch (error) {
    // The interface remains usable if storage cannot be changed.
  }
}

export function recordLocalSearch(query, sourceScope = 'mediacms') {
  const value = normalize(query);
  if (!value) return null;
  const profile = readProfile();
  if (!profile.personalizationEnabled) return profile;

  const normalized = value.toLocaleLowerCase();
  const now = new Date().toISOString();
  const existing = profile.searches.find((item) => item.normalizedQuery === normalized && item.sourceScope === sourceScope);
  if (existing) {
    existing.count = (Number(existing.count) || 0) + 1;
    existing.lastSearchedAt = now;
  } else {
    profile.searches.push({ query: value, normalizedQuery: normalized, sourceScope, count: 1, lastSearchedAt: now });
  }
  profile.searches = profile.searches
    .sort((a, b) => b.count - a.count || new Date(b.lastSearchedAt) - new Date(a.lastSearchedAt))
    .slice(0, MAX_SEARCHES);
  profile.interests = upsertInterest(profile.interests, 'query', value, 2);
  writeProfile(profile);
  return profile;
}

export function recordLocalActivity(event) {
  const profile = readProfile();
  if (!profile.personalizationEnabled) return profile;

  const now = new Date().toISOString();
  const safeEvent = {
    id: event.id || (crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    type: normalize(event.type) || 'open',
    source: normalize(event.source) || 'mediacms',
    sourceKey: normalize(event.sourceKey),
    title: normalize(event.title).slice(0, 160),
    occurredAt: event.occurredAt || now,
  };
  profile.activity = [safeEvent, ...profile.activity].slice(0, MAX_ACTIVITY);
  if (safeEvent.title) profile.interests = upsertInterest(profile.interests, 'query', safeEvent.title, safeEvent.type === 'complete' ? 2 : 1);
  if (safeEvent.source) profile.interests = upsertInterest(profile.interests, 'source', safeEvent.source, 1);
  writeProfile(profile);
  return profile;
}

export function getRecommendedLocalTopics(limit = 6) {
  const profile = readProfile();
  if (!profile.personalizationEnabled) return [];
  return profile.interests
    .filter((item) => item.weight > 0 && (item.type === 'query' || item.type === 'source'))
    .slice(0, limit)
    .map((item) => item.key);
}
