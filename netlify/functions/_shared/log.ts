const quietLogs = process.env.QUIET_LOGS === 'true';
const logLevel = (process.env.LOG_LEVEL || '').toLowerCase();
const suppress = quietLogs || logLevel === 'error';

export function log(message?: any, ...optionalParams: any[]) {
  if (suppress) return;
  console.log(message, ...optionalParams);
}

export function debug(message?: any, ...optionalParams: any[]) {
  if (suppress) return;
  console.debug(message, ...optionalParams);
}

export function warn(message?: any, ...optionalParams: any[]) {
  if (suppress) return;
  console.warn(message, ...optionalParams);
}
