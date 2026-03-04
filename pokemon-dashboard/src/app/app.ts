import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../card';
import { CardRealtimeService } from './cardrealtime.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CardService } from './card.service';
import { FormsModule } from '@angular/forms';

interface SourceData {
  source: string;
  _value: number;
  [key: string]: any;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  imports: [CommonModule, FormsModule],
})
export class App implements OnInit {
  cards: Card[] = [];
  searchName: string = '';
  movingWindow: number = 5;

  topLimit: number = 1;
  topMinutes: number = 60;

  analytics: any = {
    avgPrice: 0,
    sourceAverages: [],
    spike: null,
    searchResult: null,
    movingAverage: 0,
    topCard: null,
    topList: [],
  };

  constructor(
    private cardService: CardService,
    private realtime: CardRealtimeService,
  ) {}

  ngOnInit() {
    this.loadInitialData();
    this.setupRealtimeCards();

    setInterval(() => {
      this.updateLiveAnalytics();
    }, 3000);
  }

  loadInitialData() {
    this.cardService.getCards().subscribe((data) => {
      this.cards = data;
    });

    this.updateLiveAnalytics();
  }

  setupRealtimeCards() {
    this.realtime.listenNewCards().subscribe((newCard) => {
      this.cards = [newCard, ...this.cards].slice(0, 12);
      setTimeout(() => this.updateLiveAnalytics(), 100);
    });
  }

  updateLiveAnalytics() {
    forkJoin({
      avgPrice: this.cardService.getAveragePrice(),
      sourceAverages: this.cardService.getAveragePricePerSource(),
      spike: this.cardService.getSpikes(),
      top: this.cardService.getTopCards(1, 60),
    }).subscribe((result) => {
      const extractValue = (data: any[]) => (data?.length ? data[0]._value : 0);

      this.analytics.avgPrice = extractValue(result.avgPrice);
      this.analytics.sourceAverages = result.sourceAverages;
      this.analytics.spike = result.spike?.length ? result.spike[0] : null;
      this.analytics.topCard = result.top?.length ? result.top[0] : null;
    });
  }

  searchCard() {
    const normalizedName = this.searchName.trim();

    if (!normalizedName) return;

    forkJoin({
      avg: this.cardService.getAveragePricePerCard(normalizedName),
      extremes: this.cardService.getPriceExtremes(normalizedName),
      sources: this.cardService.getCardSourceBreakdown(normalizedName),
      spikes: this.cardService.getCardSpikes(normalizedName),
    }).subscribe((result) => {
      this.cardService.getCardMetadata(normalizedName).subscribe((meta) => {
        this.analytics.searchResult = {
          image: meta?.image || 'assets/placeholder.png',
          hp: meta?.hp || 0,
          level: meta?.level || 0,
          avg: result.avg?.length ? result.avg[0]._value : 0,
          minPrice:
            result.extremes?.length > 0
              ? result.extremes.reduce((a, b) => (a._value < b._value ? a : b))
              : null,
          maxPrice:
            result.extremes?.length > 0
              ? result.extremes.reduce((a, b) => (a._value > b._value ? a : b))
              : null,
          sourceBreakdown: result.sources || [],
          spikes: result.spikes || [],
        };
      });
    });
  }

  applyMovingAverage() {
    this.cardService.getMovingAverage(this.movingWindow).subscribe((data) => {
      this.analytics.movingAverage = data?.length ? data[0]._value : 0;
    });
  }

  loadTopCards() {
    this.cardService.getTopCards(this.topLimit, this.topMinutes).subscribe((data) => {
      this.analytics.topList = data || [];
    });
  }
}
