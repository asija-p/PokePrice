import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CardService {
  private baseUrl = 'http://localhost:3000/cards';

  constructor(private http: HttpClient) {}

  getCards(size: number = 12) {
    return this.http.get<any[]>(`${this.baseUrl}?size=${size}`);
  }

  getAveragePrice() {
    return this.http.get<any[]>(`${this.baseUrl}/price/average`);
  }

  getAveragePricePerSource(minutes: number = 60) {
    return this.http.get<any[]>(`${this.baseUrl}/source/averages?minutes=${minutes}`);
  }

  getCardSourceBreakdown(cardName: string, minutes: number = 60) {
    return this.http.get<any[]>(
      `${this.baseUrl}/card_price/source_breakdown?card=${cardName}&minutes=${minutes}`,
    );
  }

  getPriceExtremes(cardName: string, minutes: number = 60) {
    return this.http.get<any[]>(
      `${this.baseUrl}/card_price/extremes?card=${cardName}&minutes=${minutes}`,
    );
  }

  getMovingAverage(window: number) {
    return this.http.get<any[]>(`${this.baseUrl}/moving-average?window=${window}`);
  }

  getTopCards(limit: number, window: number, unit: string = 'm') {
    return this.http.get<any[]>(`${this.baseUrl}/top?limit=${limit}&window=${window}&unit=${unit}`);
  }

  getSpikes() {
    return this.http.get<any[]>(`${this.baseUrl}/price/spikes`);
  }

  getAveragePricePerCard(cardName: string, minutes: number = 60) {
    return this.http.get<any[]>(
      `${this.baseUrl}/card_price/average?card=${cardName}&minutes=${minutes}`,
    );
  }

  getCardSpikes(cardName: string, minutes: number = 60, threshold: number = 20) {
    return this.http.get<any[]>(
      `${this.baseUrl}/card_price/spikes?card=${cardName}&minutes=${minutes}&threshold=${threshold}`,
    );
  }

  getCardMetadata(cardName: string) {
    return this.http.get<any>(`${this.baseUrl}/metadata?card=${cardName}`);
  }
}
