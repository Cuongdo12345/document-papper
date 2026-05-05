import { User } from "../../models/users/user.model"

export const getUserEffectivePermissions = async (userId: string) => {
  const user = await User.findById(userId)
    .populate({
      path: "role",
      populate: { path: "permissions" },
    })
    .populate("extraPermissions")
    .populate("denyPermissions");

  if (!user) throw new Error("User not found");
  
  const role = user.role as any;
  const rolePermissions =
  role.permissions?.map((p: any) => p.name) || [];

  const extraPermissions =
    user.extraPermissions?.map((p: any) => p.name) || [];

  const denyPermissions =
    user.denyPermissions?.map((p: any) => p.name) || [];

  const finalPermissions = [
    ...new Set([...rolePermissions, ...extraPermissions]),
  ].filter((p) => !denyPermissions.includes(p));

  return finalPermissions;
};