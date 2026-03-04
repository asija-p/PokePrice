import { Module } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsGateway } from 'src/cards/cards.gateway';

@Module({
  providers: [CardsGateway],
  controllers: [CardsController],
})
export class CardsModule {}
