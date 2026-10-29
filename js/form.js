// Questionnaire de contact en 5 étapes.
// À l'envoi : un email rédigé arrive sur skynord.immo@gmail.com (via FormSubmit, sans serveur)
// (FormSubmit tente aussi un accusé de réception au client, non garanti). Au tout premier envoi, FormSubmit envoie
// un email d'activation à skynord.immo@gmail.com : il faut cliquer dessus une fois.
// Si FormSubmit ne répond pas (panne, comme le 29/10/2026), Web3Forms prend le relais. Si les deux échouent, le client ne voit pas
// « c'est envoyé » : on lui propose d'envoyer la même demande, déjà rédigée, depuis sa messagerie, ou d'appeler.
const TO = 'skynord.immo@gmail.com';
const ENDPOINT = `https://formsubmit.co/ajax/${TO}`;
// Secours si FormSubmit est en panne : Web3Forms (gratuit, 250 demandes/mois). La clé est publique par conception :
// elle ne permet que d'envoyer des demandes vers skynord.immo@gmail.com.
const W3F_ENDPOINT = 'https://api.web3forms.com/submit';
const W3F_KEY = 'dad05864-023a-4008-bd71-91798b2d1fbc';
// Envoi JSON avec délai maximal : true seulement si le service confirme la réception
async function post(url, body, ms) {
  try {
    const r = await fetch(url, { method: 'POST', signal: AbortSignal.timeout?.(ms), headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return r.ok && String(j.success) === 'true';
  } catch (err) { console.error(`Envoi du questionnaire (${new URL(url).host}) :`, err); return false; }
}
const PRO = ['Agence immobilière', 'Hôtel ou gîte', 'Promoteur ou constructeur', 'Autre'];

// Formats acceptés
// email : nom@domaine.ext (extension de 2 lettres ou plus, pas d'espace, pas de point doublé)
const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i;
// téléphone : français (06 12 34 56 78, 0612345678, +33 6 12 34 56 78) ou international (+32…, 8 à 15 chiffres)
const validPhone = v => {
  const n = v.replace(/[\s.\-()]/g, '');
  return /^0[1-9]\d{8}$/.test(n) || /^(\+|00)33[1-9]\d{8}$/.test(n) || /^(\+|00)(?!33)[1-9]\d{7,14}$/.test(n);
};
const validEmail = v => EMAIL.test(v) && !v.includes('..');

export function initForm() {
  const form = document.getElementById('quiz');
  if (!form) return;
  const steps = [...form.querySelectorAll('.step')];
  const bars = [...form.querySelectorAll('.quiz__bar i')];
  const next = document.getElementById('quizNext');
  const back = document.getElementById('quizBack');
  const done = document.getElementById('quizDone');
  let cur = 0;

  const val = name => (form.elements[name]?.value || '').trim();
  const radio = name => form.querySelector(`input[name="${name}"]:checked`)?.value || '';

  function show(i) {
    cur = i;
    steps.forEach((s, k) => { s.hidden = k !== i; });
    bars.forEach((b, k) => b.classList.toggle('on', k <= i));
    back.hidden = i === 0;
    next.textContent = i === steps.length - 1 ? 'Envoyer ma demande' : 'Continuer';
    // Le champ société n'a de sens que pour un professionnel
    form.querySelector('[data-pro]').hidden = !PRO.includes(radio('profil'));
  }

  function focusStep() {
    const first = steps[cur].querySelector('input:checked, input:not([type=radio]), input');
    first?.focus({ preventScroll: true });
  }

  // Validation de l'étape courante
  function valid(i) {
    const step = steps[i];
    let ok = true;
    step.querySelectorAll('.choices[data-required]').forEach(group => {
      const picked = group.querySelector('input:checked');
      group.classList.toggle('bad', !picked);
      if (!picked) ok = false;
    });
    step.querySelectorAll('input[required]:not([type=radio]):not([type=checkbox])').forEach(input => {
      const v = input.value.trim();
      const good = input.type === 'email' ? validEmail(v) : input.type === 'tel' ? validPhone(v) : v.length >= 2;
      input.closest('.field').classList.toggle('bad', !good);
      if (!good) ok = false;
    });
    const rgpd = step.querySelector('input[name="rgpd"]');
    if (rgpd) { rgpd.closest('.check').classList.toggle('bad', !rgpd.checked); if (!rgpd.checked) ok = false; }
    if (!ok) step.querySelector('.bad input, .bad')?.focus?.();
    return ok;
  }

  // Un choix unique fait avancer tout seul (sauf « Autre », qui demande une précision)
  form.addEventListener('change', e => {
    const input = e.target;
    if (input.type !== 'radio') return;
    const step = input.closest('.step');
    input.closest('.choices').classList.remove('bad');
    const other = step.querySelector('.other');
    if (other) {
      other.hidden = input.value !== 'Autre';
      if (!other.hidden) { other.querySelector('input').focus(); return; }
    }
    const onlyChoices = ![...step.querySelectorAll('input:not([type=radio])')].some(i => !i.closest('.other'));
    const at = cur; // évite un double saut si l'on clique aussi sur « Continuer »
    if (onlyChoices && at < steps.length - 1) setTimeout(() => { if (cur === at) { show(at + 1); focusStep(); } }, 260);
  });
  form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('bad'));

  back.addEventListener('click', () => { show(Math.max(0, cur - 1)); focusStep(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!valid(cur)) return;
    if (cur < steps.length - 1) { show(cur + 1); focusStep(); return; }

    const d = {
      profil: radio('profil') === 'Autre' ? `Autre (${val('profil_autre') || 'non précisé'})` : radio('profil'),
      bien: radio('bien') === 'Autre' ? (val('bien_autre') || 'autre bien') : radio('bien'),
      formule: radio('formule'),
      lieu: val('lieu'), surface: val('surface'), delai: radio('delai'),
      nom: val('nom'), societe: val('societe'), email: val('email'), tel: val('tel'), precisions: val('precisions'),
    };
    const first = d.nom.split(/\s+/)[0];
    const bienPhrase = `${d.bien.toLowerCase()}${d.surface ? ` d'environ ${d.surface.replace(/\s*m²?$/i, '')} m²` : ''} à ${d.lieu}`;
    const resume = [
      `${d.nom}${d.societe ? ` (${d.societe})` : ''}, ${d.profil.toLowerCase()}, souhaite un tournage pour un bien de type ${bienPhrase}.`,
      `Formule envisagée : ${d.formule}. Délai : ${d.delai.toLowerCase()}.`,
      `À recontacter au ${d.tel} ou par email à ${d.email}.`,
      d.precisions ? `Précisions du client : « ${d.precisions} »` : 'Pas de précision supplémentaire.',
    ].join('\n\n');

    // On attend la réponse du service (15 s au plus) avant de confirmer
    next.disabled = true; next.textContent = 'Envoi…';
    const subject = `Nouvelle demande · ${d.profil} · ${d.bien} · ${d.lieu}`;
    const fields = {
      'Demande': resume,
      'Profil': d.profil,
      'Bien': d.bien,
      'Surface': d.surface || 'non précisée',
      'Lieu': d.lieu,
      'Formule': d.formule,
      'Délai': d.delai,
      'Nom': d.nom,
      'Société': d.societe || '-',
      email: d.email,
      'Téléphone': d.tel,
      'Précisions': d.precisions || '-',
    };
    // 1. FormSubmit (envoie aussi un accusé de réception au client) ; 2. s'il ne répond pas, Web3Forms
    const sent = await post(ENDPOINT, {
      _subject: subject,
      _template: 'box',
      _replyto: d.email,
      _autoresponse: `Bonjour ${first},\n\nMerci pour votre demande de tournage pour votre bien à ${d.lieu} (${d.formule}). Je l'étudie et je reviens vers vous rapidement.\n\nNicolas, Skynord\n06 50 53 99 32`,
      ...fields,
    }, 8000) || await post(W3F_ENDPOINT, { access_key: W3F_KEY, subject, from_name: 'Site skynord.fr', replyto: d.email, ...fields }, 12000);
    next.disabled = false;
    if (sent) return finish(`Merci ${first}, votre demande est bien envoyée. Je reviens vers vous rapidement, par téléphone ou par email.`);
    const details = [`Profil : ${d.profil}`, `Bien : ${d.bien}`, `Surface : ${d.surface || 'non précisée'}`, `Lieu : ${d.lieu}`, `Formule : ${d.formule}`,
      `Délai : ${d.delai}`, `Nom : ${d.nom}`, `Société : ${d.societe || '-'}`, `Email : ${d.email}`, `Téléphone : ${d.tel}`, `Précisions : ${d.precisions || '-'}`].join('\n');
    document.getElementById('quizMail').href = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`${resume}\n\n${details}`)}`;
    finish(`Désolé ${first}, l'envoi automatique n'a pas fonctionné. Rien à retaper : votre demande est déjà rédigée avec toutes vos réponses. Il suffit de l'envoyer depuis votre messagerie, ou de m'appeler.`,
      "Votre demande n'est pas encore partie.");
  });

  function finish(text, title) {
    document.getElementById('quizDoneTitle').textContent = title || "Merci, c'est envoyé.";
    document.getElementById('quizFallback').hidden = !title;
    steps.forEach(s => { s.hidden = true; });
    form.querySelector('.quiz__nav').hidden = true;
    form.querySelector('.quiz__bar').hidden = true;
    document.getElementById('quizDoneText').textContent = text;
    done.hidden = false;
    // Le questionnaire rétrécit : sans ça, sur téléphone, on se retrouve plus bas (questions fréquentes) sans voir la confirmation
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => done.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' }));
  }

  // Préremplissage depuis « Demander ce pack »
  document.querySelectorAll('[data-pack]').forEach(a => a.addEventListener('click', () => {
    const r = form.querySelector(`input[name="formule"][value="${a.dataset.pack}"]`);
    if (r) r.checked = true;
  }));

  show(0);
}
