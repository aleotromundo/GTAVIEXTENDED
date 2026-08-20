import React, { useState } from 'react';
import { ApiUrlConsumer, LinksConsumer } from '../utils/contexts/';
import { PageStore } from '../utils/stores/';
import { MediaListRow } from '../components/MediaListRow';
import { MediaMultiListWrapper } from '../components/MediaMultiListWrapper';
import { ItemListAsync } from '../components/item-list/ItemListAsync.jsx';
import { InlineSliderItemListAsync } from '../components/item-list/InlineSliderItemListAsync.jsx';
import { Page } from './Page';
import { translateString } from '../utils/helpers/';

const EmptyMedia: React.FC = ({}) => {
  return (
    <LinksConsumer>
      {(links) => (
        <div className="empty-media">
          <div className="welcome-title">Tu biblioteca está lista para empezar.</div>
          <div className="start-uploading">Sumá tu primer video, canción o archivo de audio para convertir este espacio en tu catálogo audiovisual.</div>
          <a href={links.user.addMedia} title="Agregar a la biblioteca" className="button-link">
            <i className="material-icons" data-icon="video_call"></i>AGREGAR A LA BIBLIOTECA
          </a>
        </div>
      )}
    </LinksConsumer>
  );
};

const YouTooHero: React.FC = () => (
  <section className="youtoo-hero" aria-label="Nowarfy">
    <div className="youtoo-hero__eyebrow">Nowarfy <span>· YouToo, experiencia audiovisual</span></div>
    <h1 className="youtoo-hero__title">
      Todo lo que querés ver y escuchar. <span>En un mismo lugar.</span>
    </h1>
    <p className="youtoo-hero__copy">
      Biblioteca propia, video y audio organizados para descubrir, guardar y continuar tu reproducción sin salir de la experiencia.
    </p>
    <div className="youtoo-hero__chips" aria-label="Capacidades de Nowarfy">
      <span>Biblioteca viva</span>
      <span>Cola persistente</span>
      <span>Canales y listas</span>
      <span>Audio continuo</span>
    </div>
  </section>
);

interface HomePageProps {
  id?: string;
  latest_title: string;
  featured_title: string;
  recommended_title: string;
  latest_view_all_link: boolean;
  featured_view_all_link: boolean;
  recommended_view_all_link: boolean;
}

export const HomePage: React.FC<HomePageProps> = ({
  id = 'home',
  //featured_title = PageStore.get('config-options').pages.home.sections.featured.title,
  //recommended_title = PageStore.get('config-options').pages.home.sections.recommended.title,
  //latest_title = PageStore.get('config-options').pages.home.sections.latest.title,
  featured_title = translateString('Featured'),
  recommended_title = translateString('Recommended'),
  latest_title = translateString('Latest'),
  latest_view_all_link = false,
  featured_view_all_link = true,
  recommended_view_all_link = true,
}) => {
  const [zeroMedia, setZeroMedia] = useState(false);
  const [visibleLatest, setVisibleLatest] = useState(false);
  const [visibleFeatured, setVisibleFeatured] = useState(false);
  const [visibleRecommended, setVisibleRecommended] = useState(false);

  const onLoadLatest = (length: number) => {
    setVisibleLatest(0 < length);
    setZeroMedia(0 === length);
  };

  const onLoadFeatured = (length: number) => {
    setVisibleFeatured(0 < length);
  };

  const onLoadRecommended = (length: number) => {
    setVisibleRecommended(0 < length);
  };

  return (
    <Page id={id}>
      <LinksConsumer>
        {(links) => (
          <ApiUrlConsumer>
            {(apiUrl) => (
              <MediaMultiListWrapper className="items-list-ver">
                <YouTooHero />
                {PageStore.get('config-enabled').pages.featured &&
                  PageStore.get('config-enabled').pages.featured.enabled && (
                    <MediaListRow
                      title={featured_title}
                      style={!visibleFeatured ? { display: 'none' } : undefined}
                      viewAllLink={featured_view_all_link ? links.featured : null}
                    >
                      <InlineSliderItemListAsync
                        requestUrl={apiUrl.featured}
                        itemsCountCallback={onLoadFeatured}
                        hideViews={!PageStore.get('config-media-item').displayViews}
                        hideAuthor={!PageStore.get('config-media-item').displayAuthor}
                        hideDate={!PageStore.get('config-media-item').displayPublishDate}
                      />
                    </MediaListRow>
                  )}

                {PageStore.get('config-enabled').pages.recommended &&
                  PageStore.get('config-enabled').pages.recommended.enabled && (
                    <MediaListRow
                      title={recommended_title}
                      style={!visibleRecommended ? { display: 'none' } : undefined}
                      viewAllLink={recommended_view_all_link ? links.recommended : null}
                    >
                      <InlineSliderItemListAsync
                        requestUrl={apiUrl.recommended}
                        itemsCountCallback={onLoadRecommended}
                        hideViews={!PageStore.get('config-media-item').displayViews}
                        hideAuthor={!PageStore.get('config-media-item').displayAuthor}
                        hideDate={!PageStore.get('config-media-item').displayPublishDate}
                      />
                    </MediaListRow>
                  )}

                <MediaListRow
                  title={latest_title}
                  style={!visibleLatest ? { display: 'none' } : undefined}
                  viewAllLink={latest_view_all_link ? links.latest : null}
                >
                  <ItemListAsync
                    pageItems={30}
                    requestUrl={apiUrl.media}
                    itemsCountCallback={onLoadLatest}
                    hideViews={!PageStore.get('config-media-item').displayViews}
                    hideAuthor={!PageStore.get('config-media-item').displayAuthor}
                    hideDate={!PageStore.get('config-media-item').displayPublishDate}
                  />
                </MediaListRow>

                {zeroMedia && <EmptyMedia />}
              </MediaMultiListWrapper>
            )}
          </ApiUrlConsumer>
        )}
      </LinksConsumer>
    </Page>
  );
};
