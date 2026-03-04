import {
  Controller,
  Post,
  Body,
  Query,
  Get,
  BadRequestException,
} from '@nestjs/common';
import { Point } from '@influxdata/influxdb-client';
import { InfluxService } from 'src/influx/influx.service';
import { CardsGateway } from 'src/cards/cards.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CardEntity } from 'src/postgre/card.entity';

@Controller('cards')
export class CardsController {
  constructor(
    @InjectRepository(CardEntity)
    private readonly cardRepository: Repository<CardEntity>,
    private readonly influxService: InfluxService,
    private readonly cardsGateway: CardsGateway,
  ) {}

  @Post()
  async create(@Body() card: any) {
    const writeApi = this.influxService.getWriteApi();

    const hp = this.parseNumber(card.hp, 0);
    const level = this.parseNumber(card.level, 0);
    const price = this.parseNumber(card.price, 0);

    const imageUrl = card.images?.small || card.image || '/placeholder.png';

    try {
      await this.cardRepository.upsert(
        {
          name: card.name,
          hp: hp,
          level: level,
          image: imageUrl,
        },
        ['name'],
      );

      const point = new Point('card_prices')
        .tag('card_name', card.name)
        .tag('source', card.source)
        .floatField('price', price)
        .timestamp(new Date());

      writeApi.writePoint(point);
      await writeApi.flush();

      this.cardsGateway.emitNewCard({
        card_name: card.name,
        image: imageUrl,
        price,
        hp,
        level,
        source: card.source,
      });

      return { status: 'ok', cardName: card.name };
    } catch (error) {
      console.error('Dual-DB Write Error:', error);
      throw error;
    }
  }

  //pomocne funkcije

