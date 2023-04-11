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
var node_point_vert_glsl_1 = __importDefault(require("../shaders/node.point.vert.glsl.js"));
var node_point_frag_glsl_1 = __importDefault(require("../shaders/node.point.frag.glsl.js"));
var UNSIGNED_BYTE = WebGLRenderingContext.UNSIGNED_BYTE, FLOAT = WebGLRenderingContext.FLOAT;
var UNIFORMS = ["u_sizeRatio", "u_pixelRatio", "u_matrix"];
var NodePointProgram = /** @class */ (function (_super) {
    __extends(NodePointProgram, _super);
    function NodePointProgram() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NodePointProgram.prototype.getDefinition = function () {
        return {
            VERTICES: 1,
            ARRAY_ITEMS_PER_VERTEX: 4,
            VERTEX_SHADER_SOURCE: node_point_vert_glsl_1.default,
            FRAGMENT_SHADER_SOURCE: node_point_frag_glsl_1.default,
            UNIFORMS: UNIFORMS,
            ATTRIBUTES: [
                { name: "a_position", size: 2, type: FLOAT },
                { name: "a_size", size: 1, type: FLOAT },
                { name: "a_color", size: 4, type: UNSIGNED_BYTE, normalized: true },
            ],
        };
    };
    NodePointProgram.prototype.processVisibleItem = function (i, data) {
        var array = this.array;
        array[i++] = data.x;
        array[i++] = data.y;
        array[i++] = data.size;
        array[i] = (0, utils_1.floatColor)(data.color);
    };
    NodePointProgram.prototype.draw = function (params) {
        var gl = this.gl;
        var _a = this.uniformLocations, u_sizeRatio = _a.u_sizeRatio, u_pixelRatio = _a.u_pixelRatio, u_matrix = _a.u_matrix;
        gl.uniform1f(u_sizeRatio, params.sizeRatio);
        gl.uniform1f(u_pixelRatio, params.pixelRatio);
        gl.uniformMatrix3fv(u_matrix, false, params.matrix);
        gl.drawArrays(gl.POINTS, 0, this.verticesCount);
    };
    return NodePointProgram;
}(node_1.NodeProgram));
exports.default = NodePointProgram;
