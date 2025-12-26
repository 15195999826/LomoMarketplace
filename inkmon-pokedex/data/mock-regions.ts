// 地形/生态类型
export type Biome = 'forest' | 'ocean' | 'mountain' | 'desert' | 'tundra' | 'swamp';

// 区域数据结构
export interface WorldRegion {
  id: string;
  name_cn: string;
  name_en: string;
  biome: Biome;
  description: string;
  // 六边形坐标 (cube coordinates)
  gridPosition: { q: number; r: number; s: number };
  // 关联的 InkMon 英文名列表
  inkmons: string[];
  // 区域特点
  features?: string[];
}

// 生态类型中文映射
export const BIOME_NAMES: Record<Biome, string> = {
  forest: '森林',
  ocean: '海洋',
  mountain: '山脉',
  desert: '沙漠',
  tundra: '冻土',
  swamp: '沼泽',
};

// 生态类型图标
export const BIOME_ICONS: Record<Biome, string> = {
  forest: '🌲',
  ocean: '🌊',
  mountain: '⛰️',
  desert: '🏜️',
  tundra: '❄️',
  swamp: '🌿',
};

// 假数据 - InkWorld 地区
export const mockRegions: WorldRegion[] = [
  {
    id: 'emerald-forest',
    name_cn: '翡翠森林',
    name_en: 'Emerald Forest',
    biome: 'forest',
    description: '茂密的原始森林，阳光透过树冠洒落，是草属性和虫属性 InkMon 的天堂。这里的植被四季常青，空气中弥漫着草木的清香。',
    gridPosition: { q: 0, r: 0, s: 0 },
    inkmons: ['Leafling', 'Floravine', 'Buglet'],
    features: ['古老树木', '神秘小径', '萤火虫群'],
  },
  {
    id: 'azure-depths',
    name_cn: '蔚蓝深渊',
    name_en: 'Azure Depths',
    biome: 'ocean',
    description: '广阔的海域，从浅滩延伸至深海。水属性 InkMon 在珊瑚礁和海底洞穴中繁衍生息，海流携带着神秘的力量。',
    gridPosition: { q: 1, r: -1, s: 0 },
    inkmons: ['Aqualing', 'Coraline', 'Tideweaver'],
    features: ['珊瑚礁群', '深海遗迹', '发光藻类'],
  },
  {
    id: 'crimson-peaks',
    name_cn: '赤红山脉',
    name_en: 'Crimson Peaks',
    biome: 'mountain',
    description: '连绵的高山，因含有赤铁矿而呈现独特的红色。岩石和钢属性的 InkMon 在这里的洞穴和悬崖中安家。',
    gridPosition: { q: -1, r: 0, s: 1 },
    inkmons: ['Stoneling', 'Ironhide', 'Peakwing'],
    features: ['熔岩温泉', '水晶洞穴', '云海'],
  },
  {
    id: 'golden-dunes',
    name_cn: '金沙沙漠',
    name_en: 'Golden Dunes',
    biome: 'desert',
    description: '炽热的沙漠，白天酷热难耐，夜晚却异常寒冷。火属性和地面属性的 InkMon 已经完美适应了这里的极端环境。',
    gridPosition: { q: 1, r: 0, s: -1 },
    inkmons: ['Flameling', 'Sandburrower', 'Scorchion'],
    features: ['绿洲', '沙暴区', '古代遗迹'],
  },
  {
    id: 'frost-realm',
    name_cn: '霜雪国度',
    name_en: 'Frost Realm',
    biome: 'tundra',
    description: '终年积雪的冻土带，寒风呼啸。冰属性的 InkMon 在这片银白世界中自由驰骋，极光时常点亮天空。',
    gridPosition: { q: 0, r: -1, s: 1 },
    inkmons: ['Frostling', 'Glaceon', 'Blizzardon'],
    features: ['冰川', '极光', '冻土洞穴'],
  },
  {
    id: 'misty-swamp',
    name_cn: '迷雾沼泽',
    name_en: 'Misty Swamp',
    biome: 'swamp',
    description: '常年笼罩在浓雾中的神秘沼泽。毒属性和幽灵属性的 InkMon 喜欢在这里出没，据说深处藏着远古的秘密。',
    gridPosition: { q: -1, r: 1, s: 0 },
    inkmons: ['Toxicling', 'Phantomist', 'Bogcreeper'],
    features: ['毒气池', '幽灵树', '沉没村庄'],
  },
  {
    id: 'storm-plains',
    name_cn: '雷暴平原',
    name_en: 'Storm Plains',
    biome: 'forest',
    description: '广袤的草原，却时常遭受雷暴侵袭。电属性和飞行属性的 InkMon 在风暴中汲取力量，是天空霸主的训练场。',
    gridPosition: { q: 0, r: 1, s: -1 },
    inkmons: ['Sparklet', 'Thunderwing', 'Stormrider'],
    features: ['雷击痕迹', '风车遗址', '导电晶石'],
  },
];

// 获取所有区域
export function getAllRegions(): WorldRegion[] {
  return mockRegions;
}

// 根据 ID 获取区域
export function getRegionById(id: string): WorldRegion | undefined {
  return mockRegions.find(region => region.id === id);
}

// 根据生态类型筛选区域
export function getRegionsByBiome(biome: Biome): WorldRegion[] {
  return mockRegions.filter(region => region.biome === biome);
}
