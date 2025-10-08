import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('LexConsilia RAG API')
    .setDescription(
      'API de Retrieval-Augmented Generation pour documents juridiques. ' +
        'Indexez des lois, jurisprudences et articles juridiques, puis consultez ' +
        "votre base de connaissances avec l'IA.",
    )
    .setVersion('1.0')
    .addTag('rag', 'Endpoints du système RAG')
    .addTag('indexation', 'Indexation de documents juridiques')
    .addTag('consultation', 'Consultation et analyse de documents')
    .addServer('http://localhost:3000', 'Serveur de développement')
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
