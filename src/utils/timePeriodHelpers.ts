// Time period types and utilities for stats widgets

export type TimePeriod = 'today' | 'week' | 'month' | 'year';

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
    today: 'TODAY',
    week: 'THIS WEEK',
    month: 'THIS MONTH',
    year: 'THIS YEAR'
};

export const TIME_PERIODS: TimePeriod[] = ['today', 'week', 'month', 'year'];

/**
 * Get the next time period in the cycle
 */
export function getNextTimePeriod(current: TimePeriod): TimePeriod {
    const currentIndex = TIME_PERIODS.indexOf(current);
    const nextIndex = (currentIndex + 1) % TIME_PERIODS.length;
    return TIME_PERIODS[nextIndex];
}

/**
 * Get the date range for a given time period
 * Returns dates as YYYY-MM-DD strings in local timezone
 */
export function getDateRangeForPeriod(period: TimePeriod): { startDate: string; endDate: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    switch (period) {
        case 'today': {
            const todayStr = formatDate(today);
            return { startDate: todayStr, endDate: todayStr };
        }
        case 'week': {
            // Get Monday of current week
            const day = today.getDay();
            const diff = day === 0 ? -6 : 1 - day; // Days to get to Monday
            const monday = new Date(today);
            monday.setDate(today.getDate() + diff);
            
            // Sunday of current week
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            
            return { startDate: formatDate(monday), endDate: formatDate(sunday) };
        }
        case 'month': {
            // First day of current month
            const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            // Last day of current month
            const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            
            return { startDate: formatDate(firstOfMonth), endDate: formatDate(lastOfMonth) };
        }
        case 'year': {
            // First day of current year
            const firstOfYear = new Date(today.getFullYear(), 0, 1);
            // Last day of current year
            const lastOfYear = new Date(today.getFullYear(), 11, 31);
            
            return { startDate: formatDate(firstOfYear), endDate: formatDate(lastOfYear) };
        }
    }
}

/**
 * Get date range for a time period using created_at timestamps (ISO format)
 * Useful for filtering by created_at field
 */
export function getTimestampRangeForPeriod(period: TimePeriod): { startTimestamp: string; endTimestamp: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
        case 'today': {
            const start = today;
            const end = new Date(today);
            end.setDate(end.getDate() + 1);
            return { startTimestamp: start.toISOString(), endTimestamp: end.toISOString() };
        }
        case 'week': {
            const day = today.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            const monday = new Date(today);
            monday.setDate(today.getDate() + diff);
            
            const nextMonday = new Date(monday);
            nextMonday.setDate(monday.getDate() + 7);
            
            return { startTimestamp: monday.toISOString(), endTimestamp: nextMonday.toISOString() };
        }
        case 'month': {
            const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const firstOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            
            return { startTimestamp: firstOfMonth.toISOString(), endTimestamp: firstOfNextMonth.toISOString() };
        }
        case 'year': {
            const firstOfYear = new Date(today.getFullYear(), 0, 1);
            const firstOfNextYear = new Date(today.getFullYear() + 1, 0, 1);
            
            return { startTimestamp: firstOfYear.toISOString(), endTimestamp: firstOfNextYear.toISOString() };
        }
    }
}
