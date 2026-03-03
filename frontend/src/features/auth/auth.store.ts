import { create } from "zustand"

interface User {
  id: string
  username: string
  role: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean

  setAuth: (access: string, refresh: string, user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem("accessToken"),
  refreshToken: localStorage.getItem("refreshToken"),
  user: JSON.parse(localStorage.getItem("user") || "null"),
  isAuthenticated: !!localStorage.getItem("accessToken"),

  setAuth: (access, refresh, user) => {
    localStorage.setItem("accessToken", access)
    localStorage.setItem("refreshToken", refresh)
    localStorage.setItem("user", JSON.stringify(user))

    set({
      accessToken: access,
      refreshToken: refresh,
      user,
      isAuthenticated: true,
    })
  },

  logout: () => {
    localStorage.clear()

    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
    })
  },
}))