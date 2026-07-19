"use strict";

const STORAGE = {
  history: "ai-chat-web-history-v1",
  memory: "ai-chat-web-memory-v1",
  learned: "ai-chat-web-learned-v1",
};

const FALLBACK_RESPONSES = [
  "ខ្ញុំមិនទាន់ចេះឆ្លើយសំណួរនេះទេ។ អ្នកអាចបង្រៀនខ្ញុំដោយប្រើ /teach សំណួរ | ចម្លើយ",
  "សូមសរសេរសំណួរបែបផ្សេង ឬបង្រៀនខ្ញុំដោយ /teach សំណួរ | ចម្លើយ។",
  "I do not know that yet. Teach me with /teach question | answer",
];

const DEFAULT_KNOWLEDGE = [
  {
    patterns: ["សួស្តី", "ជំរាបសួរ", "hello", "hi", "hey"],
    responses: ["សួស្តី {name}! តើខ្ញុំអាចជួយអ្វីបាន?", "ជំរាបសួរ! រីករាយដែលបានជួបអ្នក។"],
  },
  {
    patterns: ["អ្នកឈ្មោះអ្វី", "who are you", "what is your name"],
    responses: ["ខ្ញុំឈ្មោះ AI Chat Bot។ ខ្ញុំជា AI ខ្នាតតូចដែលដំណើរការក្នុង browser របស់អ្នក។"],
  },
];

const elements = {
  form: document.querySelector("#chat-form"),
  input: document.querySelector("#message-input"),
  send: document.querySelector("#send-button"),
  messages: document.querySelector("#messages"),
  suggestions: document.querySelector("#suggestions"),
  clear: document.querySelector("#clear-chat"),
  template: document.querySelector("#message-template"),
};

const state = {
  entries: [],
  documents: [],
  idf: new Map(),
  memory: readStorage(STORAGE.memory, {}),
  learned: readStorage(STORAGE.learned, []),
  history: readStorage(STORAGE.history, []),
  busy: false,
};

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Chat remains usable when private browsing blocks storage.
  }
}

function normalize(text) {
  return String(text)
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}_\u1780-\u17ff]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function features(text) {
  const clean = normalize(text);
  const values = new Map();
  const add = (key, amount = 1) => values.set(key, (values.get(key) || 0) + amount);
  if (!clean) return values;

  clean.split(" ").forEach((word) => add(`w:${word}`, 2));
  const compact = clean.replaceAll(" ", "_");
  [2, 3, 4].forEach((size) => {
    for (let index = 0; index <= compact.length - size; index += 1) {
      add(`c:${compact.slice(index, index + size)}`);
    }
  });
  return values;
}

function buildIndex() {
  const documents = [];
  const frequencies = new Map();
  const validEntries = state.entries.filter(
    (entry) => Array.isArray(entry.patterns) && Array.isArray(entry.responses) && entry.patterns.length && entry.responses.length,
  );

  validEntries.forEach((entry) => {
    const responses = entry.responses.map(String).filter((value) => value.trim());
    entry.patterns.forEach((pattern) => {
      const vector = features(pattern);
      if (!vector.size || !responses.length) return;
      documents.push({ vector, responses });
      vector.forEach((_, key) => frequencies.set(key, (frequencies.get(key) || 0) + 1));
    });
  });

  const count = Math.max(1, documents.length);
  state.idf = new Map(
    [...frequencies].map(([key, frequency]) => [key, Math.log((count + 1) / (frequency + 1)) + 1]),
  );
  state.documents = documents;
}

function similarity(left, right) {
  let numerator = 0;
  let leftLength = 0;
  let rightLength = 0;

  left.forEach((value, key) => {
    const weighted = value * (state.idf.get(key) || 1);
    leftLength += weighted ** 2;
    if (right.has(key)) numerator += value * right.get(key) * (state.idf.get(key) || 1) ** 2;
  });
  right.forEach((value, key) => {
    const weighted = value * (state.idf.get(key) || 1);
    rightLength += weighted ** 2;
  });
  return leftLength && rightLength ? numerator / Math.sqrt(leftLength * rightLength) : 0;
}

