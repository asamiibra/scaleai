// src/lib/cn.ts
/**
 * Utility function for conditional class names
 * Combines multiple class names, filtering out falsy values
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
    return classes.filter(Boolean).join(' ');
  }
  
  export default cn;