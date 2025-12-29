# Zod 运行时验证模式参考

详细的 Zod 使用模式和最佳实践。

## 目录

- [基础 Schema 定义](#基础-schema-定义) - 原始类型、对象、数组、联合类型
- [类型推导](#类型推导) - infer、input、output
- [验证模式](#验证模式) - parse vs safeParse、异步验证
- [Schema 变换](#schema-变换) - pick、omit、partial、transform
- [常见使用场景](#常见使用场景) - API、表单、环境变量、配置文件
- [错误处理](#错误处理) - format、flatten、遍历
- [与其他库集成](#与其他库集成) - tRPC、Prisma

---

## 基础 Schema 定义

### 原始类型

```typescript
import { z } from 'zod'

// 字符串
const nameSchema = z.string()
const emailSchema = z.string().email()
const urlSchema = z.string().url()
const uuidSchema = z.string().uuid()
const minLenSchema = z.string().min(1).max(100)
const regexSchema = z.string().regex(/^[a-z]+$/)

// 数字
const ageSchema = z.number().int().positive()
const priceSchema = z.number().min(0).max(9999.99)
const percentSchema = z.number().min(0).max(100)

// 布尔
const isActiveSchema = z.boolean()

// 日期
const dateSchema = z.date()
const dateStringSchema = z.string().datetime()  // ISO 8601
```

### 对象类型

```typescript
// 基础对象
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  role: z.enum(['admin', 'member', 'guest']),
  createdAt: z.string().datetime(),
})

// 嵌套对象
const OrderSchema = z.object({
  id: z.string(),
  user: UserSchema,
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
    price: z.number().min(0),
  })),
  total: z.number().min(0),
  status: z.enum(['pending', 'paid', 'shipped', 'delivered']),
})
```

### 数组和元组

```typescript
// 数组
const tagsSchema = z.array(z.string())
const numbersSchema = z.array(z.number()).min(1).max(10)

// 元组（固定长度和类型）
const coordinatesSchema = z.tuple([z.number(), z.number()])
const rgbSchema = z.tuple([z.number(), z.number(), z.number()])
```

### 联合类型和字面量

```typescript
// 联合类型
const idSchema = z.union([z.string(), z.number()])
const resultSchema = z.union([
  z.object({ success: z.literal(true), data: z.unknown() }),
  z.object({ success: z.literal(false), error: z.string() }),
])

// 判别联合 (Discriminated Union)
const eventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('click'), x: z.number(), y: z.number() }),
  z.object({ type: z.literal('keypress'), key: z.string() }),
  z.object({ type: z.literal('scroll'), delta: z.number() }),
])
```

## 类型推导

```typescript
// 从 Schema 推导类型
type User = z.infer<typeof UserSchema>
type Order = z.infer<typeof OrderSchema>

// 推导输入类型（验证前）
type UserInput = z.input<typeof UserSchema>

// 推导输出类型（验证后）
type UserOutput = z.output<typeof UserSchema>
```

## 验证模式

### parse vs safeParse

```typescript
// parse: 失败时抛出 ZodError
try {
  const user = UserSchema.parse(data)
  // user 类型安全
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error(error.errors)
  }
}

// safeParse: 返回结果对象，不抛出异常
const result = UserSchema.safeParse(data)
if (result.success) {
  const user = result.data  // 类型安全
} else {
  console.error(result.error.errors)
}
```

### 异步验证

```typescript
// 异步 Schema（包含异步校验）
const UniqueEmailSchema = z.string().email().refine(
  async (email) => {
    const exists = await checkEmailExists(email)
    return !exists
  },
  { message: 'Email already exists' }
)

// 异步解析
const result = await UniqueEmailSchema.safeParseAsync(email)
```

## Schema 变换

### 派生 Schema

```typescript
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
  createdAt: z.date(),
})

// Pick: 选取字段
const UserPreviewSchema = UserSchema.pick({ id: true, name: true })

// Omit: 排除字段
const CreateUserSchema = UserSchema.omit({ id: true, createdAt: true })

// Partial: 全部可选
const UpdateUserSchema = UserSchema.partial()

// Required: 全部必填
const RequiredUserSchema = UserSchema.required()

// Extend: 扩展字段
const AdminSchema = UserSchema.extend({
  permissions: z.array(z.string()),
})

// Merge: 合并 Schema
const UserWithMetaSchema = UserSchema.merge(z.object({
  lastLogin: z.date().optional(),
}))
```

### 数据转换

```typescript
// transform: 转换数据
const NumberStringSchema = z.string().transform(Number)
const TrimmedSchema = z.string().transform(s => s.trim())

// preprocess: 预处理输入
const DateSchema = z.preprocess(
  (arg) => typeof arg === 'string' ? new Date(arg) : arg,
  z.date()
)

// default: 默认值
const ConfigSchema = z.object({
  timeout: z.number().default(5000),
  retries: z.number().default(3),
})
```

## 常见使用场景

### API 响应验证

```typescript
const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime(),
  })

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`)
  const json = await response.json()

  const result = ApiResponseSchema(UserSchema).safeParse(json)
  if (!result.success) {
    throw new Error(`Invalid API response: ${result.error.message}`)
  }

  return result.data.data
}
```

### 表单验证

```typescript
const LoginFormSchema = z.object({
  email: z.string().email('请输入有效的邮箱'),
  password: z.string()
    .min(8, '密码至少 8 个字符')
    .regex(/[A-Z]/, '密码需要包含大写字母')
    .regex(/[0-9]/, '密码需要包含数字'),
  rememberMe: z.boolean().default(false),
})

// React Hook Form 集成
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

const form = useForm<z.infer<typeof LoginFormSchema>>({
  resolver: zodResolver(LoginFormSchema),
})
```

### 环境变量验证

```typescript
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(32),
  PORT: z.string().transform(Number).pipe(z.number().positive()),
})

// 应用启动时验证
const env = EnvSchema.parse(process.env)
```

### 配置文件验证

```typescript
const AppConfigSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
  }),
  database: z.object({
    host: z.string(),
    port: z.number().default(5432),
    name: z.string(),
  }),
  features: z.object({
    enableCache: z.boolean().default(true),
    maxConnections: z.number().default(10),
  }).optional(),
})

function loadConfig(path: string): z.infer<typeof AppConfigSchema> {
  const raw = JSON.parse(fs.readFileSync(path, 'utf-8'))
  return AppConfigSchema.parse(raw)
}
```

## 错误处理

```typescript
const result = UserSchema.safeParse(invalidData)

if (!result.success) {
  // 格式化错误
  const formatted = result.error.format()
  // { email: { _errors: ['Invalid email'] }, ... }

  // 扁平化错误
  const flattened = result.error.flatten()
  // { formErrors: [], fieldErrors: { email: ['Invalid email'] } }

  // 遍历错误
  for (const issue of result.error.issues) {
    console.log(`${issue.path.join('.')}: ${issue.message}`)
  }
}
```

## 与其他库集成

### tRPC

```typescript
import { initTRPC } from '@trpc/server'
import { z } from 'zod'

const t = initTRPC.create()

const appRouter = t.router({
  createUser: t.procedure
    .input(z.object({
      name: z.string(),
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      // input 已验证且类型安全
      return createUser(input)
    }),
})
```

### Prisma

```typescript
import { z } from 'zod'
import { Prisma } from '@prisma/client'

// 从 Prisma 生成的类型创建 Schema
const UserCreateSchema = z.object({
  name: z.string(),
  email: z.string().email(),
}) satisfies z.ZodType<Prisma.UserCreateInput>
```
