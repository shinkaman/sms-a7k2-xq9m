const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwYmBO6sGf-2VfoN-ezvqnGQAKb4NvH75j68D92EYe4Rb56l7NypWA4iKE9Euk2rZCw/exec";
const SECRET_TOKEN = "sms-builder-2026";

let templates = [];

const templateCards = document.getElementById("templateCards");
const phoneInput = document.getElementById("phoneInput");
const messageInput = document.getElementById("messageInput");
const createSmsButton = document.getElementById("createSmsButton");

let selectedIndex = -1;

function buildGASQueryString(params) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

async function requestFromGAS(body = {}) {
  let url = GAS_WEBAPP_URL;
  const options = {
    method: "GET",
    cache: "no-store"
  };

  const query = buildGASQueryString({ token: SECRET_TOKEN, ...body });
  url += `?${query}`;

  const response = await fetch(url, {
    ...options,
    mode: "cors",
    credentials: "omit"
  });
  let result;

  try {
    result = await response.json();
  } catch (parseError) {
    console.error("GAS response JSON parse error:", parseError);
    return { data: null, error: "GASレスポンスの解析に失敗しました。" };
  }

  if (!response.ok || result.error) {
    const errorMessage = result.error || `HTTP ${response.status}`;
    console.error("GAS request error:", errorMessage, result);
    return { data: null, error: errorMessage };
  }

  return { data: result.data ?? result, error: null };
}

async function fetchTemplates() {
  const { data, error } = await requestFromGAS();

  if (error) {
    console.error("GAS fetch error:", error);
    alert("定型文の読み込み中にエラーが発生しました。");
    return;
  }

  templates = (Array.isArray(data) ? data : [])
    .map((item) => ({
      id: item.id,
      title: item.title,
      text: item.body
    }));

  selectedIndex = templates.length > 0 ? 0 : -1;
}

async function insertTemplate(title, body) {
  const { data, error } = await requestFromGAS({
    action: "add",
    title,
    body
  });

  if (error) {
    console.error("GAS insert error:", error);
    alert("定型文の追加に失敗しました。");
    return null;
  }

  return {
    id: data.id,
    title: data.title,
    text: data.body
  };
}

async function deleteTemplateRecord(id) {
  const { error } = await requestFromGAS({
    action: "delete",
    id
  });

  if (error) {
    console.error("GAS delete error:", error);
    alert("定型文の削除に失敗しました。");
    return false;
  }

  return true;
}

function createTemplateCard(template, index) {
  const card = document.createElement("div");
  card.className = "template-card";
  card.dataset.index = String(index);

  const title = document.createElement("strong");
  title.textContent = template.title;

  const body = document.createElement("p");
  body.textContent = template.text;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "small-button delete-button";
  deleteButton.textContent = "削除";

  actions.appendChild(deleteButton);

  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(actions);

  card.addEventListener("click", () => {
    selectTemplate(index);
  });

  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const confirmed = window.confirm("削除しますか？");
    if (!confirmed) {
      return;
    }
    deleteTemplate(index);
  });

  return card;
}

function createAddCard() {
  const card = document.createElement("div");
  card.className = "template-card add-card";

  const plus = document.createElement("div");
  plus.className = "plus-mark";
  plus.textContent = "+";

  const title = document.createElement("strong");
  title.textContent = "新しい定型文を追加";

  const description = document.createElement("p");
  description.textContent = "クリックして名称と本文を入力します。";

  const addForm = document.createElement("div");
  addForm.className = "add-form hidden";

  const titleInput = document.createElement("input");
  titleInput.className = "card-input";
  titleInput.type = "text";
  titleInput.placeholder = "タイトル";

  const textInput = document.createElement("textarea");
  textInput.className = "card-textarea";
  textInput.rows = 4;
  textInput.placeholder = "本文を入力してください。";

  const buttonRow = document.createElement("div");
  buttonRow.className = "button-row";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className = "small-button cancel-button";
  cancelButton.textContent = "キャンセル";

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "small-button save-button";
  addButton.textContent = "追加";

  buttonRow.appendChild(cancelButton);
  buttonRow.appendChild(addButton);
  addForm.appendChild(titleInput);
  addForm.appendChild(textInput);
  addForm.appendChild(buttonRow);

  card.appendChild(plus);
  card.appendChild(title);
  card.appendChild(description);
  card.appendChild(addForm);

  card.addEventListener("click", (event) => {
    if (addForm.contains(event.target)) {
      return;
    }
    addForm.classList.toggle("hidden");
    if (!addForm.classList.contains("hidden")) {
      titleInput.focus();
    }
  });

  addForm.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  cancelButton.addEventListener("click", (event) => {
    event.stopPropagation();
    titleInput.value = "";
    textInput.value = "";
    addForm.classList.add("hidden");
  });

  addButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    const titleText = titleInput.value.trim();
    const bodyText = textInput.value.trim();

    if (!titleText) {
      alert("タイトルを入力してください。");
      titleInput.focus();
      return;
    }

    if (!bodyText) {
      alert("本文を入力してください。");
      textInput.focus();
      return;
    }

    const inserted = await insertTemplate(titleText, bodyText);
    if (!inserted) {
      return;
    }

    templates.push(inserted);
    const newIndex = templates.length - 1;
    renderTemplateCards();
    selectTemplate(newIndex);
  });

  return card;
}

function renderTemplateCards() {
  templateCards.innerHTML = "";
  templates.forEach((template, index) => {
    const card = createTemplateCard(template, index);
    if (index === selectedIndex) {
      card.classList.add("selected");
    }
    templateCards.appendChild(card);
  });
  templateCards.appendChild(createAddCard());
}

function selectTemplate(index) {
  selectedIndex = index;
  messageInput.value = templates[index].text;
  updateSelectedCardState();
}

function updateSelectedCardState() {
  const cards = templateCards.querySelectorAll(".template-card");
  cards.forEach((card) => {
    const cardIndex = Number(card.dataset.index);
    card.classList.toggle("selected", !isNaN(cardIndex) && cardIndex === selectedIndex);
  });
}

async function deleteTemplate(index) {
  const template = templates[index];
  if (!template) {
    return;
  }

  const deleted = await deleteTemplateRecord(template.id);
  if (!deleted) {
    return;
  }

  templates.splice(index, 1);

  if (templates.length === 0) {
    selectedIndex = -1;
    messageInput.value = "";
  } else if (selectedIndex === index) {
    selectedIndex = Math.min(index, templates.length - 1);
    messageInput.value = templates[selectedIndex].text;
  } else if (selectedIndex > index) {
    selectedIndex -= 1;
  }

  renderTemplateCards();
}

function normalizePhone(phone) {
  return phone.replace(/[^0-9+]/g, "").trim();
}

function handleCreateSms() {
  const phone = normalizePhone(phoneInput.value);
  const message = messageInput.value.trim();

  if (!phone) {
    alert("送信先の電話番号を入力してください。");
    phoneInput.focus();
    return;
  }

  if (!message) {
    alert("メッセージ内容を入力してください。");
    messageInput.focus();
    return;
  }

  const encodedText = encodeURIComponent(message);
  const smsUrl = `sms:${phone}?body=${encodedText}`;
  window.location.href = smsUrl;
}

async function init() {
  await fetchTemplates();
  renderTemplateCards();

  if (templates.length > 0) {
    messageInput.value = templates[selectedIndex].text;
  }

  createSmsButton.addEventListener("click", handleCreateSms);
}

init();
