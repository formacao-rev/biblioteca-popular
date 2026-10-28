/* Site da biblioteca: curso (módulos e aulas) + biblioteca (grade paginada).
   Configuração em config.json · Curso em curso.json · Acervo em obras.json */

const $ = (s) => document.querySelector(s);
const norm = (s) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pt = new Intl.Collator('pt-BR', { sensitivity: 'base' });
const fmtAno = (a) => (a == null ? '' : a < 0 ? `${-a} a.C.` : String(a));

/* =====================================================
   LINKS: YouTube
   ===================================================== */

// YouTube: aceita youtube.com/watch?v=, youtu.be/ e youtube.com/embed/
function idYoutube(url) {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// Troca a capa do vídeo pelo player do YouTube
function carregarVideo(container, id) {
  container.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen title="Vídeo"></iframe>`;
}

/* =====================================================
   ABAS
   ===================================================== */
function mostrarAba(alvo) {
  document.querySelectorAll('[data-aba]').forEach((x) => x.classList.toggle('on', x.dataset.aba === alvo));
  $('#view-curso').hidden = alvo !== 'curso';
  $('#view-biblioteca').hidden = alvo !== 'biblioteca';
}

document.querySelectorAll('[data-aba]').forEach((b) =>
  b.addEventListener('click', () => mostrarAba(b.dataset.aba)));

/* =====================================================
   CONFIGURAÇÃO
   config.json: { "curso": true } mostra a aba Curso; false esconde
   ===================================================== */
fetch('config.json')
  .then((r) => r.json())
  .catch(() => ({ curso: false }))
  .then((cfg) => {
    if (cfg.curso !== true) return;
    $('[data-aba="curso"]').hidden = false;
    carregarCurso();
    mostrarAba('curso');
  });

/* =====================================================
   CURSO
   Estrutura: módulos > aulas. Cada aula é "texto", "video" ou "pdf".
   ===================================================== */
let aulasPlanas = [];   // ordem linear para anterior/próxima
let cursoCarregado = false;

const ICONE = { texto: 'Texto', video: 'Vídeo', pdf: 'PDF' };

function renderTrilha(modulos) {
  $('#trilha').innerHTML = modulos.map((m) => `
    <details class="modulo" open>
      <summary>${esc(m.titulo)}</summary>
      <ul class="aulas-lista">
        ${m.aulas.map((a) => `
          <li><button type="button" class="aula-item" data-id="${m.id}-${a.id}">
            <span class="tipo-aula tipo-${a.tipo}">${ICONE[a.tipo] || ''}</span>${esc(a.titulo)}
          </button></li>`).join('')}
      </ul>
    </details>`).join('');
}

function mostrarAula(chave) {
  const idx = aulasPlanas.findIndex((x) => x.chave === chave);
  if (idx < 0) return;
  const { aula, modulo } = aulasPlanas[idx];
  const ant = aulasPlanas[idx - 1];
  const prox = aulasPlanas[idx + 1];

  let corpo = '';
  if (aula.tipo === 'texto') {
    corpo = (aula.conteudo || '').split(/\n\s*\n/)
      .map((p) => `<p>${esc(p.trim())}</p>`).join('');
  } else if (aula.tipo === 'video') {
    const yt = idYoutube(aula.url);
    if (yt) {
      corpo = `
        <div class="previa" id="previa">
          <img src="https://img.youtube.com/vi/${yt}/hqdefault.jpg" alt="">
          <button type="button" class="play" data-yt="${yt}">▶ assistir aqui</button>
        </div>
        <a class="botao-grande" href="${esc(aula.url)}" target="_blank" rel="noopener">
          <span>abrir no YouTube</span><span aria-hidden="true">→</span>
        </a>`;
    } else if (aula.url) {
      corpo = `
        <a class="botao-grande" href="${esc(aula.url)}" target="_blank" rel="noopener">
          <span>abrir vídeo</span><span aria-hidden="true">→</span>
        </a>`;
    } else {
      corpo = `<p class="pendente">Link do vídeo ainda não adicionado.</p>`;
    }
  } else if (aula.tipo === 'pdf') {
    if (aula.url) {
      corpo = `
        <a class="botao-grande" href="${esc(aula.url)}" target="_blank" rel="noopener">
          <span>abrir PDF em tela cheia</span><span aria-hidden="true">→</span>
        </a>`;
    } else {
      corpo = `<p class="pendente">Arquivo ainda não adicionado.</p>`;
    }
  }

  $('#aula').innerHTML = `
    <p class="migalha">${esc(modulo.titulo)}</p>
    <h1>${esc(aula.titulo)}</h1>
    ${aula.nota ? `<p class="nota">${esc(aula.nota)}</p>` : ''}
    <div class="corpo">${corpo}</div>
    <nav class="pegar">
      ${ant ? `<button type="button" class="seta" data-id="${ant.chave}">← ${esc(ant.aula.titulo)}</button>` : '<span></span>'}
      ${prox ? `<button type="button" class="seta dir" data-id="${prox.chave}">${esc(prox.aula.titulo)} →</button>` : '<span></span>'}
    </nav>`;

  document.querySelectorAll('.aula-item').forEach((b) =>
    b.classList.toggle('ativa', b.dataset.id === chave));
  history.replaceState(null, '', '#' + chave);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$('#trilha').addEventListener('click', (e) => {
  const b = e.target.closest('.aula-item');
  if (b) mostrarAula(b.dataset.id);
});
$('#aula').addEventListener('click', (e) => {
  const play = e.target.closest('.play');
  if (play) { carregarVideo($('#previa'), play.dataset.yt); return; }
  const seta = e.target.closest('.seta');
  if (seta) mostrarAula(seta.dataset.id);
});

function carregarCurso() {
  if (cursoCarregado) return;
  cursoCarregado = true;
  fetch('curso.json')
    .then((r) => r.json())
    .then((modulos) => {
      aulasPlanas = modulos.flatMap((m) =>
        m.aulas.map((a) => ({ chave: `${m.id}-${a.id}`, aula: a, modulo: m })));
      renderTrilha(modulos);
      const pedida = location.hash.slice(1);
      mostrarAula(aulasPlanas.some((x) => x.chave === pedida) ? pedida : aulasPlanas[0]?.chave);
    })
    .catch(() => { $('#curso-erro').hidden = false; });
}

/* =====================================================
   BIBLIOTECA
   ===================================================== */
const POR_PAGINA = 12;
const PERIODOS = [
  ['Antiguidade', -Infinity, 500],
  ['Medieval', 500, 1500],
  ['Moderno', 1500, 1800],
  ['Contemporâneo', 1800, Infinity],
];
const periodoDe = (a) => (a == null ? '' : (PERIODOS.find(([, i, f]) => a >= i && a < f) || [''])[0]);

let obras = [];
const S = { q: '', tema: '', tipo: '', periodo: '', ord: 'titulo', pagina: 1 };

// verdadeiro se a obra passa em todos os filtros ativos, exceto os indicados em "ignorar"
function passa(o, ignorar = '') {
  if (ignorar !== 'q' && S.q && !S.q.split(/\s+/).every((w) => o._busca.includes(w))) return false;
  if (ignorar !== 'tema' && S.tema && o.tema !== S.tema) return false;
  if (ignorar !== 'tipo' && S.tipo && o.tipo !== S.tipo) return false;
  if (ignorar !== 'periodo' && S.periodo && o._periodo !== S.periodo) return false;
  return true;
}

function ordenar(lista) {
  const por = {
    titulo: (x, y) => pt.compare(x.titulo, y.titulo),
    autor: (x, y) => pt.compare(x.autor || '', y.autor || '') || pt.compare(x.titulo, y.titulo),
    ano: (x, y) => (x.ano ?? 1e9) - (y.ano ?? 1e9),
    'ano-desc': (x, y) => (y.ano ?? -1e9) - (x.ano ?? -1e9),
  };
  return [...lista].sort(por[S.ord] || por.titulo);
}

// contagem por valor de um campo, respeitando os outros filtros
function contar(campo) {
  const m = new Map();
  for (const o of obras) {
    const v = campo === 'periodo' ? o._periodo : o[campo];
    if (!v) continue;
    if (passa(o, campo)) m.set(v, (m.get(v) || 0) + 1);
  }
  return m;
}

function chips(grupo, campo, valores, atual) {
  const todos = `<button class="chip${!atual ? ' on' : ''}" data-campo="${campo}" data-v="">todos</button>`;
  const itens = valores.map(([v, n]) =>
    `<button class="chip${atual === v ? ' on' : ''}" data-campo="${campo}" data-v="${esc(v)}">${esc(v)} <span>${n}</span></button>`).join('');
  return `<div class="grupo-filtro"><span class="rotulo-filtro">${grupo}</span><div class="chips">${todos}${itens}</div></div>`;
}

function renderFiltros() {
  const temas = [...contar('tema')].sort((a, b) => pt.compare(a[0], b[0]));
  const tipos = [...contar('tipo')].sort((a, b) => pt.compare(a[0], b[0]));
  const periodosCont = contar('periodo');
  const periodos = PERIODOS.map(([p]) => [p, periodosCont.get(p) || 0]).filter(([, n]) => n);
  $('#filtros').innerHTML =
    chips('assunto', 'tema', temas, S.tema) +
    chips('tipo', 'tipo', tipos, S.tipo) +
    chips('época', 'periodo', periodos, S.periodo);

  // mostra quantos filtros estão ativos no título do recolhedor
  const ativos = ['tema', 'tipo', 'periodo'].filter((k) => S[k]).length;
  $('#ativos-filtros').textContent = ativos ? `· ${ativos} ativo${ativos > 1 ? 's' : ''}` : '';
}

function cardHTML(o) {
  const capa = o.capa
    ? `<span class="capa"><img src="${esc(o.capa)}" alt="" loading="lazy" onerror="this.closest('.capa').remove(); this.closest('.card').classList.remove('com-capa')"></span>`
    : '';
  return `
    <li>
      <button class="card${o.capa ? ' com-capa' : ''}" type="button" data-i="${o._i}">
        ${capa}
        <span class="card-texto">
          <span class="card-tipo">${esc((o.tipo || '').toLowerCase())}</span>
          <span class="card-titulo">${esc(o.titulo)}</span>
          <span class="card-autor">${esc(o.autor || '')}</span>
          <span class="card-ano">${esc(fmtAno(o.ano))}</span>
        </span>
      </button>
    </li>`;
}

function renderGrade() {
  const lista = ordenar(obras.filter((o) => passa(o)));
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  if (S.pagina > paginas) S.pagina = paginas;
  const ini = (S.pagina - 1) * POR_PAGINA;
  const pag = lista.slice(ini, ini + POR_PAGINA);

  $('#contagem').textContent = `${lista.length} ${lista.length === 1 ? 'obra' : 'obras'}`;
  $('#grade').innerHTML = pag.map(cardHTML).join('');
  $('#vazio').hidden = lista.length > 0;

  $('#paginacao').innerHTML = paginas <= 1 ? '' : `
    <button type="button" data-pag="${S.pagina - 1}" ${S.pagina === 1 ? 'disabled' : ''}>anterior</button>
    <span>${S.pagina} de ${paginas}</span>
    <button type="button" data-pag="${S.pagina + 1}" ${S.pagina === paginas ? 'disabled' : ''}>próxima</button>`;
}

function atualizarBib() { renderFiltros(); renderGrade(); }

// filtros
$('#filtros').addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (!b) return;
  const { campo, v } = b.dataset;
  S[campo] = S[campo] === v ? '' : v;
  S.pagina = 1;
  atualizarBib();
});
$('#busca').addEventListener('input', (e) => {
  S.q = norm(e.target.value.trim()); S.pagina = 1; atualizarBib();
});
$('#ordem').addEventListener('change', (e) => { S.ord = e.target.value; atualizarBib(); });
$('#paginacao').addEventListener('click', (e) => {
  const b = e.target.closest('[data-pag]');
  if (!b || b.disabled) return;
  S.pagina = Number(b.dataset.pag);
  renderGrade();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* =====================================================
   JANELA DE DETALHE DA OBRA
   ===================================================== */
function abrirDetalhe(o) {
  const descricao = esc(o.descricao || '').replace(/\n\s*\n/g, '<br><br>').replace(/\n/g, '<br>');
  const yt = idYoutube(o.link);

  const capa = o.capa ? `<img class="capa-detalhe" src="${esc(o.capa)}" alt="" onerror="this.remove()">` : '';

  const previa = yt ? `
    <div class="previa" id="previa-obra">
      <img src="https://img.youtube.com/vi/${yt}/hqdefault.jpg" alt="">
      <button type="button" class="play" data-yt="${yt}">▶ assistir aqui</button>
    </div>` : '';

  const botao = o.link ? `
    <a class="botao-grande" href="${esc(o.link)}" target="_blank" rel="noopener">
      <span>${yt ? 'abrir no YouTube' : 'abrir'}</span>
      <span aria-hidden="true">→</span>
    </a>` : '';

  $('#detalhe-corpo').innerHTML = `
    ${capa}
    <p class="card-tipo">${esc((o.tipo || '').toLowerCase())}</p>
    <h2>${esc(o.titulo)}</h2>
    <p class="det-autor">${esc(o.autor || '')}</p>
    ${previa}
    ${descricao ? `<p class="det-descricao">${descricao}</p>` : ''}
    ${botao}`;

  $('#detalhe').showModal();
}

$('#grade').addEventListener('click', (e) => {
  const b = e.target.closest('.card');
  if (b) abrirDetalhe(obras[Number(b.dataset.i)]);
});
$('#fechar').addEventListener('click', () => $('#detalhe').close());

// clique fora da janela fecha; clique no botão de play carrega o vídeo
$('#detalhe').addEventListener('click', (e) => {
  if (e.target.id === 'detalhe') { e.target.close(); return; }
  const play = e.target.closest('.play');
  if (play) carregarVideo($('#previa-obra'), play.dataset.yt);
});

fetch('obras.json')
  .then((r) => r.json())
  .then((dados) => {
    obras = dados.map((o, i) => ({
      ...o,
      _i: i,
      _periodo: periodoDe(o.ano),
      _busca: norm([o.titulo, o.autor, o.tema, o.subtema, ...(o.tags || [])].join(' ')),
    }));
    atualizarBib();
  })
  .catch(() => {
    $('#vazio').hidden = false;
    $('#vazio').textContent = 'Não foi possível carregar obras.json.';
  });
