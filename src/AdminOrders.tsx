import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (data) setOrders(data);
    };
    fetchOrders();

    const channel = supabase.channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, 
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h1 className="text-xl font-bold mb-4">Live Orders</h1>
      {orders.map(order => (
        <div key={order.id} className="border p-4 mb-2 rounded">
          <p>Order ID: {order.id}</p>
          <p>Status: <strong>{order.order_status}</strong></p>
        </div>
      ))}
    </div>
  );
};

export default AdminOrders;
