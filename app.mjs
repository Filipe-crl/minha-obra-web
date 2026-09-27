import { createDefaultData, STAGE_NAMES, summarize, validateData } from "./data.mjs";

const STORAGE_KEY = "minha-obra-web-v1";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormat = new Intl.DateTimeFormat("pt-BR");
const byId = id => document.getElementById(id);
const stagesList = byId("stages-list");
const stageGallery = byId("stage-gallery");
const expensesList = byId("expenses-list");
const materialsList = byId("materials-list");
const expenseDialog = byId("expense-dialog");
const progressDialog = byId("progress-dialog");
const planDialog = byId("plan-dialog");
const materialDialog = byId("material-dialog");
let data;
let toastTimer;

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? validateData(JSON.parse(raw)) : createDefaultData();
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Os dados salvos neste navegador estão corrompidos. Importe um backup para recuperar a obra.");
    throw error;
  }
}

function saveData(next) {
  next.updatedAt = new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    data = next;
    render();
  } catch (error) {
    throw new Error(`Não foi possível salvar neste aparelho: ${error.message}`);
  }
}

function toast(message) {
  const el = byId("toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 2800);
}

function render() {
  const totals = summarize(data);
  byId("work-title").textContent = data.name;
  byId("work-name").value = data.name;
  byId("overall-progress").textContent = `${Math.round(totals.progress)}%`;
  byId("completed-stages").textContent = `${data.stages.filter(stage => stage.progress >= 100).length} de ${data.stages.length}`;
  byId("overall-progress").parentElement.style.background =
    `radial-gradient(closest-side,#07172d 79%,transparent 82%), conic-gradient(#31d7e3 ${totals.progress * 3.6}deg,#1b3559 0deg)`;
  byId("overall-bar").style.width = `${totals.progress}%`;
  byId("planned-total").textContent = money.format(totals.planned);
  byId("spent-total").textContent = money.format(totals.spent);
  byId("balance-total").textContent = money.format(totals.balance);

  stagesList.replaceChildren();
  const stageSelect = byId("expense-stage");
  const materialStageSelect = byId("material-stage");
  const selected = stageSelect.value;
  const makeOptions = () => STAGE_NAMES.map(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    return option;
  });
  stageSelect.replaceChildren(...makeOptions());
  materialStageSelect.replaceChildren(...makeOptions());
  if (STAGE_NAMES.includes(selected)) stageSelect.value = selected;

  for (const stage of data.stages) {
    const row = document.createElement("div");
    row.className = "stage-row";
    const name = document.createElement("span");
    name.className = "stage-name";
    name.textContent = stage.name;
    const value = document.createElement("span");
    value.className = "stage-value";
    value.textContent = `${Math.round(stage.progress)}%`;
    const track = document.createElement("div");
    track.className = "stage-track";
    const bar = document.createElement("span");
    bar.style.width = `${stage.progress}%`;
    track.append(bar);
    row.append(name, value, track);
    if (stage.observation) {
      const note = document.createElement("span");
      note.className = "stage-note";
      note.textContent = stage.observation;
      row.append(note);
    }
    const planned = document.createElement("span");
    planned.className = "stage-note";
    planned.textContent = `Previsto: ${money.format(stage.planned)}`;
    row.append(planned);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "stage-edit";
    edit.textContent = "Atualizar etapa";
    edit.addEventListener("click", () => openProgress(stage));
    const editPlan = document.createElement("button");
    editPlan.type = "button";
    editPlan.className = "stage-edit";
    editPlan.textContent = "Definir orçamento";
    editPlan.addEventListener("click", () => openPlan(stage));
    row.append(edit, editPlan);
    stagesList.append(row);
  }

  stageGallery.replaceChildren();
  for (const stage of data.stages) {
    const tile = document.createElement("button");
    tile.type = "button";
    tile.className = "stage-tile";
    tile.setAttribute("aria-label", `${stage.name}, ${Math.round(stage.progress)}%. Atualizar etapa.`);
    const name = document.createElement("span");
    name.className = "stage-tile-name";
    name.textContent = stage.name;
    const value = document.createElement("span");
    value.className = "stage-tile-value";
    value.textContent = `${Math.round(stage.progress)}%`;
    const track = document.createElement("span");
    track.className = "stage-track";
    const bar = document.createElement("span");
    bar.style.width = `${stage.progress}%`;
    track.append(bar);
    tile.append(name, value, track);
    tile.addEventListener("click", () => openProgress(stage));
    stageGallery.append(tile);
  }

  expensesList.replaceChildren();
  const recent = [...data.expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  if (!recent.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhuma despesa lançada ainda.";
    expensesList.append(empty);
  } else {
    for (const expense of recent) {
      const item = document.createElement("div");
      item.className = "expense-item";
      const details = document.createElement("div");
      const title = document.createElement("div");
      title.className = "expense-description";
      title.textContent = expense.description;
      const meta = document.createElement("div");
      meta.className = "expense-meta";
      meta.textContent = `${expense.category} · ${expense.stage} · ${formatDate(expense.date)}`;
      details.append(title, meta);
      const amount = document.createElement("span");
      amount.className = "expense-amount";
      amount.textContent = money.format(expense.amount);
      item.append(details, amount);
      expensesList.append(item);
    }
  }

  materialsList.replaceChildren();
  const recentMaterials = [...data.materials].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8);
  if (!recentMaterials.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhum material lançado ainda.";
    materialsList.append(empty);
  } else {
    for (const material of recentMaterials) {
      const item = document.createElement("div");
      item.className = "expense-item";
      const details = document.createElement("div");
      const title = document.createElement("div");
      title.className = "expense-description";
      title.textContent = material.name;
      const meta = document.createElement("div");
      meta.className = "expense-meta";
      meta.textContent = `${material.brand ? `${material.brand} · ` : ""}${material.stage} · ${material.quantity} × ${money.format(material.unitPrice)}`;
      details.append(title, meta);
      const amount = document.createElement("span");
      amount.className = "expense-amount";
      amount.textContent = money.format(material.quantity * material.unitPrice);
      item.append(details, amount);
      materialsList.append(item);
    }
  }
}

function formatDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return dateFormat.format(new Date(year, month - 1, day));
}

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function openProgress(stage) {
  const form = byId("progress-form");
  form.elements.stage.value = stage.name;
  form.elements.progress.value = stage.progress;
  form.elements.observation.value = stage.observation;
  byId("progress-title").textContent = stage.name;
  byId("progress-error").textContent = "";
  progressDialog.showModal();
}

function openPlan(stage) {
  const form = byId("plan-form");
  form.elements.stage.value = stage.name;
  form.elements.planned.value = stage.planned;
  byId("plan-title").textContent = stage.name;
  byId("plan-error").textContent = "";
  planDialog.showModal();
}

byId("work-name").addEventListener("change", event => {
  const name = event.target.value.trim().slice(0, 70);
  if (!name) {
    event.target.value = data.name;
    return;
  }
  try {
    saveData({ ...data, name });
    toast("Nome da obra salvo.");
  } catch (error) {
    event.target.value = data.name;
    toast(error.message);
  }
});

byId("add-expense").addEventListener("click", () => {
  const form = byId("expense-form");
  form.reset();
  form.elements.date.value = localDateValue();
  byId("expense-error").textContent = "";
  expenseDialog.showModal();
});

byId("add-material").addEventListener("click", () => {
  const form = byId("material-form");
  form.reset();
  byId("material-error").textContent = "";
  materialDialog.showModal();
});

byId("quick-stage").addEventListener("click", () => {
  const nextStage = data.stages.find(stage => stage.progress < 100) ?? data.stages.at(-1);
  openProgress(nextStage);
});

byId("expense-form").addEventListener("submit", event => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  const form = event.currentTarget;
  const amount = Number(form.elements.amount.value);
  if (!Number.isFinite(amount) || amount <= 0 || !STAGE_NAMES.includes(form.elements.stage.value)) {
    byId("expense-error").textContent = "Confira o valor e a etapa da despesa.";
    return;
  }
  const expense = {
    id: crypto.randomUUID(),
    description: form.elements.description.value.trim(),
    amount: Math.round(amount * 100) / 100,
    category: form.elements.category.value,
    stage: form.elements.stage.value,
    date: form.elements.date.value,
    createdAt: new Date().toISOString(),
    observation: "",
    author: "Celular",
    userId: ""
  };
  if (!expense.description || !expense.date) {
    byId("expense-error").textContent = "Preencha a descrição e a data.";
    return;
  }
  try {
    saveData({ ...data, expenses: [expense, ...data.expenses] });
    expenseDialog.close();
    toast("Despesa salva neste aparelho.");
  } catch (error) {
    byId("expense-error").textContent = error.message;
  }
});

