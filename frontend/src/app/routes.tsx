import { Routes, Route } from "react-router-dom"

import PrivateRoute from "../features/auth/routes/PrivateRoute"
import PublicRoute from "../features/auth/routes/PublicRoute"
// import ProtectedRoute from "../features/auth/routes/ProtectedRoute"

import MainLayout from "../layouts/MainLayout"
import AuthLayout from "../layouts/AuthLayout"

import LoginPage from "../features/auth/pages/LoginPage"
import ForgotPasswordPage from "../features/auth/pages/ForgotPasswordPage"
import ResetPasswordPage from "../features/auth/pages/ResetPasswordPage"

import DashboardPage from "../features/dashboard/pages/DashboardPage"
import UsersPage from "../features/users/pages/UserPage"
import UserDetailPage from "../features/users/pages/UserDetailPage"

export default function AppRoutes() {
  return (
    <Routes>

      {/* ================= AUTH LAYOUT ================= */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />

        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPasswordPage />
            </PublicRoute>
          }
        />

        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPasswordPage />
            </PublicRoute>
          }
        />
      </Route>

      {/* ================= MAIN LAYOUT ================= */}
      <Route
        element={
           <PrivateRoute>
            <MainLayout />
           </PrivateRoute>
        }
      >
        {<Route path="/dashboard" element={<DashboardPage />} /> }
        {<Route path="/users" element={<UsersPage/>}/>}
        {<Route path="/users/:id" element={<UserDetailPage/>}/>}
      </Route>

        

    </Routes>
  )
}