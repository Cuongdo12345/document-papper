import {useState} from "react"
import {userService} from "../services/user.service"

export default function UserFormModal({open,onClose,onSuccess}:any){

const [form,setForm] = useState({
username:"",
password:"",
fullName:"",
role:"USER",
department:""
})

if(!open) return null

async function submit(){

await userService.createUser(form)

onSuccess()
onClose()

}

return(

<div style={{
position:"fixed",
top:0,
left:0,
right:0,
bottom:0,
background:"rgba(0,0,0,0.3)"
}}>

<div style={{
background:"#fff",
padding:20,
width:400,
margin:"100px auto"
}}>

<h3>Create User</h3>

<input
placeholder="Username"
onChange={(e)=>setForm({...form,username:e.target.value})}
/>

<input
placeholder="Full Name"
onChange={(e)=>setForm({...form,fullName:e.target.value})}
/>

<input
type="password"
placeholder="Password"
onChange={(e)=>setForm({...form,password:e.target.value})}
/>

<select
onChange={(e)=>setForm({...form,role:e.target.value})}
>

<option value="USER">USER</option>
<option value="ADMIN">ADMIN</option>

</select>

<input
placeholder="Department ID"
onChange={(e)=>setForm({...form,department:e.target.value})}
/>

<button onClick={submit}>Save</button>

<button onClick={onClose}>Cancel</button>

</div>

</div>

)

}