import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserRequest } from './create-user.request';
import { UpdateUserRequest } from './update-user.request';

@Controller('')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() request: CreateUserRequest) {
    return this.usersService.create(request);
  }

  @Get('')
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
