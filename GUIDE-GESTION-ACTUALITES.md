# Gérer les actualités du site

Le site est préparé pour être hébergé sur GitHub Pages et édité avec [Pages CMS](https://pagescms.org/). Les actualités et les photos sont conservées dans le dépôt GitHub ; chaque modification enregistrée dans Pages CMS crée un changement dans ce dépôt, puis GitHub Pages republie le site.

## Mise en service (à faire une seule fois)

1. Créer un dépôt GitHub pour le site et y publier tous les fichiers du projet, y compris le fichier caché `.pages.yml` et le dossier `data`.
2. Pour utiliser GitHub Pages gratuitement, choisir un dépôt public. Dans **Settings → Pages**, activer la publication depuis la branche principale et le dossier racine (`/(root)`).
3. Ouvrir [Pages CMS](https://pagescms.org/), se connecter avec GitHub et autoriser l’accès à ce dépôt. Chaque personne qui publiera doit avoir un accès en écriture au dépôt ; n’utilisez pas de jeton personnel partagé.
4. Dans Pages CMS, choisir le dépôt **Africa Soutiens → Actualités**. Vérifier que la rubrique liste les quatre actualités déjà présentes.

Le fichier `.pages.yml` configure la rubrique d’actualités et l’envoi des nouvelles photos vers `assets/news`. Pages CMS est une interface d’édition : le site public reste hébergé par GitHub Pages.

## Publier une actualité

1. Dans Pages CMS, ouvrir **Actualités** puis créer une entrée.
2. Renseigner le titre, un identifiant court en minuscules séparées par des tirets (par exemple `atelier-a-save`), le thème, la date, le lieu et le résumé.
3. Choisir une photo et saisir un texte alternatif qui décrit réellement l’image.
4. Ajouter un paragraphe par élément dans **Paragraphes de l’article**.
5. Activer **Publier cette actualité**, puis enregistrer les changements.

Une actualité non publiée est conservée dans le dépôt, mais n’apparaît pas sur le site. La page d’accueil affiche automatiquement les trois actualités publiées les plus récentes ; la page **Actualités** les affiche toutes, par date décroissante.

## Retirer ou corriger une actualité

Pour retirer temporairement un article sans le supprimer, désactiver **Publier cette actualité** et enregistrer. Pour corriger un contenu ou une photo, modifier l’entrée correspondante. Les changements publiés sont suivis dans l’historique du dépôt GitHub.

## À savoir avant la mise en ligne

- Le dépôt GitHub doit être relié à GitHub Pages avant que les modifications du CMS soient visibles sur le site.
- L’adresse gratuite de publication est généralement de la forme `https://organisation.github.io/nom-du-depot/`. Un domaine personnalisé s’achète séparément.
- Les personnes qui publient ont un droit d’écriture sur le dépôt : ne partagez pas un compte GitHub commun.
- Le formulaire de contact actuel prépare toujours un e-mail dans la messagerie du visiteur ; il ne stocke pas les messages dans GitHub.
