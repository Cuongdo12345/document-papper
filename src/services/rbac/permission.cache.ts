import { getUserEffectivePermissions } from "../../services/rbac/permission.service"

const cache = new Map();

export const getCachedPermissions = async (userId: string) => {
  if (cache.has(userId)) return cache.get(userId);

  const permissions = await getUserEffectivePermissions(userId);
  cache.set(userId, permissions);

  return permissions;
};

export const clearPermissionCache = (userId: string) => {
  cache.delete(userId);
};