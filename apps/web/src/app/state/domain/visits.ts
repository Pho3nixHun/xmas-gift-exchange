import { effect, inject } from '@angular/core';

import { HouseApi } from '../../data-access/house-api';
import { VisitCounter } from '../../data-access/visit-counter';

/**
 * App initializer: starts the visit counter once public config names one. The
 * effect is interop with Matomo's script queue, not state; it does nothing
 * when the deployment leaves `analytics` out (the default).
 */
export const countVisits = () => {
    const config = inject(HouseApi).config;
    const counter = inject(VisitCounter);
    effect(() => {
        const analytics = config.hasValue() ? config.value().analytics : null;
        if (analytics) counter.connect(analytics);
    });
};
