"""Génère les pages « Vidéo drone immobilier à … » (une par zone) à la racine du site.

    python3 tools/villes.py

Chaque page a son propre texte (biens typiques, ce que le drone apporte sur place, communes desservies),
les trois formules avec leurs prix, des questions fréquentes locales et les données structurées
(Service + fil d'Ariane + FAQ) pour Google et les assistants IA. Les prix et engagements viennent
de la page d'accueil : les modifier ici aussi s'ils changent.
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://www.skynord.fr"

PACKS = [
    ("Pack Mandat Exclusif", 350, "Le bien vu du ciel : extérieur, terrain et environnement réunis dans un film aérien qui situe la propriété et en donne l'échelle."),
    ("Pack Visite Complète", 400, "Toute la maison en un seul film : l'extérieur, puis chaque pièce en plans stabilisés."),
    ("Fly-through Intérieur", 490, "Un plan séquence en drone FPV qui traverse les pièces une à une : l'acheteur visite avant de se déplacer."),
]

ZONES = [
    {
        "slug": "lille", "name": "Lille", "title": "Lille et sa métropole", "where": "à Lille et dans la métropole", "at": "à Lille", "dept": "Nord (59)",
        "intro": "De la maison de maître du Vieux-Lille au pavillon avec jardin de Marcq-en-Barœul, la métropole lilloise concentre des biens très différents, souvent mis en vente au même moment. Un film par drone permet à votre annonce de sortir du lot dès la première seconde.",
        "local": "Vu du ciel, un bien de la métropole se situe immédiatement : la proximité du Grand Boulevard, d'un parc, d'une station de métro ou des écoles se voit au lieu de se lire. Pour les appartements anciens et les lofts de Roubaix ou de Tourcoing, la visite intérieure en plans stabilisés ou en fly-through FPV montre les volumes et la lumière mieux que vingt photos.",
        "towns": ["Lille", "Vieux-Lille", "Marcq-en-Barœul", "La Madeleine", "Lambersart", "Lomme", "Villeneuve-d'Ascq", "Roubaix", "Tourcoing", "Croix", "Wasquehal", "Mons-en-Barœul", "Bondues", "Mouvaux", "Armentières", "Seclin"],
        "faq": [("Pouvez-vous filmer un appartement en centre de Lille ?", "Oui. La visite intérieure se tourne dans le logement, en plans stabilisés ou en drone FPV ; pour les plans aériens en ville, chaque vol est préparé selon la réglementation de la DGAC.")],
    },
    {
        "slug": "cote-d-opale", "name": "la Côte d'Opale", "title": "Côte d'Opale", "where": "sur la Côte d'Opale", "at": "sur la Côte d'Opale", "dept": "Pas-de-Calais (62)",
        "intro": "Villas face à la mer, maisons de pêcheur, résidences secondaires entre dunes et forêt : sur la Côte d'Opale, c'est souvent le cadre qui fait vendre ou louer. Un film par drone le montre comme aucune photo ne peut le faire.",
        "local": "La vue mer, la plage à deux minutes, la forêt du Touquet ou les falaises entre Wissant et Wimereux : vu du ciel, l'environnement devient l'argument principal de l'annonce. C'est aussi un atout décisif pour les locations saisonnières et les gîtes, qui se réservent sur la vidéo.",
        "towns": ["Calais", "Boulogne-sur-Mer", "Wimereux", "Wissant", "Audresselles", "Ambleteuse", "Hardelot", "Neufchâtel-Hardelot", "Le Portel", "Étaples", "Le Touquet-Paris-Plage", "Cucq", "Stella-Plage", "Merlimont", "Berck", "Montreuil-sur-Mer"],
        "faq": [("Filmez-vous les locations saisonnières et les gîtes ?", "Oui : le Pack Visite Complète montre le logement pièce par pièce, et les plans aériens mettent en valeur la mer, les dunes ou la campagne autour. Le film est livré monté en 48 h, prêt pour votre annonce.")],
    },
    {
        "slug": "dunkerque", "name": "Dunkerque", "title": "Dunkerque et le littoral flamand", "where": "à Dunkerque et sur le littoral flamand", "at": "à Dunkerque", "dept": "Nord (59)",
        "intro": "Front de mer de Malo-les-Bains, maisons flamandes, longères des Moëres : le Dunkerquois mêle biens de bord de mer et maisons de campagne. Le drone montre ce qui fait la valeur d'un bien ici : la mer, l'espace et le terrain.",
        "local": "Un appartement avec vue sur la digue ou une maison à quelques rues de la plage se vend sur son emplacement : le film aérien le rend évident. Pour les maisons de l'intérieur des terres, il montre l'étendue du terrain et le calme des environs.",
        "towns": ["Dunkerque", "Malo-les-Bains", "Rosendaël", "Coudekerque-Branche", "Téteghem", "Leffrinckoucke", "Bray-Dunes", "Gravelines", "Grande-Synthe", "Bergues", "Hondschoote", "Wormhout", "Bourbourg", "Hazebrouck"],
        "faq": [("Intervenez-vous jusqu'à Hazebrouck et dans la Flandre intérieure ?", "Oui, dans tout le Nord : Dunkerque, Gravelines, Bergues, Wormhout, Hazebrouck et toutes les communes alentour.")],
    },
    {
        "slug": "arras", "name": "Arras", "title": "Arras et l'Artois", "where": "à Arras et dans l'Artois", "at": "à Arras", "dept": "Pas-de-Calais (62)",
        "intro": "Maisons de ville près des places baroques, corps de ferme et longères de l'Artois, pavillons récents en périphérie : autour d'Arras, chaque bien a son histoire. Le film par drone la raconte en une minute.",
        "local": "Pour une ferme rénovée ou une propriété avec dépendances, le drone montre d'un seul plan la cour, les bâtiments et les terres. En centre-ville, il situe la maison par rapport aux places et aux commerces, puis la visite continue à l'intérieur.",
        "towns": ["Arras", "Saint-Laurent-Blangy", "Achicourt", "Dainville", "Sainte-Catherine", "Saint-Nicolas", "Beaurains", "Tilloy-lès-Mofflaines", "Bapaume", "Saint-Pol-sur-Ternoise", "Avesnes-le-Comte", "Vitry-en-Artois"],
        "faq": [("Le drone convient-il pour une ferme ou une propriété à la campagne ?", "C'est même là qu'il est le plus utile : un seul plan aérien montre les bâtiments, la cour, le jardin et le terrain, que les photos ne peuvent pas réunir.")],
    },
    {
        "slug": "valenciennes", "name": "Valenciennes", "title": "Valenciennes, Hainaut et Cambrésis", "where": "à Valenciennes, dans le Hainaut et le Cambrésis", "at": "à Valenciennes", "dept": "Nord (59)",
        "intro": "Maisons de ville du Valenciennois, propriétés en lisière de la forêt de Raismes–Saint-Amand, maisons bourgeoises du Cambrésis : le sud-est du Nord offre des biens de caractère qui méritent mieux qu'une série de photos.",
        "local": "Le film aérien montre l'environnement vert, le jardin et le voisinage ; la visite intérieure fait ressortir les volumes des maisons anciennes. Pour l'acheteur venu de la métropole lilloise, c'est souvent la vidéo qui décide de la visite.",
        "towns": ["Valenciennes", "Saint-Saulve", "Marly", "Anzin", "Raismes", "Saint-Amand-les-Eaux", "Denain", "Condé-sur-l'Escaut", "Le Quesnoy", "Cambrai", "Caudry", "Maubeuge", "Avesnes-sur-Helpe"],
        "faq": [("Allez-vous jusqu'à Cambrai et Maubeuge ?", "Oui : Valenciennes, Cambrai, Maubeuge, l'Avesnois et toutes les communes du Nord.")],
    },
    {
        "slug": "lens-bethune", "name": "Lens et Béthune", "title": "Lens, Béthune et Bassin minier", "where": "à Lens, Béthune et dans le Bassin minier", "at": "à Lens et Béthune", "dept": "Pas-de-Calais (62)",
        "intro": "Maisons de cités minières rénovées, pavillons avec jardin, programmes neufs : autour de Lens et de Béthune, le marché bouge vite et les annonces se ressemblent. Un film par drone donne à la vôtre une longueur d'avance.",
        "local": "Le plan aérien met en valeur le jardin, l'extension ou le terrain, et situe le bien près du Louvre-Lens, des écoles ou des axes routiers. Pour un programme neuf, il montre l'ensemble des logements et leur environnement d'un seul regard.",
        "towns": ["Lens", "Liévin", "Loos-en-Gohelle", "Avion", "Méricourt", "Hénin-Beaumont", "Carvin", "Noyelles-Godault", "Béthune", "Beuvry", "Bruay-la-Buissière", "Nœux-les-Mines", "Lillers", "Douai"],
        "faq": [("Filmez-vous aussi les programmes neufs et les lotissements ?", "Oui : le film aérien montre l'ensemble du programme, son implantation et ses abords, et peut être complété par la visite d'un logement témoin.")],
    },
]

COMMON_FAQ = [
    ("Combien coûte une vidéo drone immobilier {at} ?", "Le Pack Mandat Exclusif est à partir de 350 €, le Pack Visite Complète à partir de 400 € et le Fly-through Intérieur à partir de 490 €. TVA non applicable. Le devis est gratuit et dépend de la surface et des options."),
    ("En combien de temps la vidéo est-elle livrée ?", "Le film est livré monté en 48 h après le tournage."),
]

PAGE = """<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Vidéo drone immobilier {where} · Skynord</title>
  <meta name="description" content="{description}">
  <link rel="canonical" href="{url}">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="theme-color" content="#EDF0F2">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Vidéo drone immobilier {where} · Skynord">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{site}/assets/og.jpg">
  <meta property="og:locale" content="fr_FR">
  <link rel="stylesheet" href="/css/style.css">
  <style>
    .city {{ max-width: 980px; margin: 0 auto; padding: 0 var(--gutter); }}
    .city__top {{ display: flex; justify-content: space-between; align-items: center; padding: 22px 0; }}
    .city__logo {{ display: flex; align-items: center; gap: 10px; font-weight: 800; font-stretch: 125%; letter-spacing: .18em; font-size: 13px; }}
    .city__logo img {{ width: 36px; height: 28px; object-fit: contain; filter: invert(1) brightness(.35); }}
    .city__btn {{ background: var(--night); color: var(--on); padding: 12px 20px; border-radius: 999px; font-weight: 600; font-size: 15px; white-space: nowrap; }}
    @media (max-width: 520px) {{ .city__top .city__btn {{ padding: 10px 14px; font-size: 14px; }} .city__logo span {{ display: none; }} }}
    .city__crumb {{ font-size: 13px; color: var(--mute); margin-top: clamp(32px, 6vw, 72px); }}
    .city h1 {{ font-size: clamp(38px, 6vw, 76px); line-height: .95; margin: 14px 0 28px; }}
    .city h2 {{ font-size: clamp(26px, 3.4vw, 40px); line-height: 1; margin: clamp(56px, 8vw, 96px) 0 22px; }}
    .city p {{ max-width: 68ch; margin-bottom: 16px; font-size: 18px; }}
    .city__lead {{ font-size: clamp(19px, 2vw, 23px) !important; }}
    .city__packs {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }}
    .city__pack {{ background: var(--paper); border: 1px solid var(--line); border-radius: 18px; padding: 24px; }}
    .city__pack h3 {{ font-size: 21px; margin-bottom: 10px; }}
    .city__pack p {{ font-size: 15.5px; color: var(--mute); }}
    .city__price {{ color: var(--ink) !important; margin: 14px 0 0 !important; }}
    .city__price b {{ font-size: 24px; }}
    .city__towns {{ display: flex; flex-wrap: wrap; gap: 8px; padding: 0; list-style: none; }}
    .city__towns li {{ border: 1px solid var(--line); border-radius: 999px; padding: 6px 14px; font-size: 14.5px; }}
    .city__band {{ display: flex; flex-wrap: wrap; gap: 10px 28px; margin: 28px 0 0; padding: 0; list-style: none; font-size: 14.5px; color: var(--mute); }}
    .city__cta {{ margin: clamp(56px, 8vw, 96px) 0; background: var(--night); color: var(--on); border-radius: 24px; padding: clamp(28px, 5vw, 56px); }}
    .city__cta h2 {{ margin-top: 0; }}
    .city__cta p {{ color: var(--on-mute); }}
    .city__cta .city__btn {{ background: var(--accent); color: var(--ink); display: inline-block; margin-top: 10px; }}
    .city__other {{ font-size: 15px; color: var(--mute); }}
    .city__other a {{ color: var(--accent-ink); }}
  </style>
  <script type="application/ld+json">
{ld}
  </script>
