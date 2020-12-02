export function createUUID() {
  return [...Array(4)].map(() => Math.random().toString(36).substr(2, 4)).join('');
}
