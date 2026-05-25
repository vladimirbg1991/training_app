import * as SecureStore from 'expo-secure-store';
import type { TokenCache } from '@clerk/expo';

/**
 * Clerk token cache backed by expo-secure-store.
 * Tokens are stored in the iOS Keychain / Android Keystore — never MMKV.
 *
 * Uses AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY to prevent token restoration
 * from iCloud Keychain backups to a different device.
 */
export const tokenCache: TokenCache = {
  async getToken(key: string): Promise<string | undefined | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
};
