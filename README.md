# Site Skynord

Site statique : `index.html`, `css/`, `js/`, `assets/`. À déposer tel quel sur l'hébergement de skynord.fr.

## Lancer en local

```bash
python3 -m http.server 8765
```

Puis ouvrir http://localhost:8765 (un serveur est nécessaire : les modules JS ne marchent pas en `file://`).

## La visite (haut de page)

Quatre courts plans en boucle dans `assets/visite/` (approche, entrée, intérieur, piscine), une version ordinateur (`.mp4`) et une version téléphone recadrée en 9:16 (`-m.mp4`), chacune avec son image fixe (`.webp`). Au scroll, les plans s'enchaînent en fondu ; seuls le plan affiché et le suivant se chargent.

Pour remplacer un plan par une de tes vidéos : encode-la en 1920 px de large (et une version 1080×1920 pour le téléphone) sous le même nom.

## Exemples des packs

Les vidéos d'exemple sont dans `assets/examples/` (sources 4K dans `sources/examples/`, à ne pas mettre en ligne).
Le pack Visite Complète utilise ta vidéo « Villa avec piscine » : `visite-extrait.mp4` (boucle muette de 12 s) et `visite.mp4` (film complet, ouvert au clic).

## Questionnaire de contact

5 étapes (profil, type de bien, formule, lieu et délai, coordonnées). À l'envoi :
- un email rédigé (résumé de la demande + chaque réponse) arrive sur **skynord.immo@gmail.com**, avec « Répondre » qui renvoie directement au client ;
- le client reçoit un accusé de réception automatique.

L'envoi passe par FormSubmit (gratuit, sans compte). **Au tout premier envoi, FormSubmit envoie un email d'activation à skynord.immo@gmail.com : clique sur le lien une fois**, sinon les demandes suivantes ne t'arriveront pas.
Si l'envoi échoue, la messagerie du client s'ouvre avec la demande déjà rédigée. Code : `js/form.js`.

## Reste à fournir

- SIRET, adresse, hébergeur (mentions légales) ;
- confirmation DGAC / assurance RC Pro avant de l'afficher ;
- tarifs si tu veux les montrer ;
- chiffres sourcés supplémentaires ;
- logo officiel (`assets/logo.svg` est une version redessinée provisoire) et image de partage `assets/og.jpg` (1200×630).
