import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as process from 'process';

async function bootstrap() {
  const port = parseInt(process.env.PORT || '3000');
  const app = await NestFactory.create(AppModule, { cors: true });
  await app.listen(port);
}
bootstrap().then();
