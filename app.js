const STORAGE_KEY = 'hanCoQuizStateHk4';
const ORDER_KEY = 'hanCoQuizOrderHk4';
const LETTERS = ['A', 'B', 'C', 'D'];

const quiz = document.getElementById('quiz');
const search = document.getElementById('search');
const empty = document.getElementById('empty');
const state = loadJson(STORAGE_KEY, {});

let viewQuestions = [...QUESTIONS];
let optionOrders = loadJson(ORDER_KEY, {});

function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveOptionOrders() {
  localStorage.setItem(ORDER_KEY, JSON.stringify(optionOrders));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function markedQuestion(q) {
  const text = q.han;
  const word = q.word;
  const pos = text.indexOf(word);
  const han = pos < 0
    ? escapeHtml(text)
    : `${escapeHtml(text.slice(0, pos))}<mark>${escapeHtml(word)}</mark>${escapeHtml(text.slice(pos + word.length))}`;

  return `<span class="han">${han}</span> Trong câu này, ${escapeHtml(word)} là:`;
}

function searchableText(q) {
  return [
    q.id,
    q.han,
    q.word,
    ...q.options,
    q.page ? `trang ${q.page}` : ''
  ].join(' ').toLowerCase();
}

function shuffleArray(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getOrderedOptions(q) {
  const order = optionOrders[q.id];
  if (!order) return q.options.map((text, index) => ({ index, text }));

  return order
    .map(index => ({ index, text: q.options[index] }))
    .filter(option => option.text !== undefined);
}

function currentSearchResults() {
  const keyword = search.value.trim().toLowerCase();
  if (!keyword) return viewQuestions;
  return viewQuestions.filter(q => searchableText(q).includes(keyword));
}

function render(list = currentSearchResults()) {
  quiz.innerHTML = list.map(q => {
    const orderedOptions = getOrderedOptions(q);
    return `
      <article class="card" data-id="${q.id}">
        <div class="q-head">
          <div class="q-title"><span class="q-num">Câu ${q.id}.</span> ${markedQuestion(q)}</div>
          <div class="source">${q.page ? `Trang ${q.page}` : 'Tài liệu gốc'}</div>
        </div>
        <div class="options">
          ${orderedOptions.map((option, displayIndex) => `
            <label class="option" data-index="${option.index}">
              <input type="radio" name="q${q.id}" value="${option.index}" ${state[q.id] === option.index ? 'checked' : ''}>
              <span><strong>${LETTERS[displayIndex] || LETTERS[option.index]}/</strong> ${escapeHtml(option.text)}</span>
            </label>
          `).join('')}
        </div>
        <div class="feedback" id="fb-${q.id}"></div>
      </article>
    `;
  }).join('');

  quiz.querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', handleAnswer);
  });

  Object.entries(state).forEach(([id, choice]) => mark(Number(id), Number(choice)));
  empty.hidden = list.length > 0;
  updateStats();
}

function handleAnswer(event) {
  const card = event.target.closest('.card');
  const id = Number(card.dataset.id);
  const choice = Number(event.target.value);
  state[id] = choice;
  saveState();
  mark(id, choice);
  updateStats();
}

function mark(id, choice) {
  const q = QUESTIONS.find(item => item.id === id);
  const card = quiz.querySelector(`[data-id="${id}"]`);
  if (!q || !card) return;

  const isRight = choice === q.answer;
  card.querySelectorAll('.option').forEach(label => {
    label.classList.remove('correct', 'wrong');
    const index = Number(label.dataset.index);
    if (index === choice) label.classList.add(isRight ? 'correct' : 'wrong');
  });

  const feedback = card.querySelector(`#fb-${id}`);
  const chosenText = q.options[choice] || '';
  const answerText = q.options[q.answer] || '';
  feedback.className = `feedback show ${isRight ? 'right' : 'wrong'}`;
  feedback.textContent = isRight
    ? `Đúng! Bạn chọn ${chosenText}.`
    : `Sai. Bạn chọn ${chosenText}. Đáp án đúng: ${answerText}.`;
}

function updateStats() {
  const answeredIds = Object.keys(state).filter(id => QUESTIONS.some(q => q.id === Number(id)));
  const answered = answeredIds.length;
  const correct = answeredIds.filter(id => {
    const q = QUESTIONS.find(item => item.id === Number(id));
    return q && q.answer === Number(state[id]);
  }).length;

  document.getElementById('done').textContent = answered;
  document.getElementById('correct').textContent = correct;
  document.getElementById('wrong').textContent = answered - correct;
  document.getElementById('progressBar').style.width = `${(answered / QUESTIONS.length) * 100}%`;
}

function resetQuiz() {
  if (!confirm('Bạn muốn xoá toàn bộ lựa chọn và làm lại từ đầu?')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ORDER_KEY);
  Object.keys(state).forEach(key => delete state[key]);
  optionOrders = {};
  viewQuestions = [...QUESTIONS];
  search.value = '';
  render();
}

function shuffleAnswers() {
  optionOrders = Object.fromEntries(
    QUESTIONS.map(q => [q.id, shuffleArray(q.options.map((_, index) => index))])
  );
  saveOptionOrders();
  render();
}

function shuffleQuestions() {
  viewQuestions = shuffleArray(viewQuestions);
  render();
}

document.getElementById('print').addEventListener('click', () => window.print());
document.getElementById('shuffleAnswers').addEventListener('click', shuffleAnswers);
document.getElementById('shuffleQuestions').addEventListener('click', shuffleQuestions);
document.getElementById('reset').addEventListener('click', resetQuiz);
search.addEventListener('input', () => render());

render();
