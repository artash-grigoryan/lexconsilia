import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable Cross-Origin Resource Sharing (CORS)
  app.enableCors();

  // Swagger (OpenAPI) configuration in English
  const config = new DocumentBuilder()
    .setTitle('LexConsilia RAG API')
    .setDescription(
      'Retrieval-Augmented Generation API for legal documents. ' +
        'Index laws, case law, and legal articles, then query your knowledge base with AI.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Development server')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'LexConsilia API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 RAG API available at: http://localhost:${port}/rag`);
  console.log(`📖 Swagger documentation: http://localhost:${port}/api`);
}

void bootstrap();
