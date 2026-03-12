import { useEffect, useState } from "react";
import { userService } from "../services/user.service";

export function useUsers(query:any){

const [users,setUsers] = useState<any[]>([])
const [pagination,setPagination] = useState<any>({})
const [loading,setLoading] = useState(true)

async function loadUsers(){

try{

setLoading(true)

const res = await userService.getUsers(query)

console.log("users API",res.data)

setUsers(res.data.data)
setPagination(res.data.pagination || {})

}catch(err){

console.error(err)

}

setLoading(false)

}

useEffect(()=>{
loadUsers()
},[query])

return{
users,
pagination,
loading,
reload:loadUsers
}

}