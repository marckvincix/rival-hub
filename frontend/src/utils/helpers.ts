import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

export const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'd MMM yyyy', { locale: it });
  } catch {
    return dateStr;
  }
};

export const formatTime = (timeStr?: string): string => {
  if (!timeStr) return '';
  return timeStr;
};

export const formatRelativeTime = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: it });
  } catch {
    return dateStr;
  }
};

export const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    'U10': 'Under 10',
    'U12': 'Under 12',
    'U14': 'Under 14',
    'U16': 'Under 16',
    'U18': 'Under 18',
    'Open': 'Open'
  };
  return labels[category] || category;
};

export const getFormatLabel = (format: string): string => {
  const labels: Record<string, string> = {
    'league': 'Campionato',
    'knockout': 'Eliminazione diretta',
    'groups_knockout': 'Gironi + Eliminazione',
    'mixed': 'Misto'
  };
  return labels[format] || format;
};

export const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    'draft': 'Bozza',
    'active': 'In corso',
    'completed': 'Terminato',
    'scheduled': 'Programmata',
    'live': 'In diretta'
  };
  return labels[status] || status;
};

export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    'goalkeeper': 'Portiere',
    'defender': 'Difensore',
    'midfielder': 'Centrocampista',
    'forward': 'Attaccante'
  };
  return labels[role] || role;
};

export const getEventTypeLabel = (eventType: string): string => {
  const labels: Record<string, string> = {
    'goal': 'Gol',
    'assist': 'Assist',
    'penalty_goal': 'Rigore',
    'own_goal': 'Autogol',
    'yellow_card': 'Ammonizione',
    'red_card': 'Espulsione',
    'substitution_in': 'Entra',
    'substitution_out': 'Esce',
    'mvp': 'MVP'
  };
  return labels[eventType] || eventType;
};

export const getEventIcon = (eventType: string): string => {
  const icons: Record<string, string> = {
    'goal': 'soccer-ball',
    'assist': 'shoe-cleat',
    'penalty_goal': 'soccer-ball',
    'own_goal': 'soccer-ball',
    'yellow_card': 'card',
    'red_card': 'card',
    'substitution_in': 'arrow-up',
    'substitution_out': 'arrow-down',
    'mvp': 'star'
  };
  return icons[eventType] || 'circle';
};
