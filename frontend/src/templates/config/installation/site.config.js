module.exports = {
  devEnv: 'true' === process.env.WEBPACK_DEV_SERVER,
  id: process.env.MEDIACMS_ID || 'nowarfy-media',
  title: process.env.MEDIACMS_TITLE || 'Nowarfy',
  url: process.env.MEDIACMS_URL || 'UNDEFINED_URL',
  api: process.env.MEDIACMS_API || 'UNDEFINED_API',
  useRoundedCorners: true,
  version: '1.0.0',
  theme: {
    mode: 'dark', // Valid values: 'light', 'dark'.
    switch: {
      position: 'sidebar', // Valid values: 'header', 'sidebar'.
    },
  },
  logo: {
    lightMode: {
      svg: '',
      img: './static/images/youtoo-mark-compact.png',
    },
    darkMode: {
      svg: '',
      img: './static/images/youtoo-mark-compact.png',
    },
  },
  pages: {
    latest: {
      title: 'Últimas incorporaciones',
    },
    featured: {
      title: 'Destacados',
    },
    recommended: {
      title: 'Para seguir explorando',
    },
    members: {
      title: 'Comunidad',
    },
  },
  userPages: {
    liked: {
      title: 'Favoritos',
    },
    history: {
      title: 'Historial',
    },
  },
  taxonomies: {
    tags: {
      title: 'Etiquetas',
    },
    categories: {
      title: 'Categorías',
    },
  },
};
