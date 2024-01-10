import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserRequest, UpdateUserRequest } from './requests';
import { ApiBearerAuth, ApiQuery, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@Controller('users')
@ApiTags('Users')
@UseGuards(AuthGuard(['jwt', 'api-key']))
@ApiSecurity('api-key')
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() request: CreateUserRequest) {
    return this.usersService.create(request);
  }

  @Get('')
  @ApiQuery({
    name: 'pageSize',
    required: false,
  })
  @ApiQuery({
    name: 'pageNumber',
    required: false,
  })
  @ApiQuery({
    name: 'search',
    required: false,
  })
  users(
    @Query('pageSize') pageSize: number,
    @Query('pageNumber') pageNumber: number,
    @Query('search') search: string,
  ) {
    return this.usersService.getUsers({ pageSize, pageNumber, search });
  }

  @Get('count')
  countUsers() {
    return this.usersService.getUserCount();
  }

  @Get(':userID')
  user(@Param('userID') id: string) {
    return this.usersService.findOneByID(id);
  }

  @Patch(':userID')
  update(@Param('userID') id: string, @Body() request: UpdateUserRequest) {
    return this.usersService.update(id, request);
  }

  @Delete(':userID')
  delete(@Param('userID') id: string) {
    return this.usersService.delete(id);
  }
}
