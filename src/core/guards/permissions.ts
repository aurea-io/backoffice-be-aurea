export function hasPermissions(granted: string[], required: string[]): boolean {
  return granted.includes('*') || required.every((permission) => granted.includes(permission));
}
