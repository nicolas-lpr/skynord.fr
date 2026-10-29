# Skynord — site vitrine (skynord.fr)

Site statique (HTML/CSS/JS, sans build) de **Skynord**, vidéo drone immobilier dans le Nord (59) et le Pas-de-Calais (62). Propriétaire : **Nicolas Laporterie**, micro-entrepreneur (EI). Échanges en français, tutoiement.

## Mise en ligne
- Dépôt GitHub : `https://github.com/nicolas-lpr/skynord.fr` (branche `main`). Vercel redéploie à chaque push, en ~20 s, sur **https://www.skynord.fr** (`skynord.fr` redirige vers `www`).
- Pousser : `git push` (le jeton GitHub est dans le trousseau macOS). Commits signés « Nicolas Laporterie <nicolaslaporterie@gmail.com> ».
- **À chaque modif de CSS/JS : incrémenter `?v=N` sur `css/style.css` (index.html, mentions-legales.html, cgv.html) et `js/main.js` (index.html)**. Versions actuelles : style.css `v=22`, main.js `v=23`.
- Après une mise à jour importante, prévenir Bing via IndexNow (clé `934a8bfbb23b768a7fac3133c8795abd`, fichier à la racine) :
  `curl -X POST https://api.indexnow.org/indexnow -H "Content-Type: application/json" -d '{"host":"www.skynord.fr","key":"934a8bfbb23b768a7fac3133c8795abd","keyLocation":"https://www.skynord.fr/934a8bfbb23b768a7fac3133c8795abd.txt","urlList":["https://www.skynord.fr/"]}'`
- Test local : `python3 -m http.server 8766` dans ce dossier.
- `sources/` (vidéos 4K) et `tools/.cache/` sont ignorés par git ; `.vercelignore` exclut aussi `tools/`, `.claude/`, README, CREDITS, CLAUDE.md.

## Structure
- `index.html` : une page. Ordre : chargement (logo animé) → **slider vidéo plein écran** (4 slides : approche, entrée, séjour, terrasse) → **Prestations** (« Trois façons de faire visiter », section champagne qui recouvre le slider au scroll, effet rideau) → encart « format 9:16 inclus » → engagements → zones 59/62 → **Contact** (questionnaire 5 étapes, bleu nuit) → **FAQ** (7 questions, pour le référencement : tout en bas, à la demande de Nicolas) → pied de page.
- `js/main.js` : slider (glisser doigt/souris/trackpad, flèches, clavier, rail cliquable, défilement auto 7 s, visite guidée « Explorer la villa » 3 s/slide), textes par slide, effet rideau GSAP, révélations, lecteur plein écran, exemples des packs.
- `js/flight-clips.js` : moteur des slides (vidéos `assets/visite/*.mp4`, version mobile `-m`, images fixes `.webp`, volet horizontal minuté, préchargement).
- `js/form.js` : questionnaire → envoi en arrière-plan via **FormSubmit** (`formsubmit.co/ajax/skynord.immo@gmail.com`, déjà activé). Validation stricte email/téléphone. Pas d'accusé de réception promis (non fiable).
- `css/style.css` : police **Archivo** hébergée (`assets/fonts/`), une seule famille.
- `mentions-legales.html`, `cgv.html`, pages par ville `drone-immobilier-*.html` (générées par `tools/villes.py`), `robots.txt`, `sitemap.xml`, `llms.txt`, `site.webmanifest`, icônes au logo Skynord.
- `tools/prepare_videos.py` : encodage vidéo (ffmpeg via `pip install imageio-ffmpeg`).

## Charte
Fond « ciel du Nord » `#EDF0F2`, encre `#0E1218`, bleu nuit `#111A24` (boutons, Contact), champagne `#C9A96E` (accents) / `#7A5C30` (texte accent), section Prestations `#F1ECE4`. Titres en minuscules, Archivo 700. Règles suivies (skill impeccable installé dans `.claude/skills/`) : pas de sur-titres au-dessus des titres, pas de numéros de section, pas d'effets lourds.

## Contenu validé
- Titre : « Vendez plus vite grâce au drone ». Titre de page : « Skynord · Films immobiliers par drone ».
- Packs et prix affichés (« À partir de », TVA non applicable) : **Pack Visite Complète** (recommandé, iPhone 4K sur stabilisateur DJI Osmo Mobile 8) dès **400 €** ; **Pack Mandat Exclusif** (aérien, DJI Mini 5 Pro) dès **350 €** ; **Fly-through Intérieur** (FPV, DJI Avata 2) dès **490 €**. Grille détaillée **non publiée** : PDF interne `../Skynord - Grille de tarifs.pdf`.
- Format au choix du client : horizontal ou vertical 9:16 (vertical quand c'est possible ; pas toujours en extérieur). Ne plus écrire « 9:16 inclus dans chaque pack ».
- Engagements : DGAC, « Pilote professionnel · n° FRA-RP-000000159723 », livraison 48 h, devis.
- Statistiques sourcées uniquement (Digital Camera World, fév. 2024) : 68 % plus vite, +403 % de demandes. Ne rien inventer (chiffres, avis, certifications).
- Exemples des packs : vidéo de Nicolas (villa avec piscine) + vidéos libres de droits Pexels (David Pickup, Kindel Media) sans légende visible ; crédits dans `CREDITS.md`. Slider : villa Pexels (Alef Morais).
- Réseaux : Instagram `@skynord.immo`, TikTok `@sky.nord`. Contact : Skynord.immo@gmail.com · 06 50 53 99 32.
- Mentions légales : EI micro-entreprise, SIREN 131 167 983, SIRET 131 167 983 00017, siège 85 chemin de la Chapelle 83830 Callas (uniquement dans les mentions légales : ne pas afficher la localisation ailleurs), TVA non applicable art. 293 B, hébergeur Vercel, conservation 3 ans, section Réclamations (**pas de médiateur de la consommation tant qu'il n'a pas adhéré** — ne pas en citer un fictif).

## Retiré à la demande (ne pas remettre)
Drone 3D, viseur HUD (REC, altitude…), curseur personnalisé, défilement adouci (Lenis), flous d'arrière-plan, section Réalisations, pack Reel, slide « vue sur la mer », mention de Dunkerque/Lille comme lieu d'implantation, grille de tarifs publique.

## Préférences de Nicolas
Veut un rendu premium et fluide, surtout sur iPhone et PC modeste ; teste sur iPhone 17 Pro Max. Préfère des réponses concrètes, vérifiées en ligne après chaque push.

## À faire / pistes
- Search Console (vérification domaine), Google Business Profile + avis, Bing Webmaster Tools.
- Pages par ville et FAQ (si Nicolas valide l'ajout de contenu visible).
- Adhésion à un médiateur de la consommation, puis l'ajouter aux mentions légales.
