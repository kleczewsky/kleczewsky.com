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
    document.querySelectorAll('[translate]').forEach(element => {
        element.textContent = i18next.t(element.textContent.trim());
        if(element.hasAttribute('title')) {
            element.title = i18next.t(element.title.trim());
        }
    })

    window.dispatchEvent(new Event('TranslationsLoaded'))
})


