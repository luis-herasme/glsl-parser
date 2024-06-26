import generate from './generator.js';
import { renameBindings, renameFunctions, renameTypes } from './utils.js';
import { UNKNOWN_TYPE } from './grammar.js';
import { buildParser, nextWarn } from './test-helpers.js';
var c;
beforeAll(function () { return (c = buildParser()); });
test('scope bindings and type names', function () {
    var ast = c.parseSrc("\nfloat selfref, b = 1.0, c = selfref;\nvec2 texcoord1, texcoord2;\nvec3 position;\nvec4 myRGBA;\nivec2 textureLookup;\nbvec3 less;\nfloat arr1[5] = float[5](3.4, 4.2, 5.0, 5.2, 1.1);\nvec4[2] arr2[3]; \nvec4[3][2] arr3;\nvec3 fnName() {}\nstruct light {\n  float intensity;\n  vec3 position;\n};\ncoherent buffer Block {\n  readonly vec4 member1;\n  vec4 member2;\n};");
    // debugAst(ast);
    expect(Object.keys(ast.scopes[0].bindings)).toEqual([
        'selfref',
        'b',
        'c',
        'texcoord1',
        'texcoord2',
        'position',
        'myRGBA',
        'textureLookup',
        'less',
        'arr1',
        'arr2',
        'arr3',
        'Block',
    ]);
    expect(Object.keys(ast.scopes[0].functions)).toEqual(['fnName']);
    expect(Object.keys(ast.scopes[0].types)).toEqual(['light']);
});
test('scope references', function () {
    var ast = c.parseSrc("\nfloat selfref, b = 1.0, c = selfref;\nmat2x2 myMat = mat2( vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) );\nstruct {\n  float s;\n  float t;\n} structArr[];\nstruct structType {\n  float s;\n  float t;\n};\nstructType z;\n\nfloat protoFn(float x);\n\nfloat shadowed;\nfloat reused;\nfloat unused;\nvoid useMe() {}\nvec3 fnName(float arg1, vec3 arg2) {\n  float shadowed = arg1;\n  structArr[0].x++;\n\n  if(true) {\n    float x = shadowed + 1 + reused;\n  }\n\n  {\n    float compound;\n    compound = shadowed + reused;\n  }\n\n  {\n    float compound;\n    compound = shadowed + reused + compound;\n  }\n  unknown();\n\n  MyStruct dataArray[1] = {\n    {1.0}\n  };\n\n  protoFn(1.0);\n  useMe();\n}", { quiet: true });
    expect(ast.scopes[0].bindings.selfref.references).toHaveLength(2);
    expect(ast.scopes[0].bindings.b.references).toHaveLength(1);
    expect(ast.scopes[0].bindings.c.references).toHaveLength(1);
    expect(ast.scopes[0].bindings.myMat.references).toHaveLength(1);
    expect(ast.scopes[0].bindings.structArr.references).toHaveLength(2);
    expect(ast.scopes[0].bindings.shadowed.references).toHaveLength(1);
    expect(ast.scopes[0].types.structType.references).toHaveLength(2);
    expect(ast.scopes[0].functions.useMe['void: void'].references).toHaveLength(2);
    expect(ast.scopes[2].bindings.arg1.references).toHaveLength(2);
    expect(ast.scopes[2].bindings.arg2.references).toHaveLength(1);
    expect(ast.scopes[2].bindings.shadowed.references).toHaveLength(4);
    // reused - used in inner scope
    expect(ast.scopes[0].bindings.reused.references).toHaveLength(4);
    // compound - used in first innermost scope only
    expect(ast.scopes[4].bindings.compound.references).toHaveLength(2);
    // compound - used in last innermost scope only
    expect(ast.scopes[5].bindings.compound.references).toHaveLength(3);
    expect(ast.scopes[0].functions.unknown['UNKNOWN TYPE: void'].references).toHaveLength(1);
    expect(ast.scopes[0].functions.unknown['UNKNOWN TYPE: void'].declaration).toBe(undefined);
});
test('scope binding declarations', function () {
    var ast = c.parseSrc("\nfloat selfref, b = 1.0, c = selfref;\nvoid main() {\n  selfref += d;\n}", { quiet: true });
    expect(ast.scopes[0].bindings.selfref.references).toHaveLength(3);
    expect(ast.scopes[0].bindings.selfref.declaration).toBeTruthy();
    expect(ast.scopes[0].bindings.b.references).toHaveLength(1);
    expect(ast.scopes[0].bindings.b.declaration).toBeTruthy();
    expect(ast.scopes[0].bindings.c.references).toHaveLength(1);
    expect(ast.scopes[0].bindings.c.declaration).toBeTruthy();
    expect(ast.scopes[1].bindings.d.references).toHaveLength(1);
    expect(ast.scopes[1].bindings.d.declaration).toBeFalsy();
});
test('struct constructor identified in scope', function () {
    var ast = c.parseSrc("\nstruct light {\n  float intensity;\n  vec3 position;\n};\nlight lightVar = light(3.0, vec3(1.0, 2.0, 3.0));\n");
    expect(ast.scopes[0].types.light.references).toHaveLength(3);
});
test('function overloaded scope', function () {
    var ast = c.parseSrc("\nvec4 overloaded(vec4 x) {\n  return x;\n}\nfloat overloaded(float x) {\n  return x;\n}");
    expect(Object.entries(ast.scopes[0].functions.overloaded)).toHaveLength(2);
});
test('overriding glsl builtin function', function () {
    // "noise" is a built-in GLSL function that should be identified and renamed
    var ast = c.parseSrc("\nfloat noise() {}\nfloat fn() {\n    vec2 uv;\n    uv += noise();\n}\n");
    expect(ast.scopes[0].functions.noise);
    renameFunctions(ast.scopes[0], function (name) { return "".concat(name, "_FUNCTION"); });
    expect(generate(ast)).toBe("\nfloat noise_FUNCTION() {}\nfloat fn_FUNCTION() {\n    vec2 uv;\n    uv += noise_FUNCTION();\n}\n");
});
test('rename bindings and functions', function () {
    var ast = c.parseSrc("\nfloat selfref, b = 1.0, c = selfref;\nmat2x2 myMat = mat2( vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) );\nstruct {\n  float s;\n  float t;\n} structArr[];\nstruct structType {\n  float s;\n  float t;\n};\nstructType z;\n\nfloat shadowed;\nfloat reused;\nfloat unused;\nvoid x() {}\nvec3 fnName(float arg1, vec3 arg2) {\n  float shadowed = arg1;\n  float y = x().length();\n  structArr[0].x++;\n\n  if(true) {\n    float x = shadowed + 1 + reused;\n  }\n\n  {\n    float compound;\n    compound = shadowed + reused;\n  }\n\n  {\n    float compound;\n    compound = shadowed + reused + compound;\n  }\n}\nvec4 LinearToLinear( in vec4 value ) {\n  return value;\n}\nvec4 mapTexelToLinear( vec4 value ) { return LinearToLinear( value ); }\nvec4 linearToOutputTexel( vec4 value ) { return LinearToLinear( value ); }\n", { quiet: true });
    renameBindings(ast.scopes[0], function (name) { return "".concat(name, "_VARIABLE"); });
    renameFunctions(ast.scopes[0], function (name) { return "".concat(name, "_FUNCTION"); });
    expect(generate(ast)).toBe("\nfloat selfref_VARIABLE, b_VARIABLE = 1.0, c_VARIABLE = selfref_VARIABLE;\nmat2x2 myMat_VARIABLE = mat2( vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) );\nstruct {\n  float s;\n  float t;\n} structArr_VARIABLE[];\nstruct structType {\n  float s;\n  float t;\n};\nstructType z_VARIABLE;\n\nfloat shadowed_VARIABLE;\nfloat reused_VARIABLE;\nfloat unused_VARIABLE;\nvoid x_FUNCTION() {}\nvec3 fnName_FUNCTION(float arg1, vec3 arg2) {\n  float shadowed = arg1;\n  float y = x_FUNCTION().length();\n  structArr_VARIABLE[0].x++;\n\n  if(true) {\n    float x = shadowed + 1 + reused_VARIABLE;\n  }\n\n  {\n    float compound;\n    compound = shadowed + reused_VARIABLE;\n  }\n\n  {\n    float compound;\n    compound = shadowed + reused_VARIABLE + compound;\n  }\n}\nvec4 LinearToLinear_FUNCTION( in vec4 value ) {\n  return value;\n}\nvec4 mapTexelToLinear_FUNCTION( vec4 value ) { return LinearToLinear_FUNCTION( value ); }\nvec4 linearToOutputTexel_FUNCTION( vec4 value ) { return LinearToLinear_FUNCTION( value ); }\n");
});
test('detecting struct scope and usage', function () {
    var ast = c.parseSrc("\nstruct StructName {\n  vec3 color;\n};\nstruct OtherStruct {\n  StructName inner;\n};\nStructName proto(StructName x, StructName[3]);\n\nsubroutine StructName colorRedBlue();\nsubroutine (colorRedBlue) StructName redColor() {\n  return StructName(1.0, 0.0, 0.0, 1.0);\n}\n\nStructName reflectedLight = StructName(vec3(0.0));\nStructName main(in StructName x, StructName[3] y) {\n  StructName ref = StructName();\n  float a = 1.0 + StructName(1.0).color.x;\n  struct StructName {\n    vec3 color;\n  };\n  StructName ref2 = StructName();\n  float a2 = 1.0 + StructName(1.0).color.x;\n}\n");
    renameTypes(ast.scopes[0], function (name) { return "".concat(name, "_x"); });
    expect(generate(ast)).toBe("\nstruct StructName_x {\n  vec3 color;\n};\nstruct OtherStruct_x {\n  StructName_x inner;\n};\nStructName_x proto(StructName_x x, StructName_x[3]);\n\nsubroutine StructName_x colorRedBlue();\nsubroutine (colorRedBlue) StructName_x redColor() {\n  return StructName_x(1.0, 0.0, 0.0, 1.0);\n}\n\nStructName_x reflectedLight = StructName_x(vec3(0.0));\nStructName_x main(in StructName_x x, StructName_x[3] y) {\n  StructName_x ref = StructName_x();\n  float a = 1.0 + StructName_x(1.0).color.x;\n  struct StructName {\n    vec3 color;\n  };\n  StructName ref2 = StructName();\n  float a2 = 1.0 + StructName(1.0).color.x;\n}\n");
    // Ensure structs aren't added to global function scope since they should be
    // identified as types
    expect(Object.keys(ast.scopes[0].functions)).toEqual([
        'proto',
        'colorRedBlue',
        'redColor',
        'main',
    ]);
    expect(Object.keys(ast.scopes[0].bindings)).toEqual(['reflectedLight']);
    expect(Object.keys(ast.scopes[0].types)).toEqual([
        'StructName',
        'OtherStruct',
    ]);
    expect(ast.scopes[0].types.StructName.references).toHaveLength(16);
    // Inner struct definition should be found in inner fn scope
    expect(Object.keys(ast.scopes[2].types)).toEqual(['StructName']);
});
test('fn args shadowing global scope identified as separate bindings', function () {
    var ast = c.parseSrc("\nattribute vec3 position;\nvec3 func(vec3 position) {\n  return position;\n}");
    renameBindings(ast.scopes[0], function (name) {
        return name === 'position' ? 'renamed' : name;
    });
    // The func arg "position" shadows the global binding, it should be untouched
    expect(generate(ast)).toBe("\nattribute vec3 renamed;\nvec3 func(vec3 position) {\n  return position;\n}");
});
test('I do not yet know what to do with layout()', function () {
    var ast = c.parseSrc("\nlayout(std140,column_major) uniform;\nfloat a;\nuniform Material\n{\nuniform vec2 vProp;\n};");
    // This shouldn't crash - see the comment block in renameBindings()
    renameBindings(ast.scopes[0], function (name) { return "".concat(name, "_x"); });
    expect(generate(ast)).toBe("\nlayout(std140,column_major) uniform;\nfloat a_x;\nuniform Material\n{\nuniform vec2 vProp;\n};");
});
test("(regression) ensure self-referenced variables don't appear as types", function () {
    var ast = c.parseSrc("\nfloat a = 1.0, c = a;\n");
    expect(Object.keys(ast.scopes[0].types)).toEqual([]);
});
test('identifies a declared function with references', function () {
    var ast = c.parseSrc("\nvec4[3] main(float a, vec3 b) {}\nvoid x() {\n  float a = 1.0;\n  float b = 1.0;\n  main(a, b);\n}\n");
    var signature = 'vec4[3]: float, vec3';
    // Should have found no types
    expect(ast.scopes[0].types).toMatchObject({});
    // Should have found one overload signature
    expect(ast.scopes[0].functions).toHaveProperty('main');
    expect(ast.scopes[0].functions.main).toHaveProperty([signature]);
    expect(Object.keys(ast.scopes[0].functions.main)).toHaveLength(1);
    // Should be declared with references
    expect(ast.scopes[0].functions.main[signature].declaration).toBeTruthy();
    expect(ast.scopes[0].functions.main[signature].references).toHaveLength(2);
});
test('does not match function overload with different argument length', function () {
    var ast = c.parseSrc("\nfloat main(float a, float b) {}\nvoid x() {\n  main(a, b, c);\n}\n", { quiet: true });
    var unknownSig = "".concat(UNKNOWN_TYPE, ": ").concat(UNKNOWN_TYPE, ", ").concat(UNKNOWN_TYPE, ", ").concat(UNKNOWN_TYPE);
    var knownSig = "float: float, float";
    // Should have found no types
    expect(ast.scopes[0].types).toMatchObject({});
    // Should have found one overload signature
    expect(ast.scopes[0].functions).toHaveProperty('main');
    expect(ast.scopes[0].functions.main).toHaveProperty(knownSig);
    expect(ast.scopes[0].functions.main).toHaveProperty(unknownSig);
    expect(Object.keys(ast.scopes[0].functions.main)).toHaveLength(2);
    // Declaration should not match bad overload
    expect(ast.scopes[0].functions.main[knownSig].declaration).toBeTruthy();
    expect(ast.scopes[0].functions.main[knownSig].references).toHaveLength(1);
    // Bad call should not match definition
    expect(ast.scopes[0].functions.main[unknownSig].declaration).toBeFalsy();
    expect(ast.scopes[0].functions.main[unknownSig].references).toHaveLength(1);
});
test('handles declared, undeclared, and unknown function cases', function () {
    var ast = c.parseSrc("\n// Prototype for undeclared function\nfloat main(float, float, float[3]);\n\n// Prototype and definition for declared function\nfloat main(float a, float b);\nfloat main(float a, float b) {}\n\nvoid x() {\n  main(a, b);\n  main(a, b, c);\n  main(a, b, c, d);\n}\n", { quiet: true });
    var defSig = "float: float, float";
    var undefSig = "float: float, float, float[3]";
    var unknownSig = "".concat(UNKNOWN_TYPE, ": ").concat(UNKNOWN_TYPE, ", ").concat(UNKNOWN_TYPE, ", ").concat(UNKNOWN_TYPE, ", ").concat(UNKNOWN_TYPE);
    // Should have found no types
    expect(ast.scopes[0].types).toMatchObject({});
    // Should have found 3 overload signatures. One overload for defined, one for
    // undefined, and one for the unknown call
    expect(ast.scopes[0].functions).toHaveProperty('main');
    expect(Object.keys(ast.scopes[0].functions.main)).toHaveLength(3);
    expect(ast.scopes[0].functions.main).toHaveProperty([defSig]);
    expect(ast.scopes[0].functions.main).toHaveProperty([undefSig]);
    expect(ast.scopes[0].functions.main).toHaveProperty([unknownSig]);
    // Defined function has prototype, definition
    expect(ast.scopes[0].functions.main[defSig].declaration).toBeTruthy();
    expect(ast.scopes[0].functions.main[defSig].references).toHaveLength(3);
    // Undeclared call has prototype and call, but no declaration
    expect(ast.scopes[0].functions.main[undefSig].declaration).toBeFalsy();
    expect(ast.scopes[0].functions.main[undefSig].references).toHaveLength(2);
    // Unknown function is hanging out by itself
    expect(ast.scopes[0].functions.main[unknownSig].declaration).toBeFalsy();
    expect(ast.scopes[0].functions.main[unknownSig].references).toHaveLength(1);
});
test('warns on undeclared functions and structs', function () {
    var next = nextWarn();
    c.parseSrc("\nMyStruct x = MyStruct();\nvoid main() {\n  a();\n  a(1);\n  z += 1;\n}\nstruct MyStruct { float y; };\n");
    expect(next()).toContain('undeclared function: "MyStruct"');
    expect(next()).toContain('undeclared type: "MyStruct"');
    expect(next()).toContain('undeclared function: "a"');
    expect(next()).toContain('No matching overload for function: "a"');
    expect(next()).toContain('Encountered undefined variable: "z"');
    expect(next()).toContain('Type "MyStruct" was used before it was declared');
});
test('warns on duplicate declarations', function () {
    var next = nextWarn();
    c.parseSrc("\nstruct MyStruct { float y; };\nstruct MyStruct { float y; };\nfloat dupefloat = 1.0;\nfloat dupefloat = 1.0;\nfloat dupefn(float b);\nfloat dupefn(float);\nvoid dupefn() {}\nvoid dupefn() {}\n");
    expect(next()).toContain('duplicate type declaration: "MyStruct"');
    expect(next()).toContain('duplicate variable declaration: "dupefloat"');
    expect(next()).toContain('duplicate function prototype: "dupefn"');
    expect(next()).toContain('duplicate function definition: "dupefn"');
});
test('undeclared variables are added to the expected scope', function () {
    var ast = c.parseSrc("\nvoid a() {\n  MyStruct x;\n  a();\n}\n", { quiet: true });
    // Function should get added to global scope
    expect(ast.scopes[0].types).toMatchObject({});
    expect(ast.scopes[0].functions).toHaveProperty('a');
    // Struct should get added to inner scope
    expect(ast.scopes[1].types).toHaveProperty('MyStruct');
});
test('postfix is added to scope', function () {
    var ast = c.parseSrc("\nvoid a() {}\nvoid main() {\n  float y = a().xyz;\n  float z = a().length();\n}");
    var a = Object.values(ast.scopes[0].functions.a)[0];
    expect(a.references).toHaveLength(3);
});
