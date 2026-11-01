import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import type { PublicConfig } from '@winter/contracts';
import { filter } from 'rxjs';

type Analytics = NonNullable<PublicConfig['analytics']>;
type Command = unknown[];
type MatomoWindow = Window & {
    _paq?: { push: (...commands: Command[]) => unknown };
    navigator: Navigator & { globalPrivacyControl?: boolean };
};

/**
 * Cookieless Matomo visit counts through the deployment's same-origin tracker
 * path. Only the page's path is sent, as its URL and its title: never the
 * #token= recovery fragment, a query, the document title or a link, so nothing
 * private reaches the counter. Do Not Track and Global Privacy Control opt a
 * visitor out.
 */
@Injectable({ providedIn: 'root' })
export class VisitCounter {
    private readonly document = inject(DOCUMENT);
    private readonly router = inject(Router);
    private connected = false;
    private lastPath = '';

    connect(analytics: Analytics) {
        const window = this.document.defaultView as MatomoWindow | null;
        if (this.connected || !window || optedOut(window.navigator)) return;
        this.connected = true;
        window._paq ??= [] as Command[];
        // matomo.js swaps window._paq for its own queue once it loads, so every
        // push goes through the window, never through a kept reference.
        const push = (...commands: Command[]) => window._paq?.push(...commands);
        push(
            ['setTrackerUrl', `${analytics.trackerPath}matomo.php`],
            ['setSiteId', analytics.siteId],
            ['disableCookies']
        );
        const count = () => {
            const path = window.location.pathname;
            if (path === this.lastPath) return;
            this.lastPath = path;
            push(
                ['setCustomUrl', `${window.location.origin}${path}`],
                ['setDocumentTitle', path],
                ['trackPageView']
            );
        };
        count();
        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(count);
        const script = this.document.createElement('script');
        script.setAttribute('async', '');
        script.setAttribute('src', `${analytics.trackerPath}matomo.js`);
        this.document.head.append(script);
    }
}

const optedOut = (navigator: MatomoWindow['navigator']) =>
    navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
