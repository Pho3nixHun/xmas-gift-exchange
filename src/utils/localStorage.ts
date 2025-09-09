const STORAGE_KEYS = {
  CURRENT_USER: 'christmas-gift-exchange-user',
  USER_PASSWORD: 'christmas-gift-exchange-password'
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


  static savePassword(password: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PASSWORD, password);
    } catch (error) {
      console.warn('Failed to save password to localStorage:', error);
    }
  }

  static getPassword(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.USER_PASSWORD);
    } catch (error) {
      console.warn('Failed to get password from localStorage:', error);
      return null;
    }
  }

  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      localStorage.removeItem(STORAGE_KEYS.USER_PASSWORD);
      // Also remove legacy selected name if it exists
      localStorage.removeItem('christmas-gift-exchange-selected-name');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
}