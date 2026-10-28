/* Formação Revolucionária
   config.json     · abas, nota do topo e contato
   curso.json      · módulos e aulas
   obras.json      · acervo
   categorias.json · categorias da barra lateral (listas de títulos) */

const $ = (s) => document.querySelector(s);
const norm = (s) => (s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pt = new Intl.Collator('pt-BR', { sensitivity: 'base' });
const fmtAno = (a) => (a == null ? '' : a < 0 ? `${-a} a.C.` : String(a));
const ROTULO_TIPO = { Livro: 'Livros', Panfleto: 'Panfletos', Videoaula: 'Vídeos', Artigo: 'Artigos' };
const POR_PAGINA = 12;
const PERIODOS = [
  ['Antiguidade', -Infinity, 500],
  ['Medieval', 500, 1500],
  ['Moderno', 1500, 1800],
  ['Contemporâneo', 1800, Infinity],
];
const periodoDe = (a) => (a == null ? '' : (PERIODOS.find(([, i, f]) => a >= i && a < f) || [''])[0]);

let CONFIG = { curso: false, biblioteca: true, nota: '', contato: {} };

/* =====================================================
   YOUTUBE
   ===================================================== */
// aceita youtube.com/watch?v=, youtu.be/ e youtube.com/embed/
function idYoutube(url) {
  const m = (url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// troca a capa do vídeo pelo player (container é o elemento .previa)
function carregarVideo(container, id) {
  if (!container) return;
  container.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen title="Vídeo"></iframe>`;
}

/* =====================================================
   CONFIGURAÇÃO, ABAS E CONTATO
   ===================================================== */
function setLink(sel, url) {
  const el = $(sel);
  if (url) { el.href = url; el.hidden = false; } else { el.hidden = true; }
}

function aplicarConfig() {
  const c = CONFIG.contato || {};
  setLink('#contato-email', c.email
    ? `mailto:${c.email}?subject=${encodeURIComponent('Sugestão para a Formação Revolucionária')}`
    : '');
  setLink('#contato-instagram', c.instagram);
  setLink('#contato-twitter', c.twitter);

  if (CONFIG.nota) {
    $('#nota').textContent = CONFIG.nota;
    $('#nota').hidden = false;
  }
  $('[data-aba="curso"]').hidden = CONFIG.curso !== true;
  $('[data-aba="biblioteca"]').hidden = CONFIG.biblioteca === false;
}

function mostrarAba(alvo) {
  document.querySelectorAll('[data-aba]').forEach((b) => b.classList.toggle('on', b.dataset.aba === alvo));
  $('#view-curso').hidden = alvo !== 'curso';
  $('#view-biblioteca').hidden = alvo !== 'biblioteca';
  // na aba Curso some a barra lateral e a busca
  $('#barra').hidden = alvo === 'curso';
  $('#busca').hidden = alvo === 'curso';
  $('.site').classList.toggle('so-conteudo', alvo === 'curso');
}

document.querySelectorAll('[data-aba]').forEach((b) =>
  b.addEventListener('click', () => mostrarAba(b.dataset.aba)));

// menu da barra lateral no celular
$('#barra-toggle').addEventListener('click', () => {
  const aberta = $('#barra-corpo').classList.toggle('aberta');
  $('#barra-toggle').setAttribute('aria-expanded', aberta);
});

/* =====================================================
   CURSO
   Módulos > aulas. Cada aula é "texto", "video" ou "pdf".
   ===================================================== */
let aulasPlanas = [];
const ICONE = { texto: 'Texto', video: 'Vídeo', pdf: 'PDF' };

function renderTrilha(modulos) {
  $('#trilha').innerHTML = modulos.map((m) => `
    <details class="modulo" open>
      <summary>${esc(m.titulo)}</summary>
      <ul class="aulas-lista">
        ${m.aulas.map((a) => `
          <li><button type="button" class="aula-item" data-id="${m.id}-${a.id}">
            <span class="tipo-aula">${ICONE[a.tipo] || ''}</span>${esc(a.titulo)}
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
        <div class="previa">
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
    corpo = aula.url
      ? `<a class="botao-grande" href="${esc(aula.url)}" target="_blank" rel="noopener">
           <span>abrir PDF em tela cheia</span><span aria-hidden="true">→</span>
         </a>`
      : `<p class="pendente">Arquivo ainda não adicionado.</p>`;
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
  if (play) { carregarVideo(play.closest('.previa'), play.dataset.yt); return; }
  const seta = e.target.closest('.seta');
  if (seta) mostrarAula(seta.dataset.id);
});

function carregarCurso() {
  return fetch('curso.json')
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
let obras = [];
let categorias = {};
const CAMPOS = ['tema', 'tipo', 'periodo', 'editora', 'categoria'];
const S = { q: '', tema: '', tipo: '', periodo: '', editora: '', categoria: '', ord: 'titulo', pagina: 1 };

// valores de uma obra num campo (categoria pode ser vários)
function valores(o, campo) {
  if (campo === 'categoria') return o._cats;
  if (campo === 'periodo') return [o._periodo].filter(Boolean);
  return [o[campo]].filter(Boolean);
}

// obra passa em todos os filtros, exceto no campo indicado em "ignorar"
function passa(o, ignorar = '') {
  if (ignorar !== 'q' && S.q && !S.q.split(/\s+/).every((w) => o._busca.includes(w))) return false;
  for (const c of CAMPOS) {
    if (c === ignorar || !S[c]) continue;
    if (!valores(o, c).includes(S[c])) return false;
  }
  return true;
}

// contagem por valor de um campo, respeitando os outros filtros
function contar(campo) {
  const m = new Map();
  for (const o of obras) {
    if (!passa(o, campo)) continue;
    for (const v of valores(o, campo)) m.set(v, (m.get(v) || 0) + 1);
  }
  return m;
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

const ordenadoPt = (m) => [...m].sort((a, b) => pt.compare(a[0], b[0]));

// item clicável da barra lateral
function itens(campo, lista, rotulo = (v) => v) {
  return lista.map(([v, n]) =>
    `<li><button class="nav-item${S[campo] === v ? ' on' : ''}" type="button" data-campo="${campo}" data-v="${esc(v)}">` +
    `<span>${esc(rotulo(v))}</span><span class="n">${n}</span></button></li>`).join('');
}

function renderNav() {
  // tipo
  $('#nav-tipo').innerHTML = itens('tipo', ordenadoPt(contar('tipo')), (v) => ROTULO_TIPO[v] || v);

  // categorias (só as que têm obras no resultado atual)
  const catMap = contar('categoria');
  const cats = Object.keys(categorias).filter((c) => catMap.get(c)).map((c) => [c, catMap.get(c)]);
  $('#bloco-categorias').hidden = cats.length === 0;
  $('#nav-categorias').innerHTML = itens('categoria', cats);

  // filtros recolhíveis
  const periodoMap = contar('periodo');
  const grupos = [
    ['Assunto', 'tema', ordenadoPt(contar('tema'))],
    ['Época', 'periodo', PERIODOS.map(([p]) => [p, periodoMap.get(p) || 0]).filter(([, n]) => n)],
    ['Editora', 'editora', ordenadoPt(contar('editora'))],
  ];
  $('#filtros').innerHTML = grupos
    .filter(([, , lista]) => lista.length)
    .map(([rotulo, campo, lista]) =>
      `<h3 class="sub">${rotulo}</h3><ul class="nav-lista">${itens(campo, lista)}</ul>`)
    .join('');

  const ativos = CAMPOS.filter((c) => S[c]).length;
  $('#ativos-filtros').textContent = ativos ? `${ativos} ativo${ativos > 1 ? 's' : ''}` : '';
}

function renderDestaques() {
  const lista = obras.filter((o) => o.destaque).slice(0, 4);
  $('#bloco-destaques').hidden = lista.length === 0;
  $('#nav-destaques').innerHTML = lista.map((o) =>
    `<li><button class="nav-item" type="button" data-i="${o._i}"><span>${esc(o.titulo)}</span></button></li>`).join('');
}

// card com capa (se houver) ou sem capa
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

  $('#contagem').textContent = `${lista.length} ${lista.length === 1 ? 'obra' : 'obras'}`;
  $('#grade').innerHTML = lista.slice(ini, ini + POR_PAGINA).map(cardHTML).join('');
  $('#vazio').hidden = lista.length > 0;

  $('#paginacao').innerHTML = paginas <= 1 ? '' : `
    <button type="button" data-pag="${S.pagina - 1}" ${S.pagina === 1 ? 'disabled' : ''}>anterior</button>
    <span>${S.pagina} de ${paginas}</span>
    <button type="button" data-pag="${S.pagina + 1}" ${S.pagina === paginas ? 'disabled' : ''}>próxima</button>`;
}

function atualizarBib() { renderNav(); renderGrade(); }

// barra lateral: filtros, categorias, tipos e destaques
$('#barra').addEventListener('click', (e) => {
  const destaque = e.target.closest('[data-i]');
  if (destaque) { abrirDetalhe(obras[Number(destaque.dataset.i)]); return; }
  const b = e.target.closest('[data-campo]');
  if (b) {
    const { campo, v } = b.dataset;
    S[campo] = S[campo] === v ? '' : v;   // clicar de novo desmarca
    S.pagina = 1;
    atualizarBib();
  }
});

$('#limpar').addEventListener('click', () => {
  CAMPOS.forEach((c) => { S[c] = ''; });
  S.pagina = 1;
  atualizarBib();
});

$('#busca').addEventListener('input', (e) => {
  S.q = norm(e.target.value.trim());
  S.pagina = 1;
  atualizarBib();
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
  const sugYt = idYoutube(o.video_sugerido);

  const capa = o.capa
    ? `<img class="capa-detalhe" src="${esc(o.capa)}" alt="" onerror="this.remove()">`
    : '';

  const previa = yt ? `
    <div class="previa">
      <img src="https://img.youtube.com/vi/${yt}/hqdefault.jpg" alt="">
      <button type="button" class="play" data-yt="${yt}">▶ assistir aqui</button>
    </div>` : '';

  const botao = o.link ? `
    <a class="botao-grande" href="${esc(o.link)}" target="_blank" rel="noopener">
      <span>${yt ? 'abrir no YouTube' : 'abrir'}</span><span aria-hidden="true">→</span>
    </a>` : '';

  // vídeo sugerido para acompanhar a leitura
  let sugestao = '';
  if (sugYt) {
    sugestao = `
      <div class="sugestao">
        <h3>Vídeo para acompanhar</h3>
        <div class="previa">
          <img src="https://img.youtube.com/vi/${sugYt}/hqdefault.jpg" alt="">
          <button type="button" class="play" data-yt="${sugYt}">▶ assistir aqui</button>
        </div>
      </div>`;
  } else if (o.video_sugerido) {
    sugestao = `
      <div class="sugestao">
        <h3>Vídeo para acompanhar</h3>
        <a class="botao-grande" href="${esc(o.video_sugerido)}" target="_blank" rel="noopener">
          <span>abrir vídeo</span><span aria-hidden="true">→</span>
        </a>
      </div>`;
  }

  const dados = [
    o.ano != null ? `<div><dt>ano</dt><dd>${esc(fmtAno(o.ano))}</dd></div>` : '',
    o.editora ? `<div><dt>editora</dt><dd>${esc(o.editora)}</dd></div>` : '',
    o.tema ? `<div><dt>assunto</dt><dd>${esc(o.tema)}${o.subtema ? ' · ' + esc(o.subtema) : ''}</dd></div>` : '',
  ].join('');

  const etiquetas = o._cats.map((c) => `<span class="etiqueta">${esc(c)}</span>`).join('');

  $('#detalhe-corpo').innerHTML = `
    ${capa}
    <p class="card-tipo">${esc((o.tipo || '').toLowerCase())}</p>
    <h2>${esc(o.titulo)}</h2>
    <p class="det-autor">${esc(o.autor || '')}</p>
    ${dados ? `<dl class="det-lista">${dados}</dl>` : ''}
    ${etiquetas ? `<div class="etiquetas">${etiquetas}</div>` : ''}
    ${descricao ? `<p class="det-descricao">${descricao}</p>` : ''}
    ${previa}
    ${botao}
    ${sugestao}`;

  $('#detalhe').showModal();
}

$('#grade').addEventListener('click', (e) => {
  const b = e.target.closest('.card');
  if (b) abrirDetalhe(obras[Number(b.dataset.i)]);
});

$('#fechar').addEventListener('click', () => $('#detalhe').close());

// clique fora fecha; play carrega o vídeo dentro da própria janela
$('#detalhe').addEventListener('click', (e) => {
  if (e.target.id === 'detalhe') { e.target.close(); return; }
  const play = e.target.closest('.play');
  if (play) carregarVideo(play.closest('.previa'), play.dataset.yt);
});

function carregarObras() {
  return Promise.all([
    fetch('obras.json').then((r) => r.json()),
    fetch('categorias.json').then((r) => r.json()).catch(() => ({})),
  ]).then(([dados, cats]) => {
    categorias = cats;
    obras = dados.map((o, i) => ({
      ...o,
      _i: i,
      _periodo: periodoDe(o.ano),
      _cats: Object.keys(cats).filter((c) => (cats[c] || []).includes(o.titulo)),
      _busca: norm([o.titulo, o.autor, o.tema, o.subtema, o.editora, ...(o.tags || [])].join(' ')),
    }));
    renderDestaques();
    atualizarBib();
  }).catch(() => {
    $('#vazio').hidden = false;
    $('#vazio').textContent = 'Não foi possível carregar obras.json.';
  });
}

/* =====================================================
   INÍCIO
   ===================================================== */
fetch('config.json')
  .then((r) => r.json())
  .catch(() => ({}))
  .then((cfg) => {
    CONFIG = { ...CONFIG, ...cfg };
    aplicarConfig();
    return Promise.all([
      carregarObras(),
      CONFIG.curso === true ? carregarCurso() : null,
    ]);
  })
  .then(() => {
    const soCurso = CONFIG.curso === true && CONFIG.biblioteca === false;
    mostrarAba(soCurso ? 'curso' : 'biblioteca');
  });
