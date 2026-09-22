export interface WishInput {
    readonly description: string;
    readonly url: string;
    readonly priority: 'low' | 'medium' | 'high';
}
export const emptyWish = (): WishInput => ({
    description: '',
    url: '',
    priority: 'medium',
});
