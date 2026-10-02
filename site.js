/* 강진청자 국보 · 공통 스크립트 — 모바일 메뉴 · 스크롤 리빌 · 라이트박스 · 작품 필터 */
(function () {
  'use strict';

  /* 모바일 메뉴 */
  var nav = document.querySelector('nav.top');
  var tg = nav && nav.querySelector('.navtoggle');
  if (tg) {
    tg.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      tg.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') nav.classList.remove('open'); });
  }

  /* 스크롤 리빌 */
  var els = document.querySelectorAll('.sechead, .chapter, .quote, .selgrid a, .giftband, .pitem, .award, .series, .wcard, .step, .protocard, .store, .notice .box, .galmuseum figure, .feat, .moon, .bpsec, .contactcard, .plaquesec');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(function (e) { e.classList.add('rv'); });
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('on'); io.unobserve(x.target); } });
    }, { threshold: .08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* 라이트박스 (작품·사진) */
  var zs = document.querySelectorAll('.feat img, .galmuseum img, .chapter .ph > img, .craftphotos img, .packrow img, .selgrid img');
  if (zs.length) {
    var ov = document.createElement('figure'); ov.className = 'lb'; ov.style.margin = 0;
    ov.innerHTML = '<img alt=""><figcaption></figcaption>';
    document.body.appendChild(ov);
    var close = function () { ov.classList.remove('open'); document.body.style.overflow = ''; };
    ov.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    zs.forEach(function (im) {
      if (im.closest('a')) return;
      im.style.cursor = 'zoom-in';
      im.addEventListener('click', function () {
        ov.querySelector('img').src = im.currentSrc || im.src;
        var fig = im.closest('figure'); var t = fig && fig.querySelector('.plaque .t, figcaption');
        ov.querySelector('figcaption').textContent = t ? t.textContent : (im.alt || '');
        ov.classList.add('open'); document.body.style.overflow = 'hidden';
      });
    });
  }

  /* 작품 도록 필터 */
  var fl = document.querySelector('.filter');
  if (fl) {
    var figs = document.querySelectorAll('.galmuseum figure, .feat');
    fl.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      fl.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var cat = b.getAttribute('data-cat');
      figs.forEach(function (f) {
        var show = cat === 'all' || (f.getAttribute('data-cat') || '').split(' ').indexOf(cat) > -1;
        f.classList.toggle('hide', !show);
        if (show) f.classList.add('on');
      });
    });
  }
})();
