import { BadRequestException, Controller, Get, HttpCode, HttpStatus, Param,Body, Patch, NotFoundException } from '@nestjs/common';
import { OrdersService, Order, OrderSummary, Garment } from './orders.service';

interface UpdateStatusDto {
  status: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  getOrders(): Order[] {
    return this.ordersService.findAll();
  }

  @Get(':id')
  getOrder(@Param('id') id: string): Order | { error: string } {
    const order = this.ordersService.findOne(id);
    if (!order) {
      return { error: `Order with id ${id} not found` };
    }
    return order;
  }

    @Get('summary')
  getGarmentStatusSummary(): { [status: string]: number } {
    return this.ordersService.getGarmentStatusSummary();
  }

    @Get(':id/summary')
  getOrderSummary(@Param('id') id: string): OrderSummary {
    const summary = this.ordersService.getOrderSummary(id);
    if (!summary) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    return summary;
  }


    @Patch(':orderId/garments/:garmentId/status')
  @HttpCode(HttpStatus.OK)
  updateGarmentStatus(
    @Param('orderId') orderId: string,
    @Param('garmentId') garmentId: string,
    @Body() body: UpdateStatusDto,
  ): Garment {
    if (!body?.status) {
      throw new BadRequestException('Request body must include a "status" field');
    }

    const result = this.ordersService.updateGarmentStatus(
      orderId,
      garmentId,
      body.status,
    );

    switch (result) {
      case 'INVALID_STATUS':
        throw new BadRequestException(
          `"${body.status}" is not a valid status. Must be one of: received, in_cleaning, ready, delivered`,
        );
      case 'ORDER_NOT_FOUND':
        throw new NotFoundException(`Order with id ${orderId} not found`);
      case 'GARMENT_NOT_FOUND':
        throw new NotFoundException(
          `Garment with id ${garmentId} not found in order ${orderId}`,
        );
      default:
        return result;
    }
  }
}
