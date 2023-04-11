"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Program = exports.AbstractProgram = void 0;
var utils_1 = require("../../../../utils");
var utils_2 = require("../../shaders/utils");
var SIZE_FACTOR_PER_ATTRIBUTE_TYPE = (_a = {},
    _a[WebGL2RenderingContext.BOOL] = 1,
    _a[WebGL2RenderingContext.BYTE] = 1,
    _a[WebGL2RenderingContext.UNSIGNED_BYTE] = 1,
    _a[WebGL2RenderingContext.SHORT] = 2,
    _a[WebGL2RenderingContext.UNSIGNED_SHORT] = 2,
    _a[WebGL2RenderingContext.INT] = 4,
    _a[WebGL2RenderingContext.UNSIGNED_INT] = 4,
    _a[WebGL2RenderingContext.FLOAT] = 4,
    _a);
var AbstractProgram = /** @class */ (function () {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    function AbstractProgram(_gl, _renderer) {
    }
    return AbstractProgram;
}());
exports.AbstractProgram = AbstractProgram;
var Program = /** @class */ (function () {
    function Program(gl, renderer) {
        var _this = this;
        this.array = new Float32Array();
        this.indicesArray = null;
        this.uniformLocations = {};
        this.attributeLocations = {};
        this.capacity = 0;
        this.verticesCount = 0;
        // Reading program definition
        var definition = this.getDefinition();
        this.VERTICES = definition.VERTICES;
        this.ARRAY_ITEMS_PER_VERTEX = definition.ARRAY_ITEMS_PER_VERTEX;
        this.VERTEX_SHADER_SOURCE = definition.VERTEX_SHADER_SOURCE;
        this.FRAGMENT_SHADER_SOURCE = definition.FRAGMENT_SHADER_SOURCE;
        this.UNIFORMS = definition.UNIFORMS;
        this.ATTRIBUTES = definition.ATTRIBUTES;
        // Computing stride
        this.STRIDE = this.VERTICES * this.ARRAY_ITEMS_PER_VERTEX;
        // Members
        this.gl = gl;
        this.renderer = renderer;
        // Webgl buffers
        var buffer = gl.createBuffer();
        if (buffer === null)
            throw new Error("Program: error while creating the webgl buffer.");
        this.buffer = buffer;
        var indicesBuffer = gl.createBuffer();
        if (indicesBuffer === null)
            throw new Error("Program: error while creating the webgl indices buffer.");
        this.indicesBuffer = indicesBuffer;
        // Shaders and program
        this.vertexShader = (0, utils_2.loadVertexShader)(this.gl, this.VERTEX_SHADER_SOURCE);
        this.fragmentShader = (0, utils_2.loadFragmentShader)(this.gl, this.FRAGMENT_SHADER_SOURCE);
        this.program = (0, utils_2.loadProgram)(this.gl, [this.vertexShader, this.fragmentShader]);
        // Indices
        this.canUse32BitsIndices = (0, utils_1.canUse32BitsIndices)(this.gl);
        this.indicesType = this.canUse32BitsIndices ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
        this.IndicesArray = this.canUse32BitsIndices ? Uint32Array : Uint16Array;
        // Initializing locations
        this.UNIFORMS.forEach(function (uniformName) {
            var location = _this.gl.getUniformLocation(_this.program, uniformName);
            if (location === null)
                throw new Error("Program: error while getting location for uniform \"".concat(uniformName, "\"."));
            _this.uniformLocations[uniformName] = location;
        });
        this.ATTRIBUTES.forEach(function (attr) {
            var location = _this.gl.getAttribLocation(_this.program, attr.name);
            if (location === -1)
                throw new Error("Program: error while getting location for attribute \"".concat(attr.name, "\"."));
            _this.attributeLocations[attr.name] = location;
        });
    }
    Program.prototype.bind = function () {
        var _this = this;
        var gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        if (this.indicesArray) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);
        }
        for (var attributeName in this.attributeLocations) {
            gl.enableVertexAttribArray(this.attributeLocations[attributeName]);
        }
        var offset = 0;
        this.ATTRIBUTES.forEach(function (attr) {
            var location = _this.attributeLocations[attr.name];
            gl.vertexAttribPointer(location, attr.size, attr.type, attr.normalized || false, _this.ARRAY_ITEMS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, offset);
            var sizeFactor = SIZE_FACTOR_PER_ATTRIBUTE_TYPE[attr.type];
            if (typeof sizeFactor !== "number")
                throw new Error("Program.bind: yet unsupported attribute type \"".concat(attr.type, "\"!"));
            offset += attr.size * sizeFactor;
        });
    };
    Program.prototype.bufferData = function () {
        var gl = this.gl;
        this.gl.bufferData(gl.ARRAY_BUFFER, this.array, gl.DYNAMIC_DRAW);
        if (this.indicesArray) {
            this.gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indicesArray, gl.STATIC_DRAW);
        }
    };
    // NOTE: implementing `reallocateIndices` is optional
    Program.prototype.reallocateIndices = function () {
        return;
    };
    Program.prototype.reallocate = function (capacity) {
        // If desired capacity has not changed we do nothing
        // NOTE: it's possible here to implement more subtle reallocation schemes
        // when the number of rendered items increase or decrease
        if (capacity === this.capacity)
            return;
        this.capacity = capacity;
        this.verticesCount = this.VERTICES * capacity;
        this.array = new Float32Array(this.verticesCount * this.ARRAY_ITEMS_PER_VERTEX);
        if (typeof this.reallocateIndices === "function")
            this.reallocateIndices();
    };
    Program.prototype.hasNothingToRender = function () {
        return this.verticesCount === 0;
    };
    Program.prototype.render = function (params) {
        if (this.hasNothingToRender())
            return;
        this.bind();
        this.bufferData();
        this.gl.useProgram(this.program);
        this.draw(params);
    };
    return Program;
}());
exports.Program = Program;
