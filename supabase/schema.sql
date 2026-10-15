create extension if not exists pgcrypto;

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  published boolean not null default false,
  title text not null check (char_length(title) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (char_length(category) between 1 and 120),
  date date not null,
  date_label text,
  location text,
  image text not null,
  image_alt text not null,
  summary text not null check (char_length(summary) between 1 and 500),
  paragraphs jsonb not null check (jsonb_typeof(paragraphs) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_articles_published_date_idx
  on public.news_articles (published, date desc);

create or replace function public.set_news_article_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists news_articles_updated_at on public.news_articles;
create trigger news_articles_updated_at
  before update on public.news_articles
  for each row execute function public.set_news_article_updated_at();

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (
    char_length(email) <= 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  subject text not null check (char_length(subject) between 3 and 180),
  message text not null check (char_length(message) between 10 and 5000),
  source_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.news_articles enable row level security;
alter table public.contact_messages enable row level security;

grant select on public.news_articles to anon, authenticated;
grant insert, update, delete on public.news_articles to authenticated;
grant all on public.contact_messages to service_role;
grant select, delete on public.contact_messages to authenticated;

drop policy if exists "Public can read published news" on public.news_articles;
create policy "Public can read published news"
  on public.news_articles for select
  to anon, authenticated
  using (published or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can insert news" on public.news_articles;
create policy "Admins can insert news"
  on public.news_articles for insert
  to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can update news" on public.news_articles;
create policy "Admins can update news"
  on public.news_articles for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete news" on public.news_articles;
create policy "Admins can delete news"
  on public.news_articles for delete
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can read contact messages" on public.contact_messages;
create policy "Admins can read contact messages"
  on public.contact_messages for select
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins can delete contact messages" on public.contact_messages;
create policy "Admins can delete contact messages"
  on public.contact_messages for delete
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public can read news images" on storage.objects;
create policy "Public can read news images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'news-images');

drop policy if exists "Admins can upload news images" on storage.objects;
create policy "Admins can upload news images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'news-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Admins can update news images" on storage.objects;
create policy "Admins can update news images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'news-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    bucket_id = 'news-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

drop policy if exists "Admins can delete news images" on storage.objects;
create policy "Admins can delete news images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'news-images'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

insert into public.news_articles (
  published, title, slug, category, date, date_label, location, image, image_alt, summary, paragraphs
)
values
  (
    true,
    'Former des ambassadeurs digitaux pour l''environnement',
    'inclusion-numerique',
    'Inclusion numérique & environnement',
    '2026-07-18',
    '18 juillet 2026',
    'Togoudo ASSROSSA',
    'assets/news/inclusion-numerique.png',
    'Séance de formation avec des participantes autour d''un ordinateur portable',
    'À Togoudo ASSROSSA, un atelier a associé compétences numériques, création de contenus et protection de l''environnement.',
    '[
      "Le 18 juillet 2026, Africa Soutiens a organisé à son siège de Togoudo ASSROSSA un atelier consacré à l''inclusion numérique et aux compétences digitales au service de la protection de l''environnement. Trois modules ont abordé la création de contenus numériques et les réseaux sociaux, l''inclusion numérique, puis les enjeux de protection de l''environnement.",
      "Les participants ont créé des contenus de sensibilisation, notamment à l''aide de Canva et CapCut, présenté des idées de projets verts et constitué un réseau d''ambassadeurs digitaux pour prolonger cette dynamique."
    ]'::jsonb
  ),
  (
    true,
    '22 jeunes leaders formés à la sauvegarde des enfants',
    'jeunes-leaders-lalo',
    'Jeunesse & protection de l''enfant',
    '2025-07-17',
    '17 juillet 2025',
    'Mairie de Lalo',
    'assets/news/jeunes-leaders-lalo.png',
    'Jeunes leaders réunis à Lalo derrière la banderole du projet de sauvegarde des enfants',
    'Une formation a porté sur la sauvegarde des enfants et les risques liés aux changements climatiques.',
    '[
      "Vingt-deux jeunes leaders issus des onze arrondissements de Lalo ont participé à un atelier organisé par Africa Soutiens à la mairie de Lalo. La formation portait sur les liens entre changement climatique et protection de l''enfant.",
      "Les échanges ont permis d''identifier les risques accrus pour les enfants en contexte climatique et de travailler sur des stratégies de protection ainsi que des plans communautaires adaptés."
    ]'::jsonb
  ),
  (
    true,
    'Lancement d''un projet d''autonomisation des femmes rurales',
    'projet-femmes-ze',
    'Femmes & agriculture durable',
    '2024-12-26',
    '26 décembre 2024',
    'Commune de Zè',
    'assets/news/projet-femmes-ze.png',
    'Participants au lancement du Youth Challenge Fund Phase 2 à Zè',
    'Africa Soutiens, Climate Women et Plan International lancent une initiative d''agriculture résiliente au climat avec les femmes rurales.',
    '[
      "Climate Women et Africa Soutiens, en partenariat avec Plan International, ont lancé le 26 décembre 2024 la deuxième phase d''un projet destiné aux femmes rurales de Zè. L''initiative vise à soutenir des activités agricoles durables, résilientes au climat et génératrices de revenus.",
      "Le rapport présente cette phase comme un projet lancé et axé sur le renforcement des compétences et l''accompagnement des femmes. Il ne donne pas ici de résultat chiffré à attribuer à cette phase."
    ]'::jsonb
  ),
  (
    true,
    'Sensibiliser les élèves aux bonnes pratiques d''hygiène',
    'hygiene-scolaire-save',
    'Hygiène scolaire & santé',
    '2023-10-16',
    '16 et 31 octobre 2023',
    'Commune de Savè',
    'assets/news/hygiene-scolaire-save.png',
    'Enfants et adultes participent à une activité collective de nettoyage',
    'Plus de 40 élèves de trois écoles de Savè ont été sensibilisés aux bonnes pratiques d''hygiène.',
    '[
      "Africa Soutiens a mené des séances d''éducation à l''hygiène dans trois écoles de la commune de Savè : EPP Trésor Caché de Gobé, EPP Gbé et EPP Oké-Owo. Le rapport indique que plus de 40 élèves, filles et garçons âgés de 5 à 11 ans, ont été sensibilisés.",
      "Les séances ont abordé l''hygiène personnelle, la propreté des espaces scolaires et la gestion des déchets. Une équipe de veille composée de représentants des classes a également été constituée pour contribuer au maintien de la propreté."
    ]'::jsonb
  )
on conflict (slug) do nothing;
