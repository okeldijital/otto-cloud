/**
 * Permission set helper — replaces role string checks (A.6).
 *
 * Old: if (user.role === "admin")
 * New: permissions.has("contracts.review")
 */

export class PermissionSet {
  private readonly set: Set<string>;

  constructor(keys: string[] = []) {
    this.set = new Set(keys);
  }

  has(permission: string): boolean {
    return this.set.has(permission);
  }

  hasAny(...permissions: string[]): boolean {
    return permissions.some((p) => this.set.has(p));
  }

  hasAll(...permissions: string[]): boolean {
    return permissions.every((p) => this.set.has(p));
  }

  list(): string[] {
    return [...this.set];
  }

  static empty(): PermissionSet {
    return new PermissionSet();
  }

  static from(keys: string[]): PermissionSet {
    return new PermissionSet(keys);
  }
}
