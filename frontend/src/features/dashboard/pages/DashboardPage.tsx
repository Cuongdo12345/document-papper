// // import { useAuthStore } from "../../../features/auth/auth.store"

// // export default function DashboardPage() {
// //   const { user } = useAuthStore()

// //   return (
// //     <div>
// //       <h1 style={styles.title}>Dashboard</h1>

// //       <div style={styles.grid}>
// //         <Card title="Logged In User">
// //           <p><strong>Username:</strong> {user?.username}</p>
// //           <p><strong>Role:</strong> {user?.role}</p>
// //         </Card>

// //         <Card title="System Overview">
// //           <p>Users: 25</p>
// //           <p>Departments: 5</p>
// //           <p>Documents: 142</p>
// //         </Card>

// //         <Card title="Quick Actions">
// //           <button style={styles.button}>Create User</button>
// //           <button style={styles.button}>Upload Document</button>
// //         </Card>
// //       </div>
// //     </div>
// //   )
// // }

// // function Card({
// //   title,
// //   children,
// // }: {
// //   title: string
// //   children: React.ReactNode
// // }) {
// //   return (
// //     <div style={styles.card}>
// //       <h3>{title}</h3>
// //       <div>{children}</div>
// //     </div>
// //   )
// // }

// // const styles: Record<string, React.CSSProperties> = {
// //   title: {
// //     marginBottom: 25,
// //   },
// //   grid: {
// //     display: "grid",
// //     gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
// //     gap: 20,
// //   },
// //   card: {
// //     background: "#fff",
// //     padding: 20,
// //     borderRadius: 10,
// //     boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
// //   },
// //   button: {
// //     marginTop: 10,
// //     padding: "8px 12px",
// //     borderRadius: 6,
// //     border: "none",
// //     background: "#4f46e5",
// //     color: "#fff",
// //     cursor: "pointer",
// //   },
// // }

// import { useEffect, useState } from "react"
// // import axios from "axios"
// import axiosClient from "../../../shared/api/axiosClient"
// import { useAuthStore } from "../../../features/auth/auth.store"

// import {
// LineChart,
// Line,
// BarChart,
// Bar,
// PieChart,
// Pie,
// CartesianGrid,
// XAxis,
// YAxis,
// Tooltip,
// Legend,
// ResponsiveContainer
// } from "recharts"

// type Summary = {
// totalDocuments:number
// totalProposals:number
// totalReports:number
// totalDepartments:number
// totalUsers:number
// proposalsByMonth:any[]
// reportsByMonth:any[]
// documentsByDepartment:any[]
// recentDocuments:any[]
// }

// export default function DashboardPage(){

// const { user } = useAuthStore()

// const [summary,setSummary] = useState<Summary | null>(null)
// const [conversion,setConversion] = useState<any[]>([])
// const [damageTrend,setDamageTrend] = useState<any[]>([])
// const [topDevices,setTopDevices] = useState<any[]>([])
// const [deviceStats,setDeviceStats] = useState<any[]>([])
// const [loading,setLoading] = useState(true)

// useEffect(()=>{

// async function loadDashboard(){

// try{

// const [
// summaryRes,
// conversionRes,
// damageRes,
// topDeviceRes,
// deviceStatsRes
// ] = await Promise.all([

// axiosClient.get("/dashboard/admin-summary"),
// axiosClient.get("/dashboard/kpi/proposal-conversion"),
// axiosClient.get("/dashboard/kpi/device-damage-trend"),
// axiosClient.get("/dashboard/kpi/top-damaged-devices"),
// axiosClient.get("/dashboard/device-stats?month=5&year=2025")

// ])

// setSummary(summaryRes.data.data)
// setConversion(conversionRes.data.data)
// setDamageTrend(damageRes.data.data)
// setTopDevices(topDeviceRes.data.data)
// setDeviceStats(deviceStatsRes.data.data)

// }catch(err){

// console.error("Dashboard load error",err)

// }

// setLoading(false)

// }

// loadDashboard()

// },[])

// if(loading){
// return <p>Loading dashboard...</p>
// }

// return(

// <div style={styles.container}>

// <h1 style={styles.title}>Hospital Equipment Dashboard</h1>

