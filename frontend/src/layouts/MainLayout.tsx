import { Outlet, Link, useNavigate, useLocation } from "react-router-dom"
import { useState } from "react"
import { useAuthStore } from "../features/auth/auth.store"

/**
 * // Dùng cho các trang sau khi đã login, có sidebar điều hướng giữa các trang con:
 * /dashboard
 * /users
 * /departments
 * /documents
 * 👤 username ▼
    ├── Profile
    ├── Change Password
    └── Logout

Khi bấm Logout → hiện confirm dialog
Bấm Confirm → logout + redirect login
 * @returns 
 * 
 */
// Mục tiêu:
// Sidebar
// Header
export default function MainLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [showMenu, setShowMenu] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  
  // Logout flow:
  // 1. Click Logout in dropdown → show confirm dialog
  // 2. Click Cancel → close dialog
  // 3. Click Confirm → logout + navigate to login page
  const handleLogout = () => {
    logout()
    navigate("/login", { replace: true })
  }
  
  // Đóng dropdown khi click ra ngoài
  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <h2 style={{ marginBottom: 30 }}>Admin Panel</h2>

        <NavItem to="/dashboard" current={location.pathname}>
          Dashboard
        </NavItem>

        <NavItem to="/users" current={location.pathname}>
          Users
        </NavItem>
      </aside>
      
      {/* Main */}
      <div style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <div>Welcome back 👋</div>

          <div style={{ position: "relative" }}>
            <div
              style={styles.userBox}
              onClick={() => setShowMenu(!showMenu)}
            >
              👤 {user?.username} ▾
            </div>

            {showMenu && (
              <div style={styles.dropdown}>
                <div style={styles.dropdownItem}>Profile</div>
                <div style={styles.dropdownItem}>Change Password</div>
                <div
                  style={{ ...styles.dropdownItem, color: "red" }}
                  onClick={() => {
                    setShowMenu(false)
                    setShowConfirm(true)
                  }}
                >
                  Logout
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>

      {/* Confirm Logout Modal */}
      {showConfirm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>

            <div style={styles.modalActions}>
              <button
                style={styles.cancelBtn}
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>

              <button style={styles.logoutBtn} onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NavItem({
  to,
  current,
  children,
}: {
  to: string
  current: string
  children: React.ReactNode
}) {
  const active = current === to

  return (
    <Link
      to={to}
      style={{
        display: "block",
        padding: "10px 15px",
        borderRadius: 6,
        textDecoration: "none",
        color: active ? "#fff" : "#ddd",
        background: active ? "#4f46e5" : "transparent",
        marginBottom: 10,
      }}
    >
      {children}
    </Link>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    minHeight: "100vh",
    background: "#f4f6f9",
  },
  sidebar: {
    width: 220,
    background: "#1e1e2f",
    color: "#fff",
    padding: 20,
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "#fff",
    padding: "15px 25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  content: {
    padding: 25,
    flex: 1,
  },
  userBox: {
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: 6,
    background: "#f3f4f6",
  },
  dropdown: {
    position: "absolute",
    right: 0,
    top: 40,
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
    width: 180,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: "10px 15px",
    cursor: "pointer",
    borderBottom: "1px solid #eee",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    background: "#fff",
    padding: 30,
    borderRadius: 10,
    width: 350,
  },
  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid #ccc",
  },
  logoutBtn: {
    padding: "8px 12px",
    borderRadius: 6,
    background: "#ef4444",
    color: "#fff",
    border: "none",
  },
}


// import { Outlet, Link, useLocation } from "react-router-dom"
// import { useAuthStore } from "../features/auth/auth.store"


// /**
//  * Dùng cho các trang sau khi đã login, có sidebar điều hướng giữa các trang con:
// /dashboard
// /users
// /departments
// /documents
// //////////////////////////////////
// Mục tiêu:
// Sidebar
// Header
// Content area
// Logout
// Responsive cơ bản
//  * @returns 
//  */
// export default function MainLayout() {
//   const { user, logout } = useAuthStore()
//   const location = useLocation()

//   return (
//     <div style={styles.container}>
      
//       {/* Sidebar */}
//       <aside style={styles.sidebar}>
//         <h2 style={{ marginBottom: "30px" }}>Admin Panel</h2>

//         <nav style={styles.nav}>
//           <NavItem to="/dashboard" current={location.pathname}>
//             Dashboard
//           </NavItem>

//           <NavItem to="/users" current={location.pathname}>
//             Users
//           </NavItem>

//           <NavItem to="/departments" current={location.pathname}>
//             Departments
//           </NavItem>

//           <NavItem to="/documents" current={location.pathname}>
//             Documents
//           </NavItem>
//         </nav>
//       </aside>

//       {/* Main Content */}
//       <div style={styles.mainContent}>
//         <header style={styles.header}>
//           <div>
//             Welcome, <strong>{user?.username}</strong>
//           </div>

//           <button onClick={logout} style={styles.logoutBtn}>
//             Logout
//           </button>
//         </header>

//         <main style={styles.content}>
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   )
// }

// function NavItem({
//   to,
//   current,
//   children,
// }: {
//   to: string
//   current: string
//   children: React.ReactNode
// }) {
//   const active = current === to

//   return (
//     <Link
//       to={to}
//       style={{
//         padding: "12px 15px",
//         borderRadius: "6px",
//         textDecoration: "none",
//         color: active ? "#fff" : "#ddd",
//         background: active ? "#4f46e5" : "transparent",
//         transition: "0.2s",
//       }}
//     >
//       {children}
//     </Link>
//   )
// }

// const styles: Record<string, React.CSSProperties> = {
//   container: {
//     display: "flex",
//     minHeight: "100vh",
//     background: "#f5f6fa",
//   },
//   sidebar: {
//     width: "250px",
//     background: "#1e1e2f",
//     color: "#fff",
//     padding: "30px 20px",
//   },
//   nav: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "10px",
//   },
//   mainContent: {
//     flex: 1,
//     display: "flex",
//     flexDirection: "column",
//   },
//   header: {
//     background: "#ffffff",
//     padding: "15px 25px",
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
//   },
//   content: {
//     padding: "25px",
//     flex: 1,
//   },
//   logoutBtn: {
//     background: "#ef4444",
//     border: "none",
//     color: "#fff",
//     padding: "8px 15px",
//     borderRadius: "6px",
//     cursor: "pointer",
//   },
// }