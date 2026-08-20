import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useYouTooPlayer } from '../../utils/youtoo/YouTooPlayerContext';
import { recordLocalActivity } from '../../utils/youtoo/localProfile';

function mediaSessionMetadata(item) {
  if (!item || !('mediaSession' in navigator) || !window.MediaMetadata) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: item.title || 'Nowarfy',
    artist: item.artist || 'Nowarfy · YouToo',
    album: 'Nowarfy · YouToo, experiencia audiovisual',
    artwork: item.thumbnail ? [{ src: item.thumbnail, sizes: '512x512', type: 'image/png' }] : [],
  });
}

function formatQueueCount(count) {
  return count === 1 ? '1 elemento' : `${count} elementos`;
}

export function YouTooQueueButton({ item }) {
  const { enqueue, queue } = useYouTooPlayer();
  const queued = queue.some((queueItem) => queueItem.source === item.source && queueItem.sourceKey === item.sourceKey);

  const handleClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await enqueue(item, { playNow: false });
  };

  return (
    <button
      className={'youtoo-queue-button' + (queued ? ' is-queued' : '')}
      type="button"
      onClick={handleClick}
      aria-label={queued ? 'Ya está en la cola de Nowarfy' : 'Agregar a la cola de Nowarfy'}
      title={queued ? 'En cola' : 'Agregar a cola'}
    >
      <i className="material-icons">{queued ? 'check' : 'playlist_add'}</i>
    </button>
  );
}

