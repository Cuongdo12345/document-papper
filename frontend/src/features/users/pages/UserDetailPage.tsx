import { useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"

import { userService } from "../services/user.service"

export default function UserDetailPage(){

const { id } = useParams()
const navigate = useNavigate()

const [user,setUser] = useState<any>(null)
const [loading,setLoading] = useState(true)
const [password,setPassword] = useState("")

/*
LOAD USER
*/

async function loadUser(){

setLoading(true)

const res = await userService.getUserById(id!)

setUser(res.data)

setLoading(false)

}

useEffect(()=>{

loadUser()

},[id])


/*
DISABLE USER
*/

async function disableUser(){

if(!confirm("Disable user?")) return

await userService.disableUser(id!)

await loadUser()

}


/*
RESTORE USER
*/

async function restoreUser(){

await userService.restoreUser(id!)

await loadUser()

}


/*
RESET PASSWORD
*/

async function resetPassword(){

if(!password){

alert("Enter new password")

return

}

await userService.resetPassword(id!,password)

alert("Password reset successful")

setPassword("")

}


if(loading){

return <div className="p-6">Loading...</div>

}


return(

<div className="p-8 space-y-6">

{/* HEADER */}

<div className="flex justify-between items-center">

<h1 className="text-2xl font-bold">

User Detail

</h1>

<button
onClick={()=>navigate("/users")}
className="border px-3 py-2"
>
Back
</button>

</div>


{/* USER PROFILE */}

<div className="border rounded p-6 grid grid-cols-2 gap-6">

<div>

<p className="text-gray-500">Username</p>

<p className="font-semibold">

{user.username}

</p>

</div>

<div>

<p className="text-gray-500">Full Name</p>

<p className="font-semibold">

{user.fullName}

</p>

</div>

<div>

<p className="text-gray-500">Role</p>

<p>

{user.role}

</p>

</div>

<div>

<p className="text-gray-500">Department</p>

<p>

{user.department?.name || "-"}

</p>

</div>

<div>

<p className="text-gray-500">Status</p>

<p>

{user.isActive
? "Active"
: "Disabled"}

</p>

</div>

<div>

<p className="text-gray-500">Created At</p>

<p>

{new Date(user.createdAt).toLocaleDateString()}

</p>

</div>

</div>


{/* USER ACTIONS */}

<div className="border rounded p-6">

<h3 className="font-semibold mb-4">

User Actions

</h3>

<div className="flex gap-4">

{user.isActive ? (

<button
onClick={disableUser}
className="bg-red-500 text-white px-4 py-2"
>
Disable User
</button>

):(

<button
onClick={restoreUser}
className="bg-green-600 text-white px-4 py-2"
>
Restore User
</button>

)}

</div>

</div>


{/* RESET PASSWORD */}

<div className="border rounded p-6">

<h3 className="font-semibold mb-4">

Reset Password (Admin)

</h3>

<div className="flex gap-3">

<input
type="password"
placeholder="New password"
className="border p-2"
value={password}
onChange={(e)=>setPassword(e.target.value)}
/>

<button
onClick={resetPassword}
className="bg-blue-500 text-white px-4 py-2"
>
Reset Password
</button>

</div>

</div>

</div>

)

}