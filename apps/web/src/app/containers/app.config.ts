import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import type { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideRouter([
            {
                path: 'recover',
                loadComponent: () =>
                    import('./account-page').then(module => module.AccountPage),
            },
            {
                path: 'organiser',
                loadComponent: () =>
                    import('./account-page').then(module => module.AccountPage),
            },
            {
                path: '',
                loadChildren: () =>
                    import('./house.routes').then(module => module.houseRoutes),
            },
        ]),
    ],
};
