export default function KpiCard({title,value}:{title:string,value:number}){

return(

<div style={{
background:"#fff",
padding:20,
borderRadius:10,
boxShadow:"0 3px 8px rgba(0,0,0,0.05)"
}}>

<p>{title}</p>

<h2>{value}</h2>

</div>

)

}