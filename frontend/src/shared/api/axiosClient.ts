import axios from "axios"
import { useAuthStore } from "../../features/auth/auth.store"
const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axiosClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem("refreshToken")

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/auths/refresh-token`,
          { refreshToken }
        )

        const newAccessToken = response.data.accessToken
        localStorage.setItem("accessToken", newAccessToken)

        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`

        return axiosClient(originalRequest)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = "/login"
      }
    }

    return Promise.reject(error)
  }
)

export default axiosClient