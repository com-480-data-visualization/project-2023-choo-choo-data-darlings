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
var edge_triangle_vert_glsl_1 = __importDefault(require("../shaders/edge.triangle.vert.glsl.js"));
var edge_triangle_frag_glsl_1 = __importDefault(require("../shaders/edge.triangle.frag.glsl.js"));
var UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE, FLOAT = WebGLRenderingContext.FLOAT;
var UNIFORMS = ["u_matrix", "u_sizeRatio", "u_correctionRatio"];
var EdgeTriangleProgram = /** @class */ (function (_super) {
    __extends(EdgeTriangleProgram, _super);
    function EdgeTriangleProgram() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    EdgeTriangleProgram.prototype.getDefinition = function () {
        return {
            VERTICES: 3,
            ARRAY_ITEMS_PER_VERTEX: 5,
            VERTEX_SHADER_SOURCE: edge_triangle_vert_glsl_1.default,
            FRAGMENT_SHADER_SOURCE: edge_triangle_frag_glsl_1.default,
            UNIFORMS: UNIFORMS,
            ATTRIBUTES: [
                { name: "a_position", size: 2, type: FLOAT },
                { name: "a_normal", size: 2, type: FLOAT },
                { name: "a_color", size: 4, type: UNSIGNED_BYTE, normalized: true },
            ],
        };
    };
    EdgeTriangleProgram.prototype.processVisibleItem = function (i, sourceData, targetData, data) {
        var thickness = data.size || 1;
        var x1 = sourceData.x;
        var y1 = sourceData.y;
        var x2 = targetData.x;
        var y2 = targetData.y;
        var color = (0, utils_1.floatColor)(data.color);
        // Computing normals
        var dx = x2 - x1;
        var dy = y2 - y1;
        var len = dx * dx + dy * dy;
        var n1 = 0;
        var n2 = 0;
        if (len) {
            len = 1 / Math.sqrt(len);
            n1 = -dy * len * thickness;
            n2 = dx * len * thickness;
        }
        var array = this.array;
        // First point
        array[i++] = x1;
        array[i++] = y1;
        array[i++] = n1;
        array[i++] = n2;
        array[i++] = color;
        array[i++] = x1;
        array[i++] = y1;
        array[i++] = -n1;
        array[i++] = -n2;
        array[i++] = color;
        array[i++] = x2;
        array[i++] = y2;
        array[i++] = 0;
        array[i++] = 0;
        array[i] = color;
    };
    EdgeTriangleProgram.prototype.draw = function (params) {
        var gl = this.gl;
        var _a = this.uniformLocations, u_matrix = _a.u_matrix, u_sizeRatio = _a.u_sizeRatio, u_correctionRatio = _a.u_correctionRatio;
        gl.uniformMatrix3fv(u_matrix, false, params.matrix);
        gl.uniform1f(u_sizeRatio, params.sizeRatio);
        gl.uniform1f(u_correctionRatio, params.correctionRatio);
        gl.drawArrays(gl.TRIANGLES, 0, this.verticesCount);
    };
    return EdgeTriangleProgram;
}(edge_1.EdgeProgram));
exports.default = EdgeTriangleProgram;