</head>
<body>
  <div class="city">
    <header class="city__top">
      <a class="city__logo" href="/" aria-label="Skynord, accueil"><img src="/assets/logo-mark.png" alt="" width="36" height="28"><span>SKYNORD</span></a>
      <a class="city__btn" href="/#contact">Demander un devis</a>
    </header>
    <main>
      <p class="city__crumb"><a class="ul" href="/">Skynord</a> · Vidéo drone immobilier · {crumb}</p>
      <h1 class="display">Vidéo drone immobilier {where}</h1>
      <p class="city__lead">{intro}</p>
      <p>Skynord (Sky Nord) réalise des films immobiliers par drone dans tout le {dept} et la région : vues aériennes, visite complète intérieur et extérieur, fly-through FPV. Pilote professionnel (n° FRA-RP-000000159723), vols conformes à la réglementation de la DGAC, film livré monté en 48 h.</p>

      <h2 class="display">Ce que le drone apporte {at}</h2>
      <p>{local}</p>

      <h2 class="display">Trois formules</h2>
      <div class="city__packs">
{packs}
      </div>
      <ul class="city__band"><li>Livraison en 48 h</li><li>Vols conformes à la réglementation DGAC</li><li>Devis gratuit selon la surface et les options</li></ul>

      <h2 class="display">Communes desservies</h2>
      <ul class="city__towns">
{towns}
      </ul>
      <p class="city__other" style="margin-top:18px">Et toutes les communes du Nord et du Pas-de-Calais. Autres zones : {others}.</p>

      <h2 class="display">Questions fréquentes</h2>
      <div class="faq__list">
{faq}
      </div>

      <section class="city__cta">
        <h2 class="display">Un bien à filmer {at} ?</h2>
        <p>Cinq questions, moins d'une minute : je reviens vers vous avec une proposition adaptée à votre bien. Vous pouvez aussi appeler le <a class="ul" href="tel:+33650539932">06 50 53 99 32</a>.</p>
        <a class="city__btn" href="/#contact">Demander un devis</a>
      </section>
    </main>
    <footer class="foot" style="padding-left:0;padding-right:0">
      <span>© 2026 Skynord <span class="muted">(Sky Nord)</span></span>
      <span class="foot__social"><a class="ul" href="https://www.instagram.com/skynord.immo/" target="_blank" rel="noopener">Instagram</a> · <a class="ul" href="https://www.tiktok.com/@sky.nord" target="_blank" rel="noopener">TikTok</a></span>
      <span><a class="ul" href="/mentions-legales">Mentions légales &amp; confidentialité</a> · <a class="ul" href="/cgv">CGV</a></span>
    </footer>
  </div>
