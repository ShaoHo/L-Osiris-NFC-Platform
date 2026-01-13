import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PaymentsService, CheckoutSessionEvent } from './payments.service';

interface CreateCheckoutSessionDto {
  viewerId: string;
  exhibitionId?: string | null;
  versionId?: string | null;
  expiresAt?: string | null;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('checkout-session')
  @HttpCode(HttpStatus.OK)
  async createCheckoutSession(@Body() dto: CreateCheckoutSessionDto) {
    return this.paymentsService.createCheckoutSession(dto);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() event: CheckoutSessionEvent) {
    return this.paymentsService.handleWebhook(event);
  }
}
