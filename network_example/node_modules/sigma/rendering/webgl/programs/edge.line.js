"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("../../../utils");
var edge_1 = require("./common/edge");
var edge_line_vert_glsl_1 = __importDefault(require("../shaders/edge.line.vert.glsl.js"));
var edge_line_frag_glsl_1 = __importDefault(require("../shaders/edge.line.frag.glsl.js"));
var UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE, FLOAT = WebGLRenderingContext.FLOAT;
var UNIFORMS = ["u_matrix"];
var EdgeLineProgram = /** @class */ (function (_super) {
    __extends(EdgeLineProgram, _super);
    function EdgeLineProgram() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    EdgeLineProgram.prototype.getDefinition = function () {
        return {
            VERTICES: 2,
            ARRAY_ITEMS_PER_VERTEX: 3,
            VERTEX_SHADER_SOURCE: edge_line_vert_glsl_1.default,
            FRAGMENT_SHADER_SOURCE: edge_line_frag_glsl_1.default,
            UNIFORMS: UNIFORMS,
            ATTRIBUTES: [
                { name: "a_position", size: 2, type: FLOAT },
                { name: "a_color", size: 4, type: UNSIGNED_BYTE, normalized: true },
            ],
        };
    };
    EdgeLineProgram.prototype.processVisibleItem = function (i, sourceData, targetData, data) {
        var array = this.array;
        var x1 = sourceData.x;
        var y1 = sourceData.y;
        var x2 = targetData.x;
        var y2 = targetData.y;
        var color = (0, utils_1.floatColor)(data.color);
        // First point
        array[i++] = x1;
        array[i++] = y1;
        array[i++] = color;
        // Second point
        array[i++] = x2;
        array[i++] = y2;
        array[i] = color;
    };
    EdgeLineProgram.prototype.draw = function (params) {
        var gl = this.gl;
        var u_matrix = this.uniformLocations.u_matrix;
        gl.uniformMatrix3fv(u_matrix, false, params.matrix);
        gl.drawArrays(gl.LINES, 0, this.verticesCount);
    };
    return EdgeLineProgram;
}(edge_1.EdgeProgram));
exports.default = EdgeLineProgram;
