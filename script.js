const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.main-nav');
const year = document.getElementById('year');

if (nav) {
  const navLinks = nav.querySelectorAll('a');
  const normalizePath = (pathname) => (pathname.endsWith('/') ? `${pathname}index.html` : pathname);
  const homePath = normalizePath(new URL('index.html', window.location.href).pathname);
  const pageSections = new Map([
    ['about.html', 'about'],
    ['actions.html', 'actions'],
    ['projects.html', 'projects'],
    ['actualites.html', 'actualites'],
    ['contact.html', 'contact'],
  ]);
  const setActiveNavLink = (activeLink) => {
    navLinks.forEach((link) => {
      const isActive = link === activeLink;

      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };
  const updateActiveNavLink = (destination = window.location.href) => {
    const currentUrl = new URL(destination, window.location.href);

    if (normalizePath(currentUrl.pathname) === homePath) {
      const headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
      const marker = window.scrollY + headerHeight + 36;
      const activeSectionLink = [...navLinks].reduce((activeLink, link) => {
        const linkUrl = new URL(link.href);
        const section =
          normalizePath(linkUrl.pathname) === homePath &&
          linkUrl.hash &&
          document.querySelector(linkUrl.hash);

        if (section && section.getBoundingClientRect().top + window.scrollY <= marker) {
          return link;
        }
        return activeLink;
      }, undefined);
      const activeLink = activeSectionLink ?? [...navLinks].find((link) => {
        const linkUrl = new URL(link.href);
        return normalizePath(linkUrl.pathname) === homePath && !linkUrl.hash;
      });

      setActiveNavLink(activeLink);
      return;
    }

    const page = currentUrl.pathname.split('/').pop() ?? '';
    const section = pageSections.get(page);
    const activeLink = [...navLinks].find((link) => {
      const linkUrl = new URL(link.href);
      return (
        normalizePath(linkUrl.pathname) === homePath &&
        linkUrl.hash === (section ? `#${section}` : '')
      );
    });

    setActiveNavLink(activeLink);
  };

  const scheduleActiveNavLinkUpdate = () => requestAnimationFrame(() => updateActiveNavLink());
  updateActiveNavLink();
  window.addEventListener('hashchange', scheduleActiveNavLinkUpdate);
  window.addEventListener('scroll', scheduleActiveNavLinkUpdate, { passive: true });
  navLinks.forEach((link) => {
    link.addEventListener('click', () => updateActiveNavLink(link.href));
  });
}

if (year) {
  year.textContent = new Date().getFullYear();
}

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-label', 'Ouvrir le menu');
    });
  });
}

const counters = document.querySelectorAll('[data-count]');
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const el = entry.target;
      const target = Number(el.dataset.count || 0);
      const duration = 1200;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        el.textContent = `${value}${target >= 100 ? '+' : ''}`;

        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = `${target}+`;
        }
      };

      requestAnimationFrame(tick);
      observer.unobserve(el);
    });
  },
  { threshold: 0.35 }
);

counters.forEach((counter) => observer.observe(counter));

const featuredNews = document.querySelector('[data-news-featured]');
const newsList = document.querySelector('[data-news-list]');

