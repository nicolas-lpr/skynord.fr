# Site Skynord

Site statique : `index.html`, `css/`, `js/`, `assets/`. À déposer tel quel sur l'hébergement de skynord.fr.

## Lancer en local

```bash
python3 -m http.server 8765
```

Puis ouvrir http://localhost:8765 (un serveur est nécessaire : les modules JS ne marchent pas en `file://`).

## Le vol

- **Sans vidéo** (`assets/flight/manifest.json` contient `"frames": 0`) : le vol se fait dans une villa 3D temps réel (maquette).
- **Avec tes vidéos** : dépose les 5 plans dans `assets/clips/` (`01-approche.mp4` … `05-remontee.mp4`), puis :

```bash
python3 tools/prepare_videos.py flight
```

Le script assemble les plans avec des fondus, étalonne légèrement, puis génère :
- `assets/flight/landscape/` : images 1920 px (WebP qualité 82, 15 img/s) pour ordinateur ;
- `assets/flight/portrait/` : images 9:16 recadrées depuis la source pleine définition pour téléphone ;
- `manifest.json` : nombre d'images et début de chaque plan (les textes se calent dessus).

Options utiles : `--width 2560` (écrans 5K), `--quality 88`, `--fps 20`, `--xfade 0.8`.
Fournis des sources **4K** si possible : la version téléphone est recadrée dedans, donc plus la source est grande, plus elle est nette.

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
