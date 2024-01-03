import {
  Body,
  Controller,
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

  @Patch(':userID')
  update(@Param('userID') id: string, @Body() request: UpdateUserRequest) {
    return this.usersService.update(id, request);
  }
}
