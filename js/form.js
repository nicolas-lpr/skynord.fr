// Questionnaire de contact en 5 étapes.
// À l'envoi : un email rédigé arrive sur skynord.immo@gmail.com (via FormSubmit, sans serveur)
// et le client reçoit un accusé de réception. Au tout premier envoi, FormSubmit envoie
// un email d'activation à skynord.immo@gmail.com : il faut cliquer dessus une fois.
const TO = 'skynord.immo@gmail.com';
const ENDPOINT = `https://formsubmit.co/ajax/${TO}`;
const PRO = ['Agence immobilière', 'Hôtel ou gîte', 'Promoteur ou constructeur', 'Autre'];

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
      const good = input.type === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) : v.length >= 2;
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

    next.disabled = true;
    next.textContent = 'Envoi…';
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Nouvelle demande · ${d.profil} · ${d.bien} · ${d.lieu}`,
          _template: 'box',
          _replyto: d.email,
          _autoresponse: `Bonjour ${first},\n\nMerci pour votre demande de tournage pour votre bien à ${d.lieu} (${d.formule}). Je l'étudie et je reviens vers vous rapidement.\n\nNicolas, Skynord\n06 50 53 99 32`,
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
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || json.success === 'false' || json.success === false) throw new Error(json.message || 'envoi');
      finish(`Merci ${first}, votre demande est bien partie. Vous allez recevoir une confirmation par email, je reviens vers vous rapidement.`);
    } catch {
      // Secours : la messagerie du client s'ouvre avec la demande déjà rédigée
      location.href = `mailto:${TO}?subject=${encodeURIComponent(`Demande de tournage · ${d.bien} · ${d.lieu}`)}&body=${encodeURIComponent(resume)}`;
      finish(`Merci ${first} ! L'envoi automatique n'a pas abouti : votre messagerie s'ouvre avec la demande déjà rédigée, il ne reste qu'à l'envoyer.`);
    }
  });

  function finish(text) {
    steps.forEach(s => { s.hidden = true; });
    form.querySelector('.quiz__nav').hidden = true;
    form.querySelector('.quiz__bar').hidden = true;
    document.getElementById('quizDoneText').textContent = text;
    done.hidden = false;
  }

  // Préremplissage depuis « Demander ce pack »
  document.querySelectorAll('[data-pack]').forEach(a => a.addEventListener('click', () => {
    const r = form.querySelector(`input[name="formule"][value="${a.dataset.pack}"]`);
    if (r) r.checked = true;
  }));

  show(0);
}
