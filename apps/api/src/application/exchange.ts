export * from '@winter/contracts/exchange';
export { wishDraftSchema } from '@winter/contracts';

export type Role = 'participant' | 'organiser';
// The route table and the handler table are written in different files, so
// naming the operations here is what keeps them in step: an unknown name is
// rejected at the routes and a missing handler is rejected at the service.
// `revision` deliberately has no route; only the event stream reads it.
export type ReadOperation =
    | 'me'
    | 'assignment'
    | 'pool'
    | 'people'
    | 'wishes'
    | 'setup'
    | 'revision';
export type MutationOperation =
    | 'draw'
    | 'setup'
    | 'validate'
    | 'open'
    | 'reset'
    | 'create-wish'
    | 'edit-wish'
    | 'delete-wish'
    | 'claim'
    | 'release';
export interface ActorRequest {
    readonly token: string;
    readonly role: Role;
    readonly csrf?: string;
}
export interface Command extends ActorRequest {
    readonly operation: MutationOperation;
    readonly input: unknown;
    readonly target?: string;
    readonly key: string;
}
export interface ReadRequest extends ActorRequest {
    readonly operation: ReadOperation;
    readonly target?: string;
    readonly cursor?: string;
}
export interface Outcome {
    readonly status: number;
    readonly body: Readonly<Record<string, unknown>>;
    readonly token?: string;
}
export interface AuthRequest {
    readonly role: Role;
    readonly enrol: boolean;
    readonly input: unknown;
}
export interface ExchangeService {
    readonly preview: (
        request: ActorRequest,
        input: unknown
    ) => Promise<Outcome>;
    readonly readPreview: (
        request: ActorRequest,
        id: string
    ) => Promise<Outcome>;
    readonly bootstrap: () => Promise<Outcome>;
    readonly authenticate: (request: AuthRequest) => Promise<Outcome>;
    readonly recover: (input: unknown) => Promise<Outcome>;
    readonly read: (request: ReadRequest) => Promise<Outcome>;
    readonly mutate: (request: Command) => Promise<Outcome>;
    readonly logout: (request: ActorRequest) => Promise<Outcome>;
    readonly reauthenticate: (
        request: ActorRequest,
        input: unknown
    ) => Promise<Outcome>;
    readonly issueRecovery: (
        request: ActorRequest,
        input: unknown,
        target: string
    ) => Promise<Outcome>;
}
