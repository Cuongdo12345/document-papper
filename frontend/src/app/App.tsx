import { Suspense } from "react"
import AppRoutes from "./routes"

export default function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppRoutes />
    </Suspense>
  )
}