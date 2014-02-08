;
(function () {
  var undefined;
  var arrayPool = [], objectPool = [];
  var idCounter = 0;
  var keyPrefix = +new Date() + '';
  var largeArraySize = 75;
  var maxPoolSize = 40;
  var whitespace = ' \t\x0B\f\xa0\ufeff' + '\n\r\u2028\u2029' + '\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u202f\u205f\u3000';
  var reEmptyStringLeading = /\b__p \+= '';/g, reEmptyStringMiddle = /\b(__p \+=) '' \+/g, reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
  var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;
  var reFlags = /\w*$/;
  var reFuncName = /^\s*function[ \n\r\t]+\w/;
  var reInterpolate = /<%=([\s\S]+?)%>/g;
  var reLeadingSpacesAndZeros = RegExp('^[' + whitespace + ']*0+(?=.$)');
  var reNoMatch = /($^)/;
  var reThis = /\bthis\b/;
  var reUnescapedString = /['\n\r\t\u2028\u2029\\]/g;
  var contextProps = [
      'Array',
      'Boolean',
      'Date',
      'Function',
      'Math',
      'Number',
      'Object',
      'RegExp',
      'String',
      '_',
      'attachEvent',
      'clearTimeout',
      'isFinite',
      'isNaN',
      'parseInt',
      'setTimeout'
    ];
  var templateCounter = 0;
  var argsClass = '[object Arguments]', arrayClass = '[object Array]', boolClass = '[object Boolean]', dateClass = '[object Date]', funcClass = '[object Function]', numberClass = '[object Number]', objectClass = '[object Object]', regexpClass = '[object RegExp]', stringClass = '[object String]';
  var cloneableClasses = {};
  cloneableClasses[funcClass] = false;
  cloneableClasses[argsClass] = cloneableClasses[arrayClass] = cloneableClasses[boolClass] = cloneableClasses[dateClass] = cloneableClasses[numberClass] = cloneableClasses[objectClass] = cloneableClasses[regexpClass] = cloneableClasses[stringClass] = true;
  var debounceOptions = {
      'leading': false,
      'maxWait': 0,
      'trailing': false
    };
  var descriptor = {
      'configurable': false,
      'enumerable': false,
      'value': null,
      'writable': false
    };
  var objectTypes = {
      'boolean': false,
      'function': true,
      'object': true,
      'number': false,
      'string': false,
      'undefined': false
    };
  var stringEscapes = {
      '\\': '\\',
      '\'': '\'',
      '\n': 'n',
      '\r': 'r',
      '\t': 't',
      '\u2028': 'u2028',
      '\u2029': 'u2029'
    };
  var root = objectTypes[typeof window] && window || this;
  var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;
  var freeModule = objectTypes[typeof module] && module && !module.nodeType && module;
  var moduleExports = freeModule && freeModule.exports === freeExports && freeExports;
  var freeGlobal = objectTypes[typeof global] && global;
  if (freeGlobal && (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal)) {
    root = freeGlobal;
  }
  function baseIndexOf(array, value, fromIndex) {
    var index = (fromIndex || 0) - 1, length = array ? array.length : 0;
    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }
  function cacheIndexOf(cache, value) {
    var type = typeof value;
    cache = cache.cache;
    if (type == 'boolean' || value == null) {
      return cache[value] ? 0 : -1;
    }
    if (type != 'number' && type != 'string') {
      type = 'object';
    }
    var key = type == 'number' ? value : keyPrefix + value;
    cache = (cache = cache[type]) && cache[key];
    return type == 'object' ? cache && baseIndexOf(cache, value) > -1 ? 0 : -1 : cache ? 0 : -1;
  }
  function cachePush(value) {
    var cache = this.cache, type = typeof value;
    if (type == 'boolean' || value == null) {
      cache[value] = true;
    } else {
      if (type != 'number' && type != 'string') {
        type = 'object';
      }
      var key = type == 'number' ? value : keyPrefix + value, typeCache = cache[type] || (cache[type] = {});
      if (type == 'object') {
        (typeCache[key] || (typeCache[key] = [])).push(value);
      } else {
        typeCache[key] = true;
      }
    }
  }
  function charAtCallback(value) {
    return value.charCodeAt(0);
  }
  function compareAscending(a, b) {
    var ac = a.criteria, bc = b.criteria, index = -1, length = ac.length;
    while (++index < length) {
      var value = ac[index], other = bc[index];
      if (value !== other) {
        if (value > other || typeof value == 'undefined') {
          return 1;
        }
        if (value < other || typeof other == 'undefined') {
          return -1;
        }
      }
    }
    return a.index - b.index;
  }
  function createCache(array) {
    var index = -1, length = array.length, first = array[0], mid = array[length / 2 | 0], last = array[length - 1];
    if (first && typeof first == 'object' && mid && typeof mid == 'object' && last && typeof last == 'object') {
      return false;
    }
    var cache = getObject();
    cache['false'] = cache['null'] = cache['true'] = cache['undefined'] = false;
    var result = getObject();
    result.array = array;
    result.cache = cache;
    result.push = cachePush;
    while (++index < length) {
      result.push(array[index]);
    }
    return result;
  }
  function escapeStringChar(match) {
    return '\\' + stringEscapes[match];
  }
  function getArray() {
    return arrayPool.pop() || [];
  }
  function getObject() {
    return objectPool.pop() || {
      'array': null,
      'cache': null,
      'criteria': null,
      'false': false,
      'index': 0,
      'null': false,
      'number': null,
      'object': null,
      'push': null,
      'string': null,
      'true': false,
      'undefined': false,
      'value': null
    };
  }
  function releaseArray(array) {
    array.length = 0;
    if (arrayPool.length < maxPoolSize) {
      arrayPool.push(array);
    }
  }
  function releaseObject(object) {
    var cache = object.cache;
    if (cache) {
      releaseObject(cache);
    }
    object.array = object.cache = object.criteria = object.object = object.number = object.string = object.value = null;
    if (objectPool.length < maxPoolSize) {
      objectPool.push(object);
    }
  }
  function slice(array, start, end) {
    start || (start = 0);
    if (typeof end == 'undefined') {
      end = array ? array.length : 0;
    }
    var index = -1, length = end - start || 0, result = Array(length < 0 ? 0 : length);
    while (++index < length) {
      result[index] = array[start + index];
    }
    return result;
  }
  function runInContext(context) {
    context = context ? _.defaults(root.Object(), context, _.pick(root, contextProps)) : root;
    var Array = context.Array, Boolean = context.Boolean, Date = context.Date, Function = context.Function, Math = context.Math, Number = context.Number, Object = context.Object, RegExp = context.RegExp, String = context.String, TypeError = context.TypeError;
    var arrayRef = [];
    var objectProto = Object.prototype;
    var oldDash = context._;
    var toString = objectProto.toString;
    var reNative = RegExp('^' + String(toString).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/toString| for [^\]]+/g, '.*?') + '$');
    var ceil = Math.ceil, clearTimeout = context.clearTimeout, floor = Math.floor, fnToString = Function.prototype.toString, getPrototypeOf = isNative(getPrototypeOf = Object.getPrototypeOf) && getPrototypeOf, hasOwnProperty = objectProto.hasOwnProperty, push = arrayRef.push, setTimeout = context.setTimeout, splice = arrayRef.splice, unshift = arrayRef.unshift;
    var defineProperty = function () {
        try {
          var o = {}, func = isNative(func = Object.defineProperty) && func, result = func(o, o, o) && func;
        } catch (e) {
        }
        return result;
      }();
    var nativeCreate = isNative(nativeCreate = Object.create) && nativeCreate, nativeIsArray = isNative(nativeIsArray = Array.isArray) && nativeIsArray, nativeIsFinite = context.isFinite, nativeIsNaN = context.isNaN, nativeKeys = isNative(nativeKeys = Object.keys) && nativeKeys, nativeMax = Math.max, nativeMin = Math.min, nativeParseInt = context.parseInt, nativeRandom = Math.random;
    var ctorByClass = {};
    ctorByClass[arrayClass] = Array;
    ctorByClass[boolClass] = Boolean;
    ctorByClass[dateClass] = Date;
    ctorByClass[funcClass] = Function;
    ctorByClass[objectClass] = Object;
    ctorByClass[numberClass] = Number;
    ctorByClass[regexpClass] = RegExp;
    ctorByClass[stringClass] = String;
    function lodash(value) {
      return value && typeof value == 'object' && !isArray(value) && hasOwnProperty.call(value, '__wrapped__') ? value : new lodashWrapper(value);
    }
    function lodashWrapper(value, chainAll) {
      this.__chain__ = !!chainAll;
      this.__wrapped__ = value;
    }
    lodashWrapper.prototype = lodash.prototype;
    var support = lodash.support = {};
    support.funcDecomp = !isNative(context.WinRTError) && reThis.test(runInContext);
    support.funcNames = typeof Function.name == 'string';
    lodash.templateSettings = {
      'escape': /<%-([\s\S]+?)%>/g,
      'evaluate': /<%([\s\S]+?)%>/g,
      'interpolate': reInterpolate,
      'variable': '',
      'imports': { '_': lodash }
    };
    function baseBind(bindData) {
      var func = bindData[0], partialArgs = bindData[2], thisArg = bindData[4];
      function bound() {
        if (partialArgs) {
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        if (this instanceof bound) {
          var thisBinding = baseCreate(func.prototype), result = func.apply(thisBinding, args || arguments);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisArg, args || arguments);
      }
      setBindData(bound, bindData);
      return bound;
    }
    function baseClone(value, isDeep, callback, stackA, stackB) {
      if (callback) {
        var result = callback(value);
        if (typeof result != 'undefined') {
          return result;
        }
      }
      var isObj = isObject(value);
      if (isObj) {
        var className = toString.call(value);
        if (!cloneableClasses[className]) {
          return value;
        }
        var ctor = ctorByClass[className];
        switch (className) {
        case boolClass:
        case dateClass:
          return new ctor(+value);
        case numberClass:
        case stringClass:
          return new ctor(value);
        case regexpClass:
          result = ctor(value.source, reFlags.exec(value));
          result.lastIndex = value.lastIndex;
          return result;
        }
      } else {
        return value;
      }
      var isArr = isArray(value);
      if (isDeep) {
        var initedStack = !stackA;
        stackA || (stackA = getArray());
        stackB || (stackB = getArray());
        var length = stackA.length;
        while (length--) {
          if (stackA[length] == value) {
            return stackB[length];
          }
        }
        result = isArr ? ctor(value.length) : {};
      } else {
        result = isArr ? slice(value) : assign({}, value);
      }
      if (isArr) {
        if (hasOwnProperty.call(value, 'index')) {
          result.index = value.index;
        }
        if (hasOwnProperty.call(value, 'input')) {
          result.input = value.input;
        }
      }
      if (!isDeep) {
        return result;
      }
      stackA.push(value);
      stackB.push(result);
      (isArr ? forEach : forOwn)(value, function (objValue, key) {
        result[key] = baseClone(objValue, isDeep, callback, stackA, stackB);
      });
      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }
    function baseCreate(prototype, properties) {
      return isObject(prototype) ? nativeCreate(prototype) : {};
    }
    if (!nativeCreate) {
      baseCreate = function () {
        function Object() {
        }
        return function (prototype) {
          if (isObject(prototype)) {
            Object.prototype = prototype;
            var result = new Object();
            Object.prototype = null;
          }
          return result || context.Object();
        };
      }();
    }
    function baseCreateCallback(func, thisArg, argCount) {
      if (typeof func != 'function') {
        return identity;
      }
      if (typeof thisArg == 'undefined' || !('prototype' in func)) {
        return func;
      }
      var bindData = func.__bindData__;
      if (typeof bindData == 'undefined') {
        if (support.funcNames) {
          bindData = !func.name;
        }
        bindData = bindData || !support.funcDecomp;
        if (!bindData) {
          var source = fnToString.call(func);
          if (!support.funcNames) {
            bindData = !reFuncName.test(source);
          }
          if (!bindData) {
            bindData = reThis.test(source);
            setBindData(func, bindData);
          }
        }
      }
      if (bindData === false || bindData !== true && bindData[1] & 1) {
        return func;
      }
      switch (argCount) {
      case 1:
        return function (value) {
          return func.call(thisArg, value);
        };
      case 2:
        return function (a, b) {
          return func.call(thisArg, a, b);
        };
      case 3:
        return function (value, index, collection) {
          return func.call(thisArg, value, index, collection);
        };
      case 4:
        return function (accumulator, value, index, collection) {
          return func.call(thisArg, accumulator, value, index, collection);
        };
      }
      return bind(func, thisArg);
    }
    function baseCreateWrapper(bindData) {
      var func = bindData[0], bitmask = bindData[1], partialArgs = bindData[2], partialRightArgs = bindData[3], thisArg = bindData[4], arity = bindData[5];
      var isBind = bitmask & 1, isBindKey = bitmask & 2, isCurry = bitmask & 4, isCurryBound = bitmask & 8, key = func;
      function bound() {
        var thisBinding = isBind ? thisArg : this;
        if (partialArgs) {
          var args = slice(partialArgs);
          push.apply(args, arguments);
        }
        if (partialRightArgs || isCurry) {
          args || (args = slice(arguments));
          if (partialRightArgs) {
            push.apply(args, partialRightArgs);
          }
          if (isCurry && args.length < arity) {
            bitmask |= 16 & ~32;
            return baseCreateWrapper([
              func,
              isCurryBound ? bitmask : bitmask & ~3,
              args,
              null,
              thisArg,
              arity
            ]);
          }
        }
        args || (args = arguments);
        if (isBindKey) {
          func = thisBinding[key];
        }
        if (this instanceof bound) {
          thisBinding = baseCreate(func.prototype);
          var result = func.apply(thisBinding, args);
          return isObject(result) ? result : thisBinding;
        }
        return func.apply(thisBinding, args);
      }
      setBindData(bound, bindData);
      return bound;
    }
    function baseDifference(array, values) {
      var index = -1, indexOf = getIndexOf(), length = array ? array.length : 0, isLarge = length >= largeArraySize && indexOf === baseIndexOf, result = [];
      if (isLarge) {
        var cache = createCache(values);
        if (cache) {
          indexOf = cacheIndexOf;
          values = cache;
        } else {
          isLarge = false;
        }
      }
      while (++index < length) {
        var value = array[index];
        if (indexOf(values, value) < 0) {
          result.push(value);
        }
      }
      if (isLarge) {
        releaseObject(values);
      }
      return result;
    }
    function baseFlatten(array, isShallow, isStrict, fromIndex) {
      var index = (fromIndex || 0) - 1, length = array ? array.length : 0, result = [];
      while (++index < length) {
        var value = array[index];
        if (value && typeof value == 'object' && typeof value.length == 'number' && (isArray(value) || isArguments(value))) {
          if (!isShallow) {
            value = baseFlatten(value, isShallow, isStrict);
          }
          var valIndex = -1, valLength = value.length, resIndex = result.length;
          result.length += valLength;
          while (++valIndex < valLength) {
            result[resIndex++] = value[valIndex];
          }
        } else if (!isStrict) {
          result.push(value);
        }
      }
      return result;
    }
    function baseIsEqual(a, b, callback, isWhere, stackA, stackB) {
      if (callback) {
        var result = callback(a, b);
        if (typeof result != 'undefined') {
          return !!result;
        }
      }
      if (a === b) {
        return a !== 0 || 1 / a == 1 / b;
      }
      var type = typeof a, otherType = typeof b;
      if (a === a && !(a && objectTypes[type]) && !(b && objectTypes[otherType])) {
        return false;
      }
      if (a == null || b == null) {
        return a === b;
      }
      var className = toString.call(a), otherClass = toString.call(b);
      if (className == argsClass) {
        className = objectClass;
      }
      if (otherClass == argsClass) {
        otherClass = objectClass;
      }
      if (className != otherClass) {
        return false;
      }
      switch (className) {
      case boolClass:
      case dateClass:
        return +a == +b;
      case numberClass:
        return a != +a ? b != +b : a == 0 ? 1 / a == 1 / b : a == +b;
      case regexpClass:
      case stringClass:
        return a == String(b);
      }
      var isArr = className == arrayClass;
      if (!isArr) {
        var aWrapped = hasOwnProperty.call(a, '__wrapped__'), bWrapped = hasOwnProperty.call(b, '__wrapped__');
        if (aWrapped || bWrapped) {
          return baseIsEqual(aWrapped ? a.__wrapped__ : a, bWrapped ? b.__wrapped__ : b, callback, isWhere, stackA, stackB);
        }
        if (className != objectClass) {
          return false;
        }
        var ctorA = a.constructor, ctorB = b.constructor;
        if (ctorA != ctorB && !(isFunction(ctorA) && ctorA instanceof ctorA && isFunction(ctorB) && ctorB instanceof ctorB) && ('constructor' in a && 'constructor' in b)) {
          return false;
        }
      }
      var initedStack = !stackA;
      stackA || (stackA = getArray());
      stackB || (stackB = getArray());
      var length = stackA.length;
      while (length--) {
        if (stackA[length] == a) {
          return stackB[length] == b;
        }
      }
      var size = 0;
      result = true;
      stackA.push(a);
      stackB.push(b);
      if (isArr) {
        length = a.length;
        size = b.length;
        result = size == length;
        if (result || isWhere) {
          while (size--) {
            var index = length, value = b[size];
            if (isWhere) {
              while (index--) {
                if (result = baseIsEqual(a[index], value, callback, isWhere, stackA, stackB)) {
                  break;
                }
              }
            } else if (!(result = baseIsEqual(a[size], value, callback, isWhere, stackA, stackB))) {
              break;
            }
          }
        }
      } else {
        forIn(b, function (value, key, b) {
          if (hasOwnProperty.call(b, key)) {
            size++;
            return result = hasOwnProperty.call(a, key) && baseIsEqual(a[key], value, callback, isWhere, stackA, stackB);
          }
        });
        if (result && !isWhere) {
          forIn(a, function (value, key, a) {
            if (hasOwnProperty.call(a, key)) {
              return result = --size > -1;
            }
          });
        }
      }
      stackA.pop();
      stackB.pop();
      if (initedStack) {
        releaseArray(stackA);
        releaseArray(stackB);
      }
      return result;
    }
    function baseMerge(object, source, callback, stackA, stackB) {
      (isArray(source) ? forEach : forOwn)(source, function (source, key) {
        var found, isArr, result = source, value = object[key];
        if (source && ((isArr = isArray(source)) || isPlainObject(source))) {
          var stackLength = stackA.length;
          while (stackLength--) {
            if (found = stackA[stackLength] == source) {
              value = stackB[stackLength];
              break;
            }
          }
          if (!found) {
            var isShallow;
            if (callback) {
              result = callback(value, source);
              if (isShallow = typeof result != 'undefined') {
                value = result;
              }
            }
            if (!isShallow) {
              value = isArr ? isArray(value) ? value : [] : isPlainObject(value) ? value : {};
            }
            stackA.push(source);
            stackB.push(value);
            if (!isShallow) {
              baseMerge(value, source, callback, stackA, stackB);
            }
          }
        } else {
          if (callback) {
            result = callback(value, source);
            if (typeof result == 'undefined') {
              result = source;
            }
          }
          if (typeof result != 'undefined') {
            value = result;
          }
        }
        object[key] = value;
      });
    }
    function baseRandom(min, max) {
      return min + floor(nativeRandom() * (max - min + 1));
    }
    function baseUniq(array, isSorted, callback) {
      var index = -1, indexOf = getIndexOf(), length = array ? array.length : 0, result = [];
      var isLarge = !isSorted && length >= largeArraySize && indexOf === baseIndexOf, seen = callback || isLarge ? getArray() : result;
      if (isLarge) {
        var cache = createCache(seen);
        indexOf = cacheIndexOf;
        seen = cache;
      }
      while (++index < length) {
        var value = array[index], computed = callback ? callback(value, index, array) : value;
        if (isSorted ? !index || seen[seen.length - 1] !== computed : indexOf(seen, computed) < 0) {
          if (callback || isLarge) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
      if (isLarge) {
        releaseArray(seen.array);
        releaseObject(seen);
      } else if (callback) {
        releaseArray(seen);
      }
      return result;
    }
    function createAggregator(setter) {
      return function (collection, callback, thisArg) {
        var result = {};
        callback = lodash.createCallback(callback, thisArg, 3);
        var index = -1, length = collection ? collection.length : 0;
        if (typeof length == 'number') {
          while (++index < length) {
            var value = collection[index];
            setter(result, value, callback(value, index, collection), collection);
          }
        } else {
          forOwn(collection, function (value, key, collection) {
            setter(result, value, callback(value, key, collection), collection);
          });
        }
        return result;
      };
    }
    function createWrapper(func, bitmask, partialArgs, partialRightArgs, thisArg, arity) {
      var isBind = bitmask & 1, isBindKey = bitmask & 2, isCurry = bitmask & 4, isCurryBound = bitmask & 8, isPartial = bitmask & 16, isPartialRight = bitmask & 32;
      if (!isBindKey && !isFunction(func)) {
        throw new TypeError();
      }
      if (isPartial && !partialArgs.length) {
        bitmask &= ~16;
        isPartial = partialArgs = false;
      }
      if (isPartialRight && !partialRightArgs.length) {
        bitmask &= ~32;
        isPartialRight = partialRightArgs = false;
      }
      var bindData = func && func.__bindData__;
      if (bindData && bindData !== true) {
        bindData = slice(bindData);
        if (bindData[2]) {
          bindData[2] = slice(bindData[2]);
        }
        if (bindData[3]) {
          bindData[3] = slice(bindData[3]);
        }
        if (isBind && !(bindData[1] & 1)) {
          bindData[4] = thisArg;
        }
        if (!isBind && bindData[1] & 1) {
          bitmask |= 8;
        }
        if (isCurry && !(bindData[1] & 4)) {
          bindData[5] = arity;
        }
        if (isPartial) {
          push.apply(bindData[2] || (bindData[2] = []), partialArgs);
        }
        if (isPartialRight) {
          unshift.apply(bindData[3] || (bindData[3] = []), partialRightArgs);
        }
        bindData[1] |= bitmask;
        return createWrapper.apply(null, bindData);
      }
      var creater = bitmask == 1 || bitmask === 17 ? baseBind : baseCreateWrapper;
      return creater([
        func,
        bitmask,
        partialArgs,
        partialRightArgs,
        thisArg,
        arity
      ]);
    }
    function escapeHtmlChar(match) {
      return htmlEscapes[match];
    }
    function getIndexOf() {
      var result = (result = lodash.indexOf) === indexOf ? baseIndexOf : result;
      return result;
    }
    function isNative(value) {
      return typeof value == 'function' && reNative.test(value);
    }
    var setBindData = !defineProperty ? noop : function (func, value) {
        descriptor.value = value;
        defineProperty(func, '__bindData__', descriptor);
      };
    function shimIsPlainObject(value) {
      var ctor, result;
      if (!(value && toString.call(value) == objectClass) || (ctor = value.constructor, isFunction(ctor) && !(ctor instanceof ctor))) {
        return false;
      }
      forIn(value, function (value, key) {
        result = key;
      });
      return typeof result == 'undefined' || hasOwnProperty.call(value, result);
    }
    function unescapeHtmlChar(match) {
      return htmlUnescapes[match];
    }
    function isArguments(value) {
      return value && typeof value == 'object' && typeof value.length == 'number' && toString.call(value) == argsClass || false;
    }
    var isArray = nativeIsArray || function (value) {
        return value && typeof value == 'object' && typeof value.length == 'number' && toString.call(value) == arrayClass || false;
      };
    var shimKeys = function (object) {
      var index, iterable = object, result = [];
      if (!iterable)
        return result;
      if (!objectTypes[typeof object])
        return result;
      for (index in iterable) {
        if (hasOwnProperty.call(iterable, index)) {
          result.push(index);
        }
      }
      return result;
    };
    var keys = !nativeKeys ? shimKeys : function (object) {
        if (!isObject(object)) {
          return [];
        }
        return nativeKeys(object);
      };
    var htmlEscapes = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#39;'
      };
    var htmlUnescapes = invert(htmlEscapes);
    var reEscapedHtml = RegExp('(' + keys(htmlUnescapes).join('|') + ')', 'g'), reUnescapedHtml = RegExp('[' + keys(htmlEscapes).join('') + ']', 'g');
    var assign = function (object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable)
        return result;
      var args = arguments, argsIndex = 0, argsLength = typeof guard == 'number' ? 2 : args.length;
      if (argsLength > 3 && typeof args[argsLength - 2] == 'function') {
        var callback = baseCreateCallback(args[--argsLength - 1], args[argsLength--], 2);
      } else if (argsLength > 2 && typeof args[argsLength - 1] == 'function') {
        callback = args[--argsLength];
      }
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
          var ownIndex = -1, ownProps = objectTypes[typeof iterable] && keys(iterable), length = ownProps ? ownProps.length : 0;
          while (++ownIndex < length) {
            index = ownProps[ownIndex];
            result[index] = callback ? callback(result[index], iterable[index]) : iterable[index];
          }
        }
      }
      return result;
    };
    function clone(value, isDeep, callback, thisArg) {
      if (typeof isDeep != 'boolean' && isDeep != null) {
        thisArg = callback;
        callback = isDeep;
        isDeep = false;
      }
      return baseClone(value, isDeep, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }
    function cloneDeep(value, callback, thisArg) {
      return baseClone(value, true, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 1));
    }
    function create(prototype, properties) {
      var result = baseCreate(prototype);
      return properties ? assign(result, properties) : result;
    }
    var defaults = function (object, source, guard) {
      var index, iterable = object, result = iterable;
      if (!iterable)
        return result;
      var args = arguments, argsIndex = 0, argsLength = typeof guard == 'number' ? 2 : args.length;
      while (++argsIndex < argsLength) {
        iterable = args[argsIndex];
        if (iterable && objectTypes[typeof iterable]) {
          var ownIndex = -1, ownProps = objectTypes[typeof iterable] && keys(iterable), length = ownProps ? ownProps.length : 0;
          while (++ownIndex < length) {
            index = ownProps[ownIndex];
            if (typeof result[index] == 'undefined')
              result[index] = iterable[index];
          }
        }
      }
      return result;
    };
    function findKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwn(object, function (value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }
    function findLastKey(object, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwnRight(object, function (value, key, object) {
        if (callback(value, key, object)) {
          result = key;
          return false;
        }
      });
      return result;
    }
    var forIn = function (collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable)
        return result;
      if (!objectTypes[typeof iterable])
        return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      for (index in iterable) {
        if (callback(iterable[index], index, collection) === false)
          return result;
      }
      return result;
    };
    function forInRight(object, callback, thisArg) {
      var pairs = [];
      forIn(object, function (value, key) {
        pairs.push(key, value);
      });
      var length = pairs.length;
      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(pairs[length--], pairs[length], object) === false) {
          break;
        }
      }
      return object;
    }
    var forOwn = function (collection, callback, thisArg) {
      var index, iterable = collection, result = iterable;
      if (!iterable)
        return result;
      if (!objectTypes[typeof iterable])
        return result;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      var ownIndex = -1, ownProps = objectTypes[typeof iterable] && keys(iterable), length = ownProps ? ownProps.length : 0;
      while (++ownIndex < length) {
        index = ownProps[ownIndex];
        if (callback(iterable[index], index, collection) === false)
          return result;
      }
      return result;
    };
    function forOwnRight(object, callback, thisArg) {
      var props = keys(object), length = props.length;
      callback = baseCreateCallback(callback, thisArg, 3);
      while (length--) {
        var key = props[length];
        if (callback(object[key], key, object) === false) {
          break;
        }
      }
      return object;
    }
    function functions(object) {
      var result = [];
      forIn(object, function (value, key) {
        if (isFunction(value)) {
          result.push(key);
        }
      });
      return result.sort();
    }
    function has(object, key) {
      return object ? hasOwnProperty.call(object, key) : false;
    }
    function invert(object) {
      var index = -1, props = keys(object), length = props.length, result = {};
      while (++index < length) {
        var key = props[index];
        result[object[key]] = key;
      }
      return result;
    }
    function isBoolean(value) {
      return value === true || value === false || value && typeof value == 'object' && toString.call(value) == boolClass || false;
    }
    function isDate(value) {
      return value && typeof value == 'object' && toString.call(value) == dateClass || false;
    }
    function isElement(value) {
      return value && value.nodeType === 1 || false;
    }
    function isEmpty(value) {
      var result = true;
      if (!value) {
        return result;
      }
      var className = toString.call(value), length = value.length;
      if (className == arrayClass || className == stringClass || className == argsClass || className == objectClass && typeof length == 'number' && isFunction(value.splice)) {
        return !length;
      }
      forOwn(value, function () {
        return result = false;
      });
      return result;
    }
    function isEqual(a, b, callback, thisArg) {
      return baseIsEqual(a, b, typeof callback == 'function' && baseCreateCallback(callback, thisArg, 2));
    }
    function isFinite(value) {
      return nativeIsFinite(value) && !nativeIsNaN(parseFloat(value));
    }
    function isFunction(value) {
      return typeof value == 'function';
    }
    function isObject(value) {
      return !!(value && objectTypes[typeof value]);
    }
    function isNaN(value) {
      return isNumber(value) && value != +value;
    }
    function isNull(value) {
      return value === null;
    }
    function isNumber(value) {
      return typeof value == 'number' || value && typeof value == 'object' && toString.call(value) == numberClass || false;
    }
    var isPlainObject = !getPrototypeOf ? shimIsPlainObject : function (value) {
        if (!(value && toString.call(value) == objectClass)) {
          return false;
        }
        var valueOf = value.valueOf, objProto = isNative(valueOf) && (objProto = getPrototypeOf(valueOf)) && getPrototypeOf(objProto);
        return objProto ? value == objProto || getPrototypeOf(value) == objProto : shimIsPlainObject(value);
      };
    function isRegExp(value) {
      return value && typeof value == 'object' && toString.call(value) == regexpClass || false;
    }
    function isString(value) {
      return typeof value == 'string' || value && typeof value == 'object' && toString.call(value) == stringClass || false;
    }
    function isUndefined(value) {
      return typeof value == 'undefined';
    }
    function mapValues(object, callback, thisArg) {
      var result = {};
      callback = lodash.createCallback(callback, thisArg, 3);
      forOwn(object, function (value, key, object) {
        result[key] = callback(value, key, object);
      });
      return result;
    }
    function merge(object) {
      var args = arguments, length = 2;
      if (!isObject(object)) {
        return object;
      }
      if (typeof args[2] != 'number') {
        length = args.length;
      }
      if (length > 3 && typeof args[length - 2] == 'function') {
        var callback = baseCreateCallback(args[--length - 1], args[length--], 2);
      } else if (length > 2 && typeof args[length - 1] == 'function') {
        callback = args[--length];
      }
      var sources = slice(arguments, 1, length), index = -1, stackA = getArray(), stackB = getArray();
      while (++index < length) {
        baseMerge(object, sources[index], callback, stackA, stackB);
      }
      releaseArray(stackA);
      releaseArray(stackB);
      return object;
    }
    function omit(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var props = [];
        forIn(object, function (value, key) {
          props.push(key);
        });
        props = baseDifference(props, baseFlatten(arguments, true, false, 1));
        var index = -1, length = props.length;
        while (++index < length) {
          var key = props[index];
          result[key] = object[key];
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function (value, key, object) {
          if (!callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }
    function pairs(object) {
      var index = -1, props = keys(object), length = props.length, result = Array(length);
      while (++index < length) {
        var key = props[index];
        result[index] = [
          key,
          object[key]
        ];
      }
      return result;
    }
    function pick(object, callback, thisArg) {
      var result = {};
      if (typeof callback != 'function') {
        var index = -1, props = baseFlatten(arguments, true, false, 1), length = isObject(object) ? props.length : 0;
        while (++index < length) {
          var key = props[index];
          if (key in object) {
            result[key] = object[key];
          }
        }
      } else {
        callback = lodash.createCallback(callback, thisArg, 3);
        forIn(object, function (value, key, object) {
          if (callback(value, key, object)) {
            result[key] = value;
          }
        });
      }
      return result;
    }
    function transform(object, callback, accumulator, thisArg) {
      var isArr = isArray(object);
      if (accumulator == null) {
        if (isArr) {
          accumulator = [];
        } else {
          var ctor = object && object.constructor, proto = ctor && ctor.prototype;
          accumulator = baseCreate(proto);
        }
      }
      if (callback) {
        callback = lodash.createCallback(callback, thisArg, 4);
        (isArr ? forEach : forOwn)(object, function (value, index, object) {
          return callback(accumulator, value, index, object);
        });
      }
      return accumulator;
    }
    function values(object) {
      var index = -1, props = keys(object), length = props.length, result = Array(length);
      while (++index < length) {
        result[index] = object[props[index]];
      }
      return result;
    }
    function at(collection) {
      var args = arguments, index = -1, props = baseFlatten(args, true, false, 1), length = args[2] && args[2][args[1]] === collection ? 1 : props.length, result = Array(length);
      while (++index < length) {
        result[index] = collection[props[index]];
      }
      return result;
    }
    function contains(collection, target, fromIndex) {
      var index = -1, indexOf = getIndexOf(), length = collection ? collection.length : 0, result = false;
      fromIndex = (fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex) || 0;
      if (isArray(collection)) {
        result = indexOf(collection, target, fromIndex) > -1;
      } else if (typeof length == 'number') {
        result = (isString(collection) ? collection.indexOf(target, fromIndex) : indexOf(collection, target, fromIndex)) > -1;
      } else {
        forOwn(collection, function (value) {
          if (++index >= fromIndex) {
            return !(result = value === target);
          }
        });
      }
      return result;
    }
    var countBy = createAggregator(function (result, value, key) {
        hasOwnProperty.call(result, key) ? result[key]++ : result[key] = 1;
      });
    function every(collection, callback, thisArg) {
      var result = true;
      callback = lodash.createCallback(callback, thisArg, 3);
      var index = -1, length = collection ? collection.length : 0;
      if (typeof length == 'number') {
        while (++index < length) {
          if (!(result = !!callback(collection[index], index, collection))) {
            break;
          }
        }
      } else {
        forOwn(collection, function (value, index, collection) {
          return result = !!callback(value, index, collection);
        });
      }
      return result;
    }
    function filter(collection, callback, thisArg) {
      var result = [];
      callback = lodash.createCallback(callback, thisArg, 3);
      var index = -1, length = collection ? collection.length : 0;
      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            result.push(value);
          }
        }
      } else {
        forOwn(collection, function (value, index, collection) {
          if (callback(value, index, collection)) {
            result.push(value);
          }
        });
      }
      return result;
    }
    function find(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);
      var index = -1, length = collection ? collection.length : 0;
      if (typeof length == 'number') {
        while (++index < length) {
          var value = collection[index];
          if (callback(value, index, collection)) {
            return value;
          }
        }
      } else {
        var result;
        forOwn(collection, function (value, index, collection) {
          if (callback(value, index, collection)) {
            result = value;
            return false;
          }
        });
        return result;
      }
    }
    function findLast(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      forEachRight(collection, function (value, index, collection) {
        if (callback(value, index, collection)) {
          result = value;
          return false;
        }
      });
      return result;
    }
    function forEach(collection, callback, thisArg) {
      var index = -1, length = collection ? collection.length : 0;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (++index < length) {
          if (callback(collection[index], index, collection) === false) {
            break;
          }
        }
      } else {
        forOwn(collection, callback);
      }
      return collection;
    }
    function forEachRight(collection, callback, thisArg) {
      var length = collection ? collection.length : 0;
      callback = callback && typeof thisArg == 'undefined' ? callback : baseCreateCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        while (length--) {
          if (callback(collection[length], length, collection) === false) {
            break;
          }
        }
      } else {
        var props = keys(collection);
        length = props.length;
        forOwn(collection, function (value, key, collection) {
          key = props ? props[--length] : --length;
          return callback(collection[key], key, collection);
        });
      }
      return collection;
    }
    var groupBy = createAggregator(function (result, value, key) {
        (hasOwnProperty.call(result, key) ? result[key] : result[key] = []).push(value);
      });
    var indexBy = createAggregator(function (result, value, key) {
        result[key] = value;
      });
    function invoke(collection, methodName) {
      var args = slice(arguments, 2), index = -1, isFunc = typeof methodName == 'function', length = collection ? collection.length : 0, result = Array(typeof length == 'number' ? length : 0);
      forEach(collection, function (value) {
        result[++index] = (isFunc ? methodName : value[methodName]).apply(value, args);
      });
      return result;
    }
    function map(collection, callback, thisArg) {
      var index = -1, length = collection ? collection.length : 0;
      callback = lodash.createCallback(callback, thisArg, 3);
      if (typeof length == 'number') {
        var result = Array(length);
        while (++index < length) {
          result[index] = callback(collection[index], index, collection);
        }
      } else {
        result = [];
        forOwn(collection, function (value, key, collection) {
          result[++index] = callback(value, key, collection);
        });
      }
      return result;
    }
    function max(collection, callback, thisArg) {
      var computed = -Infinity, result = computed;
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1, length = collection.length;
        while (++index < length) {
          var value = collection[index];
          if (value > result) {
            result = value;
          }
        }
      } else {
        callback = callback == null && isString(collection) ? charAtCallback : lodash.createCallback(callback, thisArg, 3);
        forEach(collection, function (value, index, collection) {
          var current = callback(value, index, collection);
          if (current > computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }
    function min(collection, callback, thisArg) {
      var computed = Infinity, result = computed;
      if (typeof callback != 'function' && thisArg && thisArg[callback] === collection) {
        callback = null;
      }
      if (callback == null && isArray(collection)) {
        var index = -1, length = collection.length;
        while (++index < length) {
          var value = collection[index];
          if (value < result) {
            result = value;
          }
        }
      } else {
        callback = callback == null && isString(collection) ? charAtCallback : lodash.createCallback(callback, thisArg, 3);
        forEach(collection, function (value, index, collection) {
          var current = callback(value, index, collection);
          if (current < computed) {
            computed = current;
            result = value;
          }
        });
      }
      return result;
    }
    var pluck = map;
    function reduce(collection, callback, accumulator, thisArg) {
      if (!collection)
        return accumulator;
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);
      var index = -1, length = collection.length;
      if (typeof length == 'number') {
        if (noaccum) {
          accumulator = collection[++index];
        }
        while (++index < length) {
          accumulator = callback(accumulator, collection[index], index, collection);
        }
      } else {
        forOwn(collection, function (value, index, collection) {
          accumulator = noaccum ? (noaccum = false, value) : callback(accumulator, value, index, collection);
        });
      }
      return accumulator;
    }
    function reduceRight(collection, callback, accumulator, thisArg) {
      var noaccum = arguments.length < 3;
      callback = lodash.createCallback(callback, thisArg, 4);
      forEachRight(collection, function (value, index, collection) {
        accumulator = noaccum ? (noaccum = false, value) : callback(accumulator, value, index, collection);
      });
      return accumulator;
    }
    function reject(collection, callback, thisArg) {
      callback = lodash.createCallback(callback, thisArg, 3);
      return filter(collection, function (value, index, collection) {
        return !callback(value, index, collection);
      });
    }
    function sample(collection, n, guard) {
      if (collection && typeof collection.length != 'number') {
        collection = values(collection);
      }
      if (n == null || guard) {
        return collection ? collection[baseRandom(0, collection.length - 1)] : undefined;
      }
      var result = shuffle(collection);
      result.length = nativeMin(nativeMax(0, n), result.length);
      return result;
    }
    function shuffle(collection) {
      var index = -1, length = collection ? collection.length : 0, result = Array(typeof length == 'number' ? length : 0);
      forEach(collection, function (value) {
        var rand = baseRandom(0, ++index);
        result[index] = result[rand];
        result[rand] = value;
      });
      return result;
    }
    function size(collection) {
      var length = collection ? collection.length : 0;
      return typeof length == 'number' ? length : keys(collection).length;
    }
    function some(collection, callback, thisArg) {
      var result;
      callback = lodash.createCallback(callback, thisArg, 3);
      var index = -1, length = collection ? collection.length : 0;
      if (typeof length == 'number') {
        while (++index < length) {
          if (result = callback(collection[index], index, collection)) {
            break;
          }
        }
      } else {
        forOwn(collection, function (value, index, collection) {
          return !(result = callback(value, index, collection));
        });
      }
      return !!result;
    }
    function sortBy(collection, callback, thisArg) {
      var index = -1, isArr = isArray(callback), length = collection ? collection.length : 0, result = Array(typeof length == 'number' ? length : 0);
      if (!isArr) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      forEach(collection, function (value, key, collection) {
        var object = result[++index] = getObject();
        if (isArr) {
          object.criteria = map(callback, function (key) {
            return value[key];
          });
        } else {
          (object.criteria = getArray())[0] = callback(value, key, collection);
        }
        object.index = index;
        object.value = value;
      });
      length = result.length;
      result.sort(compareAscending);
      while (length--) {
        var object = result[length];
        result[length] = object.value;
        if (!isArr) {
          releaseArray(object.criteria);
        }
        releaseObject(object);
      }
      return result;
    }
    function toArray(collection) {
      if (collection && typeof collection.length == 'number') {
        return slice(collection);
      }
      return values(collection);
    }
    var where = filter;
    function compact(array) {
      var index = -1, length = array ? array.length : 0, result = [];
      while (++index < length) {
        var value = array[index];
        if (value) {
          result.push(value);
        }
      }
      return result;
    }
    function difference(array) {
      return baseDifference(array, baseFlatten(arguments, true, true, 1));
    }
    function findIndex(array, callback, thisArg) {
      var index = -1, length = array ? array.length : 0;
      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        if (callback(array[index], index, array)) {
          return index;
        }
      }
      return -1;
    }
    function findLastIndex(array, callback, thisArg) {
      var length = array ? array.length : 0;
      callback = lodash.createCallback(callback, thisArg, 3);
      while (length--) {
        if (callback(array[length], length, array)) {
          return length;
        }
      }
      return -1;
    }
    function first(array, callback, thisArg) {
      var n = 0, length = array ? array.length : 0;
      if (typeof callback != 'number' && callback != null) {
        var index = -1;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[0] : undefined;
        }
      }
      return slice(array, 0, nativeMin(nativeMax(0, n), length));
    }
    function flatten(array, isShallow, callback, thisArg) {
      if (typeof isShallow != 'boolean' && isShallow != null) {
        thisArg = callback;
        callback = typeof isShallow != 'function' && thisArg && thisArg[isShallow] === array ? null : isShallow;
        isShallow = false;
      }
      if (callback != null) {
        array = map(array, callback, thisArg);
      }
      return baseFlatten(array, isShallow);
    }
    function indexOf(array, value, fromIndex) {
      if (typeof fromIndex == 'number') {
        var length = array ? array.length : 0;
        fromIndex = fromIndex < 0 ? nativeMax(0, length + fromIndex) : fromIndex || 0;
      } else if (fromIndex) {
        var index = sortedIndex(array, value);
        return array[index] === value ? index : -1;
      }
      return baseIndexOf(array, value, fromIndex);
    }
    function initial(array, callback, thisArg) {
      var n = 0, length = array ? array.length : 0;
      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback == null || thisArg ? 1 : callback || n;
      }
      return slice(array, 0, nativeMin(nativeMax(0, length - n), length));
    }
    function intersection() {
      var args = [], argsIndex = -1, argsLength = arguments.length, caches = getArray(), indexOf = getIndexOf(), trustIndexOf = indexOf === baseIndexOf, seen = getArray();
      while (++argsIndex < argsLength) {
        var value = arguments[argsIndex];
        if (isArray(value) || isArguments(value)) {
          args.push(value);
          caches.push(trustIndexOf && value.length >= largeArraySize && createCache(argsIndex ? args[argsIndex] : seen));
        }
      }
      var array = args[0], index = -1, length = array ? array.length : 0, result = [];
      outer:
        while (++index < length) {
          var cache = caches[0];
          value = array[index];
          if ((cache ? cacheIndexOf(cache, value) : indexOf(seen, value)) < 0) {
            argsIndex = argsLength;
            (cache || seen).push(value);
            while (--argsIndex) {
              cache = caches[argsIndex];
              if ((cache ? cacheIndexOf(cache, value) : indexOf(args[argsIndex], value)) < 0) {
                continue outer;
              }
            }
            result.push(value);
          }
        }
      while (argsLength--) {
        cache = caches[argsLength];
        if (cache) {
          releaseObject(cache);
        }
      }
      releaseArray(caches);
      releaseArray(seen);
      return result;
    }
    function last(array, callback, thisArg) {
      var n = 0, length = array ? array.length : 0;
      if (typeof callback != 'number' && callback != null) {
        var index = length;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (index-- && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback;
        if (n == null || thisArg) {
          return array ? array[length - 1] : undefined;
        }
      }
      return slice(array, nativeMax(0, length - n));
    }
    function lastIndexOf(array, value, fromIndex) {
      var index = array ? array.length : 0;
      if (typeof fromIndex == 'number') {
        index = (fromIndex < 0 ? nativeMax(0, index + fromIndex) : nativeMin(fromIndex, index - 1)) + 1;
      }
      while (index--) {
        if (array[index] === value) {
          return index;
        }
      }
      return -1;
    }
    function pull(array) {
      var args = arguments, argsIndex = 0, argsLength = args.length, length = array ? array.length : 0;
      while (++argsIndex < argsLength) {
        var index = -1, value = args[argsIndex];
        while (++index < length) {
          if (array[index] === value) {
            splice.call(array, index--, 1);
            length--;
          }
        }
      }
      return array;
    }
    function range(start, end, step) {
      start = +start || 0;
      step = typeof step == 'number' ? step : +step || 1;
      if (end == null) {
        end = start;
        start = 0;
      }
      var index = -1, length = nativeMax(0, ceil((end - start) / (step || 1))), result = Array(length);
      while (++index < length) {
        result[index] = start;
        start += step;
      }
      return result;
    }
    function remove(array, callback, thisArg) {
      var index = -1, length = array ? array.length : 0, result = [];
      callback = lodash.createCallback(callback, thisArg, 3);
      while (++index < length) {
        var value = array[index];
        if (callback(value, index, array)) {
          result.push(value);
          splice.call(array, index--, 1);
          length--;
        }
      }
      return result;
    }
    function rest(array, callback, thisArg) {
      if (typeof callback != 'number' && callback != null) {
        var n = 0, index = -1, length = array ? array.length : 0;
        callback = lodash.createCallback(callback, thisArg, 3);
        while (++index < length && callback(array[index], index, array)) {
          n++;
        }
      } else {
        n = callback == null || thisArg ? 1 : nativeMax(0, callback);
      }
      return slice(array, n);
    }
    function sortedIndex(array, value, callback, thisArg) {
      var low = 0, high = array ? array.length : low;
      callback = callback ? lodash.createCallback(callback, thisArg, 1) : identity;
      value = callback(value);
      while (low < high) {
        var mid = low + high >>> 1;
        callback(array[mid]) < value ? low = mid + 1 : high = mid;
      }
      return low;
    }
    function union() {
      return baseUniq(baseFlatten(arguments, true, true));
    }
    function uniq(array, isSorted, callback, thisArg) {
      if (typeof isSorted != 'boolean' && isSorted != null) {
        thisArg = callback;
        callback = typeof isSorted != 'function' && thisArg && thisArg[isSorted] === array ? null : isSorted;
        isSorted = false;
      }
      if (callback != null) {
        callback = lodash.createCallback(callback, thisArg, 3);
      }
      return baseUniq(array, isSorted, callback);
    }
    function without(array) {
      return baseDifference(array, slice(arguments, 1));
    }
    function xor() {
      var index = -1, length = arguments.length;
      while (++index < length) {
        var array = arguments[index];
        if (isArray(array) || isArguments(array)) {
          var result = result ? baseUniq(baseDifference(result, array).concat(baseDifference(array, result))) : array;
        }
      }
      return result || [];
    }
    function zip() {
      var array = arguments.length > 1 ? arguments : arguments[0], index = -1, length = array ? max(pluck(array, 'length')) : 0, result = Array(length < 0 ? 0 : length);
      while (++index < length) {
        result[index] = pluck(array, index);
      }
      return result;
    }
    function zipObject(keys, values) {
      var index = -1, length = keys ? keys.length : 0, result = {};
      if (!values && length && !isArray(keys[0])) {
        values = [];
      }
      while (++index < length) {
        var key = keys[index];
        if (values) {
          result[key] = values[index];
        } else if (key) {
          result[key[0]] = key[1];
        }
      }
      return result;
    }
    function after(n, func) {
      if (!isFunction(func)) {
        throw new TypeError();
      }
      return function () {
        if (--n < 1) {
          return func.apply(this, arguments);
        }
      };
    }
    function bind(func, thisArg) {
      return arguments.length > 2 ? createWrapper(func, 17, slice(arguments, 2), null, thisArg) : createWrapper(func, 1, null, null, thisArg);
    }
    function bindAll(object) {
      var funcs = arguments.length > 1 ? baseFlatten(arguments, true, false, 1) : functions(object), index = -1, length = funcs.length;
      while (++index < length) {
        var key = funcs[index];
        object[key] = createWrapper(object[key], 1, null, null, object);
      }
      return object;
    }
    function bindKey(object, key) {
      return arguments.length > 2 ? createWrapper(key, 19, slice(arguments, 2), null, object) : createWrapper(key, 3, null, null, object);
    }
    function compose() {
      var funcs = arguments, length = funcs.length;
      while (length--) {
        if (!isFunction(funcs[length])) {
          throw new TypeError();
        }
      }
      return function () {
        var args = arguments, length = funcs.length;
        while (length--) {
          args = [funcs[length].apply(this, args)];
        }
        return args[0];
      };
    }
    function curry(func, arity) {
      arity = typeof arity == 'number' ? arity : +arity || func.length;
      return createWrapper(func, 4, null, null, null, arity);
    }
    function debounce(func, wait, options) {
      var args, maxTimeoutId, result, stamp, thisArg, timeoutId, trailingCall, lastCalled = 0, maxWait = false, trailing = true;
      if (!isFunction(func)) {
        throw new TypeError();
      }
      wait = nativeMax(0, wait) || 0;
      if (options === true) {
        var leading = true;
        trailing = false;
      } else if (isObject(options)) {
        leading = options.leading;
        maxWait = 'maxWait' in options && (nativeMax(wait, options.maxWait) || 0);
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      var delayed = function () {
        var remaining = wait - (now() - stamp);
        if (remaining <= 0) {
          if (maxTimeoutId) {
            clearTimeout(maxTimeoutId);
          }
          var isCalled = trailingCall;
          maxTimeoutId = timeoutId = trailingCall = undefined;
          if (isCalled) {
            lastCalled = now();
            result = func.apply(thisArg, args);
            if (!timeoutId && !maxTimeoutId) {
              args = thisArg = null;
            }
          }
        } else {
          timeoutId = setTimeout(delayed, remaining);
        }
      };
      var maxDelayed = function () {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        maxTimeoutId = timeoutId = trailingCall = undefined;
        if (trailing || maxWait !== wait) {
          lastCalled = now();
          result = func.apply(thisArg, args);
          if (!timeoutId && !maxTimeoutId) {
            args = thisArg = null;
          }
        }
      };
      return function () {
        args = arguments;
        stamp = now();
        thisArg = this;
        trailingCall = trailing && (timeoutId || !leading);
        if (maxWait === false) {
          var leadingCall = leading && !timeoutId;
        } else {
          if (!maxTimeoutId && !leading) {
            lastCalled = stamp;
          }
          var remaining = maxWait - (stamp - lastCalled), isCalled = remaining <= 0;
          if (isCalled) {
            if (maxTimeoutId) {
              maxTimeoutId = clearTimeout(maxTimeoutId);
            }
            lastCalled = stamp;
            result = func.apply(thisArg, args);
          } else if (!maxTimeoutId) {
            maxTimeoutId = setTimeout(maxDelayed, remaining);
          }
        }
        if (isCalled && timeoutId) {
          timeoutId = clearTimeout(timeoutId);
        } else if (!timeoutId && wait !== maxWait) {
          timeoutId = setTimeout(delayed, wait);
        }
        if (leadingCall) {
          isCalled = true;
          result = func.apply(thisArg, args);
        }
        if (isCalled && !timeoutId && !maxTimeoutId) {
          args = thisArg = null;
        }
        return result;
      };
    }
    function defer(func) {
      if (!isFunction(func)) {
        throw new TypeError();
      }
      var args = slice(arguments, 1);
      return setTimeout(function () {
        func.apply(undefined, args);
      }, 1);
    }
    function delay(func, wait) {
      if (!isFunction(func)) {
        throw new TypeError();
      }
      var args = slice(arguments, 2);
      return setTimeout(function () {
        func.apply(undefined, args);
      }, wait);
    }
    function memoize(func, resolver) {
      if (!isFunction(func)) {
        throw new TypeError();
      }
      var memoized = function () {
        var cache = memoized.cache, key = resolver ? resolver.apply(this, arguments) : keyPrefix + arguments[0];
        return hasOwnProperty.call(cache, key) ? cache[key] : cache[key] = func.apply(this, arguments);
      };
      memoized.cache = {};
      return memoized;
    }
    function once(func) {
      var ran, result;
      if (!isFunction(func)) {
        throw new TypeError();
      }
      return function () {
        if (ran) {
          return result;
        }
        ran = true;
        result = func.apply(this, arguments);
        func = null;
        return result;
      };
    }
    function partial(func) {
      return createWrapper(func, 16, slice(arguments, 1));
    }
    function partialRight(func) {
      return createWrapper(func, 32, null, slice(arguments, 1));
    }
    function throttle(func, wait, options) {
      var leading = true, trailing = true;
      if (!isFunction(func)) {
        throw new TypeError();
      }
      if (options === false) {
        leading = false;
      } else if (isObject(options)) {
        leading = 'leading' in options ? options.leading : leading;
        trailing = 'trailing' in options ? options.trailing : trailing;
      }
      debounceOptions.leading = leading;
      debounceOptions.maxWait = wait;
      debounceOptions.trailing = trailing;
      return debounce(func, wait, debounceOptions);
    }
    function wrap(value, wrapper) {
      return createWrapper(wrapper, 16, [value]);
    }
    function constant(value) {
      return function () {
        return value;
      };
    }
    function createCallback(func, thisArg, argCount) {
      var type = typeof func;
      if (func == null || type == 'function') {
        return baseCreateCallback(func, thisArg, argCount);
      }
      if (type != 'object') {
        return property(func);
      }
      var props = keys(func), key = props[0], a = func[key];
      if (props.length == 1 && a === a && !isObject(a)) {
        return function (object) {
          var b = object[key];
          return a === b && (a !== 0 || 1 / a == 1 / b);
        };
      }
      return function (object) {
        var length = props.length, result = false;
        while (length--) {
          if (!(result = baseIsEqual(object[props[length]], func[props[length]], null, true))) {
            break;
          }
        }
        return result;
      };
    }
    function escape(string) {
      return string == null ? '' : String(string).replace(reUnescapedHtml, escapeHtmlChar);
    }
    function identity(value) {
      return value;
    }
    function mixin(object, source, options) {
      var chain = true, methodNames = source && functions(source);
      if (!source || !options && !methodNames.length) {
        if (options == null) {
          options = source;
        }
        ctor = lodashWrapper;
        source = object;
        object = lodash;
        methodNames = functions(source);
      }
      if (options === false) {
        chain = false;
      } else if (isObject(options) && 'chain' in options) {
        chain = options.chain;
      }
      var ctor = object, isFunc = isFunction(ctor);
      forEach(methodNames, function (methodName) {
        var func = object[methodName] = source[methodName];
        if (isFunc) {
          ctor.prototype[methodName] = function () {
            var chainAll = this.__chain__, value = this.__wrapped__, args = [value];
            push.apply(args, arguments);
            var result = func.apply(object, args);
            if (chain || chainAll) {
              if (value === result && isObject(result)) {
                return this;
              }
              result = new ctor(result);
              result.__chain__ = chainAll;
            }
            return result;
          };
        }
      });
    }
    function noConflict() {
      context._ = oldDash;
      return this;
    }
    function noop() {
    }
    var now = isNative(now = Date.now) && now || function () {
        return new Date().getTime();
      };
    var parseInt = nativeParseInt(whitespace + '08') == 8 ? nativeParseInt : function (value, radix) {
        return nativeParseInt(isString(value) ? value.replace(reLeadingSpacesAndZeros, '') : value, radix || 0);
      };
    function property(key) {
      return function (object) {
        return object[key];
      };
    }
    function random(min, max, floating) {
      var noMin = min == null, noMax = max == null;
      if (floating == null) {
        if (typeof min == 'boolean' && noMax) {
          floating = min;
          min = 1;
        } else if (!noMax && typeof max == 'boolean') {
          floating = max;
          noMax = true;
        }
      }
      if (noMin && noMax) {
        max = 1;
      }
      min = +min || 0;
      if (noMax) {
        max = min;
        min = 0;
      } else {
        max = +max || 0;
      }
      if (floating || min % 1 || max % 1) {
        var rand = nativeRandom();
        return nativeMin(min + rand * (max - min + parseFloat('1e-' + ((rand + '').length - 1))), max);
      }
      return baseRandom(min, max);
    }
    function result(object, key) {
      if (object) {
        var value = object[key];
        return isFunction(value) ? object[key]() : value;
      }
    }
    function template(text, data, options) {
      var settings = lodash.templateSettings;
      text = String(text || '');
      options = defaults({}, options, settings);
      var imports = defaults({}, options.imports, settings.imports), importsKeys = keys(imports), importsValues = values(imports);
      var isEvaluating, index = 0, interpolate = options.interpolate || reNoMatch, source = '__p += \'';
      var reDelimiters = RegExp((options.escape || reNoMatch).source + '|' + interpolate.source + '|' + (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + '|' + (options.evaluate || reNoMatch).source + '|$', 'g');
      text.replace(reDelimiters, function (match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
        interpolateValue || (interpolateValue = esTemplateValue);
        source += text.slice(index, offset).replace(reUnescapedString, escapeStringChar);
        if (escapeValue) {
          source += '\' +\n__e(' + escapeValue + ') +\n\'';
        }
        if (evaluateValue) {
          isEvaluating = true;
          source += '\';\n' + evaluateValue + ';\n__p += \'';
        }
        if (interpolateValue) {
          source += '\' +\n((__t = (' + interpolateValue + ')) == null ? \'\' : __t) +\n\'';
        }
        index = offset + match.length;
        return match;
      });
      source += '\';\n';
      var variable = options.variable, hasVariable = variable;
      if (!hasVariable) {
        variable = 'obj';
        source = 'with (' + variable + ') {\n' + source + '\n}\n';
      }
      source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source).replace(reEmptyStringMiddle, '$1').replace(reEmptyStringTrailing, '$1;');
      source = 'function(' + variable + ') {\n' + (hasVariable ? '' : variable + ' || (' + variable + ' = {});\n') + 'var __t, __p = \'\', __e = _.escape' + (isEvaluating ? ', __j = Array.prototype.join;\n' + 'function print() { __p += __j.call(arguments, \'\') }\n' : ';\n') + source + 'return __p\n}';
      var sourceURL = '\n/*\n//# sourceURL=' + (options.sourceURL || '/lodash/template/source[' + templateCounter++ + ']') + '\n*/';
      try {
        var result = Function(importsKeys, 'return ' + source + sourceURL).apply(undefined, importsValues);
      } catch (e) {
        e.source = source;
        throw e;
      }
      if (data) {
        return result(data);
      }
      result.source = source;
      return result;
    }
    function times(n, callback, thisArg) {
      n = (n = +n) > -1 ? n : 0;
      var index = -1, result = Array(n);
      callback = baseCreateCallback(callback, thisArg, 1);
      while (++index < n) {
        result[index] = callback(index);
      }
      return result;
    }
    function unescape(string) {
      return string == null ? '' : String(string).replace(reEscapedHtml, unescapeHtmlChar);
    }
    function uniqueId(prefix) {
      var id = ++idCounter;
      return String(prefix == null ? '' : prefix) + id;
    }
    function chain(value) {
      value = new lodashWrapper(value);
      value.__chain__ = true;
      return value;
    }
    function tap(value, interceptor) {
      interceptor(value);
      return value;
    }
    function wrapperChain() {
      this.__chain__ = true;
      return this;
    }
    function wrapperToString() {
      return String(this.__wrapped__);
    }
    function wrapperValueOf() {
      return this.__wrapped__;
    }
    lodash.after = after;
    lodash.assign = assign;
    lodash.at = at;
    lodash.bind = bind;
    lodash.bindAll = bindAll;
    lodash.bindKey = bindKey;
    lodash.chain = chain;
    lodash.compact = compact;
    lodash.compose = compose;
    lodash.constant = constant;
    lodash.countBy = countBy;
    lodash.create = create;
    lodash.createCallback = createCallback;
    lodash.curry = curry;
    lodash.debounce = debounce;
    lodash.defaults = defaults;
    lodash.defer = defer;
    lodash.delay = delay;
    lodash.difference = difference;
    lodash.filter = filter;
    lodash.flatten = flatten;
    lodash.forEach = forEach;
    lodash.forEachRight = forEachRight;
    lodash.forIn = forIn;
    lodash.forInRight = forInRight;
    lodash.forOwn = forOwn;
    lodash.forOwnRight = forOwnRight;
    lodash.functions = functions;
    lodash.groupBy = groupBy;
    lodash.indexBy = indexBy;
    lodash.initial = initial;
    lodash.intersection = intersection;
    lodash.invert = invert;
    lodash.invoke = invoke;
    lodash.keys = keys;
    lodash.map = map;
    lodash.mapValues = mapValues;
    lodash.max = max;
    lodash.memoize = memoize;
    lodash.merge = merge;
    lodash.min = min;
    lodash.omit = omit;
    lodash.once = once;
    lodash.pairs = pairs;
    lodash.partial = partial;
    lodash.partialRight = partialRight;
    lodash.pick = pick;
    lodash.pluck = pluck;
    lodash.property = property;
    lodash.pull = pull;
    lodash.range = range;
    lodash.reject = reject;
    lodash.remove = remove;
    lodash.rest = rest;
    lodash.shuffle = shuffle;
    lodash.sortBy = sortBy;
    lodash.tap = tap;
    lodash.throttle = throttle;
    lodash.times = times;
    lodash.toArray = toArray;
    lodash.transform = transform;
    lodash.union = union;
    lodash.uniq = uniq;
    lodash.values = values;
    lodash.where = where;
    lodash.without = without;
    lodash.wrap = wrap;
    lodash.xor = xor;
    lodash.zip = zip;
    lodash.zipObject = zipObject;
    lodash.collect = map;
    lodash.drop = rest;
    lodash.each = forEach;
    lodash.eachRight = forEachRight;
    lodash.extend = assign;
    lodash.methods = functions;
    lodash.object = zipObject;
    lodash.select = filter;
    lodash.tail = rest;
    lodash.unique = uniq;
    lodash.unzip = zip;
    mixin(lodash);
    lodash.clone = clone;
    lodash.cloneDeep = cloneDeep;
    lodash.contains = contains;
    lodash.escape = escape;
    lodash.every = every;
    lodash.find = find;
    lodash.findIndex = findIndex;
    lodash.findKey = findKey;
    lodash.findLast = findLast;
    lodash.findLastIndex = findLastIndex;
    lodash.findLastKey = findLastKey;
    lodash.has = has;
    lodash.identity = identity;
    lodash.indexOf = indexOf;
    lodash.isArguments = isArguments;
    lodash.isArray = isArray;
    lodash.isBoolean = isBoolean;
    lodash.isDate = isDate;
    lodash.isElement = isElement;
    lodash.isEmpty = isEmpty;
    lodash.isEqual = isEqual;
    lodash.isFinite = isFinite;
    lodash.isFunction = isFunction;
    lodash.isNaN = isNaN;
    lodash.isNull = isNull;
    lodash.isNumber = isNumber;
    lodash.isObject = isObject;
    lodash.isPlainObject = isPlainObject;
    lodash.isRegExp = isRegExp;
    lodash.isString = isString;
    lodash.isUndefined = isUndefined;
    lodash.lastIndexOf = lastIndexOf;
    lodash.mixin = mixin;
    lodash.noConflict = noConflict;
    lodash.noop = noop;
    lodash.now = now;
    lodash.parseInt = parseInt;
    lodash.random = random;
    lodash.reduce = reduce;
    lodash.reduceRight = reduceRight;
    lodash.result = result;
    lodash.runInContext = runInContext;
    lodash.size = size;
    lodash.some = some;
    lodash.sortedIndex = sortedIndex;
    lodash.template = template;
    lodash.unescape = unescape;
    lodash.uniqueId = uniqueId;
    lodash.all = every;
    lodash.any = some;
    lodash.detect = find;
    lodash.findWhere = find;
    lodash.foldl = reduce;
    lodash.foldr = reduceRight;
    lodash.include = contains;
    lodash.inject = reduce;
    mixin(function () {
      var source = {};
      forOwn(lodash, function (func, methodName) {
        if (!lodash.prototype[methodName]) {
          source[methodName] = func;
        }
      });
      return source;
    }(), false);
    lodash.first = first;
    lodash.last = last;
    lodash.sample = sample;
    lodash.take = first;
    lodash.head = first;
    forOwn(lodash, function (func, methodName) {
      var callbackable = methodName !== 'sample';
      if (!lodash.prototype[methodName]) {
        lodash.prototype[methodName] = function (n, guard) {
          var chainAll = this.__chain__, result = func(this.__wrapped__, n, guard);
          return !chainAll && (n == null || guard && !(callbackable && typeof n == 'function')) ? result : new lodashWrapper(result, chainAll);
        };
      }
    });
    lodash.VERSION = '2.4.1';
    lodash.prototype.chain = wrapperChain;
    lodash.prototype.toString = wrapperToString;
    lodash.prototype.value = wrapperValueOf;
    lodash.prototype.valueOf = wrapperValueOf;
    forEach([
      'join',
      'pop',
      'shift'
    ], function (methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function () {
        var chainAll = this.__chain__, result = func.apply(this.__wrapped__, arguments);
        return chainAll ? new lodashWrapper(result, chainAll) : result;
      };
    });
    forEach([
      'push',
      'reverse',
      'sort',
      'unshift'
    ], function (methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function () {
        func.apply(this.__wrapped__, arguments);
        return this;
      };
    });
    forEach([
      'concat',
      'slice',
      'splice'
    ], function (methodName) {
      var func = arrayRef[methodName];
      lodash.prototype[methodName] = function () {
        return new lodashWrapper(func.apply(this.__wrapped__, arguments), this.__chain__);
      };
    });
    return lodash;
  }
  var _ = runInContext();
  if (typeof define == 'function' && typeof define.amd == 'object' && define.amd) {
    root._ = _;
    define(function () {
      return _;
    });
  } else if (freeExports && freeModule) {
    if (moduleExports) {
      (freeModule.exports = _)._ = _;
    } else {
      freeExports._ = _;
    }
  } else {
    root._ = _;
  }
}.call(this));
(function (definition) {
  if (typeof bootstrap === 'function') {
    bootstrap('promise', definition);
  } else if (typeof exports === 'object') {
    module.exports = definition();
  } else if (typeof define === 'function' && define.amd) {
    define(definition);
  } else if (typeof ses !== 'undefined') {
    if (!ses.ok()) {
      return;
    } else {
      ses.makeQ = definition;
    }
  } else {
    Q = definition();
  }
}(function () {
  'use strict';
  var hasStacks = false;
  try {
    throw new Error();
  } catch (e) {
    hasStacks = !!e.stack;
  }
  var qStartingLine = captureLine();
  var qFileName;
  var noop = function () {
  };
  var nextTick = function () {
      var head = {
          task: void 0,
          next: null
        };
      var tail = head;
      var flushing = false;
      var requestTick = void 0;
      var isNodeJS = false;
      function flush() {
        while (head.next) {
          head = head.next;
          var task = head.task;
          head.task = void 0;
          var domain = head.domain;
          if (domain) {
            head.domain = void 0;
            domain.enter();
          }
          try {
            task();
          } catch (e) {
            if (isNodeJS) {
              if (domain) {
                domain.exit();
              }
              setTimeout(flush, 0);
              if (domain) {
                domain.enter();
              }
              throw e;
            } else {
              setTimeout(function () {
                throw e;
              }, 0);
            }
          }
          if (domain) {
            domain.exit();
          }
        }
        flushing = false;
      }
      nextTick = function (task) {
        tail = tail.next = {
          task: task,
          domain: isNodeJS && process.domain,
          next: null
        };
        if (!flushing) {
          flushing = true;
          requestTick();
        }
      };
      if (typeof process !== 'undefined' && process.nextTick) {
        isNodeJS = true;
        requestTick = function () {
          process.nextTick(flush);
        };
      } else if (typeof setImmediate === 'function') {
        if (typeof window !== 'undefined') {
          requestTick = setImmediate.bind(window, flush);
        } else {
          requestTick = function () {
            setImmediate(flush);
          };
        }
      } else if (typeof MessageChannel !== 'undefined') {
        var channel = new MessageChannel();
        channel.port1.onmessage = function () {
          requestTick = requestPortTick;
          channel.port1.onmessage = flush;
          flush();
        };
        var requestPortTick = function () {
          channel.port2.postMessage(0);
        };
        requestTick = function () {
          setTimeout(flush, 0);
          requestPortTick();
        };
      } else {
        requestTick = function () {
          setTimeout(flush, 0);
        };
      }
      return nextTick;
    }();
  var call = Function.call;
  function uncurryThis(f) {
    return function () {
      return call.apply(f, arguments);
    };
  }
  var array_slice = uncurryThis(Array.prototype.slice);
  var array_reduce = uncurryThis(Array.prototype.reduce || function (callback, basis) {
      var index = 0, length = this.length;
      if (arguments.length === 1) {
        do {
          if (index in this) {
            basis = this[index++];
            break;
          }
          if (++index >= length) {
            throw new TypeError();
          }
        } while (1);
      }
      for (; index < length; index++) {
        if (index in this) {
          basis = callback(basis, this[index], index);
        }
      }
      return basis;
    });
  var array_indexOf = uncurryThis(Array.prototype.indexOf || function (value) {
      for (var i = 0; i < this.length; i++) {
        if (this[i] === value) {
          return i;
        }
      }
      return -1;
    });
  var array_map = uncurryThis(Array.prototype.map || function (callback, thisp) {
      var self = this;
      var collect = [];
      array_reduce(self, function (undefined, value, index) {
        collect.push(callback.call(thisp, value, index, self));
      }, void 0);
      return collect;
    });
  var object_create = Object.create || function (prototype) {
      function Type() {
      }
      Type.prototype = prototype;
      return new Type();
    };
  var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);
  var object_keys = Object.keys || function (object) {
      var keys = [];
      for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
          keys.push(key);
        }
      }
      return keys;
    };
  var object_toString = uncurryThis(Object.prototype.toString);
  function isObject(value) {
    return value === Object(value);
  }
  function isStopIteration(exception) {
    return object_toString(exception) === '[object StopIteration]' || exception instanceof QReturnValue;
  }
  var QReturnValue;
  if (typeof ReturnValue !== 'undefined') {
    QReturnValue = ReturnValue;
  } else {
    QReturnValue = function (value) {
      this.value = value;
    };
  }
  var hasES6Generators;
  try {
    new Function('(function* (){ yield 1; })');
    hasES6Generators = true;
  } catch (e) {
    hasES6Generators = false;
  }
  var STACK_JUMP_SEPARATOR = 'From previous event:';
  function makeStackTraceLong(error, promise) {
    if (hasStacks && promise.stack && typeof error === 'object' && error !== null && error.stack && error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1) {
      var stacks = [];
      for (var p = promise; !!p; p = p.source) {
        if (p.stack) {
          stacks.unshift(p.stack);
        }
      }
      stacks.unshift(error.stack);
      var concatedStacks = stacks.join('\n' + STACK_JUMP_SEPARATOR + '\n');
      error.stack = filterStackString(concatedStacks);
    }
  }
  function filterStackString(stackString) {
    var lines = stackString.split('\n');
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
      var line = lines[i];
      if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
        desiredLines.push(line);
      }
    }
    return desiredLines.join('\n');
  }
  function isNodeFrame(stackLine) {
    return stackLine.indexOf('(module.js:') !== -1 || stackLine.indexOf('(node.js:') !== -1;
  }
  function getFileNameAndLineNumber(stackLine) {
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
      return [
        attempt1[1],
        Number(attempt1[2])
      ];
    }
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
      return [
        attempt2[1],
        Number(attempt2[2])
      ];
    }
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
      return [
        attempt3[1],
        Number(attempt3[2])
      ];
    }
  }
  function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);
    if (!fileNameAndLineNumber) {
      return false;
    }
    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];
    return fileName === qFileName && lineNumber >= qStartingLine && lineNumber <= qEndingLine;
  }
  function captureLine() {
    if (!hasStacks) {
      return;
    }
    try {
      throw new Error();
    } catch (e) {
      var lines = e.stack.split('\n');
      var firstLine = lines[0].indexOf('@') > 0 ? lines[1] : lines[2];
      var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
      if (!fileNameAndLineNumber) {
        return;
      }
      qFileName = fileNameAndLineNumber[0];
      return fileNameAndLineNumber[1];
    }
  }
  function deprecate(callback, name, alternative) {
    return function () {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn(name + ' is deprecated, use ' + alternative + ' instead.', new Error('').stack);
      }
      return callback.apply(callback, arguments);
    };
  }
  function Q(value) {
    if (isPromise(value)) {
      return value;
    }
    if (isPromiseAlike(value)) {
      return coerce(value);
    } else {
      return fulfill(value);
    }
  }
  Q.resolve = Q;
  Q.nextTick = nextTick;
  Q.longStackSupport = false;
  Q.defer = defer;
  function defer() {
    var messages = [], progressListeners = [], resolvedPromise;
    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);
    promise.promiseDispatch = function (resolve, op, operands) {
      var args = array_slice(arguments);
      if (messages) {
        messages.push(args);
        if (op === 'when' && operands[1]) {
          progressListeners.push(operands[1]);
        }
      } else {
        nextTick(function () {
          resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
        });
      }
    };
    promise.valueOf = function () {
      if (messages) {
        return promise;
      }
      var nearerValue = nearer(resolvedPromise);
      if (isPromise(nearerValue)) {
        resolvedPromise = nearerValue;
      }
      return nearerValue;
    };
    promise.inspect = function () {
      if (!resolvedPromise) {
        return { state: 'pending' };
      }
      return resolvedPromise.inspect();
    };
    if (Q.longStackSupport && hasStacks) {
      try {
        throw new Error();
      } catch (e) {
        promise.stack = e.stack.substring(e.stack.indexOf('\n') + 1);
      }
    }
    function become(newPromise) {
      resolvedPromise = newPromise;
      promise.source = newPromise;
      array_reduce(messages, function (undefined, message) {
        nextTick(function () {
          newPromise.promiseDispatch.apply(newPromise, message);
        });
      }, void 0);
      messages = void 0;
      progressListeners = void 0;
    }
    deferred.promise = promise;
    deferred.resolve = function (value) {
      if (resolvedPromise) {
        return;
      }
      become(Q(value));
    };
    deferred.fulfill = function (value) {
      if (resolvedPromise) {
        return;
      }
      become(fulfill(value));
    };
    deferred.reject = function (reason) {
      if (resolvedPromise) {
        return;
      }
      become(reject(reason));
    };
    deferred.notify = function (progress) {
      if (resolvedPromise) {
        return;
      }
      array_reduce(progressListeners, function (undefined, progressListener) {
        nextTick(function () {
          progressListener(progress);
        });
      }, void 0);
    };
    return deferred;
  }
  defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
      if (error) {
        self.reject(error);
      } else if (arguments.length > 2) {
        self.resolve(array_slice(arguments, 1));
      } else {
        self.resolve(value);
      }
    };
  };
  Q.promise = promise;
  function promise(resolver) {
    if (typeof resolver !== 'function') {
      throw new TypeError('resolver must be a function.');
    }
    var deferred = defer();
    try {
      resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
      deferred.reject(reason);
    }
    return deferred.promise;
  }
  Q.passByCopy = function (object) {
    return object;
  };
  Promise.prototype.passByCopy = function () {
    return this;
  };
  Q.join = function (x, y) {
    return Q(x).join(y);
  };
  Promise.prototype.join = function (that) {
    return Q([
      this,
      that
    ]).spread(function (x, y) {
      if (x === y) {
        return x;
      } else {
        throw new Error('Can\'t join: not the same: ' + x + ' ' + y);
      }
    });
  };
  Q.race = race;
  function race(answerPs) {
    return promise(function (resolve, reject) {
      for (var i = 0, len = answerPs.length; i < len; i++) {
        Q(answerPs[i]).then(resolve, reject);
      }
    });
  }
  Promise.prototype.race = function () {
    return this.then(Q.race);
  };
  Q.makePromise = Promise;
  function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
      fallback = function (op) {
        return reject(new Error('Promise does not support operation: ' + op));
      };
    }
    if (inspect === void 0) {
      inspect = function () {
        return { state: 'unknown' };
      };
    }
    var promise = object_create(Promise.prototype);
    promise.promiseDispatch = function (resolve, op, args) {
      var result;
      try {
        if (descriptor[op]) {
          result = descriptor[op].apply(promise, args);
        } else {
          result = fallback.call(promise, op, args);
        }
      } catch (exception) {
        result = reject(exception);
      }
      if (resolve) {
        resolve(result);
      }
    };
    promise.inspect = inspect;
    if (inspect) {
      var inspected = inspect();
      if (inspected.state === 'rejected') {
        promise.exception = inspected.reason;
      }
      promise.valueOf = function () {
        var inspected = inspect();
        if (inspected.state === 'pending' || inspected.state === 'rejected') {
          return promise;
        }
        return inspected.value;
      };
    }
    return promise;
  }
  Promise.prototype.toString = function () {
    return '[object Promise]';
  };
  Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;
    function _fulfilled(value) {
      try {
        return typeof fulfilled === 'function' ? fulfilled(value) : value;
      } catch (exception) {
        return reject(exception);
      }
    }
    function _rejected(exception) {
      if (typeof rejected === 'function') {
        makeStackTraceLong(exception, self);
        try {
          return rejected(exception);
        } catch (newException) {
          return reject(newException);
        }
      }
      return reject(exception);
    }
    function _progressed(value) {
      return typeof progressed === 'function' ? progressed(value) : value;
    }
    nextTick(function () {
      self.promiseDispatch(function (value) {
        if (done) {
          return;
        }
        done = true;
        deferred.resolve(_fulfilled(value));
      }, 'when', [function (exception) {
          if (done) {
            return;
          }
          done = true;
          deferred.resolve(_rejected(exception));
        }]);
    });
    self.promiseDispatch(void 0, 'when', [
      void 0,
      function (value) {
        var newValue;
        var threw = false;
        try {
          newValue = _progressed(value);
        } catch (e) {
          threw = true;
          if (Q.onerror) {
            Q.onerror(e);
          } else {
            throw e;
          }
        }
        if (!threw) {
          deferred.notify(newValue);
        }
      }
    ]);
    return deferred.promise;
  };
  Q.when = when;
  function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
  }
  Promise.prototype.thenResolve = function (value) {
    return this.then(function () {
      return value;
    });
  };
  Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
  };
  Promise.prototype.thenReject = function (reason) {
    return this.then(function () {
      throw reason;
    });
  };
  Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
  };
  Q.nearer = nearer;
  function nearer(value) {
    if (isPromise(value)) {
      var inspected = value.inspect();
      if (inspected.state === 'fulfilled') {
        return inspected.value;
      }
    }
    return value;
  }
  Q.isPromise = isPromise;
  function isPromise(object) {
    return isObject(object) && typeof object.promiseDispatch === 'function' && typeof object.inspect === 'function';
  }
  Q.isPromiseAlike = isPromiseAlike;
  function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === 'function';
  }
  Q.isPending = isPending;
  function isPending(object) {
    return isPromise(object) && object.inspect().state === 'pending';
  }
  Promise.prototype.isPending = function () {
    return this.inspect().state === 'pending';
  };
  Q.isFulfilled = isFulfilled;
  function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === 'fulfilled';
  }
  Promise.prototype.isFulfilled = function () {
    return this.inspect().state === 'fulfilled';
  };
  Q.isRejected = isRejected;
  function isRejected(object) {
    return isPromise(object) && object.inspect().state === 'rejected';
  }
  Promise.prototype.isRejected = function () {
    return this.inspect().state === 'rejected';
  };
  var unhandledReasons = [];
  var unhandledRejections = [];
  var unhandledReasonsDisplayed = false;
  var trackUnhandledRejections = true;
  function displayUnhandledReasons() {
    if (!unhandledReasonsDisplayed && typeof window !== 'undefined' && window.console) {
      console.warn('[Q] Unhandled rejection reasons (should be empty):', unhandledReasons);
    }
    unhandledReasonsDisplayed = true;
  }
  function logUnhandledReasons() {
    for (var i = 0; i < unhandledReasons.length; i++) {
      var reason = unhandledReasons[i];
      console.warn('Unhandled rejection reason:', reason);
    }
  }
  function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;
    unhandledReasonsDisplayed = false;
    if (!trackUnhandledRejections) {
      trackUnhandledRejections = true;
      if (typeof process !== 'undefined' && process.on) {
        process.on('exit', logUnhandledReasons);
      }
    }
  }
  function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
      return;
    }
    unhandledRejections.push(promise);
    if (reason && typeof reason.stack !== 'undefined') {
      unhandledReasons.push(reason.stack);
    } else {
      unhandledReasons.push('(no stack) ' + reason);
    }
    displayUnhandledReasons();
  }
  function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
      return;
    }
    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
      unhandledRejections.splice(at, 1);
      unhandledReasons.splice(at, 1);
    }
  }
  Q.resetUnhandledRejections = resetUnhandledRejections;
  Q.getUnhandledReasons = function () {
    return unhandledReasons.slice();
  };
  Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    if (typeof process !== 'undefined' && process.on) {
      process.removeListener('exit', logUnhandledReasons);
    }
    trackUnhandledRejections = false;
  };
  resetUnhandledRejections();
  Q.reject = reject;
  function reject(reason) {
    var rejection = Promise({
        'when': function (rejected) {
          if (rejected) {
            untrackRejection(this);
          }
          return rejected ? rejected(reason) : this;
        }
      }, function fallback() {
        return this;
      }, function inspect() {
        return {
          state: 'rejected',
          reason: reason
        };
      });
    trackRejection(rejection, reason);
    return rejection;
  }
  Q.fulfill = fulfill;
  function fulfill(value) {
    return Promise({
      'when': function () {
        return value;
      },
      'get': function (name) {
        return value[name];
      },
      'set': function (name, rhs) {
        value[name] = rhs;
      },
      'delete': function (name) {
        delete value[name];
      },
      'post': function (name, args) {
        if (name === null || name === void 0) {
          return value.apply(void 0, args);
        } else {
          return value[name].apply(value, args);
        }
      },
      'apply': function (thisp, args) {
        return value.apply(thisp, args);
      },
      'keys': function () {
        return object_keys(value);
      }
    }, void 0, function inspect() {
      return {
        state: 'fulfilled',
        value: value
      };
    });
  }
  function coerce(promise) {
    var deferred = defer();
    nextTick(function () {
      try {
        promise.then(deferred.resolve, deferred.reject, deferred.notify);
      } catch (exception) {
        deferred.reject(exception);
      }
    });
    return deferred.promise;
  }
  Q.master = master;
  function master(object) {
    return Promise({
      'isDef': function () {
      }
    }, function fallback(op, args) {
      return dispatch(object, op, args);
    }, function () {
      return Q(object).inspect();
    });
  }
  Q.spread = spread;
  function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
  }
  Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
      return fulfilled.apply(void 0, array);
    }, rejected);
  };
  Q.async = async;
  function async(makeGenerator) {
    return function () {
      function continuer(verb, arg) {
        var result;
        if (hasES6Generators) {
          try {
            result = generator[verb](arg);
          } catch (exception) {
            return reject(exception);
          }
          if (result.done) {
            return result.value;
          } else {
            return when(result.value, callback, errback);
          }
        } else {
          try {
            result = generator[verb](arg);
          } catch (exception) {
            if (isStopIteration(exception)) {
              return exception.value;
            } else {
              return reject(exception);
            }
          }
          return when(result, callback, errback);
        }
      }
      var generator = makeGenerator.apply(this, arguments);
      var callback = continuer.bind(continuer, 'next');
      var errback = continuer.bind(continuer, 'throw');
      return callback();
    };
  }
  Q.spawn = spawn;
  function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
  }
  Q['return'] = _return;
  function _return(value) {
    throw new QReturnValue(value);
  }
  Q.promised = promised;
  function promised(callback) {
    return function () {
      return spread([
        this,
        all(arguments)
      ], function (self, args) {
        return callback.apply(self, args);
      });
    };
  }
  Q.dispatch = dispatch;
  function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
  }
  Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    nextTick(function () {
      self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
  };
  Q.get = function (object, key) {
    return Q(object).dispatch('get', [key]);
  };
  Promise.prototype.get = function (key) {
    return this.dispatch('get', [key]);
  };
  Q.set = function (object, key, value) {
    return Q(object).dispatch('set', [
      key,
      value
    ]);
  };
  Promise.prototype.set = function (key, value) {
    return this.dispatch('set', [
      key,
      value
    ]);
  };
  Q.del = Q['delete'] = function (object, key) {
    return Q(object).dispatch('delete', [key]);
  };
  Promise.prototype.del = Promise.prototype['delete'] = function (key) {
    return this.dispatch('delete', [key]);
  };
  Q.mapply = Q.post = function (object, name, args) {
    return Q(object).dispatch('post', [
      name,
      args
    ]);
  };
  Promise.prototype.mapply = Promise.prototype.post = function (name, args) {
    return this.dispatch('post', [
      name,
      args
    ]);
  };
  Q.send = Q.mcall = Q.invoke = function (object, name) {
    return Q(object).dispatch('post', [
      name,
      array_slice(arguments, 2)
    ]);
  };
  Promise.prototype.send = Promise.prototype.mcall = Promise.prototype.invoke = function (name) {
    return this.dispatch('post', [
      name,
      array_slice(arguments, 1)
    ]);
  };
  Q.fapply = function (object, args) {
    return Q(object).dispatch('apply', [
      void 0,
      args
    ]);
  };
  Promise.prototype.fapply = function (args) {
    return this.dispatch('apply', [
      void 0,
      args
    ]);
  };
  Q['try'] = Q.fcall = function (object) {
    return Q(object).dispatch('apply', [
      void 0,
      array_slice(arguments, 1)
    ]);
  };
  Promise.prototype.fcall = function () {
    return this.dispatch('apply', [
      void 0,
      array_slice(arguments)
    ]);
  };
  Q.fbind = function (object) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
      return promise.dispatch('apply', [
        this,
        args.concat(array_slice(arguments))
      ]);
    };
  };
  Promise.prototype.fbind = function () {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
      return promise.dispatch('apply', [
        this,
        args.concat(array_slice(arguments))
      ]);
    };
  };
  Q.keys = function (object) {
    return Q(object).dispatch('keys', []);
  };
  Promise.prototype.keys = function () {
    return this.dispatch('keys', []);
  };
  Q.all = all;
  function all(promises) {
    return when(promises, function (promises) {
      var countDown = 0;
      var deferred = defer();
      array_reduce(promises, function (undefined, promise, index) {
        var snapshot;
        if (isPromise(promise) && (snapshot = promise.inspect()).state === 'fulfilled') {
          promises[index] = snapshot.value;
        } else {
          ++countDown;
          when(promise, function (value) {
            promises[index] = value;
            if (--countDown === 0) {
              deferred.resolve(promises);
            }
          }, deferred.reject, function (progress) {
            deferred.notify({
              index: index,
              value: progress
            });
          });
        }
      }, void 0);
      if (countDown === 0) {
        deferred.resolve(promises);
      }
      return deferred.promise;
    });
  }
  Promise.prototype.all = function () {
    return all(this);
  };
  Q.allResolved = deprecate(allResolved, 'allResolved', 'allSettled');
  function allResolved(promises) {
    return when(promises, function (promises) {
      promises = array_map(promises, Q);
      return when(all(array_map(promises, function (promise) {
        return when(promise, noop, noop);
      })), function () {
        return promises;
      });
    });
  }
  Promise.prototype.allResolved = function () {
    return allResolved(this);
  };
  Q.allSettled = allSettled;
  function allSettled(promises) {
    return Q(promises).allSettled();
  }
  Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
      return all(array_map(promises, function (promise) {
        promise = Q(promise);
        function regardless() {
          return promise.inspect();
        }
        return promise.then(regardless, regardless);
      }));
    });
  };
  Q.fail = Q['catch'] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
  };
  Promise.prototype.fail = Promise.prototype['catch'] = function (rejected) {
    return this.then(void 0, rejected);
  };
  Q.progress = progress;
  function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
  }
  Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
  };
  Q.fin = Q['finally'] = function (object, callback) {
    return Q(object)['finally'](callback);
  };
  Promise.prototype.fin = Promise.prototype['finally'] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
      return callback.fcall().then(function () {
        return value;
      });
    }, function (reason) {
      return callback.fcall().then(function () {
        throw reason;
      });
    });
  };
  Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
  };
  Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
      nextTick(function () {
        makeStackTraceLong(error, promise);
        if (Q.onerror) {
          Q.onerror(error);
        } else {
          throw error;
        }
      });
    };
    var promise = fulfilled || rejected || progress ? this.then(fulfilled, rejected, progress) : this;
    if (typeof process === 'object' && process && process.domain) {
      onUnhandledError = process.domain.bind(onUnhandledError);
    }
    promise.then(void 0, onUnhandledError);
  };
  Q.timeout = function (object, ms, message) {
    return Q(object).timeout(ms, message);
  };
  Promise.prototype.timeout = function (ms, message) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        deferred.reject(new Error(message || 'Timed out after ' + ms + ' ms'));
      }, ms);
    this.then(function (value) {
      clearTimeout(timeoutId);
      deferred.resolve(value);
    }, function (exception) {
      clearTimeout(timeoutId);
      deferred.reject(exception);
    }, deferred.notify);
    return deferred.promise;
  };
  Q.delay = function (object, timeout) {
    if (timeout === void 0) {
      timeout = object;
      object = void 0;
    }
    return Q(object).delay(timeout);
  };
  Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
      var deferred = defer();
      setTimeout(function () {
        deferred.resolve(value);
      }, timeout);
      return deferred.promise;
    });
  };
  Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
  };
  Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
  };
  Q.nfcall = function (callback) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
  };
  Promise.prototype.nfcall = function () {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
  };
  Q.nfbind = Q.denodeify = function (callback) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
      var nodeArgs = baseArgs.concat(array_slice(arguments));
      var deferred = defer();
      nodeArgs.push(deferred.makeNodeResolver());
      Q(callback).fapply(nodeArgs).fail(deferred.reject);
      return deferred.promise;
    };
  };
  Promise.prototype.nfbind = Promise.prototype.denodeify = function () {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
  };
  Q.nbind = function (callback, thisp) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
      var nodeArgs = baseArgs.concat(array_slice(arguments));
      var deferred = defer();
      nodeArgs.push(deferred.makeNodeResolver());
      function bound() {
        return callback.apply(thisp, arguments);
      }
      Q(bound).fapply(nodeArgs).fail(deferred.reject);
      return deferred.promise;
    };
  };
  Promise.prototype.nbind = function () {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
  };
  Q.nmapply = Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
  };
  Promise.prototype.nmapply = Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch('post', [
      name,
      nodeArgs
    ]).fail(deferred.reject);
    return deferred.promise;
  };
  Q.nsend = Q.nmcall = Q.ninvoke = function (object, name) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch('post', [
      name,
      nodeArgs
    ]).fail(deferred.reject);
    return deferred.promise;
  };
  Promise.prototype.nsend = Promise.prototype.nmcall = Promise.prototype.ninvoke = function (name) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch('post', [
      name,
      nodeArgs
    ]).fail(deferred.reject);
    return deferred.promise;
  };
  Q.nodeify = nodeify;
  function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
  }
  Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
      this.then(function (value) {
        nextTick(function () {
          nodeback(null, value);
        });
      }, function (error) {
        nextTick(function () {
          nodeback(error);
        });
      });
    } else {
      return this;
    }
  };
  var qEndingLine = captureLine();
  return Q;
}));
(function (root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory(require('./punycode'), require('./IPv6'), require('./SecondLevelDomains'));
  } else if (typeof define === 'function' && define.amd) {
    define([
      './punycode',
      './IPv6',
      './SecondLevelDomains'
    ], factory);
  } else {
    root.URI = factory(root.punycode, root.IPv6, root.SecondLevelDomains, root);
  }
}(this, function (punycode, IPv6, SLD, root) {
  'use strict';
  var _URI = root && root.URI;
  function URI(url, base) {
    if (!(this instanceof URI)) {
      return new URI(url, base);
    }
    if (url === undefined) {
      if (typeof location !== 'undefined') {
        url = location.href + '';
      } else {
        url = '';
      }
    }
    this.href(url);
    if (base !== undefined) {
      return this.absoluteTo(base);
    }
    return this;
  }
  ;
  var p = URI.prototype;
  var hasOwn = Object.prototype.hasOwnProperty;
  function escapeRegEx(string) {
    return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
  }
  function getType(value) {
    if (value === undefined) {
      return 'Undefined';
    }
    return String(Object.prototype.toString.call(value)).slice(8, -1);
  }
  function isArray(obj) {
    return getType(obj) === 'Array';
  }
  function filterArrayValues(data, value) {
    var lookup = {};
    var i, length;
    if (isArray(value)) {
      for (i = 0, length = value.length; i < length; i++) {
        lookup[value[i]] = true;
      }
    } else {
      lookup[value] = true;
    }
    for (i = 0, length = data.length; i < length; i++) {
      if (lookup[data[i]] !== undefined) {
        data.splice(i, 1);
        length--;
        i--;
      }
    }
    return data;
  }
  function arrayContains(list, value) {
    var i, length;
    if (isArray(value)) {
      for (i = 0, length = value.length; i < length; i++) {
        if (!arrayContains(list, value[i])) {
          return false;
        }
      }
      return true;
    }
    var _type = getType(value);
    for (i = 0, length = list.length; i < length; i++) {
      if (_type === 'RegExp') {
        if (typeof list[i] === 'string' && list[i].match(value)) {
          return true;
        }
      } else if (list[i] === value) {
        return true;
      }
    }
    return false;
  }
  function arraysEqual(one, two) {
    if (!isArray(one) || !isArray(two)) {
      return false;
    }
    if (one.length !== two.length) {
      return false;
    }
    one.sort();
    two.sort();
    for (var i = 0, l = one.length; i < l; i++) {
      if (one[i] !== two[i]) {
        return false;
      }
    }
    return true;
  }
  URI._parts = function () {
    return {
      protocol: null,
      username: null,
      password: null,
      hostname: null,
      urn: null,
      port: null,
      path: null,
      query: null,
      fragment: null,
      duplicateQueryParameters: URI.duplicateQueryParameters,
      escapeQuerySpace: URI.escapeQuerySpace
    };
  };
  URI.duplicateQueryParameters = false;
  URI.escapeQuerySpace = true;
  URI.protocol_expression = /^[a-z][a-z0-9-+-]*$/i;
  URI.idn_expression = /[^a-z0-9\.-]/i;
  URI.punycode_expression = /(xn--)/i;
  URI.ip4_expression = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  URI.ip6_expression = /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;
  URI.find_uri_expression = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;
  URI.defaultPorts = {
    http: '80',
    https: '443',
    ftp: '21',
    gopher: '70',
    ws: '80',
    wss: '443'
  };
  URI.invalid_hostname_characters = /[^a-zA-Z0-9\.-]/;
  URI.domAttributes = {
    'a': 'href',
    'blockquote': 'cite',
    'link': 'href',
    'base': 'href',
    'script': 'src',
    'form': 'action',
    'img': 'src',
    'area': 'href',
    'iframe': 'src',
    'embed': 'src',
    'source': 'src',
    'track': 'src',
    'input': 'src'
  };
  URI.getDomAttribute = function (node) {
    if (!node || !node.nodeName) {
      return undefined;
    }
    var nodeName = node.nodeName.toLowerCase();
    if (nodeName === 'input' && node.type !== 'image') {
      return undefined;
    }
    return URI.domAttributes[nodeName];
  };
  function escapeForDumbFirefox36(value) {
    return escape(value);
  }
  function strictEncodeURIComponent(string) {
    return encodeURIComponent(string).replace(/[!'()*]/g, escapeForDumbFirefox36).replace(/\*/g, '%2A');
  }
  URI.encode = strictEncodeURIComponent;
  URI.decode = decodeURIComponent;
  URI.iso8859 = function () {
    URI.encode = escape;
    URI.decode = unescape;
  };
  URI.unicode = function () {
    URI.encode = strictEncodeURIComponent;
    URI.decode = decodeURIComponent;
  };
  URI.characters = {
    pathname: {
      encode: {
        expression: /%(24|26|2B|2C|3B|3D|3A|40)/gi,
        map: {
          '%24': '$',
          '%26': '&',
          '%2B': '+',
          '%2C': ',',
          '%3B': ';',
          '%3D': '=',
          '%3A': ':',
          '%40': '@'
        }
      },
      decode: {
        expression: /[\/\?#]/g,
        map: {
          '/': '%2F',
          '?': '%3F',
          '#': '%23'
        }
      }
    },
    reserved: {
      encode: {
        expression: /%(21|23|24|26|27|28|29|2A|2B|2C|2F|3A|3B|3D|3F|40|5B|5D)/gi,
        map: {
          '%3A': ':',
          '%2F': '/',
          '%3F': '?',
          '%23': '#',
          '%5B': '[',
          '%5D': ']',
          '%40': '@',
          '%21': '!',
          '%24': '$',
          '%26': '&',
          '%27': '\'',
          '%28': '(',
          '%29': ')',
          '%2A': '*',
          '%2B': '+',
          '%2C': ',',
          '%3B': ';',
          '%3D': '='
        }
      }
    }
  };
  URI.encodeQuery = function (string, escapeQuerySpace) {
    var escaped = URI.encode(string + '');
    return escapeQuerySpace ? escaped.replace(/%20/g, '+') : escaped;
  };
  URI.decodeQuery = function (string, escapeQuerySpace) {
    string += '';
    try {
      return URI.decode(escapeQuerySpace ? string.replace(/\+/g, '%20') : string);
    } catch (e) {
      return string;
    }
  };
  URI.recodePath = function (string) {
    var segments = (string + '').split('/');
    for (var i = 0, length = segments.length; i < length; i++) {
      segments[i] = URI.encodePathSegment(URI.decode(segments[i]));
    }
    return segments.join('/');
  };
  URI.decodePath = function (string) {
    var segments = (string + '').split('/');
    for (var i = 0, length = segments.length; i < length; i++) {
      segments[i] = URI.decodePathSegment(segments[i]);
    }
    return segments.join('/');
  };
  var _parts = {
      'encode': 'encode',
      'decode': 'decode'
    };
  var _part;
  var generateAccessor = function (_group, _part) {
    return function (string) {
      return URI[_part](string + '').replace(URI.characters[_group][_part].expression, function (c) {
        return URI.characters[_group][_part].map[c];
      });
    };
  };
  for (_part in _parts) {
    URI[_part + 'PathSegment'] = generateAccessor('pathname', _parts[_part]);
  }
  URI.encodeReserved = generateAccessor('reserved', 'encode');
  URI.parse = function (string, parts) {
    var pos;
    if (!parts) {
      parts = {};
    }
    pos = string.indexOf('#');
    if (pos > -1) {
      parts.fragment = string.substring(pos + 1) || null;
      string = string.substring(0, pos);
    }
    pos = string.indexOf('?');
    if (pos > -1) {
      parts.query = string.substring(pos + 1) || null;
      string = string.substring(0, pos);
    }
    if (string.substring(0, 2) === '//') {
      parts.protocol = null;
      string = string.substring(2);
      string = URI.parseAuthority(string, parts);
    } else {
      pos = string.indexOf(':');
      if (pos > -1) {
        parts.protocol = string.substring(0, pos) || null;
        if (parts.protocol && !parts.protocol.match(URI.protocol_expression)) {
          parts.protocol = undefined;
        } else if (parts.protocol === 'file') {
          string = string.substring(pos + 3);
        } else if (string.substring(pos + 1, pos + 3) === '//') {
          string = string.substring(pos + 3);
          string = URI.parseAuthority(string, parts);
        } else {
          string = string.substring(pos + 1);
          parts.urn = true;
        }
      }
    }
    parts.path = string;
    return parts;
  };
  URI.parseHost = function (string, parts) {
    var pos = string.indexOf('/');
    var bracketPos;
    var t;
    if (pos === -1) {
      pos = string.length;
    }
    if (string.charAt(0) === '[') {
      bracketPos = string.indexOf(']');
      parts.hostname = string.substring(1, bracketPos) || null;
      parts.port = string.substring(bracketPos + 2, pos) || null;
    } else if (string.indexOf(':') !== string.lastIndexOf(':')) {
      parts.hostname = string.substring(0, pos) || null;
      parts.port = null;
    } else {
      t = string.substring(0, pos).split(':');
      parts.hostname = t[0] || null;
      parts.port = t[1] || null;
    }
    if (parts.hostname && string.substring(pos).charAt(0) !== '/') {
      pos++;
      string = '/' + string;
    }
    return string.substring(pos) || '/';
  };
  URI.parseAuthority = function (string, parts) {
    string = URI.parseUserinfo(string, parts);
    return URI.parseHost(string, parts);
  };
  URI.parseUserinfo = function (string, parts) {
    var firstSlash = string.indexOf('/');
    var pos = firstSlash > -1 ? string.lastIndexOf('@', firstSlash) : string.indexOf('@');
    var t;
    if (pos > -1 && (firstSlash === -1 || pos < firstSlash)) {
      t = string.substring(0, pos).split(':');
      parts.username = t[0] ? URI.decode(t[0]) : null;
      t.shift();
      parts.password = t[0] ? URI.decode(t.join(':')) : null;
      string = string.substring(pos + 1);
    } else {
      parts.username = null;
      parts.password = null;
    }
    return string;
  };
  URI.parseQuery = function (string, escapeQuerySpace) {
    if (!string) {
      return {};
    }
    string = string.replace(/&+/g, '&').replace(/^\?*&*|&+$/g, '');
    if (!string) {
      return {};
    }
    var items = {};
    var splits = string.split('&');
    var length = splits.length;
    var v, name, value;
    for (var i = 0; i < length; i++) {
      v = splits[i].split('=');
      name = URI.decodeQuery(v.shift(), escapeQuerySpace);
      value = v.length ? URI.decodeQuery(v.join('='), escapeQuerySpace) : null;
      if (items[name]) {
        if (typeof items[name] === 'string') {
          items[name] = [items[name]];
        }
        items[name].push(value);
      } else {
        items[name] = value;
      }
    }
    return items;
  };
  URI.build = function (parts) {
    var t = '';
    if (parts.protocol) {
      t += parts.protocol + ':';
    }
    if (!parts.urn && (t || parts.hostname)) {
      t += '//';
    }
    t += URI.buildAuthority(parts) || '';
    if (typeof parts.path === 'string') {
      if (parts.path.charAt(0) !== '/' && typeof parts.hostname === 'string') {
        t += '/';
      }
      t += parts.path;
    }
    if (typeof parts.query === 'string' && parts.query) {
      t += '?' + parts.query;
    }
    if (typeof parts.fragment === 'string' && parts.fragment) {
      t += '#' + parts.fragment;
    }
    return t;
  };
  URI.buildHost = function (parts) {
    var t = '';
    if (!parts.hostname) {
      return '';
    } else if (URI.ip6_expression.test(parts.hostname)) {
      if (parts.port) {
        t += '[' + parts.hostname + ']:' + parts.port;
      } else {
        t += parts.hostname;
      }
    } else {
      t += parts.hostname;
      if (parts.port) {
        t += ':' + parts.port;
      }
    }
    return t;
  };
  URI.buildAuthority = function (parts) {
    return URI.buildUserinfo(parts) + URI.buildHost(parts);
  };
  URI.buildUserinfo = function (parts) {
    var t = '';
    if (parts.username) {
      t += URI.encode(parts.username);
      if (parts.password) {
        t += ':' + URI.encode(parts.password);
      }
      t += '@';
    }
    return t;
  };
  URI.buildQuery = function (data, duplicateQueryParameters, escapeQuerySpace) {
    var t = '';
    var unique, key, i, length;
    for (key in data) {
      if (hasOwn.call(data, key) && key) {
        if (isArray(data[key])) {
          unique = {};
          for (i = 0, length = data[key].length; i < length; i++) {
            if (data[key][i] !== undefined && unique[data[key][i] + ''] === undefined) {
              t += '&' + URI.buildQueryParameter(key, data[key][i], escapeQuerySpace);
              if (duplicateQueryParameters !== true) {
                unique[data[key][i] + ''] = true;
              }
            }
          }
        } else if (data[key] !== undefined) {
          t += '&' + URI.buildQueryParameter(key, data[key], escapeQuerySpace);
        }
      }
    }
    return t.substring(1);
  };
  URI.buildQueryParameter = function (name, value, escapeQuerySpace) {
    return URI.encodeQuery(name, escapeQuerySpace) + (value !== null ? '=' + URI.encodeQuery(value, escapeQuerySpace) : '');
  };
  URI.addQuery = function (data, name, value) {
    if (typeof name === 'object') {
      for (var key in name) {
        if (hasOwn.call(name, key)) {
          URI.addQuery(data, key, name[key]);
        }
      }
    } else if (typeof name === 'string') {
      if (data[name] === undefined) {
        data[name] = value;
        return;
      } else if (typeof data[name] === 'string') {
        data[name] = [data[name]];
      }
      if (!isArray(value)) {
        value = [value];
      }
      data[name] = data[name].concat(value);
    } else {
      throw new TypeError('URI.addQuery() accepts an object, string as the name parameter');
    }
  };
  URI.removeQuery = function (data, name, value) {
    var i, length, key;
    if (isArray(name)) {
      for (i = 0, length = name.length; i < length; i++) {
        data[name[i]] = undefined;
      }
    } else if (typeof name === 'object') {
      for (key in name) {
        if (hasOwn.call(name, key)) {
          URI.removeQuery(data, key, name[key]);
        }
      }
    } else if (typeof name === 'string') {
      if (value !== undefined) {
        if (data[name] === value) {
          data[name] = undefined;
        } else if (isArray(data[name])) {
          data[name] = filterArrayValues(data[name], value);
        }
      } else {
        data[name] = undefined;
      }
    } else {
      throw new TypeError('URI.addQuery() accepts an object, string as the first parameter');
    }
  };
  URI.hasQuery = function (data, name, value, withinArray) {
    if (typeof name === 'object') {
      for (var key in name) {
        if (hasOwn.call(name, key)) {
          if (!URI.hasQuery(data, key, name[key])) {
            return false;
          }
        }
      }
      return true;
    } else if (typeof name !== 'string') {
      throw new TypeError('URI.hasQuery() accepts an object, string as the name parameter');
    }
    switch (getType(value)) {
    case 'Undefined':
      return name in data;
    case 'Boolean':
      var _booly = Boolean(isArray(data[name]) ? data[name].length : data[name]);
      return value === _booly;
    case 'Function':
      return !!value(data[name], name, data);
    case 'Array':
      if (!isArray(data[name])) {
        return false;
      }
      var op = withinArray ? arrayContains : arraysEqual;
      return op(data[name], value);
    case 'RegExp':
      if (!isArray(data[name])) {
        return Boolean(data[name] && data[name].match(value));
      }
      if (!withinArray) {
        return false;
      }
      return arrayContains(data[name], value);
    case 'Number':
      value = String(value);
    case 'String':
      if (!isArray(data[name])) {
        return data[name] === value;
      }
      if (!withinArray) {
        return false;
      }
      return arrayContains(data[name], value);
    default:
      throw new TypeError('URI.hasQuery() accepts undefined, boolean, string, number, RegExp, Function as the value parameter');
    }
  };
  URI.commonPath = function (one, two) {
    var length = Math.min(one.length, two.length);
    var pos;
    for (pos = 0; pos < length; pos++) {
      if (one.charAt(pos) !== two.charAt(pos)) {
        pos--;
        break;
      }
    }
    if (pos < 1) {
      return one.charAt(0) === two.charAt(0) && one.charAt(0) === '/' ? '/' : '';
    }
    if (one.charAt(pos) !== '/' || two.charAt(pos) !== '/') {
      pos = one.substring(0, pos).lastIndexOf('/');
    }
    return one.substring(0, pos + 1);
  };
  URI.withinString = function (string, callback) {
    return string.replace(URI.find_uri_expression, callback);
  };
  URI.ensureValidHostname = function (v) {
    if (v.match(URI.invalid_hostname_characters)) {
      if (!punycode) {
        throw new TypeError('Hostname \'' + v + '\' contains characters other than [A-Z0-9.-] and Punycode.js is not available');
      }
      if (punycode.toASCII(v).match(URI.invalid_hostname_characters)) {
        throw new TypeError('Hostname \'' + v + '\' contains characters other than [A-Z0-9.-]');
      }
    }
  };
  URI.noConflict = function (removeAll) {
    if (removeAll) {
      var unconflicted = { URI: this.noConflict() };
      if (URITemplate && typeof URITemplate.noConflict == 'function') {
        unconflicted.URITemplate = URITemplate.noConflict();
      }
      if (IPv6 && typeof IPv6.noConflict == 'function') {
        unconflicted.IPv6 = IPv6.noConflict();
      }
      if (SecondLevelDomains && typeof SecondLevelDomains.noConflict == 'function') {
        unconflicted.SecondLevelDomains = SecondLevelDomains.noConflict();
      }
      return unconflicted;
    } else if (root.URI === this) {
      root.URI = _URI;
    }
    return this;
  };
  p.build = function (deferBuild) {
    if (deferBuild === true) {
      this._deferred_build = true;
    } else if (deferBuild === undefined || this._deferred_build) {
      this._string = URI.build(this._parts);
      this._deferred_build = false;
    }
    return this;
  };
  p.clone = function () {
    return new URI(this);
  };
  p.valueOf = p.toString = function () {
    return this.build(false)._string;
  };
  _parts = {
    protocol: 'protocol',
    username: 'username',
    password: 'password',
    hostname: 'hostname',
    port: 'port'
  };
  generateAccessor = function (_part) {
    return function (v, build) {
      if (v === undefined) {
        return this._parts[_part] || '';
      } else {
        this._parts[_part] = v || null;
        this.build(!build);
        return this;
      }
    };
  };
  for (_part in _parts) {
    p[_part] = generateAccessor(_parts[_part]);
  }
  _parts = {
    query: '?',
    fragment: '#'
  };
  generateAccessor = function (_part, _key) {
    return function (v, build) {
      if (v === undefined) {
        return this._parts[_part] || '';
      } else {
        if (v !== null) {
          v = v + '';
          if (v.charAt(0) === _key) {
            v = v.substring(1);
          }
        }
        this._parts[_part] = v;
        this.build(!build);
        return this;
      }
    };
  };
  for (_part in _parts) {
    p[_part] = generateAccessor(_part, _parts[_part]);
  }
  _parts = {
    search: [
      '?',
      'query'
    ],
    hash: [
      '#',
      'fragment'
    ]
  };
  generateAccessor = function (_part, _key) {
    return function (v, build) {
      var t = this[_part](v, build);
      return typeof t === 'string' && t.length ? _key + t : t;
    };
  };
  for (_part in _parts) {
    p[_part] = generateAccessor(_parts[_part][1], _parts[_part][0]);
  }
  p.pathname = function (v, build) {
    if (v === undefined || v === true) {
      var res = this._parts.path || (this._parts.hostname ? '/' : '');
      return v ? URI.decodePath(res) : res;
    } else {
      this._parts.path = v ? URI.recodePath(v) : '/';
      this.build(!build);
      return this;
    }
  };
  p.path = p.pathname;
  p.href = function (href, build) {
    var key;
    if (href === undefined) {
      return this.toString();
    }
    this._string = '';
    this._parts = URI._parts();
    var _URI = href instanceof URI;
    var _object = typeof href === 'object' && (href.hostname || href.path || href.pathname);
    if (href.nodeName) {
      var attribute = URI.getDomAttribute(href);
      href = href[attribute] || '';
      _object = false;
    }
    if (!_URI && _object && href.pathname !== undefined) {
      href = href.toString();
    }
    if (typeof href === 'string') {
      this._parts = URI.parse(href, this._parts);
    } else if (_URI || _object) {
      var src = _URI ? href._parts : href;
      for (key in src) {
        if (hasOwn.call(this._parts, key)) {
          this._parts[key] = src[key];
        }
      }
    } else {
      throw new TypeError('invalid input');
    }
    this.build(!build);
    return this;
  };
  p.is = function (what) {
    var ip = false;
    var ip4 = false;
    var ip6 = false;
    var name = false;
    var sld = false;
    var idn = false;
    var punycode = false;
    var relative = !this._parts.urn;
    if (this._parts.hostname) {
      relative = false;
      ip4 = URI.ip4_expression.test(this._parts.hostname);
      ip6 = URI.ip6_expression.test(this._parts.hostname);
      ip = ip4 || ip6;
      name = !ip;
      sld = name && SLD && SLD.has(this._parts.hostname);
      idn = name && URI.idn_expression.test(this._parts.hostname);
      punycode = name && URI.punycode_expression.test(this._parts.hostname);
    }
    switch (what.toLowerCase()) {
    case 'relative':
      return relative;
    case 'absolute':
      return !relative;
    case 'domain':
    case 'name':
      return name;
    case 'sld':
      return sld;
    case 'ip':
      return ip;
    case 'ip4':
    case 'ipv4':
    case 'inet4':
      return ip4;
    case 'ip6':
    case 'ipv6':
    case 'inet6':
      return ip6;
    case 'idn':
      return idn;
    case 'url':
      return !this._parts.urn;
    case 'urn':
      return !!this._parts.urn;
    case 'punycode':
      return punycode;
    }
    return null;
  };
  var _protocol = p.protocol;
  var _port = p.port;
  var _hostname = p.hostname;
  p.protocol = function (v, build) {
    if (v !== undefined) {
      if (v) {
        v = v.replace(/:(\/\/)?$/, '');
        if (v.match(/[^a-zA-z0-9\.+-]/)) {
          throw new TypeError('Protocol \'' + v + '\' contains characters other than [A-Z0-9.+-]');
        }
      }
    }
    return _protocol.call(this, v, build);
  };
  p.scheme = p.protocol;
  p.port = function (v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }
    if (v !== undefined) {
      if (v === 0) {
        v = null;
      }
      if (v) {
        v += '';
        if (v.charAt(0) === ':') {
          v = v.substring(1);
        }
        if (v.match(/[^0-9]/)) {
          throw new TypeError('Port \'' + v + '\' contains characters other than [0-9]');
        }
      }
    }
    return _port.call(this, v, build);
  };
  p.hostname = function (v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }
    if (v !== undefined) {
      var x = {};
      URI.parseHost(v, x);
      v = x.hostname;
    }
    return _hostname.call(this, v, build);
  };
  p.host = function (v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }
    if (v === undefined) {
      return this._parts.hostname ? URI.buildHost(this._parts) : '';
    } else {
      URI.parseHost(v, this._parts);
      this.build(!build);
      return this;
    }
  };
  p.authority = function (v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }
    if (v === undefined) {
      return this._parts.hostname ? URI.buildAuthority(this._parts) : '';
    } else {
      URI.parseAuthority(v, this._parts);
      this.build(!build);
      return this;
    }
  };
  p.userinfo = function (v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }
    if (v === undefined) {
      if (!this._parts.username) {
        return '';
      }
      var t = URI.buildUserinfo(this._parts);
      return t.substring(0, t.length - 1);
    } else {
      if (v[v.length - 1] !== '@') {
        v += '@';
      }
      URI.parseUserinfo(v, this._parts);
      this.build(!build);
      return this;
    }
  };
  p.resource = function (v, build) {
    var parts;
    if (v === undefined) {
      return this.path() + this.search() + this.hash();
    }
    parts = URI.parse(v);
    this._parts.path = parts.path;
    this._parts.query = parts.query;
    this._parts.fragment = parts.fragment;
    this.build(!build);
    return this;
  };
  p.subdomain = function (v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }
    if (v === undefined) {
      if (!this._parts.hostname || this.is('IP')) {
        return '';
      }
      var end = this._parts.hostname.length - this.domain().length - 1;
      return this._parts.hostname.substring(0, end) || '';
    } else {
      var e = this._parts.hostname.length - this.domain().length;
      var sub = this._parts.hostname.substring(0, e);
      var replace = new RegExp('^' + escapeRegEx(sub));
      if (v && v.charAt(v.length - 1) !== '.') {
        v += '.';
      }
      if (v) {
        URI.ensureValidHostname(v);
      }
      this._parts.hostname = this._parts.hostname.replace(replace, v);
      this.build(!build);
      return this;
    }
  };
  p.domain = function (v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }
    if (typeof v === 'boolean') {
      build = v;
      v = undefined;
    }
    if (v === undefined) {
      if (!this._parts.hostname || this.is('IP')) {
        return '';
      }
      var t = this._parts.hostname.match(/\./g);
      if (t && t.length < 2) {
        return this._parts.hostname;
      }
      var end = this._parts.hostname.length - this.tld(build).length - 1;
      end = this._parts.hostname.lastIndexOf('.', end - 1) + 1;
      return this._parts.hostname.substring(end) || '';
    } else {
      if (!v) {
        throw new TypeError('cannot set domain empty');
      }
      URI.ensureValidHostname(v);
      if (!this._parts.hostname || this.is('IP')) {
        this._parts.hostname = v;
      } else {
        var replace = new RegExp(escapeRegEx(this.domain()) + '$');
        this._parts.hostname = this._parts.hostname.replace(replace, v);
      }
      this.build(!build);
      return this;
    }
  };
  p.tld = function (v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }
    if (typeof v === 'boolean') {
      build = v;
      v = undefined;
    }
    if (v === undefined) {
      if (!this._parts.hostname || this.is('IP')) {
        return '';
      }
      var pos = this._parts.hostname.lastIndexOf('.');
      var tld = this._parts.hostname.substring(pos + 1);
      if (build !== true && SLD && SLD.list[tld.toLowerCase()]) {
        return SLD.get(this._parts.hostname) || tld;
      }
      return tld;
    } else {
      var replace;
      if (!v) {
        throw new TypeError('cannot set TLD empty');
      } else if (v.match(/[^a-zA-Z0-9-]/)) {
        if (SLD && SLD.is(v)) {
          replace = new RegExp(escapeRegEx(this.tld()) + '$');
          this._parts.hostname = this._parts.hostname.replace(replace, v);
        } else {
          throw new TypeError('TLD \'' + v + '\' contains characters other than [A-Z0-9]');
        }
      } else if (!this._parts.hostname || this.is('IP')) {
        throw new ReferenceError('cannot set TLD on non-domain host');
      } else {
        replace = new RegExp(escapeRegEx(this.tld()) + '$');
        this._parts.hostname = this._parts.hostname.replace(replace, v);
      }
      this.build(!build);
      return this;
    }
  };
  p.directory = function (v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }
    if (v === undefined || v === true) {
      if (!this._parts.path && !this._parts.hostname) {
        return '';
      }
      if (this._parts.path === '/') {
        return '/';
      }
      var end = this._parts.path.length - this.filename().length - 1;
      var res = this._parts.path.substring(0, end) || (this._parts.hostname ? '/' : '');
      return v ? URI.decodePath(res) : res;
    } else {
      var e = this._parts.path.length - this.filename().length;
      var directory = this._parts.path.substring(0, e);
      var replace = new RegExp('^' + escapeRegEx(directory));
      if (!this.is('relative')) {
        if (!v) {
          v = '/';
        }
        if (v.charAt(0) !== '/') {
          v = '/' + v;
        }
      }
      if (v && v.charAt(v.length - 1) !== '/') {
        v += '/';
      }
      v = URI.recodePath(v);
      this._parts.path = this._parts.path.replace(replace, v);
      this.build(!build);
      return this;
    }
  };
  p.filename = function (v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }
    if (v === undefined || v === true) {
      if (!this._parts.path || this._parts.path === '/') {
        return '';
      }
      var pos = this._parts.path.lastIndexOf('/');
      var res = this._parts.path.substring(pos + 1);
      return v ? URI.decodePathSegment(res) : res;
    } else {
      var mutatedDirectory = false;
      if (v.charAt(0) === '/') {
        v = v.substring(1);
      }
      if (v.match(/\.?\//)) {
        mutatedDirectory = true;
      }
      var replace = new RegExp(escapeRegEx(this.filename()) + '$');
      v = URI.recodePath(v);
      this._parts.path = this._parts.path.replace(replace, v);
      if (mutatedDirectory) {
        this.normalizePath(build);
      } else {
        this.build(!build);
      }
      return this;
    }
  };
  p.suffix = function (v, build) {
    if (this._parts.urn) {
      return v === undefined ? '' : this;
    }
    if (v === undefined || v === true) {
      if (!this._parts.path || this._parts.path === '/') {
        return '';
      }
      var filename = this.filename();
      var pos = filename.lastIndexOf('.');
      var s, res;
      if (pos === -1) {
        return '';
      }
      s = filename.substring(pos + 1);
      res = /^[a-z0-9%]+$/i.test(s) ? s : '';
      return v ? URI.decodePathSegment(res) : res;
    } else {
      if (v.charAt(0) === '.') {
        v = v.substring(1);
      }
      var suffix = this.suffix();
      var replace;
      if (!suffix) {
        if (!v) {
          return this;
        }
        this._parts.path += '.' + URI.recodePath(v);
      } else if (!v) {
        replace = new RegExp(escapeRegEx('.' + suffix) + '$');
      } else {
        replace = new RegExp(escapeRegEx(suffix) + '$');
      }
      if (replace) {
        v = URI.recodePath(v);
        this._parts.path = this._parts.path.replace(replace, v);
      }
      this.build(!build);
      return this;
    }
  };
  p.segment = function (segment, v, build) {
    var separator = this._parts.urn ? ':' : '/';
    var path = this.path();
    var absolute = path.substring(0, 1) === '/';
    var segments = path.split(separator);
    if (segment !== undefined && typeof segment !== 'number') {
      build = v;
      v = segment;
      segment = undefined;
    }
    if (segment !== undefined && typeof segment !== 'number') {
      throw new Error('Bad segment \'' + segment + '\', must be 0-based integer');
    }
    if (absolute) {
      segments.shift();
    }
    if (segment < 0) {
      segment = Math.max(segments.length + segment, 0);
    }
    if (v === undefined) {
      return segment === undefined ? segments : segments[segment];
    } else if (segment === null || segments[segment] === undefined) {
      if (isArray(v)) {
        segments = [];
        for (var i = 0, l = v.length; i < l; i++) {
          if (!v[i].length && (!segments.length || !segments[segments.length - 1].length)) {
            continue;
          }
          if (segments.length && !segments[segments.length - 1].length) {
            segments.pop();
          }
          segments.push(v[i]);
        }
      } else if (v || typeof v === 'string') {
        if (segments[segments.length - 1] === '') {
          segments[segments.length - 1] = v;
        } else {
          segments.push(v);
        }
      }
    } else {
      if (v || typeof v === 'string' && v.length) {
        segments[segment] = v;
      } else {
        segments.splice(segment, 1);
      }
    }
    if (absolute) {
      segments.unshift('');
    }
    return this.path(segments.join(separator), build);
  };
  p.segmentCoded = function (segment, v, build) {
    var segments, i, l;
    if (typeof segment !== 'number') {
      build = v;
      v = segment;
      segment = undefined;
    }
    if (v === undefined) {
      segments = this.segment(segment, v, build);
      if (!isArray(segments)) {
        segments = segments !== undefined ? URI.decode(segments) : undefined;
      } else {
        for (i = 0, l = segments.length; i < l; i++) {
          segments[i] = URI.decode(segments[i]);
        }
      }
      return segments;
    }
    if (!isArray(v)) {
      v = typeof v === 'string' ? URI.encode(v) : v;
    } else {
      for (i = 0, l = v.length; i < l; i++) {
        v[i] = URI.decode(v[i]);
      }
    }
    return this.segment(segment, v, build);
  };
  var q = p.query;
  p.query = function (v, build) {
    if (v === true) {
      return URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    } else if (typeof v === 'function') {
      var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
      var result = v.call(this, data);
      this._parts.query = URI.buildQuery(result || data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
      this.build(!build);
      return this;
    } else if (v !== undefined && typeof v !== 'string') {
      this._parts.query = URI.buildQuery(v, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
      this.build(!build);
      return this;
    } else {
      return q.call(this, v, build);
    }
  };
  p.setQuery = function (name, value, build) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    if (typeof name === 'object') {
      for (var key in name) {
        if (hasOwn.call(name, key)) {
          data[key] = name[key];
        }
      }
    } else if (typeof name === 'string') {
      data[name] = value !== undefined ? value : null;
    } else {
      throw new TypeError('URI.addQuery() accepts an object, string as the name parameter');
    }
    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
    if (typeof name !== 'string') {
      build = value;
    }
    this.build(!build);
    return this;
  };
  p.addQuery = function (name, value, build) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    URI.addQuery(data, name, value === undefined ? null : value);
    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
    if (typeof name !== 'string') {
      build = value;
    }
    this.build(!build);
    return this;
  };
  p.removeQuery = function (name, value, build) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    URI.removeQuery(data, name, value);
    this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
    if (typeof name !== 'string') {
      build = value;
    }
    this.build(!build);
    return this;
  };
  p.hasQuery = function (name, value, withinArray) {
    var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
    return URI.hasQuery(data, name, value, withinArray);
  };
  p.setSearch = p.setQuery;
  p.addSearch = p.addQuery;
  p.removeSearch = p.removeQuery;
  p.hasSearch = p.hasQuery;
  p.normalize = function () {
    if (this._parts.urn) {
      return this.normalizeProtocol(false).normalizeQuery(false).normalizeFragment(false).build();
    }
    return this.normalizeProtocol(false).normalizeHostname(false).normalizePort(false).normalizePath(false).normalizeQuery(false).normalizeFragment(false).build();
  };
  p.normalizeProtocol = function (build) {
    if (typeof this._parts.protocol === 'string') {
      this._parts.protocol = this._parts.protocol.toLowerCase();
      this.build(!build);
    }
    return this;
  };
  p.normalizeHostname = function (build) {
    if (this._parts.hostname) {
      if (this.is('IDN') && punycode) {
        this._parts.hostname = punycode.toASCII(this._parts.hostname);
      } else if (this.is('IPv6') && IPv6) {
        this._parts.hostname = IPv6.best(this._parts.hostname);
      }
      this._parts.hostname = this._parts.hostname.toLowerCase();
      this.build(!build);
    }
    return this;
  };
  p.normalizePort = function (build) {
    if (typeof this._parts.protocol === 'string' && this._parts.port === URI.defaultPorts[this._parts.protocol]) {
      this._parts.port = null;
      this.build(!build);
    }
    return this;
  };
  p.normalizePath = function (build) {
    if (this._parts.urn) {
      return this;
    }
    if (!this._parts.path || this._parts.path === '/') {
      return this;
    }
    var _was_relative;
    var _path = this._parts.path;
    var _parent, _pos;
    if (_path.charAt(0) !== '/') {
      _was_relative = true;
      _path = '/' + _path;
    }
    _path = _path.replace(/(\/(\.\/)+)|(\/\.$)/g, '/').replace(/\/{2,}/g, '/');
    while (true) {
      _parent = _path.indexOf('/../');
      if (_parent === -1) {
        break;
      } else if (_parent === 0) {
        _path = _path.substring(3);
        break;
      }
      _pos = _path.substring(0, _parent).lastIndexOf('/');
      if (_pos === -1) {
        _pos = _parent;
      }
      _path = _path.substring(0, _pos) + _path.substring(_parent + 3);
    }
    if (_was_relative && this.is('relative')) {
      _path = _path.substring(1);
    }
    _path = URI.recodePath(_path);
    this._parts.path = _path;
    this.build(!build);
    return this;
  };
  p.normalizePathname = p.normalizePath;
  p.normalizeQuery = function (build) {
    if (typeof this._parts.query === 'string') {
      if (!this._parts.query.length) {
        this._parts.query = null;
      } else {
        this.query(URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace));
      }
      this.build(!build);
    }
    return this;
  };
  p.normalizeFragment = function (build) {
    if (!this._parts.fragment) {
      this._parts.fragment = null;
      this.build(!build);
    }
    return this;
  };
  p.normalizeSearch = p.normalizeQuery;
  p.normalizeHash = p.normalizeFragment;
  p.iso8859 = function () {
    var e = URI.encode;
    var d = URI.decode;
    URI.encode = escape;
    URI.decode = decodeURIComponent;
    this.normalize();
    URI.encode = e;
    URI.decode = d;
    return this;
  };
  p.unicode = function () {
    var e = URI.encode;
    var d = URI.decode;
    URI.encode = strictEncodeURIComponent;
    URI.decode = unescape;
    this.normalize();
    URI.encode = e;
    URI.decode = d;
    return this;
  };
  p.readable = function () {
    var uri = this.clone();
    uri.username('').password('').normalize();
    var t = '';
    if (uri._parts.protocol) {
      t += uri._parts.protocol + '://';
    }
    if (uri._parts.hostname) {
      if (uri.is('punycode') && punycode) {
        t += punycode.toUnicode(uri._parts.hostname);
        if (uri._parts.port) {
          t += ':' + uri._parts.port;
        }
      } else {
        t += uri.host();
      }
    }
    if (uri._parts.hostname && uri._parts.path && uri._parts.path.charAt(0) !== '/') {
      t += '/';
    }
    t += uri.path(true);
    if (uri._parts.query) {
      var q = '';
      for (var i = 0, qp = uri._parts.query.split('&'), l = qp.length; i < l; i++) {
        var kv = (qp[i] || '').split('=');
        q += '&' + URI.decodeQuery(kv[0], this._parts.escapeQuerySpace).replace(/&/g, '%26');
        if (kv[1] !== undefined) {
          q += '=' + URI.decodeQuery(kv[1], this._parts.escapeQuerySpace).replace(/&/g, '%26');
        }
      }
      t += '?' + q.substring(1);
    }
    t += URI.decodeQuery(uri.hash(), true);
    return t;
  };
  p.absoluteTo = function (base) {
    var resolved = this.clone();
    var properties = [
        'protocol',
        'username',
        'password',
        'hostname',
        'port'
      ];
    var basedir, i, p;
    if (this._parts.urn) {
      throw new Error('URNs do not have any generally defined hierarchical components');
    }
    if (!(base instanceof URI)) {
      base = new URI(base);
    }
    if (!resolved._parts.protocol) {
      resolved._parts.protocol = base._parts.protocol;
    }
    if (this._parts.hostname) {
      return resolved;
    }
    for (i = 0; p = properties[i]; i++) {
      resolved._parts[p] = base._parts[p];
    }
    properties = [
      'query',
      'path'
    ];
    for (i = 0; p = properties[i]; i++) {
      if (!resolved._parts[p] && base._parts[p]) {
        resolved._parts[p] = base._parts[p];
      }
    }
    if (resolved.path().charAt(0) !== '/') {
      basedir = base.directory();
      resolved._parts.path = (basedir ? basedir + '/' : '') + resolved._parts.path;
      resolved.normalizePath();
    }
    resolved.build();
    return resolved;
  };
  p.relativeTo = function (base) {
    var relative = this.clone().normalize();
    var relativeParts, baseParts, common, relativePath, basePath;
    if (relative._parts.urn) {
      throw new Error('URNs do not have any generally defined hierarchical components');
    }
    base = new URI(base).normalize();
    relativeParts = relative._parts;
    baseParts = base._parts;
    relativePath = relative.path();
    basePath = base.path();
    if (relativePath.charAt(0) !== '/') {
      throw new Error('URI is already relative');
    }
    if (basePath.charAt(0) !== '/') {
      throw new Error('Cannot calculate a URI relative to another relative URI');
    }
    if (relativeParts.protocol === baseParts.protocol) {
      relativeParts.protocol = null;
    }
    if (relativeParts.username !== baseParts.username || relativeParts.password !== baseParts.password) {
      return relative.build();
    }
    if (relativeParts.protocol !== null || relativeParts.username !== null || relativeParts.password !== null) {
      return relative.build();
    }
    if (relativeParts.hostname === baseParts.hostname && relativeParts.port === baseParts.port) {
      relativeParts.hostname = null;
      relativeParts.port = null;
    } else {
      return relative.build();
    }
    if (relativePath === basePath) {
      relativeParts.path = '';
      return relative.build();
    }
    common = URI.commonPath(relative.path(), base.path());
    if (!common) {
      return relative.build();
    }
    var parents = baseParts.path.substring(common.length).replace(/[^\/]*$/, '').replace(/.*?\//g, '../');
    relativeParts.path = parents + relativeParts.path.substring(common.length);
    return relative.build();
  };
  p.equals = function (uri) {
    var one = this.clone();
    var two = new URI(uri);
    var one_map = {};
    var two_map = {};
    var checked = {};
    var one_query, two_query, key;
    one.normalize();
    two.normalize();
    if (one.toString() === two.toString()) {
      return true;
    }
    one_query = one.query();
    two_query = two.query();
    one.query('');
    two.query('');
    if (one.toString() !== two.toString()) {
      return false;
    }
    if (one_query.length !== two_query.length) {
      return false;
    }
    one_map = URI.parseQuery(one_query, this._parts.escapeQuerySpace);
    two_map = URI.parseQuery(two_query, this._parts.escapeQuerySpace);
    for (key in one_map) {
      if (hasOwn.call(one_map, key)) {
        if (!isArray(one_map[key])) {
          if (one_map[key] !== two_map[key]) {
            return false;
          }
        } else if (!arraysEqual(one_map[key], two_map[key])) {
          return false;
        }
        checked[key] = true;
      }
    }
    for (key in two_map) {
      if (hasOwn.call(two_map, key)) {
        if (!checked[key]) {
          return false;
        }
      }
    }
    return true;
  };
  p.duplicateQueryParameters = function (v) {
    this._parts.duplicateQueryParameters = !!v;
    return this;
  };
  p.escapeQuerySpace = function (v) {
    this._parts.escapeQuerySpace = !!v;
    return this;
  };
  return URI;
}));
(function (root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory(require('./URI'));
  } else if (typeof define === 'function' && define.amd) {
    define(['./URI'], factory);
  } else {
    root.URITemplate = factory(root.URI, root);
  }
}(this, function (URI, root) {
  'use strict';
  var _URITemplate = root && root.URITemplate;
  var hasOwn = Object.prototype.hasOwnProperty;
  function URITemplate(expression) {
    if (URITemplate._cache[expression]) {
      return URITemplate._cache[expression];
    }
    if (!(this instanceof URITemplate)) {
      return new URITemplate(expression);
    }
    this.expression = expression;
    URITemplate._cache[expression] = this;
    return this;
  }
  function Data(data) {
    this.data = data;
    this.cache = {};
  }
  var p = URITemplate.prototype;
  var operators = {
      '': {
        prefix: '',
        separator: ',',
        named: false,
        empty_name_separator: false,
        encode: 'encode'
      },
      '+': {
        prefix: '',
        separator: ',',
        named: false,
        empty_name_separator: false,
        encode: 'encodeReserved'
      },
      '#': {
        prefix: '#',
        separator: ',',
        named: false,
        empty_name_separator: false,
        encode: 'encodeReserved'
      },
      '.': {
        prefix: '.',
        separator: '.',
        named: false,
        empty_name_separator: false,
        encode: 'encode'
      },
      '/': {
        prefix: '/',
        separator: '/',
        named: false,
        empty_name_separator: false,
        encode: 'encode'
      },
      ';': {
        prefix: ';',
        separator: ';',
        named: true,
        empty_name_separator: false,
        encode: 'encode'
      },
      '?': {
        prefix: '?',
        separator: '&',
        named: true,
        empty_name_separator: true,
        encode: 'encode'
      },
      '&': {
        prefix: '&',
        separator: '&',
        named: true,
        empty_name_separator: true,
        encode: 'encode'
      }
    };
  URITemplate._cache = {};
  URITemplate.EXPRESSION_PATTERN = /\{([^a-zA-Z0-9%_]?)([^\}]+)(\}|$)/g;
  URITemplate.VARIABLE_PATTERN = /^([^*:]+)((\*)|:(\d+))?$/;
  URITemplate.VARIABLE_NAME_PATTERN = /[^a-zA-Z0-9%_]/;
  URITemplate.expand = function (expression, data) {
    var options = operators[expression.operator];
    var type = options.named ? 'Named' : 'Unnamed';
    var variables = expression.variables;
    var buffer = [];
    var d, variable, i, l, value;
    for (i = 0; variable = variables[i]; i++) {
      d = data.get(variable.name);
      if (!d.val.length) {
        if (d.type) {
          buffer.push('');
        }
        continue;
      }
      buffer.push(URITemplate['expand' + type](d, options, variable.explode, variable.explode && options.separator || ',', variable.maxlength, variable.name));
    }
    if (buffer.length) {
      return options.prefix + buffer.join(options.separator);
    } else {
      return '';
    }
  };
  URITemplate.expandNamed = function (d, options, explode, separator, length, name) {
    var result = '';
    var encode = options.encode;
    var empty_name_separator = options.empty_name_separator;
    var _encode = !d[encode].length;
    var _name = d.type === 2 ? '' : URI[encode](name);
    var _value, i, l;
    for (i = 0, l = d.val.length; i < l; i++) {
      if (length) {
        _value = URI[encode](d.val[i][1].substring(0, length));
        if (d.type === 2) {
          _name = URI[encode](d.val[i][0].substring(0, length));
        }
      } else if (_encode) {
        _value = URI[encode](d.val[i][1]);
        if (d.type === 2) {
          _name = URI[encode](d.val[i][0]);
          d[encode].push([
            _name,
            _value
          ]);
        } else {
          d[encode].push([
            undefined,
            _value
          ]);
        }
      } else {
        _value = d[encode][i][1];
        if (d.type === 2) {
          _name = d[encode][i][0];
        }
      }
      if (result) {
        result += separator;
      }
      if (!explode) {
        if (!i) {
          result += URI[encode](name) + (empty_name_separator || _value ? '=' : '');
        }
        if (d.type === 2) {
          result += _name + ',';
        }
        result += _value;
      } else {
        result += _name + (empty_name_separator || _value ? '=' : '') + _value;
      }
    }
    return result;
  };
  URITemplate.expandUnnamed = function (d, options, explode, separator, length, name) {
    var result = '';
    var encode = options.encode;
    var empty_name_separator = options.empty_name_separator;
    var _encode = !d[encode].length;
    var _name, _value, i, l;
    for (i = 0, l = d.val.length; i < l; i++) {
      if (length) {
        _value = URI[encode](d.val[i][1].substring(0, length));
      } else if (_encode) {
        _value = URI[encode](d.val[i][1]);
        d[encode].push([
          d.type === 2 ? URI[encode](d.val[i][0]) : undefined,
          _value
        ]);
      } else {
        _value = d[encode][i][1];
      }
      if (result) {
        result += separator;
      }
      if (d.type === 2) {
        if (length) {
          _name = URI[encode](d.val[i][0].substring(0, length));
        } else {
          _name = d[encode][i][0];
        }
        result += _name;
        if (explode) {
          result += empty_name_separator || _value ? '=' : '';
        } else {
          result += ',';
        }
      }
      result += _value;
    }
    return result;
  };
  URITemplate.noConflict = function () {
    if (root.URITemplate === URITemplate) {
      root.URITemplate = _URITemplate;
    }
    return URITemplate;
  };
  p.expand = function (data) {
    var result = '';
    if (!this.parts || !this.parts.length) {
      this.parse();
    }
    if (!(data instanceof Data)) {
      data = new Data(data);
    }
    for (var i = 0, l = this.parts.length; i < l; i++) {
      result += typeof this.parts[i] === 'string' ? this.parts[i] : URITemplate.expand(this.parts[i], data);
    }
    return result;
  };
  p.parse = function () {
    var expression = this.expression;
    var ePattern = URITemplate.EXPRESSION_PATTERN;
    var vPattern = URITemplate.VARIABLE_PATTERN;
    var nPattern = URITemplate.VARIABLE_NAME_PATTERN;
    var parts = [];
    var pos = 0;
    var variables, eMatch, vMatch;
    ePattern.lastIndex = 0;
    while (true) {
      eMatch = ePattern.exec(expression);
      if (eMatch === null) {
        parts.push(expression.substring(pos));
        break;
      } else {
        parts.push(expression.substring(pos, eMatch.index));
        pos = eMatch.index + eMatch[0].length;
      }
      if (!operators[eMatch[1]]) {
        throw new Error('Unknown Operator "' + eMatch[1] + '" in "' + eMatch[0] + '"');
      } else if (!eMatch[3]) {
        throw new Error('Unclosed Expression "' + eMatch[0] + '"');
      }
      variables = eMatch[2].split(',');
      for (var i = 0, l = variables.length; i < l; i++) {
        vMatch = variables[i].match(vPattern);
        if (vMatch === null) {
          throw new Error('Invalid Variable "' + variables[i] + '" in "' + eMatch[0] + '"');
        } else if (vMatch[1].match(nPattern)) {
          throw new Error('Invalid Variable Name "' + vMatch[1] + '" in "' + eMatch[0] + '"');
        }
        variables[i] = {
          name: vMatch[1],
          explode: !!vMatch[3],
          maxlength: vMatch[4] && parseInt(vMatch[4], 10)
        };
      }
      if (!variables.length) {
        throw new Error('Expression Missing Variable(s) "' + eMatch[0] + '"');
      }
      parts.push({
        expression: eMatch[0],
        operator: eMatch[1],
        variables: variables
      });
    }
    if (!parts.length) {
      parts.push(expression);
    }
    this.parts = parts;
    return this;
  };
  Data.prototype.get = function (key) {
    var data = this.data;
    var d = {
        type: 0,
        val: [],
        encode: [],
        encodeReserved: []
      };
    var i, l, value;
    if (this.cache[key] !== undefined) {
      return this.cache[key];
    }
    this.cache[key] = d;
    if (String(Object.prototype.toString.call(data)) === '[object Function]') {
      value = data(key);
    } else if (String(Object.prototype.toString.call(data[key])) === '[object Function]') {
      value = data[key](key);
    } else {
      value = data[key];
    }
    if (value === undefined || value === null) {
      return d;
    } else if (String(Object.prototype.toString.call(value)) === '[object Array]') {
      for (i = 0, l = value.length; i < l; i++) {
        if (value[i] !== undefined && value[i] !== null) {
          d.val.push([
            undefined,
            String(value[i])
          ]);
        }
      }
      if (d.val.length) {
        d.type = 3;
      }
    } else if (String(Object.prototype.toString.call(value)) === '[object Object]') {
      for (i in value) {
        if (hasOwn.call(value, i) && value[i] !== undefined && value[i] !== null) {
          d.val.push([
            i,
            String(value[i])
          ]);
        }
      }
      if (d.val.length) {
        d.type = 2;
      }
    } else {
      d.type = 1;
      d.val.push([
        undefined,
        String(value)
      ]);
    }
    return d;
  };
  URI.expand = function (expression, data) {
    var template = new URITemplate(expression);
    var expansion = template.expand(data);
    return new URI(expansion);
  };
  return URITemplate;
}));
(function () {
  var define, requireModule;
  (function () {
    'use strict';
    var registry = {}, seen = {};
    define = function (name, deps, callback) {
      registry[name] = {
        deps: deps,
        callback: callback
      };
    };
    requireModule = function (name) {
      if (seen[name]) {
        return seen[name];
      }
      seen[name] = {};
      var mod = registry[name], deps = mod.deps, callback = mod.callback, reified = [], exports;
      for (var i = 0, l = deps.length; i < l; i++) {
        if (deps[i] === 'exports') {
          reified.push(exports = {});
        } else {
          reified.push(requireModule(deps[i]));
        }
      }
      var value = callback.apply(this, reified);
      return seen[name] = exports || value;
    };
  }());
  define('hyperagent', [
    'hyperagent/resource',
    'hyperagent/properties',
    'hyperagent/curie',
    'hyperagent/config',
    'exports'
  ], function (__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    'use strict';
    var Resource = __dependency1__.Resource;
    var LazyResource = __dependency1__.LazyResource;
    var LinkResource = __dependency1__.LinkResource;
    var Properties = __dependency2__.Properties;
    var CurieStore = __dependency3__.CurieStore;
    var _config = __dependency4__.config;
    function configure(name, value) {
      _config[name] = value;
    }
    __exports__.Resource = Resource;
    __exports__.Properties = Properties;
    __exports__.LazyResource = LazyResource;
    __exports__.LinkResource = LinkResource;
    __exports__.CurieStore = CurieStore;
    __exports__.configure = configure;
    __exports__._config = _config;
  });
  define('hyperagent/config', [
    'hyperagent/miniscore',
    'exports'
  ], function (__dependency1__, __exports__) {
    'use strict';
    var _ = __dependency1__._;
    var config = {};
    if (typeof window !== 'undefined') {
      config.ajax = window.$ && window.$.ajax.bind(window.$);
      config.defer = window.Q && window.Q.defer;
      config._ = _;
      config.loadHooks = [];
    }
    __exports__.config = config;
  });
  define('hyperagent/curie', ['exports'], function (__exports__) {
    'use strict';
    function CurieStore() {
      this._store = {};
    }
    CurieStore.prototype.register = function register(key, value) {
      this._store[key] = URITemplate(value);
    };
    CurieStore._split = function (value) {
      var index = value.indexOf(':');
      var curie = value.substring(0, index);
      var ref = value.substring(index + 1);
      if (value === -1 || value === value.length - 1) {
        return null;
      }
      return [
        curie,
        ref
      ];
    };
    CurieStore.prototype.empty = function empty() {
      return Object.keys(this._store).length === 0;
    };
    CurieStore.prototype.expand = function expand(value) {
      var template;
      var curie = CurieStore._split(value);
      if (!curie) {
        return value;
      }
      template = this._store[curie[0]];
      if (template === undefined) {
        return value;
      }
      return template.expand({ rel: curie[1] });
    };
    CurieStore.prototype.canExpand = function canExpand(value) {
      var curie = CurieStore._split(value);
      if (!curie) {
        return false;
      }
      return this._store[curie[0]] !== undefined;
    };
    __exports__.CurieStore = CurieStore;
  });
  define('hyperagent/loader', [
    'hyperagent/config',
    'exports'
  ], function (__dependency1__, __exports__) {
    'use strict';
    var config = __dependency1__.config;
    function loadAjax(options) {
      var deferred = config.defer();
      if (options.headers) {
        config._.extend(options.headers, {
          'Accept': 'application/hal+json, application/json, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        });
      }
      config.ajax(config._.extend({
        success: deferred.resolve,
        error: deferred.reject,
        dataType: 'html'
      }, options));
      return deferred.promise;
    }
    __exports__.loadAjax = loadAjax;
  });
  define('hyperagent/miniscore', ['exports'], function (__exports__) {
    'use strict';
    var _ = {};
    var breaker = {};
    _.each = _.forEach = function (obj, iterator, context) {
      if (obj === null || obj === undefined) {
        return;
      }
      if (obj.forEach === Array.prototype.forEach) {
        obj.forEach(iterator, context);
      } else if (obj.length === +obj.length) {
        for (var i = 0, l = obj.length; i < l; i++) {
          if (iterator.call(context, obj[i], i, obj) === breaker) {
            return;
          }
        }
      } else {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (iterator.call(context, obj[key], key, obj) === breaker) {
              return;
            }
          }
        }
      }
    };
    _.contains = function (obj, target) {
      if (obj === null || obj === undefined) {
        return false;
      }
      if (obj.indexOf === Array.prototype.indexOf) {
        return obj.indexOf(target) !== -1;
      }
      return _.any(obj, function (value) {
        return value === target;
      });
    };
    _.pick = function (obj) {
      var copy = {};
      var keys = Array.prototype.concat.apply(Array.prototype, Array.prototype.slice.call(arguments, 1));
      _.each(keys, function (key) {
        if (key in obj) {
          copy[key] = obj[key];
        }
      });
      return copy;
    };
    _.extend = function (obj) {
      _.each(Array.prototype.slice.call(arguments, 1), function (source) {
        if (source) {
          for (var prop in source) {
            obj[prop] = source[prop];
          }
        }
      });
      return obj;
    };
    _.defaults = function (obj) {
      _.each(Array.prototype.slice.call(arguments, 1), function (source) {
        if (source) {
          for (var prop in source) {
            if (obj[prop] === null || obj[prop] === undefined) {
              obj[prop] = source[prop];
            }
          }
        }
      });
      return obj;
    };
    _.clone = function (obj) {
      if (obj !== Object(obj)) {
        return obj;
      }
      return Array.isArray(obj) ? obj.slice() : _.extend({}, obj);
    };
    __exports__._ = _;
  });
  define('hyperagent/properties', [
    'hyperagent/config',
    'exports'
  ], function (__dependency1__, __exports__) {
    'use strict';
    var config = __dependency1__.config;
    function Properties(response, options) {
      options = options || {};
      if (Object(response) !== response) {
        throw new Error('The Properties argument must be an object.');
      }
      config._.defaults(response, options.original || {});
      var skipped = [
          '_links',
          '_embedded'
        ];
      Object.keys(response).forEach(function (key) {
        if (!config._.contains(skipped, key)) {
          this[key] = response[key];
        }
      }.bind(this));
      var curies = options.curies;
      if (!curies) {
        return;
      }
      Object.keys(this).forEach(function (key) {
        if (curies.canExpand(key)) {
          Object.defineProperty(this, curies.expand(key), {
            enumerable: true,
            value: this[key]
          });
        }
      }.bind(this));
    }
    __exports__.Properties = Properties;
  });
  define('hyperagent/resource', [
    'hyperagent/config',
    'hyperagent/loader',
    'hyperagent/properties',
    'hyperagent/curie',
    'exports'
  ], function (__dependency1__, __dependency2__, __dependency3__, __dependency4__, __exports__) {
    'use strict';
    var config = __dependency1__.config;
    var loadAjax = __dependency2__.loadAjax;
    var Properties = __dependency3__.Properties;
    var CurieStore = __dependency4__.CurieStore;
    var _ = config._;
    function Resource(args) {
      if (Object(args) === args) {
        this._options = args;
      } else {
        this._options = { url: args };
      }
      this.props = new Properties({});
      this.embedded = {};
      this.links = {};
      this.curies = new CurieStore();
      this._loadHooks = [
        this._loadLinks,
        this._loadEmbedded,
        this._loadProperties
      ].concat(config.loadHooks);
      this.loaded = false;
    }
    Resource.factory = function (Cls) {
      return function (object, options) {
        return new Cls(object, options);
      };
    };
    Resource.prototype.fetch = function fetch(options) {
      options = _.defaults(options || {}, { force: false });
      if (this.loaded && !options.force) {
        var deferred = config.defer();
        deferred.resolve(this);
        return deferred.promise;
      }
      var ajaxOptions = _.pick(this._options, 'headers', 'username', 'password', 'url');
      if (this._options.ajax) {
        _.extend(ajaxOptions, this._options.ajax);
      }
      if (options.ajax) {
        _.extend(ajaxOptions, options.ajax);
      }
      return loadAjax(ajaxOptions).then(function _ajaxThen(response) {
        this._parse(response);
        this.loaded = true;
        return this;
      }.bind(this));
    };
    Resource.prototype.url = function url() {
      return this._options.url;
    };
    Resource.prototype.link = function link(rel, params) {
      var _link = this.links[rel];
      if (params) {
        _link.expand(params);
      }
      return _link;
    };
    Resource.prototype._parse = function _parse(response) {
      var object = JSON.parse(response);
      this._load(object);
    };
    Resource.prototype._loadLinks = function _loadLinks(object) {
      if (object._links) {
        if (object._links.curies) {
          this._loadCuries(object._links.curies);
          delete object._links.curies;
        }
        if (object._links.self) {
          this._navigateUrl(object._links.self.href);
        }
        this.links = new LazyResource(this, object._links, {
          factory: Resource.factory(LinkResource),
          curies: this.curies
        });
      }
    };
    Resource.prototype._loadEmbedded = function _loadEmbedded(object) {
      if (object._embedded) {
        this.embedded = new LazyResource(this, object._embedded, {
          factory: Resource.factory(EmbeddedResource),
          curies: this.curies
        });
      }
    };
    Resource.prototype._loadProperties = function _loadProperties(object) {
      this.props = new Properties(object, {
        curies: this.curies,
        original: this.props
      });
    };
    Resource.prototype._load = function _load(object) {
      this._loadHooks.forEach(function (hook) {
        hook.bind(this)(object);
      }.bind(this));
    };
    Resource.prototype._loadCuries = function _loadCuries(curies) {
      if (!Array.isArray(curies)) {
        console.warn('Expected `curies` to be an array, got instead: ', curies);
        return;
      }
      curies.forEach(function (value) {
        if (!value.templated) {
          console.warn('CURIE links should always be marked as templated: ', value);
        }
        this.curies.register(value.name, value.href);
      }.bind(this));
    };
    Resource.resolveUrl = function _resolveUrl(oldUrl, newUrl) {
      if (!newUrl) {
        throw new Error('Expected absolute or relative URL, but got: ' + newUrl);
      }
      var uri = new URI(newUrl);
      if (uri.is('absolute')) {
        return uri.normalize().toString();
      } else if (newUrl[0] === '/') {
        return new URI(oldUrl).resource(newUrl).normalize().toString();
      } else {
        return new URI([
          oldUrl,
          newUrl
        ].join('/')).normalize().toString();
      }
    };
    Resource.prototype._navigateUrl = function _navigateUrl(value) {
      var newUrl = Resource.resolveUrl(this._options.url, value);
      if (newUrl !== this._options.url) {
        this._options.url = newUrl;
        return true;
      }
      return false;
    };
    function LazyResource(parentResource, object, options) {
      this._parent = parentResource;
      this._options = _.defaults(options || {}, {
        factory: function (object, options) {
          var resource = new Resource(options);
          resource._load(object);
          return resource;
        }
      });
      Object.defineProperties(this, {
        _parent: { enumerable: false },
        _options: { enumerable: false }
      });
      _.each(object, function (obj, key) {
        if (Array.isArray(obj)) {
          this._setLazyArray(key, obj, true);
        } else {
          this._setLazyObject(key, obj, true);
        }
      }.bind(this));
      var curies = this._options.curies;
      if (curies && !curies.empty()) {
        _.each(object, function (obj, key) {
          if (curies.canExpand(key)) {
            var expanded = curies.expand(key);
            if (Array.isArray(obj)) {
              this._setLazyArray(expanded, obj, false);
            } else {
              this._setLazyObject(expanded, obj, false);
            }
          }
        }.bind(this));
      }
    }
    LazyResource.prototype._setLazyObject = function _setLazy(key, object, enumerable) {
      Object.defineProperty(this, key, {
        enumerable: enumerable,
        get: this._makeGetter(object)
      });
    };
    LazyResource.prototype._setLazyArray = function _setLazy(key, array, enumerable) {
      Object.defineProperty(this, key, {
        enumerable: enumerable,
        get: function () {
          return array.map(function (object) {
            return this._makeGetter(object)();
          }.bind(this));
        }
      });
    };
    LazyResource.prototype._makeGetter = function _makeGetter(object) {
      var parent = this._parent;
      var options = this._options;
      var instance;
      return function () {
        if (instance === undefined) {
          instance = new options.factory(object, _.clone(parent._options));
        }
        return instance;
      };
    };
    function EmbeddedResource(object, options) {
      Resource.call(this, options);
      this._load(object);
      this.loaded = true;
    }
    _.extend(EmbeddedResource.prototype, Resource.prototype);
    function LinkResource(object, options) {
      Resource.call(this, options);
      this.href = object.href;
      this.templated = object.templated;
      if (!this.href) {
        console.warn('Link object did not provide an `href`: ', object);
      } else if (!this.templated) {
        this._navigateUrl(this.href);
      }
      this._load(object);
    }
    _.extend(LinkResource.prototype, Resource.prototype);
    LinkResource.prototype.expand = function (params) {
      if (!this.templated) {
        console.log('Trying to expand non-templated LinkResource: ', this);
      }
      var url = new URI.expand(this.href, params).toString();
      if (this._navigateUrl(url)) {
        this.loaded = false;
      }
    };
    LinkResource.prototype.toString = function () {
      return 'LinkResource(url="' + this.url() + '")';
    };
    __exports__.Resource = Resource;
    __exports__.LazyResource = LazyResource;
    __exports__.LinkResource = LinkResource;
  });
  window.Hyperagent = requireModule('hyperagent');
}());