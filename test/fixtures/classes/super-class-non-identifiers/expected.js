var Q = function(_ref) {
  function Q() {}

  Q.prototype = Object.create(_ref.prototype, {
    constructor: {
      value: Q,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  Q.__proto__ = _ref;

  return Q;
}(function() {});