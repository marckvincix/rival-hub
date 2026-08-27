import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';

const PAYWALL_SEEN_KEY_PREFIX = '@rival_hub_highlights_paywall_seen_';

// Shared by the login flow and the post-tour trigger so both agree on the
// same "show it once per account, unless already subscribed" rule.
export async function shouldShowHighlightsPaywall(): Promise<boolean> {
  const { user } = useAuthStore.getState();
  if (!user?.user_id) return false;

  const expiry = user.plan_expiry ? new Date(user.plan_expiry) : null;
  const hasPlus = user.plan === 'plus' && !!expiry && expiry > new Date();
  if (hasPlus) return false;

  const seenKey = `${PAYWALL_SEEN_KEY_PREFIX}${user.user_id}`;
  let alreadySeen = false;
  try {
    alreadySeen = (await AsyncStorage.getItem(seenKey)) === 'true';
  } catch {
    // ignore storage errors, default to showing it
  }
  if (alreadySeen) return false;

  try { await AsyncStorage.setItem(seenKey, 'true'); } catch { /* ignore */ }
  return true;
}
