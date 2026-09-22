export interface Edge {
    readonly giverId: string;
    readonly recipientId: string;
}
export interface DrawGraph {
    readonly people: readonly string[];
    readonly exclusions: readonly Edge[];
    readonly assignments: readonly Edge[];
}

export const legal = (graph: DrawGraph, giver: string, recipient: string) =>
    giver !== recipient &&
    !graph.exclusions.some(
        edge => edge.giverId === giver && edge.recipientId === recipient
    );

// The map is a temporary matching witness, never an assignment or a wire DTO.
const augment = (
    giver: string,
    candidates: ReadonlyMap<string, readonly string[]>,
    matched: ReadonlyMap<string, string>,
    visited: Set<string>
): ReadonlyMap<string, string> | undefined => {
    const attempt = (
        remaining: readonly string[]
    ): ReadonlyMap<string, string> | undefined => {
        const [recipient, ...rest] = remaining;
        if (!recipient) return undefined;
        if (visited.has(recipient)) return attempt(rest);
        visited.add(recipient);
        const previous = matched.get(recipient);
        const moved = previous
            ? augment(previous, candidates, matched, visited)
            : matched;
        return moved ? new Map([...moved, [recipient, giver]]) : attempt(rest);
    };
    return attempt(candidates.get(giver) ?? []);
};

export const canComplete = (graph: DrawGraph): boolean => {
    const givers = graph.people.filter(
        id => !graph.assignments.some(edge => edge.giverId === id)
    );
    const recipients = graph.people.filter(
        id => !graph.assignments.some(edge => edge.recipientId === id)
    );
    if (givers.length !== recipients.length) return false;
    const candidates = new Map(
        givers.map(giver => [
            giver,
            recipients.filter(recipient => legal(graph, giver, recipient)),
        ])
    );
    const witness = givers.reduce<ReadonlyMap<string, string> | undefined>(
        (matched, giver) =>
            matched
                ? augment(giver, candidates, matched, new Set())
                : undefined,
        new Map()
    );
    return witness !== undefined;
};

export const available = (graph: DrawGraph, candidate: Edge): boolean =>
    graph.people.includes(candidate.giverId) &&
    graph.people.includes(candidate.recipientId) &&
    legal(graph, candidate.giverId, candidate.recipientId) &&
    !graph.assignments.some(
        edge =>
            edge.giverId === candidate.giverId ||
            edge.recipientId === candidate.recipientId
    ) &&
    canComplete({ ...graph, assignments: [...graph.assignments, candidate] });
