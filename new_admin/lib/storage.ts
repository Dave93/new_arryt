import Dexie from 'dexie';
import { User } from './auth-types';

interface AuthData {
  id: number;
  user: User | null;
  token: string | null;
  expiration: string | null;
}

class AppDatabase extends Dexie {
  authData: Dexie.Table<AuthData, number>;

  constructor() {
    super('AppDatabase');
    this.version(1).stores({
      authData: '++id'
    });
    this.authData = this.table('authData');
  }
}

const db = new AppDatabase();

export const TOKEN_KEY = "admin-auth";

export const storage = {
  // Save auth data to IndexedDB
  async setAuthData(data: { user: User | null; token: string | null; expiration: string | null }): Promise<void> {
    try {
      // Clear previous auth data
      await db.authData.clear();
      // Save new auth data
      await db.authData.add({ id: 1, ...data });
      console.log('Auth data saved successfully to IndexedDB:', data);
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
      throw error;
    }
  },

  // Get auth data from IndexedDB
  async getAuthData(): Promise<{ user: User | null; token: string | null; expiration: string | null } | null> {
    try {
      const authData = await db.authData.get(1);
      return authData ? { user: authData.user, token: authData.token, expiration: authData.expiration } : null;
    } catch (error) {
      console.error('Error getting data from IndexedDB:', error);
      return null;
    }
  },

  // Remove auth data from IndexedDB
  async removeAuthData(): Promise<void> {
    try {
      await db.authData.clear();
      console.log('Auth data removed from IndexedDB');
    } catch (error) {
      console.error('Error removing data from IndexedDB:', error);
      throw error;
    }
  },

  // Check if database is accessible
  async isAvailable(): Promise<boolean> {
    try {
      await db.authData.count();
      return true;
    } catch (error) {
      console.error('IndexedDB is not available:', error);
      return false;
    }
  }
}; 