import { zodToJsonSchema } from 'zod-to-json-schema';
import { AbilityConfigJSONSchema } from './schema';

/**
 * 自动生成的 JSON Schema（供 Monaco Editor 使用）
 */
export const abilityConfigJsonSchema = zodToJsonSchema(AbilityConfigJSONSchema, {
  name: 'AbilityConfigJSON',
  $refStrategy: 'none',
});

/**
 * 带描述信息的增强版 JSON Schema
 */
export const abilityConfigJsonSchemaEnhanced = {
  ...abilityConfigJsonSchema,
  title: 'AbilityConfig',
  description: '技能配置 JSON 格式',
};
