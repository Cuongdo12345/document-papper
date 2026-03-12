export default function Filters({
month,
year,
setMonth,
setYear
}:any){

return(

<div style={{display:"flex",gap:20,marginBottom:30}}>

<select
value={month}
onChange={(e)=>setMonth(Number(e.target.value))}
>

{Array.from({length:12},(_,i)=>(
<option key={i} value={i+1}>
Month {i+1}
</option>
))}

</select>

<select
value={year}
onChange={(e)=>setYear(Number(e.target.value))}
>

{[2023,2024,2025,2026].map(y=>(
<option key={y}>{y}</option>
))}

</select>

</div>

)

}