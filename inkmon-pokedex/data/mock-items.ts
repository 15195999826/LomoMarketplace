// 物品类型定义
export type ItemCategory = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'key_item';
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Item {
  id: string;
  name_cn: string;
  name_en: string;
  category: ItemCategory;
  rarity: ItemRarity;
  description: string;
  effect?: string;
  stats?: {
    attack?: number;
    defense?: number;
    speed?: number;
    hp?: number;
  };
  image?: string;
  color_palette: string[];
}

// 分类中文映射
export const CATEGORY_NAMES: Record<ItemCategory, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
  consumable: '消耗品',
  material: '材料',
  key_item: '关键道具',
};

// 稀有度中文映射
export const RARITY_NAMES: Record<ItemRarity, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

// 假数据
export const mockItems: Item[] = [
  {
    id: 'flame-sword',
    name_cn: '烈焰之剑',
    name_en: 'Flame Blade',
    category: 'weapon',
    rarity: 'epic',
    description: '蕴含火焰精华的古老武器，据说是由远古火焰 InkMon 的鳞片锻造而成。',
    stats: { attack: 45 },
    color_palette: ['#FF6B35', '#FF8C42', '#FFD166'],
  },
  {
    id: 'healing-potion',
    name_cn: '治愈药水',
    name_en: 'Healing Potion',
    category: 'consumable',
    rarity: 'common',
    description: '由森林草药调配的基础药水，散发着淡淡的草香。',
    effect: '恢复 50 HP',
    color_palette: ['#7CB342', '#AED581', '#C5E1A5'],
  },
  {
    id: 'thunder-amulet',
    name_cn: '雷霆护符',
    name_en: 'Thunder Amulet',
    category: 'accessory',
    rarity: 'rare',
    description: '蕴含雷电之力的神秘护符，佩戴者可感受到微弱的电流涌动。',
    stats: { speed: 15 },
    color_palette: ['#FFC107', '#FFE082', '#FFF8E1'],
  },
  {
    id: 'iron-shield',
    name_cn: '铁壁盾牌',
    name_en: 'Iron Shield',
    category: 'armor',
    rarity: 'common',
    description: '由精炼铁矿打造的坚固盾牌，能有效抵御物理攻击。',
    stats: { defense: 30 },
    color_palette: ['#78909C', '#B0BEC5', '#ECEFF1'],
  },
  {
    id: 'dragon-scale',
    name_cn: '龙鳞碎片',
    name_en: 'Dragon Scale',
    category: 'material',
    rarity: 'rare',
    description: '从龙属性 InkMon 身上脱落的鳞片，是制作高级装备的珍贵材料。',
    color_palette: ['#5C6BC0', '#7986CB', '#9FA8DA'],
  },
  {
    id: 'ancient-key',
    name_cn: '远古钥匙',
    name_en: 'Ancient Key',
    category: 'key_item',
    rarity: 'legendary',
    description: '传说中打开 InkWorld 隐藏圣地的钥匙，散发着神秘的光芒。',
    color_palette: ['#FFD700', '#FFF176', '#FFFDE7'],
  },
  {
    id: 'mana-crystal',
    name_cn: '魔力水晶',
    name_en: 'Mana Crystal',
    category: 'material',
    rarity: 'epic',
    description: '蕴含纯净魔力的水晶，是强化装备和炼制药剂的核心材料。',
    color_palette: ['#AB47BC', '#CE93D8', '#F3E5F5'],
  },
  {
    id: 'wind-boots',
    name_cn: '疾风之靴',
    name_en: 'Wind Boots',
    category: 'armor',
    rarity: 'rare',
    description: '注入风元素的轻便靴子，穿上后行动如风。',
    stats: { speed: 25, defense: 10 },
    color_palette: ['#4DB6AC', '#80CBC4', '#B2DFDB'],
  },
];

// 获取所有物品
export function getAllItems(): Item[] {
  return mockItems;
}

// 根据 ID 获取物品
export function getItemById(id: string): Item | undefined {
  return mockItems.find(item => item.id === id);
}

// 获取物品总数
export function getItemCount(): number {
  return mockItems.length;
}
