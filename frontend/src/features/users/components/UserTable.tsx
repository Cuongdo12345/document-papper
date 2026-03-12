import { userService } from "../services/user.service";

export default function UserTable({ users, reload }: any) {
  async function disableUser(id: string) {
    if (!confirm("Disable user?")) return;

    await userService.disableUser(id);

    reload();
  }

  async function restoreUser(id: string) {
    await userService.restoreUser(id);

    reload();
  }

  return (
    <table border={1} width="100%">
      <thead>
        <tr>
          <th>Username</th>
          <th>Full Name</th>
          <th>Role</th>
          <th>Department</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
<tbody>
{users?.map((u:any)=>(
<tr key={u._id}>

<td>{u.username}</td>

<td>{u.fullName}</td>

<td>{u.role}</td>

<td>{u.department?.name}</td>

<td>{u.isActive ? "Active" : "Disabled"}</td>

<td>

{u.isActive ? (

<button onClick={()=>disableUser(u._id)}>
Disable
</button>

):(

<button onClick={()=>restoreUser(u._id)}>
Restore
</button>

)}

</td>

</tr>
))}
</tbody>
      {/* <tbody>
        {users.map((u: any) => (
          <tr key={u._id}>
            <td>{u.username}</td>

            <td>{u.fullName}</td>

            <td>{u.role}</td>

            <td>{u.department?.name}</td>

            <td>{u.isActive ? "Active" : "Disabled"}</td>

            <td>
              {u.isActive ? (
                <button onClick={() => disableUser(u._id)}>Disable</button>
              ) : (
                <button onClick={() => restoreUser(u._id)}>Restore</button>
              )}
            </td>
          </tr>
        ))}
      </tbody> */}
    </table>
  );
}