export function YouTooFloatingPlayer() {
  const {
    queue,
    activeIndex,
    activeItem,
    collapsed,
    isPlaying,
    isResolving,
    error,
    position,
    next,
    previous,
    playIndex,
    removeFromQueue,
    clearQueue,
    updateResume,
    setCollapsed,
    setIsPlaying,
    setError,
    setPosition,
  } = useYouTooPlayer();
  const mediaRef = useRef(null);
  const dragRef = useRef(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const style = useMemo(() => {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return undefined;
    return { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' };
  }, [position]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !activeItem || !activeItem.playableUrl) return undefined;

    const onLoaded = () => {
      if (activeItem.resumeSeconds && Number.isFinite(activeItem.resumeSeconds)) {
        media.currentTime = activeItem.resumeSeconds;
      }
    };
    const onTime = () => updateResume(media.currentTime);
    const onPlay = () => {
      setIsPlaying(true);
      recordLocalActivity({ type: 'play', source: activeItem.source, sourceKey: activeItem.sourceKey, title: activeItem.title });
    };
    const onPause = () => {
      setIsPlaying(false);
      recordLocalActivity({ type: 'pause', source: activeItem.source, sourceKey: activeItem.sourceKey, title: activeItem.title });
    };
    const onError = () => {
      setIsPlaying(false);
      setError('No se pudo reproducir este archivo desde la biblioteca.');
    };
    const onEnded = () => {
      recordLocalActivity({ type: 'complete', source: activeItem.source, sourceKey: activeItem.sourceKey, title: activeItem.title });
      next();
    };

    media.addEventListener('loadedmetadata', onLoaded);
    media.addEventListener('timeupdate', onTime);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('error', onError);
    media.addEventListener('ended', onEnded);

    mediaSessionMetadata(activeItem);
    return () => {
      media.removeEventListener('loadedmetadata', onLoaded);
      media.removeEventListener('timeupdate', onTime);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('error', onError);
      media.removeEventListener('ended', onEnded);
    };
  }, [activeItem, next, setError, setIsPlaying, updateResume]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => mediaRef.current && mediaRef.current.play());
    navigator.mediaSession.setActionHandler('pause', () => mediaRef.current && mediaRef.current.pause());
    navigator.mediaSession.setActionHandler('previoustrack', previous);
    navigator.mediaSession.setActionHandler('nexttrack', next);
  }, [next, previous]);

  const togglePlayback = () => {
    const media = mediaRef.current;
    if (!media || !activeItem || !activeItem.playableUrl) return;
    if (media.paused) media.play().catch(() => setError('El navegador necesita una interacción para iniciar la reproducción.'));
    else media.pause();
  };

  const onPointerDown = (event) => {
    if (event.target.closest('button, video, audio, input, a')) return;
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      left: position && Number.isFinite(position.x) ? position.x : window.innerWidth - 390,
      top: position && Number.isFinite(position.y) ? position.y : window.innerHeight - 158,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const onPointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const playerWidth = collapsed ? 232 : 360;
    const playerHeight = collapsed ? 72 : 300;
    const x = Math.max(12, Math.min(window.innerWidth - playerWidth - 12, drag.left + event.clientX - drag.originX));
    const y = Math.max(12, Math.min(window.innerHeight - playerHeight - 12, drag.top + event.clientY - drag.originY));
    setPosition({ x, y });
  };

  const onPointerUp = (event) => {
    if (dragRef.current && dragRef.current.pointerId === event.pointerId) {
      dragRef.current = null;
      setIsDragging(false);
    }
  };

  const activeSource = activeItem && activeItem.playableUrl ? activeItem.playableUrl : '';
  const mediaTag = activeItem && activeItem.mediaType === 'video' ? 'video' : 'audio';

  return (
    <aside
      className={'youtoo-floating-player' + (collapsed ? ' is-collapsed' : '') + (isDragging ? ' is-dragging' : '')}
      style={style}
      aria-label="Reproductor flotante Nowarfy · YouToo"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div className="youtoo-player__drag-handle" title="Arrastrar reproductor">
        <i className="material-icons">drag_indicator</i>
      </div>
      <header className="youtoo-player__header">
        <button type="button" className="youtoo-player__brand" onClick={() => setCollapsed(!collapsed)} aria-label="Mostrar u ocultar reproductor">
          <span className="youtoo-player__pulse"></span>
          <span>Nowarfy <small>· YouToo</small></span>
        </button>
        <div className="youtoo-player__header-actions">
          <button type="button" onClick={() => setQueueOpen(!queueOpen)} aria-label="Abrir cola">
            <i className="material-icons">queue_music</i><span>{queue.length}</span>
          </button>
          <button type="button" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expandir reproductor' : 'Minimizar reproductor'}>
            <i className="material-icons">{collapsed ? 'open_in_full' : 'remove'}</i>
          </button>
        </div>
      </header>

      {!collapsed && (
        <>
          <div className="youtoo-player__stage">
            {activeItem && activeItem.mediaType === 'video' && activeSource ? (
              <video ref={mediaRef} src={activeSource} controls playsInline preload="metadata" />
            ) : activeSource ? (
              <audio ref={mediaRef} src={activeSource} preload="metadata" />
            ) : null}
            {!activeItem && <div className="youtoo-player__empty">Agregá videos o música a la cola para empezar.</div>}
            {activeItem && !activeSource && <div className="youtoo-player__empty">{isResolving ? 'Preparando el archivo…' : 'Elegí reproducir para cargar este elemento.'}</div>}
          </div>

          <div className="youtoo-player__identity">
            <div className="youtoo-player__cover">{activeItem && activeItem.thumbnail ? <img src={activeItem.thumbnail} alt="" /> : <i className="material-icons">graphic_eq</i>}</div>
            <div>
              <strong>{activeItem ? activeItem.title : 'Tu cola está vacía'}</strong>
              <span>{activeItem ? activeItem.artist || 'Biblioteca Nowarfy · YouToo' : 'La reproducción queda guardada en este dispositivo.'}</span>
            </div>
          </div>

          <div className="youtoo-player__controls">
            <button type="button" onClick={previous} disabled={activeIndex <= 0} aria-label="Anterior"><i className="material-icons">skip_previous</i></button>
            <button type="button" className="youtoo-player__play" onClick={togglePlayback} disabled={!activeSource} aria-label={isPlaying ? 'Pausar' : 'Reproducir'}><i className="material-icons">{isPlaying ? 'pause' : 'play_arrow'}</i></button>
            <button type="button" onClick={next} disabled={activeIndex < 0 || activeIndex >= queue.length - 1} aria-label="Siguiente"><i className="material-icons">skip_next</i></button>
          </div>
          {error ? <p className="youtoo-player__error">{error}</p> : null}
        </>
      )}

      {queueOpen && (
        <div className="youtoo-player__queue" onPointerDown={(event) => event.stopPropagation()}>
          <div className="youtoo-player__queue-title"><span>Tu cola · {formatQueueCount(queue.length)}</span>{queue.length ? <button type="button" onClick={clearQueue}>Vaciar</button> : null}</div>
          {queue.length ? queue.map((item, index) => (
            <div key={`${item.source}-${item.sourceKey}`} className={'youtoo-player__queue-item' + (index === activeIndex ? ' is-active' : '')}>
              <button type="button" onClick={() => playIndex(index)}><span className="youtoo-player__queue-index">{index + 1}</span><span><strong>{item.title}</strong><small>{item.artist || 'Nowarfy · YouToo'}</small></span></button>
              <button type="button" onClick={() => removeFromQueue(index)} aria-label={`Quitar ${item.title} de la cola`}><i className="material-icons">close</i></button>
            </div>
          )) : <p className="youtoo-player__queue-empty">Todavía no agregaste contenido a la cola.</p>}
        </div>
      )}
    </aside>
  );
}
