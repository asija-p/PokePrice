import { Test, TestingModule } from '@nestjs/testing';
import { CardsGateway } from './cards.gateway';

describe('CardsGateway', () => {
  let gateway: CardsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CardsGateway],
    }).compile();

    gateway = module.get<CardsGateway>(CardsGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
