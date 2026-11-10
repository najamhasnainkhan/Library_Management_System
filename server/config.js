// Circulation rules. Defaults match the project spec; override with env vars if needed.
const num = (value, fallback) => {
  const n = Number(value);
  return value !== undefined && value !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const LOAN_DAYS = Math.floor(num(process.env.LOAN_DAYS, 14)) || 14;
export const MAX_RENEWALS = Math.floor(num(process.env.MAX_RENEWALS, 2));
export const FINE_PER_DAY = num(process.env.FINE_PER_DAY, 0.5);
export const MAX_ACTIVE_LOANS = Math.floor(num(process.env.MAX_ACTIVE_LOANS, 5)) || 5;
