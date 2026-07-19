"use strict";

const STORAGE = {
  profiles: "ai-chat-web-profiles-v2",
  activeProfile: "ai-chat-web-active-profile-v2",
  workspaces: "ai-chat-web-workspaces-v2",
  memories: "ai-chat-web-memories-v2",
  modes: "ai-chat-web-modes-v2",
  legacyHistory: "ai-chat-web-history-v1",
  legacyMemory: "ai-chat-web-memory-v1",
};

const MODES = {
  fast: {
    number: "1",
    name: "Fast",
    hint: "Fast · ចម្លើយរហ័សពីចំណេះដឹងក្នុងកូដ",
    threshold: 0.29,
    delay: [80, 170],
  },
  thinking: {
    number: "2",
    name: "Thinking",
    hint: "Thinking · ពិនិត្យការផ្គូផ្គងច្រើនមុនជ្រើសចម្លើយ",
    threshold: 0.27,
    delay: [620, 980],
  },
  pro: {
    number: "3",
    name: "Pro",
    hint: "Pro · គណិតកម្រិតខ្ពស់ និងចំណេះដឹងកូដ",
    threshold: 0.25,
    delay: [230, 420],
  },
};

const FALLBACK_RESPONSES = {
  fast: [
    "ខ្ញុំមិនទាន់មានចម្លើយនេះក្នុងចំណេះដឹងទេ។ សូមសួរខ្លី និងច្បាស់ជាងនេះ។",
    "ខ្ញុំមិនទាន់យល់សំណួរនេះទេ។ សាកសរសេរបែបផ្សេងម្តង។",
  ],
  thinking: [
    "ខ្ញុំបានពិនិត្យការផ្គូផ្គងដែលមាន ប៉ុន្តែមិនទាន់ឃើញចម្លើយដែលមានទំនុកចិត្តគ្រប់គ្រាន់ទេ។ សូមបន្ថែមព័ត៌មានលម្អិត។",
    "សំណួរនេះអាចមានន័យច្រើន។ សូមបញ្ជាក់ប្រធានបទ ឬផ្តល់ឧទាហរណ៍មួយ។",
  ],
  pro: [
    "ខ្ញុំមិនទាន់មានរូបមន្ត ឬចំណេះដឹងគ្រប់គ្រាន់សម្រាប់សំណួរនេះទេ។ សូមផ្តល់លេខ កូដ ឬបញ្ហាឲ្យច្បាស់។",
    "Pro mode នេះជាម៉ាស៊ីនក្នុង browser មិនមែន LLM ទេ។ សូមសាកសំណួរគណិត ឬកូដដែលមានលក្ខខណ្ឌច្បាស់។",
  ],
};

const DEFAULT_KNOWLEDGE = [
  {
    category: "greeting",
    patterns: ["សួស្តី", "ជំរាបសួរ", "hello", "hi", "hey"],
    responses: ["សួស្តី {name}! តើខ្ញុំអាចជួយអ្វីបាន?", "ជំរាបសួរ! រីករាយដែលបានជួបអ្នក។"],
  },
  {
    category: "identity",
    patterns: ["អ្នកជាអ្នកណា", "អ្នកឈ្មោះអ្វី", "who are you", "what is your name"],
    responses: ["ខ្ញុំគឺជា AI Chat Bot របស់ Vunheng11133។ ខ្ញុំដំណើរការដោយ JavaScript និងចំណេះដឹងក្នុងកូដ។"],
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
  statusText: document.querySelector("#status-text"),
  openSidebar: document.querySelector("#open-sidebar"),
  closeSidebar: document.querySelector("#close-sidebar"),
  sidebar: document.querySelector("#sidebar"),
  drawerBackdrop: document.querySelector("#drawer-backdrop"),
  newChat: document.querySelector("#new-chat"),
  chatSearch: document.querySelector("#chat-search"),
  pinnedSection: document.querySelector("#pinned-section"),
  pinnedList: document.querySelector("#pinned-list"),
  recentList: document.querySelector("#recent-list"),
  pinnedCount: document.querySelector("#pinned-count"),
  recentCount: document.querySelector("#recent-count"),
  modelPicker: document.querySelector("#model-picker"),
  modelTrigger: document.querySelector("#model-trigger"),
  modelMenu: document.querySelector("#model-menu"),
  modelNumber: document.querySelector("#model-number"),
  modelName: document.querySelector("#model-name"),
  modeHint: document.querySelector("#mode-hint"),
  openAccount: document.querySelector("#open-account"),
  openAccountSidebar: document.querySelector("#open-account-sidebar"),
  closeAccount: document.querySelector("#close-account"),
  accountModal: document.querySelector("#account-modal"),
  accountBackdrop: document.querySelector("#account-backdrop"),
  profileList: document.querySelector("#profile-list"),
  profileForm: document.querySelector("#profile-form"),
  profileName: document.querySelector("#profile-name"),
  sidebarProfileName: document.querySelector("#sidebar-profile-name"),
  sidebarProfileAvatar: document.querySelector("#sidebar-profile-avatar"),
  topProfileAvatar: document.querySelector("#top-profile-avatar"),
  toast: document.querySelector("#toast"),
};

const state = {
  entries: [],
  documents: [],
  idf: new Map(),
  profiles: [],
  activeProfileId: "",
  workspaces: {},
  memories: {},
  modes: {},
  memory: {},
  busy: false,
  toastTimer: null,
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
    // The chat remains usable when private browsing blocks storage.
  }
}

