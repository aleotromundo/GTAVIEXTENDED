import React, { useEffect, useMemo, useState } from 'react';
import {
  clearLocalProfile,
  getLocalProfile,
  setLocalPersonalization,
} from '../../utils/youtoo/localProfile';

function formatDate(value) {
  if (!value) return 'Sin actividad todavía';
  try {
    return new Intl.DateTimeFormat('es-UY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch (error) {
    return 'Actualizado en este dispositivo';
  }
}

function activityLabel(item) {
  const labels = {
    play: 'Reprodujiste',
    pause: 'Pausaste',
    complete: 'Terminaste',
    open: 'Abriste',
  };
  return labels[item.type] || 'Actividad';
}

export function NowarfyLocalProfilePanel() {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(() => getLocalProfile());

  useEffect(() => {
    const onCommand = (event) => {
      if (event?.detail?.action !== 'profile') return;
      setProfile(getLocalProfile());
      setOpen(true);
    };

    window.addEventListener('nowarfy:command', onCommand);
    return () => window.removeEventListener('nowarfy:command', onCommand);
  }, []);

  const topSearches = useMemo(() => profile.searches.slice(0, 5), [profile.searches]);
  const recentActivity = useMemo(() => profile.activity.slice(0, 5), [profile.activity]);

  const togglePersonalization = () => {
    setProfile(setLocalPersonalization(!profile.personalizationEnabled));
  };

  const eraseProfile = () => {
    if (!window.confirm('¿Querés borrar las búsquedas, la actividad y las preferencias locales guardadas en este dispositivo?')) return;
    clearLocalProfile();
    setProfile(getLocalProfile());
  };

  if (!open) return null;

  return (
    <div className="nowarfy-profile-panel__backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section
        className="nowarfy-profile-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nowarfy-profile-panel-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="nowarfy-profile-panel__header">
          <div>
            <p>NOWARFY · YOUTOO</p>
            <h2 id="nowarfy-profile-panel-title">Tus datos de este dispositivo</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar panel de datos">
            <i className="material-icons">close</i>
          </button>
        </header>

        <p className="nowarfy-profile-panel__intro">
          Tu actividad queda en este navegador. No se sincroniza ni se comparte hasta que elijas conectar una cuenta.
        </p>

        <div className="nowarfy-profile-panel__status">
          <div>
            <strong>{profile.personalizationEnabled ? 'Personalización local activada' : 'Personalización local pausada'}</strong>
            <span>{profile.personalizationEnabled ? 'La experiencia puede usar estas señales en este dispositivo.' : 'Se conserva el historial, pero no se agregan señales nuevas.'}</span>
          </div>
          <button type="button" className="nowarfy-profile-panel__primary" onClick={togglePersonalization}>
            {profile.personalizationEnabled ? 'Pausar' : 'Activar'}
          </button>
        </div>

        <div className="nowarfy-profile-panel__stats" aria-label="Resumen de datos locales">
          <div><strong>{profile.searches.length}</strong><span>Búsquedas</span></div>
          <div><strong>{profile.activity.length}</strong><span>Actividad</span></div>
          <div><strong>{profile.interests.length}</strong><span>Intereses</span></div>
        </div>

        <section className="nowarfy-profile-panel__section" aria-labelledby="nowarfy-profile-searches">
          <h3 id="nowarfy-profile-searches">Búsquedas recientes</h3>
          {topSearches.length ? (
            <ul>
              {topSearches.map((search) => <li key={`${search.normalizedQuery}-${search.sourceScope}`}><span>{search.query}</span><small>{search.count} {search.count === 1 ? 'vez' : 'veces'}</small></li>)}
            </ul>
          ) : <p className="nowarfy-profile-panel__empty">Todavía no guardaste búsquedas en esta biblioteca.</p>}
        </section>

        <section className="nowarfy-profile-panel__section" aria-labelledby="nowarfy-profile-activity">
          <h3 id="nowarfy-profile-activity">Actividad reciente</h3>
          {recentActivity.length ? (
            <ul>
              {recentActivity.map((activity) => <li key={activity.id}><span><b>{activityLabel(activity)}</b>{activity.title ? ` · ${activity.title}` : ''}</span><small>{formatDate(activity.occurredAt)}</small></li>)}
            </ul>
          ) : <p className="nowarfy-profile-panel__empty">La reproducción y las aperturas de contenido aparecerán acá.</p>}
        </section>

        <footer className="nowarfy-profile-panel__footer">
          <span>Última actualización: {formatDate(profile.updatedAt)}</span>
          <button type="button" onClick={eraseProfile}>Borrar datos locales</button>
        </footer>
      </section>
    </div>
  );
}
