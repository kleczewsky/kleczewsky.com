import i18next from 'i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

const urlSearchParams = new URLSearchParams(window.location.search)

window.i18next = i18next

i18next
    .use(Backend)
    .use(LanguageDetector)
    .init({
    fallbackLng: 'en',
    debug: urlSearchParams.has('debug'),
    backend: {
      loadPath: '/static/locales/{{lng}}/{{ns}}.json'
    },
        keySeparator: false,
        nsSeparator: false,

}).then(() => {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        element.textContent = i18next.t(element.dataset.i18n);
    })

    window.dispatchEvent(new Event('TranslationsLoaded'))
})


