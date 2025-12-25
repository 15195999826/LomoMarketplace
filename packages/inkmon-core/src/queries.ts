import { getDatabase } from "./database.js";
import { InkMonSchema, type InkMon, type InkMonListItem, type FilterOptions, type Element, type EvolutionStage } from "./types.js";
import { validateInkMon } from "./validators.js";
import { z } from "zod";

/**
 * 数据库行转 InkMon 对象
 */
export function rowToInkMon(row: any): InkMon {
  return {
    name: row.name,
    name_en: row.name_en,
    dex_number: row.dex_number,
    description: row.description,
    elements: {
      primary: row.primary_element,
      secondary: row.secondary_element,
    },
    stats: {
      hp: row.hp,
      attack: row.attack,
      defense: row.defense,
      sp_attack: row.sp_attack,
      sp_defense: row.sp_defense,
      speed: row.speed,
      bst: row.bst,
    },
    design: {
      base_animal: row.base_animal,
      features: JSON.parse(row.features),
      color_palette: JSON.parse(row.color_palette),
    },
    evolution: {
      stage: row.evolution_stage,
      evolves_from: row.evolves_from,
      evolves_to: JSON.parse(row.evolves_to),
      evolution_method: row.evolution_method,
    },
    ecology: {
      habitat: row.habitat,
      diet: row.diet,
      predators: JSON.parse(row.predators),
      prey: JSON.parse(row.prey),
      symbiosis: row.symbiosis ? JSON.parse(row.symbiosis) : [],
      competition: row.competition ? JSON.parse(row.competition) : [],
    },
    image_prompts: {
      design: row.design_prompt,
    },
  };
}

/**
 * 数据库行转列表项
 */
function rowToListItem(row: any): InkMonListItem {
  return {
    dex_number: row.dex_number,
    name: row.name,
    name_en: row.name_en,
    primary_element: row.primary_element as Element,
    secondary_element: row.secondary_element as Element | null,
    evolution_stage: row.evolution_stage as EvolutionStage,
    color_palette: JSON.parse(row.color_palette),
  };
}

/**
 * 获取所有 InkMon（列表项）
 */
