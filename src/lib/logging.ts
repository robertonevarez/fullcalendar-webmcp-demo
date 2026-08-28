type LogLevel = 'info' | 'warn' | 'error';

interface LogPayload {
  business_id?: string;
  operation: string;
  [key: string]: unknown;
}

export function log(level: LogLevel, payload: LogPayload) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    ...payload,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.info(line);
  }
}
