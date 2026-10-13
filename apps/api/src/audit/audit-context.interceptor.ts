import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import {
  extractAuditRequestMeta,
  runWithAuditRequestMeta,
} from './audit.context.js';

/**
 * Keeps IP / User-Agent available on the AsyncLocalStorage store for the
 * full request pipeline (including async service work).
 */
@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const meta = extractAuditRequestMeta(req);

    return new Observable((subscriber) => {
      runWithAuditRequestMeta(meta, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
