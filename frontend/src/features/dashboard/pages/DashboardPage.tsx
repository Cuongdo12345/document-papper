import { useAuthStore } from "../../../features/auth/auth.store"

export default function DashboardPage() {
  const { user } = useAuthStore()

  return (
    <div>
      <h1 style={styles.title}>Dashboard</h1>

      <div style={styles.grid}>
        <Card title="Logged In User">
          <p><strong>Username:</strong> {user?.username}</p>
          <p><strong>Role:</strong> {user?.role}</p>
        </Card>

        <Card title="System Overview">
          <p>Users: 25</p>
          <p>Departments: 5</p>
          <p>Documents: 142</p>
        </Card>

        <Card title="Quick Actions">
          <button style={styles.button}>Create User</button>
          <button style={styles.button}>Upload Document</button>
        </Card>
      </div>
    </div>
  )
}

function Card({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={styles.card}>
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    marginBottom: 25,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 20,
  },
  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  button: {
    marginTop: 10,
    padding: "8px 12px",
    borderRadius: 6,
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    cursor: "pointer",
  },
}