export interface Note {
    readonly id: string;
    readonly ownerId: string;
    readonly description: string;
    readonly url: string;
    readonly priority: 'low' | 'medium' | 'high';
    readonly contentVersion: number;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly canEdit: boolean;
    readonly canDelete: boolean;
    readonly claimState?: 'available' | 'mine' | 'claimed';
}