function choose(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function formatResponse(text) {
  const now = new Date();
  return String(text)
    .replaceAll("{name}", state.memory.name || "មិត្តភក្តិ")
    .replaceAll("{time}", now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    .replaceAll("{date}", now.toLocaleDateString("km-KH", { year: "numeric", month: "long", day: "numeric" }));
}

function rememberOrRecallName(message) {
  const rememberPatterns = [
    /(?:ខ្ញុំឈ្មោះ|ឈ្មោះខ្ញុំគឺ)\s+([^\s,.!?]{1,40})/iu,
    /(?:my name is|call me)\s+([\p{L}\p{N}_'-]{1,40})/iu,
  ];
  for (const pattern of rememberPatterns) {
    const match = message.match(pattern);
    if (match) {
      state.memory.name = match[1].trim();
      writeStorage(STORAGE.memory, state.memory);
      return `រីករាយដែលបានស្គាល់ ${state.memory.name}! ខ្ញុំនឹងចងចាំឈ្មោះរបស់អ្នកក្នុង browser នេះ។`;
    }
  }

  const clean = normalize(message);
  const recallQuestions = ["តើខ្ញុំឈ្មោះអ្វី", "ចាំឈ្មោះខ្ញុំទេ", "what is my name", "do you remember my name"];
  if (recallQuestions.some((question) => clean.includes(normalize(question)))) {
    return state.memory.name
      ? `អ្នកឈ្មោះ ${state.memory.name}។`
      : "ខ្ញុំមិនទាន់ស្គាល់ឈ្មោះអ្នកទេ។ សរសេរ៖ ខ្ញុំឈ្មោះ [ឈ្មោះរបស់អ្នក]";
  }
  return null;
}

function teach(message) {
  if (!message.toLocaleLowerCase().startsWith("/teach")) return null;
  const lesson = message.slice(6).trim();
  if (!lesson.includes("|")) return "របៀបប្រើ៖ /teach សំណួរ | ចម្លើយ";
  const [question, ...answerParts] = lesson.split("|");
  const answer = answerParts.join("|").trim();
  if (question.trim().length < 2 || answer.length < 2) return "សំណួរ និងចម្លើយត្រូវមានយ៉ាងតិច 2 តួអក្សរ។";

  state.learned.push({ patterns: [question.trim().slice(0, 500)], responses: [answer.slice(0, 2000)] });
  state.learned = state.learned.slice(-100);
  writeStorage(STORAGE.learned, state.learned);
  state.entries = [...state.entries.filter((entry) => !entry.__learned), ...state.learned.map((entry) => ({ ...entry, __learned: true }))];
  buildIndex();
  return "ខ្ញុំបានរៀនចម្លើយថ្មី ហើយរក្សាទុកក្នុង browser នេះហើយ ✅";
}

function calculate(message) {
  const khmerDigits = "០១២៣៤៥៦៧៨៩";
  const normalized = String(message)
    .replace(/[០-៩]/g, (digit) => String(khmerDigits.indexOf(digit)))
    .replace(/[×xX]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-");

  const candidates = normalized.match(/[\d\s()+\-*/%.]+/g) || [];
  const expression = candidates
    .map((candidate) => candidate.trim())
    .filter((candidate) => /\d/.test(candidate) && /[+\-*/%]/.test(candidate))
    .sort((left, right) => right.length - left.length)[0];
  if (!expression || expression.length > 120) return null;

  const compact = expression.replace(/\s+/g, "");
  const tokens = compact.match(/\d+(?:\.\d+)?|[()+\-*/%]/g);
  if (!tokens || tokens.join("") !== compact) return null;

  let index = 0;
  const parsePrimary = () => {
    const token = tokens[index++];
    if (token === "+") return parsePrimary();
    if (token === "-") return -parsePrimary();
    if (token === "(") {
      const value = parseSum();
      if (tokens[index++] !== ")") throw new Error("parenthesis");
      return value;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error("number");
    return value;
  };
  const parseProduct = () => {
    let value = parsePrimary();
    while (["*", "/", "%"].includes(tokens[index])) {
      const operator = tokens[index++];
      const right = parsePrimary();
      if ((operator === "/" || operator === "%") && right === 0) throw new Error("zero");
      if (operator === "*") value *= right;
      if (operator === "/") value /= right;
      if (operator === "%") value %= right;
    }
    return value;
  };
  const parseSum = () => {
    let value = parseProduct();
    while (["+", "-"].includes(tokens[index])) {
      const operator = tokens[index++];
      const right = parseProduct();
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  try {
    const result = parseSum();
    if (index !== tokens.length || !Number.isFinite(result)) return "មិនអាចគណនាកន្សោមនេះបានទេ។";
    const rounded = Number.isInteger(result) ? result : Number(result.toPrecision(12));
    const shownExpression = compact.replaceAll("*", "×").replaceAll("/", "÷");
    return `${shownExpression} = ${rounded.toLocaleString("en-US", { maximumFractionDigits: 12 })}`;
  } catch (error) {
    return error.message === "zero" ? "មិនអាចចែកនឹងសូន្យបានទេ។" : "សូមពិនិត្យរូបមន្តគណនាម្តងទៀត។";
  }
}

function respond(message) {
  const lessonResponse = teach(message);
  if (lessonResponse) return lessonResponse;
  const calculationResponse = calculate(message);
  if (calculationResponse) return calculationResponse;
  const memoryResponse = rememberOrRecallName(message);
  if (memoryResponse) return memoryResponse;

  const query = features(message);
  let bestScore = 0;
  let bestResponses = null;
  state.documents.forEach(({ vector, responses }) => {
    const score = similarity(query, vector);
    if (score > bestScore) {
      bestScore = score;
      bestResponses = responses;
    }
  });
  return formatResponse(bestResponses && bestScore >= 0.3 ? choose(bestResponses) : choose(FALLBACK_RESPONSES));
}

function messageTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderMessage(item, options = {}) {
  const fragment = elements.template.content.cloneNode(true);
  const article = fragment.querySelector(".message");
  const avatar = fragment.querySelector(".avatar");
  const paragraph = fragment.querySelector("p");
  const time = fragment.querySelector("time");

  article.classList.add(item.role === "user" ? "user" : "assistant");
  if (options.typing) article.classList.add("typing");
  article.dataset.messageId = item.id;
  avatar.textContent = item.role === "user" ? "YOU" : "AI";
  paragraph.textContent = options.typing ? "" : item.text;
  time.textContent = options.typing ? "" : messageTime(item.timestamp);
  elements.messages.append(fragment);
  elements.messages.scrollTop = elements.messages.scrollHeight;
  return article;
}

function addMessage(role, text) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text: String(text).slice(0, 2400),
    timestamp: Date.now(),
  };
  state.history.push(item);
  state.history = state.history.slice(-80);
  writeStorage(STORAGE.history, state.history);
  renderMessage(item);
  return item;
}

function setBusy(value) {
  state.busy = value;
  elements.send.disabled = value;
  elements.input.disabled = value;
}

async function sendMessage(rawMessage) {
  const message = rawMessage.trim();
  if (!message || state.busy) return;

  addMessage("user", message);
  elements.input.value = "";
  resizeInput();
  setBusy(true);

  const typing = renderMessage(
    { id: "typing", role: "assistant", text: "", timestamp: Date.now() },
    { typing: true },
  );
  await new Promise((resolve) => setTimeout(resolve, 320 + Math.random() * 380));
  typing.remove();
  addMessage("assistant", respond(message));
  setBusy(false);
  elements.input.focus();
}

function resizeInput() {
  elements.input.style.height = "auto";
  elements.input.style.height = `${Math.min(elements.input.scrollHeight, 130)}px`;
}

async function initialize() {
  let builtIn = DEFAULT_KNOWLEDGE;
  try {
    const response = await fetch("knowledge.json", { cache: "no-cache" });
    if (response.ok) builtIn = await response.json();
  } catch {
    // The embedded starter knowledge keeps the page usable offline.
  }
  state.entries = [...builtIn, ...state.learned.map((entry) => ({ ...entry, __learned: true }))];
  buildIndex();

  if (!Array.isArray(state.history) || !state.history.length) {
    state.history = [];
    addMessage("assistant", "សួស្តី! ខ្ញុំជា AI Chat Bot របស់ Vunheng11133។ សាកសួរខ្ញុំជាភាសាខ្មែរ ឬអង់គ្លេសបាន។");
  } else {
    state.history.filter((item) => item && ["user", "assistant"].includes(item.role) && item.text).forEach((item) => renderMessage(item));
  }
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(elements.input.value);
});

elements.input.addEventListener("input", resizeInput);
elements.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    elements.form.requestSubmit();
  }
});

elements.suggestions.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-message]");
  if (button) sendMessage(button.dataset.message);
});

elements.clear.addEventListener("click", () => {
  if (!window.confirm("តើអ្នកចង់លុបប្រវត្តិសន្ទនាមែនទេ?")) return;
  state.history = [];
  writeStorage(STORAGE.history, state.history);
  elements.messages.replaceChildren();
  addMessage("assistant", "បានលុបប្រវត្តិសន្ទនាហើយ។ តើយើងចាប់ផ្តើមនិយាយអំពីអ្វី?");
});

initialize();
