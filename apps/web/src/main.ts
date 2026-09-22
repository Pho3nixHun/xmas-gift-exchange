import { bootstrapApplication } from '@angular/platform-browser';

import { App } from './app/containers/app';
import { appConfig } from './app/containers/app.config';

void bootstrapApplication(App, appConfig).catch((error: unknown) => {
    console.error(
        'The house could not start.',
        error instanceof Error ? error.name : 'UnknownError'
    );
});
