import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: true })
export class CardsGateway {
  @WebSocketServer()
  server: Server;

  emitNewCard(card: any) {
    this.server.emit('card_created', card);
  }

  emitStatsUpdate(event: string, data: any) {
    this.server.emit(event, data);
  }
}
