const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.main-nav');
const year = document.getElementById('year');

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

  fetch('data/actualites.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Chargement des actualités impossible (${response.status}).`);
      }
      return response.json();
    })
    .then((articles) => {
      if (!Array.isArray(articles) || !articles.every(isValidArticle)) {
        throw new Error('Le fichier des actualités contient des données invalides.');
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
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    const fields = new FormData(contactForm);
    const subject = `Contact depuis le site - ${fields.get('subject')}`;
    const body = [
      `Nom : ${fields.get('name')}`,
      `E-mail : ${fields.get('email')}`,
      '',
      fields.get('message'),
    ].join('\n');
    const status = contactForm.querySelector('[data-form-status]');

    if (status) {
      status.textContent =
        "Votre messagerie va s'ouvrir avec le message préparé. Si elle ne s'ouvre pas, écrivez à africasoutiens@gmail.com.";
    }

    window.location.href = `mailto:africasoutiens@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
});
