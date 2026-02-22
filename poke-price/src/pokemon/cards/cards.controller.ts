import { Controller, Post, Body, Query, Get } from '@nestjs/common';
import { Point } from '@influxdata/influxdb-client';
import { InfluxService } from 'src/influx/influx.service';

@Controller('cards')
export class CardsController {
  constructor(private readonly influxService: InfluxService) {}

  @Post()
  async create(@Body() card: any) {
    console.log('Received card:', card.name);

    const writeApi = this.influxService.getWriteApi();

    const point = new Point('card_prices')
      .tag('card_name', card.name)
      .tag('source', card.source)
      .tag('image', card.images.small)
      .floatField('price', card.price || 0);

    try {
      writeApi.writePoint(point);
      await writeApi.flush();
    } catch (error) {
      console.error(error);
      throw error;
    }

    return { status: 'ok' };
  }

  @Get('price/average')
  async averagePrice(@Query('minutes') minutes = 60) {
    const fluxQuery = `
      from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) => r._measurement=="card_prices")
      |> group(columns: ["card_name"])
      |> mean(column: "_value")  
    `;

    return this.influxService.query(fluxQuery);
  }

  @Get('price/trend')
  async priceTrend(
    @Query('minutes') minutes = 120,
    @Query('window') window = 10,
  ) {
    const query = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) => r._measurement == "card_prices")
      |> aggregateWindow(every: ${window}m, fn: mean, createEmpty: false)
      |> group(columns: ["card_name"])
      |> sort(columns: ["_time"])
  `;

    return this.influxService.query(query);
  }

  @Get('price/spikes')
  async spikes(
    @Query('minutes') minutes = 60,
    @Query('threshold') threshold = 20,
  ) {
    const query = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) => r._measurement == "card_prices")
      |> group(columns: ["card_name"])
      |> min()
      |> join(
        tables: {max: max()},
        on: ["card_name"]
      )
  `;

    return this.influxService.query(query);
  }

  @Get('price/max-by-source')
  async maxPriceBySource(@Query('minutes') minutes = 60) {
    const query = `
    from(bucket: "${process.env.INFLUX_BUCKET}")
      |> range(start: -${minutes}m)
      |> filter(fn: (r) => r._measurement == "card_prices")
      |> group(columns: ["card_name", "source"])
      |> max(column: "_value")
  `;

    return this.influxService.query(query);
  }
}
