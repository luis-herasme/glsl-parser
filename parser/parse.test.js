import { visit } from '../ast/index.js';
import { buildParser } from './test-helpers.js';
var c;
beforeAll(function () { return (c = buildParser()); });
test('parse error', function () {
    var error;
    // Missing a semicolon
    var text = "float a\nfloat b";
    try {
        c.parse(text);
    }
    catch (e) {
        error = e;
    }
    expect(error).toBeInstanceOf(c.parser.SyntaxError);
    expect(error.location.start.line).toBe(2);
    expect(error.location.end.line).toBe(2);
});
test('declarations', function () {
    c.expectParsedProgram("\n    float a, b = 1.0, c = a;\n    vec2 texcoord1, texcoord2;\n    vec3 position;\n    vec4 myRGBA;\n    ivec2 textureLookup;\n    bvec3 less;\n  ");
});
test('headers', function () {
    // The following includes the varying/attribute case which only works in GL
    // ES 1.00, and will need to be updated when the switch is implemented
    c.expectParsedProgram("\n    precision mediump float;\n    precision highp int;\n\n    in vec4 varName1;\n    out vec4 varName2;\n\n    varying vec4 varName3, blarName;\n    uniform vec4 varName4;\n    attribute vec4 varName5;\n  ");
});
test('if statement', function () {
    c.expectParsedStatement("if(i != 0) { aFunction(); }\nelse if(i == 2) { bFunction(); }\nelse { cFunction(); }", {
        quiet: true,
    });
});
test('do while loop', function () {
    c.expectParsedStatement("\n    do {\n      aFunction();\n      break;\n      continue;\n      return;\n    } while(i <= 99);\n  ", { quiet: true });
});
test('standard while loop', function () {
    c.expectParsedStatement("\n    while(i <= 99) {\n      aFunction();\n      break;\n      continue;\n      return;\n    }\n  ", { quiet: true });
});
test('for loops', function () {
    // Infinite for loop
    c.expectParsedStatement("\n    for(;;) {\n    }\n  ");
    // For loop with jump statements
    c.expectParsedStatement("\n    for(int a = 0; b <= 99; c++) {\n      break;\n      continue;\n      return;\n      aFunction();\n    }\n  ", { quiet: true });
    // Loop with condition variable declaration (GLSL ES 3.00 only)
    c.expectParsedStatement("\n    for(int i = 0; bool x = false; i++) {}\n  ");
});
test('switch error', function () {
    // Test the semantic analysis case
    expect(function () {
        return c.parse("void main() {\n    switch (easingId) {\n      result = cubicIn();\n    }\n}", { quiet: true });
    }).toThrow(/must start with a case or default label/);
});
test('switch statement', function () {
    c.expectParsedStatement("\n    switch (easingId) {\n      case 0:\n          result = cubicIn();\n          break;\n      case 1:\n          result = cubicOut();\n          break;\n      default:\n          result = 1.0;\n      }\n  ", { quiet: true });
});
test('qualifier declarations', function () {
    // The expected node here is "qualifier_declarator", which would be nice to
    // test for at some point, maybe when doing more AST analysis
    c.expectParsedProgram("\n    invariant precise in a, b,c;\n  ");
});
test('number notations', function () {
    // Integer hex notation
    c.expectParsedStatement("highp uint value = 0x1234u;");
    c.expectParsedStatement("uint c = 0xffffffff;");
    c.expectParsedStatement("uint d = 0xffffffffU;");
    // Octal
    c.expectParsedStatement("uint d = 021234;");
    // Double precision floating point
    c.expectParsedStatement("double c, d = 2.0LF;");
    // uint
    c.expectParsedStatement("uint k = 3u;");
    c.expectParsedStatement("uint f = -1u;");
});
test('layout', function () {
    c.expectParsedProgram(" \n    layout(location = 4, component = 2) in vec2 a;\n    layout(location = 3) in vec4 normal1;\n    layout(location = 9) in mat4 transforms[2];\n    layout(location = 3) in vec4 normal2;\n\n    const int start = 6;\n    layout(location = start + 2) in vec4 p;\n\n    layout(location = 3) in struct S\n    {\n      vec3 a; // gets location 3\n      mat2 b; // gets locations 4 and 5\n      vec4 c[2]; // gets locations 6 and 7\n      layout(location = 8) vec2 A; // ERROR, can't use on struct member\n    } s;\n\n    layout(location = 4) in block\n    {\n      vec4 d; // gets location 4\n      vec4 e; // gets location 5\n      layout(location = 7) vec4 f; // gets location 7\n      vec4 g; // gets location 8\n      layout(location = 1) vec4 h; // gets location 1\n      vec4 i; // gets location 2\n      vec4 j; // gets location 3\n      vec4 k; // ERROR, location 4 already used\n    };\n\n    // From the grammar but I think it's a typo\n    // https://github.com/KhronosGroup/GLSL/issues/161\n    // layout(location = start + 2) int vec4 p;\n\n    layout(std140,column_major) uniform;\n  ");
});
test('parses comments', function () {
    c.expectParsedProgram("\n    /* starting comment */\n    // hi\n    void main(float x) {\n      /* comment */// hi\n      /* comment */ // hi\n      statement(); // hi\n      /* start */ statement(); /* end */\n    }\n  ", { quiet: true });
});
test('parses functions', function () {
    c.expectParsedProgram("\n    // Prototypes\n    vec4 f(in vec4 x, out vec4 y);\n    int newFunction(in bvec4 aBvec4,   // read-only\n      out vec3 aVec3,                  // write-only\n      inout int aInt);                 // read-write\n    highp float rand( const in vec2 uv ) {}\n    highp float otherFn( const in vec3 rectCoords[ 4 ]  ) {}\n  ");
});
test('parses function_call . postfix_expression', function () {
    c.expectParsedStatement('texture().rgb;', { quiet: true });
});
test('parses postfix_expression as function_identifier', function () {
    c.expectParsedStatement('a().length();', { quiet: true });
});
test('parses postfix expressions after non-function calls (aka map.length())', function () {
    c.expectParsedProgram("\nvoid main() {\n  float y = x().length();\n  float x = map.length();\n  for (int i = 0; i < map.length(); i++) {\n  }\n}\n", { quiet: true });
});
test('postfix, unary, binary expressions', function () {
    c.expectParsedStatement('x ++ + 1.0 + + 2.0;', { quiet: true });
});
test('operators', function () {
    c.expectParsedStatement('1 || 2 && 2 ^^ 3 >> 4 << 5;');
});
test('declaration', function () {
    c.expectParsedStatement('const float x = 1.0, y = 2.0;');
});
test('assignment', function () {
    c.expectParsedStatement('x |= 1.0;', { quiet: true });
});
test('ternary', function () {
    c.expectParsedStatement('float y = x == 1.0 ? x == 2.0 ? 1.0 : 3.0 : x == 3.0 ? 4.0 : 5.0;', { quiet: true });
});
test('structs', function () {
    c.expectParsedProgram("\n    struct light {\n      float intensity;\n      vec3 position, color;\n    } lightVar;\n    light lightVar2;\n\n    struct S { float f; };\n  ");
});
test('buffer variables', function () {
    c.expectParsedProgram("\n    buffer b {\n      float u[];\n      vec4 v[];\n    } name[3]; \n  ");
});
test('arrays', function () {
    c.expectParsedProgram("\n    float frequencies[3];\n    uniform vec4 lightPosition[4];\n    struct light { int a; };\n    light lights[];\n    const int numLights = 2;\n    light lights2[numLights];\n\n    buffer b {\n      float u[]; \n      vec4 v[];\n    } name[3];\n\n    // Array initializers\n    float array[3] = float[3](1.0, 2.0, 3.0);\n    float array2[3] = float[](1.0, 2.0, 3.0);\n\n    // Function with array as return type\n    float[5] foo() { }\n  ");
});
test('initializer list', function () {
    c.expectParsedProgram("\n    vec4 a[3][2] = {\n      vec4[2](vec4(0.0), vec4(1.0)),\n      vec4[2](vec4(0.0), vec4(1.0)),\n      vec4[2](vec4(0.0), vec4(1.0))\n    };\n  ");
});
test('subroutines', function () {
    c.expectParsedProgram("\n    subroutine vec4 colorRedBlue();\n\n    // option 1\n    subroutine (colorRedBlue ) vec4 redColor() {\n        return vec4(1.0, 0.0, 0.0, 1.0);\n    }\n\n    // // option 2\n    subroutine (colorRedBlue ) vec4 blueColor() {\n        return vec4(0.0, 0.0, 1.0, 1.0);\n    }\n  ");
});
test('Locations with location disabled', function () {
    var src = "void main() {}";
    var ast = c.parseSrc(src); // default argument is no location information
    expect(ast.program[0].location).toBe(undefined);
    expect(ast.scopes[0].location).toBe(undefined);
});
test('built-in function names should be identified as keywords', function () {
    console.warn = jest.fn();
    var src = "\nvoid main() {\n  void x = texture2D();\n}";
    var ast = c.parseSrc(src);
    // Built-ins should not appear in scope
    expect(ast.scopes[0].functions).not.toHaveProperty('texture2D');
    expect(ast.scopes[1].functions).not.toHaveProperty('texture2D');
    var call;
    visit(ast, {
        function_call: {
            enter: function (path) {
                call = path.node;
            },
        },
    });
    // Builtins like texture2D should be recognized as a identifier since that's
    // how user defined functions are treated
    expect(call.identifier.type).toBe('identifier');
    // Should not warn about built in function call being undefined
    expect(console.warn).not.toHaveBeenCalled();
});
test('Parser locations', function () {
    var src = "// Some comment\nvoid main() {\n  float x = 1.0;\n\n  {\n    float x = 1.0;\n  }\n}";
    var ast = c.parseSrc(src, { includeLocation: true });
    // The main fn location should start at "void"
    expect(ast.program[0].location).toStrictEqual({
        start: { line: 2, column: 1, offset: 16 },
        end: { line: 8, column: 2, offset: 76 },
    });
    // The global scope is the entire program
    expect(ast.scopes[0].location).toStrictEqual({
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 8, column: 2, offset: 76 },
    });
    // The scope created by the main fn should start at the open paren of the fn
    // header, because fn scopes include fn arguments
    expect(ast.scopes[1].location).toStrictEqual({
        start: { line: 2, column: 10, offset: 25 },
        end: { line: 8, column: 1, offset: 75 },
    });
    // The inner compound statement { scope }
    expect(ast.scopes[2].location).toStrictEqual({
        start: { line: 5, column: 3, offset: 50 },
        end: { line: 7, column: 3, offset: 73 },
    });
});
test('fails on error', function () {
    expect(function () {
        return c.parse("float a;\n      float a;", { failOnWarn: true });
    }).toThrow(/duplicate variable declaration: "a"/);
});
