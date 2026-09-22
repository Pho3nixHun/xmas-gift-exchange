import { describe, expect, it } from 'vitest';

import { available, canComplete } from './matching.js';
import type { DrawGraph, Edge } from './matching.js';

const permutations = (
    ids: readonly string[]
): readonly (readonly string[])[] =>
    ids.length
        ? ids.flatMap(id =>
              permutations(ids.filter(other => other !== id)).map(rest => [
                  id,
                  ...rest,
              ])
          )
        : [[]];
const oracle = (graph: DrawGraph) =>
    permutations(graph.people).filter(order =>
        graph.people.every((giverId, i) => {
            const recipientId = order[i];
            return (
                giverId !== recipientId &&
                !graph.exclusions.some(
                    edge =>
                        edge.giverId === giverId &&
                        edge.recipientId === recipientId
                ) &&
                graph.assignments.every(
                    edge =>
                        edge.giverId !== giverId ||
                        edge.recipientId === recipientId
                )
            );
        })
    );
describe('concealed draw feasibility', () => {
    it('matches every four-person exclusion graph against a permutation oracle', () => {
        const people = ['A', 'B', 'C', 'D'];
        const edges = people.flatMap(giverId =>
            people
                .filter(id => id !== giverId)
                .map(recipientId => ({ giverId, recipientId }))
        );
        Array.from({ length: 2 ** edges.length }, (_, mask) => {
            const exclusions = edges.filter((_, i) => (mask & (1 << i)) !== 0);
            const graph = { people, exclusions, assignments: [] };
            const completions = oracle(graph);
            expect(canComplete(graph)).toBe(completions.length > 0);
            edges.forEach(candidate =>
                expect(available(graph, candidate)).toBe(
                    completions.some(
                        order =>
                            order[people.indexOf(candidate.giverId)] ===
                            candidate.recipientId
                    )
                )
            );
        });
    });
    it('preserves a completion after every accepted prefix through thirty people', () => {
        const people = Array.from({ length: 30 }, (_, i) => String(i));
        const assignments = people.reduce<readonly Edge[]>((saved, giverId) => {
            const graph = { people, exclusions: [], assignments: saved };
            const recipientId = [...people]
                .reverse()
                .find(id => available(graph, { giverId, recipientId: id }));
            expect(recipientId).toBeDefined();
            return recipientId ? [...saved, { giverId, recipientId }] : saved;
        }, []);
        expect(new Set(assignments.map(edge => edge.recipientId)).size).toBe(
            30
        );
    });
    it('reserves a sole remaining recipient and rejects competing singletons', () => {
        const graph = {
            people: ['A', 'B', 'C'],
            exclusions: [{ giverId: 'C', recipientId: 'A' }],
            assignments: [],
        };
        expect(available(graph, { giverId: 'A', recipientId: 'B' })).toBe(
            false
        );
        expect(available(graph, { giverId: 'A', recipientId: 'C' })).toBe(true);
        expect(
            canComplete({
                ...graph,
                exclusions: [
                    ...graph.exclusions,
                    { giverId: 'A', recipientId: 'C' },
                ],
            })
        ).toBe(false);
    });
});