function createId(prefix) {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

function makeMessage(role, text, timestamp = Date.now()) {
  return {
    id: createId("msg"),
    role,
    text: String(text).slice(0, 4000),
    timestamp,
  };
}

function activeProfile() {
  return state.profiles.find((profile) => profile.id === state.activeProfileId) || state.profiles[0];
}

function greetingForProfile() {
  const profile = activeProfile();
  const name = profile?.id === "guest" ? "មិត្តភក្តិ" : profile?.name || "មិត្តភក្តិ";
  return `សួស្តី ${name}! ខ្ញុំគឺជា AI Chat Bot របស់ Vunheng11133។ ជ្រើស 1 Fast, 2 Thinking ឬ 3 Pro ហើយសាកសួរខ្ញុំបាន។`;
}

function makeChat() {
  const timestamp = Date.now();
  return {
    id: createId("chat"),
    title: "សន្ទនាថ្មី",
    messages: [makeMessage("assistant", greetingForProfile(), timestamp)],
    pinned: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function ensureWorkspace(profileId) {
  let workspace = state.workspaces[profileId];
  if (!workspace || !Array.isArray(workspace.chats)) {
    const chat = makeChat();
    workspace = { activeChatId: chat.id, chats: [chat] };
    state.workspaces[profileId] = workspace;
  }

  workspace.chats = workspace.chats.filter((chat) => chat && chat.id && Array.isArray(chat.messages));
  if (!workspace.chats.length) {
    const chat = makeChat();
    workspace.chats.push(chat);
    workspace.activeChatId = chat.id;
  }
  if (!workspace.chats.some((chat) => chat.id === workspace.activeChatId)) {
    workspace.activeChatId = workspace.chats[0].id;
  }
  return workspace;
}

function activeWorkspace() {
  return ensureWorkspace(state.activeProfileId);
}

function activeChat() {
  const workspace = activeWorkspace();
  return workspace.chats.find((chat) => chat.id === workspace.activeChatId) || workspace.chats[0];
}

function persistCore() {
  writeStorage(STORAGE.profiles, state.profiles);
  writeStorage(STORAGE.activeProfile, state.activeProfileId);
  writeStorage(STORAGE.workspaces, state.workspaces);
  writeStorage(STORAGE.memories, state.memories);
  writeStorage(STORAGE.modes, state.modes);
}

function initializeStoredData() {
  const savedProfiles = readStorage(STORAGE.profiles, []);
  state.profiles = Array.isArray(savedProfiles) ? savedProfiles.filter((profile) => profile?.id && profile?.name) : [];
  if (!state.profiles.length) {
    state.profiles = [{ id: "guest", name: "ភ្ញៀវ", provider: "local", createdAt: Date.now() }];
  }

  const requestedProfile = readStorage(STORAGE.activeProfile, state.profiles[0].id);
  state.activeProfileId = state.profiles.some((profile) => profile.id === requestedProfile)
    ? requestedProfile
    : state.profiles[0].id;

  state.workspaces = readStorage(STORAGE.workspaces, {});
  if (!state.workspaces || typeof state.workspaces !== "object" || Array.isArray(state.workspaces)) state.workspaces = {};
  state.memories = readStorage(STORAGE.memories, {});
  if (!state.memories || typeof state.memories !== "object" || Array.isArray(state.memories)) state.memories = {};
  state.modes = readStorage(STORAGE.modes, {});
  if (!state.modes || typeof state.modes !== "object" || Array.isArray(state.modes)) state.modes = {};

  const hasVersionTwoWorkspace = Object.keys(state.workspaces).length > 0;
  if (!hasVersionTwoWorkspace) {
    const legacyHistory = readStorage(STORAGE.legacyHistory, []);
    const legacyMemory = readStorage(STORAGE.legacyMemory, {});
    if (Array.isArray(legacyHistory) && legacyHistory.length) {
      const timestamp = Date.now();
      const chat = {
        id: createId("chat"),
        title: titleFromMessages(legacyHistory),
        messages: legacyHistory
          .filter((item) => item && ["user", "assistant"].includes(item.role) && item.text)
          .map((item) => ({
            id: item.id || createId("msg"),
            role: item.role,
            text: String(item.text).slice(0, 4000),
            timestamp: Number(item.timestamp) || timestamp,
          })),
        pinned: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      state.workspaces[state.activeProfileId] = { activeChatId: chat.id, chats: [chat] };
      state.memories[state.activeProfileId] = legacyMemory && typeof legacyMemory === "object" ? legacyMemory : {};
    }
  }

  state.profiles.forEach((profile) => {
    ensureWorkspace(profile.id);
    if (!state.memories[profile.id] || typeof state.memories[profile.id] !== "object") state.memories[profile.id] = {};
    if (!MODES[state.modes[profile.id]]) state.modes[profile.id] = "fast";
  });
  state.memory = state.memories[state.activeProfileId];
  persistCore();
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
    for (let index = 0; index <= compact.length - size; index += 1) add(`c:${compact.slice(index, index + size)}`);
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
      documents.push({
        vector,
        responses,
        category: String(entry.category || "general"),
        normalizedPattern: normalize(pattern),
      });
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

function rankedMatches(message) {
  const query = features(message);
  const clean = normalize(message);
  return state.documents
    .map((document) => {
      let score = similarity(query, document.vector);
      if (clean === document.normalizedPattern) score += 0.32;
      else if (clean.includes(document.normalizedPattern) || document.normalizedPattern.includes(clean)) score += 0.08;
      return { ...document, score };
    })
    .sort((left, right) => right.score - left.score);
}

function choose(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function formatResponse(text) {
  const now = new Date();
  return String(text)
    .replaceAll("{name}", state.memory.name || activeProfile()?.name || "មិត្តភក្តិ")
    .replaceAll("{time}", now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))
    .replaceAll("{date}", now.toLocaleDateString("km-KH", { year: "numeric", month: "long", day: "numeric" }));
}

function writeMemory() {
  state.memories[state.activeProfileId] = state.memory;
  writeStorage(STORAGE.memories, state.memories);
}

function rememberOrRecall(message) {
  const rememberPatterns = [
    /(?:ខ្ញុំឈ្មោះ|ឈ្មោះខ្ញុំគឺ)\s+([^\s,.!?]{1,40})/iu,
    /(?:my name is|call me)\s+([\p{L}\p{N}_'-]{1,40})/iu,
  ];
  for (const pattern of rememberPatterns) {
    const match = message.match(pattern);
    if (match) {
      state.memory.name = match[1].trim();
      writeMemory();
      return `រីករាយដែលបានស្គាល់ ${state.memory.name}! ខ្ញុំនឹងចងចាំឈ្មោះនេះសម្រាប់ profile បច្ចុប្បន្ន។`;
    }
  }

  const toLatinDigits = (value) => String(value).replace(/[០-៩]/g, (digit) => String("០១២៣៤៥៦៧៨៩".indexOf(digit)));
  const ageMatch = message.match(/(?:ខ្ញុំអាយុ|អាយុខ្ញុំគឺ|i am)\s*([0-9០-៩]{1,3})(?:\s*(?:ឆ្នាំ|years? old))?/iu);
  if (ageMatch) {
    const age = Number(toLatinDigits(ageMatch[1]));
    if (age > 0 && age < 130) {
      state.memory.age = age;
      writeMemory();
      return `ខ្ញុំបានចងចាំថាអ្នកអាយុ ${age} ឆ្នាំ។`;
    }
  }

  const facts = [
    { regex: /(?:ខ្ញុំរស់នៅ|ទីលំនៅខ្ញុំគឺ|i live in)\s+(.{2,70})/iu, key: "location", label: "អ្នករស់នៅ" },
    { regex: /(?:ខ្ញុំមិនចូលចិត្ត|i do not like|i don't like)\s+(.{2,100})/iu, key: "dislike", label: "អ្នកមិនចូលចិត្ត" },
    { regex: /(?:ខ្ញុំចូលចិត្ត|i like)\s+(.{2,100})/iu, key: "like", label: "អ្នកចូលចិត្ត" },
  ];
  for (const fact of facts) {
    const match = message.match(fact.regex);
    if (match) {
      state.memory[fact.key] = match[1].trim().replace(/[.!?។]+$/u, "");
      writeMemory();
      return `ខ្ញុំបានចងចាំថា${fact.label} ${state.memory[fact.key]}។`;
    }
  }

  const clean = normalize(message);
  if (["តើខ្ញុំឈ្មោះអ្វី", "ចាំឈ្មោះខ្ញុំទេ", "what is my name"].some((question) => clean.includes(normalize(question)))) {
    return state.memory.name ? `អ្នកឈ្មោះ ${state.memory.name}។` : "ខ្ញុំមិនទាន់ស្គាល់ឈ្មោះអ្នកទេ។ សរសេរ៖ ខ្ញុំឈ្មោះ [ឈ្មោះ]";
  }
  if (["ខ្ញុំអាយុប៉ុន្មាន", "what is my age", "how old am i"].some((question) => clean.includes(normalize(question)))) {
    return state.memory.age ? `អ្នកអាយុ ${state.memory.age} ឆ្នាំ។` : "អ្នកមិនទាន់ប្រាប់អាយុឱ្យខ្ញុំចងចាំទេ។";
  }
  if (["ខ្ញុំរស់នៅណា", "where do i live"].some((question) => clean.includes(normalize(question)))) {
    return state.memory.location ? `អ្នករស់នៅ ${state.memory.location}។` : "អ្នកមិនទាន់ប្រាប់ទីកន្លែងរស់នៅឱ្យខ្ញុំចងចាំទេ។";
  }
  if (["ខ្ញុំចូលចិត្តអ្វី", "what do i like"].some((question) => clean.includes(normalize(question)))) {
    return state.memory.like ? `អ្នកចូលចិត្ត ${state.memory.like}។` : "អ្នកមិនទាន់ប្រាប់អ្វីដែលអ្នកចូលចិត្តទេ។";
  }
  if (["តើអ្នកចងចាំអ្វីអំពីខ្ញុំ", "what do you remember about me"].some((question) => clean.includes(normalize(question)))) {
    const remembered = [];
    if (state.memory.name) remembered.push(`ឈ្មោះ ${state.memory.name}`);
    if (state.memory.age) remembered.push(`អាយុ ${state.memory.age} ឆ្នាំ`);
    if (state.memory.location) remembered.push(`រស់នៅ ${state.memory.location}`);
    if (state.memory.like) remembered.push(`ចូលចិត្ត ${state.memory.like}`);
    if (state.memory.dislike) remembered.push(`មិនចូលចិត្ត ${state.memory.dislike}`);
    return remembered.length ? `ខ្ញុំចងចាំថាអ្នក៖ ${remembered.join(" · ")}។` : "ខ្ញុំមិនទាន់មានព័ត៌មានអំពីអ្នកសម្រាប់ចងចាំទេ។";
  }
  return null;
}

function normalizeMathText(message) {
  return String(message)
    .replace(/[០-៩]/g, (digit) => String("០១២៣៤៥៦៧៨៩".indexOf(digit)))
    .replace(/(\d)\s*[xX]\s*(?=\d)/g, "$1*")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–—]/g, "-")
    .trim();
}

function factorial(value) {
  if (!Number.isInteger(value) || value < 0 || value > 170) throw new Error("factorial");
  let result = 1;
  for (let number = 2; number <= value; number += 1) result *= number;
  return result;
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(Math.trunc(left));
  let b = Math.abs(Math.trunc(right));
  while (b) [a, b] = [b, a % b];
  return a;
}

function formatNumber(value) {
  const rounded = Number.isInteger(value) ? value : Number(value.toPrecision(12));
  return rounded.toLocaleString("en-US", { maximumFractionDigits: 12 });
}

function parseExpression(expression, allowAdvanced) {
  const compact = expression.replace(/\s+/g, "");
  const tokenPattern = allowAdvanced ? /\d+(?:\.\d+)?|[()+\-*/%^!]/g : /\d+(?:\.\d+)?|[()+\-*/%]/g;
  const tokens = compact.match(tokenPattern);
  if (!tokens || tokens.join("") !== compact) throw new Error("syntax");
  let index = 0;

  const parseAtom = () => {
    const token = tokens[index++];
    if (token === "(") {
      const value = parseSum();
      if (tokens[index++] !== ")") throw new Error("parenthesis");
      return value;
    }
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error("number");
    return value;
  };
  const parsePostfix = () => {
    let value = parseAtom();
    while (allowAdvanced && tokens[index] === "!") {
      index += 1;
      value = factorial(value);
    }
    return value;
  };
  const parsePower = () => {
    let value = parsePostfix();
    if (allowAdvanced && tokens[index] === "^") {
      index += 1;
      value **= parseUnary();
    }
    return value;
  };
  const parseUnary = () => {
    if (tokens[index] === "+") {
      index += 1;
      return parseUnary();
    }
    if (tokens[index] === "-") {
      index += 1;
      return -parseUnary();
    }
    return parsePower();
  };
  const parseProduct = () => {
    let value = parseUnary();
    while (["*", "/", "%"].includes(tokens[index])) {
      const operator = tokens[index++];
      const right = parseUnary();
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

  const result = parseSum();
  if (index !== tokens.length || !Number.isFinite(result)) throw new Error("result");
  return result;
}

function evaluateNamedFunction(name, args) {
  let result;
  if (name === "sqrt" && args.length === 1) result = Math.sqrt(args[0]);
  else if (name === "pow" && args.length === 2) result = args[0] ** args[1];
  else if (name === "gcd" && args.length === 2) result = greatestCommonDivisor(args[0], args[1]);
  else if (name === "lcm" && args.length === 2) {
    const divisor = greatestCommonDivisor(args[0], args[1]);
    result = divisor === 0 ? 0 : Math.abs(args[0] * args[1]) / divisor;
  } else if (name === "abs" && args.length === 1) result = Math.abs(args[0]);
  else if (["sin", "cos", "tan"].includes(name) && args.length === 1) {
    const radians = (args[0] * Math.PI) / 180;
    result = Math[name](radians);
  } else throw new Error("parameters");

  if (!Number.isFinite(result)) throw new Error("result");
  return result;
}

function expandAdvancedMath(normalized) {
  let expression = normalized;
  let changed = false;
  const percentagePattern = /(-?\d+(?:\.\d+)?)\s*%\s*(?:of|នៃ)\s*(-?\d+(?:\.\d+)?)/iu;
  const functionPattern = /\b(sqrt|pow|gcd|lcm|abs|sin|cos|tan)\s*\(([^()]*)\)/i;

  for (let pass = 0; pass < 20; pass += 1) {
    const percentage = expression.match(percentagePattern);
    if (percentage) {
      const result = (Number(percentage[1]) / 100) * Number(percentage[2]);
      expression = expression.replace(percentage[0], `(${result})`);
      changed = true;
      continue;
    }

    const functionMatch = expression.match(functionPattern);
    if (!functionMatch) break;
    const args = functionMatch[2].split(",").map((value) => Number(value.trim()));
    if (!args.length || args.some((value) => !Number.isFinite(value))) throw new Error("parameters");
    const result = evaluateNamedFunction(functionMatch[1].toLowerCase(), args);
    expression = expression.replace(functionMatch[0], `(${result})`);
    changed = true;
  }
  return { expression, changed };
}

function calculate(message, mode) {
  const normalized = normalizeMathText(message);
  const hasAdvancedRequest = /\b(?:sqrt|pow|gcd|lcm|abs|sin|cos|tan)\s*\(|\^|!/i.test(normalized);
  if (hasAdvancedRequest && mode !== "pro") return "សូមជ្រើស «3 Pro» ដើម្បីប្រើ sqrt, power (^), factorial (!), gcd, lcm និងត្រីកោណមាត្រ។";
  let mathText = normalized;
  let expandedAdvanced = false;
  if (mode === "pro") {
    try {
      const expanded = expandAdvancedMath(normalized);
      mathText = expanded.expression;
      expandedAdvanced = expanded.changed;
    } catch (error) {
      if (error.message === "parameters") return "ចំនួន parameter មិនត្រឹមត្រូវសម្រាប់មុខងារគណិតនេះទេ។";
      return "លទ្ធផលគណិតនេះមិនមែនជាចំនួនកំណត់ទេ។";
    }
  }

  const candidatePattern = mode === "pro" ? /[\d\s()+\-*/%^!.]+/g : /[\d\s()+\-*/%.]+/g;
  const candidates = mathText.match(candidatePattern) || [];
  const expression = candidates
    .map((candidate) => candidate.trim())
    .filter((candidate) => /\d/.test(candidate) && (expandedAdvanced || /[+\-*/%^!]/.test(candidate)))
    .sort((left, right) => right.length - left.length)[0];
  if (!expression || expression.length > 160) return null;

  try {
    const result = parseExpression(expression, mode === "pro");
    const displayExpression = expandedAdvanced ? normalized : expression;
    const shown = displayExpression.replace(/\s+/g, " ").trim().replaceAll("*", "×").replaceAll("/", "÷");
    return `${shown} = ${formatNumber(result)}`;
  } catch (error) {
    if (error.message === "zero") return "មិនអាចចែកនឹងសូន្យបានទេ។";
    if (error.message === "factorial") return "Factorial ត្រូវជាចំនួនគត់ចន្លោះ 0 និង 170។";
    return "សូមពិនិត្យរូបមន្តគណនាម្តងទៀត។";
  }
}

function identityResponse(message) {
  const clean = normalize(message);
  const identityQuestions = [
    "អ្នកជាអ្នកណា",
    "តើអ្នកជាអ្នកណា",
    "អ្នកឈ្មោះអ្វី",
    "who are you",
    "what are you",
    "what is your name",
  ];
  if (!identityQuestions.some((question) => clean.includes(normalize(question)))) return null;
  return "ខ្ញុំគឺជា AI Chat Bot របស់ Vunheng11133។ ខ្ញុំជា retrieval-based AI ដែលប្រើ JavaScript និងចំណេះដឹងក្នុងកូដ មិនមែនជា ChatGPT, OpenAI ឬ Gemini ទេ។";
}

function respond(message) {
  const mode = state.modes[state.activeProfileId] || "fast";
  const identity = identityResponse(message);
  if (identity) return identity;

  const calculation = calculate(message, mode);
  if (calculation) return calculation;
  const memoryResponse = rememberOrRecall(message);
  if (memoryResponse) return memoryResponse;

  const matches = rankedMatches(message);
  const selected = matches[0];
  const threshold = MODES[mode].threshold;
  if (selected && selected.score >= threshold) {
    if (mode === "thinking") {
      const sameAnswerMatches = matches
        .slice(0, 6)
        .filter((candidate) => candidate.responses === selected.responses || candidate.category === selected.category);
      const strongest = sameAnswerMatches.sort((left, right) => right.score - left.score)[0] || selected;
      return formatResponse(choose(strongest.responses));
    }
    return formatResponse(choose(selected.responses));
  }
  return formatResponse(choose(FALLBACK_RESPONSES[mode]));
}

function messageTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function relativeTime(timestamp) {
  const elapsed = Math.max(0, Date.now() - Number(timestamp || 0));
  if (elapsed < 60_000) return "ឥឡូវនេះ";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} នាទីមុន`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} ម៉ោងមុន`;
  return new Date(timestamp).toLocaleDateString("km-KH", { month: "short", day: "numeric" });
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

function renderActiveChat() {
  elements.messages.replaceChildren();
  activeChat().messages
    .filter((item) => item && ["user", "assistant"].includes(item.role) && item.text)
    .forEach((item) => renderMessage(item));
}

function titleFromText(text) {
  const value = String(text).replace(/\s+/g, " ").trim();
  return value.length > 34 ? `${value.slice(0, 34)}…` : value || "សន្ទនាថ្មី";
}

function titleFromMessages(messages) {
  const firstUser = messages.find((item) => item?.role === "user" && item?.text);
  return firstUser ? titleFromText(firstUser.text) : "សន្ទនាដំបូង";
}

function addMessage(role, text) {
  const chat = activeChat();
  const item = makeMessage(role, text);
  chat.messages.push(item);
  chat.messages = chat.messages.slice(-400);
  chat.updatedAt = Date.now();
  if (role === "user" && (chat.title === "សន្ទនាថ្មី" || !chat.title)) chat.title = titleFromText(text);
  writeStorage(STORAGE.workspaces, state.workspaces);
  renderMessage(item);
  renderConversationLists();
  return item;
}

function setBusy(value) {
  state.busy = value;
  elements.send.disabled = value;
  elements.input.disabled = value;
  elements.statusText.textContent = value ? `${MODES[state.modes[state.activeProfileId]].name} កំពុងពិនិត្យ...` : "ដំណើរការរួចរាល់";
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function sendMessage(rawMessage) {
  const message = rawMessage.trim();
  if (!message || state.busy) return;
  addMessage("user", message);
  elements.input.value = "";
  resizeInput();
  setBusy(true);

  const typing = renderMessage({ id: "typing", role: "assistant", text: "", timestamp: Date.now() }, { typing: true });
  const mode = state.modes[state.activeProfileId] || "fast";
  const [minimum, maximum] = MODES[mode].delay;
  await wait(minimum + Math.random() * (maximum - minimum));
  const response = respond(message);
  typing.remove();
  addMessage("assistant", response);
  setBusy(false);
  elements.input.focus();
}

function resizeInput() {
  elements.input.style.height = "auto";
  elements.input.style.height = `${Math.min(elements.input.scrollHeight, 130)}px`;
}

function renderConversationLists() {
  const workspace = activeWorkspace();
  const query = normalize(elements.chatSearch.value);
  const chats = [...workspace.chats]
    .filter((chat) => !query || normalize(chat.title).includes(query))
    .sort((left, right) => Number(right.updatedAt) - Number(left.updatedAt));
  const pinned = chats.filter((chat) => chat.pinned);
  const recent = chats.filter((chat) => !chat.pinned);
  elements.pinnedCount.textContent = String(pinned.length);
  elements.recentCount.textContent = String(recent.length);
  elements.pinnedSection.hidden = pinned.length === 0 && !query;
  renderConversationGroup(elements.pinnedList, pinned, "មិនមានសន្ទនាដែលបានខ្ទាស់");
  renderConversationGroup(elements.recentList, recent, query ? "រកមិនឃើញសន្ទនា" : "មិនមានប្រវត្តិសន្ទនា");
}

function renderConversationGroup(container, chats, emptyText) {
  container.replaceChildren();
  if (!chats.length) {
    const empty = document.createElement("p");
    empty.className = "conversation-empty";
    empty.textContent = emptyText;
    container.append(empty);
    return;
  }

  chats.forEach((chat) => {
    const item = document.createElement("div");
    item.className = `conversation-item${chat.id === activeWorkspace().activeChatId ? " active" : ""}`;
    const main = document.createElement("button");
    main.type = "button";
    main.className = "conversation-main";
    main.dataset.chatId = chat.id;
    const title = document.createElement("strong");
    title.textContent = chat.title || "សន្ទនាថ្មី";
    const time = document.createElement("time");
    time.textContent = relativeTime(chat.updatedAt);
    main.append(title, time);

    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = `pin-button${chat.pinned ? " pinned" : ""}`;
    pin.dataset.pinChatId = chat.id;
    pin.setAttribute("aria-label", chat.pinned ? "ដោះខ្ទាស់សន្ទនា" : "ខ្ទាស់សន្ទនា");
    pin.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 4 6 0 1 5 3 3-6 1-1 7-2-7-6-1 3-3 2-5Z"/></svg>';
    item.append(main, pin);
    container.append(item);
  });
}

function switchChat(chatId) {
  if (!activeWorkspace().chats.some((chat) => chat.id === chatId)) return;
  activeWorkspace().activeChatId = chatId;
  writeStorage(STORAGE.workspaces, state.workspaces);
  renderActiveChat();
  renderConversationLists();
  closeSidebar();
}

function createNewChat() {
  const chat = makeChat();
  const workspace = activeWorkspace();
  workspace.chats.unshift(chat);
  workspace.activeChatId = chat.id;
  writeStorage(STORAGE.workspaces, state.workspaces);
  renderActiveChat();
  renderConversationLists();
  closeSidebar();
  elements.input.focus();
}

function togglePin(chatId) {
  const chat = activeWorkspace().chats.find((item) => item.id === chatId);
  if (!chat) return;
  chat.pinned = !chat.pinned;
  chat.updatedAt = Date.now();
  writeStorage(STORAGE.workspaces, state.workspaces);
  renderConversationLists();
  showToast(chat.pinned ? "បានខ្ទាស់សន្ទនាឡើងលើ" : "បានដោះខ្ទាស់សន្ទនា");
}

function deleteActiveChat() {
  const workspace = activeWorkspace();
  const current = activeChat();
  if (!window.confirm(`តើអ្នកចង់លុប «${current.title}» មែនទេ?`)) return;
  workspace.chats = workspace.chats.filter((chat) => chat.id !== current.id);
  if (!workspace.chats.length) workspace.chats.push(makeChat());
  workspace.activeChatId = workspace.chats[0].id;
  writeStorage(STORAGE.workspaces, state.workspaces);
  renderActiveChat();
  renderConversationLists();
  showToast("បានលុបសន្ទនាហើយ");
}

function openSidebar() {
  elements.sidebar.classList.add("open");
  elements.sidebar.setAttribute("aria-hidden", "false");
  elements.drawerBackdrop.classList.add("open");
  document.body.classList.add("overlay-open");
}

function closeSidebar() {
  elements.sidebar.classList.remove("open");
  elements.sidebar.setAttribute("aria-hidden", "true");
  elements.drawerBackdrop.classList.remove("open");
  if (!elements.accountModal.classList.contains("open")) document.body.classList.remove("overlay-open");
}

function updateModeUI() {
  const modeKey = state.modes[state.activeProfileId] || "fast";
  const mode = MODES[modeKey];
  elements.modelNumber.textContent = mode.number;
  elements.modelName.textContent = mode.name;
  elements.modeHint.textContent = mode.hint;
  elements.modelMenu.querySelectorAll("[data-mode]").forEach((button) => {
    button.setAttribute("aria-checked", String(button.dataset.mode === modeKey));
  });
}

function setMode(modeKey) {
  if (!MODES[modeKey]) return;
  state.modes[state.activeProfileId] = modeKey;
  writeStorage(STORAGE.modes, state.modes);
  updateModeUI();
  closeModelMenu();
  showToast(`បានប្តូរទៅ ${MODES[modeKey].number} ${MODES[modeKey].name}`);
}

function toggleModelMenu() {
  const willOpen = elements.modelMenu.hidden;
  elements.modelMenu.hidden = !willOpen;
  elements.modelTrigger.setAttribute("aria-expanded", String(willOpen));
}

function closeModelMenu() {
  elements.modelMenu.hidden = true;
  elements.modelTrigger.setAttribute("aria-expanded", "false");
}

function profileInitial(name) {
  return String(name || "ភ").trim().slice(0, 1).toLocaleUpperCase() || "ភ";
}

function updateProfileUI() {
  const profile = activeProfile();
  const initial = profileInitial(profile?.name);
  elements.sidebarProfileName.textContent = profile?.name || "ភ្ញៀវ";
  elements.sidebarProfileAvatar.textContent = initial;
  elements.topProfileAvatar.textContent = initial;
  renderProfiles();
}

function renderProfiles() {
  elements.profileList.replaceChildren();
  state.profiles.forEach((profile) => {
    const row = document.createElement("div");
    row.className = `profile-row${profile.id === state.activeProfileId ? " active" : ""}`;
    const avatar = document.createElement("span");
    avatar.className = "profile-avatar";
    avatar.textContent = profileInitial(profile.name);
    const copy = document.createElement("span");
    copy.className = "profile-row-copy";
    const name = document.createElement("strong");
    name.textContent = profile.name;
    const type = document.createElement("small");
    type.textContent = profile.id === "guest" ? "Guest profile" : "Local profile · data ដាច់ដោយឡែក";
    copy.append(name, type);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "switch-profile";
    button.dataset.profileId = profile.id;
    button.textContent = profile.id === state.activeProfileId ? "កំពុងប្រើ" : "ប្តូរ";
    row.append(avatar, copy, button);
    elements.profileList.append(row);
  });
}

function switchProfile(profileId) {
  if (!state.profiles.some((profile) => profile.id === profileId)) return;
  state.activeProfileId = profileId;
  ensureWorkspace(profileId);
  if (!state.memories[profileId]) state.memories[profileId] = {};
  if (!MODES[state.modes[profileId]]) state.modes[profileId] = "fast";
  state.memory = state.memories[profileId];
  persistCore();
  updateProfileUI();
  updateModeUI();
  renderActiveChat();
  renderConversationLists();
  closeAccountModal();
  showToast(`បានប្តូរទៅ profile «${activeProfile().name}»`);
}

function createLocalProfile(name) {
  const cleanName = String(name).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 32);
  if (!cleanName) return;
  const profile = { id: createId("local"), name: cleanName, provider: "local", createdAt: Date.now() };
  state.profiles.push(profile);
  state.activeProfileId = profile.id;
  state.memories[profile.id] = {};
  state.memory = state.memories[profile.id];
  state.modes[profile.id] = "fast";
  ensureWorkspace(profile.id);
  persistCore();
  updateProfileUI();
  updateModeUI();
  renderActiveChat();
  renderConversationLists();
  elements.profileForm.reset();
  closeAccountModal();
  showToast(`បានបង្កើត Local profile «${cleanName}»`);
}

function openAccountModal() {
  closeSidebar();
  renderProfiles();
  elements.accountBackdrop.hidden = false;
  elements.accountModal.hidden = false;
  requestAnimationFrame(() => {
    elements.accountBackdrop.classList.add("open");
    elements.accountModal.classList.add("open");
  });
  document.body.classList.add("overlay-open");
}

function closeAccountModal() {
  elements.accountBackdrop.classList.remove("open");
  elements.accountModal.classList.remove("open");
  document.body.classList.remove("overlay-open");
  window.setTimeout(() => {
    if (!elements.accountModal.classList.contains("open")) {
      elements.accountBackdrop.hidden = true;
      elements.accountModal.hidden = true;
    }
  }, 190);
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3600);
}

function bindEvents() {
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
  elements.clear.addEventListener("click", deleteActiveChat);
  elements.openSidebar.addEventListener("click", openSidebar);
  elements.closeSidebar.addEventListener("click", closeSidebar);
  elements.drawerBackdrop.addEventListener("click", closeSidebar);
  elements.newChat.addEventListener("click", createNewChat);
  elements.chatSearch.addEventListener("input", renderConversationLists);
  [elements.pinnedList, elements.recentList].forEach((list) => {
    list.addEventListener("click", (event) => {
      const pin = event.target.closest("[data-pin-chat-id]");
      if (pin) togglePin(pin.dataset.pinChatId);
      const main = event.target.closest("[data-chat-id]");
      if (main) switchChat(main.dataset.chatId);
    });
  });
  elements.modelTrigger.addEventListener("click", toggleModelMenu);
  elements.modelMenu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (button) setMode(button.dataset.mode);
  });
  [elements.openAccount, elements.openAccountSidebar].forEach((button) => button.addEventListener("click", openAccountModal));
  elements.closeAccount.addEventListener("click", closeAccountModal);
  elements.accountBackdrop.addEventListener("click", closeAccountModal);
  elements.profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    createLocalProfile(elements.profileName.value);
  });
  elements.profileList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-profile-id]");
    if (button) switchProfile(button.dataset.profileId);
  });
  document.querySelectorAll("[data-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(`${button.dataset.provider} login ត្រូវការ OAuth credentials និង database របស់ម្ចាស់វេបសាយ។ ឥឡូវសូមប្រើ Local profile។`);
    });
  });
  document.addEventListener("click", (event) => {
    if (!elements.modelPicker.contains(event.target)) closeModelMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModelMenu();
      closeSidebar();
      if (elements.accountModal.classList.contains("open")) closeAccountModal();
    }
  });
}

async function initialize() {
  initializeStoredData();
  let builtIn = DEFAULT_KNOWLEDGE;
  try {
    const response = await fetch("knowledge.json", { cache: "no-cache" });
    if (response.ok) builtIn = await response.json();
  } catch {
    // Embedded starter knowledge keeps the page usable offline.
  }
  state.entries = Array.isArray(builtIn) ? builtIn : DEFAULT_KNOWLEDGE;
  buildIndex();
  bindEvents();
  updateProfileUI();
  updateModeUI();
  renderActiveChat();
  renderConversationLists();
}

initialize();
