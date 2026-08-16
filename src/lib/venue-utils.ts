export type DayGroup = 'WEEKDAYS' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface OpeningHour {
  dayGroup: DayGroup;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export function getVenueStatus(openingHours: OpeningHour[]) {
  if (!openingHours || openingHours.length === 0) return { status: 'UNKNOWN' };

  // 1. Get current time in Europe/Sarajevo
  const now = new Date();
  const options = { timeZone: 'Europe/Sarajevo', hour12: false };
  const formatter = new Intl.DateTimeFormat('en-GB', {
    ...options,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const formatted = formatter.formatToParts(now);
  const currentHour = parseInt(formatted.find(p => p.type === 'hour')?.value || '0');
  const currentMinute = parseInt(formatted.find(p => p.type === 'minute')?.value || '0');
  const currentTimeVal = currentHour * 60 + currentMinute;

  // Map JS getDay to our Groups
  const dayToGroup = (day: number): DayGroup => {
    if (day >= 1 && day <= 4) return 'WEEKDAYS';
    if (day === 5) return 'FRIDAY';
    if (day === 6) return 'SATURDAY';
    return 'SUNDAY';
  };

  const currentDay = now.getDay(); // 0-6
  const yesterday = (currentDay - 1 + 7) % 7;

  const currentGroup = dayToGroup(currentDay);
  const yesterdayGroup = dayToGroup(yesterday);

  const currentHours = openingHours.find(h => h.dayGroup === currentGroup);
  const yesterdayHours = openingHours.find(h => h.dayGroup === yesterdayGroup);

  // Helper to parse "HH:mm" to minutes from midnight
  const parseTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Check Yesterday's overnight hours
  if (yesterdayHours && !yesterdayHours.isClosed && yesterdayHours.openTime && yesterdayHours.closeTime) {
    const open = parseTime(yesterdayHours.openTime)!;
    const close = parseTime(yesterdayHours.closeTime)!;
    
    if (close < open) {
      // It's an overnight shift
      if (currentTimeVal < close) {
        return { 
          status: 'OPEN', 
          label: 'OTVORENO', 
          subLabel: `Zatvara se u ${yesterdayHours.closeTime}`,
          color: 'text-green-500'
        };
      }
    }
  }

  // Check Current day's hours
  if (currentHours && !currentHours.isClosed && currentHours.openTime && currentHours.closeTime) {
    const open = parseTime(currentHours.openTime)!;
    const close = parseTime(currentHours.closeTime)!;

    if (close > open) {
      // Normal day shift
      if (currentTimeVal >= open && currentTimeVal < close) {
        return { 
          status: 'OPEN', 
          label: 'OTVORENO', 
          subLabel: `Zatvara se u ${currentHours.closeTime}`,
          color: 'text-green-500'
        };
      }
    } else {
      // Overnight shift
      if (currentTimeVal >= open || currentTimeVal < close) {
        // If it's before midnight or after midnight (handled by yesterday check usually, but for consistency)
        if (currentTimeVal >= open) {
          return { 
            status: 'OPEN', 
            label: 'OTVORENO', 
            subLabel: `Zatvara se u ${currentHours.closeTime}`,
            color: 'text-green-500'
          };
        }
      }
    }

    if (currentTimeVal < open) {
      return { 
        status: 'CLOSED', 
        label: 'ZATVORENO', 
        subLabel: `Otvara se u ${currentHours.openTime}`,
        color: 'text-red-500'
      };
    }
  }

  // Default to closed
  return { 
    status: 'CLOSED', 
    label: 'ZATVORENO', 
    subLabel: '',
    color: 'text-muted'
  };
}
