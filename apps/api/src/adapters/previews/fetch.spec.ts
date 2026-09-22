import { describe, expect, it } from 'vitest';

import { metadata, previewUrl, publicAddress } from './fetch.js';

describe('preview egress boundary', () => {
    it('blocks internal, mapped, multicast and documentation addresses', () => {
        [
            '127.0.0.1',
            '10.1.1.1',
            '169.254.169.254',
            '192.168.0.1',
            '100.64.1.1',
            '198.18.0.1',
            '224.1.1.1',
            '::1',
            '::ffff:127.0.0.1',
            'fc00::1',
            'fe80::1',
            '2001:db8::1',
            '2002:7f00:1::',
            '3fff::1',
        ].forEach(address => expect(publicAddress(address)).toBe(false));
        expect(publicAddress('8.8.8.8')).toBe(true);
        expect(publicAddress('2606:4700:4700::1111')).toBe(true);
    });
    it('rejects alternate IP spellings, userinfo, local hosts and custom ports', () => {
        [
            'http://2130706433',
            'http://0x7f000001',
            'http://[::ffff:127.0.0.1]',
            'http://user:pass@example.com',
            'http://localhost',
            'http://host.local',
            'https://example.com:8443',
            'file:///etc/passwd',
        ].forEach(url => expect(previewUrl(url)).toBeNull());
        expect(previewUrl('https://example.com/product#section')?.href).toBe(
            'https://example.com/product'
        );
    });
    it('returns bounded plain text without active markup', () => {
        expect(
            metadata(
                '<title>Tea &amp; biscuits</title><script>bad()</script>',
                'https://example.com/item'
            )
        ).toEqual({ title: 'Tea & biscuits', site: 'example.com' });
    });
});
