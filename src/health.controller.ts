import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root(): { status: string } {
    return { status: 'ok' };
  }

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