  private parseNumber(value: any, defaultValue: number): number {
    if (value === null || value === undefined) return defaultValue;

    if (typeof value === 'string') {
      value = value.replace(/[^0-9.]/g, '');
    }

    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  @Get('metadata')
  async getCardMetadata(@Query('card') cardName: string) {
    if (!cardName) return null;

    return this.cardRepository.findOne({
      where: { name: cardName },
    });
  }

  //upiti

  //market

  //prosecna cena celog marketa
  @Get('price/average')
  async averagePrice(@Query('minutes') minutes = 60) {
    const query = `
      from(bucket: "${process.env.INFLUX_BUCKET}")
        |> range(start: -${minutes}m)
        |> filter(fn: (r) => r._measurement == "card_prices")
        |> filter(fn: (r) => r._field == "price")
        |> group()
        |> mean()
    `;
    return this.influxService.query(query);
  }

  //prosecna cena jednog source-a
  @Get('source/averages')
  async averagePricePerSource(@Query('minutes') minutes = 60) {
    const query = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) => r._measurement == "card_prices")
      |> filter(fn: (r) => r._field == "price")
      |> group(columns: ["source"])
      |> mean()
  `;
    return this.influxService.query(query);
  }

  //vraca karticu koja je imala najveci spike/skok u ceni
  @Get('price/spikes')
  async globalPriceSpikes(
    @Query('minutes') minutes = 60,
    @Query('threshold') threshold = 20,
  ) {
    const query = `
      import "math"
      from(bucket: "${process.env.INFLUX_BUCKET}")
        |> range(start: -${minutes}m)
        |> filter(fn: (r) => r._measurement == "card_prices" and r._field == "price")
        |> group(columns: ["card_name", "source"]) 
        |> reduce(
            fn: (r, accumulator) => ({
                first: if accumulator.first == 0.0 then r._value else accumulator.first,
                last: r._value
            }),
            identity: {first: 0.0, last: 0.0}
        )
        |> map(fn: (r) => ({
            card_name: r.card_name,
            source: r.source, // Now this will be available
            percentage_gain: (r.last - r.first) / r.first * 100.0,
            current_price: r.last
        }))
        |> group()
        |> sort(columns: ["percentage_gain"], desc: true)
        |> limit(n: 1)
    `;

    const influxResults = (await this.influxService.query(query)) as any[];

    if (influxResults.length > 0) {
      const spike = influxResults[0];
      const meta = await this.cardRepository.findOne({
        where: { name: spike.card_name },
      });

      return [
        {
          ...spike,
          hp: meta?.hp || 0,
          level: meta?.level || 0,
          image: meta?.image || '/placeholder.png',
        },
      ];
    }
    return [];
  }

  //po kartici

  // Prosečna cena određene kartice
  @Get('card_price/average')
  async averagePricePerCard(
    @Query('minutes') minutes = 60,
    @Query('card') cardName?: string,
  ) {
    const query = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) => r._measurement == "card_prices")
      |> filter(fn: (r) => r._field == "price")
      ${cardName ? `|> filter(fn: (r) => r.card_name == "${cardName}")` : ''}
      |> group(columns: ["card_name"])
      |> mean()
  `;
    return this.influxService.query(query);
  }

  // Prosečna cena određene kartice po izvoru
  @Get('card_price/source_breakdown')
  async sourceBreakdown(
    @Query('card') card: string,
    @Query('minutes') minutes = 60,
  ) {
    const query = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) => r._measurement == "card_prices")
      |> filter(fn: (r) => r.card_name == "${card}")
      |> filter(fn: (r) => r._field == "price")
      |> group(columns: ["source"])
      |> sort(columns: ["_time"], desc: true)
      |> first()
  `;
    return this.influxService.query(query);
  }

  // Minimalna i maksimalna cena po kartici u posmatranom periodu
  @Get('card_price/extremes')
  async priceExtremes(
    @Query('card') card: string,
    @Query('minutes') minutes = 60,
  ) {
    const query = `
    data = from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) => r._measurement == "card_prices")
      |> filter(fn: (r) => r.card_name == "${card}")
      |> filter(fn: (r) => r._field == "price")
      |> group()

    minVal = data |> bottom(n: 1, columns: ["_value"])
    maxVal = data |> top(n: 1, columns: ["_value"])

    union(tables: [minVal, maxVal])
  `;
    return this.influxService.query(query);
  }

  // Spike za konkretnu karticu — detektuje naglu promenu cene
  @Get('card_price/spikes')
  async cardPriceSpikes(
    @Query('card') cardName: string,
    @Query('minutes') minutes = 60,
    @Query('threshold') threshold = 20,
  ) {
    const query = `
    import "math"

    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) => r._measurement == "card_prices")
      |> filter(fn: (r) => r.card_name == "${cardName}")
      |> filter(fn: (r) => r._field == "price")
      |> sort(columns: ["_time"])
      |> duplicate(column: "_value", as: "current_price")
      |> difference(columns: ["_value"]) 
      |> filter(fn: (r) => math.abs(x: r._value) > ${threshold})
      |> map(fn: (r) => ({ 
          time: r._time,
          card_name: r.card_name,
          spike_amount: r._value, 
          price_at_spike: r.current_price,
          source: r.source
        }))
      |> sort(columns: ["time"], desc: true)
  `;
    return this.influxService.query(query);
  }

  //pokretni upiti

  //upit koji vraca average za zadnje n kartice
  @Get('moving-average')
  async movingAverage(@Query('window') window = 5) {
    const win = this.parseNumber(window, 5);

    const query = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "card_prices")
      |> filter(fn: (r) => r._field == "price")
      |> group()
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: ${win})
      |> mean()
  `;

    return this.influxService.query(query);
  }

  //top kartica po izabranoj metrici
  @Get('top')
  async topCards(
    @Query('limit') limit = 1,
    @Query('window') window = 60,
    @Query('unit') unit = 'm',
  ) {
    const lim = this.parseNumber(limit, 1);
    const win = this.parseNumber(window, 60);

    const allowedUnits = ['s', 'm', 'h', 'd'];
    const safeUnit = allowedUnits.includes(unit) ? unit : 'm';

    const query = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -${win}${safeUnit})
      |> filter(fn: (r) => r._measurement == "card_prices")
      |> filter(fn: (r) => r._field == "price")
      |> group(columns: ["card_name"])
      |> sort(columns: ["_time"], desc: true)
      |> first()
      |> group()
      |> sort(columns: ["_value"], desc: true)
      |> limit(n: ${lim})
  `;

    const results = (await this.influxService.query(query)) as any[];

    if (!results || results.length === 0) return [];

    const cardNames = [...new Set(results.map((r) => r.card_name))];

    const metadata = await this.cardRepository.find({
      where: { name: In(cardNames) },
    });

    return results.map((r) => {
      const meta = metadata.find((m) => m.name === r.card_name);

      return {
        card_name: r.card_name,
        price: r._value,
        source: r.source,
        image: meta?.image ?? '/placeholder.png',
      };
    });
  }

  //vrati 12 kartice
  @Get()
  async getAllCards(@Query('size') size = 12) {
    const s = this.parseNumber(size, 12);

    const influxQuery = `
      from(bucket: "${process.env.INFLUX_BUCKET}")
        |> range(start: -30d)
        |> filter(fn: (r) => r._measurement == "card_prices")
        |> filter(fn: (r) => r._field == "price")
        |> last() 
        |> group()
        |> sort(columns: ["_time"], desc: true)
        |> limit(n: ${s})
    `;

    const priceResults = (await this.influxService.query(influxQuery)) as any[];

    if (!priceResults || priceResults.length === 0) {
      return [];
    }

    const cardNames = [...new Set(priceResults.map((r: any) => r.card_name))];

    const metadata = await this.cardRepository.find({
      where: { name: In(cardNames) },
    });

    return priceResults.map((p: any) => {
      const meta = metadata.find((m) => m.name === p.card_name);
      return {
        card_name: p.card_name,
        price: p._value,
        source: p.source,
        time: p._time,
        hp: meta?.hp ?? 0,
        level: meta?.level ?? 0,
        image: meta?.image ?? '/placeholder.png',
      };
    });
  }
}
