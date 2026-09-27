export const DATA_VERSION = 1;

export const STAGE_NAMES = [
  "Terreno", "Fundação", "Estrutura", "Paredes", "Cobertura", "Instalações",
  "Esquadrias", "Reboco", "Pisos", "Acabamentos", "Pintura", "Paisagismo"
];
export const EXPENSE_CATEGORIES = ["Materiais", "Mão de obra", "Serviços", "Outros"];

export function createDefaultData() {
  return {
    version: DATA_VERSION,
    name: "Minha Obra",
    stages: STAGE_NAMES.map(name => ({ name, progress: 0, observation: "", planned: 0 })),
    expenses: [],
    materials: [],
    terrain: { area: 250, address: "", registration: "", frontage: 0, depth: 0, observation: "" },
    updatedAt: new Date().toISOString()
  };
}

export function validateData(value) {
  if (!value || typeof value !== "object" || value.version !== DATA_VERSION ||
      typeof value.name !== "string" || !Array.isArray(value.stages) ||
      !Array.isArray(value.expenses)) {
    throw new Error("O arquivo não é um backup válido do Minha Obra.");
  }
  if (value.stages.length !== STAGE_NAMES.length ||
      !STAGE_NAMES.every((name, i) => value.stages[i]?.name === name)) {
    throw new Error("O backup tem etapas diferentes ou está incompleto.");
  }
  for (const stage of value.stages) {
    if (!Number.isFinite(stage.progress) || stage.progress < 0 || stage.progress > 100 ||
        !Number.isFinite(stage.planned) || stage.planned < 0 ||
        typeof stage.observation !== "string") {
      throw new Error("Há dados inválidos em uma etapa do backup.");
    }
  }
  for (const expense of value.expenses) {
    const expenseDate = typeof expense?.date === "string" ? new Date(`${expense.date}T00:00:00Z`) : null;
    if (!expense || typeof expense.id !== "string" || typeof expense.description !== "string" ||
        !EXPENSE_CATEGORIES.includes(expense.category) || !STAGE_NAMES.includes(expense.stage) ||
        !Number.isFinite(expense.amount) || expense.amount <= 0 ||
        !expenseDate || Number.isNaN(expenseDate.valueOf()) || expenseDate.toISOString().slice(0, 10) !== expense.date) {
      throw new Error("Há uma despesa inválida no backup.");
    }
  }
  const materials = value.materials ?? [];
  if (!Array.isArray(materials)) throw new Error("A lista de materiais do backup é inválida.");
  for (const material of materials) {
    if (!material || typeof material.id !== "string" || typeof material.name !== "string" ||
        typeof material.brand !== "string" || !STAGE_NAMES.includes(material.stage) ||
        !Number.isFinite(material.quantity) || material.quantity <= 0 ||
        !Number.isFinite(material.unitPrice) || material.unitPrice < 0) {
      throw new Error("Há um material inválido no backup.");
    }
  }
  const terrain = value.terrain ?? createDefaultData().terrain;
  if (!terrain || !Number.isFinite(terrain.area) || terrain.area <= 0 ||
      !Number.isFinite(terrain.frontage) || terrain.frontage < 0 ||
      !Number.isFinite(terrain.depth) || terrain.depth < 0 ||
      !["address", "registration", "observation"].every(key => typeof terrain[key] === "string")) {
    throw new Error("Os dados do terreno no backup são inválidos.");
  }
  return {
    version: DATA_VERSION,
    name: value.name.trim().slice(0, 70) || "Minha Obra",
    stages: value.stages.map(stage => ({
      name: stage.name,
      progress: stage.progress,
      observation: stage.observation.slice(0, 300),
      planned: stage.planned,
      planningObservation: typeof stage.planningObservation === "string" ? stage.planningObservation.slice(0, 300) : "",
      updatedAt: typeof stage.updatedAt === "string" ? stage.updatedAt : "",
      updatedBy: typeof stage.updatedBy === "string" ? stage.updatedBy : ""
    })),
    expenses: value.expenses.map(expense => ({
      id: expense.id,
      description: expense.description.slice(0, 100),
      amount: expense.amount,
      category: expense.category,
      stage: expense.stage,
      date: expense.date,
      createdAt: typeof expense.createdAt === "string" ? expense.createdAt : "",
      observation: typeof expense.observation === "string" ? expense.observation.slice(0, 300) : "",
      author: typeof expense.author === "string" ? expense.author : "",
      userId: typeof expense.userId === "string" ? expense.userId : ""
    })),
    materials: materials.map(material => ({
      id: material.id,
      name: material.name.slice(0, 100),
      brand: material.brand.slice(0, 100),
      stage: material.stage,
      quantity: material.quantity,
      unitPrice: material.unitPrice,
      observation: typeof material.observation === "string" ? material.observation.slice(0, 300) : "",
      createdAt: typeof material.createdAt === "string" ? material.createdAt : "",
      author: typeof material.author === "string" ? material.author : "",
      userId: typeof material.userId === "string" ? material.userId : ""
    })),
    terrain: {
      area: terrain.area,
      address: terrain.address.slice(0, 200),
      registration: terrain.registration.slice(0, 100),
      frontage: terrain.frontage,
      depth: terrain.depth,
      observation: terrain.observation.slice(0, 300)
    },
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : ""
  };
}

export function summarize(data) {
  const planned = data.stages.reduce((sum, stage) => sum + stage.planned, 0);
  const spent = data.expenses.reduce((sum, expense) => sum + expense.amount, 0) +
    (data.materials ?? []).reduce((sum, material) => sum + material.quantity * material.unitPrice, 0);
  const progress = data.stages.length
    ? data.stages.reduce((sum, stage) => sum + stage.progress, 0) / data.stages.length
    : 0;
  return { planned, spent, balance: planned - spent, progress };
}
