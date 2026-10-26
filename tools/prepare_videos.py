#!/usr/bin/env python3
"""Prépare les vidéos du site Skynord en qualité maximale pour le web.

  python3 tools/prepare_videos.py flight
      Assemble assets/clips/01-*.mp4 … 05-*.mp4 (fondus entre plans), puis génère
      la séquence d'images du vol : paysage (ordinateur) + portrait 9:16 (téléphone).

  python3 tools/prepare_videos.py realisation chemin/video.mp4 --title "Villa, Malo" --place "Dunkerque" --type "Fly-through"
      Encode une réalisation, verticale ou horizontale (4K AV1 + 4K HEVC si la source le permet, 1080p H.264 pour tous),
      une affiche et un aperçu muet, et l'ajoute à assets/realisations/realisations.json.

  python3 tools/prepare_videos.py reel chemin/video.mp4
      Recadre une vidéo en 9:16 pour le téléphone de la section Prestations.

ffmpeg : celui du système s'il existe, sinon `pip install imageio-ffmpeg`.
"""
import argparse, json, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'


def ffmpeg_bin():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit("ffmpeg introuvable. Installez-le (brew install ffmpeg) ou : pip install imageio-ffmpeg")


FF = ffmpeg_bin()


def run(args):
    subprocess.run([FF, '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)], check=True)


def probe(path):
    """Durée (s), largeur, hauteur, présence d'audio, préfixe de conversion HDR → SDR (sans ffprobe)."""
    err = subprocess.run([FF, '-hide_banner', '-i', str(path)], capture_output=True, text=True).stderr
    h, m, s = re.search(r'Duration: (\d+):(\d+):([\d.]+)', err).groups()
    w, hh = map(int, re.search(r'Video:.*?(\d{3,5})x(\d{3,5})', err).groups())
    rot = re.search(r'rotation of (-?\d+)', err) or re.search(r'rotate\s*:\s*(-?\d+)', err)
    if rot and abs(int(rot.group(1))) in (90, 270):
        w, hh = hh, w
    return int(h) * 3600 + int(m) * 60 + float(s), w, hh, 'Audio:' in err, hdr_filter(err)


def hdr_filter(err):
    """Les iPhone/DJI filment souvent en HDR (HLG ou PQ) : sans conversion, les couleurs
    paraissent ternes et délavées dans un navigateur. On convertit en SDR BT.709 (tone mapping Hable)."""
    tin = 'arib-std-b67' if 'arib-std-b67' in err else 'smpte2084' if 'smpte2084' in err else None
    if not tin:
        return ''
    return (f'zscale=tin={tin}:pin=bt2020:min=bt2020nc:t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,'
            'tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,')


def count(folder):
    return len(list(folder.glob('*.webp')))


# ---------------------------------------------------------------- vol

def flight(a):
    folder = Path(a.clips).expanduser().resolve()
    clips = sorted(p for p in folder.glob('*') if p.suffix.lower() in ('.mp4', '.mov', '.m4v', '.webm', '.mkv'))
    if not clips:
        sys.exit(f'Aucun clip dans {folder} (ex. 1-approche.mp4, 2-entree.mp4 … 5-remontee.mp4)')
    info = [probe(c) for c in clips]
    for c, (d, w, h, *_) in zip(clips, info):
        print(f'  {c.name}: {d:.1f} s, {w}x{h}')

    # Résolution maître : la plus petite hauteur des sources, plafonnée à 2160 (on ne suréchantillonne jamais)
    H = min(2160, min(i[2] for i in info))
    H -= H % 2
    W = H * 16 // 9
    W -= W % 2
    X = a.xfade
    grade = f',eq=contrast={a.contrast}:saturation={a.saturation}' if a.grade else ''

    parts, offset, starts = [], 0.0, []
    for i, _ in enumerate(clips):
        parts.append(f'[{i}:v]{info[i][4]}scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},'
                     f'fps=30,setsar=1,format=yuv420p{grade}[v{i}]')
    last = 'v0'
    for i in range(1, len(clips)):
        offset += info[i - 1][0] - X
        starts.append(offset)
        parts.append(f'[{last}][v{i}]xfade=transition=fade:duration={X}:offset={offset:.3f}[x{i}]')
        last = f'x{i}'
    total = sum(d for d, *_ in info) - X * (len(clips) - 1)

    cache = ROOT / 'tools' / '.cache'
    cache.mkdir(parents=True, exist_ok=True)
    master = cache / 'flight-master.mp4'
    inputs = [x for c in clips for x in ('-i', c)]
    print(f'\n1/3 Assemblage {W}x{H}, {total:.1f} s')
    run([*inputs, '-filter_complex', ';'.join(parts), '-map', f'[{last}]', '-an',
         '-c:v', 'libx264', '-crf', '10', '-preset', 'slow', '-pix_fmt', 'yuv420p', master])

    out = ASSETS / 'flight'
    for sub in ('landscape', 'portrait'):
        shutil.rmtree(out / sub, ignore_errors=True)
        (out / sub).mkdir(parents=True)

    lw = min(a.width, W)
    print(f'2/3 Images paysage {lw}px, {a.fps} img/s, qualité {a.quality}')
    run(['-i', master, '-vf', f'fps={a.fps},scale={lw}:-2:flags=lanczos', '-c:v', 'libwebp',
         '-quality', a.quality, '-compression_level', 6, '-preset', 'photo', out / 'landscape' / '%04d.webp'])
    manifest = {
        'frames': count(out / 'landscape'), 'fps': a.fps, 'duration': round(total, 2),
        'landscape': {'pattern': 'landscape/%04d.webp', 'width': lw, 'height': lw * 9 // 16},
    }
    if not a.no_portrait:
        ph = min(1920, H)
        pw = ph * 9 // 16 - (ph * 9 // 16) % 2
        print(f'3/3 Images portrait 9:16 {pw}x{ph}')
        run(['-i', master, '-vf', f'fps={a.fps},crop=ih*9/16:ih,scale={pw}:{ph}:flags=lanczos', '-c:v', 'libwebp',
             '-quality', a.quality, '-compression_level', 6, '-preset', 'photo', out / 'portrait' / '%04d.webp'])
        manifest['portrait'] = {'pattern': 'portrait/%04d.webp', 'width': pw, 'height': ph}

    # Début de chaque espace (au milieu du fondu), normalisé 0..1 : sert à placer les textes.
    # Le chiffre en tête du nom de fichier donne l'espace (1a-approche, 1b-facade, 2-entree…) ;
    # sans chiffre, un clip = un espace.
    begin = [0] + [round((s + X / 2) / total, 4) for s in starts]
    nums = [re.match(r'\d+', c.stem) for c in clips]
    keys = [int(m.group()) if m else i + 1 for i, m in enumerate(nums)]
    chapters = []
    for i, k in enumerate(keys):
        if i == 0 or k != keys[i - 1]:
            chapters.append(begin[i])
    while len(chapters) < 5:
        chapters.append(round((1 + chapters[-1]) / 2, 4))
    manifest['chapters'] = chapters[:5]
    # Télémétrie indicative par plan (affichée comme « données simulées »)
    alts = [4, 1.6, 1.4, 2.2, 5]  # à ajuster si le premier plan est vraiment aérien
    manifest['telemetry'] = [{'t': c, 'alt': alts[i], 'hdg': 180} for i, c in enumerate(manifest['chapters'])] + [{'t': 1, 'alt': alts[-1], 'hdg': 180}]
    (out / 'manifest.json').write_text(json.dumps(manifest, indent=2))

    size = sum(f.stat().st_size for f in (out / 'landscape').glob('*.webp')) / 1e6
    print(f"\nOK : {manifest['frames']} images, {size:.0f} Mo (paysage). Plans : {manifest['chapters']}")


# ---------------------------------------------------------------- réalisations

def slug(s):
    s = re.sub(r'[^\w-]+', '-', s.lower()).strip('-')
    return re.sub(r'-+', '-', s) or 'film'


def realisation(a):
    src = Path(a.video).expanduser().resolve()
    d, w, h, audio, tm = probe(src)
    out = ASSETS / 'realisations'
    out.mkdir(parents=True, exist_ok=True)
    name = slug(a.slug or a.title)
    short = min(w, h)
    portrait = h > w

    def scale(res):  # mise à l'échelle par le petit côté, vidéos verticales comprises
        return tm + (f'scale={res}:-2' if portrait else f'scale=-2:{res}') + ':flags=lanczos'

    aud = ['-c:a', 'aac', '-b:a', '192k'] if audio and not a.mute else ['-an']
    common = ['-pix_fmt', 'yuv420p', '-movflags', '+faststart']
    sources = []
    print(f'{src.name} : {d:.1f} s, {w}x{h}' + (' (HDR converti en SDR)' if tm else ''))

    if short >= 2000 and not a.fast and a.av1:
        print('4K AV1 (le plus léger à qualité égale)')
        run(['-i', src, '-vf', scale(2160), '-c:v', 'libsvtav1', '-crf', 26, '-preset', 6,
             *common, *aud, out / f'{name}-2160-av1.mp4'])
        sources.append({'src': f'{name}-2160-av1.mp4', 'res': 2160, 'type': 'video/mp4; codecs="av01.0.12M.08"'})
    if short >= 2000 and not a.fast:
        print('4K HEVC (Safari / iPhone, Chrome, Edge)')
        run(['-i', src, '-vf', scale(2160), '-c:v', 'libx265', '-crf', 21, '-preset', 'medium',
             '-tag:v', 'hvc1', '-x265-params', 'log-level=error', *common, *aud, out / f'{name}-2160-hevc.mp4'])
        sources.append({'src': f'{name}-2160-hevc.mp4', 'res': 2160, 'type': 'video/mp4; codecs="hvc1"'})
    elif short >= 1400 and not a.fast:
        print('1440p HEVC')
        run(['-i', src, '-vf', scale(1440), '-c:v', 'libx265', '-crf', 20, '-preset', 'medium',
             '-tag:v', 'hvc1', '-x265-params', 'log-level=error', *common, *aud, out / f'{name}-1440-hevc.mp4'])
        sources.append({'src': f'{name}-1440-hevc.mp4', 'res': 1440, 'type': 'video/mp4; codecs="hvc1"'})

    r = min(1080, short - short % 2)
    print(f'{r}p H.264 (compatible partout)')
    run(['-i', src, '-vf', scale(r), '-c:v', 'libx264', '-crf', 18, '-preset', 'slow',
         '-profile:v', 'high', *common, *aud, out / f'{name}-{r}.mp4'])
    sources.append({'src': f'{name}-{r}.mp4', 'res': r, 'type': 'video/mp4; codecs="avc1.640028"'})

    t = min(a.poster_at, max(0, d - 0.5))
    print('Affiche et aperçu')
    run(['-ss', t, '-i', src, '-frames:v', 1, '-vf', scale(1080 if portrait else 1440), '-c:v', 'libwebp', '-quality', 88, out / f'{name}-poster.webp'])
    run(['-ss', min(t, max(0, d - 6)), '-t', 6, '-i', src, '-vf', scale(720) + ',fps=30', '-an', '-c:v', 'libx264',
         '-crf', 22, '-preset', 'slow', *common, out / f'{name}-preview.mp4'])

    data_path = out / 'realisations.json'
    data = json.loads(data_path.read_text()) if data_path.exists() else {'reel': None, 'items': []}
    items = [i for i in data['items'] if i.get('id') != name]
    entry = {
        'id': name, 'title': a.title, 'place': a.place, 'type': a.type,
        'duration': f'{int(d // 60)}:{int(d % 60):02d}', 'width': w, 'height': h,
        'poster': f'{name}-poster.webp', 'preview': f'{name}-preview.mp4', 'sources': sources,
    }
    items.insert(a.position if a.position is not None else len(items), entry)
    data['items'] = items
    data_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f'OK : « {a.title} » ajoutée ({", ".join(str(s["res"]) + "p" for s in sources)})')


def reel(a):
    src = Path(a.video).expanduser().resolve()
    d, w, h, _, tm = probe(src)
    out = ASSETS / 'realisations'
    out.mkdir(parents=True, exist_ok=True)
    # source horizontale : recadrage central 9:16 ; verticale : conservée
    vf = tm + (f'crop=ih*9/16:ih,' if w > h else '') + f'scale=-2:{min(1920, h - h % 2)}:flags=lanczos'
    run(['-ss', a.start, '-i', src, '-t', min(d - a.start, a.max), '-vf', vf, '-an', '-c:v', 'libx264', '-crf', 20, '-preset', 'slow',
         '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out / 'reel-9x16.mp4'])
    data_path = out / 'realisations.json'
    data = json.loads(data_path.read_text()) if data_path.exists() else {'reel': None, 'items': []}
    data['reel'] = 'reel-9x16.mp4'
    data_path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print('OK : reel-9x16.mp4')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)

    f = sub.add_parser('flight', help='séquence du vol à partir de assets/clips/')
    f.add_argument('--clips', default=str(ASSETS / 'clips'), help='dossier des plans (défaut : assets/clips)')
    f.add_argument('--fps', type=int, default=15, help='images par seconde de vidéo (15 + fondu = très fluide)')
    f.add_argument('--width', type=int, default=1920, help='largeur des images paysage (2560 pour écrans 5K)')
    f.add_argument('--quality', type=int, default=82, help='qualité WebP (0-100)')
    f.add_argument('--xfade', type=float, default=0.5, help='durée des fondus entre plans (s)')
    f.add_argument('--no-portrait', action='store_true', help='ne pas générer la version 9:16')
    f.add_argument('--no-grade', dest='grade', action='store_false', help='sans étalonnage')
    f.add_argument('--contrast', type=float, default=1.03)
    f.add_argument('--saturation', type=float, default=1.05)

    r = sub.add_parser('realisation', help='ajouter une réalisation')
    r.add_argument('video')
    r.add_argument('--title', required=True)
    r.add_argument('--place', default='')
    r.add_argument('--type', default='')
    r.add_argument('--slug')
    r.add_argument('--poster-at', type=float, default=2.0, help='instant de l\'affiche (s)')
    r.add_argument('--mute', action='store_true', help='retirer le son')
    r.add_argument('--fast', action='store_true', help='1080p uniquement (encodage rapide)')
    r.add_argument('--av1', action='store_true', help='ajouter une version 4K AV1 (plus légère, encodage très long)')
    r.add_argument('--position', type=int, help='place dans la liste (0 = en tête)')

    e = sub.add_parser('reel', help='vidéo 9:16 du téléphone')
    e.add_argument('video')
    e.add_argument('--max', type=float, default=15, help='durée max (s)')
    e.add_argument('--start', type=float, default=0, help='début de l\'extrait (s)')

    a = p.parse_args()
    {'flight': flight, 'realisation': realisation, 'reel': reel}[a.cmd](a)