export function getAllInkMons(): InkMonListItem[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT dex_number, name, name_en, primary_element, secondary_element,
           evolution_stage, color_palette
    FROM inkmons
    ORDER BY dex_number ASC
  `).all() as any[];

  return rows.map(rowToListItem);
}

/**
 * 根据英文名获取 InkMon
 */
export function getInkMonByNameEn(nameEn: string): InkMon | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM inkmons WHERE name_en = ?").get(nameEn) as any;

  if (!row) {
    return null;
  }

  return rowToInkMon(row);
}

/**
 * 根据图鉴编号获取 InkMon
 */
export function getInkMonByDexNumber(dexNumber: number): InkMon | null {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM inkmons WHERE dex_number = ?").get(dexNumber) as any;

  if (!row) {
    return null;
  }

  return rowToInkMon(row);
}

/**
 * 搜索 InkMon
 */
export function searchInkMons(query: string): InkMonListItem[] {
  const db = getDatabase();
  const searchPattern = `%${query}%`;

  const rows = db.prepare(`
    SELECT dex_number, name, name_en, primary_element, secondary_element,
           evolution_stage, color_palette
    FROM inkmons
    WHERE name LIKE ?
       OR name_en LIKE ?
       OR CAST(dex_number AS TEXT) LIKE ?
    ORDER BY dex_number ASC
  `).all(searchPattern, searchPattern, searchPattern) as any[];

  return rows.map(rowToListItem);
}

/**
 * 筛选 InkMon
 */
export function filterInkMons(options: FilterOptions): InkMonListItem[] {
  const db = getDatabase();
  const conditions: string[] = [];
  const params: any[] = [];

  // 搜索条件
  if (options.search) {
    const searchPattern = `%${options.search}%`;
    conditions.push(`(name LIKE ? OR name_en LIKE ? OR CAST(dex_number AS TEXT) LIKE ?)`);
    params.push(searchPattern, searchPattern, searchPattern);
  }

  // 属性筛选
  if (options.elements && options.elements.length > 0) {
    const placeholders = options.elements.map(() => '?').join(',');
    conditions.push(`(primary_element IN (${placeholders}) OR secondary_element IN (${placeholders}))`);
    params.push(...options.elements, ...options.elements);
  }

  // 进化阶段筛选
  if (options.stages && options.stages.length > 0) {
    const placeholders = options.stages.map(() => '?').join(',');
    conditions.push(`evolution_stage IN (${placeholders})`);
    params.push(...options.stages);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db.prepare(`
    SELECT dex_number, name, name_en, primary_element, secondary_element,
           evolution_stage, color_palette
    FROM inkmons
    ${whereClause}
    ORDER BY dex_number ASC
  `).all(...params) as any[];

  return rows.map(rowToListItem);
}

/**
 * 获取所有 InkMon 英文名列表
 */
export function listInkMonNamesEn(): string[] {
  const db = getDatabase();
  const rows = db.prepare("SELECT name_en FROM inkmons ORDER BY dex_number").all() as Array<{ name_en: string }>;
  return rows.map(r => r.name_en);
}

/**
 * 获取下一个可用的图鉴编号
 */
export function getNextDexNumber(): number {
  const db = getDatabase();
  const row = db.prepare("SELECT MAX(dex_number) as max_num FROM inkmons").get() as { max_num: number | null } | undefined;
  return (row?.max_num ?? 0) + 1;
}

/**
 * 获取 InkMon 总数
 */
export function getInkMonCount(): number {
  const db = getDatabase();
  const row = db.prepare("SELECT COUNT(*) as count FROM inkmons").get() as { count: number };
  return row.count;
}

export interface AddInkMonResult {
  success: boolean;
  message: string;
  id?: number;
}

/**
 * 添加 InkMon 到数据库
 */
export function addInkMon(inkmon: InkMon): AddInkMonResult {
  // 1. Schema 验证
  const parseResult = InkMonSchema.safeParse(inkmon);
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(
      issue => `[${issue.path.join(".")}] ${issue.message}`
    ).join("\n");
    return { success: false, message: `Schema 验证失败:\n${errors}` };
  }

  // 2. 业务规则验证
  const bizErrors = validateInkMon(inkmon);
  if (bizErrors.length > 0) {
    const errorText = bizErrors.map(e => `[${e.field}] ${e.message}`).join("\n");
    return { success: false, message: `业务规则验证失败:\n${errorText}` };
  }

  // 3. 插入数据库
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      INSERT INTO inkmons (
        name, name_en, dex_number, description,
        primary_element, secondary_element,
        hp, attack, defense, sp_attack, sp_defense, speed, bst,
        base_animal, features, color_palette,
        evolution_stage, evolves_from, evolves_to, evolution_method,
        habitat, diet, predators, prey, symbiosis, competition,
        design_prompt
      ) VALUES (
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?
      )
    `);

    const result = stmt.run(
      inkmon.name,
      inkmon.name_en,
      inkmon.dex_number,
      inkmon.description,
      inkmon.elements.primary,
      inkmon.elements.secondary,
      inkmon.stats.hp,
      inkmon.stats.attack,
      inkmon.stats.defense,
      inkmon.stats.sp_attack,
      inkmon.stats.sp_defense,
      inkmon.stats.speed,
      inkmon.stats.bst,
      inkmon.design.base_animal,
      JSON.stringify(inkmon.design.features),
      JSON.stringify(inkmon.design.color_palette),
      inkmon.evolution.stage,
      inkmon.evolution.evolves_from,
      JSON.stringify(inkmon.evolution.evolves_to),
      inkmon.evolution.evolution_method,
      inkmon.ecology.habitat,
      inkmon.ecology.diet,
      JSON.stringify(inkmon.ecology.predators),
      JSON.stringify(inkmon.ecology.prey),
      inkmon.ecology.symbiosis ? JSON.stringify(inkmon.ecology.symbiosis) : null,
      inkmon.ecology.competition ? JSON.stringify(inkmon.ecology.competition) : null,
      inkmon.image_prompts.design,
    );

    return {
      success: true,
      message: `InkMon "${inkmon.name}" (${inkmon.name_en}) 已入库`,
      id: typeof result.lastInsertRowid === 'bigint'
        ? Number(result.lastInsertRowid)
        : result.lastInsertRowid,
    };

  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      if (error.message.includes("name_en")) {
        return { success: false, message: `英文名称 "${inkmon.name_en}" 已存在` };
      }
      if (error.message.includes("dex_number")) {
        return { success: false, message: `图鉴编号 #${inkmon.dex_number} 已存在` };
      }
    }
    return { success: false, message: `数据库错误: ${error.message}` };
  }
}

