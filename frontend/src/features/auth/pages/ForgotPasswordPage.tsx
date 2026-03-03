import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { authService } from "../auth.service"
import type { ApiErrorResponse } from "../../../shared/api.types"
import type { AxiosError } from "axios"
import axios from "axios"

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState("")
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await authService.forgotPassword({ username })
      setToken(res.data.resetToken)
    } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>
    setError(axiosError.response?.data?.message || "User not found")
  } else {
    setError("Unexpected error occurred")
  }
}}

  const goToReset = () => {
    navigate(`/reset-password?token=${token}`)
  }

  return (
    <div>
      <h3 style={{ marginBottom: 20 }}>Forgot Password</h3>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Enter username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={styles.input}
        />

        {error && <div style={styles.error}>{error}</div>}

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Generating..." : "Generate Reset Token"}
        </button>
      </form>

      {token && (
        <div style={styles.tokenBox}>
          <p><strong>Reset Token:</strong></p>
          <textarea readOnly value={token} style={styles.textarea} />
          <button onClick={goToReset} style={styles.secondaryButton}>
            Go to Reset Password
          </button>
        </div>
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
  secondaryButton: {
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
    border: "none",
    background: "#10b981",
    color: "#fff",
  },
  error: {
    background: "#fee2e2",
    color: "#b91c1c",
    padding: 10,
    borderRadius: 6,
  },
  tokenBox: {
    marginTop: 25,
    padding: 15,
    background: "#f3f4f6",
    borderRadius: 8,
  },
  textarea: {
    width: "100%",
    marginTop: 10,
    padding: 10,
    borderRadius: 6,
  },
}