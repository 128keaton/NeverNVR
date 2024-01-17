import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as process from 'process';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const port = parseInt(process.env.PORT || '3000');
  const nodeEnvironment = process.env.NODE_ENV || 'production';
  const app = await NestFactory.create(AppModule, { cors: true });

  app.setGlobalPrefix('api', { exclude: [''] });

  app.use(bodyParser.json({ limit: '1024mb' }));
  app.use(bodyParser.urlencoded({ limit: '1024mb', extended: true }));

  if (nodeEnvironment === 'development') {
    const config = new DocumentBuilder()
      .setTitle('NeverNVR')
      .setDescription('The best goddamn NVR ever')
      .setVersion('0.1')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'api-key', in: 'header' }, 'api-key')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port);
}
bootstrap().then();
