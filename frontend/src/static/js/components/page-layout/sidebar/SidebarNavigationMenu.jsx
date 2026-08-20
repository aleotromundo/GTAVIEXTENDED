import React, { useContext } from 'react';
import urlParse from 'url-parse';
import { useUser } from '../../../utils/hooks/';
import { PageStore } from '../../../utils/stores/';
import { LinksContext, SidebarContext } from '../../../utils/contexts/';
import { NavigationMenuList } from '../../_shared';

function dispatchNowarfyCommand(action) {
  window.dispatchEvent(new CustomEvent('nowarfy:command', { detail: { action } }));
}

function NowarfyMenuSection({ label, items, formatItems }) {
  const formattedItems = formatItems(items);
  if (!formattedItems.length) return null;

  return (
    <section className="nowarfy-sidebar-section" aria-label={label}>
      <p className="nowarfy-sidebar-section__label">{label}</p>
      <NavigationMenuList items={formattedItems} />
    </section>
  );
}

export function SidebarNavigationMenu() {
  const { userCan, isAnonymous, pages: userPages } = useUser();
  const links = useContext(LinksContext);
  const sidebar = useContext(SidebarContext);
  const currentUrl = urlParse(window.location.href);
  const currentHostPath = (currentUrl.host + currentUrl.pathname).replace(/\/+$/, '');
  const enabled = PageStore.get('config-enabled');

  function formatItems(items) {
    return items
      .filter(Boolean)
      .map((item) => {
        const url = item.link ? urlParse(item.link) : null;
        const active = Boolean(url && currentHostPath === url.host + url.pathname);

        return {
          active,
          itemType: item.itemType || 'link',
          link: item.link || '#',
          icon: item.icon || null,
          iconPos: 'left',
          text: item.text,
          buttonAttr: item.buttonAttr,
          itemAttr: {
            className: item.className || '',
          },
        };
      });
  }

  const withMediaType = (mediaType) => {
    if (!userPages.media) return '#';
    return `${userPages.media}${userPages.media.includes('?') ? '&' : '?'}media_type=${mediaType}`;
  };

  const discoverItems = [
    !sidebar.hideHomeLink && { link: links.home, icon: 'home', text: 'Inicio', className: 'nav-item-home' },
    enabled.pages.featured?.enabled && { link: links.featured, icon: 'auto_awesome', text: 'Destacados', className: 'nav-item-featured' },
    enabled.pages.recommended?.enabled && { link: links.recommended, icon: 'interests', text: 'Para vos', className: 'nav-item-recommended' },
    enabled.pages.latest?.enabled && { link: links.latest, icon: 'new_releases', text: 'Novedades', className: 'nav-item-latest' },
    !sidebar.hideCategoriesLink && enabled.taxonomies.categories?.enabled && { link: links.archive.categories, icon: 'category', text: 'Categorías', className: 'nav-item-categories' },
    !sidebar.hideTagsLink && enabled.taxonomies.tags?.enabled && { link: links.archive.tags, icon: 'sell', text: 'Etiquetas', className: 'nav-item-tags' },
    enabled.pages.members?.enabled && userCan.canSeeMembersPage && { link: links.members, icon: 'groups', text: 'Creadores', className: 'nav-item-members' },
  ];

  const libraryItems = [
    !isAnonymous && userCan.addMedia && userPages.media && { link: userPages.media, icon: 'video_library', text: 'Mi biblioteca', className: 'nav-item-my-media' },
    !isAnonymous && userCan.addMedia && userPages.media && { link: withMediaType('video'), icon: 'smart_display', text: 'Videos', className: 'nav-item-nowarfy-videos' },
    !isAnonymous && userCan.addMedia && userPages.media && { link: withMediaType('audio'), icon: 'music_note', text: 'Música', className: 'nav-item-nowarfy-audio' },
    !isAnonymous && userCan.saveMedia && userPages.playlists && { link: userPages.playlists, icon: 'playlist_play', text: 'Mis listas', className: 'nav-item-my-playlists' },
    !isAnonymous && userCan.likeMedia && enabled.pages.liked?.enabled && { link: links.user.liked, icon: 'favorite', text: 'Favoritos', className: 'nav-item-liked' },
    !isAnonymous && enabled.pages.history?.enabled && { link: links.user.history, icon: 'history', text: 'Historial', className: 'nav-item-history' },
  ];

  const experienceItems = [
    {
      itemType: 'button',
      icon: 'queue_music',
      text: 'Tu cola',
      className: 'nav-item-nowarfy-queue',
      buttonAttr: { type: 'button', onClick: () => dispatchNowarfyCommand('queue'), 'aria-label': 'Abrir tu cola de reproducción' },
    },
    {
      itemType: 'button',
      icon: 'open_in_full',
      text: 'Reproductor',
      className: 'nav-item-nowarfy-player',
      buttonAttr: { type: 'button', onClick: () => dispatchNowarfyCommand('player'), 'aria-label': 'Mostrar el reproductor flotante' },
    },
    {
      itemType: 'button',
      icon: 'shield',
      text: 'Tus datos',
      className: 'nav-item-nowarfy-profile',
      buttonAttr: { type: 'button', onClick: () => dispatchNowarfyCommand('profile'), 'aria-label': 'Gestionar tus datos guardados en este dispositivo' },
    },
  ];

  const manageItems = [
    !isAnonymous && userCan.addMedia && { link: links.user.addMedia, icon: 'add_to_queue', text: 'Agregar a la biblioteca', className: 'nav-item-upload-media' },
    userCan.manageMedia && { link: links.manage.media, icon: 'tune', text: 'Administrar biblioteca', className: 'nav-item-manage-media' },
    userCan.manageUsers && { link: links.manage.users, icon: 'group', text: 'Administrar usuarios', className: 'nav-item-manage-users' },
    userCan.manageComments && { link: links.manage.comments, icon: 'forum', text: 'Comentarios', className: 'nav-item-manage-comments' },
  ];

  return (
    <div className="nowarfy-sidebar-navigation">
      <NowarfyMenuSection label="DESCUBRIR" items={discoverItems} formatItems={formatItems} />
      <NowarfyMenuSection label="TU BIBLIOTECA" items={libraryItems} formatItems={formatItems} />
      <NowarfyMenuSection label="TU EXPERIENCIA" items={experienceItems} formatItems={formatItems} />
      <NowarfyMenuSection label="CREAR Y GESTIONAR" items={manageItems} formatItems={formatItems} />
    </div>
  );
}
