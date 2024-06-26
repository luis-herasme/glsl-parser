/**
 * Helper functions used by preprocessor-grammar.pegjs. Also re-exports
 * functions from other files used in the grammar.
 */
import { AstNode, LocationInfo, LocationObject, FunctionPrototypeNode, LiteralNode, FunctionNode, FunctionCallNode, TypeNameNode, FullySpecifiedTypeNode, TypeSpecifierNode } from '../ast/index.js';
import { ParserOptions } from './parser.js';
import { Scope, findGlobalScope, findOverloadDefinition, findTypeScope, functionDeclarationSignature, functionUseSignature, newOverloadIndex, isDeclaredFunction, isDeclaredType } from './scope.js';
export { Scope, findGlobalScope, findOverloadDefinition, findTypeScope, functionDeclarationSignature, functionUseSignature, newOverloadIndex, isDeclaredFunction, isDeclaredType, };
export declare const UNKNOWN_TYPE = "UNKNOWN TYPE";
type Text = () => string;
type Location = () => LocationObject;
type Context = {
    text: Text;
    location: Location;
    options: ParserOptions;
    scope: Scope;
    scopes: Scope[];
};
export type PartialNode = {
    partial: any;
};
export declare const partial: (typeNameOrAttrs: string | object, attrs: object) => {
    partial: string | object;
};
export declare const xnil: (...args: any[]) => any[];
export declare const toText: (...args: any[]) => string;
export declare const ifOnly: (arr: any[]) => any;
export declare const collapse: (...args: any[]) => any;
export declare const leftAssociate: (head: AstNode, ...tail: [[LiteralNode, AstNode]][]) => AstNode;
export declare const builtIns: Set<string>;
/**
 * Uses a closure to provide Peggyjs-parser-execution-aware context
 */
export declare const makeLocals: (context: Context) => {
    getLocation: (loc?: LocationObject) => {
        start: LocationInfo;
        end: LocationInfo;
    } | undefined;
    node: (type: AstNode['type'], attrs: any) => AstNode;
    makeScope: (name: string, parent?: Scope, startLocation?: LocationObject) => Scope;
    warn: (message: string) => void;
    pushScope: (scope: Scope) => Scope;
    popScope: (scope: Scope) => Scope;
    setScopeEnd: (scope: Scope, end: LocationInfo) => void;
    createFunctionDefinition: (scope: Scope, name: string, fnRef: FunctionNode) => void;
    addFunctionCallReference: (scope: Scope, name: string, fnRef: FunctionCallNode) => void;
    createFunctionPrototype: (scope: Scope, name: string, fnRef: FunctionPrototypeNode) => void;
    groupCases: (statements: (AstNode | PartialNode)[]) => AstNode[];
    addTypeReference: (scope: Scope, name: string, reference: TypeNameNode) => void;
    addTypeIfFound: (scope: Scope, node: FullySpecifiedTypeNode | TypeSpecifierNode) => void;
    createType: (scope: Scope, name: string, declaration: TypeNameNode) => void;
    createBindings: (scope: Scope, ...bindings: [string, AstNode][]) => void;
    addOrCreateBindingReference: (scope: Scope, name: string, reference: AstNode) => void;
};
