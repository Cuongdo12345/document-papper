export default function ChartCard({
title,
children
}:{title:string,children:React.ReactNode}){

return(

<div style={{
background:"#fff",
padding:20,
borderRadius:10,
boxShadow:"0 4px 10px rgba(0,0,0,0.05)"
}}>

<h3 style={{marginBottom:20}}>{title}</h3>

{children}

</div>

)

}