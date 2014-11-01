var b = require("./builders");
var n = require("acorn-ast-types").namedTypes;
var _ = require("lodash");

exports.FUNCTION_TYPES = ["ArrowFunctionExpression", "FunctionDeclaration", "FunctionExpression"];
exports.PATTERN_TYPES  = ["ArrayPattern", "ObjectPattern"];
exports.BINARY_TYPES   = ["BinaryExpression", "LogicalExpression"];
exports.UNARY_TYPES    = ["UnaryExpression", "SpreadElement", "SpreadProperty"];

exports.aliases = {
  ArrowFunctionExpression: ["Function"],
  FunctionDeclaration:     ["Function"],
  FunctionExpression:      ["Function"]
};

exports.isUnaryLike = function (node) {
  return _.contains(exports.UNARY_TYPES, node.type);
};

exports.isBinary = function (node) {
  return _.contains(exports.BINARY_TYPES, node.type);
};

exports.isFunction = function (node) {
  return _.contains(exports.FUNCTION_TYPES, node.type);
};

exports.isPattern = function (node) {
  return _.contains(exports.PATTERN_TYPES, node.type);
};

exports.isReferenced = function (node, parent) {
  // we're a property key so we aren't referenced
  if (parent.type === "Property" && parent.key === node) return false;

  var isMemberExpression = parent.type === "MemberExpression";

  // we're in a member expression and we're the computed property so we're referenced
  var isComputedProperty = isMemberExpression && parent.property === node && parent.computed;

  // we're in a member expression and we're the object so we're referenced
  var isObject = isMemberExpression && parent.object === node;

  // we are referenced
  if (!isMemberExpression || isComputedProperty || isObject) return true;

  return false;
};

exports.ensureBlock = function (node) {
  var block = node.body;
  if (block.type === "BlockStatement") return;

  if (!_.isArray(block)) {
    if (!n.Statement.check(block)) block = b.returnStatement(block);
    block = [block];
  }

  node.body = b.blockStatement(block);
};

exports.getSpecifierName = function (specifier) {
  return specifier.name || specifier.id;
};

exports.ensureExpressionType = function (node) {
  node.type = {
    FunctionDeclaration: "FunctionExpression",
    ClassDeclaration: "ClassExpression"
  }[node.type] || node.type;
  return node;
};

exports.needsParans = function (node, parent) {
  //if (!n.Expression.check(node)) return false;

  if (exports.isUnaryLike(node)) {
    return parent.type === "MemberExpression" && parent.object === node;
  }

  if (exports.isBinary(node)) {
    if (parent.type === "CallExpression" && parent.callee === node) {
      return true;
    }

    if (exports.isUnaryLike(parent)) {
      return true;
    }

    if (parent.type === "MemberExpression" && parent.object === node) {
      return true;
    }

    if (exports.isBinary(parent)) {
      var po = parent.operator;
      var pp = PRECEDENCE[po];
      var no = node.operator;
      var np = PRECEDENCE[no];

      if (pp > np) {
        return true;
      }

      if (pp === np && parent.right === node) {
        return true;
      }
    }
  }

  if (node.type === "SequenceExpression") {
    if (parent.type === "ForStatement") {
      // Although parentheses wouldn't hurt around sequence
      // expressions in the head of for loops, traditional style
      // dictates that e.g. i++, j++ should not be wrapped with
      // parentheses.
      return false;
    }

    if (parent.type === "ExpressionStatement" && parent.expression === node) {
      return false;
    }

    // Otherwise err on the side of overparenthesization, adding
    // explicit exceptions above if this proves overzealous.
    return true;
  }

  if (node.type === "YieldExpression") {
    return exports.isBinary(parent)
        || exports.isUnaryLike(parent)
        || parent.type === "CallExpression"
        || parent.type === "MemberExpression"
        || parent.type === "NewExpression"
        || parent.type === "ConditionalExpression"
        || parent.type === "YieldExpression";
  }

  //if (parent.type === "NewExpression" && parent.callee === node) {
  //  return containsCallExpression(node);
  //}

  if (node.type === "Literal" && _.isNumber(node.value) && parent.type === "MemberExpression" && parent.object === node) {
    return true;
  }

  if (node.type === "AssignmentExpression" || node.type === "ConditionalExpression") {
    if (exports.isUnaryLike(parent)) {
      return true;
    }

    if (exports.isBinary(parent)) {
      return true;
    }

    if (parent.type === "CallExpression" && parent.callee === node) {
      return true;
    }

    if (parent.type === "ConditionalExpression" && parent.test === node) {
      return true;
    }

    if (parent.type === "MemberExpression" && parent.object === node) {
      return true;
    }
  }

  if (node.type === "FunctionExpression") {
    if (parent.type === "ExpressionStatement") {
      return true;
    }

    if (parent.type === "MemberExpression" && parent.object === node) {
      return true;
    }

    if (parent.type === "CallExpression" && parent.callee === node) {
      return true;
    }
  }

  if (node.type === "ObjectPattern" && parent.type === "AssignmentExpression") {
    return true;
  }

  return false;
};

var PRECEDENCE = {};

_.each([
  ["||"],
  ["&&"],
  ["|"],
  ["^"],
  ["&"],
  ["==", "===", "!=", "!=="],
  ["<", ">", "<=", ">=", "in", "instanceof"],
  [">>", "<<", ">>>"],
  ["+", "-"],
  ["*", "/", "%"]
], function(tier, i) {
  _.each(tier, function(op) {
    PRECEDENCE[op] = i;
  });
});
