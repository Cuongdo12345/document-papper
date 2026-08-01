import { Request, Response } from "express";
import {
  createPermissionService,
  getPermissionService,
  getPermissionByIdService,
  updatePermissionService,
  deletePermissionService,
  createRoleService,
  getRoleService,
  getRoleByIdService,
  updateRoleService,
  deleteRoleService,
  assignPermissionsToRoleService,
  createPolicyService,
  getPolicieService,
  getPolicyByIdService,
  updatePolicyService,
  deletePolicyService,
} from "../../services/rbac/rbac.service";
import { catchAsync } from "../../shared/utils/catchAsync";

// ================= PERMISSION =================

export const createPermission = catchAsync(
  async (req: Request, res: Response) => {
    const result = await createPermissionService(req.body);

    res.status(201).json({
      message: "Create permission success",
      data: result,
    });
  },
);

export const getPermissions = catchAsync(
  async (req: Request, res: Response) => {
    const result = await getPermissionService(req.query);
 
    res.json({
      message: "Get permissions success",
      data: result.items,
      pagination: result.pagination,
    });
  },
);

// ⚠️ MỚI: GET BY ID
export const getPermissionById = catchAsync(
  async (req: Request, res: Response) => {
    const result = await getPermissionByIdService(req.params.id);

    res.json({
      message: "Get permission detail success",
      data: result,
    });
  },
);

export const updatePermission = catchAsync(
  async (req: Request, res: Response) => {
    const result = await updatePermissionService(req.params.id, req.body);

    res.json({
      message: "Update permission success",
      data: result,
    });
  },
);

export const deletePermission = catchAsync(
  async (req: Request, res: Response) => {
    await deletePermissionService(req.params.id);

    res.json({
      message: "Delete permission success",
    });
  },
);

// ================= ROLE =================

export const createRole = catchAsync(async (req: Request, res: Response) => {
  const result = await createRoleService(req.body);

  res.status(201).json({
    message: "Create role success",
    data: result,
  });
});

export const getRoles = catchAsync(async (req: Request, res: Response) => {
  const result = await getRoleService(req.query);
 
  res.json({
    message: "Get roles success",
    data: result.items,
    pagination: result.pagination,
  });
});

// ⚠️ MỚI: GET BY ID
export const getRoleById = catchAsync(async (req: Request, res: Response) => {
  const result = await getRoleByIdService(req.params.id);

  res.json({
    message: "Get role detail success",
    data: result,
  });
});

export const updateRole = catchAsync(async (req: Request, res: Response) => {
  const result = await updateRoleService(req.params.id, req.body);

  res.json({
    message: "Update role success",
    data: result,
  });
});

export const deleteRole = catchAsync(async (req: Request, res: Response) => {
  await deleteRoleService(req.params.id);

  res.json({
    message: "Delete role success",
  });
});

export const assignPermissionsToRole = catchAsync(
  async (req: Request, res: Response) => {
    const { permissionIds } = req.body;

    const result = await assignPermissionsToRoleService(
      req.params.id,
      permissionIds,
    );

    res.json({
      message: "Assign permissions success",
      data: result,
    });
  },
);

// ================= POLICY =================

export const createPolicy = catchAsync(async (req: Request, res: Response) => {
  const result = await createPolicyService(req.body);

  res.status(201).json({
    message: "Create policy success",
    data: result,
  });
});

export const getPolicies = catchAsync(async (req: Request, res: Response) => {
  const result = await getPolicieService(req.query);
 
  res.json({
    message: "Get policies success",
    data: result.items,
    pagination: result.pagination,
  });
});

// ⚠️ MỚI: GET BY ID
export const getPolicyById = catchAsync(async (req: Request, res: Response) => {
  const result = await getPolicyByIdService(req.params.id);

  res.json({
    message: "Get policy detail success",
    data: result,
  });
});

export const updatePolicy = catchAsync(async (req: Request, res: Response) => {
  const result = await updatePolicyService(req.params.id, req.body);

  res.json({
    message: "Update policy success",
    data: result,
  });
});

export const deletePolicy = catchAsync(async (req: Request, res: Response) => {
  await deletePolicyService(req.params.id);

  res.json({
    message: "Delete policy success",
  });
});