import { PasswordHasher } from './passwordHash';

const STORAGE_KEYS = {
  CURRENT_USER: 'christmas-gift-exchange-user',
  USER_PASSWORD_HASH: 'christmas-gift-exchange-password-hash'
};

export class LocalStorageService {
  static saveUser(username: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, username);
    } catch (error) {
      console.warn('Failed to save user to localStorage:', error);
    }
  }

  static getUser(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    } catch (error) {
      console.warn('Failed to get user from localStorage:', error);
      return null;
    }
  }

  static async savePassword(password: string): Promise<void> {
    try {
      const passwordHash = await PasswordHasher.hashPassword(password);
      localStorage.setItem(STORAGE_KEYS.USER_PASSWORD_HASH, passwordHash);
    } catch (error) {
      console.warn('Failed to save password to localStorage:', error);
    }
  }

  static getPasswordHash(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.USER_PASSWORD_HASH);
    } catch (error) {
      console.warn('Failed to get password hash from localStorage:', error);
      return null;
    }
  }

  static async verifyStoredPassword(password: string): Promise<boolean> {
    try {
      const storedHash = this.getPasswordHash();
      if (!storedHash) {
        return false;
      }
      const passwordHash = await PasswordHasher.hashPassword(password);
      return passwordHash === storedHash;
    } catch (error) {
      console.warn('Failed to verify stored password:', error);
      return false;
    }
  }

  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.USER_PASSWORD_HASH);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}
