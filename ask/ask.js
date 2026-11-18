/* Ask Dr. Sarah: the answered-questions board and the question form.
   The form is a preview: questions are kept on this device until the backend sends them on. */
(function () {
  const QA = window.ALAGA_QA, P = window.ALAGA_PRODUCTS || [];
  const BOARD = document.querySelector('main.ask');
  const WHO = BOARD.dataset.who || 'Dr. Sarah';
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', {day: 'numeric', month: 'short'});
  const params = new URLSearchParams(location.search);
  let topic = 'All', term = '';

  /* ---------- the board ---------- */
  const topics = ['All', ...new Set(QA.map(x => x.topic))];
  $('[data-topics]').innerHTML = topics.map((t, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-topic="${esc(t)}">${esc(t)}</button>`).join('');
  $('[data-topics]').addEventListener('click', e => {
    const b = e.target.closest('[data-topic]');
    if (!b) return;
    topic = b.dataset.topic;
    $$('[data-topic]').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
    render();
  });
  $('[data-search]').addEventListener('input', e => { term = e.target.value.trim().toLowerCase(); render(); });

  function tile(x, i){
    const prods = (x.product || []).map(id => P.find(p => p.id === id)).filter(Boolean)
      .map(p => `<a href="../store/?p=${p.id}">${esc(p.name)}</a>`).join('');
    return `<article class="tile${x.featured && !term && topic === 'All' ? ' is-featured' : ''}" style="--i:${i}">
      <div class="tile-card">
        <button type="button" class="tile-front" aria-expanded="false" aria-controls="a-${x.id}">
          <span class="tile-topic">${esc(x.topic)}</span>
          <span class="tile-q">${esc(x.q)}</span>
          <span class="tile-meta">${x.asked ? x.asked + ' people asked · ' : ''}answered ${fmt(x.date)}</span>
          <span class="tile-turn" aria-hidden="true">Read the answer</span>
        </button>
        <div class="tile-back" id="a-${x.id}" role="region" aria-label="Answer to: ${esc(x.q)}" tabindex="0" inert>
          <span class="tile-q-sm">${esc(x.q)}</span>
          <span class="tile-a">${esc(x.a)}</span>
          <span class="tile-sign">${esc(WHO)}</span>
          ${prods ? `<span class="tile-prods">${prods}</span>` : ''}
          <button type="button" class="tile-close">Back to the question</button>
        </div>
      </div>
    </article>`;
  }
  function render(){
    const list = QA.filter(x => (topic === 'All' || x.topic === topic) &&
      (!term || (x.q + ' ' + x.a + ' ' + x.topic).toLowerCase().includes(term)))
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || (b.asked || 0) - (a.asked || 0));
    $('[data-tiles]').innerHTML = list.map(tile).join('');
    $('[data-empty]').hidden = list.length > 0;
  }
  // tiles turn over to show the answer; one open at a time
  function setOpen(t, open){
    t.classList.toggle('is-open', open);
    t.querySelector('.tile-front').setAttribute('aria-expanded', String(open));
    t.querySelector('.tile-back').inert = !open;
  }
  $('[data-tiles]').addEventListener('click', e => {
    const front = e.target.closest('.tile-front'), close = e.target.closest('.tile-close');
    if (front) {
      const t = front.closest('.tile');
      $$('.tile.is-open').forEach(x => x !== t && setOpen(x, false));
      setOpen(t, true);
      t.querySelector('.tile-back').focus({preventScroll: true});
    } else if (close) {
      const t = close.closest('.tile');
      setOpen(t, false);
      t.querySelector('.tile-front').focus({preventScroll: true});
    }
  });
  render();

  /* ---------- the form ---------- */
  const about = $('[data-about]');
  if (P.length && BOARD.dataset.products !== 'off') about.insertAdjacentHTML('beforeend', [
    '<option value="Skin check results">My skin check results</option>',
    '<option value="After a treatment">The weeks after a treatment</option>',
    '<optgroup label="A product">' + P.filter(p => p.shelf === 'skin').map(p => `<option value="${esc(p.name)}" data-id="${p.id}">${esc(p.name)}</option>`).join('') + '</optgroup>',
  ].join(''));
  // arriving from a product or the skin check fills the form in
  if (params.get('p')) { const o = about.querySelector(`[data-id="${params.get('p')}"]`); if (o) o.selected = true; }
  if (params.get('q')) {
    $('#q').value = params.get('q') + ': ';
    about.value = 'Skin check results';
    topic = 'Treatments';
    $$('[data-topic]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.topic === topic)));
    render();
  }
  if (params.get('from') === 'skin-check') about.value = 'Skin check results';

  const KEY = BOARD.dataset.key || 'alaga.questions';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  function mine(){
    const list = load();
    $('[data-mine]').hidden = !list.length;
    $('[data-mine-list]').innerHTML = list.map(x => `<li><span>${esc(x.q)}</span><small>Waiting for ${esc(WHO)} · ${esc(x.about || 'General')}</small></li>`).join('');
  }
  mine();

  $('[data-ask]').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('#q').value.trim(), email = $('#email').value.trim(), msg = $('[data-ask-msg]');
    if (q.length < 8) { msg.textContent = 'Write your question in a sentence or two.'; $('#q').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = 'Enter an email address like name@example.nl, so the answer can reach you.'; $('#email').focus(); return; }
    const list = load();
    list.unshift({q, about: about.value, at: Date.now()});
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10))); } catch (err) {}
    $('#q').value = '';
    msg.textContent = `Saved on this device. In the preview nothing is sent to ${WHO} yet.`;
    mine();
  });
})();
