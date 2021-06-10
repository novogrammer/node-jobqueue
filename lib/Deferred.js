"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _bluebird = _interopRequireDefault(require("bluebird"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Deferred {
  constructor() {
    this.promise = new _bluebird.default((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }

}

exports.default = Deferred;