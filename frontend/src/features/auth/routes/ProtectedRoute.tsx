import { Navigate } from "react-router-dom"
import { useAuthStore } from "../auth.store"

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

/**
 * Dùng khi:
Admin only page
Manager only page
 * @param param0 
 * @returns 
 */

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}: Props) {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length && !allowedRoles.includes(user?.role || "")) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}