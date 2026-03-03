import { useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { authService } from "../auth.service"
import type { ApiErrorResponse } from "../../../shared/api.types"
import type { AxiosError } from "axios"
import axios from "axios"

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get("token") || ""

  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    try {
      await authService.resetPassword({
        token,
        newPassword: password,
      })

      setMessage("Password reset successfully! Redirecting...")
      setTimeout(() => navigate("/login"), 2000)
    } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>
    setError(axiosError.response?.data?.message || "Invalid or expired token")
  } else {
    setError("Unexpected error occurred")
  }
}}

  return (
    <div>
      <h3 style={{ marginBottom: 20 }}>Reset Password</h3>

      {!token && (
        <div style={styles.error}>
          Invalid reset token. Please request again.
        </div>
      )}

      {token && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          {error && <div style={styles.error}>{error}</div>}
          {message && <div style={styles.success}>{message}</div>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: "flex", flexDirection: "column", gap: 15 },
  input: { padding: 10, borderRadius: 6, border: "1px solid #ccc" },
  button: {
    padding: 10,
    borderRadius: 6,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
  },
  error: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: 10,
    borderRadius: 6,
  },
  success: {
    background: "#d1fae5",
    color: "#065f46",
    padding: 10,
    borderRadius: 6,
  },
}