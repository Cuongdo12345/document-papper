import api from "../../../shared/api/axiosClient"

export const userService = {

getUsers: (query:any) =>
api.get("/users",{
params: query
}),

getUserById:(id:string)=>
api.get(`/users/${id}`),

createUser:(data:any)=>
api.post("/users",data),

updateUser:(id:string,data:any)=>
api.put(`/users/${id}`,data),

disableUser:(id:string)=>
api.delete(`/users/${id}`),

restoreUser:(id:string)=>
api.patch(`/users/restore/${id}`),

resetPassword:(id:string,newPassword:string)=>
api.patch(`/users/reset-password/${id}`,{newPassword})

}