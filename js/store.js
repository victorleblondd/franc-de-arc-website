/*
 * FRANC DE ARC — storefront logic.
 *
 * To change prices, sizes or products, edit CONFIG and PRODUCTS below.
 * The collection grid, product view and bag all render from them.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
   * Settings: edit these
   * ------------------------------------------------------------------ */
  var CONFIG = {
    // Shown in front of every price, e.g. '€', '£' or '$'.
    currency: '€',
    // Price per product type. 0 shows "[YOUR PRICE]" until you set a real price.
    prices: { hoodie: 0, beanie: 0 },
    // Sizes offered for every hoodie. The beanie is one size.
    hoodieSizes: ['S', 'M', 'L', 'XL'],
    // Optional: the page the Checkout button opens (Shopify, Stripe Payment Link, etc.).
    // Leave it empty to show a "checkout isn't connected yet" note instead.
    checkoutUrl: ''
  };

  var HOODIE_DETAILS = ['Drawstring hood', 'Front pocket', 'Ribbed cuffs and hem'];

  var PRODUCTS = [
    {
      id: 'hoodie-blue',
      n: '01',
      kind: 'hoodie',
      name: 'ТОКИО Hoodie',
      colour: 'Royal Blue',
      swatch: '#1D31B4',
      back: 'images/hoodie-blue-back.jpg',
      images: [
        { src: 'images/hoodie-blue-front.jpg', alt: 'ТОКИО Hoodie in royal blue, front', fit: 'contain' },
        { src: 'images/hoodie-blue-back.jpg', alt: 'ТОКИО Hoodie in royal blue, back', fit: 'contain' },
        { src: 'images/hero-closeup.jpg', alt: 'Close-up of the white chest print on the royal blue hoodie', fit: 'cover', pos: '50% 20%' }
      ],
      details: ['White FRANC DE ARC / ТОКИО print across the chest'].concat(HOODIE_DETAILS)
    },
    {
      id: 'hoodie-black',
      n: '02',
      kind: 'hoodie',
      name: 'ТОКИО Hoodie',
      colour: 'Black',
      swatch: '#111111',
      back: 'images/hoodie-black-back.jpg',
      images: [
        { src: 'images/hoodie-black-front.jpg', alt: 'ТОКИО Hoodie in black, front', fit: 'contain' },
        { src: 'images/hoodie-black-back.jpg', alt: 'ТОКИО Hoodie in black, back, with the compass mark below the hood', fit: 'contain' },
        { src: 'images/hoodie-black-back-detail.jpg', alt: 'Compass mark below the hood on the black hoodie', fit: 'cover', pos: '50% 35%' }
      ],
      details: ['White FRANC DE ARC / ТОКИО print across the chest', 'Compass mark below the hood on the back'].concat(HOODIE_DETAILS)
    },
    {
      id: 'hoodie-cream',
      n: '03',
      kind: 'hoodie',
      name: 'ТОКИО Hoodie',
      colour: 'Cream',
      swatch: '#EFE2CF',
      back: '',
      images: [
        { src: 'images/hoodie-cream-front.jpg', alt: 'ТОКИО Hoodie in cream, front', fit: 'contain' }
      ],
      details: ['Black FRANC DE ARC / ТОКИО print across the chest'].concat(HOODIE_DETAILS)
    },
    {
      id: 'beanie-sky',
      n: '04',
      kind: 'beanie',
      name: 'Compass Beanie',
      colour: 'Sky Blue',
      swatch: '#5B9CEA',
      back: '',
      images: [
        { src: 'images/beanie-sky-square.jpg', alt: 'Compass Beanie in sky blue, with the compass mark on the cuff', fit: 'cover' },
        { src: 'images/hero-closeup.jpg', alt: 'Compass Beanie styled with the royal blue ТОКИО Hoodie', fit: 'cover', pos: '0% 42%' }
      ],
      details: ['Compass mark on the fold-over cuff', 'Rib knit']
    }
  ];

  var MARQUEE = ['FRANC DE ARC', 'ТОКИО Hoodie — Royal Blue', 'ТОКИО Hoodie — Black', 'ТОКИО Hoodie — Cream', 'Compass Beanie — Sky Blue'];

  /* ------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------ */
  var ONE_SIZE = 'One size';
  var STORAGE_KEY = 'fda-bag-v1';
  var BASE_TITLE = document.title;

  function $(selector) { return document.querySelector(selector); }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function find(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id) return PRODUCTS[i];
    }
    return null;
  }

  function sizesFor(p) { return p.kind === 'beanie' ? [ONE_SIZE] : CONFIG.hoodieSizes; }

  function priceOf(p) {
    var v = Number(CONFIG.prices[p.kind]);
    return isFinite(v) && v > 0 ? v : 0;
  }

  function money(v) {
    var rounded = Math.round(v * 100) / 100;
    return CONFIG.currency + (rounded % 1 === 0 ? String(rounded) : rounded.toFixed(2));
  }

  function priceLabel(p) {
    var v = priceOf(p);
    return v > 0 ? money(v) : '[YOUR PRICE]';
  }

  function icon(name) { return '<svg aria-hidden="true"><use href="#' + name + '"></use></svg>'; }

  function eachInput(root, fn) { Array.prototype.forEach.call(root.querySelectorAll('input'), fn); }

  /* ------------------------------------------------------------------
   * State and bag storage
   * ------------------------------------------------------------------ */
  function loadBag() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (line) {
        var p = line && find(line.id);
        return p && sizesFor(p).indexOf(line.size) !== -1 && Number.isInteger(line.qty) && line.qty > 0 && line.qty < 100;
      }).map(function (line) {
        return { id: line.id, size: line.size, qty: line.qty };
      });
    } catch (e) {
      return [];
    }
  }

  var state = {
    bag: loadBag(),
    productId: null,
    imgIndex: 0,
    size: null,
    lastHomeScroll: 0,
    renderedKind: null
  };

  function saveBag() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bag));
    } catch (e) {
      // Storage unavailable (private mode): the bag lasts for this visit only.
    }
  }

  /* ------------------------------------------------------------------
   * Elements
   * ------------------------------------------------------------------ */
  var el = {
    marquee: $('[data-marquee]'),
    grid: $('[data-grid]'),
    home: $('[data-home-view]'),
    product: $('[data-product-view]'),
    bag: $('#bag'),
    bagToggle: $('[data-bag-toggle]'),
    bagClose: $('[data-bag-close]'),
    bagCount: $('[data-bag-count]'),
    bagEmpty: $('[data-bag-empty]'),
    bagFilled: $('[data-bag-filled]'),
    bagLines: $('[data-bag-lines]'),
    bagSubtotal: $('[data-bag-subtotal]'),
    bagShop: $('[data-bag-shop]'),
    checkout: $('[data-checkout]'),
    checkoutNote: $('[data-checkout-note]'),
    pCrumb: $('[data-p-crumb]'),
    pMain: $('[data-p-main]'),
    pThumbs: $('[data-p-thumbs]'),
    pKicker: $('[data-p-kicker]'),
    pName: $('[data-p-name]'),
    pPrice: $('[data-p-price]'),
    pColour: $('[data-p-colour]'),
    pSwatches: $('[data-p-swatches]'),
    pSizes: $('[data-p-sizes]'),
    pAdd: $('[data-p-add]'),
    pStatus: $('[data-p-status]'),
    pDetails: $('[data-p-details]'),
    year: $('[data-year]')
  };

  /* ------------------------------------------------------------------
   * Marquee and collection grid
   * ------------------------------------------------------------------ */
  function renderMarquee() {
    var html = '';
    for (var k = 0; k < 6; k++) {
      MARQUEE.forEach(function (text) {
        html += '<span class="marquee__item">' + icon('i-star') + '<span>' + esc(text) + '</span></span>';
      });
    }
    el.marquee.innerHTML = html;
  }

  function renderGrid() {
    el.grid.innerHTML = PRODUCTS.map(function (p) {
      var first = p.images[0];
      var price = priceLabel(p);
      var frontStyle = first.pos ? ' style="object-position:' + esc(first.pos) + '"' : '';
      return '<a class="card' + (p.back ? '' : ' card--zoom') + '" href="#/product/' + esc(p.id) + '" aria-label="' + esc('View ' + p.name + ' in ' + p.colour + ', ' + price) + '">' +
          '<span class="card__media">' +
            '<img class="card__front' + (first.fit === 'cover' ? ' card__front--cover' : '') + '" src="' + esc(first.src) + '" alt="" loading="lazy"' + frontStyle + '>' +
            (p.back ? '<img class="card__back" src="' + esc(p.back) + '" alt="" loading="lazy">' : '') +
            '<span class="card__num' + (p.kind === 'beanie' ? ' card__num--light' : '') + '">' + esc(p.n) + '</span>' +
          '</span>' +
          '<span class="card__info">' +
            '<span class="card__text">' +
              '<span class="card__name">' + esc(p.name) + '</span>' +
              '<span class="card__colour"><span class="dot" style="background:' + esc(p.swatch) + '"></span>' + esc(p.colour) + '</span>' +
            '</span>' +
            '<span class="card__price">' + esc(price) + '</span>' +
          '</span>' +
        '</a>';
    }).join('');
  }

  /* ------------------------------------------------------------------
   * Product view
   * ------------------------------------------------------------------ */
  var statusTimer = null;

  function setStatus(message, isError) {
    if (statusTimer) {
      clearTimeout(statusTimer);
      statusTimer = null;
    }
    el.pStatus.textContent = message;
    el.pStatus.classList.toggle('status--error', !!isError);
  }

  function setMainImage(image) {
    el.pMain.src = image.src;
    el.pMain.alt = image.alt;
    el.pMain.style.objectFit = image.fit || 'contain';
    el.pMain.style.objectPosition = image.pos || '50% 50%';
  }

  function renderProduct() {
    var p = find(state.productId);
    if (!p) return;
    var idx = Math.max(0, Math.min(state.imgIndex, p.images.length - 1));

    el.pCrumb.textContent = p.name + ' — ' + p.colour;
    el.pKicker.textContent = p.n + ' — ' + (p.kind === 'beanie' ? 'Beanie' : 'Hoodie');
    el.pName.textContent = p.name;
    el.pPrice.textContent = priceLabel(p);
    el.pColour.textContent = p.colour;
    setMainImage(p.images[idx]);

    el.pThumbs.innerHTML = p.images.length > 1 ? p.images.map(function (image, i) {
      var style = image.fit === 'cover' ? ' style="object-fit:cover;object-position:' + esc(image.pos || '50% 50%') + '"' : '';
      return '<button class="thumb" type="button" data-thumb="' + i + '" aria-pressed="' + (i === idx) + '" aria-label="' + esc('Show image ' + (i + 1) + ' of ' + p.images.length) + '">' +
        '<img src="' + esc(image.src) + '" alt=""' + style + '></button>';
    }).join('') : '';

    // Rebuild the colour and size radios only when moving between hoodies and the beanie,
    // so keyboard focus stays put while switching colours.
    if (state.renderedKind !== p.kind) {
      el.pSwatches.innerHTML = PRODUCTS.filter(function (q) { return q.kind === p.kind; }).map(function (q) {
        var id = 'colour-' + q.id;
        return '<span class="swatch">' +
            '<input class="visually-hidden" type="radio" name="colour" id="' + esc(id) + '" value="' + esc(q.id) + '">' +
            '<label for="' + esc(id) + '" style="background:' + esc(q.swatch) + '"><span class="visually-hidden">' + esc(q.colour) + '</span></label>' +
          '</span>';
      }).join('');
      el.pSizes.innerHTML = sizesFor(p).map(function (size) {
        var id = 'size-' + size.toLowerCase().replace(/\s+/g, '-');
        return '<span class="size">' +
            '<input class="visually-hidden" type="radio" name="size" id="' + esc(id) + '" value="' + esc(size) + '">' +
            '<label for="' + esc(id) + '">' + esc(size) + '</label>' +
          '</span>';
      }).join('');
      state.renderedKind = p.kind;
    }
    eachInput(el.pSwatches, function (radio) { radio.checked = radio.value === p.id; });
    eachInput(el.pSizes, function (radio) { radio.checked = radio.value === state.size; });

    el.pDetails.innerHTML = p.details.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('');
    el.pAdd.textContent = priceOf(p) > 0 ? 'Add to bag — ' + priceLabel(p) : 'Add to bag';
    setStatus('');
    document.title = p.name + ' — ' + p.colour + ' | FRANC DE ARC';
  }

  function switchColour(id) {
    var p = find(id);
    if (!p) return;
    var keep = state.size;
    state.productId = id;
    state.imgIndex = 0;
    state.size = p.kind === 'beanie' ? ONE_SIZE : (keep === ONE_SIZE ? null : keep);
    if (window.history && window.history.replaceState) window.history.replaceState(null, '', '#/product/' + id);
    renderProduct();
  }

  /* ------------------------------------------------------------------
   * Bag
   * ------------------------------------------------------------------ */
  function setBagOpen(open) {
    el.bag.hidden = !open;
    el.bagToggle.setAttribute('aria-expanded', String(open));
    if (!open) el.checkoutNote.hidden = true;
  }

  function renderBag(focus) {
    var count = 0;
    var subtotal = 0;
    var unpriced = false;

    el.bagLines.innerHTML = state.bag.map(function (line, i) {
      var p = find(line.id);
      var unit = priceOf(p);
      var first = p.images[0];
      var desc = p.name + ', ' + p.colour + ', size ' + line.size;
      if (!(unit > 0)) unpriced = true;
      count += line.qty;
      subtotal += unit * line.qty;
      return '<li class="bag-line">' +
          '<img class="bag-line__img' + (first.fit === 'cover' ? ' bag-line__img--cover' : '') + '" src="' + esc(first.src) + '" alt="" width="72" height="72">' +
          '<span class="bag-line__text">' +
            '<span class="bag-line__name">' + esc(p.name) + '</span>' +
            '<span class="bag-line__meta">' + esc(p.colour + ' · ' + line.size) + '</span>' +
          '</span>' +
          '<span class="bag-line__total">' + esc(unit > 0 ? money(unit * line.qty) : '[PRICE]') + '</span>' +
          '<span class="bag-line__controls">' +
            '<button class="icon-btn icon-btn--sm" type="button" data-action="dec" data-index="' + i + '" aria-label="' + esc('Remove one ' + desc) + '">' + icon('i-minus') + '</button>' +
            '<span class="bag-line__qty">' + line.qty + '</span>' +
            '<button class="icon-btn icon-btn--sm" type="button" data-action="inc" data-index="' + i + '" aria-label="' + esc('Add one more ' + desc) + '">' + icon('i-plus') + '</button>' +
            '<button class="bag-line__remove" type="button" data-action="remove" data-index="' + i + '" aria-label="' + esc('Remove ' + desc + ' from your bag') + '">Remove</button>' +
          '</span>' +
        '</li>';
    }).join('');

    var hasItems = state.bag.length > 0;
    el.bagEmpty.hidden = hasItems;
    el.bagFilled.hidden = !hasItems;
    el.bagCount.textContent = String(count);
    el.bagSubtotal.textContent = hasItems && !unpriced ? money(subtotal) : '[SUBTOTAL]';
    el.checkoutNote.hidden = true;

    if (focus) {
      var target = el.bagLines.querySelector('[data-action="' + focus.action + '"][data-index="' + focus.index + '"]');
      (target || (hasItems ? el.checkout : el.bagClose)).focus();
    }
  }

  function addLine(id, size) {
    for (var i = 0; i < state.bag.length; i++) {
      if (state.bag[i].id === id && state.bag[i].size === size) {
        state.bag[i].qty = Math.min(99, state.bag[i].qty + 1);
        saveBag();
        renderBag();
        return;
      }
    }
    state.bag.push({ id: id, size: size, qty: 1 });
    saveBag();
    renderBag();
  }

  /* ------------------------------------------------------------------
   * Routing: #/product/<id> shows a product, anything else the home page
   * ------------------------------------------------------------------ */
  function showHome(anchor) {
    var fromProduct = !el.product.hidden;
    el.product.hidden = true;
    el.home.hidden = false;
    document.title = BASE_TITLE;
    if (anchor === 'top') {
      window.scrollTo(0, 0);
      return;
    }
    var target = anchor ? document.getElementById(anchor) : null;
    if (target) target.scrollIntoView();
    else if (fromProduct) window.scrollTo(0, state.lastHomeScroll);
  }

  function showProduct(id) {
    var p = find(id);
    if (!el.home.hidden) state.lastHomeScroll = window.scrollY || window.pageYOffset || 0;
    if (state.productId !== id) {
      state.productId = id;
      state.imgIndex = 0;
      state.size = p.kind === 'beanie' ? ONE_SIZE : null;
    }
    el.home.hidden = true;
    el.product.hidden = false;
    renderProduct();
    window.scrollTo(0, 0);
    el.pName.focus({ preventScroll: true });
  }

  function route() {
    var hash = window.location.hash || '';
    var match = hash.match(/^#\/product\/([\w-]+)$/);
    if (match && find(match[1])) {
      showProduct(match[1]);
      return;
    }
    var anchor = hash.length > 1 && hash.charAt(1) !== '/' ? decodeURIComponent(hash.slice(1)) : '';
    showHome(anchor);
  }

  /* ------------------------------------------------------------------
   * Events
   * ------------------------------------------------------------------ */
  el.pThumbs.addEventListener('click', function (e) {
    var button = e.target.closest('[data-thumb]');
    if (!button) return;
    var p = find(state.productId);
    var i = Number(button.getAttribute('data-thumb'));
    state.imgIndex = i;
    setMainImage(p.images[i]);
    Array.prototype.forEach.call(el.pThumbs.querySelectorAll('[data-thumb]'), function (t) {
      t.setAttribute('aria-pressed', String(t === button));
    });
  });

  el.pSwatches.addEventListener('change', function (e) {
    if (e.target.name === 'colour') switchColour(e.target.value);
  });

  el.pSizes.addEventListener('change', function (e) {
    if (e.target.name === 'size') {
      state.size = e.target.value;
      setStatus('');
    }
  });

  el.pAdd.addEventListener('click', function () {
    var p = find(state.productId);
    if (!p) return;
    var size = p.kind === 'beanie' ? ONE_SIZE : state.size;
    if (!size) {
      setStatus('Choose a size first.', true);
      var firstSize = el.pSizes.querySelector('input');
      if (firstSize) firstSize.focus();
      return;
    }
    addLine(p.id, size);
    setStatus('Added to your bag.');
    statusTimer = setTimeout(function () { setStatus(''); }, 3000);
    setBagOpen(true);
  });

  el.bagToggle.addEventListener('click', function () { setBagOpen(el.bag.hidden); });

  el.bagClose.addEventListener('click', function () {
    setBagOpen(false);
    el.bagToggle.focus();
  });

  el.bagShop.addEventListener('click', function () { setBagOpen(false); });

  el.bagLines.addEventListener('click', function (e) {
    var button = e.target.closest('[data-action]');
    if (!button) return;
    var i = Number(button.getAttribute('data-index'));
    var line = state.bag[i];
    if (!line) return;
    var action = button.getAttribute('data-action');
    if (action === 'inc') line.qty = Math.min(99, line.qty + 1);
    if (action === 'dec') line.qty -= 1;
    var removed = action === 'remove' || line.qty <= 0;
    if (removed) state.bag.splice(i, 1);
    saveBag();
    renderBag(removed ? { action: 'remove', index: Math.min(i, state.bag.length - 1) } : { action: action, index: i });
  });

  el.checkout.addEventListener('click', function () {
    if (CONFIG.checkoutUrl) {
      window.location.href = CONFIG.checkoutUrl;
      return;
    }
    el.checkoutNote.hidden = false;
  });

  // Close the bag on a click outside it, or with Escape.
  document.addEventListener('click', function (e) {
    if (el.bag.hidden) return;
    var path = e.composedPath ? e.composedPath() : [];
    if (path.indexOf(el.bag) !== -1 || path.indexOf(el.bagToggle) !== -1) return;
    if (!document.contains(e.target)) return;
    if (e.target.closest && e.target.closest('[data-keeps-bag]')) return;
    setBagOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && !el.bag.hidden) {
      setBagOpen(false);
      el.bagToggle.focus();
    }
  });

  window.addEventListener('hashchange', route);

  /* ------------------------------------------------------------------
   * Start
   * ------------------------------------------------------------------ */
  el.pName.setAttribute('tabindex', '-1');
  if (el.year) el.year.textContent = String(new Date().getFullYear());
  renderMarquee();
  renderGrid();
  renderBag();
  route();
})();
