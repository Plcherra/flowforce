export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.info(...args);
  },
  warn: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.warn(...args);
  },
  error: (...args: any[]) => {
    // Always log errors to console for visibility, but we could wire telemetry here
    // eslint-disable-next-line no-console
    console.error(...args);
  }
};
