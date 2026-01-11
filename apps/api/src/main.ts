import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global prefix
  app.setGlobalPrefix('v1');
  
  // Get port from environment or default to 3001
  const port = process.env.PORT || 3001;
  
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/v1`);
}
bootstrap();