// {/* USER CARD */}

// <div style={styles.userCard}>

// <p><strong>User:</strong> {user?.username}</p>

// <p><strong>Role:</strong> {user?.role}</p>

// </div>


// {/* KPI CARDS */}

// <div style={styles.kpiGrid}>

// <KpiCard title="Total Documents" value={summary?.totalDocuments}/>
// <KpiCard title="Total Proposals" value={summary?.totalProposals}/>
// <KpiCard title="Total Reports" value={summary?.totalReports}/>
// <KpiCard title="Departments" value={summary?.totalDepartments}/>
// <KpiCard title="Users" value={summary?.totalUsers}/>

// </div>


// {/* CHART GRID */}

// <div style={styles.chartGrid}>

// {/* Proposal vs Report */}

// <Card title="Proposal vs Report by Month">

// <ResponsiveContainer width="100%" height={300}>

// <LineChart

// data={Array.from({length:12},(_,i)=>{

// const m=i+1

// return{

// month:`T${m}`,
// proposal: summary?.proposalsByMonth.find((p:any)=>p._id===m)?.count || 0,
// report: summary?.reportsByMonth.find((r:any)=>r._id===m)?.count || 0

// }

// })}

// >

// <CartesianGrid strokeDasharray="3 3"/>

// <XAxis dataKey="month"/>

// <YAxis/>

// <Tooltip/>

// <Legend/>

// <Line dataKey="proposal"/>

// <Line dataKey="report"/>

// </LineChart>

// </ResponsiveContainer>

// </Card>



// {/* Conversion Rate */}

// <Card title="Proposal → Report Conversion">

// <ResponsiveContainer width="100%" height={300}>

// <BarChart data={conversion}>

// <XAxis dataKey="departmentName"/>

// <YAxis/>

// <Tooltip/>

// <Bar dataKey="conversionRate"/>

// </BarChart>

// </ResponsiveContainer>

// </Card>



// {/* Device Damage Trend */}

// <Card title="Device Damage Trend">

// <ResponsiveContainer width="100%" height={300}>

// <LineChart data={damageTrend}>

// <XAxis dataKey="monthLabel"/>

// <YAxis/>

// <Tooltip/>

// <Line dataKey="totalReports"/>

// </LineChart>

// </ResponsiveContainer>

// </Card>



// {/* Top Damaged Devices */}

// <Card title="Top Damaged Devices">

// <ResponsiveContainer width="100%" height={300}>

// <BarChart data={topDevices}>

// <XAxis dataKey="deviceName"/>

// <YAxis/>

// <Tooltip/>

// <Bar dataKey="totalBroken"/>

// </BarChart>

// </ResponsiveContainer>

// </Card>



// {/* Device Stats */}

// <Card title="Device Proposal Stats">

// <ResponsiveContainer width="100%" height={300}>

// <PieChart>

// <Pie
// data={deviceStats}
// dataKey="totalQuantity"
// nameKey="deviceName"
// label
// />

// <Tooltip/>

// </PieChart>

// </ResponsiveContainer>

// </Card>

// </div>



// {/* RECENT DOCUMENTS */}

// <Card title="Recent Documents">

// <table style={styles.table}>

// <thead>

// <tr>

// <th>Title</th>
// <th>Department</th>
// <th>Created By</th>
// <th>Date</th>

// </tr>

// </thead>

// <tbody>

// {summary?.recentDocuments.map((doc:any)=>(

// <tr key={doc._id}>

// <td>{doc.title}</td>

// <td>{doc.department?.name}</td>

// <td>{doc.createdBy?.fullName}</td>

// <td>{new Date(doc.createdAt).toLocaleDateString()}</td>

// </tr>

// ))}

// </tbody>

// </table>

// </Card>


// </div>

// )

// }



// function KpiCard({title,value}:{title:string,value?:number}){

// return(

// <div style={styles.kpiCard}>

// <p>{title}</p>

// <h2>{value ?? 0}</h2>

// </div>

// )

// }



// function Card({title,children}:{title:string,children:React.ReactNode}){

// return(

// <div style={styles.card}>

// <h3>{title}</h3>

// {children}

// </div>

// )

