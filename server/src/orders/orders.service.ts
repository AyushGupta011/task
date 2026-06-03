import { Injectable } from '@nestjs/common';

export type GarmentStatus = 'received' | 'in_cleaning' | 'ready' | 'delivered';

export interface Garment {
  id: string;
  description: string;
  status: GarmentStatus;
}

export interface Order {
  id: string;
  customerName: string;
  createdAt: string; // ISO string
  garments: Garment[];
}


export interface OrderSummary {
  orderId: string;
  customerName: string;
  totalGarments: number;
  counts: Record<GarmentStatus, number>;
  isFullyDelivered: boolean;
}




export const VALID_STATUSES: GarmentStatus[] = [
  'received',
  'in_cleaning',
  'ready',
  'delivered',
];

// In-memory mock data to simulate a POS-like workflow
const ORDERS: Order[] = [
  {
    id: 'ORD-1001',
    customerName: 'Alice Johnson',
    createdAt: new Date().toISOString(),
    garments: [
      { id: 'G-1', description: 'Blue Shirt', status: 'received' },
      { id: 'G-2', description: 'Black Trousers', status: 'in_cleaning' },
    ],
  },
  {
    id: 'ORD-1002',
    customerName: 'Bob Singh',
    createdAt: new Date().toISOString(),
    garments: [
      { id: 'G-3', description: 'Wedding Gown', status: 'ready' },
    ],
  },
];

@Injectable()
export class OrdersService {
  findAll(): Order[] {
    return ORDERS;
  }

  findOne(id: string): Order | undefined {
    return ORDERS.find((o) => o.id === id);
  }

  // NOTE: You will add more methods here in the implementation tasks.

   updateGarmentStatus(
      orderId: string,
      garmentId: string,
      newStatus: string,
    ): Garment | 'ORDER_NOT_FOUND' | 'GARMENT_NOT_FOUND' | 'INVALID_STATUS' {
      if (!VALID_STATUSES.includes(newStatus as GarmentStatus)) {
        return 'INVALID_STATUS';
      }
  
      const order = ORDERS.find((o) => o.id === orderId);
      if (!order) {
        return 'ORDER_NOT_FOUND';
      }
  
      const garment = order.garments.find((g) => g.id === garmentId);
      if (!garment) {
        return 'GARMENT_NOT_FOUND';
      }
  
      garment.status = newStatus as GarmentStatus;
      return garment;
    }

    getOrderSummary(orderId: string): OrderSummary | undefined {
        const order = ORDERS.find((o) => o.id === orderId);
        if (!order) return undefined;
    
        const counts: Record<GarmentStatus, number> = {
          received: 0,
          in_cleaning: 0,
          ready: 0,
          delivered: 0,
        };
    
        for (const garment of order.garments) {
          counts[garment.status]++;
        }
    
        return {
          orderId: order.id,
          customerName: order.customerName,
          totalGarments: order.garments.length,
          counts,
          isFullyDelivered:
            order.garments.length > 0 &&
            order.garments.every((g) => g.status === 'delivered'),
        };
      }


      getGarmentStatusSummary(): { [status: string]: number } {
    const result: { [status: string]: number } = {};

    for (const order of ORDERS) {
      for (const garment of order.garments) {
        result[garment.status] = (result[garment.status] || 0) + 1;
      }
    }

    return result; 
  }
}
