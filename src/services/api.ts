import { NamePickerData } from '../types';
import { WishList } from '../types/wishItem';
import { PasswordHasher } from '../utils/passwordHash';

const API_URL = 'https://api.jsonbin.io/v3/b/6160da3caa02be1d4456c67c/';
const API_HEADERS = {
  'X-Master-Key':
    '$2b$10$KjA6bzM7uur9YFhXy99TUO9CTPHcHTGmhWx8h89B1OHt0uavJT2iW',
  'X-BIN-META': 'false',
  'Content-Type': 'application/json'
};

// Legacy exports for backwards compatibility
export const getNamePickerData = () => ApiService.fetchData();
export const setNamePickerData = (data: NamePickerData) =>
  ApiService.updateData(data);

export class ApiService {
  static async fetchData(): Promise<NamePickerData> {
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: API_HEADERS
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to fetch data: ${error}`);
    }
  }

  static async updateData(data: NamePickerData): Promise<NamePickerData> {
    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: API_HEADERS,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.record || result;
    } catch (error) {
      throw new Error(`Failed to update data: ${error}`);
    }
  }

  static async pickName(
    user: string,
    selectedName: string
  ): Promise<NamePickerData> {
    const currentData = await this.fetchData();

    if (currentData.taken[selectedName]) {
      throw new Error('This name has already been picked!');
    }

    const updatedData = {
      ...currentData,
      taken: { ...currentData.taken, [selectedName]: user }
    };

    return await this.updateData(updatedData);
  }

  static async setGift(user: string, gift: string): Promise<NamePickerData> {
    const currentData = await this.fetchData();

    const updatedData = {
      ...currentData,
      gifts: { ...currentData.gifts, [user]: gift }
    };

    return await this.updateData(updatedData);
  }

  static async setWishList(
    user: string,
    wishList: WishList
  ): Promise<NamePickerData> {
    const currentData = await this.fetchData();

    const updatedData = {
      ...currentData,
      wishLists: { ...currentData.wishLists, [user]: wishList }
    };

    return await this.updateData(updatedData);
  }

  static async setPassword(
    user: string,
    password: string
  ): Promise<NamePickerData> {
    const currentData = await this.fetchData();

    // Hash the password before storing
    const passwordHash = await PasswordHasher.hashPassword(password);

    const updatedData = {
      ...currentData,
      passwords: { ...currentData.passwords, [user]: passwordHash }
    };

    return await this.updateData(updatedData);
  }

  static async verifyPassword(
    user: string,
    password: string
  ): Promise<boolean> {
    const currentData = await this.fetchData();
    const storedHashString = currentData.passwords?.[user];

    if (!storedHashString) {
      return false; // No password set for user
    }

    try {
      return await PasswordHasher.verifyPassword(password, storedHashString);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }
}
