import { getDatabase } from "../database/connection.js";
import { InkMonSchema, type InkMon, type AddInkMonInput } from "../types/inkmon.js";
import { validateInkMon } from "./validators.js";
import { z } from "zod";

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  [key: string]: unknown;
}

/**
 * 添加 InkMon 到数据库
 */
export function addInkMon(input: unknown): ToolResult {
  // 1. Zod Schema 验证
  const inputSchema = z.object({ inkmon: InkMonSchema });
  const parseResult = inputSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(
      issue => `[${issue.path.join(".")}] ${issue.message}`
    ).join("\n");
    return {
      content: [{
        type: "text",
        text: `[ERROR] Schema 验证失败:\n${errors}`
      }]
    };
  }

  const inkmon = parseResult.data.inkmon;

  // 2. 业务规则验证
  const bizErrors = validateInkMon(inkmon);
  if (bizErrors.length > 0) {
    const errorText = bizErrors.map(
      e => `[${e.field}] ${e.message}`
    ).join("\n");
    return {
      content: [{
        type: "text",
        text: `[ERROR] 业务规则验证失败:\n${errorText}`
      }]
    };
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
      content: [{
        type: "text",
        text: `[OK] InkMon "${inkmon.name}" (${inkmon.name_en}) 已入库\n` +
          `- 图鉴编号: #${inkmon.dex_number}\n` +
          `- 阶段: ${inkmon.evolution.stage}\n` +
          `- 属性: ${inkmon.elements.primary}${inkmon.elements.secondary ? "/" + inkmon.elements.secondary : ""}\n` +
          `- BST: ${inkmon.stats.bst}\n` +
          `- 数据库 ID: ${result.lastInsertRowid}`
      }]
    };

  } catch (error: any) {
    // 处理唯一约束冲突
    if (error.message?.includes("UNIQUE constraint failed")) {
      if (error.message.includes("name_en")) {
        return {
          content: [{
            type: "text",
            text: `[ERROR] 英文名称 "${inkmon.name_en}" 已存在`
          }]
        };
      }
      if (error.message.includes("dex_number")) {
        return {
          content: [{
            type: "text",
            text: `[ERROR] 图鉴编号 #${inkmon.dex_number} 已存在`
          }]
        };
      }
    }

    return {
      content: [{
        type: "text",
        text: `[ERROR] 数据库错误: ${error.message}`
      }]
    };
  }
}

/**
 * 获取下一个可用的图鉴编号
 */
export function getNextDexNumber(): ToolResult {
  const db = getDatabase();
  const row = db.prepare("SELECT MAX(dex_number) as max_num FROM inkmons").get() as { max_num: number | null } | undefined;
  const nextNum = (row?.max_num ?? 0) + 1;

  return {
    content: [{
      type: "text",
      text: `${nextNum}`
    }]
  };
}

/**
 * 根据英文名查询 InkMon
 */
export function getInkMonByName(name_en: string): ToolResult {
  const db = getDatabase();
  const row = db.prepare("SELECT * FROM inkmons WHERE name_en = ?").get(name_en) as any;

  if (!row) {
    return {
      content: [{
        type: "text",
        text: `[ERROR] 未找到 InkMon: ${name_en}`
      }]
    };
  }

  // 转换回 JSON 格式
  const inkmon = rowToInkMon(row);

  return {
    content: [{
      type: "text",
      text: JSON.stringify({ inkmon }, null, 2)
    }]
  };
}

/**
 * 数据库行转 InkMon 对象
 */
function rowToInkMon(row: any): InkMon {
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
