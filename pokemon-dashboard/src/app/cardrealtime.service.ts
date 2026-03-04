import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';

@Injectable({
  providedIn: 'root',
})
export class CardRealtimeService {
  private socket = io('http://localhost:3000');

  listenNewCards(): Observable<any> {
    return new Observable((observer) => {
      this.socket.on('card_created', (data) => observer.next(data));
      return () => this.socket.off('card_created');
    });
  }
}
