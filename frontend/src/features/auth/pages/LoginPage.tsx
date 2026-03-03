import { useState } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { authService } from "../auth.service"
import { useAuthStore } from "../auth.store"
import axios, {AxiosError} from "axios"
import type { ApiErrorResponse } from "../../../shared/api.types"

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/dashboard"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await authService.login({ username, password })

      const { accessToken, refreshToken, user } = res.data

      setAuth(accessToken, refreshToken, user)

      navigate(from, { replace: true })
    } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>
    setError(axiosError.response?.data?.message || "Something went wrong")
  } else {
    setError("Unexpected error occurred")
  }
}}

  return (
    <div>
      <h3 style={{ marginBottom: 20 }}>Login</h3>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles.input}
        />

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <div style={{ marginTop: 15 }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 15 },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
  },
  button: {
    padding: 10,
    borderRadius: 6,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    cursor: "pointer",
  },
  error: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: 10,
    borderRadius: 6,
  },
}