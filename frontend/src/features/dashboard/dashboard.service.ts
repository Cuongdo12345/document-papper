import axios from "../../shared/api/axiosClient"


export const dashboardService = {

getSummary: () =>
axios.get("/dashboard/admin-summary"),

getConversion: () =>
axios.get("/dashboard/kpi/proposal-conversion"),

getDamageTrend: () =>
axios.get("/dashboard/kpi/device-damage-trend"),

getTopDevices: () =>
axios.get("/dashboard/kpi/top-damaged-devices"),

getDeviceStats: (month:number,year:number) =>
axios.get(`/dashboard/device-stats?month=${month}&year=${year}`)

}