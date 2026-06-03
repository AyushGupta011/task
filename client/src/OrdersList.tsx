import React, { useState } from 'react';
import type { Garment, Order } from './App';

type StatusFilter = 'all' | 'received' | 'in_cleaning' | 'ready' | 'delivered';

interface Props {
  orders: Order[];
  selectedStatus: StatusFilter;
  onStatusUpdated?: (orderId: string, garmentId: string, newStatus: Garment['status']) => void;
}

const statusLabel: Record<string, string> = {
  received: 'Received',
  in_cleaning: 'In Cleaning',
  ready: 'Ready for Pickup',
  delivered: 'Delivered',
};


const ALL_STATUSES: Garment['status'][] = [
  'received',
  'in_cleaning',
  'ready',
  'delivered',
];

function computeOrderSummary(order: Order): Record<string, number> {
  const counts: Record<string, number> = {
    received: 0,
    in_cleaning: 0,
    ready: 0,
    delivered: 0,
  };
  for (const g of order.garments) {
    counts[g.status] = (counts[g.status] ?? 0) + 1;
  }
  return counts;
}
interface GarmentRowProps {
  orderId: string;
  garment: Garment;
  onStatusUpdated?: Props['onStatusUpdated'];
}
const GarmentRow: React.FC<GarmentRowProps> = ({ orderId, garment, onStatusUpdated }) => {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: Garment['status']) => {
    if (newStatus === garment.status) return;
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:3001/api/orders/${orderId}/garments/${garment.id}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      onStatusUpdated?.(orderId, garment.id, newStatus);
    } catch (e: any) {
      setError(e.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem 0',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ flex: 1, minWidth: 120 }}>{garment.description}</span>
      <select
        value={garment.status}
        disabled={updating}
        onChange={(e) => handleStatusChange(e.target.value as Garment['status'])}
        style={{
       
          borderRadius: 4,
          padding: '2px 6px',
         
          fontWeight: 600,
          fontSize: '0.8rem',
          cursor: 'pointer',
          background: '#fff',
        }}
        aria-label={`Status for ${garment.description}`}
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel[s]}
          </option>
        ))}
      </select>
      {updating && <span style={{ fontSize: '0.75rem', color: '#888' }}>saving…</span>}
      {error && <span style={{ fontSize: '0.75rem', color: 'red' }}>{error}</span>}
    </li>
  );
};



export const OrdersList: React.FC<Props> = ({ orders,selectedStatus, onStatusUpdated }) => {
  if (orders.length === 0) {
    return <p>No active orders.</p>;
  }

  return (
     <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {orders.map((order) => {
          const visibleGarments = selectedStatus === 'all'
          ? order.garments
          : order.garments.filter((g) => g.status === selectedStatus);

        const summary = computeOrderSummary(order);
        const isFullyDelivered = order.garments.length > 0 &&
          order.garments.every((g) => g.status === 'delivered');

        return (
          <div
            key={order.id}
            style={{
              border: `1px solid ${isFullyDelivered ? '#16a34a' : '#ccc'}`,
              borderRadius: 6,
              padding: '0.75rem',
              background: isFullyDelivered ? '#f0fdf4' : '#fff',
            }}
          >
         
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
              <strong>{order.id}</strong>
              <span style={{ color: '#374151' }}>{order.customerName}</span>
            </div>

            <small style={{ color: '#6b7280' }}>
              Created: {new Date(order.createdAt).toLocaleString()}
            </small>


            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', margin: '0.5rem 0' }}>
              {ALL_STATUSES.map((s) =>
                summary[s] > 0 ? (
                  <span
                    key={s}
                    title={statusLabel[s]}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 12,
                      
                    }}
                  >
                    {summary[s]} {statusLabel[s]}
                  </span>
                ) : null,
              )}
              {isFullyDelivered && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16a34a' }}>
                  ✓ All Delivered
                </span>
              )}
            </div>

            <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1rem' }}>
              {visibleGarments.map((g) => (
                <GarmentRow
                  key={g.id}
                  orderId={order.id}
                  garment={g}
                  onStatusUpdated={onStatusUpdated}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};
