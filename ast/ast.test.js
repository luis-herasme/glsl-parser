import { visit } from './visit.js';
var literal = function (literal) { return ({
    type: 'literal',
    literal: literal,
    whitespace: '',
}); };
var identifier = function (identifier) { return ({
    type: 'identifier',
    identifier: identifier,
    whitespace: '',
}); };
test('visit()', function () {
    var tree = {
        type: 'binary',
        operator: literal('-'),
        // mock location data
        location: {
            start: { line: 0, column: 0, offset: 0 },
            end: { line: 0, column: 0, offset: 0 },
        },
        left: {
            type: 'binary',
            operator: literal('+'),
            left: identifier('foo'),
            right: identifier('bar'),
        },
        right: {
            type: 'group',
            lp: literal('('),
            rp: literal(')'),
            expression: identifier('baz'),
        },
    };
    var grandparent;
    var parent;
    var unfound;
    visit(tree, {
        identifier: {
            enter: function (path) {
                var _a, _b, _c;
                var node = path.node;
                if (node.identifier === 'foo') {
                    grandparent = (_a = path.findParent(function (_a) {
                        var node = _a.node;
                        return node.operator.literal === '-';
                    })) === null || _a === void 0 ? void 0 : _a.node;
                    parent = (_b = path.findParent(function (_a) {
                        var node = _a.node;
                        return node.operator.literal === '+';
                    })) === null || _b === void 0 ? void 0 : _b.node;
                    unfound = (_c = path.findParent(function (_a) {
                        var node = _a.node;
                        return node.operator.literal === '*';
                    })) === null || _c === void 0 ? void 0 : _c.node;
                }
            },
        },
    });
    expect(grandparent).not.toBeNull();
    expect(grandparent === null || grandparent === void 0 ? void 0 : grandparent.type).toBe('binary');
    expect(parent).not.toBeNull();
    expect(parent === null || parent === void 0 ? void 0 : parent.type).toBe('binary');
    expect(unfound).not.toBeDefined();
});
