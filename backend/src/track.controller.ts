import { Controller, Post, Body, Req } from '@nestjs/common';

@Controller('api/track')
export class TrackController {
  @Post('start-session')
  async startSession(@Body() body: any) {
    // Validate body.userId, body.module
    // Create session in DB and return sessionId
    return { sessionId: 'TODO-UUID' };
  }

  @Post('event')
  async postEvents(@Body() body: any, @Req() req: any) {
    // Validate signature / token
    // Enqueue events for processing
    return { accepted: true };
  }

  @Post('end-session')
  async endSession(@Body() body: any) {
    // Close session: set ended_at and compute duration
    return { ok: true };
  }
}