// }



// const styles:Record<string,React.CSSProperties>={

// container:{
// padding:30
// },

// title:{
// marginBottom:20
// },

// userCard:{
// marginBottom:30
// },

// kpiGrid:{
// display:"grid",
// gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
// gap:20,
// marginBottom:30
// },

// kpiCard:{
// background:"#fff",
// padding:20,
// borderRadius:10,
// boxShadow:"0 4px 10px rgba(0,0,0,0.05)"
// },

// chartGrid:{
// display:"grid",
// gridTemplateColumns:"repeat(auto-fit,minmax(420px,1fr))",
// gap:20
// },

// card:{
// background:"#fff",
// padding:20,
// borderRadius:10,
// boxShadow:"0 4px 12px rgba(0,0,0,0.05)"
// },

// table:{
// width:"100%",
// borderCollapse:"collapse",
// marginTop:10
// }

// }


import { useState } from "react"
import { useAuthStore } from "../../../features/auth/auth.store"

import { useDashboard } from "../hook/useDashboard"

import KpiCard from "../components/KpiCard"
import ChartCard from "../components/ChartCard"
import Filters from "../components/Filters"

import {
LineChart,
Line,
BarChart,
Bar,
XAxis,
YAxis,
Tooltip,
ResponsiveContainer,
PieChart,
Pie
} from "recharts"

export default function DashboardPage(){

const { user } = useAuthStore()

const [month,setMonth] = useState(new Date().getMonth()+1)
const [year,setYear] = useState(2026)

const {
data,
conversion,
damageTrend,
topDevices,
deviceStats,
loading
} = useDashboard(month,year)

if(loading){
return <p>Loading dashboard...</p>
}

return(

<div style={{padding:30}}>

<h1>Hospital Equipment Dashboard</h1>

<p>
User: {user?.username} | Role: {user?.role}
</p>

<Filters
month={month}
year={year}
setMonth={setMonth}
setYear={setYear}
/>

{/* KPI */}

<div style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
gap:20,
marginBottom:40
}}>

<KpiCard title="Documents" value={data.totalDocuments}/>
<KpiCard title="Proposals" value={data.totalProposals}/>
<KpiCard title="Reports" value={data.totalReports}/>
<KpiCard title="Departments" value={data.totalDepartments}/>
<KpiCard title="Users" value={data.totalUsers}/>

</div>


{/* Charts */}

<div style={{
display:"grid",
gridTemplateColumns:"repeat(auto-fit,minmax(400px,1fr))",
gap:25
}}>

<ChartCard title="Proposal vs Report">

<ResponsiveContainer width="100%" height={300}>

<LineChart data={data.proposalsByMonth}>

<XAxis dataKey="_id"/>

<YAxis/>

<Tooltip/>

<Line dataKey="count"/>

</LineChart>

</ResponsiveContainer>

</ChartCard>


<ChartCard title="Conversion Rate">

<ResponsiveContainer width="100%" height={300}>

<BarChart data={conversion}>

<XAxis dataKey="departmentName"/>

<YAxis/>

<Tooltip/>

<Bar dataKey="conversionRate"/>

</BarChart>

</ResponsiveContainer>

</ChartCard>


<ChartCard title="Damage Trend">

<ResponsiveContainer width="100%" height={300}>

<LineChart data={damageTrend}>

<XAxis dataKey="monthLabel"/>

<YAxis/>

<Tooltip/>

<Line dataKey="totalReports"/>

</LineChart>

</ResponsiveContainer>

</ChartCard>


<ChartCard title="Top Broken Devices">

<ResponsiveContainer width="100%" height={300}>

<BarChart data={topDevices}>

<XAxis dataKey="deviceName"/>

<YAxis/>

<Tooltip/>

<Bar dataKey="totalBroken"/>

</BarChart>

</ResponsiveContainer>

</ChartCard>


<ChartCard title="Device Stats">

<ResponsiveContainer width="100%" height={300}>

<PieChart>

<Pie
data={deviceStats}
dataKey="totalQuantity"
nameKey="deviceName"
label
/>

<Tooltip/>

</PieChart>

</ResponsiveContainer>

</ChartCard>

</div>

</div>

)

}