byId("progress-form").addEventListener("submit", event => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  const form = event.currentTarget;
  const progress = Number(form.elements.progress.value);
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    byId("progress-error").textContent = "Informe um percentual entre 0 e 100.";
    return;
  }
  const name = form.elements.stage.value;
  try {
    const stages = data.stages.map(stage => stage.name === name
      ? { ...stage, progress, observation: form.elements.observation.value.trim().slice(0, 300) }
      : stage);
    saveData({ ...data, stages });
    progressDialog.close();
    toast("Progresso salvo neste aparelho.");
  } catch (error) {
    byId("progress-error").textContent = error.message;
  }
});

byId("plan-form").addEventListener("submit", event => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  const form = event.currentTarget;
  const planned = Number(form.elements.planned.value);
  if (!Number.isFinite(planned) || planned < 0) {
    byId("plan-error").textContent = "Informe um valor igual ou maior que zero.";
    return;
  }
  const name = form.elements.stage.value;
  try {
    const stages = data.stages.map(stage => stage.name === name
      ? { ...stage, planned: Math.round(planned * 100) / 100 }
      : stage);
    saveData({ ...data, stages });
    planDialog.close();
    toast("Orçamento salvo neste aparelho.");
  } catch (error) {
    byId("plan-error").textContent = error.message;
  }
});

byId("material-form").addEventListener("submit", event => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  const form = event.currentTarget;
  const quantity = Number(form.elements.quantity.value);
  const unitPrice = Number(form.elements.unitPrice.value);
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) ||
      unitPrice < 0 || !STAGE_NAMES.includes(form.elements.stage.value)) {
    byId("material-error").textContent = "Confira a quantidade, o valor e a etapa do material.";
    return;
  }
  const name = form.elements.name.value.trim();
  if (!name) {
    byId("material-error").textContent = "Informe o nome do material.";
    return;
  }
  const material = {
    id: crypto.randomUUID(),
    name,
    brand: form.elements.brand.value.trim(),
    stage: form.elements.stage.value,
    quantity,
    unitPrice: Math.round(unitPrice * 100) / 100,
    observation: "",
    createdAt: new Date().toISOString(),
    author: "Celular",
    userId: ""
  };
  try {
    saveData({ ...data, materials: [material, ...data.materials] });
    materialDialog.close();
    toast("Material salvo neste aparelho.");
  } catch (error) {
    byId("material-error").textContent = error.message;
  }
});

byId("export-backup").addEventListener("click", () => {
  const file = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `minha-obra-backup-${localDateValue()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Backup baixado. Guarde-o em local seguro.");
});

byId("import-backup").addEventListener("change", async event => {
  const [file] = event.target.files;
  event.target.value = "";
  if (!file) return;
  try {
    const imported = validateData(JSON.parse(await file.text()));
    if (!window.confirm("Os dados existentes serão mantidos. As etapas, orçamento e terreno serão atualizados pelo arquivo; despesas e materiais serão integrados sem apagar lançamentos. Deseja continuar?")) return;
    const expenses = new Map(data.expenses.map(item => [item.id, item]));
    for (const item of imported.expenses) expenses.set(item.id, item);
    const materials = new Map(data.materials.map(item => [item.id, item]));
    for (const item of imported.materials) materials.set(item.id, item);
    saveData({
      ...data,
      name: imported.name,
      stages: imported.stages,
      terrain: imported.terrain,
      expenses: [...expenses.values()],
      materials: [...materials.values()]
    });
    toast("Dados integrados neste aparelho.");
  } catch (error) {
    toast(error.message);
  }
});

try {
  data = loadData();
  render();
} catch (error) {
  document.body.innerHTML = `<main class="page"><section class="panel"><h1>Não foi possível abrir seus dados</h1><p class="muted"></p><label class="button button-secondary file-button">Escolher backup<input id="recovery-backup" type="file" accept="application/json,.json"></label></section></main>`;
  document.querySelector(".muted").textContent = error.message;
  document.getElementById("recovery-backup").addEventListener("change", async event => {
    try {
      const imported = validateData(JSON.parse(await event.target.files[0].text()));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
      location.reload();
    } catch (recoveryError) {
      document.querySelector(".muted").textContent = recoveryError.message;
    }
  });
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(error => {
    console.error("Não foi possível preparar o uso offline:", error);
  });
}

let installPrompt;
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  byId("install-button").classList.remove("hidden");
});
byId("install-button").addEventListener("click", async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = null;
  byId("install-button").classList.add("hidden");
});
