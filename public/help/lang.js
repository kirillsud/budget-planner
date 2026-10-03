// Shows one language: ?lang=ru|en, else the planner's saved choice, else the browser language.
;(function () {
  var root = document.documentElement
  var lang = new URLSearchParams(location.search).get('lang')
  if (lang !== 'ru' && lang !== 'en') {
    try { lang = localStorage.getItem('budget-planner.locale') } catch (e) { lang = null }
  }
  if (lang !== 'ru' && lang !== 'en') {
    var prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en']
    lang = 'en'
    for (var i = 0; i < prefs.length; i++) {
      var l = String(prefs[i]).toLowerCase().split('-')[0]
      if (l === 'ru' || l === 'en') { lang = l; break }
    }
  }
  root.lang = lang
  root.classList.add('js')
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('nav .langs a').forEach(function (a) {
      a.setAttribute('aria-current', String(a.getAttribute('hreflang') === lang))
    })
  })
})()
