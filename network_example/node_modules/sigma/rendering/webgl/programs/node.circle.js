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
var node_1 = require("./common/node");
var node_circle_vert_glsl_1 = __importDefault(require("../shaders/node.circle.vert.glsl.js"));
var node_circle_frag_glsl_1 = __importDefault(require("../shaders/node.circle.frag.glsl.js"));
var UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE, FLOAT = WebGLRenderingContext.FLOAT;
var UNIFORMS = ["u_sizeRatio", "u_correctionRatio", "u_matrix"];
var NodeCircleProgram = /** @class */ (function (_super) {
    __extends(NodeCircleProgram, _super);
    function NodeCircleProgram() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NodeCircleProgram.prototype.getDefinition = function () {
        return {
            VERTICES: 3,
            ARRAY_ITEMS_PER_VERTEX: 5,
            VERTEX_SHADER_SOURCE: node_circle_vert_glsl_1.default,
            FRAGMENT_SHADER_SOURCE: node_circle_frag_glsl_1.default,
            UNIFORMS: UNIFORMS,
            ATTRIBUTES: [
                { name: "a_position", size: 2, type: FLOAT },
                { name: "a_size", size: 1, type: FLOAT },
                { name: "a_color", size: 4, type: UNSIGNED_BYTE, normalized: true },
                { name: "a_angle", size: 1, type: FLOAT },
            ],
        };
    };
    NodeCircleProgram.prototype.processVisibleItem = function (i, data) {
        var array = this.array;
        var color = (0, utils_1.floatColor)(data.color);
        array[i++] = data.x;
        array[i++] = data.y;
        array[i++] = data.size;
        array[i++] = color;
        array[i++] = NodeCircleProgram.ANGLE_1;
        array[i++] = data.x;
        array[i++] = data.y;
        array[i++] = data.size;
        array[i++] = color;
        array[i++] = NodeCircleProgram.ANGLE_2;
        array[i++] = data.x;
        array[i++] = data.y;
        array[i++] = data.size;
        array[i++] = color;
        array[i] = NodeCircleProgram.ANGLE_3;
    };
    NodeCircleProgram.prototype.draw = function (params) {
        var gl = this.gl;
        var _a = this.uniformLocations, u_sizeRatio = _a.u_sizeRatio, u_correctionRatio = _a.u_correctionRatio, u_matrix = _a.u_matrix;
        gl.uniform1f(u_sizeRatio, params.sizeRatio);
        gl.uniform1f(u_correctionRatio, params.correctionRatio);
        gl.uniformMatrix3fv(u_matrix, false, params.matrix);
        gl.drawArrays(gl.TRIANGLES, 0, this.verticesCount);
    };
    NodeCircleProgram.ANGLE_1 = 0;
    NodeCircleProgram.ANGLE_2 = (2 * Math.PI) / 3;
    NodeCircleProgram.ANGLE_3 = (4 * Math.PI) / 3;
    return NodeCircleProgram;
}(node_1.NodeProgram));
exports.default = NodeCircleProgram;
