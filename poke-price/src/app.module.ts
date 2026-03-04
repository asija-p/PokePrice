import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CardsController } from './pokemon/cards/cards.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InfluxService } from './influx/influx.service';
import { CardsGateway } from './cards/cards.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardEntity } from './postgre/card.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [CardEntity],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([CardEntity]),
  ],
  controllers: [AppController, CardsController],
  providers: [AppService, InfluxService, CardsGateway],
  exports: [TypeOrmModule],
})
export class AppModule {}
