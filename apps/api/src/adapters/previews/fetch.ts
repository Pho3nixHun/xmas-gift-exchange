import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';

import { fail } from '../../errors.js';

const blocked = new BlockList();
const ipv4 = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.88.99.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
] as const;
ipv4.forEach(([address, prefix]) => blocked.addSubnet(address, prefix, 'ipv4'));
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
[
    ['2001::', 23],
    ['2001:db8::', 32],
    ['2002::', 16],
    ['3fff::', 20],
].forEach(([address, prefix]) =>
    blocked.addSubnet(String(address), Number(prefix), 'ipv6')
);
export const publicAddress = (address: string) =>
    isIP(address) === 4
        ? !blocked.check(address, 'ipv4')
        : isIP(address) === 6 &&
          globalV6.check(address, 'ipv6') &&
          !blocked.check(address, 'ipv6');

export const previewUrl = (input: string): URL | null => {
    try {
        const url = new URL(input);
        const host = url.hostname.toLowerCase();
        if (
            !['http:', 'https:'].includes(url.protocol) ||
            url.username ||
            url.password ||
            url.port ||
            isIP(host.replaceAll('[', '').replaceAll(']', '')) ||
            !host.includes('.') ||
            host.endsWith('.') ||
            [
                '.localhost',
                '.local',
                '.internal',
                '.test',
                '.invalid',
                '.example',
            ].some(suffix => host.endsWith(suffix))
        )
            return null;
        return new URL(`${url.origin}${url.pathname}${url.search}`);
    } catch {
        return null;
    }
};
const page = async (
    url: URL,
    signal: AbortSignal
): Promise<{ readonly redirect?: string; readonly html?: string }> => {
    const addresses = await Promise.race([
        lookup(url.hostname, { all: true, verbatim: true }),
        new Promise<never>((_resolve, reject) =>
            signal.addEventListener(
                'abort',
                () => reject(new Error('PREVIEW_UNAVAILABLE')),
                { once: true }
            )
        ),
    ]);
    if (
        !addresses.length ||
        addresses.some(value => !publicAddress(value.address))
    )
        return fail('PREVIEW_UNAVAILABLE', 422);
    signal.throwIfAborted();
    const pinned = addresses[0];
    if (!pinned) return fail('PREVIEW_UNAVAILABLE', 422);
    return new Promise((resolve, reject) => {
        const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
        const request = send(
            url,
            {
                agent: false,
                signal,
                method: 'GET',
                headers: {
                    'User-Agent': 'WinterHouse-Preview/1.0',
                    Accept: 'text/html',
                    'Accept-Encoding': 'identity',
                },
                lookup: (_hostname, options, callback) => {
                    if (options.all) callback(null, [pinned]);
                    else callback(null, pinned.address, pinned.family);
                },
            },
            response => {
                const status = response.statusCode ?? 0;
                if ([301, 302, 303, 307, 308].includes(status)) {
                    response.destroy();
                    resolve({ redirect: response.headers.location ?? '' });
                    return;
                }
                if (
                    status !== 200 ||
                    !response.headers['content-type']
                        ?.toLowerCase()
                        .startsWith('text/html') ||
                    (response.headers['content-encoding'] &&
                        response.headers['content-encoding'] !== 'identity')
                ) {
                    response.destroy();
                    reject(new Error('PREVIEW_UNAVAILABLE'));
                    return;
                }
                const chunks = new Map<number, Buffer>();
                response.on('data', (data: Buffer) => {
                    const total =
                        [...chunks.values()].reduce(
                            (sum, chunk) => sum + chunk.length,
                            0
                        ) + data.length;
                    if (total > 1048576 || chunks.size >= 2048) {
                        response.destroy(new Error('PREVIEW_UNAVAILABLE'));
                        return;
                    }
                    chunks.set(chunks.size, data);
                });
                response.once('end', () =>
                    resolve({
                        html: Buffer.concat([...chunks.values()]).toString(
                            'utf8'
                        ),
                    })
                );
                response.once('error', reject);
            }
        );
        request.once('error', reject);
        request.end();
    });
};
export const fetchPreview = async (input: string) => {
    const signal = AbortSignal.timeout(5000);
    const follow = async (
        value: string,
        remaining: number
    ): Promise<string> => {
        const url = previewUrl(value);
        if (!url) return fail('PREVIEW_UNAVAILABLE', 422);
        const response = await page(url, signal);
        if (response.redirect !== undefined) {
            if (remaining === 0) return fail('PREVIEW_UNAVAILABLE', 422);
            return follow(new URL(response.redirect, url).href, remaining - 1);
        }
        return response.html ?? '';
    };
    return follow(input, 2);
};
const plain = (value: string) =>
    value
        .replace(
            /&(?:amp|quot|apos|lt|gt|nbsp);/gu,
            entity =>
                ({
                    '&amp;': '&',
                    '&quot;': '"',
                    '&apos;': "'",
                    '&lt;': '<',
                    '&gt;': '>',
                    '&nbsp;': ' ',
                })[entity] ?? ' '
        )
        .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
        .replace(/\s+/gu, ' ')
        .trim()
        .slice(0, 300);
export const metadata = (html: string, url: string) => ({
    title: plain(
        /<title\b[^>]{0,200}>([^<]{0,1000})<\/title\s*>/iu.exec(html)?.[1] ??
            new URL(url).hostname
    ),
    site: new URL(url).hostname,
});