export interface UpdateInkMonResult {
  success: boolean;
  message: string;
  changes?: number;
}

/**
 * 更新已存在的 InkMon
 */
export function updateInkMon(inkmon: InkMon): UpdateInkMonResult {
  // 1. Schema 验证
  const parseResult = InkMonSchema.safeParse(inkmon);
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(
      issue => `[${issue.path.join(".")}] ${issue.message}`
    ).join("\n");
    return { success: false, message: `Schema 验证失败:\n${errors}` };
  }

  // 2. 业务规则验证
  const bizErrors = validateInkMon(inkmon);
  if (bizErrors.length > 0) {
    const errorText = bizErrors.map(e => `[${e.field}] ${e.message}`).join("\n");
    return { success: false, message: `业务规则验证失败:\n${errorText}` };
  }

  // 3. 更新数据库
  const db = getDatabase();

  try {
    const stmt = db.prepare(`
      UPDATE inkmons SET
        name = ?,
        dex_number = ?,
        description = ?,
        primary_element = ?,
        secondary_element = ?,
        hp = ?,
        attack = ?,
        defense = ?,
        sp_attack = ?,
        sp_defense = ?,
        speed = ?,
        bst = ?,
        base_animal = ?,
        features = ?,
        color_palette = ?,
        evolution_stage = ?,
        evolves_from = ?,
        evolves_to = ?,
        evolution_method = ?,
        habitat = ?,
        diet = ?,
        predators = ?,
        prey = ?,
        symbiosis = ?,
        competition = ?,
        design_prompt = ?
      WHERE name_en = ?
    `);

    const result = stmt.run(
      inkmon.name,
      inkmon.dex_number,
      inkmon.description,
      inkmon.elements.primary,
      inkmon.elements.secondary,
      inkmon.stats.hp,
      inkmon.stats.attack,
      inkmon.stats.defense,
      inkmon.stats.sp_attack,
      inkmon.stats.sp_defense,
      inkmon.stats.speed,
      inkmon.stats.bst,
      inkmon.design.base_animal,
      JSON.stringify(inkmon.design.features),
      JSON.stringify(inkmon.design.color_palette),
      inkmon.evolution.stage,
      inkmon.evolution.evolves_from,
      JSON.stringify(inkmon.evolution.evolves_to),
      inkmon.evolution.evolution_method,
      inkmon.ecology.habitat,
      inkmon.ecology.diet,
      JSON.stringify(inkmon.ecology.predators),
      JSON.stringify(inkmon.ecology.prey),
      inkmon.ecology.symbiosis ? JSON.stringify(inkmon.ecology.symbiosis) : null,
      inkmon.ecology.competition ? JSON.stringify(inkmon.ecology.competition) : null,
      inkmon.image_prompts.design,
      inkmon.name_en
    );

    if (result.changes === 0) {
      return { success: false, message: `未找到 InkMon: ${inkmon.name_en}` };
    }

    return {
      success: true,
      message: `InkMon "${inkmon.name}" (${inkmon.name_en}) 已更新`,
      changes: typeof result.changes === 'bigint'
        ? Number(result.changes)
        : result.changes,
    };

  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed") && error.message.includes("dex_number")) {
      return { success: false, message: `图鉴编号 #${inkmon.dex_number} 已被其他 InkMon 使用` };
    }
    return { success: false, message: `数据库错误: ${error.message}` };
  }
}
