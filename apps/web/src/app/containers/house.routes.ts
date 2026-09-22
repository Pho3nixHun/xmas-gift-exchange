import type { Routes } from '@angular/router';
import { provideNgtRenderer } from 'angular-three/dom';

import { HousePage } from './house-page';

export const houseRoutes: Routes = [
    { path: '', providers: [provideNgtRenderer()], component: HousePage },
];
