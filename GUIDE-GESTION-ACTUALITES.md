# Gérer les actualités du site

Le site utilise le projet Supabase Africa Soutiens pour afficher les actualités publiées et enregistrer les messages de contact. Le fichier `data/actualites.json` reste disponible comme solution de repli si la configuration Supabase est retirée.

## Connecter Supabase (à faire une seule fois)

Le projet `pidcbnwaifewdvigouzb` est déjà configuré : le schéma SQL et les quatre actualités initiales sont importés, et la fonction `submit-contact` est déployée. Le fichier `supabase-config.js` contient l’URL du projet et sa clé **publishable** publique. Cette clé peut être utilisée dans le navigateur avec les règles RLS ; ne jamais y mettre de clé `sb_secret_...` ou `service_role`.

La fonction de contact est accessible sans connexion visiteur, mais n'accepte que les origines indiquées dans **Edge Functions → Secrets → ALLOWED_ORIGINS**. Les origines `http://localhost:8000` et `https://africa-soutiens.github.io` sont autorisées. Si le domaine public change, mettre à jour cette liste avec l’origine exacte. Les clés serveur sont fournies au runtime Supabase et ne doivent pas être copiées dans le site.

## Publier une actualité dans Supabase

1. Dans **Table Editor → news_articles**, créer une ligne et remplir les champs. `slug` doit être unique, en minuscules et séparé par des tirets.
2. Pour une nouvelle photo, l’envoyer dans **Storage → news-images**, puis copier son URL publique dans `image`. Les quatre articles importés utilisent déjà les images livrées avec le site.
3. Renseigner `paragraphs` sous forme de tableau JSON, par exemple `["Premier paragraphe.", "Deuxième paragraphe."]`.
4. Mettre `published` à `true` pour publier. Les visiteurs ne peuvent lire que les articles publiés ; les modifications se font depuis le tableau de bord Supabase.

La page d’accueil affiche les trois articles publiés les plus récents. La page **Actualités** les affiche tous, par date décroissante.

## Messages de contact

Les formulaires envoient les messages à la fonction `submit-contact`. Elle valide les champs, applique une limite d’envoi par adresse IP hachée et enregistre les messages dans `contact_messages`. Seule la fonction utilise la clé `service_role` ; aucune lecture publique des messages n’est autorisée. Consultez et supprimez les messages depuis le tableau de bord Supabase.

Si `supabase-config.js` est vide, les actualités restent chargées depuis `data/actualites.json` et le formulaire prépare un e-mail comme avant.

## Ancien flux Pages CMS

`.pages.yml` est conservé pour référence, mais Pages CMS n’alimente pas la base Supabase. Une fois Supabase configuré, publier les nouvelles actualités depuis le tableau de bord Supabase.
