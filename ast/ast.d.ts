import type { AstNode, Program } from './ast-types.js';
type NodeGenerator<NodeType> = (node: NodeType) => string;
export type NodeGenerators = {
    [NodeType in AstNode['type']]: NodeGenerator<Extract<AstNode, {
        type: NodeType;
    }>>;
} & {
    program?: NodeGenerator<Program>;
};
export type Generator = (ast: Program | AstNode | AstNode[] | string | string[] | undefined | null) => string;
/**
 * Stringify an AST
 */
export declare const makeGenerator: (generators: NodeGenerators) => Generator;
export type EveryOtherGenerator = (nodes: AstNode[], eo: AstNode[]) => string;
export declare const makeEveryOtherGenerator: (generate: Generator) => EveryOtherGenerator;
export {};
