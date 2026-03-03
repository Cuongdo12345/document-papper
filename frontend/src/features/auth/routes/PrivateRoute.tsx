import { Navigate, useLocation } from "react-router-dom"
import { useAuthStore } from "../auth.store"

//Chỉ kiểm tra đã login hay chưa, không kiểm tra token hợp lệ hay hết hạn
interface Props {
  children: React.ReactNode
}

export default function PrivateRoute({ children }: Props) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}