import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GatewaysService } from './gateways.service';
import {
  Gateway,
  GatewayCreate,
  GatewaysResponse,
  GatewayUpdate,
} from './types';

@Controller('gateways')
@ApiTags('Gateways')
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
