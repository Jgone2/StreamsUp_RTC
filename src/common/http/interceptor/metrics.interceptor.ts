import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Counter, Gauge, Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly httpHistogram: Histogram<string>;
  private readonly httpErrorCounter: Counter<string>;
  private readonly inFlightGauge: Gauge<string>;
  private readonly appVersion: string;

  constructor(private readonly config: ConfigService) {
    // 1) APP_VERSION 읽기
    this.appVersion = this.config.get<string>('APP_VERSION');

    // 2) Histogram 정의 (version 레이블 포함)
    this.httpHistogram = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request latency in seconds',
      labelNames: ['method', 'path', 'status', 'version'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    // 3) 5xx 에러 카운터
    this.httpErrorCounter = new Counter({
      name: 'http_errors_total',
      help: 'Number of HTTP 5xx errors',
      labelNames: ['method', 'path', 'status'],
    });

    // 4) In-flight Gauge
    this.inFlightGauge = new Gauge({
      name: 'http_in_flight_requests',
      help: 'Number of HTTP requests in progress',
    });
  }

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();

    // 요청 시작 시 in-flight++
    this.inFlightGauge.inc();

    // 타이머 시작 (version 포함)
    const endTimer = this.httpHistogram.startTimer({
      method: req.method,
      path: req.route?.path || req.url,
      version: this.appVersion,
    });

    return next.handle().pipe(
      tap({
        error: () => {
          // 에러 발생 시 5xx 인지 체크 후 카운트
          const status = res.statusCode;
          if (status >= 500) {
            this.httpErrorCounter.inc({
              method: req.method,
              path: req.route?.path || req.url,
              status: String(status),
            });
          }
        },
      }),
      finalize(() => {
        // 요청 끝나면 in-flight--, histogram 종료
        this.inFlightGauge.dec();
        endTimer({ status: String(res.statusCode) });
      }),
    );
  }
}