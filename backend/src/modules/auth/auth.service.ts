import { query } from '../../db/index.js';
import { hashPassword, verifyPassword } from '../../utils/crypto.js';
import { RegisterInput, LoginInput } from './auth.schemas.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export class AuthService {
  static async register(input: RegisterInput): Promise<{ id: string; email: string; role: string }> {
    const existing = await query<UserRow>('SELECT id FROM users WHERE email = $1', [input.email]);
    if (existing.rows.length > 0) {
      throw new Error('An account with this email already exists.');
    }

    const passwordHash = await hashPassword(input.password);
    const result = await query<UserRow>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role, created_at',
      [input.email, passwordHash]
    );

    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
      role: result.rows[0].role ?? 'user',
    };
  }

  static async login(input: LoginInput): Promise<{ id: string; email: string; role: string }> {
    const result = await query<UserRow>(
      "SELECT id, email, password_hash, role, status FROM users WHERE email = $1",
      [input.email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password.');
    }

    const user = result.rows[0];

    if (user.status === 'suspended') {
      throw new Error('This account has been suspended. Please contact the administrator.');
    }

    const isMatch = await verifyPassword(input.password, user.password_hash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role ?? 'user',
    };
  }

  static async getUserById(id: string): Promise<{ id: string; email: string; role: string; created_at: string } | null> {
    const result = await query<UserRow>(
      'SELECT id, email, role, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return null;
    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
      role: result.rows[0].role ?? 'user',
      created_at: result.rows[0].created_at,
    };
  }
}
