/**
 * Calculate the current consecutive day streak from a list of date strings.
 * Walks backwards from the reference date. If the reference date itself isn't
 * in the set, the streak still counts from the previous day (so a streak
 * isn't broken just because today hasn't been logged yet).
 *
 * @param {string[]} dates - Array of 'yyyy-MM-dd' date strings
 * @param {Date} referenceDate - Date to count back from (defaults to today)
 * @returns {number} - The consecutive day streak
 */
export function calculateDayStreak(dates, referenceDate = new Date()) {
  if (!dates || dates.length === 0) return 0;

  const dateSet = new Set(dates.map(d => String(d).substring(0, 10)));
  let streak = 0;
  let checkDate = new Date(referenceDate);
  checkDate.setHours(0, 0, 0, 0);

  // If the reference date isn't logged, start from the previous day
  // (allows streak to persist when today hasn't been completed yet)
  if (!dateSet.has(formatDateStr(checkDate))) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (dateSet.has(formatDateStr(checkDate))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

/**
 * Calculate the longest streak ever from a list of date strings.
 * @param {string[]} dates - Array of 'yyyy-MM-dd' date strings
 * @returns {number} - The longest consecutive day streak
 */
export function calculateLongestStreak(dates) {
  if (!dates || dates.length === 0) return 0;

  const sorted = [...new Set(dates.map(d => String(d).substring(0, 10)))]
    .sort((a, b) => new Date(a) - new Date(b));

  let longest = 0;
  let temp = 0;

  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      temp = 1;
    } else {
      const diff = Math.floor(
        (new Date(sorted[i]) - new Date(sorted[i - 1])) / (1000 * 60 * 60 * 24)
      );
      if (diff === 1) {
        temp++;
      } else {
        longest = Math.max(longest, temp);
        temp = 1;
      }
    }
  }

  return Math.max(longest, temp);
}

function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}