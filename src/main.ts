import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as process from 'process';

async function bootstrap() {
  const port = parseInt(process.env.PORT || '3000');
  const nodeEnvironment = process.env.NODE_ENV || 'production';
  const app = await NestFactory.create(AppModule, { cors: true });

  if (nodeEnvironment === 'development') {
    const config = new DocumentBuilder()
      .setTitle('NeverNVR')
      .setDescription('The best goddamn NVR ever')
      .setVersion('0.1')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port);
}
bootstrap().then();
