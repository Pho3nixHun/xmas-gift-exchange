import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SoundAssets {
    private readonly http = inject(HttpClient);
    load(path: string) {
        return firstValueFrom(
            this.http.get(path, { responseType: 'arraybuffer' })
        );
    }
}
