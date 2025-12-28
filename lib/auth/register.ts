import { createUser, getUserByName, getUserByEmail } from '@/lib/db/user';
import bcrypt from 'bcryptjs';

export interface RegisterData {
  name: string;
  email?: string;
  password: string;
}

/**
 * 注册新用户
 */
export async function registerUser(data: RegisterData) {
  // 检查用户名是否已存在
  const existingUserByName = await getUserByName(data.name);
  if (existingUserByName) {
    throw new Error('用户名已存在');
  }

  // 如果提供了邮箱，检查邮箱是否已存在
  if (data.email) {
    const existingUserByEmail = await getUserByEmail(data.email);
    if (existingUserByEmail) {
      throw new Error('邮箱已存在');
    }
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // 创建用户
  const user = await createUser({
    name: data.name,
    email: data.email,
    password: hashedPassword,
  });

  // 不返回密码
  const { password: _password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

