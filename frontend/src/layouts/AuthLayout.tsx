import { Outlet } from "react-router-dom"

/**
 * 👉 Dùng cho:
/login
/forgot-password
/reset-password
👉 Mục tiêu:
Center màn hình
Background nhẹ
Card UI sạch sẽ
Responsive
 * @returns 
 */
export default function AuthLayout() {
  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2>Document Management System</h2>
          <p>Please authenticate to continue</p>
        </div>

        <Outlet />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    borderRadius: "12px",
    padding: "40px 30px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
  },
  header: {
    textAlign: "center",
    marginBottom: "30px",
  },
}