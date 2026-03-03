import { Navigate } from "react-router-dom"
import { useAuthStore } from "../auth.store"

interface Props {
  children: React.ReactNode
}
/**
 * Dùng cho:
/login
/forgot-password
/reset-password
 * @param param0 
 * @returns 
 */
//Chặn người đã login truy cập vào trang login khi đã login
export default function PublicRoute({ children }: Props) {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}