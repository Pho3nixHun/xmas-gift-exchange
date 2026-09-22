import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { publicConfigSchema, wishCheckSchema } from '@winter/contracts';
import { firstValueFrom } from 'rxjs';

import type { WishInput } from '../core/wish';

@Injectable({ providedIn: 'root' })
export class HouseApi {
    private readonly http = inject(HttpClient);
    readonly config = httpResource(() => '/api/v1/public-config', {
        parse: value => publicConfigSchema.parse(value),
    });

    async check(wish: WishInput) {
        const response = await firstValueFrom(
            this.http.post<unknown>('/api/v1/workbench/wish-check', wish)
        );
        return wishCheckSchema.parse(response);
    }
}
