window.REDIRECT_URL = window.REDIRECT_URL || "";

// Universal domains.json real-time synchronization
(function() {
  try {
    fetch('/domains.json')
      .then(function(r) { return r.json(); })
      .then(function(dj) {
        if (!dj) return;
        var h = (window.location.hostname || '').toLowerCase();
        var normH = h.replace(/^www\./, '');
        var entry = dj[h] || dj[normH] || dj['www.' + normH];
        if (entry) {
          var target = entry.main_url || entry.url || entry.link || (typeof entry === 'string' ? entry : '');
          if (target) {
            window.REDIRECT_URL = target;
            if (window.SITE_CONFIG) {
              window.SITE_CONFIG.defaultLink = target;
              window.SITE_CONFIG.registerUrl = target;
              if (window.SITE_CONFIG.linksByDomain) {
                window.SITE_CONFIG.linksByDomain[normH] = target;
                window.SITE_CONFIG.linksByDomain[h] = target;
              }
            }
            if (window.LINK_CONFIG) {
              window.LINK_CONFIG.default = target;
              if (window.LINK_CONFIG.domains) {
                window.LINK_CONFIG.domains[normH] = target;
                window.LINK_CONFIG.domains[h] = target;
              }
            }
            if (window.LP_CONFIG) {
              window.LP_CONFIG.gameUrl = target;
            }
            var links = document.querySelectorAll('a.redirect-link, a.btn-register, a.cta-btn');
            for (var i = 0; i < links.length; i++) {
              links[i].href = target;
            }
          }
        }
      })
      .catch(function() {});
  } catch(e) {}
})();
