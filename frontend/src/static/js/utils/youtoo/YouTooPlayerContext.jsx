import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const STORAGE_KEY = 'youtoo_mediacms_player_v1';
const POSITION_KEY = 'youtoo_mediacms_player_position_v1';
const DEFAULT_STATE = { queue: [], activeIndex: -1, collapsed: false };

function loadState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || !Array.isArray(parsed.queue)) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...parsed, activeIndex: Math.min(parsed.activeIndex ?? -1, parsed.queue.length - 1) };
  } catch (error) {
    return DEFAULT_STATE;
  }
}

function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Storage can be unavailable in private contexts; the player still works for the session.
  }
}

function sourceFromDetail(detail) {
  if (detail && detail.hls_info && detail.hls_info.master_file) return detail.hls_info.master_file;
  return detail && detail.original_media_url ? detail.original_media_url : '';
}

async function resolveItem(item) {
  if (item.playableUrl) return item;
  if (!item.apiUrl) return item;

  try {
    const response = await fetch(item.apiUrl, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('media_unavailable');
    const detail = await response.json();
    return {
      ...item,
      playableUrl: sourceFromDetail(detail),
      title: detail.title || item.title,
      artist: detail.author_name || item.artist,
      thumbnail: detail.poster_url || detail.thumbnail_url || item.thumbnail,
      duration: detail.duration || item.duration,
      mediaType: detail.media_type || item.mediaType,
    };
  } catch (error) {
    return { ...item, resolveError: true };
  }
}

const YouTooPlayerContext = createContext(null);

export function YouTooPlayerProvider({ children }) {
  const initial = useRef(typeof window === 'undefined' ? DEFAULT_STATE : loadState());
  const [queue, setQueue] = useState(initial.current.queue);
  const [activeIndex, setActiveIndex] = useState(initial.current.activeIndex);
  const [collapsed, setCollapsed] = useState(initial.current.collapsed);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState('');
  const [position, setPosition] = useState(() => {
    try {
      return JSON.parse(window.localStorage.getItem(POSITION_KEY) || 'null');
    } catch (storageError) {
      return null;
    }
  });

  const activeItem = activeIndex >= 0 ? queue[activeIndex] || null : null;

  useEffect(() => {
    saveState({ queue, activeIndex, collapsed });
  }, [queue, activeIndex, collapsed]);

  useEffect(() => {
    try {
      if (position) window.localStorage.setItem(POSITION_KEY, JSON.stringify(position));
      else window.localStorage.removeItem(POSITION_KEY);
    } catch (storageError) {
      // Position persistence is optional.
    }
  }, [position]);

  const enqueue = useCallback(async (incomingItem, options = {}) => {
    if (!incomingItem || !incomingItem.sourceKey) return null;
    const existingIndex = queue.findIndex((item) => item.source === incomingItem.source && item.sourceKey === incomingItem.sourceKey);
    let nextQueue;
    let targetIndex;

    if (existingIndex >= 0) {
      nextQueue = queue;
      targetIndex = existingIndex;
    } else {
      const sanitized = {
        source: incomingItem.source || 'mediacms',
        sourceKey: incomingItem.sourceKey,
        apiUrl: incomingItem.apiUrl || '',
        playableUrl: incomingItem.playableUrl || '',
        link: incomingItem.link || '',
        title: incomingItem.title || 'Sin título',
        artist: incomingItem.artist || 'YouToo',
        thumbnail: incomingItem.thumbnail || '',
        mediaType: incomingItem.mediaType === 'audio' ? 'audio' : 'video',
        duration: incomingItem.duration || 0,
        resumeSeconds: 0,
      };
      nextQueue = [...queue, sanitized];
      targetIndex = nextQueue.length - 1;
      setQueue(nextQueue);
    }

    if (options.playNow || activeIndex < 0) {
      setIsResolving(true);
      setError('');
      const resolved = await resolveItem(nextQueue[targetIndex]);
      const resolvedQueue = nextQueue.map((item, index) => (index === targetIndex ? resolved : item));
      setQueue(resolvedQueue);
      setActiveIndex(targetIndex);
      setCollapsed(false);
      setIsResolving(false);
      if (!resolved.playableUrl) setError('Este elemento todavía no tiene un archivo reproducible disponible.');
      return resolved;
    }

    return nextQueue[targetIndex];
  }, [activeIndex, queue]);

  const removeFromQueue = useCallback((index) => {
    setQueue((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      setActiveIndex((currentActive) => {
        if (!next.length) return -1;
        if (index < currentActive) return currentActive - 1;
        if (index === currentActive) return Math.min(currentActive, next.length - 1);
        return currentActive;
      });
      return next;
    });
  }, []);

  const playIndex = useCallback(async (index) => {
    if (index < 0 || index >= queue.length) return;
    setIsResolving(true);
    setError('');
    const resolved = await resolveItem(queue[index]);
    setQueue((current) => current.map((item, itemIndex) => (itemIndex === index ? resolved : item)));
    setActiveIndex(index);
    setCollapsed(false);
    setIsResolving(false);
    if (!resolved.playableUrl) setError('No se encontró un archivo reproducible para este elemento.');
  }, [queue]);

  const next = useCallback(() => playIndex(activeIndex + 1), [activeIndex, playIndex]);
  const previous = useCallback(() => playIndex(activeIndex - 1), [activeIndex, playIndex]);

  const updateResume = useCallback((seconds) => {
    if (activeIndex < 0 || !Number.isFinite(seconds)) return;
    setQueue((current) => current.map((item, index) => (index === activeIndex ? { ...item, resumeSeconds: seconds } : item)));
  }, [activeIndex]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setActiveIndex(-1);
    setIsPlaying(false);
    setError('');
  }, []);

  const value = useMemo(() => ({
    queue,
    activeIndex,
    activeItem,
    collapsed,
    isPlaying,
    isResolving,
    error,
    position,
    enqueue,
    removeFromQueue,
    playIndex,
    next,
    previous,
    clearQueue,
    updateResume,
    setCollapsed,
    setIsPlaying,
    setError,
    setPosition,
  }), [queue, activeIndex, activeItem, collapsed, isPlaying, isResolving, error, position, enqueue, removeFromQueue, playIndex, next, previous, clearQueue, updateResume]);

  return <YouTooPlayerContext.Provider value={value}>{children}</YouTooPlayerContext.Provider>;
}

export function useYouTooPlayer() {
  const context = useContext(YouTooPlayerContext);
  if (!context) throw new Error('useYouTooPlayer must be used inside YouTooPlayerProvider');
  return context;
}
