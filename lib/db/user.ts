import { prisma } from '@/lib/prisma';
import type { User } from '@prisma/client';

/**
 * 根据ID获取用户
 */
export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * 根据用户名获取用户
 */
export async function getUserByName(name: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { name },
  });
}

/**
 * 根据邮箱获取用户
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * 创建用户
 */
export async function createUser(data: {
  name: string;
  email?: string;
  password: string;
  openRouterKey?: string;
}): Promise<User> {
  return prisma.user.create({
    data,
  });
}

/**
 * 用户可更新的字段类型
 */
type UserUpdatableField = keyof Pick<User,
  'openRouterKey' |
  'defaultModel' |
  'defaultEmbeddingModel' |
  'summaryTemperature' |
  'summaryMaxTokens'
>;

/**
 * 通用的用户字段更新函数
 * @param userId 用户ID
 * @param field 要更新的字段名
 * @param value 新值(可以是null)
 * @returns 更新后的用户对象
 */
export async function updateUserField<T extends UserUpdatableField>(
  userId: string,
  field: T,
  value: User[T] | null
): Promise<User> {
  return prisma.user.update({
    where: { id: userId },
    data: { [field]: value },
  });
}

/**
 * 更新用户的OpenRouter API Key
 */
export async function updateUserOpenRouterKey(
  userId: string,
  openRouterKey: string | null
): Promise<User> {
  return updateUserField(userId, 'openRouterKey', openRouterKey);
}

/**
 * 更新用户的默认模型
 */
export async function updateUserDefaultModel(
  userId: string,
  defaultModel: string | null
): Promise<User> {
  return updateUserField(userId, 'defaultModel', defaultModel);
}

/**
 * 更新用户的默认Embedding模型
 */
export async function updateUserDefaultEmbeddingModel(
  userId: string,
  defaultEmbeddingModel: string | null
): Promise<User> {
  return updateUserField(userId, 'defaultEmbeddingModel', defaultEmbeddingModel);
}

/**
 * 更新用户的章节摘要temperature参数
 */
export async function updateUserSummaryTemperature(
  userId: string,
  summaryTemperature: number | null
): Promise<User> {
  return updateUserField(userId, 'summaryTemperature', summaryTemperature);
}

/**
 * 更新用户的章节摘要max_tokens参数
 */
export async function updateUserSummaryMaxTokens(
  userId: string,
  summaryMaxTokens: number | null
): Promise<User> {
  return updateUserField(userId, 'summaryMaxTokens', summaryMaxTokens);
}

