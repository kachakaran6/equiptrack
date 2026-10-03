import { query } from '../../db/index.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { RegisterInput, LoginInput } from './auth.schemas.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export class AuthService {
  static async register(input: RegisterInput): Promise<{ id: string; email: string }> {
    const existing = await query<UserRow>('SELECT id FROM users WHERE email = $1', [input.email]);
    if (existing.rows.length > 0) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const result = await query<UserRow>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [input.email, passwordHash]
    );

    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
    };
  }

  static async login(input: LoginInput): Promise<{ id: string; email: string }> {
    const result = await query<UserRow>(
      'SELECT id, email, password_hash FROM users WHERE email = $1',
      [input.email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password.');
    }

    const user = result.rows[0];
    const isMatch = await verifyPassword(input.password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    return {
      id: user.id,
      email: user.email,
    };
  }

  static async getUserById(id: string): Promise<{ id: string; email: string; created_at: string } | null> {
    const result = await query<UserRow>(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  }
}
