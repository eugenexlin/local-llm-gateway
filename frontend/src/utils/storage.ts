const LAST_USER_ID_KEY = 'llm-last-user-id';
const NAMESPACE_PREFIX = 'llm_user_';

export function getLastUserId(): string | null {
  try {
    return localStorage.getItem(LAST_USER_ID_KEY);
  } catch {
    return null;
  }
}

export function setLastUserId(userId: string): void {
  try {
    localStorage.setItem(LAST_USER_ID_KEY, userId);
  } catch {
    // Storage unavailable
  }
}

export function getNamespacedKey(key: string, userId: string): string {
  return `${NAMESPACE_PREFIX}${userId}_${key}`;
}

export function getItem(userId: string, key: string): string | null {
  const namespacedKey = getNamespacedKey(key, userId);
  try {
    return localStorage.getItem(namespacedKey);
  } catch {
    return null;
  }
}

export function setItem(userId: string, key: string, value: string): void {
  const namespacedKey = getNamespacedKey(key, userId);
  try {
    localStorage.setItem(namespacedKey, value);
  } catch {
    // Storage unavailable
  }
}

export function removeItem(userId: string, key: string): void {
  const namespacedKey = getNamespacedKey(key, userId);
  try {
    localStorage.removeItem(namespacedKey);
  } catch {
    // Storage unavailable
  }
}

export function migrateLegacyKeys(userId: string): void {
  const legacyKeys = [
    'llm_conversations',
    'llm_active_conversation_id',
    'llm_include_reasoning_in_context',
    'llm_chat_settings',
    'theme',
    'llm_selected_api_key_id',
    'drawer-collapsed',
    'llm-gateway-timezone',
    'llm-gateway-cache-enabled',
  ];

  for (const legacyKey of legacyKeys) {
    try {
      const value = localStorage.getItem(legacyKey);
      if (value !== null) {
        setItem(userId, legacyKey, value);
        localStorage.removeItem(legacyKey);
      }
    } catch {
      // Skip on error
    }
  }
}
