export function sortTerminalsByName<T extends { name: string }>(array: T[]): T[] {
    return [...array].sort((a, b) => a.name.localeCompare(b.name));
  }