import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { GatewaysService } from './gateways.service';
import {
  Gateway,
  GatewayCreate,
  GatewayDiskSpace,
  GatewaysResponse,
  GatewayStats,
  GatewayUpdate,
} from './types';
import { AuthGuard } from '@nestjs/passport';

@Controller('gateways')
@ApiTags('Gateways')
@UseGuards(AuthGuard(['jwt', 'api-key']))
@ApiSecurity('api-key')
@ApiBearerAuth()
export class GatewaysController {
  constructor(private gatewaysService: GatewaysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a gateway' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 200,
    description: 'The created record',
    type: Gateway,
  })
  create(@Body() data: GatewayCreate) {
    return this.gatewaysService.create(data);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'The found record',
    type: Gateway,
  })
  @ApiOperation({ summary: 'Get a gateway' })
  get(@Param('id') id: string) {
    return this.gatewaysService.get(id);
  }

  @Get(':id/stats')
  @ApiResponse({
    status: 200,
    type: GatewayStats,
  })
  @ApiOperation({ summary: 'Get a gateways stats' })
  getStats(@Param('id') id: string) {
    return this.gatewaysService.getGatewayStats(id);
  }

  @Get(':id/diskSpace')
  @ApiResponse({
    status: 200,
    type: GatewayDiskSpace,
  })
  @ApiOperation({ summary: 'Get a gateways disk space info' })
  getDiskSpace(@Param('id') id: string) {
    return this.gatewaysService.getDiskSpace(id);
  }

  @Get(':id/restart/janus')
  @ApiOperation({ summary: 'Restart the Janus service on the gateway' })
  restartJanus(@Param('id') id: string) {
    return this.gatewaysService.restartJanus(id);
  }

  @Get(':id/logs/janus')
  @ApiOperation({ summary: 'Get log output from Janus service' })
  getJanusLogs(@Param('id') id: string) {
    return this.gatewaysService.getJanusOutput(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all gateways' })
  @ApiResponse({
    status: 200,
    description: 'The found records',
    type: GatewaysResponse,
  })
  getMany() {
    return this.gatewaysService.getMany();
  }

  @Delete(':id')
  @ApiResponse({
    status: 200,
    description: 'The deleted record',
    type: Gateway,
  })
  @ApiOperation({ summary: 'Delete a gateway' })
  async delete(@Param('id') id: string) {
    return this.gatewaysService.delete(id);
  }

  @Patch(':id')
  @ApiResponse({
    status: 200,
    description: 'The updated record',
    type: Gateway,
  })
  @ApiOperation({ summary: 'Update a gateway' })
  update(@Param('id') id: string, @Body() data: GatewayUpdate) {
    return this.gatewaysService.update(id, data);
  }
}
