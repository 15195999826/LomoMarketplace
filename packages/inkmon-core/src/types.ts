import { z } from "zod";

// 有效属性列表
export const VALID_ELEMENTS = [
  "fire", "water", "grass", "electric", "ice",
  "rock", "ground", "flying", "bug", "poison",
  "dark", "light", "steel", "dragon"
] as const;

export type Element = typeof VALID_ELEMENTS[number];

// 进化阶段及其 BST 范围
export const BST_RANGES = {
  baby: { min: 250, max: 350 },
  mature: { min: 350, max: 450 },
  adult: { min: 450, max: 550 },
} as const;

export type EvolutionStage = keyof typeof BST_RANGES;

// 食性类型
export const DIET_TYPES = ["herbivore", "carnivore", "omnivore", "special"] as const;
export type DietType = typeof DIET_TYPES[number];

// InkMon 完整 Zod Schema
export const InkMonSchema = z.object({
  name: z.string().min(2).max(4).describe("中文名称 (2-4字符)"),
  name_en: z.string().regex(/^[A-Za-z]+$/).max(12).describe("英文名称 (仅字母, max 12)"),
  dex_number: z.number().int().min(1).describe("图鉴编号"),
  description: z.string().max(200).describe("描述 (max 200字符)"),

  elements: z.object({
    primary: z.enum(VALID_ELEMENTS).describe("主属性"),
    secondary: z.enum(VALID_ELEMENTS).nullable().describe("副属性"),
  }),

  stats: z.object({
    hp: z.number().int().min(1).max(255),
    attack: z.number().int().min(1).max(255),
    defense: z.number().int().min(1).max(255),
    sp_attack: z.number().int().min(1).max(255),
    sp_defense: z.number().int().min(1).max(255),
    speed: z.number().int().min(1).max(255),
    bst: z.number().int().min(100).max(800),
  }),

  design: z.object({
    base_animal: z.string().min(1),
    features: z.array(z.string()).min(1),
    color_palette: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/)).min(1).max(5),
  }),

  evolution: z.object({
    stage: z.enum(["baby", "mature", "adult"]),
    evolves_from: z.string().nullable(),
    evolves_to: z.array(z.string()),
    evolution_method: z.string().nullable(),
  }),

  ecology: z.object({
    habitat: z.string().min(1),
    diet: z.enum(DIET_TYPES),
    predators: z.array(z.string()),
    prey: z.array(z.string()),
    symbiosis: z.array(z.string()).optional(),
    competition: z.array(z.string()).optional(),
  }),

  image_prompts: z.object({
    design: z.string().min(1),
  }),
});

export type InkMon = z.infer<typeof InkMonSchema>;

// 列表项类型（轻量版，用于图鉴列表）
export interface InkMonListItem {
  dex_number: number;
  name: string;
  name_en: string;
  primary_element: Element;
  secondary_element: Element | null;
  evolution_stage: EvolutionStage;
  color_palette: string[];
  base_stats: {
    hp: number;
    attack: number;
    defense: number;
  };
}

// 筛选选项
export interface FilterOptions {
  search?: string;
  elements?: Element[];
  stages?: EvolutionStage[];
}
