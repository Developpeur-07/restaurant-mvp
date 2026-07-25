import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/useTheme";

const STATUS = {
  received: { label: "Nouvelle commande", next: "preparing", action: "Commencer" },
  preparing: { label: "En préparation", next: "ready", action: "Marquer prête" },
};

export default function Kitchen() {
  const [orders,setOrders]=useState([]);
  const { theme } = useTheme();

  useEffect(()=>{
    let channel;
    async function load(){
      const { data:{user} } = await supabase.auth.getUser();
      if(!user) return;
      const { data:resto } = await supabase.from("restaurants")
        .select("id").eq("owner_id",user.id).single();
      if(!resto) return;

      const { data } = await supabase.from("orders")
        .select("*")
        .eq("restaurant_id",resto.id)
        .in("status",["received","preparing"])
        .order("created_at",{ascending:true});

      setOrders(data||[]);

      channel=supabase.channel("kitchen-"+resto.id)
      .on("postgres_changes",{
        event:"*",schema:"public",table:"orders",
        filter:`restaurant_id=eq.${resto.id}`
      },()=>{
        load();
      }).subscribe();
    }
    load();
    return ()=> channel && supabase.removeChannel(channel);
  },[]);

  async function updateStatus(order){
    const next=STATUS[order.status]?.next;
    if(!next) return;
    await supabase.from("orders").update({status:next}).eq("id",order.id);
  }

  return (
    <div style={{background:theme.pageBackground,minHeight:"100vh",padding:24}}>
      <h1>👨‍🍳 Cuisine</h1>

      {orders.length===0 && <p>Aucune commande en attente.</p>}

      {orders.map(order=>(
        <div key={order.id} style={{
          background:theme.cardBackground,
          borderRadius:16,
          padding:16,
          marginBottom:16,
          boxShadow:"0 2px 5px rgba(0,0,0,0.06)",
        }}>
          <h3>
            {order.order_type==="emporter"
              ? `🥡 ${order.customer_name}`
              : `🪑 Table ${order.table_number}`}
          </h3>

          {order.items.map((item,i)=>(
            <p key={i}>
              <strong>{item.qty}×</strong> {item.name}
            </p>
          ))}

          <button
            onClick={()=>updateStatus(order)}
            style={{
              marginTop:12,
              width:"100%",
              padding:12,
              border:"none",
              borderRadius:10,
              background:theme.primary,
              color:"#fff",
              cursor:"pointer"
            }}>
            {STATUS[order.status]?.action}
          </button>
        </div>
      ))}
    </div>
  );
}
