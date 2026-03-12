import { useEffect,useState } from "react"
import { dashboardService } from "../../dashboard/dashboard.service"

export function useDashboard(month:number,year:number){

const [data,setData] = useState<any>(null)
const [conversion,setConversion] = useState([])
const [damageTrend,setDamageTrend] = useState([])
const [topDevices,setTopDevices] = useState([])
const [deviceStats,setDeviceStats] = useState([])
const [loading,setLoading] = useState(true)

useEffect(()=>{

async function load(){

try{

const [
summary,
conv,
damage,
top,
stats
] = await Promise.all([

dashboardService.getSummary(),
dashboardService.getConversion(),
dashboardService.getDamageTrend(),
dashboardService.getTopDevices(),
dashboardService.getDeviceStats(month,year)

])

setData(summary.data.data)
setConversion(conv.data.data)
setDamageTrend(damage.data.data)
setTopDevices(top.data.data)
setDeviceStats(stats.data.data)

}catch(err){

console.error(err)

}

setLoading(false)

}

load()

},[month,year])

return{
data,
conversion,
damageTrend,
topDevices,
deviceStats,
loading
}

}