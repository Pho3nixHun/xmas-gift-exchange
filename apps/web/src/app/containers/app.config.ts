import { provideHttpClient } from '@angular/common/http';
import {
    EnvironmentInjector,
    inject,
    provideAppInitializer,
    provideZonelessChangeDetection,
    runInInjectionContext,
} from '@angular/core';
import type { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

// Lazy: the visit counter reads public config, whose contract (zod) stays out
// of the initial bundle. Off unless the runtime JSON names a tracker.
const countVisitsLater = () => {
    const injector = inject(EnvironmentInjector);
    void import('../state/domain/visits').then(({ countVisits }) =>
        runInInjectionContext(injector, countVisits)
    );
};

export const appConfig: ApplicationConfig = {
    providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideAppInitializer(countVisitsLater),
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
