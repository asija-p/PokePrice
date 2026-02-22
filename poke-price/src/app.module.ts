import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CardsController } from './pokemon/cards/cards.controller';
import { ConfigModule } from '@nestjs/config';
import { InfluxService } from './influx/influx.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, CardsController],
  providers: [AppService, InfluxService],
})
export class AppModule {}
