// Syncs tournament matches into a dedicated "Rival Hub" calendar on the
// device's native Calendar app (iOS/Android only — expo-calendar has no web
// implementation, guarded by isCalendarSyncSupported below).
//
// Unlike the single-match "add to calendar" button (which just opens a
// Google Calendar web link and has no way to reference the event again),
// this creates real on-device events and remembers each match's event ID
// locally (AsyncStorage, per device — there is no server-side concept of
// "my calendar"). That's what lets a later re-sync update only the matches
// whose date/time actually changed, leaving every other already-synced
// match's event untouched.
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CALENDAR_TITLE = 'Rival Hub';
const storageKey = (tournamentId: string) => `rivalhub_calendar_sync_${tournamentId}`;

export type MatchCalendarEntry = {
  eventId: string;
  match_date: string | null;
  match_time: string | null;
};
export type MatchCalendarSyncMap = Record<string, MatchCalendarEntry>;

export function isCalendarSyncSupported(): boolean {
  // expo-calendar is a native module — on web (or an old build that
  // predates it) the import above resolves to an empty/unimplemented
  // module rather than throwing, so check for a real function instead.
  return Platform.OS !== 'web' && typeof Calendar?.requestCalendarPermissionsAsync === 'function';
}

export async function getMatchCalendarSyncMap(tournamentId: string): Promise<MatchCalendarSyncMap> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(tournamentId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveMatchCalendarSyncMap(tournamentId: string, map: MatchCalendarSyncMap): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(tournamentId), JSON.stringify(map));
  } catch {
    // Non-fatal — worst case the next sync recreates an event that already
    // exists, rather than losing the user's calendar data.
  }
}

// Which of the given matches are missing from the sync map, or present but
// with a date/time that no longer matches what was last synced — exactly
// the set a re-sync needs to touch.
export function getPendingCalendarMatches<T extends { id: string; match_date?: string | null; match_time?: string | null }>(
  matches: T[],
  syncMap: MatchCalendarSyncMap
): T[] {
  return matches.filter((m) => {
    const entry = syncMap[m.id];
    if (!entry) return true;
    return entry.match_date !== (m.match_date ?? null) || entry.match_time !== (m.match_time ?? null);
  });
}

async function ensureCalendarId(): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = calendars.find((c) => c.title === CALENDAR_TITLE && c.allowsModifications);
  if (existing) return existing.id;

  const defaultSource: Calendar.Source =
    Platform.OS === 'ios'
      ? (await Calendar.getDefaultCalendarAsync()).source
      : { isLocalAccount: true, name: CALENDAR_TITLE, type: 'local' };

  return Calendar.createCalendarAsync({
    title: CALENDAR_TITLE,
    color: '#000000',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: defaultSource.id,
    source: defaultSource,
    name: CALENDAR_TITLE,
    ownerAccount: CALENDAR_TITLE,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

export type MatchCalendarInput = {
  matchId: string;
  match_date: string | null;
  match_time: string | null;
  title: string;
  notes: string;
  location: string;
  startDate: Date;
  endDate: Date;
};

export type MatchCalendarSyncResult = {
  granted: boolean;
  addedCount: number;
  updatedCount: number;
};

// Creates an event for any match not yet synced, and updates the event for
// any synced match whose date/time changed — every other already-synced
// match is left completely untouched. Persists the sync map before
// returning so the caller can immediately recompute button state.
export async function syncMatchesToCalendar(
  tournamentId: string,
  matchesToProcess: MatchCalendarInput[]
): Promise<MatchCalendarSyncResult> {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) {
    return { granted: false, addedCount: 0, updatedCount: 0 };
  }

  const calendarId = await ensureCalendarId();
  const syncMap = await getMatchCalendarSyncMap(tournamentId);

  let addedCount = 0;
  let updatedCount = 0;

  for (const m of matchesToProcess) {
    const existing = syncMap[m.matchId];
    const eventDetails = {
      title: m.title,
      notes: m.notes,
      location: m.location,
      startDate: m.startDate,
      endDate: m.endDate,
    };
    try {
      if (existing?.eventId) {
        await Calendar.updateEventAsync(existing.eventId, eventDetails);
        updatedCount++;
        syncMap[m.matchId] = { eventId: existing.eventId, match_date: m.match_date, match_time: m.match_time };
      } else {
        const eventId = await Calendar.createEventAsync(calendarId, eventDetails);
        addedCount++;
        syncMap[m.matchId] = { eventId, match_date: m.match_date, match_time: m.match_time };
      }
    } catch (err) {
      // Updating a stale event ID fails if the user deleted it by hand from
      // their own calendar app — fall back to creating a new one instead of
      // silently losing that match's sync.
      try {
        const eventId = await Calendar.createEventAsync(calendarId, eventDetails);
        addedCount++;
        syncMap[m.matchId] = { eventId, match_date: m.match_date, match_time: m.match_time };
      } catch (err2) {
        console.error('Calendar sync failed for match', m.matchId, err2);
      }
    }
  }

  await saveMatchCalendarSyncMap(tournamentId, syncMap);
  return { granted: true, addedCount, updatedCount };
}

export type MatchCalendarCleanupResult = {
  removedCount: number;
};

// Removes the calendar event (and local sync entry) for any previously
// synced match that no longer exists — e.g. an organizer deleted it.
// Never prompts for permission just to clean up: if it's not already
// granted (revoked since, say), the stale entries are still dropped from
// the local map so they don't linger forever, but their device events (if
// still present) are left alone rather than risk a permission prompt the
// user didn't ask for.
export async function cleanupDeletedMatchesFromCalendar(
  tournamentId: string,
  currentMatchIds: string[]
): Promise<MatchCalendarCleanupResult> {
  const syncMap = await getMatchCalendarSyncMap(tournamentId);
  const currentIds = new Set(currentMatchIds);
  const orphanedIds = Object.keys(syncMap).filter((id) => !currentIds.has(id));
  if (orphanedIds.length === 0) {
    return { removedCount: 0 };
  }

  const permission = await Calendar.getCalendarPermissionsAsync();
  let removedCount = 0;
  for (const matchId of orphanedIds) {
    const entry = syncMap[matchId];
    if (permission.granted && entry?.eventId) {
      try {
        await Calendar.deleteEventAsync(entry.eventId);
        removedCount++;
      } catch {
        // Already gone — the user deleted it by hand, or removed the
        // "Rival Hub" calendar entirely. Either way there's nothing left
        // to clean up on the device; the local entry still gets dropped
        // below.
      }
    }
    delete syncMap[matchId];
  }

  await saveMatchCalendarSyncMap(tournamentId, syncMap);
  return { removedCount };
}
