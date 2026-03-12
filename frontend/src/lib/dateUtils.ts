import type { DynamicPeriodOption } from '@/components/time-periods/DynamicTimePeriodSelector';

export function getDynamicPeriodDates(option: DynamicPeriodOption): { startDate: string; endDate: string } {
  const now = new Date();

  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const start = new Date(now);
  const end = new Date(now);

  switch (option) {
    case 'TODAY':
      // both start and end are today
      break;
    case 'YESTERDAY':
      start.setDate(now.getDate() - 1);
      end.setDate(now.getDate() - 1);
      break;
    case 'THIS_WEEK': {
      // Assuming week starts on Sunday
      const dayOfWeek = now.getDay();
      start.setDate(now.getDate() - dayOfWeek);
      end.setDate(now.getDate() + (6 - dayOfWeek));
      break;
    }
    case 'LAST_WEEK': {
      const lastWeekNow = new Date(now);
      lastWeekNow.setDate(now.getDate() - 7);
      const lwDayOfWeek = lastWeekNow.getDay();
      start.setTime(lastWeekNow.getTime());
      end.setTime(lastWeekNow.getTime());
      start.setDate(lastWeekNow.getDate() - lwDayOfWeek);
      end.setDate(lastWeekNow.getDate() + (6 - lwDayOfWeek));
      break;
    }
    case 'THIS_MONTH':
      start.setDate(1);
      end.setMonth(now.getMonth() + 1);
      end.setDate(0); // last day of current month
      break;
    case 'LAST_MONTH':
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      end.setMonth(now.getMonth());
      end.setDate(0);
      break;
    case 'THIS_YEAR':
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      break;
  }

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}
