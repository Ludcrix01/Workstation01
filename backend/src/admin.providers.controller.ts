import { Controller, Get, Post, Patch, Delete, Body, Param, Req, ForbiddenException } from '@nestjs/common';
import { providersService } from './admin.providers.service';

function ensureSuperAdmin(req: any) {
  // Temporary guard: in real app use proper auth and guards
  const role = req.headers['x-user-role'] || req.user?.role;
  if (!role || role !== 'superadmin') throw new ForbiddenException('superadmin required');
}

@Controller('admin/providers')
export class AdminProvidersController {
  @Get()
  async listProviders(@Req() req: any) {
    ensureSuperAdmin(req);
    return await providersService.getProviders();
  }

  @Post()
  async createProvider(@Body() body: any, @Req() req: any) {
    ensureSuperAdmin(req);
    const { name, display_name, client_id, client_secret, default_scopes } = body;
    return await providersService.createProvider({ name, display_name, client_id, client_secret, default_scopes, created_by: req.headers['x-user-id'] || null });
  }

  @Patch(':id')
  async updateProvider(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    ensureSuperAdmin(req);
    // partial update - simple implementation
    // TODO: implement update logic in service
    return { id, ...body };
  }

  @Post(':id/assign-company')
  async assignToCompany(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    ensureSuperAdmin(req);
    const { companyId, enabled, allowed_scopes } = body;
    return await providersService.assignToCompany({ providerId: id, companyId, enabled, allowed_scopes, assigned_by: req.headers['x-user-id'] || null });
  }

  @Post(':id/assign-user')
  async assignUser(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    ensureSuperAdmin(req);
    const { companyId, userId, role } = body;
    return await providersService.grantUser({ providerId: id, companyId, userId, role, granted_by: req.headers['x-user-id'] || null });
  }

  @Delete(':id/assign-user/:userId')
  async revokeUser(@Param('id') id: string, @Param('userId') userId: string, @Req() req: any) {
    ensureSuperAdmin(req);
    // TODO: implement revoke logic
    return { revoked: true };
  }

  @Post(':id/test-connection')
  async testConnection(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    ensureSuperAdmin(req);
    // TODO: implement real test (call provider API)
    return { ok: true };
  }
}
