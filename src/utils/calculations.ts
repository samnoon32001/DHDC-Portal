export interface MarkItem {
  maximumMark?: number;
  maxMark?: number;
  obtainedMark: number | null;
}

export interface CCEResult {
  totalMaximum: number;
  totalObtained: number;
  percentage: number;
  weightedMark: number; // Final out of 30
  finalMarkOutOf30: number; // Alias for weightedMark
  formattedWeightedMark: string; // e.g. "24.30"
  completedCount: number;
  totalCount: number;
  isFullyCompleted: boolean;
}

/**
 * Calculates CCE totals, percentage, and 30-mark weightage.
 * 
 * Formula:
 * CCE Percentage = (Total Obtained / Total Maximum) * 100
 * Final Subject Mark = (Total Obtained / Total Maximum) * 30
 * 
 * Handled zero totalMaximum safely.
 * Rounds to 2 decimal places.
 */
export function calculateCCETotal(items: MarkItem[]): CCEResult {
  const totalMaximum = items.reduce(
    (sum, item) => sum + (Number(item.maximumMark ?? item.maxMark) || 0),
    0
  );
  
  let totalObtained = 0;
  let completedCount = 0;

  for (const item of items) {
    if (item.obtainedMark !== null && item.obtainedMark !== undefined && !isNaN(item.obtainedMark)) {
      totalObtained += Number(item.obtainedMark);
      completedCount++;
    }
  }

  const percentage = totalMaximum > 0 ? (totalObtained / totalMaximum) * 100 : 0;
  const weightedMark = totalMaximum > 0 ? (totalObtained / totalMaximum) * 30 : 0;
  
  // Format to exactly 2 decimal places
  const roundedWeighted = Math.round(weightedMark * 100) / 100;
  const formattedWeightedMark = roundedWeighted.toFixed(2);

  return {
    totalMaximum: Math.round(totalMaximum * 100) / 100,
    totalObtained: Math.round(totalObtained * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
    weightedMark: roundedWeighted,
    finalMarkOutOf30: roundedWeighted,
    formattedWeightedMark,
    completedCount,
    totalCount: items.length,
    isFullyCompleted: items.length > 0 && completedCount === items.length,
  };
}

/**
 * Validates entered mark:
 * - Must be a valid number
 * - Cannot be negative
 * - Cannot exceed maximumMark
 * - Accepts decimals (e.g. 17.5)
 */
export function validateMark(value: number | string | null | undefined, maxMark: number): { valid: boolean; error?: string; parsedValue?: number } {
  if (value === null || value === undefined || value === '') {
    return { valid: true, parsedValue: undefined }; // Empty/pending is allowed
  }

  const num = typeof value === 'string' ? parseFloat(value.trim()) : value;

  if (isNaN(num)) {
    return { valid: false, error: 'Mark must be a valid number' };
  }

  if (num < 0) {
    return { valid: false, error: 'Mark cannot be negative' };
  }

  if (num > maxMark) {
    return { valid: false, error: `Mark cannot exceed maximum of ${maxMark}` };
  }

  return { valid: true, parsedValue: Math.round(num * 100) / 100 };
}

/**
 * Helper to get badge styling and labels for mark status
 */
export function getMarkStatus(obtainedMark: number | null | undefined): {
  status: 'completed' | 'pending';
  label: string;
  badgeClass: string;
} {
  if (obtainedMark !== null && obtainedMark !== undefined && !isNaN(obtainedMark)) {
    return {
      status: 'completed',
      label: 'Completed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    };
  }
  return {
    status: 'pending',
    label: 'Pending',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
  };
}