</body>
</html>
"""


def esc(s):
    return html.escape(s, quote=True)


def build(z):
    url = f"{SITE}/drone-immobilier-{z['slug']}"
    faq = [(q.format(at=z["at"]), a) for q, a in COMMON_FAQ] + z["faq"]
    description = f"Vidéo drone immobilier {z['where']} : film aérien, visite complète et fly-through FPV pour agences, particuliers et locations saisonnières. Dès 350 €, livré en 48 h. Skynord, pilote professionnel."
    ld = [
        {"@context": "https://schema.org", "@type": "Service", "serviceType": "Vidéo drone immobilier",
         "name": f"Vidéo drone immobilier {z['where']}", "url": url,
         "provider": {"@id": f"{SITE}/#entreprise", "@type": "ProfessionalService", "name": "Skynord", "alternateName": ["Sky Nord", "SkyNord"], "url": f"{SITE}/", "telephone": "+33650539932"},
         "areaServed": [{"@type": "City", "name": t} for t in z["towns"]],
         "offers": [{"@type": "Offer", "name": n, "priceSpecification": {"@type": "PriceSpecification", "minPrice": p, "priceCurrency": "EUR"}} for n, p, _ in PACKS]},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Skynord", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": f"Vidéo drone immobilier {z['where']}", "item": url}]},
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
    ]
    others = " · ".join(f'<a class="ul" href="/drone-immobilier-{o["slug"]}">{esc(o["title"])}</a>' for o in ZONES if o is not z)
    return PAGE.format(
        site=SITE, url=url, description=esc(description), dept=esc(z["dept"]),
        where=esc(z["where"]), at=esc(z["at"]), crumb=esc(z["title"]),
        intro=esc(z["intro"]), local=esc(z["local"]), others=others,
        packs="\n".join(f'        <div class="city__pack"><h3>{esc(n)}</h3><p>{esc(d)}</p><p class="city__price">À partir de <b>{p} €</b> · TVA non applicable</p></div>' for n, p, d in PACKS),
        towns="\n".join(f"        <li>{esc(t)}</li>" for t in z["towns"]),
        faq="\n".join(f'        <details class="faq__item"><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in faq),
        ld="  " + json.dumps(ld, ensure_ascii=False, indent=2).replace("\n", "\n  "),
    )


if __name__ == "__main__":
    for z in ZONES:
        out = ROOT / f"drone-immobilier-{z['slug']}.html"
        out.write_text(build(z), encoding="utf-8")
        print("écrit", out.name)
