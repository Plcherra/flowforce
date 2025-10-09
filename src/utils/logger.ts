export const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
       
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
     
    console.info(...args);
  },
  warn: (...args: any[]) => {
     
    console.warn(...args);
  },
  error: (...args: any[]) => {
    // Always log errors to console for visibility, but we could wire telemetry here
     
    console.error(...args);
  }
};
