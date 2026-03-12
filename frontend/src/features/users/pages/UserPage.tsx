import {useState} from "react"
import {useUsers} from "../hook/useUsers"

import UserTable from "../components/UserTable"
import UserFilters from "../components/UserFilters"
import UserFormModal from "../components/UserFormModel"

export default function UsersPage(){

const [query,setQuery] = useState({
page:1,
limit:10
})

const {users,pagination,loading,reload} = useUsers(query)

const [open,setOpen] = useState(false)

if(loading){
return <div>Loading users...</div>
}

return(

<div style={{padding:30}}>

<h1>User Management</h1>

<UserFilters
query={query}
setQuery={setQuery}
/>

<button
onClick={()=>setOpen(true)}
style={{marginBottom:20}}
>
Create User
</button>

<UserTable
users={users}
reload={reload}
/>

<UserFormModal
open={open}
onClose={()=>setOpen(false)}
onSuccess={reload}
/>

</div>

)

}