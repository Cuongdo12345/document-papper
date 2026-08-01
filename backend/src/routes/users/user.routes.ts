/**
 * user routes.ts refactored
 */

import { Router } from "express";
import {
  createUser,
  getUsers,
  deleteUser,
  getUserById,
  updateUser,
  restoreUser,
  changePasswordUser,
  resetPasswordByAdmin,
  getMe,
  updateMe,
} from "../../controllers/users/user.controller";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorizePermission } from "../../middlewares/authorizePermission.middleware";
import {
  validateBody,
  validateQuery,
} from "../../middlewares/validate.middleware";
import {
  CreateUserDTO,
  UpdateUserDTO,
  ChangePasswordDTO,
  GetUsersQueryDTO,
} from "../../dto/users/users.dto";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizePermission("USER_CREATE"),
  validateBody(CreateUserDTO),
  createUser,
);

router.get(
  "/",
  authenticate,
  authorizePermission("USER_READ"),
  // validateQuery(GetUsersQueryDTO),
  getUsers,
);

router.get("/me", authenticate, getMe);

router.get(
  "/:id",
  authenticate,
  authorizePermission("USER_DETAIL"),
  getUserById,
);

router.patch("/me", authenticate, validateBody(UpdateUserDTO), updateMe);

router.put(
  "/:id",
  authenticate,
  authorizePermission("USER_UPDATE"),
  validateBody(UpdateUserDTO),
  updateUser,
);

router.delete(
  "/:id",
  authenticate,
  authorizePermission("USER_DELETE"),
  deleteUser,
);

router.patch(
  "/restore/:id",
  authenticate,
  authorizePermission("USER_RESTORE"),
  restoreUser,
);

router.patch(
  "/change-password",
  authenticate,
  authorizePermission("USER_CHANGE_PASSWORD"),
  validateBody(ChangePasswordDTO),
  changePasswordUser,
);

router.patch(
  "/reset-password/:id",
  authenticate,
  authorizePermission("USER_RESET_PASSWORD"),
  resetPasswordByAdmin,
);

export default router;

