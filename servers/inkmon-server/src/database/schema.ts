import { getDatabase } from "./connection.js";

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS inkmons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- 核心字段
    name TEXT NOT NULL,
    name_en TEXT NOT NULL UNIQUE,
    dex_number INTEGER NOT NULL UNIQUE,
    description TEXT NOT NULL,

    -- 属性
    primary_element TEXT NOT NULL,
    secondary_element TEXT,

    -- 六维数值
    hp INTEGER NOT NULL,
    attack INTEGER NOT NULL,
    defense INTEGER NOT NULL,
    sp_attack INTEGER NOT NULL,
    sp_defense INTEGER NOT NULL,
    speed INTEGER NOT NULL,
    bst INTEGER NOT NULL,

    -- 设计
    base_animal TEXT NOT NULL,
    features TEXT NOT NULL,
    color_palette TEXT NOT NULL,

    -- 进化
    evolution_stage TEXT NOT NULL,
    evolves_from TEXT,
    evolves_to TEXT NOT NULL,
    evolution_method TEXT,

    -- 生态
    habitat TEXT NOT NULL,
    diet TEXT NOT NULL,
    predators TEXT NOT NULL,
    prey TEXT NOT NULL,
    symbiosis TEXT,
    competition TEXT,

    -- 提示词
    design_prompt TEXT NOT NULL,

    -- 元数据
    created_at TEXT DEFAULT (datetime('now')),

    -- 约束
    CHECK (length(name) >= 2 AND length(name) <= 4),
    CHECK (length(name_en) <= 12),
    CHECK (length(description) <= 200),
    CHECK (primary_element IN ('fire','water','grass','electric','ice','rock','ground','flying','bug','poison','dark','light','steel','dragon')),
    CHECK (secondary_element IS NULL OR secondary_element IN ('fire','water','grass','electric','ice','rock','ground','flying','bug','poison','dark','light','steel','dragon')),
    CHECK (hp BETWEEN 1 AND 255),
    CHECK (attack BETWEEN 1 AND 255),
    CHECK (defense BETWEEN 1 AND 255),
    CHECK (sp_attack BETWEEN 1 AND 255),
    CHECK (sp_defense BETWEEN 1 AND 255),
    CHECK (speed BETWEEN 1 AND 255),
    CHECK (bst BETWEEN 100 AND 800),
    CHECK (evolution_stage IN ('baby','mature','adult')),
    CHECK (diet IN ('herbivore','carnivore','omnivore','special'))
);
`;

const CREATE_INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_inkmons_dex_number ON inkmons(dex_number);
CREATE INDEX IF NOT EXISTS idx_inkmons_name_en ON inkmons(name_en);
CREATE INDEX IF NOT EXISTS idx_inkmons_primary_element ON inkmons(primary_element);
CREATE INDEX IF NOT EXISTS idx_inkmons_evolution_stage ON inkmons(evolution_stage);
CREATE INDEX IF NOT EXISTS idx_inkmons_evolves_from ON inkmons(evolves_from);
`;

export function initializeDatabase(): void {
  const db = getDatabase();
  db.exec(CREATE_TABLE_SQL);
  db.exec(CREATE_INDEXES_SQL);
}
