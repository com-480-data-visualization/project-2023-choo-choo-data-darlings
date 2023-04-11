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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNodeCompoundProgram = exports.NodeProgram = exports.AbstractNodeProgram = void 0;
var program_1 = require("./program");
var AbstractNodeProgram = /** @class */ (function (_super) {
    __extends(AbstractNodeProgram, _super);
    function AbstractNodeProgram() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return AbstractNodeProgram;
}(program_1.AbstractProgram));
exports.AbstractNodeProgram = AbstractNodeProgram;
var NodeProgram = /** @class */ (function (_super) {
    __extends(NodeProgram, _super);
    function NodeProgram() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NodeProgram.prototype.process = function (offset, data) {
        var i = offset * this.STRIDE;
        // NOTE: dealing with hidden items automatically
        if (data.hidden) {
            for (var l = i + this.STRIDE; i < l; i++) {
                this.array[i] = 0;
            }
            return;
        }
        return this.processVisibleItem(i, data);
    };
    return NodeProgram;
}(program_1.Program));
exports.NodeProgram = NodeProgram;
/**
 * Helper function combining two or more programs into a single compound one.
 * Note that this is more a quick & easy way to combine program than a really
 * performant option. More performant programs can be written entirely.
 *
 * @param  {array}    programClasses - Program classes to combine.
 * @return {function}
 */
function createNodeCompoundProgram(programClasses) {
    return /** @class */ (function () {
        function NodeCompoundProgram(gl, renderer) {
            this.programs = programClasses.map(function (Program) {
                return new Program(gl, renderer);
            });
        }
        NodeCompoundProgram.prototype.reallocate = function (capacity) {
            this.programs.forEach(function (program) { return program.reallocate(capacity); });
        };
        NodeCompoundProgram.prototype.process = function (offset, data) {
            this.programs.forEach(function (program) { return program.process(offset, data); });
        };
        NodeCompoundProgram.prototype.render = function (params) {
            this.programs.forEach(function (program) { return program.render(params); });
        };
        return NodeCompoundProgram;
    }());
}
exports.createNodeCompoundProgram = createNodeCompoundProgram;
