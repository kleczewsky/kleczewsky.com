import i18nextify from 'i18nextify';

i18nextify.init({
    fallbackLng: 'en',
    backend: {
      loadPath: '/static/locales/{{lng}}/{{ns}}.json'
    }
});

setTimeout(function () {
  i18nextify.forceRerender()
} , 5000);