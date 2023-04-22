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
exports.createEdgeCompoundProgram = exports.EdgeProgram = exports.AbstractEdgeProgram = void 0;
var program_1 = require("./program");
var AbstractEdgeProgram = /** @class */ (function (_super) {
    __extends(AbstractEdgeProgram, _super);
    function AbstractEdgeProgram() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return AbstractEdgeProgram;
}(program_1.AbstractProgram));
exports.AbstractEdgeProgram = AbstractEdgeProgram;
var EdgeProgram = /** @class */ (function (_super) {
    __extends(EdgeProgram, _super);
    function EdgeProgram() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    EdgeProgram.prototype.process = function (offset, sourceData, targetData, data) {
        var i = offset * this.STRIDE;
        // NOTE: dealing with hidden items automatically
        if (data.hidden || sourceData.hidden || targetData.hidden) {
            for (var l = i + this.STRIDE; i < l; i++) {
                this.array[i] = 0;
            }
            return;
        }
        return this.processVisibleItem(i, sourceData, targetData, data);
    };
    return EdgeProgram;
}(program_1.Program));
exports.EdgeProgram = EdgeProgram;
/**
 * Helper function combining two or more programs into a single compound one.
 * Note that this is more a quick & easy way to combine program than a really
 * performant option. More performant programs can be written entirely.
 *
 * @param  {array}    programClasses - Program classes to combine.
 * @return {function}
 */
function createEdgeCompoundProgram(programClasses) {
    return /** @class */ (function () {
        function EdgeCompoundProgram(gl, renderer) {
            this.programs = programClasses.map(function (Program) {
                return new Program(gl, renderer);
            });
        }
        EdgeCompoundProgram.prototype.reallocate = function (capacity) {
            this.programs.forEach(function (program) { return program.reallocate(capacity); });
        };
        EdgeCompoundProgram.prototype.process = function (offset, sourceData, targetData, data) {
            this.programs.forEach(function (program) { return program.process(offset, sourceData, targetData, data); });
        };
        EdgeCompoundProgram.prototype.render = function (params) {
            this.programs.forEach(function (program) { return program.render(params); });
        };
        return EdgeCompoundProgram;
    }());
}
exports.createEdgeCompoundProgram = createEdgeCompoundProgram;
