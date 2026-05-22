import {Permission} from "../../models/rbac/permission.model";
import {Role} from "../../models/rbac/role.model";
import {Policy} from "../../models/rbac/policy.model";
import ApiError from "../../shared/errors/ApiError";


// ================= PERMISSION =================

export const createPermissionService = async (payload: any) => {
  const exist = await Permission.findOne({ name: payload.name });
  if (exist) {
    throw ApiError.conflict("Permission already exists");
  }

  return Permission.create(payload);
};

export const getPermissionService = async (query: any) => {
  return Permission.find(query);
};

export const updatePermissionService = async (id: any, payload: any) => {
  const permission = await Permission.findById(id);
  if (!permission) {
    throw ApiError.notFound("Permission not found");
  }

  Object.assign(permission, payload);
  return permission.save();
};

export const deletePermissionService = async (id: any) => {
  const permission = await Permission.findById(id);
  if (!permission) {
    throw ApiError.notFound("Permission not found");
  }

  await permission.deleteOne();
  return true;
};

// ================= ROLE =================

export const createRoleService = async (payload: any) => {
  const exist = await Role.findOne({ name: payload.name });
  if (exist) {
    throw ApiError.conflict("Role already exists");
  }

  return Role.create(payload);
};

export const getRoleService = async () => {
  return Role.find().populate("permissions");
};

export const updateRoleService = async (id: any, payload: any) => {
  const role = await Role.findById(id);
  if (!role) {
    throw ApiError.notFound("Role not found");
  }

  Object.assign(role, payload);
  return role.save();
};

export const deleteRoleService = async (id: any) => {
  const role = await Role.findById(id);
  if (!role) {
    throw ApiError.notFound("Role not found");
  }

  await role.deleteOne();
  return true;
};

export const assignPermissionsToRoleService = async (
  roleId: any,
  permissionIds: string[]
) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw ApiError.notFound("Role not found");
  }

  role.permissions = permissionIds as any;
  return role.save();
};


/**
 * | RBAC thường           | Policy RBAC                |
| --------------------- | -------------------------- |
| chỉ role → permission | role → policy → permission |
| khó mở rộng           | scale lớn                  |
| hard-code             | dynamic                    |
| khó audit             | audit cực mạnh             |

 * @param payload 
 * @returns 
 */
// ================= POLICY =================

export const createPolicyService = async (payload: any) => {
  return Policy.create(payload);
};

export const getPolicieService = async () => {
  return Policy.find();
};

export const updatePolicyService = async (id: any, payload: any) => {
  const policy = await Policy.findById(id);
  if (!policy) {
    throw ApiError.notFound("Policy not found");
  }

  Object.assign(policy, payload);
  return policy.save();
};

export const deletePolicyService = async (id: any) => {
  const policy = await Policy.findById(id);
  if (!policy) {
    throw ApiError.notFound("Policy not found");
  }

  await policy.deleteOne();
  return true;
};