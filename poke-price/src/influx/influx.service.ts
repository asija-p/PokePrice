import { Injectable } from '@nestjs/common';
import { InfluxDB } from '@influxdata/influxdb-client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InfluxService {
  private influxDB;
  private writeApi;
  private queryApi;

  constructor(private configService: ConfigService) {
    const url = this.configService.get<string>('INFLUX_URL', { infer: true })!;
    const token = this.configService.get<string>('INFLUX_TOKEN', {
      infer: true,
    })!;
    const org = this.configService.get<string>('INFLUX_ORG', { infer: true })!;
    const bucket = this.configService.get<string>('INFLUX_BUCKET', {
      infer: true,
    })!;

    this.influxDB = new InfluxDB({ url, token });
    this.writeApi = this.influxDB.getWriteApi(org, bucket);
    this.queryApi = this.influxDB.getQueryApi(org);
  }

  getWriteApi() {
    return this.writeApi;
  }

  getQueryApi() {
    return this.queryApi;
  }

  async query(fluxQuery: string) {
    const results: any[] = [];

    return new Promise((resolve, reject) => {
      this.queryApi.queryRows(fluxQuery, {
        next(row, tableMeta) {
          results.push(tableMeta.toObject(row));
        },
        error(error) {
          reject(error);
        },
        complete() {
          resolve(results);
        },
      });
    });
  }
}
