(function registerYouTooPwa() {
  if (!('serviceWorker' in navigator) || window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/static/youtoo-sw.js', { scope: '/' }).then(function (registration) {
      registration.update().catch(function () {});
    }).catch(function () {
      // PWA installation remains progressive; failure never blocks the library or playback.
    });
  });
})();