if (featuredNews || newsList) {
  const status = document.querySelector('[data-news-status]');
  const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const makeElement = (tagName, className, text) => {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };

  const formatDate = (article) =>
    article.date_label ||
    dateFormatter.format(new Date(`${article.date}T00:00:00Z`));

  const createImage = (article) => {
    const image = document.createElement('img');
    image.src = article.image;
    image.alt = article.image_alt;
    image.loading = 'lazy';
    return image;
  };

  const createDate = (article, includeLocation = false) => {
    const date = makeElement(
      'time',
      'news-date',
      includeLocation && article.location
        ? `${formatDate(article)} · ${article.location}`
        : formatDate(article)
    );
    date.dateTime = article.date;
    return date;
  };

  const isValidArticle = (article) =>
    article &&
    typeof article.title === 'string' &&
    typeof article.slug === 'string' &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug) &&
    typeof article.category === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(article.date) &&
    typeof article.image === 'string' &&
    typeof article.image_alt === 'string' &&
    typeof article.summary === 'string' &&
    Array.isArray(article.paragraphs) &&
    article.paragraphs.every((paragraph) => typeof paragraph === 'string');

  const supabase = window.AFRICA_SOUTIENS_SUPABASE;
  const hasSupabaseConfig = Boolean(supabase?.url && supabase?.publishableKey);
  const hasPartialSupabaseConfig = Boolean(supabase?.url || supabase?.publishableKey) && !hasSupabaseConfig;
  const loadArticles = async () => {
    if (hasPartialSupabaseConfig) {
      throw new Error('La configuration Supabase est incomplète.');
    }

    const url = hasSupabaseConfig
      ? `${supabase.url.replace(/\/$/, '')}/rest/v1/news_articles?select=*&published=eq.true&order=date.desc`
      : 'data/actualites.json';
    const response = await fetch(url, {
      headers: hasSupabaseConfig
        ? {
            apikey: supabase.publishableKey,
          }
        : undefined,
    });

    if (!response.ok) {
      throw new Error(`Chargement des actualités impossible (${response.status}).`);
    }

    return response.json();
  };

  const renderFeaturedArticle = (article) => {
    const card = makeElement('article', 'news-card');
    card.append(createImage(article));

    const content = makeElement('div', 'news-card-content');
    content.append(
      makeElement('span', 'news-category', article.category),
      createDate(article),
      makeElement('h3', '', article.title),
      makeElement('p', '', article.summary)
    );

    const link = makeElement('a', 'text-link', "Lire l'article");
    link.href = `actualites.html#${article.slug}`;
    content.append(link);
    card.append(content);
    return card;
  };

  const renderFullArticle = (article) => {
    const story = makeElement('article', 'news-article');
    story.id = article.slug;
    story.append(createImage(article));

    const content = makeElement('div', 'news-article-content');
    content.append(
      makeElement('span', 'news-category', article.category),
      createDate(article, true),
      makeElement('h2', '', article.title)
    );

    article.paragraphs.forEach((paragraph) => {
      content.append(makeElement('p', '', paragraph));
    });

    story.append(content);
    return story;
  };

  loadArticles()
    .then((articles) => {
      if (!Array.isArray(articles) || !articles.every(isValidArticle)) {
        throw new Error('Les actualités reçues contiennent des données invalides.');
      }

      const published = articles
        .filter((article) => article.published === true)
        .sort((first, second) => second.date.localeCompare(first.date));

      if (featuredNews) {
        published.slice(0, 3).forEach((article) => {
          featuredNews.append(renderFeaturedArticle(article));
        });
      }

      if (newsList) {
        published.forEach((article) => {
          newsList.append(renderFullArticle(article));
        });
      }

      if (status) {
        status.hidden = true;
      }
    })
    .catch((error) => {
      if (status) {
        status.textContent = `${error.message} Merci de réessayer plus tard.`;
        status.classList.add('news-loading-error');
      }
      console.error(error);
    });
}

document.querySelectorAll('.contact-form').forEach((contactForm) => {
  const startedAt = contactForm.querySelector('[name="started_at"]');
  const formStatus = contactForm.querySelector('[data-form-status]');
  const supabase = window.AFRICA_SOUTIENS_SUPABASE;
  const hasSupabaseConfig = Boolean(supabase?.url && supabase?.publishableKey);
  const hasPartialSupabaseConfig = Boolean(supabase?.url || supabase?.publishableKey) && !hasSupabaseConfig;

  if (startedAt) {
    startedAt.value = String(Date.now());
  }

  if (formStatus) {
    if (hasSupabaseConfig) {
      formStatus.textContent = 'Votre message sera envoyé en ligne de manière sécurisée.';
    } else if (hasPartialSupabaseConfig) {
      formStatus.textContent = 'La configuration Supabase est incomplète. Le formulaire ne peut pas être envoyé.';
    } else {
      formStatus.textContent =
        "L'envoi en ligne n'est pas encore configuré. Le formulaire préparera un e-mail.";
    }
  }

  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    const fields = new FormData(contactForm);
    const status = contactForm.querySelector('[data-form-status]');
    const subject = `Contact depuis le site - ${fields.get('subject')}`;
    const body = [
      `Nom : ${fields.get('name')}`,
      `E-mail : ${fields.get('email')}`,
      '',
      fields.get('message'),
    ].join('\n');

    if (hasPartialSupabaseConfig) {
      if (status) status.textContent = 'La configuration Supabase est incomplète. Le message n’a pas été envoyé.';
      return;
    }

    if (!hasSupabaseConfig) {
      if (status) {
        status.textContent =
          "L'envoi en ligne n'est pas encore configuré. Votre messagerie va s'ouvrir pour préparer l'e-mail.";
      }

      window.location.href = `mailto:africasoutiens@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return;
    }

    const submitButton = contactForm.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    if (status) status.textContent = 'Envoi de votre message…';

    fetch(`${supabase.url.replace(/\/$/, '')}/functions/v1/submit-contact`, {
      method: 'POST',
      headers: {
        apikey: supabase.publishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fields.get('name'),
        email: fields.get('email'),
        subject: fields.get('subject'),
        message: fields.get('message'),
        startedAt: fields.get('started_at'),
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || `Envoi impossible (${response.status}).`);
        }

        contactForm.reset();
        if (startedAt) startedAt.value = String(Date.now());
        if (status) status.textContent = 'Merci, votre message a bien été envoyé.';
      })
      .catch((error) => {
        if (status) {
          status.textContent = `${error.message} Veuillez réessayer ou écrire à africasoutiens@gmail.com.`;
        }
        console.error(error);
      })
      .finally(() => {
        if (submitButton) submitButton.disabled = false;
      });
  });
});
