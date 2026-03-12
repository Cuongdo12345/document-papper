export default function UserFilters({query,setQuery}:any){

return(

<div style={{display:"flex",gap:10,marginBottom:20}}>

<input
placeholder="Search username"
onChange={(e)=>
setQuery({...query,keyword:e.target.value})
}
/>

<select
onChange={(e)=>
setQuery({...query,role:e.target.value})
}
>

<option value="">All Roles</option>
<option value="ADMIN">ADMIN</option>
<option value="USER">USER</option>

</select>

<select
onChange={(e)=>
setQuery({...query,isActive:e.target.value})
}
>

<option value="">All Status</option>
<option value="true">Active</option>
<option value="false">Disabled</option>

</select>

</div>

)

}