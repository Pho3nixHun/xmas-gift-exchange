export type HouseStage =
    | 'outside'
    | 'door'
    | 'room'
    | 'tree'
    | 'desk'
    | 'letters'
    | 'notes'
    | 'recipient';
export type HouseAction =
    | HouseStage
    | 'sofa'
    | 'cat'
    | 'cookie'
    | 'ornament'
    | 'bell'
    | 'star'
    | 'lights';
export interface SceneCommand {
    readonly action: HouseAction;
    readonly index?: number;
    readonly revision: number;
}
export interface OrnamentView {
    readonly color: 'red' | 'purple' | 'blue' | 'gold';
    readonly available: boolean;
}
export const readingPaper = (stage: HouseStage) =>
    ['desk', 'recipient', 'notes'].includes(stage);
