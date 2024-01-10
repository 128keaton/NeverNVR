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
@ApiSecurity('api-key')
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @UseGuards(AuthGuard(['jwt', 'api-key']))
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
  @UseGuards(AuthGuard(['jwt', 'api-key']))
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
  @UseGuards(AuthGuard(['jwt', 'api-key']))
  user(@Param('userID') id: string) {
    return this.usersService.findOneByID(id);
  }

  @Patch(':userID')
  @UseGuards(AuthGuard(['jwt', 'api-key']))
  update(@Param('userID') id: string, @Body() request: UpdateUserRequest) {
    return this.usersService.update(id, request);
  }

  @Delete(':userID')
  @UseGuards(AuthGuard(['jwt', 'api-key']))
  delete(@Param('userID') id: string) {
    return this.usersService.delete(id);
  }
}
