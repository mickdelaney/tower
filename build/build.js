/* */ 
"format global";
"exports $traceurRuntime";
(function(global) {
  'use strict';
  if (global.$traceurRuntime) {
    return ;
  }
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $Object.defineProperties;
  var $defineProperty = $Object.defineProperty;
  var $freeze = $Object.freeze;
  var $getOwnPropertyDescriptor = $Object.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $Object.getOwnPropertyNames;
  var $keys = $Object.keys;
  var $hasOwnProperty = $Object.prototype.hasOwnProperty;
  var $toString = $Object.prototype.toString;
  var $preventExtensions = Object.preventExtensions;
  var $seal = Object.seal;
  var $isExtensible = Object.isExtensible;
  var $apply = Function.prototype.call.bind(Function.prototype.apply);
  function $bind(operand, thisArg, args) {
    var argArray = [thisArg];
    for (var i = 0; i < args.length; i++) {
      argArray[i + 1] = args[i];
    }
    var func = $apply(Function.prototype.bind, operand, argArray);
    return func;
  }
  function $construct(func, argArray) {
    var object = new ($bind(func, null, argArray));
    return object;
  }
  var counter = 0;
  function newUniqueString() {
    return '__$' + Math.floor(Math.random() * 1e9) + '$' + ++counter + '$__';
  }
  var privateNames = $create(null);
  function isPrivateName(s) {
    return privateNames[s];
  }
  function createPrivateName() {
    var s = newUniqueString();
    privateNames[s] = true;
    return s;
  }
  var CONTINUATION_TYPE = Object.create(null);
  function createContinuation(operand, thisArg, argsArray) {
    return [CONTINUATION_TYPE, operand, thisArg, argsArray];
  }
  function isContinuation(object) {
    return object && object[0] === CONTINUATION_TYPE;
  }
  var isTailRecursiveName = null;
  function setupProperTailCalls() {
    isTailRecursiveName = createPrivateName();
    Function.prototype.call = initTailRecursiveFunction(function call(thisArg) {
      var result = tailCall(function(thisArg) {
        var argArray = [];
        for (var i = 1; i < arguments.length; ++i) {
          argArray[i - 1] = arguments[i];
        }
        var continuation = createContinuation(this, thisArg, argArray);
        return continuation;
      }, this, arguments);
      return result;
    });
    Function.prototype.apply = initTailRecursiveFunction(function apply(thisArg, argArray) {
      var result = tailCall(function(thisArg, argArray) {
        var continuation = createContinuation(this, thisArg, argArray);
        return continuation;
      }, this, arguments);
      return result;
    });
  }
  function initTailRecursiveFunction(func) {
    if (isTailRecursiveName === null) {
      setupProperTailCalls();
    }
    func[isTailRecursiveName] = true;
    return func;
  }
  function isTailRecursive(func) {
    return !!func[isTailRecursiveName];
  }
  function tailCall(func, thisArg, argArray) {
    var continuation = argArray[0];
    if (isContinuation(continuation)) {
      continuation = $apply(func, thisArg, continuation[3]);
      return continuation;
    }
    continuation = createContinuation(func, thisArg, argArray);
    while (true) {
      if (isTailRecursive(func)) {
        continuation = $apply(func, continuation[2], [continuation]);
      } else {
        continuation = $apply(func, continuation[2], continuation[3]);
      }
      if (!isContinuation(continuation)) {
        return continuation;
      }
      func = continuation[1];
    }
  }
  function construct() {
    var object;
    if (isTailRecursive(this)) {
      object = $construct(this, [createContinuation(null, null, arguments)]);
    } else {
      object = $construct(this, arguments);
    }
    return object;
  }
  var $traceurRuntime = {
    initTailRecursiveFunction: initTailRecursiveFunction,
    call: tailCall,
    continuation: createContinuation,
    construct: construct
  };
  (function() {
    function nonEnum(value) {
      return {
        configurable: true,
        enumerable: false,
        value: value,
        writable: true
      };
    }
    var method = nonEnum;
    var symbolInternalProperty = newUniqueString();
    var symbolDescriptionProperty = newUniqueString();
    var symbolDataProperty = newUniqueString();
    var symbolValues = $create(null);
    function isShimSymbol(symbol) {
      return typeof symbol === 'object' && symbol instanceof SymbolValue;
    }
    function typeOf(v) {
      if (isShimSymbol(v))
        return 'symbol';
      return typeof v;
    }
    function Symbol(description) {
      var value = new SymbolValue(description);
      if (!(this instanceof Symbol))
        return value;
      throw new TypeError('Symbol cannot be new\'ed');
    }
    $defineProperty(Symbol.prototype, 'constructor', nonEnum(Symbol));
    $defineProperty(Symbol.prototype, 'toString', method(function() {
      var symbolValue = this[symbolDataProperty];
      return symbolValue[symbolInternalProperty];
    }));
    $defineProperty(Symbol.prototype, 'valueOf', method(function() {
      var symbolValue = this[symbolDataProperty];
      if (!symbolValue)
        throw TypeError('Conversion from symbol to string');
      if (!getOption('symbols'))
        return symbolValue[symbolInternalProperty];
      return symbolValue;
    }));
    function SymbolValue(description) {
      var key = newUniqueString();
      $defineProperty(this, symbolDataProperty, {value: this});
      $defineProperty(this, symbolInternalProperty, {value: key});
      $defineProperty(this, symbolDescriptionProperty, {value: description});
      freeze(this);
      symbolValues[key] = this;
    }
    $defineProperty(SymbolValue.prototype, 'constructor', nonEnum(Symbol));
    $defineProperty(SymbolValue.prototype, 'toString', {
      value: Symbol.prototype.toString,
      enumerable: false
    });
    $defineProperty(SymbolValue.prototype, 'valueOf', {
      value: Symbol.prototype.valueOf,
      enumerable: false
    });
    var hashProperty = createPrivateName();
    var hashPropertyDescriptor = {value: undefined};
    var hashObjectProperties = {
      hash: {value: undefined},
      self: {value: undefined}
    };
    var hashCounter = 0;
    function getOwnHashObject(object) {
      var hashObject = object[hashProperty];
      if (hashObject && hashObject.self === object)
        return hashObject;
      if ($isExtensible(object)) {
        hashObjectProperties.hash.value = hashCounter++;
        hashObjectProperties.self.value = object;
        hashPropertyDescriptor.value = $create(null, hashObjectProperties);
        $defineProperty(object, hashProperty, hashPropertyDescriptor);
        return hashPropertyDescriptor.value;
      }
      return undefined;
    }
    function freeze(object) {
      getOwnHashObject(object);
      return $freeze.apply(this, arguments);
    }
    function preventExtensions(object) {
      getOwnHashObject(object);
      return $preventExtensions.apply(this, arguments);
    }
    function seal(object) {
      getOwnHashObject(object);
      return $seal.apply(this, arguments);
    }
    freeze(SymbolValue.prototype);
    function isSymbolString(s) {
      return symbolValues[s] || privateNames[s];
    }
    function toProperty(name) {
      if (isShimSymbol(name))
        return name[symbolInternalProperty];
      return name;
    }
    function removeSymbolKeys(array) {
      var rv = [];
      for (var i = 0; i < array.length; i++) {
        if (!isSymbolString(array[i])) {
          rv.push(array[i]);
        }
      }
      return rv;
    }
    function getOwnPropertyNames(object) {
      return removeSymbolKeys($getOwnPropertyNames(object));
    }
    function keys(object) {
      return removeSymbolKeys($keys(object));
    }
    function getOwnPropertySymbols(object) {
      var rv = [];
      var names = $getOwnPropertyNames(object);
      for (var i = 0; i < names.length; i++) {
        var symbol = symbolValues[names[i]];
        if (symbol) {
          rv.push(symbol);
        }
      }
      return rv;
    }
    function getOwnPropertyDescriptor(object, name) {
      return $getOwnPropertyDescriptor(object, toProperty(name));
    }
    function hasOwnProperty(name) {
      return $hasOwnProperty.call(this, toProperty(name));
    }
    function getOption(name) {
      return global.$traceurRuntime.options[name];
    }
    function defineProperty(object, name, descriptor) {
      if (isShimSymbol(name)) {
        name = name[symbolInternalProperty];
      }
      $defineProperty(object, name, descriptor);
      return object;
    }
    function polyfillObject(Object) {
      $defineProperty(Object, 'defineProperty', {value: defineProperty});
      $defineProperty(Object, 'getOwnPropertyNames', {value: getOwnPropertyNames});
      $defineProperty(Object, 'getOwnPropertyDescriptor', {value: getOwnPropertyDescriptor});
      $defineProperty(Object.prototype, 'hasOwnProperty', {value: hasOwnProperty});
      $defineProperty(Object, 'freeze', {value: freeze});
      $defineProperty(Object, 'preventExtensions', {value: preventExtensions});
      $defineProperty(Object, 'seal', {value: seal});
      $defineProperty(Object, 'keys', {value: keys});
    }
    function exportStar(object) {
      for (var i = 1; i < arguments.length; i++) {
        var names = $getOwnPropertyNames(arguments[i]);
        for (var j = 0; j < names.length; j++) {
          var name = names[j];
          if (isSymbolString(name))
            continue;
          (function(mod, name) {
            $defineProperty(object, name, {
              get: function() {
                return mod[name];
              },
              enumerable: true
            });
          })(arguments[i], names[j]);
        }
      }
      return object;
    }
    function isObject(x) {
      return x != null && (typeof x === 'object' || typeof x === 'function');
    }
    function toObject(x) {
      if (x == null)
        throw $TypeError();
      return $Object(x);
    }
    function checkObjectCoercible(argument) {
      if (argument == null) {
        throw new TypeError('Value cannot be converted to an Object');
      }
      return argument;
    }
    function polyfillSymbol(global, Symbol) {
      if (!global.Symbol) {
        global.Symbol = Symbol;
        Object.getOwnPropertySymbols = getOwnPropertySymbols;
      }
      if (!global.Symbol.iterator) {
        global.Symbol.iterator = Symbol('Symbol.iterator');
      }
      if (!global.Symbol.observer) {
        global.Symbol.observer = Symbol('Symbol.observer');
      }
    }
    function setupGlobals(global) {
      polyfillSymbol(global, Symbol);
      global.Reflect = global.Reflect || {};
      global.Reflect.global = global.Reflect.global || global;
      polyfillObject(global.Object);
    }
    setupGlobals(global);
    global.$traceurRuntime = {
      call: tailCall,
      checkObjectCoercible: checkObjectCoercible,
      construct: construct,
      continuation: createContinuation,
      createPrivateName: createPrivateName,
      defineProperties: $defineProperties,
      defineProperty: $defineProperty,
      exportStar: exportStar,
      getOwnHashObject: getOwnHashObject,
      getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
      getOwnPropertyNames: $getOwnPropertyNames,
      initTailRecursiveFunction: initTailRecursiveFunction,
      isObject: isObject,
      isPrivateName: isPrivateName,
      isSymbolString: isSymbolString,
      keys: $keys,
      options: {},
      setupGlobals: setupGlobals,
      toObject: toObject,
      toProperty: toProperty,
      typeof: typeOf
    };
  })();
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);
(function() {
  function buildFromEncodedParts(opt_scheme, opt_userInfo, opt_domain, opt_port, opt_path, opt_queryData, opt_fragment) {
    var out = [];
    if (opt_scheme) {
      out.push(opt_scheme, ':');
    }
    if (opt_domain) {
      out.push('//');
      if (opt_userInfo) {
        out.push(opt_userInfo, '@');
      }
      out.push(opt_domain);
      if (opt_port) {
        out.push(':', opt_port);
      }
    }
    if (opt_path) {
      out.push(opt_path);
    }
    if (opt_queryData) {
      out.push('?', opt_queryData);
    }
    if (opt_fragment) {
      out.push('#', opt_fragment);
    }
    return out.join('');
  }
  ;
  var splitRe = new RegExp('^' + '(?:' + '([^:/?#.]+)' + ':)?' + '(?://' + '(?:([^/?#]*)@)?' + '([\\w\\d\\-\\u0100-\\uffff.%]*)' + '(?::([0-9]+))?' + ')?' + '([^?#]+)?' + '(?:\\?([^#]*))?' + '(?:#(.*))?' + '$');
  var ComponentIndex = {
    SCHEME: 1,
    USER_INFO: 2,
    DOMAIN: 3,
    PORT: 4,
    PATH: 5,
    QUERY_DATA: 6,
    FRAGMENT: 7
  };
  function split(uri) {
    return (uri.match(splitRe));
  }
  function removeDotSegments(path) {
    if (path === '/')
      return '/';
    var leadingSlash = path[0] === '/' ? '/' : '';
    var trailingSlash = path.slice(-1) === '/' ? '/' : '';
    var segments = path.split('/');
    var out = [];
    var up = 0;
    for (var pos = 0; pos < segments.length; pos++) {
      var segment = segments[pos];
      switch (segment) {
        case '':
        case '.':
          break;
        case '..':
          if (out.length)
            out.pop();
          else
            up++;
          break;
        default:
          out.push(segment);
      }
    }
    if (!leadingSlash) {
      while (up-- > 0) {
        out.unshift('..');
      }
      if (out.length === 0)
        out.push('.');
    }
    return leadingSlash + out.join('/') + trailingSlash;
  }
  function joinAndCanonicalizePath(parts) {
    var path = parts[ComponentIndex.PATH] || '';
    path = removeDotSegments(path);
    parts[ComponentIndex.PATH] = path;
    return buildFromEncodedParts(parts[ComponentIndex.SCHEME], parts[ComponentIndex.USER_INFO], parts[ComponentIndex.DOMAIN], parts[ComponentIndex.PORT], parts[ComponentIndex.PATH], parts[ComponentIndex.QUERY_DATA], parts[ComponentIndex.FRAGMENT]);
  }
  function canonicalizeUrl(url) {
    var parts = split(url);
    return joinAndCanonicalizePath(parts);
  }
  function resolveUrl(base, url) {
    var parts = split(url);
    var baseParts = split(base);
    if (parts[ComponentIndex.SCHEME]) {
      return joinAndCanonicalizePath(parts);
    } else {
      parts[ComponentIndex.SCHEME] = baseParts[ComponentIndex.SCHEME];
    }
    for (var i = ComponentIndex.SCHEME; i <= ComponentIndex.PORT; i++) {
      if (!parts[i]) {
        parts[i] = baseParts[i];
      }
    }
    if (parts[ComponentIndex.PATH][0] == '/') {
      return joinAndCanonicalizePath(parts);
    }
    var path = baseParts[ComponentIndex.PATH];
    var index = path.lastIndexOf('/');
    path = path.slice(0, index + 1) + parts[ComponentIndex.PATH];
    parts[ComponentIndex.PATH] = path;
    return joinAndCanonicalizePath(parts);
  }
  function isAbsolute(name) {
    if (!name)
      return false;
    if (name[0] === '/')
      return true;
    var parts = split(name);
    if (parts[ComponentIndex.SCHEME])
      return true;
    return false;
  }
  $traceurRuntime.canonicalizeUrl = canonicalizeUrl;
  $traceurRuntime.isAbsolute = isAbsolute;
  $traceurRuntime.removeDotSegments = removeDotSegments;
  $traceurRuntime.resolveUrl = resolveUrl;
})();
(function(global) {
  'use strict';
  var $__1 = $traceurRuntime,
      canonicalizeUrl = $__1.canonicalizeUrl,
      resolveUrl = $__1.resolveUrl,
      isAbsolute = $__1.isAbsolute;
  var moduleInstantiators = Object.create(null);
  var baseURL;
  if (global.location && global.location.href)
    baseURL = resolveUrl(global.location.href, './');
  else
    baseURL = '';
  function UncoatedModuleEntry(url, uncoatedModule) {
    this.url = url;
    this.value_ = uncoatedModule;
  }
  function ModuleEvaluationError(erroneousModuleName, cause) {
    this.message = this.constructor.name + ': ' + this.stripCause(cause) + ' in ' + erroneousModuleName;
    if (!(cause instanceof ModuleEvaluationError) && cause.stack)
      this.stack = this.stripStack(cause.stack);
    else
      this.stack = '';
  }
  ModuleEvaluationError.prototype = Object.create(Error.prototype);
  ModuleEvaluationError.prototype.constructor = ModuleEvaluationError;
  ModuleEvaluationError.prototype.stripError = function(message) {
    return message.replace(/.*Error:/, this.constructor.name + ':');
  };
  ModuleEvaluationError.prototype.stripCause = function(cause) {
    if (!cause)
      return '';
    if (!cause.message)
      return cause + '';
    return this.stripError(cause.message);
  };
  ModuleEvaluationError.prototype.loadedBy = function(moduleName) {
    this.stack += '\n loaded by ' + moduleName;
  };
  ModuleEvaluationError.prototype.stripStack = function(causeStack) {
    var stack = [];
    causeStack.split('\n').some((function(frame) {
      if (/UncoatedModuleInstantiator/.test(frame))
        return true;
      stack.push(frame);
    }));
    stack[0] = this.stripError(stack[0]);
    return stack.join('\n');
  };
  function beforeLines(lines, number) {
    var result = [];
    var first = number - 3;
    if (first < 0)
      first = 0;
    for (var i = first; i < number; i++) {
      result.push(lines[i]);
    }
    return result;
  }
  function afterLines(lines, number) {
    var last = number + 1;
    if (last > lines.length - 1)
      last = lines.length - 1;
    var result = [];
    for (var i = number; i <= last; i++) {
      result.push(lines[i]);
    }
    return result;
  }
  function columnSpacing(columns) {
    var result = '';
    for (var i = 0; i < columns - 1; i++) {
      result += '-';
    }
    return result;
  }
  function UncoatedModuleInstantiator(url, func) {
    UncoatedModuleEntry.call(this, url, null);
    this.func = func;
  }
  UncoatedModuleInstantiator.prototype = Object.create(UncoatedModuleEntry.prototype);
  UncoatedModuleInstantiator.prototype.getUncoatedModule = function() {
    if (this.value_)
      return this.value_;
    try {
      var relativeRequire;
      if (typeof $traceurRuntime !== undefined && $traceurRuntime.require) {
        relativeRequire = $traceurRuntime.require.bind(null, this.url);
      }
      return this.value_ = this.func.call(global, relativeRequire);
    } catch (ex) {
      if (ex instanceof ModuleEvaluationError) {
        ex.loadedBy(this.url);
        throw ex;
      }
      if (ex.stack) {
        var lines = this.func.toString().split('\n');
        var evaled = [];
        ex.stack.split('\n').some(function(frame) {
          if (frame.indexOf('UncoatedModuleInstantiator.getUncoatedModule') > 0)
            return true;
          var m = /(at\s[^\s]*\s).*>:(\d*):(\d*)\)/.exec(frame);
          if (m) {
            var line = parseInt(m[2], 10);
            evaled = evaled.concat(beforeLines(lines, line));
            evaled.push(columnSpacing(m[3]) + '^');
            evaled = evaled.concat(afterLines(lines, line));
            evaled.push('= = = = = = = = =');
          } else {
            evaled.push(frame);
          }
        });
        ex.stack = evaled.join('\n');
      }
      throw new ModuleEvaluationError(this.url, ex);
    }
  };
  function getUncoatedModuleInstantiator(name) {
    if (!name)
      return ;
    var url = ModuleStore.normalize(name);
    return moduleInstantiators[url];
  }
  ;
  var moduleInstances = Object.create(null);
  var liveModuleSentinel = {};
  function Module(uncoatedModule) {
    var isLive = arguments[1];
    var coatedModule = Object.create(null);
    Object.getOwnPropertyNames(uncoatedModule).forEach((function(name) {
      var getter,
          value;
      if (isLive === liveModuleSentinel) {
        var descr = Object.getOwnPropertyDescriptor(uncoatedModule, name);
        if (descr.get)
          getter = descr.get;
      }
      if (!getter) {
        value = uncoatedModule[name];
        getter = function() {
          return value;
        };
      }
      Object.defineProperty(coatedModule, name, {
        get: getter,
        enumerable: true
      });
    }));
    Object.preventExtensions(coatedModule);
    return coatedModule;
  }
  var ModuleStore = {
    normalize: function(name, refererName, refererAddress) {
      if (typeof name !== 'string')
        throw new TypeError('module name must be a string, not ' + typeof name);
      if (isAbsolute(name))
        return canonicalizeUrl(name);
      if (/[^\.]\/\.\.\//.test(name)) {
        throw new Error('module name embeds /../: ' + name);
      }
      if (name[0] === '.' && refererName)
        return resolveUrl(refererName, name);
      return canonicalizeUrl(name);
    },
    get: function(normalizedName) {
      var m = getUncoatedModuleInstantiator(normalizedName);
      if (!m)
        return undefined;
      var moduleInstance = moduleInstances[m.url];
      if (moduleInstance)
        return moduleInstance;
      moduleInstance = Module(m.getUncoatedModule(), liveModuleSentinel);
      return moduleInstances[m.url] = moduleInstance;
    },
    set: function(normalizedName, module) {
      normalizedName = String(normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, (function() {
        return module;
      }));
      moduleInstances[normalizedName] = module;
    },
    get baseURL() {
      return baseURL;
    },
    set baseURL(v) {
      baseURL = String(v);
    },
    registerModule: function(name, deps, func) {
      var normalizedName = ModuleStore.normalize(name);
      if (moduleInstantiators[normalizedName])
        throw new Error('duplicate module named ' + normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, func);
    },
    bundleStore: Object.create(null),
    register: function(name, deps, func) {
      if (!deps || !deps.length && !func.length) {
        this.registerModule(name, deps, func);
      } else {
        this.bundleStore[name] = {
          deps: deps,
          execute: function() {
            var $__0 = arguments;
            var depMap = {};
            deps.forEach((function(dep, index) {
              return depMap[dep] = $__0[index];
            }));
            var registryEntry = func.call(this, depMap);
            registryEntry.execute.call(this);
            return registryEntry.exports;
          }
        };
      }
    },
    getAnonymousModule: function(func) {
      return new Module(func.call(global), liveModuleSentinel);
    },
    getForTesting: function(name) {
      var $__0 = this;
      if (!this.testingPrefix_) {
        Object.keys(moduleInstances).some((function(key) {
          var m = /(traceur@[^\/]*\/)/.exec(key);
          if (m) {
            $__0.testingPrefix_ = m[1];
            return true;
          }
        }));
      }
      return this.get(this.testingPrefix_ + name);
    }
  };
  var moduleStoreModule = new Module({ModuleStore: ModuleStore});
  ModuleStore.set('@traceur/src/runtime/ModuleStore', moduleStoreModule);
  ModuleStore.set('@traceur/src/runtime/ModuleStore.js', moduleStoreModule);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
  };
  $traceurRuntime.ModuleStore = ModuleStore;
  global.System = {
    register: ModuleStore.register.bind(ModuleStore),
    registerModule: ModuleStore.registerModule.bind(ModuleStore),
    get: ModuleStore.get,
    set: ModuleStore.set,
    normalize: ModuleStore.normalize
  };
  $traceurRuntime.getModuleImpl = function(name) {
    var instantiator = getUncoatedModuleInstantiator(name);
    return instantiator && instantiator.getUncoatedModule();
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);
System.registerModule("traceur-runtime@0.0.87/src/runtime/async.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/async.js";
  if (typeof $traceurRuntime !== 'object') {
    throw new Error('traceur runtime not found.');
  }
  var $createPrivateName = $traceurRuntime.createPrivateName;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $create = Object.create;
  var thisName = $createPrivateName();
  var argsName = $createPrivateName();
  var observeName = $createPrivateName();
  function AsyncGeneratorFunction() {}
  function AsyncGeneratorFunctionPrototype() {}
  AsyncGeneratorFunction.prototype = AsyncGeneratorFunctionPrototype;
  AsyncGeneratorFunctionPrototype.constructor = AsyncGeneratorFunction;
  $defineProperty(AsyncGeneratorFunctionPrototype, 'constructor', {enumerable: false});
  var AsyncGeneratorContext = function AsyncGeneratorContext(observer) {
    var $__0 = this;
    this.decoratedObserver = $traceurRuntime.createDecoratedGenerator(observer, (function() {
      $__0.done = true;
    }));
    this.done = false;
    this.inReturn = false;
  };
  ($traceurRuntime.createClass)(AsyncGeneratorContext, {
    throw: function(error) {
      if (!this.inReturn) {
        throw error;
      }
    },
    yield: function(value) {
      if (this.done) {
        this.inReturn = true;
        throw undefined;
      }
      var result;
      try {
        result = this.decoratedObserver.next(value);
      } catch (e) {
        this.done = true;
        throw e;
      }
      if (result === undefined) {
        return ;
      }
      if (result.done) {
        this.done = true;
        this.inReturn = true;
        throw undefined;
      }
      return result.value;
    },
    yieldFor: function(observable) {
      var ctx = this;
      return $traceurRuntime.observeForEach(observable[$traceurRuntime.toProperty(Symbol.observer)].bind(observable), function(value) {
        if (ctx.done) {
          this.return();
          return ;
        }
        var result;
        try {
          result = ctx.decoratedObserver.next(value);
        } catch (e) {
          ctx.done = true;
          throw e;
        }
        if (result === undefined) {
          return ;
        }
        if (result.done) {
          ctx.done = true;
        }
        return result;
      });
    }
  }, {});
  AsyncGeneratorFunctionPrototype.prototype[Symbol.observer] = function(observer) {
    var observe = this[observeName];
    var ctx = new AsyncGeneratorContext(observer);
    $traceurRuntime.schedule((function() {
      return observe(ctx);
    })).then((function(value) {
      if (!ctx.done) {
        ctx.decoratedObserver.return(value);
      }
    })).catch((function(error) {
      if (!ctx.done) {
        ctx.decoratedObserver.throw(error);
      }
    }));
    return ctx.decoratedObserver;
  };
  $defineProperty(AsyncGeneratorFunctionPrototype.prototype, Symbol.observer, {enumerable: false});
  function initAsyncGeneratorFunction(functionObject) {
    functionObject.prototype = $create(AsyncGeneratorFunctionPrototype.prototype);
    functionObject.__proto__ = AsyncGeneratorFunctionPrototype;
    return functionObject;
  }
  function createAsyncGeneratorInstance(observe, functionObject) {
    for (var args = [],
        $__2 = 2; $__2 < arguments.length; $__2++)
      args[$__2 - 2] = arguments[$__2];
    var object = $create(functionObject.prototype);
    object[thisName] = this;
    object[argsName] = args;
    object[observeName] = observe;
    return object;
  }
  function observeForEach(observe, next) {
    return new Promise((function(resolve, reject) {
      var generator = observe({
        next: function(value) {
          return next.call(generator, value);
        },
        throw: function(error) {
          reject(error);
        },
        return: function(value) {
          resolve(value);
        }
      });
    }));
  }
  function schedule(asyncF) {
    return Promise.resolve().then(asyncF);
  }
  var generator = Symbol();
  var onDone = Symbol();
  var DecoratedGenerator = function DecoratedGenerator(_generator, _onDone) {
    this[generator] = _generator;
    this[onDone] = _onDone;
  };
  ($traceurRuntime.createClass)(DecoratedGenerator, {
    next: function(value) {
      var result = this[generator].next(value);
      if (result !== undefined && result.done) {
        this[onDone].call(this);
      }
      return result;
    },
    throw: function(error) {
      this[onDone].call(this);
      return this[generator].throw(error);
    },
    return: function(value) {
      this[onDone].call(this);
      return this[generator].return(value);
    }
  }, {});
  function createDecoratedGenerator(generator, onDone) {
    return new DecoratedGenerator(generator, onDone);
  }
  $traceurRuntime.initAsyncGeneratorFunction = initAsyncGeneratorFunction;
  $traceurRuntime.createAsyncGeneratorInstance = createAsyncGeneratorInstance;
  $traceurRuntime.observeForEach = observeForEach;
  $traceurRuntime.schedule = schedule;
  $traceurRuntime.createDecoratedGenerator = createDecoratedGenerator;
  return {};
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/classes.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/classes.js";
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $getOwnPropertyDescriptor = $traceurRuntime.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $traceurRuntime.getOwnPropertyNames;
  var $getPrototypeOf = Object.getPrototypeOf;
  var $__0 = Object,
      getOwnPropertyNames = $__0.getOwnPropertyNames,
      getOwnPropertySymbols = $__0.getOwnPropertySymbols;
  function superDescriptor(homeObject, name) {
    var proto = $getPrototypeOf(homeObject);
    do {
      var result = $getOwnPropertyDescriptor(proto, name);
      if (result)
        return result;
      proto = $getPrototypeOf(proto);
    } while (proto);
    return undefined;
  }
  function superConstructor(ctor) {
    return ctor.__proto__;
  }
  function superGet(self, homeObject, name) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor) {
      if (!descriptor.get)
        return descriptor.value;
      return descriptor.get.call(self);
    }
    return undefined;
  }
  function superSet(self, homeObject, name, value) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor && descriptor.set) {
      descriptor.set.call(self, value);
      return value;
    }
    throw $TypeError(("super has no setter '" + name + "'."));
  }
  function getDescriptors(object) {
    var descriptors = {};
    var names = getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      descriptors[name] = $getOwnPropertyDescriptor(object, name);
    }
    var symbols = getOwnPropertySymbols(object);
    for (var i = 0; i < symbols.length; i++) {
      var symbol = symbols[i];
      descriptors[$traceurRuntime.toProperty(symbol)] = $getOwnPropertyDescriptor(object, $traceurRuntime.toProperty(symbol));
    }
    return descriptors;
  }
  function createClass(ctor, object, staticObject, superClass) {
    $defineProperty(object, 'constructor', {
      value: ctor,
      configurable: true,
      enumerable: false,
      writable: true
    });
    if (arguments.length > 3) {
      if (typeof superClass === 'function')
        ctor.__proto__ = superClass;
      ctor.prototype = $create(getProtoParent(superClass), getDescriptors(object));
    } else {
      ctor.prototype = object;
    }
    $defineProperty(ctor, 'prototype', {
      configurable: false,
      writable: false
    });
    return $defineProperties(ctor, getDescriptors(staticObject));
  }
  function getProtoParent(superClass) {
    if (typeof superClass === 'function') {
      var prototype = superClass.prototype;
      if ($Object(prototype) === prototype || prototype === null)
        return superClass.prototype;
      throw new $TypeError('super prototype must be an Object or null');
    }
    if (superClass === null)
      return null;
    throw new $TypeError(("Super expression must either be null or a function, not " + typeof superClass + "."));
  }
  $traceurRuntime.createClass = createClass;
  $traceurRuntime.superConstructor = superConstructor;
  $traceurRuntime.superGet = superGet;
  $traceurRuntime.superSet = superSet;
  return {};
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/destructuring.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/destructuring.js";
  function iteratorToArray(iter) {
    var rv = [];
    var i = 0;
    var tmp;
    while (!(tmp = iter.next()).done) {
      rv[i++] = tmp.value;
    }
    return rv;
  }
  $traceurRuntime.iteratorToArray = iteratorToArray;
  return {};
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/generators.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/generators.js";
  if (typeof $traceurRuntime !== 'object') {
    throw new Error('traceur runtime not found.');
  }
  var createPrivateName = $traceurRuntime.createPrivateName;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $create = Object.create;
  var $TypeError = TypeError;
  function nonEnum(value) {
    return {
      configurable: true,
      enumerable: false,
      value: value,
      writable: true
    };
  }
  var ST_NEWBORN = 0;
  var ST_EXECUTING = 1;
  var ST_SUSPENDED = 2;
  var ST_CLOSED = 3;
  var END_STATE = -2;
  var RETHROW_STATE = -3;
  function getInternalError(state) {
    return new Error('Traceur compiler bug: invalid state in state machine: ' + state);
  }
  var RETURN_SENTINEL = {};
  function GeneratorContext() {
    this.state = 0;
    this.GState = ST_NEWBORN;
    this.storedException = undefined;
    this.finallyFallThrough = undefined;
    this.sent_ = undefined;
    this.returnValue = undefined;
    this.oldReturnValue = undefined;
    this.tryStack_ = [];
  }
  GeneratorContext.prototype = {
    pushTry: function(catchState, finallyState) {
      if (finallyState !== null) {
        var finallyFallThrough = null;
        for (var i = this.tryStack_.length - 1; i >= 0; i--) {
          if (this.tryStack_[i].catch !== undefined) {
            finallyFallThrough = this.tryStack_[i].catch;
            break;
          }
        }
        if (finallyFallThrough === null)
          finallyFallThrough = RETHROW_STATE;
        this.tryStack_.push({
          finally: finallyState,
          finallyFallThrough: finallyFallThrough
        });
      }
      if (catchState !== null) {
        this.tryStack_.push({catch: catchState});
      }
    },
    popTry: function() {
      this.tryStack_.pop();
    },
    maybeUncatchable: function() {
      if (this.storedException === RETURN_SENTINEL) {
        throw RETURN_SENTINEL;
      }
    },
    get sent() {
      this.maybeThrow();
      return this.sent_;
    },
    set sent(v) {
      this.sent_ = v;
    },
    get sentIgnoreThrow() {
      return this.sent_;
    },
    maybeThrow: function() {
      if (this.action === 'throw') {
        this.action = 'next';
        throw this.sent_;
      }
    },
    end: function() {
      switch (this.state) {
        case END_STATE:
          return this;
        case RETHROW_STATE:
          throw this.storedException;
        default:
          throw getInternalError(this.state);
      }
    },
    handleException: function(ex) {
      this.GState = ST_CLOSED;
      this.state = END_STATE;
      throw ex;
    },
    wrapYieldStar: function(iterator) {
      var ctx = this;
      return {
        next: function(v) {
          return iterator.next(v);
        },
        throw: function(e) {
          var result;
          if (e === RETURN_SENTINEL) {
            if (iterator.return) {
              result = iterator.return(ctx.returnValue);
              if (!result.done) {
                ctx.returnValue = ctx.oldReturnValue;
                return result;
              }
              ctx.returnValue = result.value;
            }
            throw e;
          }
          if (iterator.throw) {
            return iterator.throw(e);
          }
          iterator.return && iterator.return();
          throw $TypeError('Inner iterator does not have a throw method');
        }
      };
    }
  };
  function nextOrThrow(ctx, moveNext, action, x) {
    switch (ctx.GState) {
      case ST_EXECUTING:
        throw new Error(("\"" + action + "\" on executing generator"));
      case ST_CLOSED:
        if (action == 'next') {
          return {
            value: undefined,
            done: true
          };
        }
        if (x === RETURN_SENTINEL) {
          return {
            value: ctx.returnValue,
            done: true
          };
        }
        throw x;
      case ST_NEWBORN:
        if (action === 'throw') {
          ctx.GState = ST_CLOSED;
          if (x === RETURN_SENTINEL) {
            return {
              value: ctx.returnValue,
              done: true
            };
          }
          throw x;
        }
        if (x !== undefined)
          throw $TypeError('Sent value to newborn generator');
      case ST_SUSPENDED:
        ctx.GState = ST_EXECUTING;
        ctx.action = action;
        ctx.sent = x;
        var value;
        try {
          value = moveNext(ctx);
        } catch (ex) {
          if (ex === RETURN_SENTINEL) {
            value = ctx;
          } else {
            throw ex;
          }
        }
        var done = value === ctx;
        if (done)
          value = ctx.returnValue;
        ctx.GState = done ? ST_CLOSED : ST_SUSPENDED;
        return {
          value: value,
          done: done
        };
    }
  }
  var ctxName = createPrivateName();
  var moveNextName = createPrivateName();
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  GeneratorFunction.prototype = GeneratorFunctionPrototype;
  $defineProperty(GeneratorFunctionPrototype, 'constructor', nonEnum(GeneratorFunction));
  GeneratorFunctionPrototype.prototype = {
    constructor: GeneratorFunctionPrototype,
    next: function(v) {
      return nextOrThrow(this[ctxName], this[moveNextName], 'next', v);
    },
    throw: function(v) {
      return nextOrThrow(this[ctxName], this[moveNextName], 'throw', v);
    },
    return: function(v) {
      this[ctxName].oldReturnValue = this[ctxName].returnValue;
      this[ctxName].returnValue = v;
      return nextOrThrow(this[ctxName], this[moveNextName], 'throw', RETURN_SENTINEL);
    }
  };
  $defineProperties(GeneratorFunctionPrototype.prototype, {
    constructor: {enumerable: false},
    next: {enumerable: false},
    throw: {enumerable: false},
    return: {enumerable: false}
  });
  Object.defineProperty(GeneratorFunctionPrototype.prototype, Symbol.iterator, nonEnum(function() {
    return this;
  }));
  function createGeneratorInstance(innerFunction, functionObject, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new GeneratorContext();
    var object = $create(functionObject.prototype);
    object[ctxName] = ctx;
    object[moveNextName] = moveNext;
    return object;
  }
  function initGeneratorFunction(functionObject) {
    functionObject.prototype = $create(GeneratorFunctionPrototype.prototype);
    functionObject.__proto__ = GeneratorFunctionPrototype;
    return functionObject;
  }
  function AsyncFunctionContext() {
    GeneratorContext.call(this);
    this.err = undefined;
    var ctx = this;
    ctx.result = new Promise(function(resolve, reject) {
      ctx.resolve = resolve;
      ctx.reject = reject;
    });
  }
  AsyncFunctionContext.prototype = $create(GeneratorContext.prototype);
  AsyncFunctionContext.prototype.end = function() {
    switch (this.state) {
      case END_STATE:
        this.resolve(this.returnValue);
        break;
      case RETHROW_STATE:
        this.reject(this.storedException);
        break;
      default:
        this.reject(getInternalError(this.state));
    }
  };
  AsyncFunctionContext.prototype.handleException = function() {
    this.state = RETHROW_STATE;
  };
  function asyncWrap(innerFunction, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new AsyncFunctionContext();
    ctx.createCallback = function(newState) {
      return function(value) {
        ctx.state = newState;
        ctx.value = value;
        moveNext(ctx);
      };
    };
    ctx.errback = function(err) {
      handleCatch(ctx, err);
      moveNext(ctx);
    };
    moveNext(ctx);
    return ctx.result;
  }
  function getMoveNext(innerFunction, self) {
    return function(ctx) {
      while (true) {
        try {
          return innerFunction.call(self, ctx);
        } catch (ex) {
          handleCatch(ctx, ex);
        }
      }
    };
  }
  function handleCatch(ctx, ex) {
    ctx.storedException = ex;
    var last = ctx.tryStack_[ctx.tryStack_.length - 1];
    if (!last) {
      ctx.handleException(ex);
      return ;
    }
    ctx.state = last.catch !== undefined ? last.catch : last.finally;
    if (last.finallyFallThrough !== undefined)
      ctx.finallyFallThrough = last.finallyFallThrough;
  }
  $traceurRuntime.asyncWrap = asyncWrap;
  $traceurRuntime.initGeneratorFunction = initGeneratorFunction;
  $traceurRuntime.createGeneratorInstance = createGeneratorInstance;
  return {};
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/relativeRequire.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/relativeRequire.js";
  var path;
  function relativeRequire(callerPath, requiredPath) {
    path = path || typeof require !== 'undefined' && require('path');
    function isDirectory(path) {
      return path.slice(-1) === '/';
    }
    function isAbsolute(path) {
      return path[0] === '/';
    }
    function isRelative(path) {
      return path[0] === '.';
    }
    if (isDirectory(requiredPath) || isAbsolute(requiredPath))
      return ;
    return isRelative(requiredPath) ? require(path.resolve(path.dirname(callerPath), requiredPath)) : require(requiredPath);
  }
  $traceurRuntime.require = relativeRequire;
  return {};
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/spread.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/spread.js";
  function spread() {
    var rv = [],
        j = 0,
        iterResult;
    for (var i = 0; i < arguments.length; i++) {
      var valueToSpread = $traceurRuntime.checkObjectCoercible(arguments[i]);
      if (typeof valueToSpread[$traceurRuntime.toProperty(Symbol.iterator)] !== 'function') {
        throw new TypeError('Cannot spread non-iterable object.');
      }
      var iter = valueToSpread[$traceurRuntime.toProperty(Symbol.iterator)]();
      while (!(iterResult = iter.next()).done) {
        rv[j++] = iterResult.value;
      }
    }
    return rv;
  }
  $traceurRuntime.spread = spread;
  return {};
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/type-assertions.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/type-assertions.js";
  var types = {
    any: {name: 'any'},
    boolean: {name: 'boolean'},
    number: {name: 'number'},
    string: {name: 'string'},
    symbol: {name: 'symbol'},
    void: {name: 'void'}
  };
  var GenericType = function GenericType(type, argumentTypes) {
    this.type = type;
    this.argumentTypes = argumentTypes;
  };
  ($traceurRuntime.createClass)(GenericType, {}, {});
  var typeRegister = Object.create(null);
  function genericType(type) {
    for (var argumentTypes = [],
        $__1 = 1; $__1 < arguments.length; $__1++)
      argumentTypes[$__1 - 1] = arguments[$__1];
    var typeMap = typeRegister;
    var key = $traceurRuntime.getOwnHashObject(type).hash;
    if (!typeMap[key]) {
      typeMap[key] = Object.create(null);
    }
    typeMap = typeMap[key];
    for (var i = 0; i < argumentTypes.length - 1; i++) {
      key = $traceurRuntime.getOwnHashObject(argumentTypes[i]).hash;
      if (!typeMap[key]) {
        typeMap[key] = Object.create(null);
      }
      typeMap = typeMap[key];
    }
    var tail = argumentTypes[argumentTypes.length - 1];
    key = $traceurRuntime.getOwnHashObject(tail).hash;
    if (!typeMap[key]) {
      typeMap[key] = new GenericType(type, argumentTypes);
    }
    return typeMap[key];
  }
  $traceurRuntime.GenericType = GenericType;
  $traceurRuntime.genericType = genericType;
  $traceurRuntime.type = types;
  return {};
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/runtime-modules.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/runtime-modules.js";
  System.get("traceur-runtime@0.0.87/src/runtime/relativeRequire.js");
  System.get("traceur-runtime@0.0.87/src/runtime/spread.js");
  System.get("traceur-runtime@0.0.87/src/runtime/destructuring.js");
  System.get("traceur-runtime@0.0.87/src/runtime/classes.js");
  System.get("traceur-runtime@0.0.87/src/runtime/async.js");
  System.get("traceur-runtime@0.0.87/src/runtime/generators.js");
  System.get("traceur-runtime@0.0.87/src/runtime/type-assertions.js");
  return {};
});
System.get("traceur-runtime@0.0.87/src/runtime/runtime-modules.js" + '');
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/utils.js";
  var $ceil = Math.ceil;
  var $floor = Math.floor;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $pow = Math.pow;
  var $min = Math.min;
  var toObject = $traceurRuntime.toObject;
  function toUint32(x) {
    return x >>> 0;
  }
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function isCallable(x) {
    return typeof x === 'function';
  }
  function isNumber(x) {
    return typeof x === 'number';
  }
  function toInteger(x) {
    x = +x;
    if ($isNaN(x))
      return 0;
    if (x === 0 || !$isFinite(x))
      return x;
    return x > 0 ? $floor(x) : $ceil(x);
  }
  var MAX_SAFE_LENGTH = $pow(2, 53) - 1;
  function toLength(x) {
    var len = toInteger(x);
    return len < 0 ? 0 : $min(len, MAX_SAFE_LENGTH);
  }
  function checkIterable(x) {
    return !isObject(x) ? undefined : x[Symbol.iterator];
  }
  function isConstructor(x) {
    return isCallable(x);
  }
  function createIteratorResultObject(value, done) {
    return {
      value: value,
      done: done
    };
  }
  function maybeDefine(object, name, descr) {
    if (!(name in object)) {
      Object.defineProperty(object, name, descr);
    }
  }
  function maybeDefineMethod(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  function maybeDefineConst(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
  function maybeAddFunctions(object, functions) {
    for (var i = 0; i < functions.length; i += 2) {
      var name = functions[i];
      var value = functions[i + 1];
      maybeDefineMethod(object, name, value);
    }
  }
  function maybeAddConsts(object, consts) {
    for (var i = 0; i < consts.length; i += 2) {
      var name = consts[i];
      var value = consts[i + 1];
      maybeDefineConst(object, name, value);
    }
  }
  function maybeAddIterator(object, func, Symbol) {
    if (!Symbol || !Symbol.iterator || object[Symbol.iterator])
      return ;
    if (object['@@iterator'])
      func = object['@@iterator'];
    Object.defineProperty(object, Symbol.iterator, {
      value: func,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  var polyfills = [];
  function registerPolyfill(func) {
    polyfills.push(func);
  }
  function polyfillAll(global) {
    polyfills.forEach((function(f) {
      return f(global);
    }));
  }
  return {
    get toObject() {
      return toObject;
    },
    get toUint32() {
      return toUint32;
    },
    get isObject() {
      return isObject;
    },
    get isCallable() {
      return isCallable;
    },
    get isNumber() {
      return isNumber;
    },
    get toInteger() {
      return toInteger;
    },
    get toLength() {
      return toLength;
    },
    get checkIterable() {
      return checkIterable;
    },
    get isConstructor() {
      return isConstructor;
    },
    get createIteratorResultObject() {
      return createIteratorResultObject;
    },
    get maybeDefine() {
      return maybeDefine;
    },
    get maybeDefineMethod() {
      return maybeDefineMethod;
    },
    get maybeDefineConst() {
      return maybeDefineConst;
    },
    get maybeAddFunctions() {
      return maybeAddFunctions;
    },
    get maybeAddConsts() {
      return maybeAddConsts;
    },
    get maybeAddIterator() {
      return maybeAddIterator;
    },
    get registerPolyfill() {
      return registerPolyfill;
    },
    get polyfillAll() {
      return polyfillAll;
    }
  };
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/Map.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/Map.js";
  var $__0 = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js"),
      isObject = $__0.isObject,
      maybeAddIterator = $__0.maybeAddIterator,
      registerPolyfill = $__0.registerPolyfill;
  var getOwnHashObject = $traceurRuntime.getOwnHashObject;
  var $hasOwnProperty = Object.prototype.hasOwnProperty;
  var deletedSentinel = {};
  function lookupIndex(map, key) {
    if (isObject(key)) {
      var hashObject = getOwnHashObject(key);
      return hashObject && map.objectIndex_[hashObject.hash];
    }
    if (typeof key === 'string')
      return map.stringIndex_[key];
    return map.primitiveIndex_[key];
  }
  function initMap(map) {
    map.entries_ = [];
    map.objectIndex_ = Object.create(null);
    map.stringIndex_ = Object.create(null);
    map.primitiveIndex_ = Object.create(null);
    map.deletedCount_ = 0;
  }
  var Map = function Map() {
    var $__10,
        $__11;
    var iterable = arguments[0];
    if (!isObject(this))
      throw new TypeError('Map called on incompatible type');
    if ($hasOwnProperty.call(this, 'entries_')) {
      throw new TypeError('Map can not be reentrantly initialised');
    }
    initMap(this);
    if (iterable !== null && iterable !== undefined) {
      var $__5 = true;
      var $__6 = false;
      var $__7 = undefined;
      try {
        for (var $__3 = void 0,
            $__2 = (iterable)[$traceurRuntime.toProperty(Symbol.iterator)](); !($__5 = ($__3 = $__2.next()).done); $__5 = true) {
          var $__9 = $__3.value,
              key = ($__10 = $__9[$traceurRuntime.toProperty(Symbol.iterator)](), ($__11 = $__10.next()).done ? void 0 : $__11.value),
              value = ($__11 = $__10.next()).done ? void 0 : $__11.value;
          {
            this.set(key, value);
          }
        }
      } catch ($__8) {
        $__6 = true;
        $__7 = $__8;
      } finally {
        try {
          if (!$__5 && $__2.return != null) {
            $__2.return();
          }
        } finally {
          if ($__6) {
            throw $__7;
          }
        }
      }
    }
  };
  ($traceurRuntime.createClass)(Map, {
    get size() {
      return this.entries_.length / 2 - this.deletedCount_;
    },
    get: function(key) {
      var index = lookupIndex(this, key);
      if (index !== undefined)
        return this.entries_[index + 1];
    },
    set: function(key, value) {
      var objectMode = isObject(key);
      var stringMode = typeof key === 'string';
      var index = lookupIndex(this, key);
      if (index !== undefined) {
        this.entries_[index + 1] = value;
      } else {
        index = this.entries_.length;
        this.entries_[index] = key;
        this.entries_[index + 1] = value;
        if (objectMode) {
          var hashObject = getOwnHashObject(key);
          var hash = hashObject.hash;
          this.objectIndex_[hash] = index;
        } else if (stringMode) {
          this.stringIndex_[key] = index;
        } else {
          this.primitiveIndex_[key] = index;
        }
      }
      return this;
    },
    has: function(key) {
      return lookupIndex(this, key) !== undefined;
    },
    delete: function(key) {
      var objectMode = isObject(key);
      var stringMode = typeof key === 'string';
      var index;
      var hash;
      if (objectMode) {
        var hashObject = getOwnHashObject(key);
        if (hashObject) {
          index = this.objectIndex_[hash = hashObject.hash];
          delete this.objectIndex_[hash];
        }
      } else if (stringMode) {
        index = this.stringIndex_[key];
        delete this.stringIndex_[key];
      } else {
        index = this.primitiveIndex_[key];
        delete this.primitiveIndex_[key];
      }
      if (index !== undefined) {
        this.entries_[index] = deletedSentinel;
        this.entries_[index + 1] = undefined;
        this.deletedCount_++;
        return true;
      }
      return false;
    },
    clear: function() {
      initMap(this);
    },
    forEach: function(callbackFn) {
      var thisArg = arguments[1];
      for (var i = 0; i < this.entries_.length; i += 2) {
        var key = this.entries_[i];
        var value = this.entries_[i + 1];
        if (key === deletedSentinel)
          continue;
        callbackFn.call(thisArg, value, key, this);
      }
    },
    entries: $traceurRuntime.initGeneratorFunction(function $__12() {
      var i,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < this.entries_.length) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return [key, value];
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__12, this);
    }),
    keys: $traceurRuntime.initGeneratorFunction(function $__13() {
      var i,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < this.entries_.length) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return key;
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__13, this);
    }),
    values: $traceurRuntime.initGeneratorFunction(function $__14() {
      var i,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < this.entries_.length) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return value;
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__14, this);
    })
  }, {});
  Object.defineProperty(Map.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Map.prototype.entries
  });
  function polyfillMap(global) {
    var $__9 = global,
        Object = $__9.Object,
        Symbol = $__9.Symbol;
    if (!global.Map)
      global.Map = Map;
    var mapPrototype = global.Map.prototype;
    if (mapPrototype.entries === undefined)
      global.Map = Map;
    if (mapPrototype.entries) {
      maybeAddIterator(mapPrototype, mapPrototype.entries, Symbol);
      maybeAddIterator(Object.getPrototypeOf(new global.Map().entries()), function() {
        return this;
      }, Symbol);
    }
  }
  registerPolyfill(polyfillMap);
  return {
    get Map() {
      return Map;
    },
    get polyfillMap() {
      return polyfillMap;
    }
  };
});
System.get("traceur-runtime@0.0.87/src/runtime/polyfills/Map.js" + '');
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/Set.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/Set.js";
  var $__0 = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js"),
      isObject = $__0.isObject,
      maybeAddIterator = $__0.maybeAddIterator,
      registerPolyfill = $__0.registerPolyfill;
  var Map = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/Map.js").Map;
  var getOwnHashObject = $traceurRuntime.getOwnHashObject;
  var $hasOwnProperty = Object.prototype.hasOwnProperty;
  function initSet(set) {
    set.map_ = new Map();
  }
  var Set = function Set() {
    var iterable = arguments[0];
    if (!isObject(this))
      throw new TypeError('Set called on incompatible type');
    if ($hasOwnProperty.call(this, 'map_')) {
      throw new TypeError('Set can not be reentrantly initialised');
    }
    initSet(this);
    if (iterable !== null && iterable !== undefined) {
      var $__7 = true;
      var $__8 = false;
      var $__9 = undefined;
      try {
        for (var $__5 = void 0,
            $__4 = (iterable)[$traceurRuntime.toProperty(Symbol.iterator)](); !($__7 = ($__5 = $__4.next()).done); $__7 = true) {
          var item = $__5.value;
          {
            this.add(item);
          }
        }
      } catch ($__10) {
        $__8 = true;
        $__9 = $__10;
      } finally {
        try {
          if (!$__7 && $__4.return != null) {
            $__4.return();
          }
        } finally {
          if ($__8) {
            throw $__9;
          }
        }
      }
    }
  };
  ($traceurRuntime.createClass)(Set, {
    get size() {
      return this.map_.size;
    },
    has: function(key) {
      return this.map_.has(key);
    },
    add: function(key) {
      this.map_.set(key, key);
      return this;
    },
    delete: function(key) {
      return this.map_.delete(key);
    },
    clear: function() {
      return this.map_.clear();
    },
    forEach: function(callbackFn) {
      var thisArg = arguments[1];
      var $__2 = this;
      return this.map_.forEach((function(value, key) {
        callbackFn.call(thisArg, key, key, $__2);
      }));
    },
    values: $traceurRuntime.initGeneratorFunction(function $__12() {
      var $__13,
          $__14;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $__13 = $ctx.wrapYieldStar(this.map_.keys()[Symbol.iterator]());
              $ctx.sent = void 0;
              $ctx.action = 'next';
              $ctx.state = 12;
              break;
            case 12:
              $__14 = $__13[$ctx.action]($ctx.sentIgnoreThrow);
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = ($__14.done) ? 3 : 2;
              break;
            case 3:
              $ctx.sent = $__14.value;
              $ctx.state = -2;
              break;
            case 2:
              $ctx.state = 12;
              return $__14.value;
            default:
              return $ctx.end();
          }
      }, $__12, this);
    }),
    entries: $traceurRuntime.initGeneratorFunction(function $__15() {
      var $__16,
          $__17;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $__16 = $ctx.wrapYieldStar(this.map_.entries()[Symbol.iterator]());
              $ctx.sent = void 0;
              $ctx.action = 'next';
              $ctx.state = 12;
              break;
            case 12:
              $__17 = $__16[$ctx.action]($ctx.sentIgnoreThrow);
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = ($__17.done) ? 3 : 2;
              break;
            case 3:
              $ctx.sent = $__17.value;
              $ctx.state = -2;
              break;
            case 2:
              $ctx.state = 12;
              return $__17.value;
            default:
              return $ctx.end();
          }
      }, $__15, this);
    })
  }, {});
  Object.defineProperty(Set.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  Object.defineProperty(Set.prototype, 'keys', {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  function polyfillSet(global) {
    var $__11 = global,
        Object = $__11.Object,
        Symbol = $__11.Symbol;
    if (!global.Set)
      global.Set = Set;
    var setPrototype = global.Set.prototype;
    if (setPrototype.values) {
      maybeAddIterator(setPrototype, setPrototype.values, Symbol);
      maybeAddIterator(Object.getPrototypeOf(new global.Set().values()), function() {
        return this;
      }, Symbol);
    }
  }
  registerPolyfill(polyfillSet);
  return {
    get Set() {
      return Set;
    },
    get polyfillSet() {
      return polyfillSet;
    }
  };
});
System.get("traceur-runtime@0.0.87/src/runtime/polyfills/Set.js" + '');
System.registerModule("traceur-runtime@0.0.87/node_modules/rsvp/lib/rsvp/asap.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/node_modules/rsvp/lib/rsvp/asap.js";
  var len = 0;
  function asap(callback, arg) {
    queue[len] = callback;
    queue[len + 1] = arg;
    len += 2;
    if (len === 2) {
      scheduleFlush();
    }
  }
  var $__default = asap;
  var browserGlobal = (typeof window !== 'undefined') ? window : {};
  var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
  var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';
  function useNextTick() {
    return function() {
      process.nextTick(flush);
    };
  }
  function useMutationObserver() {
    var iterations = 0;
    var observer = new BrowserMutationObserver(flush);
    var node = document.createTextNode('');
    observer.observe(node, {characterData: true});
    return function() {
      node.data = (iterations = ++iterations % 2);
    };
  }
  function useMessageChannel() {
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    return function() {
      channel.port2.postMessage(0);
    };
  }
  function useSetTimeout() {
    return function() {
      setTimeout(flush, 1);
    };
  }
  var queue = new Array(1000);
  function flush() {
    for (var i = 0; i < len; i += 2) {
      var callback = queue[i];
      var arg = queue[i + 1];
      callback(arg);
      queue[i] = undefined;
      queue[i + 1] = undefined;
    }
    len = 0;
  }
  var scheduleFlush;
  if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
    scheduleFlush = useNextTick();
  } else if (BrowserMutationObserver) {
    scheduleFlush = useMutationObserver();
  } else if (isWorker) {
    scheduleFlush = useMessageChannel();
  } else {
    scheduleFlush = useSetTimeout();
  }
  return {get default() {
      return $__default;
    }};
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/Promise.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/Promise.js";
  var async = System.get("traceur-runtime@0.0.87/node_modules/rsvp/lib/rsvp/asap.js").default;
  var registerPolyfill = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js").registerPolyfill;
  var promiseRaw = {};
  function isPromise(x) {
    return x && typeof x === 'object' && x.status_ !== undefined;
  }
  function idResolveHandler(x) {
    return x;
  }
  function idRejectHandler(x) {
    throw x;
  }
  function chain(promise) {
    var onResolve = arguments[1] !== (void 0) ? arguments[1] : idResolveHandler;
    var onReject = arguments[2] !== (void 0) ? arguments[2] : idRejectHandler;
    var deferred = getDeferred(promise.constructor);
    switch (promise.status_) {
      case undefined:
        throw TypeError;
      case 0:
        promise.onResolve_.push(onResolve, deferred);
        promise.onReject_.push(onReject, deferred);
        break;
      case +1:
        promiseEnqueue(promise.value_, [onResolve, deferred]);
        break;
      case -1:
        promiseEnqueue(promise.value_, [onReject, deferred]);
        break;
    }
    return deferred.promise;
  }
  function getDeferred(C) {
    if (this === $Promise) {
      var promise = promiseInit(new $Promise(promiseRaw));
      return {
        promise: promise,
        resolve: (function(x) {
          promiseResolve(promise, x);
        }),
        reject: (function(r) {
          promiseReject(promise, r);
        })
      };
    } else {
      var result = {};
      result.promise = new C((function(resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
      }));
      return result;
    }
  }
  function promiseSet(promise, status, value, onResolve, onReject) {
    promise.status_ = status;
    promise.value_ = value;
    promise.onResolve_ = onResolve;
    promise.onReject_ = onReject;
    return promise;
  }
  function promiseInit(promise) {
    return promiseSet(promise, 0, undefined, [], []);
  }
  var Promise = function Promise(resolver) {
    if (resolver === promiseRaw)
      return ;
    if (typeof resolver !== 'function')
      throw new TypeError;
    var promise = promiseInit(this);
    try {
      resolver((function(x) {
        promiseResolve(promise, x);
      }), (function(r) {
        promiseReject(promise, r);
      }));
    } catch (e) {
      promiseReject(promise, e);
    }
  };
  ($traceurRuntime.createClass)(Promise, {
    catch: function(onReject) {
      return this.then(undefined, onReject);
    },
    then: function(onResolve, onReject) {
      if (typeof onResolve !== 'function')
        onResolve = idResolveHandler;
      if (typeof onReject !== 'function')
        onReject = idRejectHandler;
      var that = this;
      var constructor = this.constructor;
      return chain(this, function(x) {
        x = promiseCoerce(constructor, x);
        return x === that ? onReject(new TypeError) : isPromise(x) ? x.then(onResolve, onReject) : onResolve(x);
      }, onReject);
    }
  }, {
    resolve: function(x) {
      if (this === $Promise) {
        if (isPromise(x)) {
          return x;
        }
        return promiseSet(new $Promise(promiseRaw), +1, x);
      } else {
        return new this(function(resolve, reject) {
          resolve(x);
        });
      }
    },
    reject: function(r) {
      if (this === $Promise) {
        return promiseSet(new $Promise(promiseRaw), -1, r);
      } else {
        return new this((function(resolve, reject) {
          reject(r);
        }));
      }
    },
    all: function(values) {
      var deferred = getDeferred(this);
      var resolutions = [];
      try {
        var makeCountdownFunction = function(i) {
          return (function(x) {
            resolutions[i] = x;
            if (--count === 0)
              deferred.resolve(resolutions);
          });
        };
        var count = 0;
        var i = 0;
        var $__6 = true;
        var $__7 = false;
        var $__8 = undefined;
        try {
          for (var $__4 = void 0,
              $__3 = (values)[$traceurRuntime.toProperty(Symbol.iterator)](); !($__6 = ($__4 = $__3.next()).done); $__6 = true) {
            var value = $__4.value;
            {
              var countdownFunction = makeCountdownFunction(i);
              this.resolve(value).then(countdownFunction, (function(r) {
                deferred.reject(r);
              }));
              ++i;
              ++count;
            }
          }
        } catch ($__9) {
          $__7 = true;
          $__8 = $__9;
        } finally {
          try {
            if (!$__6 && $__3.return != null) {
              $__3.return();
            }
          } finally {
            if ($__7) {
              throw $__8;
            }
          }
        }
        if (count === 0) {
          deferred.resolve(resolutions);
        }
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    },
    race: function(values) {
      var deferred = getDeferred(this);
      try {
        for (var i = 0; i < values.length; i++) {
          this.resolve(values[i]).then((function(x) {
            deferred.resolve(x);
          }), (function(r) {
            deferred.reject(r);
          }));
        }
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    }
  });
  var $Promise = Promise;
  var $PromiseReject = $Promise.reject;
  function promiseResolve(promise, x) {
    promiseDone(promise, +1, x, promise.onResolve_);
  }
  function promiseReject(promise, r) {
    promiseDone(promise, -1, r, promise.onReject_);
  }
  function promiseDone(promise, status, value, reactions) {
    if (promise.status_ !== 0)
      return ;
    promiseEnqueue(value, reactions);
    promiseSet(promise, status, value);
  }
  function promiseEnqueue(value, tasks) {
    async((function() {
      for (var i = 0; i < tasks.length; i += 2) {
        promiseHandle(value, tasks[i], tasks[i + 1]);
      }
    }));
  }
  function promiseHandle(value, handler, deferred) {
    try {
      var result = handler(value);
      if (result === deferred.promise)
        throw new TypeError;
      else if (isPromise(result))
        chain(result, deferred.resolve, deferred.reject);
      else
        deferred.resolve(result);
    } catch (e) {
      try {
        deferred.reject(e);
      } catch (e) {}
    }
  }
  var thenableSymbol = '@@thenable';
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function promiseCoerce(constructor, x) {
    if (!isPromise(x) && isObject(x)) {
      var then;
      try {
        then = x.then;
      } catch (r) {
        var promise = $PromiseReject.call(constructor, r);
        x[thenableSymbol] = promise;
        return promise;
      }
      if (typeof then === 'function') {
        var p = x[thenableSymbol];
        if (p) {
          return p;
        } else {
          var deferred = getDeferred(constructor);
          x[thenableSymbol] = deferred.promise;
          try {
            then.call(x, deferred.resolve, deferred.reject);
          } catch (r) {
            deferred.reject(r);
          }
          return deferred.promise;
        }
      }
    }
    return x;
  }
  function polyfillPromise(global) {
    if (!global.Promise)
      global.Promise = Promise;
  }
  registerPolyfill(polyfillPromise);
  return {
    get Promise() {
      return Promise;
    },
    get polyfillPromise() {
      return polyfillPromise;
    }
  };
});
System.get("traceur-runtime@0.0.87/src/runtime/polyfills/Promise.js" + '');
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/StringIterator.js", [], function() {
  "use strict";
  var $__2;
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/StringIterator.js";
  var $__0 = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js"),
      createIteratorResultObject = $__0.createIteratorResultObject,
      isObject = $__0.isObject;
  var toProperty = $traceurRuntime.toProperty;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var iteratedString = Symbol('iteratedString');
  var stringIteratorNextIndex = Symbol('stringIteratorNextIndex');
  var StringIterator = function StringIterator() {
    ;
  };
  ($traceurRuntime.createClass)(StringIterator, ($__2 = {}, Object.defineProperty($__2, "next", {
    value: function() {
      var o = this;
      if (!isObject(o) || !hasOwnProperty.call(o, iteratedString)) {
        throw new TypeError('this must be a StringIterator object');
      }
      var s = o[toProperty(iteratedString)];
      if (s === undefined) {
        return createIteratorResultObject(undefined, true);
      }
      var position = o[toProperty(stringIteratorNextIndex)];
      var len = s.length;
      if (position >= len) {
        o[toProperty(iteratedString)] = undefined;
        return createIteratorResultObject(undefined, true);
      }
      var first = s.charCodeAt(position);
      var resultString;
      if (first < 0xD800 || first > 0xDBFF || position + 1 === len) {
        resultString = String.fromCharCode(first);
      } else {
        var second = s.charCodeAt(position + 1);
        if (second < 0xDC00 || second > 0xDFFF) {
          resultString = String.fromCharCode(first);
        } else {
          resultString = String.fromCharCode(first) + String.fromCharCode(second);
        }
      }
      o[toProperty(stringIteratorNextIndex)] = position + resultString.length;
      return createIteratorResultObject(resultString, false);
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), Object.defineProperty($__2, Symbol.iterator, {
    value: function() {
      return this;
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), $__2), {});
  function createStringIterator(string) {
    var s = String(string);
    var iterator = Object.create(StringIterator.prototype);
    iterator[toProperty(iteratedString)] = s;
    iterator[toProperty(stringIteratorNextIndex)] = 0;
    return iterator;
  }
  return {get createStringIterator() {
      return createStringIterator;
    }};
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/String.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/String.js";
  var createStringIterator = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/StringIterator.js").createStringIterator;
  var $__1 = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__1.maybeAddFunctions,
      maybeAddIterator = $__1.maybeAddIterator,
      registerPolyfill = $__1.registerPolyfill;
  var $toString = Object.prototype.toString;
  var $indexOf = String.prototype.indexOf;
  var $lastIndexOf = String.prototype.lastIndexOf;
  function startsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (isNaN(pos)) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    return $indexOf.call(string, searchString, pos) == start;
  }
  function endsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var pos = stringLength;
    if (arguments.length > 1) {
      var position = arguments[1];
      if (position !== undefined) {
        pos = position ? Number(position) : 0;
        if (isNaN(pos)) {
          pos = 0;
        }
      }
    }
    var end = Math.min(Math.max(pos, 0), stringLength);
    var start = end - searchLength;
    if (start < 0) {
      return false;
    }
    return $lastIndexOf.call(string, searchString, start) == start;
  }
  function includes(search) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    if (search && $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (pos != pos) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    if (searchLength + start > stringLength) {
      return false;
    }
    return $indexOf.call(string, searchString, pos) != -1;
  }
  function repeat(count) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var n = count ? Number(count) : 0;
    if (isNaN(n)) {
      n = 0;
    }
    if (n < 0 || n == Infinity) {
      throw RangeError();
    }
    if (n == 0) {
      return '';
    }
    var result = '';
    while (n--) {
      result += string;
    }
    return result;
  }
  function codePointAt(position) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var size = string.length;
    var index = position ? Number(position) : 0;
    if (isNaN(index)) {
      index = 0;
    }
    if (index < 0 || index >= size) {
      return undefined;
    }
    var first = string.charCodeAt(index);
    var second;
    if (first >= 0xD800 && first <= 0xDBFF && size > index + 1) {
      second = string.charCodeAt(index + 1);
      if (second >= 0xDC00 && second <= 0xDFFF) {
        return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
      }
    }
    return first;
  }
  function raw(callsite) {
    var raw = callsite.raw;
    var len = raw.length >>> 0;
    if (len === 0)
      return '';
    var s = '';
    var i = 0;
    while (true) {
      s += raw[i];
      if (i + 1 === len)
        return s;
      s += arguments[++i];
    }
  }
  function fromCodePoint(_) {
    var codeUnits = [];
    var floor = Math.floor;
    var highSurrogate;
    var lowSurrogate;
    var index = -1;
    var length = arguments.length;
    if (!length) {
      return '';
    }
    while (++index < length) {
      var codePoint = Number(arguments[index]);
      if (!isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF || floor(codePoint) != codePoint) {
        throw RangeError('Invalid code point: ' + codePoint);
      }
      if (codePoint <= 0xFFFF) {
        codeUnits.push(codePoint);
      } else {
        codePoint -= 0x10000;
        highSurrogate = (codePoint >> 10) + 0xD800;
        lowSurrogate = (codePoint % 0x400) + 0xDC00;
        codeUnits.push(highSurrogate, lowSurrogate);
      }
    }
    return String.fromCharCode.apply(null, codeUnits);
  }
  function stringPrototypeIterator() {
    var o = $traceurRuntime.checkObjectCoercible(this);
    var s = String(o);
    return createStringIterator(s);
  }
  function polyfillString(global) {
    var String = global.String;
    maybeAddFunctions(String.prototype, ['codePointAt', codePointAt, 'endsWith', endsWith, 'includes', includes, 'repeat', repeat, 'startsWith', startsWith]);
    maybeAddFunctions(String, ['fromCodePoint', fromCodePoint, 'raw', raw]);
    maybeAddIterator(String.prototype, stringPrototypeIterator, Symbol);
  }
  registerPolyfill(polyfillString);
  return {
    get startsWith() {
      return startsWith;
    },
    get endsWith() {
      return endsWith;
    },
    get includes() {
      return includes;
    },
    get repeat() {
      return repeat;
    },
    get codePointAt() {
      return codePointAt;
    },
    get raw() {
      return raw;
    },
    get fromCodePoint() {
      return fromCodePoint;
    },
    get stringPrototypeIterator() {
      return stringPrototypeIterator;
    },
    get polyfillString() {
      return polyfillString;
    }
  };
});
System.get("traceur-runtime@0.0.87/src/runtime/polyfills/String.js" + '');
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/ArrayIterator.js", [], function() {
  "use strict";
  var $__2;
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/ArrayIterator.js";
  var $__0 = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js"),
      toObject = $__0.toObject,
      toUint32 = $__0.toUint32,
      createIteratorResultObject = $__0.createIteratorResultObject;
  var ARRAY_ITERATOR_KIND_KEYS = 1;
  var ARRAY_ITERATOR_KIND_VALUES = 2;
  var ARRAY_ITERATOR_KIND_ENTRIES = 3;
  var ArrayIterator = function ArrayIterator() {
    ;
  };
  ($traceurRuntime.createClass)(ArrayIterator, ($__2 = {}, Object.defineProperty($__2, "next", {
    value: function() {
      var iterator = toObject(this);
      var array = iterator.iteratorObject_;
      if (!array) {
        throw new TypeError('Object is not an ArrayIterator');
      }
      var index = iterator.arrayIteratorNextIndex_;
      var itemKind = iterator.arrayIterationKind_;
      var length = toUint32(array.length);
      if (index >= length) {
        iterator.arrayIteratorNextIndex_ = Infinity;
        return createIteratorResultObject(undefined, true);
      }
      iterator.arrayIteratorNextIndex_ = index + 1;
      if (itemKind == ARRAY_ITERATOR_KIND_VALUES)
        return createIteratorResultObject(array[index], false);
      if (itemKind == ARRAY_ITERATOR_KIND_ENTRIES)
        return createIteratorResultObject([index, array[index]], false);
      return createIteratorResultObject(index, false);
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), Object.defineProperty($__2, Symbol.iterator, {
    value: function() {
      return this;
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), $__2), {});
  function createArrayIterator(array, kind) {
    var object = toObject(array);
    var iterator = new ArrayIterator;
    iterator.iteratorObject_ = object;
    iterator.arrayIteratorNextIndex_ = 0;
    iterator.arrayIterationKind_ = kind;
    return iterator;
  }
  function entries() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_ENTRIES);
  }
  function keys() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_KEYS);
  }
  function values() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_VALUES);
  }
  return {
    get entries() {
      return entries;
    },
    get keys() {
      return keys;
    },
    get values() {
      return values;
    }
  };
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/Array.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/Array.js";
  var $__0 = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/ArrayIterator.js"),
      entries = $__0.entries,
      keys = $__0.keys,
      jsValues = $__0.values;
  var $__1 = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js"),
      checkIterable = $__1.checkIterable,
      isCallable = $__1.isCallable,
      isConstructor = $__1.isConstructor,
      maybeAddFunctions = $__1.maybeAddFunctions,
      maybeAddIterator = $__1.maybeAddIterator,
      registerPolyfill = $__1.registerPolyfill,
      toInteger = $__1.toInteger,
      toLength = $__1.toLength,
      toObject = $__1.toObject;
  function from(arrLike) {
    var mapFn = arguments[1];
    var thisArg = arguments[2];
    var C = this;
    var items = toObject(arrLike);
    var mapping = mapFn !== undefined;
    var k = 0;
    var arr,
        len;
    if (mapping && !isCallable(mapFn)) {
      throw TypeError();
    }
    if (checkIterable(items)) {
      arr = isConstructor(C) ? new C() : [];
      var $__5 = true;
      var $__6 = false;
      var $__7 = undefined;
      try {
        for (var $__3 = void 0,
            $__2 = (items)[$traceurRuntime.toProperty(Symbol.iterator)](); !($__5 = ($__3 = $__2.next()).done); $__5 = true) {
          var item = $__3.value;
          {
            if (mapping) {
              arr[k] = mapFn.call(thisArg, item, k);
            } else {
              arr[k] = item;
            }
            k++;
          }
        }
      } catch ($__8) {
        $__6 = true;
        $__7 = $__8;
      } finally {
        try {
          if (!$__5 && $__2.return != null) {
            $__2.return();
          }
        } finally {
          if ($__6) {
            throw $__7;
          }
        }
      }
      arr.length = k;
      return arr;
    }
    len = toLength(items.length);
    arr = isConstructor(C) ? new C(len) : new Array(len);
    for (; k < len; k++) {
      if (mapping) {
        arr[k] = typeof thisArg === 'undefined' ? mapFn(items[k], k) : mapFn.call(thisArg, items[k], k);
      } else {
        arr[k] = items[k];
      }
    }
    arr.length = len;
    return arr;
  }
  function of() {
    for (var items = [],
        $__9 = 0; $__9 < arguments.length; $__9++)
      items[$__9] = arguments[$__9];
    var C = this;
    var len = items.length;
    var arr = isConstructor(C) ? new C(len) : new Array(len);
    for (var k = 0; k < len; k++) {
      arr[k] = items[k];
    }
    arr.length = len;
    return arr;
  }
  function fill(value) {
    var start = arguments[1] !== (void 0) ? arguments[1] : 0;
    var end = arguments[2];
    var object = toObject(this);
    var len = toLength(object.length);
    var fillStart = toInteger(start);
    var fillEnd = end !== undefined ? toInteger(end) : len;
    fillStart = fillStart < 0 ? Math.max(len + fillStart, 0) : Math.min(fillStart, len);
    fillEnd = fillEnd < 0 ? Math.max(len + fillEnd, 0) : Math.min(fillEnd, len);
    while (fillStart < fillEnd) {
      object[fillStart] = value;
      fillStart++;
    }
    return object;
  }
  function find(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg);
  }
  function findIndex(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg, true);
  }
  function findHelper(self, predicate) {
    var thisArg = arguments[2];
    var returnIndex = arguments[3] !== (void 0) ? arguments[3] : false;
    var object = toObject(self);
    var len = toLength(object.length);
    if (!isCallable(predicate)) {
      throw TypeError();
    }
    for (var i = 0; i < len; i++) {
      var value = object[i];
      if (predicate.call(thisArg, value, i, object)) {
        return returnIndex ? i : value;
      }
    }
    return returnIndex ? -1 : undefined;
  }
  function polyfillArray(global) {
    var $__10 = global,
        Array = $__10.Array,
        Object = $__10.Object,
        Symbol = $__10.Symbol;
    var values = jsValues;
    if (Symbol && Symbol.iterator && Array.prototype[Symbol.iterator]) {
      values = Array.prototype[Symbol.iterator];
    }
    maybeAddFunctions(Array.prototype, ['entries', entries, 'keys', keys, 'values', values, 'fill', fill, 'find', find, 'findIndex', findIndex]);
    maybeAddFunctions(Array, ['from', from, 'of', of]);
    maybeAddIterator(Array.prototype, values, Symbol);
    maybeAddIterator(Object.getPrototypeOf([].values()), function() {
      return this;
    }, Symbol);
  }
  registerPolyfill(polyfillArray);
  return {
    get from() {
      return from;
    },
    get of() {
      return of;
    },
    get fill() {
      return fill;
    },
    get find() {
      return find;
    },
    get findIndex() {
      return findIndex;
    },
    get polyfillArray() {
      return polyfillArray;
    }
  };
});
System.get("traceur-runtime@0.0.87/src/runtime/polyfills/Array.js" + '');
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/Object.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/Object.js";
  var $__0 = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__0.maybeAddFunctions,
      registerPolyfill = $__0.registerPolyfill;
  var $__1 = $traceurRuntime,
      defineProperty = $__1.defineProperty,
      getOwnPropertyDescriptor = $__1.getOwnPropertyDescriptor,
      getOwnPropertyNames = $__1.getOwnPropertyNames,
      isPrivateName = $__1.isPrivateName,
      keys = $__1.keys;
  function is(left, right) {
    if (left === right)
      return left !== 0 || 1 / left === 1 / right;
    return left !== left && right !== right;
  }
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      var props = source == null ? [] : keys(source);
      var p = void 0,
          length = props.length;
      for (p = 0; p < length; p++) {
        var name = props[p];
        if (isPrivateName(name))
          continue;
        target[name] = source[name];
      }
    }
    return target;
  }
  function mixin(target, source) {
    var props = getOwnPropertyNames(source);
    var p,
        descriptor,
        length = props.length;
    for (p = 0; p < length; p++) {
      var name = props[p];
      if (isPrivateName(name))
        continue;
      descriptor = getOwnPropertyDescriptor(source, props[p]);
      defineProperty(target, props[p], descriptor);
    }
    return target;
  }
  function polyfillObject(global) {
    var Object = global.Object;
    maybeAddFunctions(Object, ['assign', assign, 'is', is, 'mixin', mixin]);
  }
  registerPolyfill(polyfillObject);
  return {
    get is() {
      return is;
    },
    get assign() {
      return assign;
    },
    get mixin() {
      return mixin;
    },
    get polyfillObject() {
      return polyfillObject;
    }
  };
});
System.get("traceur-runtime@0.0.87/src/runtime/polyfills/Object.js" + '');
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/Number.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/Number.js";
  var $__0 = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js"),
      isNumber = $__0.isNumber,
      maybeAddConsts = $__0.maybeAddConsts,
      maybeAddFunctions = $__0.maybeAddFunctions,
      registerPolyfill = $__0.registerPolyfill,
      toInteger = $__0.toInteger;
  var $abs = Math.abs;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
  var MIN_SAFE_INTEGER = -Math.pow(2, 53) + 1;
  var EPSILON = Math.pow(2, -52);
  function NumberIsFinite(number) {
    return isNumber(number) && $isFinite(number);
  }
  ;
  function isInteger(number) {
    return NumberIsFinite(number) && toInteger(number) === number;
  }
  function NumberIsNaN(number) {
    return isNumber(number) && $isNaN(number);
  }
  ;
  function isSafeInteger(number) {
    if (NumberIsFinite(number)) {
      var integral = toInteger(number);
      if (integral === number)
        return $abs(integral) <= MAX_SAFE_INTEGER;
    }
    return false;
  }
  function polyfillNumber(global) {
    var Number = global.Number;
    maybeAddConsts(Number, ['MAX_SAFE_INTEGER', MAX_SAFE_INTEGER, 'MIN_SAFE_INTEGER', MIN_SAFE_INTEGER, 'EPSILON', EPSILON]);
    maybeAddFunctions(Number, ['isFinite', NumberIsFinite, 'isInteger', isInteger, 'isNaN', NumberIsNaN, 'isSafeInteger', isSafeInteger]);
  }
  registerPolyfill(polyfillNumber);
  return {
    get MAX_SAFE_INTEGER() {
      return MAX_SAFE_INTEGER;
    },
    get MIN_SAFE_INTEGER() {
      return MIN_SAFE_INTEGER;
    },
    get EPSILON() {
      return EPSILON;
    },
    get isFinite() {
      return NumberIsFinite;
    },
    get isInteger() {
      return isInteger;
    },
    get isNaN() {
      return NumberIsNaN;
    },
    get isSafeInteger() {
      return isSafeInteger;
    },
    get polyfillNumber() {
      return polyfillNumber;
    }
  };
});
System.get("traceur-runtime@0.0.87/src/runtime/polyfills/Number.js" + '');
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/fround.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/fround.js";
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $__0 = Math,
      LN2 = $__0.LN2,
      abs = $__0.abs,
      floor = $__0.floor,
      log = $__0.log,
      min = $__0.min,
      pow = $__0.pow;
  function packIEEE754(v, ebits, fbits) {
    var bias = (1 << (ebits - 1)) - 1,
        s,
        e,
        f,
        ln,
        i,
        bits,
        str,
        bytes;
    function roundToEven(n) {
      var w = floor(n),
          f = n - w;
      if (f < 0.5)
        return w;
      if (f > 0.5)
        return w + 1;
      return w % 2 ? w + 1 : w;
    }
    if (v !== v) {
      e = (1 << ebits) - 1;
      f = pow(2, fbits - 1);
      s = 0;
    } else if (v === Infinity || v === -Infinity) {
      e = (1 << ebits) - 1;
      f = 0;
      s = (v < 0) ? 1 : 0;
    } else if (v === 0) {
      e = 0;
      f = 0;
      s = (1 / v === -Infinity) ? 1 : 0;
    } else {
      s = v < 0;
      v = abs(v);
      if (v >= pow(2, 1 - bias)) {
        e = min(floor(log(v) / LN2), 1023);
        f = roundToEven(v / pow(2, e) * pow(2, fbits));
        if (f / pow(2, fbits) >= 2) {
          e = e + 1;
          f = 1;
        }
        if (e > bias) {
          e = (1 << ebits) - 1;
          f = 0;
        } else {
          e = e + bias;
          f = f - pow(2, fbits);
        }
      } else {
        e = 0;
        f = roundToEven(v / pow(2, 1 - bias - fbits));
      }
    }
    bits = [];
    for (i = fbits; i; i -= 1) {
      bits.push(f % 2 ? 1 : 0);
      f = floor(f / 2);
    }
    for (i = ebits; i; i -= 1) {
      bits.push(e % 2 ? 1 : 0);
      e = floor(e / 2);
    }
    bits.push(s ? 1 : 0);
    bits.reverse();
    str = bits.join('');
    bytes = [];
    while (str.length) {
      bytes.push(parseInt(str.substring(0, 8), 2));
      str = str.substring(8);
    }
    return bytes;
  }
  function unpackIEEE754(bytes, ebits, fbits) {
    var bits = [],
        i,
        j,
        b,
        str,
        bias,
        s,
        e,
        f;
    for (i = bytes.length; i; i -= 1) {
      b = bytes[i - 1];
      for (j = 8; j; j -= 1) {
        bits.push(b % 2 ? 1 : 0);
        b = b >> 1;
      }
    }
    bits.reverse();
    str = bits.join('');
    bias = (1 << (ebits - 1)) - 1;
    s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
    e = parseInt(str.substring(1, 1 + ebits), 2);
    f = parseInt(str.substring(1 + ebits), 2);
    if (e === (1 << ebits) - 1) {
      return f !== 0 ? NaN : s * Infinity;
    } else if (e > 0) {
      return s * pow(2, e - bias) * (1 + f / pow(2, fbits));
    } else if (f !== 0) {
      return s * pow(2, -(bias - 1)) * (f / pow(2, fbits));
    } else {
      return s < 0 ? -0 : 0;
    }
  }
  function unpackF32(b) {
    return unpackIEEE754(b, 8, 23);
  }
  function packF32(v) {
    return packIEEE754(v, 8, 23);
  }
  function fround(x) {
    if (x === 0 || !$isFinite(x) || $isNaN(x)) {
      return x;
    }
    return unpackF32(packF32(Number(x)));
  }
  return {get fround() {
      return fround;
    }};
});
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/Math.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/Math.js";
  var jsFround = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/fround.js").fround;
  var $__1 = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__1.maybeAddFunctions,
      registerPolyfill = $__1.registerPolyfill,
      toUint32 = $__1.toUint32;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $__2 = Math,
      abs = $__2.abs,
      ceil = $__2.ceil,
      exp = $__2.exp,
      floor = $__2.floor,
      log = $__2.log,
      pow = $__2.pow,
      sqrt = $__2.sqrt;
  function clz32(x) {
    x = toUint32(+x);
    if (x == 0)
      return 32;
    var result = 0;
    if ((x & 0xFFFF0000) === 0) {
      x <<= 16;
      result += 16;
    }
    ;
    if ((x & 0xFF000000) === 0) {
      x <<= 8;
      result += 8;
    }
    ;
    if ((x & 0xF0000000) === 0) {
      x <<= 4;
      result += 4;
    }
    ;
    if ((x & 0xC0000000) === 0) {
      x <<= 2;
      result += 2;
    }
    ;
    if ((x & 0x80000000) === 0) {
      x <<= 1;
      result += 1;
    }
    ;
    return result;
  }
  function imul(x, y) {
    x = toUint32(+x);
    y = toUint32(+y);
    var xh = (x >>> 16) & 0xffff;
    var xl = x & 0xffff;
    var yh = (y >>> 16) & 0xffff;
    var yl = y & 0xffff;
    return xl * yl + (((xh * yl + xl * yh) << 16) >>> 0) | 0;
  }
  function sign(x) {
    x = +x;
    if (x > 0)
      return 1;
    if (x < 0)
      return -1;
    return x;
  }
  function log10(x) {
    return log(x) * 0.434294481903251828;
  }
  function log2(x) {
    return log(x) * 1.442695040888963407;
  }
  function log1p(x) {
    x = +x;
    if (x < -1 || $isNaN(x)) {
      return NaN;
    }
    if (x === 0 || x === Infinity) {
      return x;
    }
    if (x === -1) {
      return -Infinity;
    }
    var result = 0;
    var n = 50;
    if (x < 0 || x > 1) {
      return log(1 + x);
    }
    for (var i = 1; i < n; i++) {
      if ((i % 2) === 0) {
        result -= pow(x, i) / i;
      } else {
        result += pow(x, i) / i;
      }
    }
    return result;
  }
  function expm1(x) {
    x = +x;
    if (x === -Infinity) {
      return -1;
    }
    if (!$isFinite(x) || x === 0) {
      return x;
    }
    return exp(x) - 1;
  }
  function cosh(x) {
    x = +x;
    if (x === 0) {
      return 1;
    }
    if ($isNaN(x)) {
      return NaN;
    }
    if (!$isFinite(x)) {
      return Infinity;
    }
    if (x < 0) {
      x = -x;
    }
    if (x > 21) {
      return exp(x) / 2;
    }
    return (exp(x) + exp(-x)) / 2;
  }
  function sinh(x) {
    x = +x;
    if (!$isFinite(x) || x === 0) {
      return x;
    }
    return (exp(x) - exp(-x)) / 2;
  }
  function tanh(x) {
    x = +x;
    if (x === 0)
      return x;
    if (!$isFinite(x))
      return sign(x);
    var exp1 = exp(x);
    var exp2 = exp(-x);
    return (exp1 - exp2) / (exp1 + exp2);
  }
  function acosh(x) {
    x = +x;
    if (x < 1)
      return NaN;
    if (!$isFinite(x))
      return x;
    return log(x + sqrt(x + 1) * sqrt(x - 1));
  }
  function asinh(x) {
    x = +x;
    if (x === 0 || !$isFinite(x))
      return x;
    if (x > 0)
      return log(x + sqrt(x * x + 1));
    return -log(-x + sqrt(x * x + 1));
  }
  function atanh(x) {
    x = +x;
    if (x === -1) {
      return -Infinity;
    }
    if (x === 1) {
      return Infinity;
    }
    if (x === 0) {
      return x;
    }
    if ($isNaN(x) || x < -1 || x > 1) {
      return NaN;
    }
    return 0.5 * log((1 + x) / (1 - x));
  }
  function hypot(x, y) {
    var length = arguments.length;
    var args = new Array(length);
    var max = 0;
    for (var i = 0; i < length; i++) {
      var n = arguments[i];
      n = +n;
      if (n === Infinity || n === -Infinity)
        return Infinity;
      n = abs(n);
      if (n > max)
        max = n;
      args[i] = n;
    }
    if (max === 0)
      max = 1;
    var sum = 0;
    var compensation = 0;
    for (var i = 0; i < length; i++) {
      var n = args[i] / max;
      var summand = n * n - compensation;
      var preliminary = sum + summand;
      compensation = (preliminary - sum) - summand;
      sum = preliminary;
    }
    return sqrt(sum) * max;
  }
  function trunc(x) {
    x = +x;
    if (x > 0)
      return floor(x);
    if (x < 0)
      return ceil(x);
    return x;
  }
  var fround,
      f32;
  if (typeof Float32Array === 'function') {
    f32 = new Float32Array(1);
    fround = function(x) {
      f32[0] = Number(x);
      return f32[0];
    };
  } else {
    fround = jsFround;
  }
  ;
  function cbrt(x) {
    x = +x;
    if (x === 0)
      return x;
    var negate = x < 0;
    if (negate)
      x = -x;
    var result = pow(x, 1 / 3);
    return negate ? -result : result;
  }
  function polyfillMath(global) {
    var Math = global.Math;
    maybeAddFunctions(Math, ['acosh', acosh, 'asinh', asinh, 'atanh', atanh, 'cbrt', cbrt, 'clz32', clz32, 'cosh', cosh, 'expm1', expm1, 'fround', fround, 'hypot', hypot, 'imul', imul, 'log10', log10, 'log1p', log1p, 'log2', log2, 'sign', sign, 'sinh', sinh, 'tanh', tanh, 'trunc', trunc]);
  }
  registerPolyfill(polyfillMath);
  return {
    get clz32() {
      return clz32;
    },
    get imul() {
      return imul;
    },
    get sign() {
      return sign;
    },
    get log10() {
      return log10;
    },
    get log2() {
      return log2;
    },
    get log1p() {
      return log1p;
    },
    get expm1() {
      return expm1;
    },
    get cosh() {
      return cosh;
    },
    get sinh() {
      return sinh;
    },
    get tanh() {
      return tanh;
    },
    get acosh() {
      return acosh;
    },
    get asinh() {
      return asinh;
    },
    get atanh() {
      return atanh;
    },
    get hypot() {
      return hypot;
    },
    get trunc() {
      return trunc;
    },
    get fround() {
      return fround;
    },
    get cbrt() {
      return cbrt;
    },
    get polyfillMath() {
      return polyfillMath;
    }
  };
});
System.get("traceur-runtime@0.0.87/src/runtime/polyfills/Math.js" + '');
System.registerModule("traceur-runtime@0.0.87/src/runtime/polyfills/polyfills.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.87/src/runtime/polyfills/polyfills.js";
  var polyfillAll = System.get("traceur-runtime@0.0.87/src/runtime/polyfills/utils.js").polyfillAll;
  polyfillAll(Reflect.global);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
    polyfillAll(global);
  };
  return {};
});
System.get("traceur-runtime@0.0.87/src/runtime/polyfills/polyfills.js" + '');

(function(global) {

  var defined = {};

  // indexOf polyfill for IE8
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  function dedupe(deps) {
    var newDeps = [];
    for (var i = 0, l = deps.length; i < l; i++)
      if (indexOf.call(newDeps, deps[i]) == -1)
        newDeps.push(deps[i])
    return newDeps;
  }

  function register(name, deps, declare, execute) {
    if (typeof name != 'string')
      throw "System.register provided no module name";

    var entry;

    // dynamic
    if (typeof declare == 'boolean') {
      entry = {
        declarative: false,
        deps: deps,
        execute: execute,
        executingRequire: declare
      };
    }
    else {
      // ES6 declarative
      entry = {
        declarative: true,
        deps: deps,
        declare: declare
      };
    }

    entry.name = name;

    // we never overwrite an existing define
    if (!(name in defined))
      defined[name] = entry; 

    entry.deps = dedupe(entry.deps);

    // we have to normalize dependencies
    // (assume dependencies are normalized for now)
    // entry.normalizedDeps = entry.deps.map(normalize);
    entry.normalizedDeps = entry.deps;
  }

  function buildGroups(entry, groups) {
    groups[entry.groupIndex] = groups[entry.groupIndex] || [];

    if (indexOf.call(groups[entry.groupIndex], entry) != -1)
      return;

    groups[entry.groupIndex].push(entry);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];

      // not in the registry means already linked / ES6
      if (!depEntry || depEntry.evaluated)
        continue;

      // now we know the entry is in our unlinked linkage group
      var depGroupIndex = entry.groupIndex + (depEntry.declarative != entry.declarative);

      // the group index of an entry is always the maximum
      if (depEntry.groupIndex === undefined || depEntry.groupIndex < depGroupIndex) {

        // if already in a group, remove from the old group
        if (depEntry.groupIndex !== undefined) {
          groups[depEntry.groupIndex].splice(indexOf.call(groups[depEntry.groupIndex], depEntry), 1);

          // if the old group is empty, then we have a mixed depndency cycle
          if (groups[depEntry.groupIndex].length == 0)
            throw new TypeError("Mixed dependency cycle detected");
        }

        depEntry.groupIndex = depGroupIndex;
      }

      buildGroups(depEntry, groups);
    }
  }

  function link(name) {
    var startEntry = defined[name];

    startEntry.groupIndex = 0;

    var groups = [];

    buildGroups(startEntry, groups);

    var curGroupDeclarative = !!startEntry.declarative == groups.length % 2;
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var entry = group[j];

        // link each group
        if (curGroupDeclarative)
          linkDeclarativeModule(entry);
        else
          linkDynamicModule(entry);
      }
      curGroupDeclarative = !curGroupDeclarative; 
    }
  }

  // module binding records
  var moduleRecords = {};
  function getOrCreateModuleRecord(name) {
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      exports: {}, // start from an empty module and extend
      importers: []
    })
  }

  function linkDeclarativeModule(entry) {
    // only link if already not already started linking (stops at circular)
    if (entry.module)
      return;

    var module = entry.module = getOrCreateModuleRecord(entry.name);
    var exports = entry.module.exports;

    var declaration = entry.declare.call(global, function(name, value) {
      module.locked = true;
      exports[name] = value;

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          var importerIndex = indexOf.call(importerModule.dependencies, module);
          importerModule.setters[importerIndex](exports);
        }
      }

      module.locked = false;
      return value;
    });

    module.setters = declaration.setters;
    module.execute = declaration.execute;

    if (!module.setters || !module.execute)
      throw new TypeError("Invalid System.register form for " + entry.name);

    // now link all the module dependencies
    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];
      var depModule = moduleRecords[depName];

      // work out how to set depExports based on scenarios...
      var depExports;

      if (depModule) {
        depExports = depModule.exports;
      }
      else if (depEntry && !depEntry.declarative) {
        if (depEntry.module.exports && depEntry.module.exports.__esModule)
          depExports = depEntry.module.exports;
        else
          depExports = { 'default': depEntry.module.exports, __useDefault: true };
      }
      // in the module registry
      else if (!depEntry) {
        depExports = load(depName);
      }
      // we have an entry -> link
      else {
        linkDeclarativeModule(depEntry);
        depModule = depEntry.module;
        depExports = depModule.exports;
      }

      // only declarative modules have dynamic bindings
      if (depModule && depModule.importers) {
        depModule.importers.push(module);
        module.dependencies.push(depModule);
      }
      else
        module.dependencies.push(null);

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depExports);
    }
  }

  // An analog to loader.get covering execution of all three layers (real declarative, simulated declarative, simulated dynamic)
  function getModule(name) {
    var exports;
    var entry = defined[name];

    if (!entry) {
      exports = load(name);
      if (!exports)
        throw new Error("Unable to load dependency " + name + ".");
    }

    else {
      if (entry.declarative)
        ensureEvaluated(name, []);

      else if (!entry.evaluated)
        linkDynamicModule(entry);

      exports = entry.module.exports;
    }

    if ((!entry || entry.declarative) && exports && exports.__useDefault)
      return exports['default'];

    return exports;
  }

  function linkDynamicModule(entry) {
    if (entry.module)
      return;

    var exports = {};

    var module = entry.module = { exports: exports, id: entry.name };

    // AMD requires execute the tree first
    if (!entry.executingRequire) {
      for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
        var depName = entry.normalizedDeps[i];
        var depEntry = defined[depName];
        if (depEntry)
          linkDynamicModule(depEntry);
      }
    }

    // now execute
    entry.evaluated = true;
    var output = entry.execute.call(global, function(name) {
      for (var i = 0, l = entry.deps.length; i < l; i++) {
        if (entry.deps[i] != name)
          continue;
        return getModule(entry.normalizedDeps[i]);
      }
      throw new TypeError('Module ' + name + ' not declared as a dependency.');
    }, exports, module);

    if (output)
      module.exports = output;
  }

  /*
   * Given a module, and the list of modules for this current branch,
   *  ensure that each of the dependencies of this module is evaluated
   *  (unless one is a circular dependency already in the list of seen
   *  modules, in which case we execute it)
   *
   * Then we evaluate the module itself depth-first left to right 
   * execution to match ES6 modules
   */
  function ensureEvaluated(moduleName, seen) {
    var entry = defined[moduleName];

    // if already seen, that means it's an already-evaluated non circular dependency
    if (!entry || entry.evaluated || !entry.declarative)
      return;

    // this only applies to declarative modules which late-execute

    seen.push(moduleName);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      if (indexOf.call(seen, depName) == -1) {
        if (!defined[depName])
          load(depName);
        else
          ensureEvaluated(depName, seen);
      }
    }

    if (entry.evaluated)
      return;

    entry.evaluated = true;
    entry.module.execute.call(global);
  }

  // magical execution function
  var modules = {};
  function load(name) {
    if (modules[name])
      return modules[name];

    var entry = defined[name];

    // first we check if this module has already been defined in the registry
    if (!entry)
      throw "Module " + name + " not present.";

    // recursively ensure that the module and all its 
    // dependencies are linked (with dependency group handling)
    link(name);

    // now handle dependency execution in correct order
    ensureEvaluated(name, []);

    // remove from the registry
    defined[name] = undefined;

    var module = entry.module.exports;

    if (!module || !entry.declarative && module.__esModule !== true)
      module = { 'default': module, __useDefault: true };

    // return the defined module object
    return modules[name] = module;
  };

  return function(mains, declare) {

    var System;
    var System = {
      register: register, 
      get: load, 
      set: function(name, module) {
        modules[name] = module; 
      },
      newModule: function(module) {
        return module;
      },
      global: global 
    };
    System.set('@empty', {});

    declare(System);

    for (var i = 0; i < mains.length; i++)
      load(mains[i]);
  }

})(typeof window != 'undefined' ? window : global)
/* (['mainModule'], function(System) {
  System.register(...);
}); */

(['src/ui/app.jsx!github:floatdrop/plugin-jsx@0.1.1'], function(System) {





System.register("npm:process@0.10.1/browser", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var process = module.exports = {};
  var queue = [];
  var draining = false;
  function drainQueue() {
    if (draining) {
      return ;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while (len) {
      currentQueue = queue;
      queue = [];
      var i = -1;
      while (++i < len) {
        currentQueue[i]();
      }
      len = queue.length;
    }
    draining = false;
  }
  process.nextTick = function(fun) {
    queue.push(fun);
    if (!draining) {
      setTimeout(drainQueue, 0);
    }
  };
  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = '';
  process.versions = {};
  function noop() {}
  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;
  process.binding = function(name) {
    throw new Error('process.binding is not supported');
  };
  process.cwd = function() {
    return '/';
  };
  process.chdir = function(dir) {
    throw new Error('process.chdir is not supported');
  };
  process.umask = function() {
    return 0;
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/PooledClass", ["npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var oneArgumentPooler = function(copyFieldsFrom) {
      var Klass = this;
      if (Klass.instancePool.length) {
        var instance = Klass.instancePool.pop();
        Klass.call(instance, copyFieldsFrom);
        return instance;
      } else {
        return new Klass(copyFieldsFrom);
      }
    };
    var twoArgumentPooler = function(a1, a2) {
      var Klass = this;
      if (Klass.instancePool.length) {
        var instance = Klass.instancePool.pop();
        Klass.call(instance, a1, a2);
        return instance;
      } else {
        return new Klass(a1, a2);
      }
    };
    var threeArgumentPooler = function(a1, a2, a3) {
      var Klass = this;
      if (Klass.instancePool.length) {
        var instance = Klass.instancePool.pop();
        Klass.call(instance, a1, a2, a3);
        return instance;
      } else {
        return new Klass(a1, a2, a3);
      }
    };
    var fiveArgumentPooler = function(a1, a2, a3, a4, a5) {
      var Klass = this;
      if (Klass.instancePool.length) {
        var instance = Klass.instancePool.pop();
        Klass.call(instance, a1, a2, a3, a4, a5);
        return instance;
      } else {
        return new Klass(a1, a2, a3, a4, a5);
      }
    };
    var standardReleaser = function(instance) {
      var Klass = this;
      ("production" !== process.env.NODE_ENV ? invariant(instance instanceof Klass, 'Trying to release an instance into a pool of a different type.') : invariant(instance instanceof Klass));
      if (instance.destructor) {
        instance.destructor();
      }
      if (Klass.instancePool.length < Klass.poolSize) {
        Klass.instancePool.push(instance);
      }
    };
    var DEFAULT_POOL_SIZE = 10;
    var DEFAULT_POOLER = oneArgumentPooler;
    var addPoolingTo = function(CopyConstructor, pooler) {
      var NewKlass = CopyConstructor;
      NewKlass.instancePool = [];
      NewKlass.getPooled = pooler || DEFAULT_POOLER;
      if (!NewKlass.poolSize) {
        NewKlass.poolSize = DEFAULT_POOL_SIZE;
      }
      NewKlass.release = standardReleaser;
      return NewKlass;
    };
    var PooledClass = {
      addPoolingTo: addPoolingTo,
      oneArgumentPooler: oneArgumentPooler,
      twoArgumentPooler: twoArgumentPooler,
      threeArgumentPooler: threeArgumentPooler,
      fiveArgumentPooler: fiveArgumentPooler
    };
    module.exports = PooledClass;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/Object.assign", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  function assign(target, sources) {
    if (target == null) {
      throw new TypeError('Object.assign target cannot be null or undefined');
    }
    var to = Object(target);
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    for (var nextIndex = 1; nextIndex < arguments.length; nextIndex++) {
      var nextSource = arguments[nextIndex];
      if (nextSource == null) {
        continue;
      }
      var from = Object(nextSource);
      for (var key in from) {
        if (hasOwnProperty.call(from, key)) {
          to[key] = from[key];
        }
      }
    }
    return to;
  }
  module.exports = assign;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/emptyObject", ["github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    "use strict";
    var emptyObject = {};
    if ("production" !== process.env.NODE_ENV) {
      Object.freeze(emptyObject);
    }
    module.exports = emptyObject;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/emptyFunction", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  function makeEmptyFunction(arg) {
    return function() {
      return arg;
    };
  }
  function emptyFunction() {}
  emptyFunction.thatReturns = makeEmptyFunction;
  emptyFunction.thatReturnsFalse = makeEmptyFunction(false);
  emptyFunction.thatReturnsTrue = makeEmptyFunction(true);
  emptyFunction.thatReturnsNull = makeEmptyFunction(null);
  emptyFunction.thatReturnsThis = function() {
    return this;
  };
  emptyFunction.thatReturnsArgument = function(arg) {
    return arg;
  };
  module.exports = emptyFunction;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactCurrentOwner", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ReactCurrentOwner = {current: null};
  module.exports = ReactCurrentOwner;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactRootIndex", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ReactRootIndexInjection = {injectCreateReactRootIndex: function(_createReactRootIndex) {
      ReactRootIndex.createReactRootIndex = _createReactRootIndex;
    }};
  var ReactRootIndex = {
    createReactRootIndex: null,
    injection: ReactRootIndexInjection
  };
  module.exports = ReactRootIndex;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/getIteratorFn", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
  var FAUX_ITERATOR_SYMBOL = '@@iterator';
  function getIteratorFn(maybeIterable) {
    var iteratorFn = maybeIterable && ((ITERATOR_SYMBOL && maybeIterable[ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL]));
    if (typeof iteratorFn === 'function') {
      return iteratorFn;
    }
  }
  module.exports = getIteratorFn;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactLifeCycle", ["github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactLifeCycle = {
      currentlyMountingInstance: null,
      currentlyUnmountingInstance: null
    };
    module.exports = ReactLifeCycle;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactInstanceMap", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ReactInstanceMap = {
    remove: function(key) {
      key._reactInternalInstance = undefined;
    },
    get: function(key) {
      return key._reactInternalInstance;
    },
    has: function(key) {
      return key._reactInternalInstance !== undefined;
    },
    set: function(key, value) {
      key._reactInternalInstance = value;
    }
  };
  module.exports = ReactInstanceMap;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/CallbackQueue", ["npm:react@0.13.2/lib/PooledClass", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var PooledClass = require("npm:react@0.13.2/lib/PooledClass");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    function CallbackQueue() {
      this._callbacks = null;
      this._contexts = null;
    }
    assign(CallbackQueue.prototype, {
      enqueue: function(callback, context) {
        this._callbacks = this._callbacks || [];
        this._contexts = this._contexts || [];
        this._callbacks.push(callback);
        this._contexts.push(context);
      },
      notifyAll: function() {
        var callbacks = this._callbacks;
        var contexts = this._contexts;
        if (callbacks) {
          ("production" !== process.env.NODE_ENV ? invariant(callbacks.length === contexts.length, 'Mismatched list of contexts in callback queue') : invariant(callbacks.length === contexts.length));
          this._callbacks = null;
          this._contexts = null;
          for (var i = 0,
              l = callbacks.length; i < l; i++) {
            callbacks[i].call(contexts[i]);
          }
          callbacks.length = 0;
          contexts.length = 0;
        }
      },
      reset: function() {
        this._callbacks = null;
        this._contexts = null;
      },
      destructor: function() {
        this.reset();
      }
    });
    PooledClass.addPoolingTo(CallbackQueue);
    module.exports = CallbackQueue;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactPerf", ["github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactPerf = {
      enableMeasure: false,
      storedMeasure: _noMeasure,
      measureMethods: function(object, objectName, methodNames) {
        if ("production" !== process.env.NODE_ENV) {
          for (var key in methodNames) {
            if (!methodNames.hasOwnProperty(key)) {
              continue;
            }
            object[key] = ReactPerf.measure(objectName, methodNames[key], object[key]);
          }
        }
      },
      measure: function(objName, fnName, func) {
        if ("production" !== process.env.NODE_ENV) {
          var measuredFunc = null;
          var wrapper = function() {
            if (ReactPerf.enableMeasure) {
              if (!measuredFunc) {
                measuredFunc = ReactPerf.storedMeasure(objName, fnName, func);
              }
              return measuredFunc.apply(this, arguments);
            }
            return func.apply(this, arguments);
          };
          wrapper.displayName = objName + '_' + fnName;
          return wrapper;
        }
        return func;
      },
      injection: {injectMeasure: function(measure) {
          ReactPerf.storedMeasure = measure;
        }}
    };
    function _noMeasure(objName, fnName, func) {
      return func;
    }
    module.exports = ReactPerf;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactOwner", ["npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var ReactOwner = {
      isValidOwner: function(object) {
        return !!((object && typeof object.attachRef === 'function' && typeof object.detachRef === 'function'));
      },
      addComponentAsRefTo: function(component, ref, owner) {
        ("production" !== process.env.NODE_ENV ? invariant(ReactOwner.isValidOwner(owner), 'addComponentAsRefTo(...): Only a ReactOwner can have refs. This ' + 'usually means that you\'re trying to add a ref to a component that ' + 'doesn\'t have an owner (that is, was not created inside of another ' + 'component\'s `render` method). Try rendering this component inside of ' + 'a new top-level component which will hold the ref.') : invariant(ReactOwner.isValidOwner(owner)));
        owner.attachRef(ref, component);
      },
      removeComponentAsRefFrom: function(component, ref, owner) {
        ("production" !== process.env.NODE_ENV ? invariant(ReactOwner.isValidOwner(owner), 'removeComponentAsRefFrom(...): Only a ReactOwner can have refs. This ' + 'usually means that you\'re trying to remove a ref to a component that ' + 'doesn\'t have an owner (that is, was not created inside of another ' + 'component\'s `render` method). Try rendering this component inside of ' + 'a new top-level component which will hold the ref.') : invariant(ReactOwner.isValidOwner(owner)));
        if (owner.getPublicInstance().refs[ref] === component.getPublicInstance()) {
          owner.detachRef(ref);
        }
      }
    };
    module.exports = ReactOwner;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactPropTypeLocations", ["npm:react@0.13.2/lib/keyMirror"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var keyMirror = require("npm:react@0.13.2/lib/keyMirror");
  var ReactPropTypeLocations = keyMirror({
    prop: null,
    context: null,
    childContext: null
  });
  module.exports = ReactPropTypeLocations;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactPropTypeLocationNames", ["github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactPropTypeLocationNames = {};
    if ("production" !== process.env.NODE_ENV) {
      ReactPropTypeLocationNames = {
        prop: 'prop',
        context: 'context',
        childContext: 'child context'
      };
    }
    module.exports = ReactPropTypeLocationNames;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactNativeComponent", ["npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var autoGenerateWrapperClass = null;
    var genericComponentClass = null;
    var tagToComponentClass = {};
    var textComponentClass = null;
    var ReactNativeComponentInjection = {
      injectGenericComponentClass: function(componentClass) {
        genericComponentClass = componentClass;
      },
      injectTextComponentClass: function(componentClass) {
        textComponentClass = componentClass;
      },
      injectComponentClasses: function(componentClasses) {
        assign(tagToComponentClass, componentClasses);
      },
      injectAutoWrapper: function(wrapperFactory) {
        autoGenerateWrapperClass = wrapperFactory;
      }
    };
    function getComponentClassForElement(element) {
      if (typeof element.type === 'function') {
        return element.type;
      }
      var tag = element.type;
      var componentClass = tagToComponentClass[tag];
      if (componentClass == null) {
        tagToComponentClass[tag] = componentClass = autoGenerateWrapperClass(tag);
      }
      return componentClass;
    }
    function createInternalComponent(element) {
      ("production" !== process.env.NODE_ENV ? invariant(genericComponentClass, 'There is no registered component for the tag %s', element.type) : invariant(genericComponentClass));
      return new genericComponentClass(element.type, element.props);
    }
    function createInstanceForText(text) {
      return new textComponentClass(text);
    }
    function isTextComponent(component) {
      return component instanceof textComponentClass;
    }
    var ReactNativeComponent = {
      getComponentClassForElement: getComponentClassForElement,
      createInternalComponent: createInternalComponent,
      createInstanceForText: createInstanceForText,
      isTextComponent: isTextComponent,
      injection: ReactNativeComponentInjection
    };
    module.exports = ReactNativeComponent;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/Transaction", ["npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var Mixin = {
      reinitializeTransaction: function() {
        this.transactionWrappers = this.getTransactionWrappers();
        if (!this.wrapperInitData) {
          this.wrapperInitData = [];
        } else {
          this.wrapperInitData.length = 0;
        }
        this._isInTransaction = false;
      },
      _isInTransaction: false,
      getTransactionWrappers: null,
      isInTransaction: function() {
        return !!this._isInTransaction;
      },
      perform: function(method, scope, a, b, c, d, e, f) {
        ("production" !== process.env.NODE_ENV ? invariant(!this.isInTransaction(), 'Transaction.perform(...): Cannot initialize a transaction when there ' + 'is already an outstanding transaction.') : invariant(!this.isInTransaction()));
        var errorThrown;
        var ret;
        try {
          this._isInTransaction = true;
          errorThrown = true;
          this.initializeAll(0);
          ret = method.call(scope, a, b, c, d, e, f);
          errorThrown = false;
        } finally {
          try {
            if (errorThrown) {
              try {
                this.closeAll(0);
              } catch (err) {}
            } else {
              this.closeAll(0);
            }
          } finally {
            this._isInTransaction = false;
          }
        }
        return ret;
      },
      initializeAll: function(startIndex) {
        var transactionWrappers = this.transactionWrappers;
        for (var i = startIndex; i < transactionWrappers.length; i++) {
          var wrapper = transactionWrappers[i];
          try {
            this.wrapperInitData[i] = Transaction.OBSERVED_ERROR;
            this.wrapperInitData[i] = wrapper.initialize ? wrapper.initialize.call(this) : null;
          } finally {
            if (this.wrapperInitData[i] === Transaction.OBSERVED_ERROR) {
              try {
                this.initializeAll(i + 1);
              } catch (err) {}
            }
          }
        }
      },
      closeAll: function(startIndex) {
        ("production" !== process.env.NODE_ENV ? invariant(this.isInTransaction(), 'Transaction.closeAll(): Cannot close transaction when none are open.') : invariant(this.isInTransaction()));
        var transactionWrappers = this.transactionWrappers;
        for (var i = startIndex; i < transactionWrappers.length; i++) {
          var wrapper = transactionWrappers[i];
          var initData = this.wrapperInitData[i];
          var errorThrown;
          try {
            errorThrown = true;
            if (initData !== Transaction.OBSERVED_ERROR && wrapper.close) {
              wrapper.close.call(this, initData);
            }
            errorThrown = false;
          } finally {
            if (errorThrown) {
              try {
                this.closeAll(i + 1);
              } catch (e) {}
            }
          }
        }
        this.wrapperInitData.length = 0;
      }
    };
    var Transaction = {
      Mixin: Mixin,
      OBSERVED_ERROR: {}
    };
    module.exports = Transaction;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactErrorUtils", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var ReactErrorUtils = {guard: function(func, name) {
      return func;
    }};
  module.exports = ReactErrorUtils;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/keyOf", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var keyOf = function(oneKeyObj) {
    var key;
    for (key in oneKeyObj) {
      if (!oneKeyObj.hasOwnProperty(key)) {
        continue;
      }
      return key;
    }
    return null;
  };
  module.exports = keyOf;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/mapObject", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  function mapObject(object, callback, context) {
    if (!object) {
      return null;
    }
    var result = {};
    for (var name in object) {
      if (hasOwnProperty.call(object, name)) {
        result[name] = callback.call(context, object[name], name, object);
      }
    }
    return result;
  }
  module.exports = mapObject;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/DOMProperty", ["npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var invariant = require("npm:react@0.13.2/lib/invariant");
    function checkMask(value, bitmask) {
      return (value & bitmask) === bitmask;
    }
    var DOMPropertyInjection = {
      MUST_USE_ATTRIBUTE: 0x1,
      MUST_USE_PROPERTY: 0x2,
      HAS_SIDE_EFFECTS: 0x4,
      HAS_BOOLEAN_VALUE: 0x8,
      HAS_NUMERIC_VALUE: 0x10,
      HAS_POSITIVE_NUMERIC_VALUE: 0x20 | 0x10,
      HAS_OVERLOADED_BOOLEAN_VALUE: 0x40,
      injectDOMPropertyConfig: function(domPropertyConfig) {
        var Properties = domPropertyConfig.Properties || {};
        var DOMAttributeNames = domPropertyConfig.DOMAttributeNames || {};
        var DOMPropertyNames = domPropertyConfig.DOMPropertyNames || {};
        var DOMMutationMethods = domPropertyConfig.DOMMutationMethods || {};
        if (domPropertyConfig.isCustomAttribute) {
          DOMProperty._isCustomAttributeFunctions.push(domPropertyConfig.isCustomAttribute);
        }
        for (var propName in Properties) {
          ("production" !== process.env.NODE_ENV ? invariant(!DOMProperty.isStandardName.hasOwnProperty(propName), 'injectDOMPropertyConfig(...): You\'re trying to inject DOM property ' + '\'%s\' which has already been injected. You may be accidentally ' + 'injecting the same DOM property config twice, or you may be ' + 'injecting two configs that have conflicting property names.', propName) : invariant(!DOMProperty.isStandardName.hasOwnProperty(propName)));
          DOMProperty.isStandardName[propName] = true;
          var lowerCased = propName.toLowerCase();
          DOMProperty.getPossibleStandardName[lowerCased] = propName;
          if (DOMAttributeNames.hasOwnProperty(propName)) {
            var attributeName = DOMAttributeNames[propName];
            DOMProperty.getPossibleStandardName[attributeName] = propName;
            DOMProperty.getAttributeName[propName] = attributeName;
          } else {
            DOMProperty.getAttributeName[propName] = lowerCased;
          }
          DOMProperty.getPropertyName[propName] = DOMPropertyNames.hasOwnProperty(propName) ? DOMPropertyNames[propName] : propName;
          if (DOMMutationMethods.hasOwnProperty(propName)) {
            DOMProperty.getMutationMethod[propName] = DOMMutationMethods[propName];
          } else {
            DOMProperty.getMutationMethod[propName] = null;
          }
          var propConfig = Properties[propName];
          DOMProperty.mustUseAttribute[propName] = checkMask(propConfig, DOMPropertyInjection.MUST_USE_ATTRIBUTE);
          DOMProperty.mustUseProperty[propName] = checkMask(propConfig, DOMPropertyInjection.MUST_USE_PROPERTY);
          DOMProperty.hasSideEffects[propName] = checkMask(propConfig, DOMPropertyInjection.HAS_SIDE_EFFECTS);
          DOMProperty.hasBooleanValue[propName] = checkMask(propConfig, DOMPropertyInjection.HAS_BOOLEAN_VALUE);
          DOMProperty.hasNumericValue[propName] = checkMask(propConfig, DOMPropertyInjection.HAS_NUMERIC_VALUE);
          DOMProperty.hasPositiveNumericValue[propName] = checkMask(propConfig, DOMPropertyInjection.HAS_POSITIVE_NUMERIC_VALUE);
          DOMProperty.hasOverloadedBooleanValue[propName] = checkMask(propConfig, DOMPropertyInjection.HAS_OVERLOADED_BOOLEAN_VALUE);
          ("production" !== process.env.NODE_ENV ? invariant(!DOMProperty.mustUseAttribute[propName] || !DOMProperty.mustUseProperty[propName], 'DOMProperty: Cannot require using both attribute and property: %s', propName) : invariant(!DOMProperty.mustUseAttribute[propName] || !DOMProperty.mustUseProperty[propName]));
          ("production" !== process.env.NODE_ENV ? invariant(DOMProperty.mustUseProperty[propName] || !DOMProperty.hasSideEffects[propName], 'DOMProperty: Properties that have side effects must use property: %s', propName) : invariant(DOMProperty.mustUseProperty[propName] || !DOMProperty.hasSideEffects[propName]));
          ("production" !== process.env.NODE_ENV ? invariant(!!DOMProperty.hasBooleanValue[propName] + !!DOMProperty.hasNumericValue[propName] + !!DOMProperty.hasOverloadedBooleanValue[propName] <= 1, 'DOMProperty: Value can be one of boolean, overloaded boolean, or ' + 'numeric value, but not a combination: %s', propName) : invariant(!!DOMProperty.hasBooleanValue[propName] + !!DOMProperty.hasNumericValue[propName] + !!DOMProperty.hasOverloadedBooleanValue[propName] <= 1));
        }
      }
    };
    var defaultValueCache = {};
    var DOMProperty = {
      ID_ATTRIBUTE_NAME: 'data-reactid',
      isStandardName: {},
      getPossibleStandardName: {},
      getAttributeName: {},
      getPropertyName: {},
      getMutationMethod: {},
      mustUseAttribute: {},
      mustUseProperty: {},
      hasSideEffects: {},
      hasBooleanValue: {},
      hasNumericValue: {},
      hasPositiveNumericValue: {},
      hasOverloadedBooleanValue: {},
      _isCustomAttributeFunctions: [],
      isCustomAttribute: function(attributeName) {
        for (var i = 0; i < DOMProperty._isCustomAttributeFunctions.length; i++) {
          var isCustomAttributeFn = DOMProperty._isCustomAttributeFunctions[i];
          if (isCustomAttributeFn(attributeName)) {
            return true;
          }
        }
        return false;
      },
      getDefaultValueForProperty: function(nodeName, prop) {
        var nodeDefaults = defaultValueCache[nodeName];
        var testElement;
        if (!nodeDefaults) {
          defaultValueCache[nodeName] = nodeDefaults = {};
        }
        if (!(prop in nodeDefaults)) {
          testElement = document.createElement(nodeName);
          nodeDefaults[prop] = testElement[prop];
        }
        return nodeDefaults[prop];
      },
      injection: DOMPropertyInjection
    };
    module.exports = DOMProperty;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/escapeTextContentForBrowser", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ESCAPE_LOOKUP = {
    '&': '&amp;',
    '>': '&gt;',
    '<': '&lt;',
    '"': '&quot;',
    '\'': '&#x27;'
  };
  var ESCAPE_REGEX = /[&><"']/g;
  function escaper(match) {
    return ESCAPE_LOOKUP[match];
  }
  function escapeTextContentForBrowser(text) {
    return ('' + text).replace(ESCAPE_REGEX, escaper);
  }
  module.exports = escapeTextContentForBrowser;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/CSSProperty", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var isUnitlessNumber = {
    boxFlex: true,
    boxFlexGroup: true,
    columnCount: true,
    flex: true,
    flexGrow: true,
    flexPositive: true,
    flexShrink: true,
    flexNegative: true,
    fontWeight: true,
    lineClamp: true,
    lineHeight: true,
    opacity: true,
    order: true,
    orphans: true,
    widows: true,
    zIndex: true,
    zoom: true,
    fillOpacity: true,
    strokeDashoffset: true,
    strokeOpacity: true,
    strokeWidth: true
  };
  function prefixKey(prefix, key) {
    return prefix + key.charAt(0).toUpperCase() + key.substring(1);
  }
  var prefixes = ['Webkit', 'ms', 'Moz', 'O'];
  Object.keys(isUnitlessNumber).forEach(function(prop) {
    prefixes.forEach(function(prefix) {
      isUnitlessNumber[prefixKey(prefix, prop)] = isUnitlessNumber[prop];
    });
  });
  var shorthandPropertyExpansions = {
    background: {
      backgroundImage: true,
      backgroundPosition: true,
      backgroundRepeat: true,
      backgroundColor: true
    },
    border: {
      borderWidth: true,
      borderStyle: true,
      borderColor: true
    },
    borderBottom: {
      borderBottomWidth: true,
      borderBottomStyle: true,
      borderBottomColor: true
    },
    borderLeft: {
      borderLeftWidth: true,
      borderLeftStyle: true,
      borderLeftColor: true
    },
    borderRight: {
      borderRightWidth: true,
      borderRightStyle: true,
      borderRightColor: true
    },
    borderTop: {
      borderTopWidth: true,
      borderTopStyle: true,
      borderTopColor: true
    },
    font: {
      fontStyle: true,
      fontVariant: true,
      fontWeight: true,
      fontSize: true,
      lineHeight: true,
      fontFamily: true
    }
  };
  var CSSProperty = {
    isUnitlessNumber: isUnitlessNumber,
    shorthandPropertyExpansions: shorthandPropertyExpansions
  };
  module.exports = CSSProperty;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ExecutionEnvironment", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var canUseDOM = !!((typeof window !== 'undefined' && window.document && window.document.createElement));
  var ExecutionEnvironment = {
    canUseDOM: canUseDOM,
    canUseWorkers: typeof Worker !== 'undefined',
    canUseEventListeners: canUseDOM && !!(window.addEventListener || window.attachEvent),
    canUseViewport: canUseDOM && !!window.screen,
    isInWorker: !canUseDOM
  };
  module.exports = ExecutionEnvironment;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/camelize", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var _hyphenPattern = /-(.)/g;
  function camelize(string) {
    return string.replace(_hyphenPattern, function(_, character) {
      return character.toUpperCase();
    });
  }
  module.exports = camelize;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/dangerousStyleValue", ["npm:react@0.13.2/lib/CSSProperty"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var CSSProperty = require("npm:react@0.13.2/lib/CSSProperty");
  var isUnitlessNumber = CSSProperty.isUnitlessNumber;
  function dangerousStyleValue(name, value) {
    var isEmpty = value == null || typeof value === 'boolean' || value === '';
    if (isEmpty) {
      return '';
    }
    var isNonNumeric = isNaN(value);
    if (isNonNumeric || value === 0 || isUnitlessNumber.hasOwnProperty(name) && isUnitlessNumber[name]) {
      return '' + value;
    }
    if (typeof value === 'string') {
      value = value.trim();
    }
    return value + 'px';
  }
  module.exports = dangerousStyleValue;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/hyphenate", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var _uppercasePattern = /([A-Z])/g;
  function hyphenate(string) {
    return string.replace(_uppercasePattern, '-$1').toLowerCase();
  }
  module.exports = hyphenate;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/memoizeStringOnly", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  function memoizeStringOnly(callback) {
    var cache = {};
    return function(string) {
      if (!cache.hasOwnProperty(string)) {
        cache[string] = callback.call(this, string);
      }
      return cache[string];
    };
  }
  module.exports = memoizeStringOnly;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/toArray", ["npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    var invariant = require("npm:react@0.13.2/lib/invariant");
    function toArray(obj) {
      var length = obj.length;
      ("production" !== process.env.NODE_ENV ? invariant(!Array.isArray(obj) && (typeof obj === 'object' || typeof obj === 'function'), 'toArray: Array-like object expected') : invariant(!Array.isArray(obj) && (typeof obj === 'object' || typeof obj === 'function')));
      ("production" !== process.env.NODE_ENV ? invariant(typeof length === 'number', 'toArray: Object needs a length property') : invariant(typeof length === 'number'));
      ("production" !== process.env.NODE_ENV ? invariant(length === 0 || (length - 1) in obj, 'toArray: Object should have keys for indices') : invariant(length === 0 || (length - 1) in obj));
      if (obj.hasOwnProperty) {
        try {
          return Array.prototype.slice.call(obj);
        } catch (e) {}
      }
      var ret = Array(length);
      for (var ii = 0; ii < length; ii++) {
        ret[ii] = obj[ii];
      }
      return ret;
    }
    module.exports = toArray;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/getMarkupWrap", ["npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var dummyNode = ExecutionEnvironment.canUseDOM ? document.createElement('div') : null;
    var shouldWrap = {
      'circle': true,
      'defs': true,
      'ellipse': true,
      'g': true,
      'line': true,
      'linearGradient': true,
      'path': true,
      'polygon': true,
      'polyline': true,
      'radialGradient': true,
      'rect': true,
      'stop': true,
      'text': true
    };
    var selectWrap = [1, '<select multiple="true">', '</select>'];
    var tableWrap = [1, '<table>', '</table>'];
    var trWrap = [3, '<table><tbody><tr>', '</tr></tbody></table>'];
    var svgWrap = [1, '<svg>', '</svg>'];
    var markupWrap = {
      '*': [1, '?<div>', '</div>'],
      'area': [1, '<map>', '</map>'],
      'col': [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
      'legend': [1, '<fieldset>', '</fieldset>'],
      'param': [1, '<object>', '</object>'],
      'tr': [2, '<table><tbody>', '</tbody></table>'],
      'optgroup': selectWrap,
      'option': selectWrap,
      'caption': tableWrap,
      'colgroup': tableWrap,
      'tbody': tableWrap,
      'tfoot': tableWrap,
      'thead': tableWrap,
      'td': trWrap,
      'th': trWrap,
      'circle': svgWrap,
      'defs': svgWrap,
      'ellipse': svgWrap,
      'g': svgWrap,
      'line': svgWrap,
      'linearGradient': svgWrap,
      'path': svgWrap,
      'polygon': svgWrap,
      'polyline': svgWrap,
      'radialGradient': svgWrap,
      'rect': svgWrap,
      'stop': svgWrap,
      'text': svgWrap
    };
    function getMarkupWrap(nodeName) {
      ("production" !== process.env.NODE_ENV ? invariant(!!dummyNode, 'Markup wrapping node not initialized') : invariant(!!dummyNode));
      if (!markupWrap.hasOwnProperty(nodeName)) {
        nodeName = '*';
      }
      if (!shouldWrap.hasOwnProperty(nodeName)) {
        if (nodeName === '*') {
          dummyNode.innerHTML = '<link />';
        } else {
          dummyNode.innerHTML = '<' + nodeName + '></' + nodeName + '>';
        }
        shouldWrap[nodeName] = !dummyNode.firstChild;
      }
      return shouldWrap[nodeName] ? markupWrap[nodeName] : null;
    }
    module.exports = getMarkupWrap;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactMultiChildUpdateTypes", ["npm:react@0.13.2/lib/keyMirror"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var keyMirror = require("npm:react@0.13.2/lib/keyMirror");
  var ReactMultiChildUpdateTypes = keyMirror({
    INSERT_MARKUP: null,
    MOVE_EXISTING: null,
    REMOVE_NODE: null,
    TEXT_CONTENT: null
  });
  module.exports = ReactMultiChildUpdateTypes;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/setInnerHTML", ["npm:react@0.13.2/lib/ExecutionEnvironment", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
    var WHITESPACE_TEST = /^[ \r\n\t\f]/;
    var NONVISIBLE_TEST = /<(!--|link|noscript|meta|script|style)[ \r\n\t\f\/>]/;
    var setInnerHTML = function(node, html) {
      node.innerHTML = html;
    };
    if (typeof MSApp !== 'undefined' && MSApp.execUnsafeLocalFunction) {
      setInnerHTML = function(node, html) {
        MSApp.execUnsafeLocalFunction(function() {
          node.innerHTML = html;
        });
      };
    }
    if (ExecutionEnvironment.canUseDOM) {
      var testElement = document.createElement('div');
      testElement.innerHTML = ' ';
      if (testElement.innerHTML === '') {
        setInnerHTML = function(node, html) {
          if (node.parentNode) {
            node.parentNode.replaceChild(node, node);
          }
          if (WHITESPACE_TEST.test(html) || html[0] === '<' && NONVISIBLE_TEST.test(html)) {
            node.innerHTML = '\uFEFF' + html;
            var textNode = node.firstChild;
            if (textNode.data.length === 1) {
              node.removeChild(textNode);
            } else {
              textNode.deleteData(0, 1);
            }
          } else {
            node.innerHTML = html;
          }
        };
      }
    }
    module.exports = setInnerHTML;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/EventPluginRegistry", ["npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var EventPluginOrder = null;
    var namesToPlugins = {};
    function recomputePluginOrdering() {
      if (!EventPluginOrder) {
        return ;
      }
      for (var pluginName in namesToPlugins) {
        var PluginModule = namesToPlugins[pluginName];
        var pluginIndex = EventPluginOrder.indexOf(pluginName);
        ("production" !== process.env.NODE_ENV ? invariant(pluginIndex > -1, 'EventPluginRegistry: Cannot inject event plugins that do not exist in ' + 'the plugin ordering, `%s`.', pluginName) : invariant(pluginIndex > -1));
        if (EventPluginRegistry.plugins[pluginIndex]) {
          continue;
        }
        ("production" !== process.env.NODE_ENV ? invariant(PluginModule.extractEvents, 'EventPluginRegistry: Event plugins must implement an `extractEvents` ' + 'method, but `%s` does not.', pluginName) : invariant(PluginModule.extractEvents));
        EventPluginRegistry.plugins[pluginIndex] = PluginModule;
        var publishedEvents = PluginModule.eventTypes;
        for (var eventName in publishedEvents) {
          ("production" !== process.env.NODE_ENV ? invariant(publishEventForPlugin(publishedEvents[eventName], PluginModule, eventName), 'EventPluginRegistry: Failed to publish event `%s` for plugin `%s`.', eventName, pluginName) : invariant(publishEventForPlugin(publishedEvents[eventName], PluginModule, eventName)));
        }
      }
    }
    function publishEventForPlugin(dispatchConfig, PluginModule, eventName) {
      ("production" !== process.env.NODE_ENV ? invariant(!EventPluginRegistry.eventNameDispatchConfigs.hasOwnProperty(eventName), 'EventPluginHub: More than one plugin attempted to publish the same ' + 'event name, `%s`.', eventName) : invariant(!EventPluginRegistry.eventNameDispatchConfigs.hasOwnProperty(eventName)));
      EventPluginRegistry.eventNameDispatchConfigs[eventName] = dispatchConfig;
      var phasedRegistrationNames = dispatchConfig.phasedRegistrationNames;
      if (phasedRegistrationNames) {
        for (var phaseName in phasedRegistrationNames) {
          if (phasedRegistrationNames.hasOwnProperty(phaseName)) {
            var phasedRegistrationName = phasedRegistrationNames[phaseName];
            publishRegistrationName(phasedRegistrationName, PluginModule, eventName);
          }
        }
        return true;
      } else if (dispatchConfig.registrationName) {
        publishRegistrationName(dispatchConfig.registrationName, PluginModule, eventName);
        return true;
      }
      return false;
    }
    function publishRegistrationName(registrationName, PluginModule, eventName) {
      ("production" !== process.env.NODE_ENV ? invariant(!EventPluginRegistry.registrationNameModules[registrationName], 'EventPluginHub: More than one plugin attempted to publish the same ' + 'registration name, `%s`.', registrationName) : invariant(!EventPluginRegistry.registrationNameModules[registrationName]));
      EventPluginRegistry.registrationNameModules[registrationName] = PluginModule;
      EventPluginRegistry.registrationNameDependencies[registrationName] = PluginModule.eventTypes[eventName].dependencies;
    }
    var EventPluginRegistry = {
      plugins: [],
      eventNameDispatchConfigs: {},
      registrationNameModules: {},
      registrationNameDependencies: {},
      injectEventPluginOrder: function(InjectedEventPluginOrder) {
        ("production" !== process.env.NODE_ENV ? invariant(!EventPluginOrder, 'EventPluginRegistry: Cannot inject event plugin ordering more than ' + 'once. You are likely trying to load more than one copy of React.') : invariant(!EventPluginOrder));
        EventPluginOrder = Array.prototype.slice.call(InjectedEventPluginOrder);
        recomputePluginOrdering();
      },
      injectEventPluginsByName: function(injectedNamesToPlugins) {
        var isOrderingDirty = false;
        for (var pluginName in injectedNamesToPlugins) {
          if (!injectedNamesToPlugins.hasOwnProperty(pluginName)) {
            continue;
          }
          var PluginModule = injectedNamesToPlugins[pluginName];
          if (!namesToPlugins.hasOwnProperty(pluginName) || namesToPlugins[pluginName] !== PluginModule) {
            ("production" !== process.env.NODE_ENV ? invariant(!namesToPlugins[pluginName], 'EventPluginRegistry: Cannot inject two different event plugins ' + 'using the same name, `%s`.', pluginName) : invariant(!namesToPlugins[pluginName]));
            namesToPlugins[pluginName] = PluginModule;
            isOrderingDirty = true;
          }
        }
        if (isOrderingDirty) {
          recomputePluginOrdering();
        }
      },
      getPluginModuleForEvent: function(event) {
        var dispatchConfig = event.dispatchConfig;
        if (dispatchConfig.registrationName) {
          return EventPluginRegistry.registrationNameModules[dispatchConfig.registrationName] || null;
        }
        for (var phase in dispatchConfig.phasedRegistrationNames) {
          if (!dispatchConfig.phasedRegistrationNames.hasOwnProperty(phase)) {
            continue;
          }
          var PluginModule = EventPluginRegistry.registrationNameModules[dispatchConfig.phasedRegistrationNames[phase]];
          if (PluginModule) {
            return PluginModule;
          }
        }
        return null;
      },
      _resetEventPlugins: function() {
        EventPluginOrder = null;
        for (var pluginName in namesToPlugins) {
          if (namesToPlugins.hasOwnProperty(pluginName)) {
            delete namesToPlugins[pluginName];
          }
        }
        EventPluginRegistry.plugins.length = 0;
        var eventNameDispatchConfigs = EventPluginRegistry.eventNameDispatchConfigs;
        for (var eventName in eventNameDispatchConfigs) {
          if (eventNameDispatchConfigs.hasOwnProperty(eventName)) {
            delete eventNameDispatchConfigs[eventName];
          }
        }
        var registrationNameModules = EventPluginRegistry.registrationNameModules;
        for (var registrationName in registrationNameModules) {
          if (registrationNameModules.hasOwnProperty(registrationName)) {
            delete registrationNameModules[registrationName];
          }
        }
      }
    };
    module.exports = EventPluginRegistry;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/accumulateInto", ["npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var invariant = require("npm:react@0.13.2/lib/invariant");
    function accumulateInto(current, next) {
      ("production" !== process.env.NODE_ENV ? invariant(next != null, 'accumulateInto(...): Accumulated items must not be null or undefined.') : invariant(next != null));
      if (current == null) {
        return next;
      }
      var currentIsArray = Array.isArray(current);
      var nextIsArray = Array.isArray(next);
      if (currentIsArray && nextIsArray) {
        current.push.apply(current, next);
        return current;
      }
      if (currentIsArray) {
        current.push(next);
        return current;
      }
      if (nextIsArray) {
        return [current].concat(next);
      }
      return [current, next];
    }
    module.exports = accumulateInto;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/forEachAccumulated", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var forEachAccumulated = function(arr, cb, scope) {
    if (Array.isArray(arr)) {
      arr.forEach(cb, scope);
    } else if (arr) {
      cb.call(scope, arr);
    }
  };
  module.exports = forEachAccumulated;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactEventEmitterMixin", ["npm:react@0.13.2/lib/EventPluginHub"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var EventPluginHub = require("npm:react@0.13.2/lib/EventPluginHub");
  function runEventQueueInBatch(events) {
    EventPluginHub.enqueueEvents(events);
    EventPluginHub.processEventQueue();
  }
  var ReactEventEmitterMixin = {handleTopLevel: function(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent) {
      var events = EventPluginHub.extractEvents(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent);
      runEventQueueInBatch(events);
    }};
  module.exports = ReactEventEmitterMixin;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ViewportMetrics", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ViewportMetrics = {
    currentScrollLeft: 0,
    currentScrollTop: 0,
    refreshScrollValues: function(scrollPosition) {
      ViewportMetrics.currentScrollLeft = scrollPosition.x;
      ViewportMetrics.currentScrollTop = scrollPosition.y;
    }
  };
  module.exports = ViewportMetrics;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/isEventSupported", ["npm:react@0.13.2/lib/ExecutionEnvironment"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
  var useHasFeature;
  if (ExecutionEnvironment.canUseDOM) {
    useHasFeature = document.implementation && document.implementation.hasFeature && document.implementation.hasFeature('', '') !== true;
  }
  function isEventSupported(eventNameSuffix, capture) {
    if (!ExecutionEnvironment.canUseDOM || capture && !('addEventListener' in document)) {
      return false;
    }
    var eventName = 'on' + eventNameSuffix;
    var isSupported = eventName in document;
    if (!isSupported) {
      var element = document.createElement('div');
      element.setAttribute(eventName, 'return;');
      isSupported = typeof element[eventName] === 'function';
    }
    if (!isSupported && useHasFeature && eventNameSuffix === 'wheel') {
      isSupported = document.implementation.hasFeature('Events.wheel', '3.0');
    }
    return isSupported;
  }
  module.exports = isEventSupported;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactEmptyComponent", ["npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactInstanceMap", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactInstanceMap = require("npm:react@0.13.2/lib/ReactInstanceMap");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var component;
    var nullComponentIDsRegistry = {};
    var ReactEmptyComponentInjection = {injectEmptyComponent: function(emptyComponent) {
        component = ReactElement.createFactory(emptyComponent);
      }};
    var ReactEmptyComponentType = function() {};
    ReactEmptyComponentType.prototype.componentDidMount = function() {
      var internalInstance = ReactInstanceMap.get(this);
      if (!internalInstance) {
        return ;
      }
      registerNullComponentID(internalInstance._rootNodeID);
    };
    ReactEmptyComponentType.prototype.componentWillUnmount = function() {
      var internalInstance = ReactInstanceMap.get(this);
      if (!internalInstance) {
        return ;
      }
      deregisterNullComponentID(internalInstance._rootNodeID);
    };
    ReactEmptyComponentType.prototype.render = function() {
      ("production" !== process.env.NODE_ENV ? invariant(component, 'Trying to return null from a render, but no null placeholder component ' + 'was injected.') : invariant(component));
      return component();
    };
    var emptyElement = ReactElement.createElement(ReactEmptyComponentType);
    function registerNullComponentID(id) {
      nullComponentIDsRegistry[id] = true;
    }
    function deregisterNullComponentID(id) {
      delete nullComponentIDsRegistry[id];
    }
    function isNullComponentID(id) {
      return !!nullComponentIDsRegistry[id];
    }
    var ReactEmptyComponent = {
      emptyElement: emptyElement,
      injection: ReactEmptyComponentInjection,
      isNullComponentID: isNullComponentID
    };
    module.exports = ReactEmptyComponent;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/adler32", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var MOD = 65521;
  function adler32(data) {
    var a = 1;
    var b = 0;
    for (var i = 0; i < data.length; i++) {
      a = (a + data.charCodeAt(i)) % MOD;
      b = (b + a) % MOD;
    }
    return a | (b << 16);
  }
  module.exports = adler32;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/isNode", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  function isNode(object) {
    return !!(object && (((typeof Node === 'function' ? object instanceof Node : typeof object === 'object' && typeof object.nodeType === 'number' && typeof object.nodeName === 'string'))));
  }
  module.exports = isNode;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/getReactRootElementInContainer", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var DOC_NODE_TYPE = 9;
  function getReactRootElementInContainer(container) {
    if (!container) {
      return null;
    }
    if (container.nodeType === DOC_NODE_TYPE) {
      return container.documentElement;
    } else {
      return container.firstChild;
    }
  }
  module.exports = getReactRootElementInContainer;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactComponentEnvironment", ["npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var injected = false;
    var ReactComponentEnvironment = {
      unmountIDFromEnvironment: null,
      replaceNodeWithMarkupByID: null,
      processChildrenUpdates: null,
      injection: {injectEnvironment: function(environment) {
          ("production" !== process.env.NODE_ENV ? invariant(!injected, 'ReactCompositeComponent: injectEnvironment() can only be called once.') : invariant(!injected));
          ReactComponentEnvironment.unmountIDFromEnvironment = environment.unmountIDFromEnvironment;
          ReactComponentEnvironment.replaceNodeWithMarkupByID = environment.replaceNodeWithMarkupByID;
          ReactComponentEnvironment.processChildrenUpdates = environment.processChildrenUpdates;
          injected = true;
        }}
    };
    module.exports = ReactComponentEnvironment;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/shouldUpdateReactComponent", ["npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var warning = require("npm:react@0.13.2/lib/warning");
    function shouldUpdateReactComponent(prevElement, nextElement) {
      if (prevElement != null && nextElement != null) {
        var prevType = typeof prevElement;
        var nextType = typeof nextElement;
        if (prevType === 'string' || prevType === 'number') {
          return (nextType === 'string' || nextType === 'number');
        } else {
          if (nextType === 'object' && prevElement.type === nextElement.type && prevElement.key === nextElement.key) {
            var ownersMatch = prevElement._owner === nextElement._owner;
            var prevName = null;
            var nextName = null;
            var nextDisplayName = null;
            if ("production" !== process.env.NODE_ENV) {
              if (!ownersMatch) {
                if (prevElement._owner != null && prevElement._owner.getPublicInstance() != null && prevElement._owner.getPublicInstance().constructor != null) {
                  prevName = prevElement._owner.getPublicInstance().constructor.displayName;
                }
                if (nextElement._owner != null && nextElement._owner.getPublicInstance() != null && nextElement._owner.getPublicInstance().constructor != null) {
                  nextName = nextElement._owner.getPublicInstance().constructor.displayName;
                }
                if (nextElement.type != null && nextElement.type.displayName != null) {
                  nextDisplayName = nextElement.type.displayName;
                }
                if (nextElement.type != null && typeof nextElement.type === 'string') {
                  nextDisplayName = nextElement.type;
                }
                if (typeof nextElement.type !== 'string' || nextElement.type === 'input' || nextElement.type === 'textarea') {
                  if ((prevElement._owner != null && prevElement._owner._isOwnerNecessary === false) || (nextElement._owner != null && nextElement._owner._isOwnerNecessary === false)) {
                    if (prevElement._owner != null) {
                      prevElement._owner._isOwnerNecessary = true;
                    }
                    if (nextElement._owner != null) {
                      nextElement._owner._isOwnerNecessary = true;
                    }
                    ("production" !== process.env.NODE_ENV ? warning(false, '<%s /> is being rendered by both %s and %s using the same ' + 'key (%s) in the same place. Currently, this means that ' + 'they don\'t preserve state. This behavior should be very ' + 'rare so we\'re considering deprecating it. Please contact ' + 'the React team and explain your use case so that we can ' + 'take that into consideration.', nextDisplayName || 'Unknown Component', prevName || '[Unknown]', nextName || '[Unknown]', prevElement.key) : null);
                  }
                }
              }
            }
            return ownersMatch;
          }
        }
      }
      return false;
    }
    module.exports = shouldUpdateReactComponent;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/flattenChildren", ["npm:react@0.13.2/lib/traverseAllChildren", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var traverseAllChildren = require("npm:react@0.13.2/lib/traverseAllChildren");
    var warning = require("npm:react@0.13.2/lib/warning");
    function flattenSingleChildIntoContext(traverseContext, child, name) {
      var result = traverseContext;
      var keyUnique = !result.hasOwnProperty(name);
      if ("production" !== process.env.NODE_ENV) {
        ("production" !== process.env.NODE_ENV ? warning(keyUnique, 'flattenChildren(...): Encountered two children with the same key, ' + '`%s`. Child keys must be unique; when two children share a key, only ' + 'the first child will be used.', name) : null);
      }
      if (keyUnique && child != null) {
        result[name] = child;
      }
    }
    function flattenChildren(children) {
      if (children == null) {
        return children;
      }
      var result = {};
      traverseAllChildren(children, flattenSingleChildIntoContext, result);
      return result;
    }
    module.exports = flattenChildren;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/EventPropagators", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/EventPluginHub", "npm:react@0.13.2/lib/accumulateInto", "npm:react@0.13.2/lib/forEachAccumulated", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
    var EventPluginHub = require("npm:react@0.13.2/lib/EventPluginHub");
    var accumulateInto = require("npm:react@0.13.2/lib/accumulateInto");
    var forEachAccumulated = require("npm:react@0.13.2/lib/forEachAccumulated");
    var PropagationPhases = EventConstants.PropagationPhases;
    var getListener = EventPluginHub.getListener;
    function listenerAtPhase(id, event, propagationPhase) {
      var registrationName = event.dispatchConfig.phasedRegistrationNames[propagationPhase];
      return getListener(id, registrationName);
    }
    function accumulateDirectionalDispatches(domID, upwards, event) {
      if ("production" !== process.env.NODE_ENV) {
        if (!domID) {
          throw new Error('Dispatching id must not be null');
        }
      }
      var phase = upwards ? PropagationPhases.bubbled : PropagationPhases.captured;
      var listener = listenerAtPhase(domID, event, phase);
      if (listener) {
        event._dispatchListeners = accumulateInto(event._dispatchListeners, listener);
        event._dispatchIDs = accumulateInto(event._dispatchIDs, domID);
      }
    }
    function accumulateTwoPhaseDispatchesSingle(event) {
      if (event && event.dispatchConfig.phasedRegistrationNames) {
        EventPluginHub.injection.getInstanceHandle().traverseTwoPhase(event.dispatchMarker, accumulateDirectionalDispatches, event);
      }
    }
    function accumulateDispatches(id, ignoredDirection, event) {
      if (event && event.dispatchConfig.registrationName) {
        var registrationName = event.dispatchConfig.registrationName;
        var listener = getListener(id, registrationName);
        if (listener) {
          event._dispatchListeners = accumulateInto(event._dispatchListeners, listener);
          event._dispatchIDs = accumulateInto(event._dispatchIDs, id);
        }
      }
    }
    function accumulateDirectDispatchesSingle(event) {
      if (event && event.dispatchConfig.registrationName) {
        accumulateDispatches(event.dispatchMarker, null, event);
      }
    }
    function accumulateTwoPhaseDispatches(events) {
      forEachAccumulated(events, accumulateTwoPhaseDispatchesSingle);
    }
    function accumulateEnterLeaveDispatches(leave, enter, fromID, toID) {
      EventPluginHub.injection.getInstanceHandle().traverseEnterLeave(fromID, toID, accumulateDispatches, leave, enter);
    }
    function accumulateDirectDispatches(events) {
      forEachAccumulated(events, accumulateDirectDispatchesSingle);
    }
    var EventPropagators = {
      accumulateTwoPhaseDispatches: accumulateTwoPhaseDispatches,
      accumulateDirectDispatches: accumulateDirectDispatches,
      accumulateEnterLeaveDispatches: accumulateEnterLeaveDispatches
    };
    module.exports = EventPropagators;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/getTextContentAccessor", ["npm:react@0.13.2/lib/ExecutionEnvironment"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
  var contentKey = null;
  function getTextContentAccessor() {
    if (!contentKey && ExecutionEnvironment.canUseDOM) {
      contentKey = 'textContent' in document.documentElement ? 'textContent' : 'innerText';
    }
    return contentKey;
  }
  module.exports = getTextContentAccessor;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/getEventTarget", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  function getEventTarget(nativeEvent) {
    var target = nativeEvent.target || nativeEvent.srcElement || window;
    return target.nodeType === 3 ? target.parentNode : target;
  }
  module.exports = getEventTarget;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SyntheticInputEvent", ["npm:react@0.13.2/lib/SyntheticEvent"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var SyntheticEvent = require("npm:react@0.13.2/lib/SyntheticEvent");
  var InputEventInterface = {data: null};
  function SyntheticInputEvent(dispatchConfig, dispatchMarker, nativeEvent) {
    SyntheticEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent);
  }
  SyntheticEvent.augmentClass(SyntheticInputEvent, InputEventInterface);
  module.exports = SyntheticInputEvent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/isTextInputElement", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var supportedInputTypes = {
    'color': true,
    'date': true,
    'datetime': true,
    'datetime-local': true,
    'email': true,
    'month': true,
    'number': true,
    'password': true,
    'range': true,
    'search': true,
    'tel': true,
    'text': true,
    'time': true,
    'url': true,
    'week': true
  };
  function isTextInputElement(elem) {
    return elem && ((elem.nodeName === 'INPUT' && supportedInputTypes[elem.type] || elem.nodeName === 'TEXTAREA'));
  }
  module.exports = isTextInputElement;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ClientReactRootIndex", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var nextReactRootIndex = 0;
  var ClientReactRootIndex = {createReactRootIndex: function() {
      return nextReactRootIndex++;
    }};
  module.exports = ClientReactRootIndex;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/DefaultEventPluginOrder", ["npm:react@0.13.2/lib/keyOf"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var keyOf = require("npm:react@0.13.2/lib/keyOf");
  var DefaultEventPluginOrder = [keyOf({ResponderEventPlugin: null}), keyOf({SimpleEventPlugin: null}), keyOf({TapEventPlugin: null}), keyOf({EnterLeaveEventPlugin: null}), keyOf({ChangeEventPlugin: null}), keyOf({SelectEventPlugin: null}), keyOf({BeforeInputEventPlugin: null}), keyOf({AnalyticsEventPlugin: null}), keyOf({MobileSafariClickEventPlugin: null})];
  module.exports = DefaultEventPluginOrder;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SyntheticUIEvent", ["npm:react@0.13.2/lib/SyntheticEvent", "npm:react@0.13.2/lib/getEventTarget"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var SyntheticEvent = require("npm:react@0.13.2/lib/SyntheticEvent");
  var getEventTarget = require("npm:react@0.13.2/lib/getEventTarget");
  var UIEventInterface = {
    view: function(event) {
      if (event.view) {
        return event.view;
      }
      var target = getEventTarget(event);
      if (target != null && target.window === target) {
        return target;
      }
      var doc = target.ownerDocument;
      if (doc) {
        return doc.defaultView || doc.parentWindow;
      } else {
        return window;
      }
    },
    detail: function(event) {
      return event.detail || 0;
    }
  };
  function SyntheticUIEvent(dispatchConfig, dispatchMarker, nativeEvent) {
    SyntheticEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent);
  }
  SyntheticEvent.augmentClass(SyntheticUIEvent, UIEventInterface);
  module.exports = SyntheticUIEvent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/getEventModifierState", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var modifierKeyToProp = {
    'Alt': 'altKey',
    'Control': 'ctrlKey',
    'Meta': 'metaKey',
    'Shift': 'shiftKey'
  };
  function modifierStateGetter(keyArg) {
    var syntheticEvent = this;
    var nativeEvent = syntheticEvent.nativeEvent;
    if (nativeEvent.getModifierState) {
      return nativeEvent.getModifierState(keyArg);
    }
    var keyProp = modifierKeyToProp[keyArg];
    return keyProp ? !!nativeEvent[keyProp] : false;
  }
  function getEventModifierState(nativeEvent) {
    return modifierStateGetter;
  }
  module.exports = getEventModifierState;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/HTMLDOMPropertyConfig", ["npm:react@0.13.2/lib/DOMProperty", "npm:react@0.13.2/lib/ExecutionEnvironment"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var DOMProperty = require("npm:react@0.13.2/lib/DOMProperty");
  var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
  var MUST_USE_ATTRIBUTE = DOMProperty.injection.MUST_USE_ATTRIBUTE;
  var MUST_USE_PROPERTY = DOMProperty.injection.MUST_USE_PROPERTY;
  var HAS_BOOLEAN_VALUE = DOMProperty.injection.HAS_BOOLEAN_VALUE;
  var HAS_SIDE_EFFECTS = DOMProperty.injection.HAS_SIDE_EFFECTS;
  var HAS_NUMERIC_VALUE = DOMProperty.injection.HAS_NUMERIC_VALUE;
  var HAS_POSITIVE_NUMERIC_VALUE = DOMProperty.injection.HAS_POSITIVE_NUMERIC_VALUE;
  var HAS_OVERLOADED_BOOLEAN_VALUE = DOMProperty.injection.HAS_OVERLOADED_BOOLEAN_VALUE;
  var hasSVG;
  if (ExecutionEnvironment.canUseDOM) {
    var implementation = document.implementation;
    hasSVG = (implementation && implementation.hasFeature && implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#BasicStructure', '1.1'));
  }
  var HTMLDOMPropertyConfig = {
    isCustomAttribute: RegExp.prototype.test.bind(/^(data|aria)-[a-z_][a-z\d_.\-]*$/),
    Properties: {
      accept: null,
      acceptCharset: null,
      accessKey: null,
      action: null,
      allowFullScreen: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
      allowTransparency: MUST_USE_ATTRIBUTE,
      alt: null,
      async: HAS_BOOLEAN_VALUE,
      autoComplete: null,
      autoPlay: HAS_BOOLEAN_VALUE,
      cellPadding: null,
      cellSpacing: null,
      charSet: MUST_USE_ATTRIBUTE,
      checked: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
      classID: MUST_USE_ATTRIBUTE,
      className: hasSVG ? MUST_USE_ATTRIBUTE : MUST_USE_PROPERTY,
      cols: MUST_USE_ATTRIBUTE | HAS_POSITIVE_NUMERIC_VALUE,
      colSpan: null,
      content: null,
      contentEditable: null,
      contextMenu: MUST_USE_ATTRIBUTE,
      controls: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
      coords: null,
      crossOrigin: null,
      data: null,
      dateTime: MUST_USE_ATTRIBUTE,
      defer: HAS_BOOLEAN_VALUE,
      dir: null,
      disabled: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
      download: HAS_OVERLOADED_BOOLEAN_VALUE,
      draggable: null,
      encType: null,
      form: MUST_USE_ATTRIBUTE,
      formAction: MUST_USE_ATTRIBUTE,
      formEncType: MUST_USE_ATTRIBUTE,
      formMethod: MUST_USE_ATTRIBUTE,
      formNoValidate: HAS_BOOLEAN_VALUE,
      formTarget: MUST_USE_ATTRIBUTE,
      frameBorder: MUST_USE_ATTRIBUTE,
      headers: null,
      height: MUST_USE_ATTRIBUTE,
      hidden: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
      high: null,
      href: null,
      hrefLang: null,
      htmlFor: null,
      httpEquiv: null,
      icon: null,
      id: MUST_USE_PROPERTY,
      label: null,
      lang: null,
      list: MUST_USE_ATTRIBUTE,
      loop: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
      low: null,
      manifest: MUST_USE_ATTRIBUTE,
      marginHeight: null,
      marginWidth: null,
      max: null,
      maxLength: MUST_USE_ATTRIBUTE,
      media: MUST_USE_ATTRIBUTE,
      mediaGroup: null,
      method: null,
      min: null,
      multiple: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
      muted: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
      name: null,
      noValidate: HAS_BOOLEAN_VALUE,
      open: HAS_BOOLEAN_VALUE,
      optimum: null,
      pattern: null,
      placeholder: null,
      poster: null,
      preload: null,
      radioGroup: null,
      readOnly: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
      rel: null,
      required: HAS_BOOLEAN_VALUE,
      role: MUST_USE_ATTRIBUTE,
      rows: MUST_USE_ATTRIBUTE | HAS_POSITIVE_NUMERIC_VALUE,
      rowSpan: null,
      sandbox: null,
      scope: null,
      scoped: HAS_BOOLEAN_VALUE,
      scrolling: null,
      seamless: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
      selected: MUST_USE_PROPERTY | HAS_BOOLEAN_VALUE,
      shape: null,
      size: MUST_USE_ATTRIBUTE | HAS_POSITIVE_NUMERIC_VALUE,
      sizes: MUST_USE_ATTRIBUTE,
      span: HAS_POSITIVE_NUMERIC_VALUE,
      spellCheck: null,
      src: null,
      srcDoc: MUST_USE_PROPERTY,
      srcSet: MUST_USE_ATTRIBUTE,
      start: HAS_NUMERIC_VALUE,
      step: null,
      style: null,
      tabIndex: null,
      target: null,
      title: null,
      type: null,
      useMap: null,
      value: MUST_USE_PROPERTY | HAS_SIDE_EFFECTS,
      width: MUST_USE_ATTRIBUTE,
      wmode: MUST_USE_ATTRIBUTE,
      autoCapitalize: null,
      autoCorrect: null,
      itemProp: MUST_USE_ATTRIBUTE,
      itemScope: MUST_USE_ATTRIBUTE | HAS_BOOLEAN_VALUE,
      itemType: MUST_USE_ATTRIBUTE,
      itemID: MUST_USE_ATTRIBUTE,
      itemRef: MUST_USE_ATTRIBUTE,
      property: null,
      unselectable: MUST_USE_ATTRIBUTE
    },
    DOMAttributeNames: {
      acceptCharset: 'accept-charset',
      className: 'class',
      htmlFor: 'for',
      httpEquiv: 'http-equiv'
    },
    DOMPropertyNames: {
      autoCapitalize: 'autocapitalize',
      autoComplete: 'autocomplete',
      autoCorrect: 'autocorrect',
      autoFocus: 'autofocus',
      autoPlay: 'autoplay',
      encType: 'encoding',
      hrefLang: 'hreflang',
      radioGroup: 'radiogroup',
      spellCheck: 'spellcheck',
      srcDoc: 'srcdoc',
      srcSet: 'srcset'
    }
  };
  module.exports = HTMLDOMPropertyConfig;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/MobileSafariClickEventPlugin", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/emptyFunction"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
  var emptyFunction = require("npm:react@0.13.2/lib/emptyFunction");
  var topLevelTypes = EventConstants.topLevelTypes;
  var MobileSafariClickEventPlugin = {
    eventTypes: null,
    extractEvents: function(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent) {
      if (topLevelType === topLevelTypes.topTouchStart) {
        var target = nativeEvent.target;
        if (target && !target.onclick) {
          target.onclick = emptyFunction;
        }
      }
    }
  };
  module.exports = MobileSafariClickEventPlugin;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/findDOMNode", ["npm:react@0.13.2/lib/ReactCurrentOwner", "npm:react@0.13.2/lib/ReactInstanceMap", "npm:react@0.13.2/lib/ReactMount", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/isNode", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactCurrentOwner = require("npm:react@0.13.2/lib/ReactCurrentOwner");
    var ReactInstanceMap = require("npm:react@0.13.2/lib/ReactInstanceMap");
    var ReactMount = require("npm:react@0.13.2/lib/ReactMount");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var isNode = require("npm:react@0.13.2/lib/isNode");
    var warning = require("npm:react@0.13.2/lib/warning");
    function findDOMNode(componentOrElement) {
      if ("production" !== process.env.NODE_ENV) {
        var owner = ReactCurrentOwner.current;
        if (owner !== null) {
          ("production" !== process.env.NODE_ENV ? warning(owner._warnedAboutRefsInRender, '%s is accessing getDOMNode or findDOMNode inside its render(). ' + 'render() should be a pure function of props and state. It should ' + 'never access something that requires stale data from the previous ' + 'render, such as refs. Move this logic to componentDidMount and ' + 'componentDidUpdate instead.', owner.getName() || 'A component') : null);
          owner._warnedAboutRefsInRender = true;
        }
      }
      if (componentOrElement == null) {
        return null;
      }
      if (isNode(componentOrElement)) {
        return componentOrElement;
      }
      if (ReactInstanceMap.has(componentOrElement)) {
        return ReactMount.getNodeFromInstance(componentOrElement);
      }
      ("production" !== process.env.NODE_ENV ? invariant(componentOrElement.render == null || typeof componentOrElement.render !== 'function', 'Component (with keys: %s) contains `render` method ' + 'but is not mounted in the DOM', Object.keys(componentOrElement)) : invariant(componentOrElement.render == null || typeof componentOrElement.render !== 'function'));
      ("production" !== process.env.NODE_ENV ? invariant(false, 'Element appears to be neither ReactComponent nor DOMNode (keys: %s)', Object.keys(componentOrElement)) : invariant(false));
    }
    module.exports = findDOMNode;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDefaultBatchingStrategy", ["npm:react@0.13.2/lib/ReactUpdates", "npm:react@0.13.2/lib/Transaction", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/emptyFunction"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ReactUpdates = require("npm:react@0.13.2/lib/ReactUpdates");
  var Transaction = require("npm:react@0.13.2/lib/Transaction");
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var emptyFunction = require("npm:react@0.13.2/lib/emptyFunction");
  var RESET_BATCHED_UPDATES = {
    initialize: emptyFunction,
    close: function() {
      ReactDefaultBatchingStrategy.isBatchingUpdates = false;
    }
  };
  var FLUSH_BATCHED_UPDATES = {
    initialize: emptyFunction,
    close: ReactUpdates.flushBatchedUpdates.bind(ReactUpdates)
  };
  var TRANSACTION_WRAPPERS = [FLUSH_BATCHED_UPDATES, RESET_BATCHED_UPDATES];
  function ReactDefaultBatchingStrategyTransaction() {
    this.reinitializeTransaction();
  }
  assign(ReactDefaultBatchingStrategyTransaction.prototype, Transaction.Mixin, {getTransactionWrappers: function() {
      return TRANSACTION_WRAPPERS;
    }});
  var transaction = new ReactDefaultBatchingStrategyTransaction();
  var ReactDefaultBatchingStrategy = {
    isBatchingUpdates: false,
    batchedUpdates: function(callback, a, b, c, d) {
      var alreadyBatchingUpdates = ReactDefaultBatchingStrategy.isBatchingUpdates;
      ReactDefaultBatchingStrategy.isBatchingUpdates = true;
      if (alreadyBatchingUpdates) {
        callback(a, b, c, d);
      } else {
        transaction.perform(callback, null, a, b, c, d);
      }
    }
  };
  module.exports = ReactDefaultBatchingStrategy;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/focusNode", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  function focusNode(node) {
    try {
      node.focus();
    } catch (e) {}
  }
  module.exports = focusNode;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/LocalEventTrapMixin", ["npm:react@0.13.2/lib/ReactBrowserEventEmitter", "npm:react@0.13.2/lib/accumulateInto", "npm:react@0.13.2/lib/forEachAccumulated", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactBrowserEventEmitter = require("npm:react@0.13.2/lib/ReactBrowserEventEmitter");
    var accumulateInto = require("npm:react@0.13.2/lib/accumulateInto");
    var forEachAccumulated = require("npm:react@0.13.2/lib/forEachAccumulated");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    function remove(event) {
      event.remove();
    }
    var LocalEventTrapMixin = {
      trapBubbledEvent: function(topLevelType, handlerBaseName) {
        ("production" !== process.env.NODE_ENV ? invariant(this.isMounted(), 'Must be mounted to trap events') : invariant(this.isMounted()));
        var node = this.getDOMNode();
        ("production" !== process.env.NODE_ENV ? invariant(node, 'LocalEventTrapMixin.trapBubbledEvent(...): Requires node to be rendered.') : invariant(node));
        var listener = ReactBrowserEventEmitter.trapBubbledEvent(topLevelType, handlerBaseName, node);
        this._localEventListeners = accumulateInto(this._localEventListeners, listener);
      },
      componentWillUnmount: function() {
        if (this._localEventListeners) {
          forEachAccumulated(this._localEventListeners, remove);
        }
      }
    };
    module.exports = LocalEventTrapMixin;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMImg", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/LocalEventTrapMixin", "npm:react@0.13.2/lib/ReactBrowserComponentMixin", "npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactElement"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
  var LocalEventTrapMixin = require("npm:react@0.13.2/lib/LocalEventTrapMixin");
  var ReactBrowserComponentMixin = require("npm:react@0.13.2/lib/ReactBrowserComponentMixin");
  var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
  var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
  var img = ReactElement.createFactory('img');
  var ReactDOMImg = ReactClass.createClass({
    displayName: 'ReactDOMImg',
    tagName: 'IMG',
    mixins: [ReactBrowserComponentMixin, LocalEventTrapMixin],
    render: function() {
      return img(this.props);
    },
    componentDidMount: function() {
      this.trapBubbledEvent(EventConstants.topLevelTypes.topLoad, 'load');
      this.trapBubbledEvent(EventConstants.topLevelTypes.topError, 'error');
    }
  });
  module.exports = ReactDOMImg;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMIframe", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/LocalEventTrapMixin", "npm:react@0.13.2/lib/ReactBrowserComponentMixin", "npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactElement"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
  var LocalEventTrapMixin = require("npm:react@0.13.2/lib/LocalEventTrapMixin");
  var ReactBrowserComponentMixin = require("npm:react@0.13.2/lib/ReactBrowserComponentMixin");
  var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
  var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
  var iframe = ReactElement.createFactory('iframe');
  var ReactDOMIframe = ReactClass.createClass({
    displayName: 'ReactDOMIframe',
    tagName: 'IFRAME',
    mixins: [ReactBrowserComponentMixin, LocalEventTrapMixin],
    render: function() {
      return iframe(this.props);
    },
    componentDidMount: function() {
      this.trapBubbledEvent(EventConstants.topLevelTypes.topLoad, 'load');
    }
  });
  module.exports = ReactDOMIframe;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactPropTypes", ["npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactFragment", "npm:react@0.13.2/lib/ReactPropTypeLocationNames", "npm:react@0.13.2/lib/emptyFunction"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
  var ReactFragment = require("npm:react@0.13.2/lib/ReactFragment");
  var ReactPropTypeLocationNames = require("npm:react@0.13.2/lib/ReactPropTypeLocationNames");
  var emptyFunction = require("npm:react@0.13.2/lib/emptyFunction");
  var ANONYMOUS = '<<anonymous>>';
  var elementTypeChecker = createElementTypeChecker();
  var nodeTypeChecker = createNodeChecker();
  var ReactPropTypes = {
    array: createPrimitiveTypeChecker('array'),
    bool: createPrimitiveTypeChecker('boolean'),
    func: createPrimitiveTypeChecker('function'),
    number: createPrimitiveTypeChecker('number'),
    object: createPrimitiveTypeChecker('object'),
    string: createPrimitiveTypeChecker('string'),
    any: createAnyTypeChecker(),
    arrayOf: createArrayOfTypeChecker,
    element: elementTypeChecker,
    instanceOf: createInstanceTypeChecker,
    node: nodeTypeChecker,
    objectOf: createObjectOfTypeChecker,
    oneOf: createEnumTypeChecker,
    oneOfType: createUnionTypeChecker,
    shape: createShapeTypeChecker
  };
  function createChainableTypeChecker(validate) {
    function checkType(isRequired, props, propName, componentName, location) {
      componentName = componentName || ANONYMOUS;
      if (props[propName] == null) {
        var locationName = ReactPropTypeLocationNames[location];
        if (isRequired) {
          return new Error(("Required " + locationName + " `" + propName + "` was not specified in ") + ("`" + componentName + "`."));
        }
        return null;
      } else {
        return validate(props, propName, componentName, location);
      }
    }
    var chainedCheckType = checkType.bind(null, false);
    chainedCheckType.isRequired = checkType.bind(null, true);
    return chainedCheckType;
  }
  function createPrimitiveTypeChecker(expectedType) {
    function validate(props, propName, componentName, location) {
      var propValue = props[propName];
      var propType = getPropType(propValue);
      if (propType !== expectedType) {
        var locationName = ReactPropTypeLocationNames[location];
        var preciseType = getPreciseType(propValue);
        return new Error(("Invalid " + locationName + " `" + propName + "` of type `" + preciseType + "` ") + ("supplied to `" + componentName + "`, expected `" + expectedType + "`."));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }
  function createAnyTypeChecker() {
    return createChainableTypeChecker(emptyFunction.thatReturns(null));
  }
  function createArrayOfTypeChecker(typeChecker) {
    function validate(props, propName, componentName, location) {
      var propValue = props[propName];
      if (!Array.isArray(propValue)) {
        var locationName = ReactPropTypeLocationNames[location];
        var propType = getPropType(propValue);
        return new Error(("Invalid " + locationName + " `" + propName + "` of type ") + ("`" + propType + "` supplied to `" + componentName + "`, expected an array."));
      }
      for (var i = 0; i < propValue.length; i++) {
        var error = typeChecker(propValue, i, componentName, location);
        if (error instanceof Error) {
          return error;
        }
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }
  function createElementTypeChecker() {
    function validate(props, propName, componentName, location) {
      if (!ReactElement.isValidElement(props[propName])) {
        var locationName = ReactPropTypeLocationNames[location];
        return new Error(("Invalid " + locationName + " `" + propName + "` supplied to ") + ("`" + componentName + "`, expected a ReactElement."));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }
  function createInstanceTypeChecker(expectedClass) {
    function validate(props, propName, componentName, location) {
      if (!(props[propName] instanceof expectedClass)) {
        var locationName = ReactPropTypeLocationNames[location];
        var expectedClassName = expectedClass.name || ANONYMOUS;
        return new Error(("Invalid " + locationName + " `" + propName + "` supplied to ") + ("`" + componentName + "`, expected instance of `" + expectedClassName + "`."));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }
  function createEnumTypeChecker(expectedValues) {
    function validate(props, propName, componentName, location) {
      var propValue = props[propName];
      for (var i = 0; i < expectedValues.length; i++) {
        if (propValue === expectedValues[i]) {
          return null;
        }
      }
      var locationName = ReactPropTypeLocationNames[location];
      var valuesString = JSON.stringify(expectedValues);
      return new Error(("Invalid " + locationName + " `" + propName + "` of value `" + propValue + "` ") + ("supplied to `" + componentName + "`, expected one of " + valuesString + "."));
    }
    return createChainableTypeChecker(validate);
  }
  function createObjectOfTypeChecker(typeChecker) {
    function validate(props, propName, componentName, location) {
      var propValue = props[propName];
      var propType = getPropType(propValue);
      if (propType !== 'object') {
        var locationName = ReactPropTypeLocationNames[location];
        return new Error(("Invalid " + locationName + " `" + propName + "` of type ") + ("`" + propType + "` supplied to `" + componentName + "`, expected an object."));
      }
      for (var key in propValue) {
        if (propValue.hasOwnProperty(key)) {
          var error = typeChecker(propValue, key, componentName, location);
          if (error instanceof Error) {
            return error;
          }
        }
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }
  function createUnionTypeChecker(arrayOfTypeCheckers) {
    function validate(props, propName, componentName, location) {
      for (var i = 0; i < arrayOfTypeCheckers.length; i++) {
        var checker = arrayOfTypeCheckers[i];
        if (checker(props, propName, componentName, location) == null) {
          return null;
        }
      }
      var locationName = ReactPropTypeLocationNames[location];
      return new Error(("Invalid " + locationName + " `" + propName + "` supplied to ") + ("`" + componentName + "`."));
    }
    return createChainableTypeChecker(validate);
  }
  function createNodeChecker() {
    function validate(props, propName, componentName, location) {
      if (!isNode(props[propName])) {
        var locationName = ReactPropTypeLocationNames[location];
        return new Error(("Invalid " + locationName + " `" + propName + "` supplied to ") + ("`" + componentName + "`, expected a ReactNode."));
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }
  function createShapeTypeChecker(shapeTypes) {
    function validate(props, propName, componentName, location) {
      var propValue = props[propName];
      var propType = getPropType(propValue);
      if (propType !== 'object') {
        var locationName = ReactPropTypeLocationNames[location];
        return new Error(("Invalid " + locationName + " `" + propName + "` of type `" + propType + "` ") + ("supplied to `" + componentName + "`, expected `object`."));
      }
      for (var key in shapeTypes) {
        var checker = shapeTypes[key];
        if (!checker) {
          continue;
        }
        var error = checker(propValue, key, componentName, location);
        if (error) {
          return error;
        }
      }
      return null;
    }
    return createChainableTypeChecker(validate);
  }
  function isNode(propValue) {
    switch (typeof propValue) {
      case 'number':
      case 'string':
      case 'undefined':
        return true;
      case 'boolean':
        return !propValue;
      case 'object':
        if (Array.isArray(propValue)) {
          return propValue.every(isNode);
        }
        if (propValue === null || ReactElement.isValidElement(propValue)) {
          return true;
        }
        propValue = ReactFragment.extractIfFragment(propValue);
        for (var k in propValue) {
          if (!isNode(propValue[k])) {
            return false;
          }
        }
        return true;
      default:
        return false;
    }
  }
  function getPropType(propValue) {
    var propType = typeof propValue;
    if (Array.isArray(propValue)) {
      return 'array';
    }
    if (propValue instanceof RegExp) {
      return 'object';
    }
    return propType;
  }
  function getPreciseType(propValue) {
    var propType = getPropType(propValue);
    if (propType === 'object') {
      if (propValue instanceof Date) {
        return 'date';
      } else if (propValue instanceof RegExp) {
        return 'regexp';
      }
    }
    return propType;
  }
  module.exports = ReactPropTypes;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMOption", ["npm:react@0.13.2/lib/ReactBrowserComponentMixin", "npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactBrowserComponentMixin = require("npm:react@0.13.2/lib/ReactBrowserComponentMixin");
    var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var warning = require("npm:react@0.13.2/lib/warning");
    var option = ReactElement.createFactory('option');
    var ReactDOMOption = ReactClass.createClass({
      displayName: 'ReactDOMOption',
      tagName: 'OPTION',
      mixins: [ReactBrowserComponentMixin],
      componentWillMount: function() {
        if ("production" !== process.env.NODE_ENV) {
          ("production" !== process.env.NODE_ENV ? warning(this.props.selected == null, 'Use the `defaultValue` or `value` props on <select> instead of ' + 'setting `selected` on <option>.') : null);
        }
      },
      render: function() {
        return option(this.props, this.props.children);
      }
    });
    module.exports = ReactDOMOption;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMSelect", ["npm:react@0.13.2/lib/AutoFocusMixin", "npm:react@0.13.2/lib/LinkedValueUtils", "npm:react@0.13.2/lib/ReactBrowserComponentMixin", "npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactUpdates", "npm:react@0.13.2/lib/Object.assign"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var AutoFocusMixin = require("npm:react@0.13.2/lib/AutoFocusMixin");
  var LinkedValueUtils = require("npm:react@0.13.2/lib/LinkedValueUtils");
  var ReactBrowserComponentMixin = require("npm:react@0.13.2/lib/ReactBrowserComponentMixin");
  var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
  var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
  var ReactUpdates = require("npm:react@0.13.2/lib/ReactUpdates");
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var select = ReactElement.createFactory('select');
  function updateOptionsIfPendingUpdateAndMounted() {
    if (this._pendingUpdate) {
      this._pendingUpdate = false;
      var value = LinkedValueUtils.getValue(this);
      if (value != null && this.isMounted()) {
        updateOptions(this, value);
      }
    }
  }
  function selectValueType(props, propName, componentName) {
    if (props[propName] == null) {
      return null;
    }
    if (props.multiple) {
      if (!Array.isArray(props[propName])) {
        return new Error(("The `" + propName + "` prop supplied to <select> must be an array if ") + ("`multiple` is true."));
      }
    } else {
      if (Array.isArray(props[propName])) {
        return new Error(("The `" + propName + "` prop supplied to <select> must be a scalar ") + ("value if `multiple` is false."));
      }
    }
  }
  function updateOptions(component, propValue) {
    var selectedValue,
        i,
        l;
    var options = component.getDOMNode().options;
    if (component.props.multiple) {
      selectedValue = {};
      for (i = 0, l = propValue.length; i < l; i++) {
        selectedValue['' + propValue[i]] = true;
      }
      for (i = 0, l = options.length; i < l; i++) {
        var selected = selectedValue.hasOwnProperty(options[i].value);
        if (options[i].selected !== selected) {
          options[i].selected = selected;
        }
      }
    } else {
      selectedValue = '' + propValue;
      for (i = 0, l = options.length; i < l; i++) {
        if (options[i].value === selectedValue) {
          options[i].selected = true;
          return ;
        }
      }
      if (options.length) {
        options[0].selected = true;
      }
    }
  }
  var ReactDOMSelect = ReactClass.createClass({
    displayName: 'ReactDOMSelect',
    tagName: 'SELECT',
    mixins: [AutoFocusMixin, LinkedValueUtils.Mixin, ReactBrowserComponentMixin],
    propTypes: {
      defaultValue: selectValueType,
      value: selectValueType
    },
    render: function() {
      var props = assign({}, this.props);
      props.onChange = this._handleChange;
      props.value = null;
      return select(props, this.props.children);
    },
    componentWillMount: function() {
      this._pendingUpdate = false;
    },
    componentDidMount: function() {
      var value = LinkedValueUtils.getValue(this);
      if (value != null) {
        updateOptions(this, value);
      } else if (this.props.defaultValue != null) {
        updateOptions(this, this.props.defaultValue);
      }
    },
    componentDidUpdate: function(prevProps) {
      var value = LinkedValueUtils.getValue(this);
      if (value != null) {
        this._pendingUpdate = false;
        updateOptions(this, value);
      } else if (!prevProps.multiple !== !this.props.multiple) {
        if (this.props.defaultValue != null) {
          updateOptions(this, this.props.defaultValue);
        } else {
          updateOptions(this, this.props.multiple ? [] : '');
        }
      }
    },
    _handleChange: function(event) {
      var returnValue;
      var onChange = LinkedValueUtils.getOnChange(this);
      if (onChange) {
        returnValue = onChange.call(this, event);
      }
      this._pendingUpdate = true;
      ReactUpdates.asap(updateOptionsIfPendingUpdateAndMounted, this);
      return returnValue;
    }
  });
  module.exports = ReactDOMSelect;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMTextarea", ["npm:react@0.13.2/lib/AutoFocusMixin", "npm:react@0.13.2/lib/DOMPropertyOperations", "npm:react@0.13.2/lib/LinkedValueUtils", "npm:react@0.13.2/lib/ReactBrowserComponentMixin", "npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactUpdates", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var AutoFocusMixin = require("npm:react@0.13.2/lib/AutoFocusMixin");
    var DOMPropertyOperations = require("npm:react@0.13.2/lib/DOMPropertyOperations");
    var LinkedValueUtils = require("npm:react@0.13.2/lib/LinkedValueUtils");
    var ReactBrowserComponentMixin = require("npm:react@0.13.2/lib/ReactBrowserComponentMixin");
    var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactUpdates = require("npm:react@0.13.2/lib/ReactUpdates");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var warning = require("npm:react@0.13.2/lib/warning");
    var textarea = ReactElement.createFactory('textarea');
    function forceUpdateIfMounted() {
      if (this.isMounted()) {
        this.forceUpdate();
      }
    }
    var ReactDOMTextarea = ReactClass.createClass({
      displayName: 'ReactDOMTextarea',
      tagName: 'TEXTAREA',
      mixins: [AutoFocusMixin, LinkedValueUtils.Mixin, ReactBrowserComponentMixin],
      getInitialState: function() {
        var defaultValue = this.props.defaultValue;
        var children = this.props.children;
        if (children != null) {
          if ("production" !== process.env.NODE_ENV) {
            ("production" !== process.env.NODE_ENV ? warning(false, 'Use the `defaultValue` or `value` props instead of setting ' + 'children on <textarea>.') : null);
          }
          ("production" !== process.env.NODE_ENV ? invariant(defaultValue == null, 'If you supply `defaultValue` on a <textarea>, do not pass children.') : invariant(defaultValue == null));
          if (Array.isArray(children)) {
            ("production" !== process.env.NODE_ENV ? invariant(children.length <= 1, '<textarea> can only have at most one child.') : invariant(children.length <= 1));
            children = children[0];
          }
          defaultValue = '' + children;
        }
        if (defaultValue == null) {
          defaultValue = '';
        }
        var value = LinkedValueUtils.getValue(this);
        return {initialValue: '' + (value != null ? value : defaultValue)};
      },
      render: function() {
        var props = assign({}, this.props);
        ("production" !== process.env.NODE_ENV ? invariant(props.dangerouslySetInnerHTML == null, '`dangerouslySetInnerHTML` does not make sense on <textarea>.') : invariant(props.dangerouslySetInnerHTML == null));
        props.defaultValue = null;
        props.value = null;
        props.onChange = this._handleChange;
        return textarea(props, this.state.initialValue);
      },
      componentDidUpdate: function(prevProps, prevState, prevContext) {
        var value = LinkedValueUtils.getValue(this);
        if (value != null) {
          var rootNode = this.getDOMNode();
          DOMPropertyOperations.setValueForProperty(rootNode, 'value', '' + value);
        }
      },
      _handleChange: function(event) {
        var returnValue;
        var onChange = LinkedValueUtils.getOnChange(this);
        if (onChange) {
          returnValue = onChange.call(this, event);
        }
        ReactUpdates.asap(forceUpdateIfMounted, this);
        return returnValue;
      }
    });
    module.exports = ReactDOMTextarea;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/EventListener", ["npm:react@0.13.2/lib/emptyFunction", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    var emptyFunction = require("npm:react@0.13.2/lib/emptyFunction");
    var EventListener = {
      listen: function(target, eventType, callback) {
        if (target.addEventListener) {
          target.addEventListener(eventType, callback, false);
          return {remove: function() {
              target.removeEventListener(eventType, callback, false);
            }};
        } else if (target.attachEvent) {
          target.attachEvent('on' + eventType, callback);
          return {remove: function() {
              target.detachEvent('on' + eventType, callback);
            }};
        }
      },
      capture: function(target, eventType, callback) {
        if (!target.addEventListener) {
          if ("production" !== process.env.NODE_ENV) {
            console.error('Attempted to listen to events during the capture phase on a ' + 'browser that does not support the capture phase. Your application ' + 'will not receive some events.');
          }
          return {remove: emptyFunction};
        } else {
          target.addEventListener(eventType, callback, true);
          return {remove: function() {
              target.removeEventListener(eventType, callback, true);
            }};
        }
      },
      registerDefault: function() {}
    };
    module.exports = EventListener;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/getUnboundedScrollPosition", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  function getUnboundedScrollPosition(scrollable) {
    if (scrollable === window) {
      return {
        x: window.pageXOffset || document.documentElement.scrollLeft,
        y: window.pageYOffset || document.documentElement.scrollTop
      };
    }
    return {
      x: scrollable.scrollLeft,
      y: scrollable.scrollTop
    };
  }
  module.exports = getUnboundedScrollPosition;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactInjection", ["npm:react@0.13.2/lib/DOMProperty", "npm:react@0.13.2/lib/EventPluginHub", "npm:react@0.13.2/lib/ReactComponentEnvironment", "npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactEmptyComponent", "npm:react@0.13.2/lib/ReactBrowserEventEmitter", "npm:react@0.13.2/lib/ReactNativeComponent", "npm:react@0.13.2/lib/ReactDOMComponent", "npm:react@0.13.2/lib/ReactPerf", "npm:react@0.13.2/lib/ReactRootIndex", "npm:react@0.13.2/lib/ReactUpdates"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var DOMProperty = require("npm:react@0.13.2/lib/DOMProperty");
  var EventPluginHub = require("npm:react@0.13.2/lib/EventPluginHub");
  var ReactComponentEnvironment = require("npm:react@0.13.2/lib/ReactComponentEnvironment");
  var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
  var ReactEmptyComponent = require("npm:react@0.13.2/lib/ReactEmptyComponent");
  var ReactBrowserEventEmitter = require("npm:react@0.13.2/lib/ReactBrowserEventEmitter");
  var ReactNativeComponent = require("npm:react@0.13.2/lib/ReactNativeComponent");
  var ReactDOMComponent = require("npm:react@0.13.2/lib/ReactDOMComponent");
  var ReactPerf = require("npm:react@0.13.2/lib/ReactPerf");
  var ReactRootIndex = require("npm:react@0.13.2/lib/ReactRootIndex");
  var ReactUpdates = require("npm:react@0.13.2/lib/ReactUpdates");
  var ReactInjection = {
    Component: ReactComponentEnvironment.injection,
    Class: ReactClass.injection,
    DOMComponent: ReactDOMComponent.injection,
    DOMProperty: DOMProperty.injection,
    EmptyComponent: ReactEmptyComponent.injection,
    EventPluginHub: EventPluginHub.injection,
    EventEmitter: ReactBrowserEventEmitter.injection,
    NativeComponent: ReactNativeComponent.injection,
    Perf: ReactPerf.injection,
    RootIndex: ReactRootIndex.injection,
    Updates: ReactUpdates.injection
  };
  module.exports = ReactInjection;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/getNodeForCharacterOffset", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  function getLeafNode(node) {
    while (node && node.firstChild) {
      node = node.firstChild;
    }
    return node;
  }
  function getSiblingNode(node) {
    while (node) {
      if (node.nextSibling) {
        return node.nextSibling;
      }
      node = node.parentNode;
    }
  }
  function getNodeForCharacterOffset(root, offset) {
    var node = getLeafNode(root);
    var nodeStart = 0;
    var nodeEnd = 0;
    while (node) {
      if (node.nodeType === 3) {
        nodeEnd = nodeStart + node.textContent.length;
        if (nodeStart <= offset && nodeEnd >= offset) {
          return {
            node: node,
            offset: offset - nodeStart
          };
        }
        nodeStart = nodeEnd;
      }
      node = getLeafNode(getSiblingNode(node));
    }
  }
  module.exports = getNodeForCharacterOffset;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/getActiveElement", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  function getActiveElement() {
    try {
      return document.activeElement || document.body;
    } catch (e) {
      return document.body;
    }
  }
  module.exports = getActiveElement;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactPutListenerQueue", ["npm:react@0.13.2/lib/PooledClass", "npm:react@0.13.2/lib/ReactBrowserEventEmitter", "npm:react@0.13.2/lib/Object.assign"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var PooledClass = require("npm:react@0.13.2/lib/PooledClass");
  var ReactBrowserEventEmitter = require("npm:react@0.13.2/lib/ReactBrowserEventEmitter");
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  function ReactPutListenerQueue() {
    this.listenersToPut = [];
  }
  assign(ReactPutListenerQueue.prototype, {
    enqueuePutListener: function(rootNodeID, propKey, propValue) {
      this.listenersToPut.push({
        rootNodeID: rootNodeID,
        propKey: propKey,
        propValue: propValue
      });
    },
    putListeners: function() {
      for (var i = 0; i < this.listenersToPut.length; i++) {
        var listenerToPut = this.listenersToPut[i];
        ReactBrowserEventEmitter.putListener(listenerToPut.rootNodeID, listenerToPut.propKey, listenerToPut.propValue);
      }
    },
    reset: function() {
      this.listenersToPut.length = 0;
    },
    destructor: function() {
      this.reset();
    }
  });
  PooledClass.addPoolingTo(ReactPutListenerQueue);
  module.exports = ReactPutListenerQueue;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/shallowEqual", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  function shallowEqual(objA, objB) {
    if (objA === objB) {
      return true;
    }
    var key;
    for (key in objA) {
      if (objA.hasOwnProperty(key) && (!objB.hasOwnProperty(key) || objA[key] !== objB[key])) {
        return false;
      }
    }
    for (key in objB) {
      if (objB.hasOwnProperty(key) && !objA.hasOwnProperty(key)) {
        return false;
      }
    }
    return true;
  }
  module.exports = shallowEqual;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ServerReactRootIndex", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var GLOBAL_MOUNT_POINT_MAX = Math.pow(2, 53);
  var ServerReactRootIndex = {createReactRootIndex: function() {
      return Math.ceil(Math.random() * GLOBAL_MOUNT_POINT_MAX);
    }};
  module.exports = ServerReactRootIndex;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SyntheticClipboardEvent", ["npm:react@0.13.2/lib/SyntheticEvent"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var SyntheticEvent = require("npm:react@0.13.2/lib/SyntheticEvent");
  var ClipboardEventInterface = {clipboardData: function(event) {
      return ('clipboardData' in event ? event.clipboardData : window.clipboardData);
    }};
  function SyntheticClipboardEvent(dispatchConfig, dispatchMarker, nativeEvent) {
    SyntheticEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent);
  }
  SyntheticEvent.augmentClass(SyntheticClipboardEvent, ClipboardEventInterface);
  module.exports = SyntheticClipboardEvent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SyntheticFocusEvent", ["npm:react@0.13.2/lib/SyntheticUIEvent"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var SyntheticUIEvent = require("npm:react@0.13.2/lib/SyntheticUIEvent");
  var FocusEventInterface = {relatedTarget: null};
  function SyntheticFocusEvent(dispatchConfig, dispatchMarker, nativeEvent) {
    SyntheticUIEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent);
  }
  SyntheticUIEvent.augmentClass(SyntheticFocusEvent, FocusEventInterface);
  module.exports = SyntheticFocusEvent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/getEventCharCode", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  function getEventCharCode(nativeEvent) {
    var charCode;
    var keyCode = nativeEvent.keyCode;
    if ('charCode' in nativeEvent) {
      charCode = nativeEvent.charCode;
      if (charCode === 0 && keyCode === 13) {
        charCode = 13;
      }
    } else {
      charCode = keyCode;
    }
    if (charCode >= 32 || charCode === 13) {
      return charCode;
    }
    return 0;
  }
  module.exports = getEventCharCode;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/getEventKey", ["npm:react@0.13.2/lib/getEventCharCode"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var getEventCharCode = require("npm:react@0.13.2/lib/getEventCharCode");
  var normalizeKey = {
    'Esc': 'Escape',
    'Spacebar': ' ',
    'Left': 'ArrowLeft',
    'Up': 'ArrowUp',
    'Right': 'ArrowRight',
    'Down': 'ArrowDown',
    'Del': 'Delete',
    'Win': 'OS',
    'Menu': 'ContextMenu',
    'Apps': 'ContextMenu',
    'Scroll': 'ScrollLock',
    'MozPrintableKey': 'Unidentified'
  };
  var translateToKey = {
    8: 'Backspace',
    9: 'Tab',
    12: 'Clear',
    13: 'Enter',
    16: 'Shift',
    17: 'Control',
    18: 'Alt',
    19: 'Pause',
    20: 'CapsLock',
    27: 'Escape',
    32: ' ',
    33: 'PageUp',
    34: 'PageDown',
    35: 'End',
    36: 'Home',
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown',
    45: 'Insert',
    46: 'Delete',
    112: 'F1',
    113: 'F2',
    114: 'F3',
    115: 'F4',
    116: 'F5',
    117: 'F6',
    118: 'F7',
    119: 'F8',
    120: 'F9',
    121: 'F10',
    122: 'F11',
    123: 'F12',
    144: 'NumLock',
    145: 'ScrollLock',
    224: 'Meta'
  };
  function getEventKey(nativeEvent) {
    if (nativeEvent.key) {
      var key = normalizeKey[nativeEvent.key] || nativeEvent.key;
      if (key !== 'Unidentified') {
        return key;
      }
    }
    if (nativeEvent.type === 'keypress') {
      var charCode = getEventCharCode(nativeEvent);
      return charCode === 13 ? 'Enter' : String.fromCharCode(charCode);
    }
    if (nativeEvent.type === 'keydown' || nativeEvent.type === 'keyup') {
      return translateToKey[nativeEvent.keyCode] || 'Unidentified';
    }
    return '';
  }
  module.exports = getEventKey;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SyntheticDragEvent", ["npm:react@0.13.2/lib/SyntheticMouseEvent"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var SyntheticMouseEvent = require("npm:react@0.13.2/lib/SyntheticMouseEvent");
  var DragEventInterface = {dataTransfer: null};
  function SyntheticDragEvent(dispatchConfig, dispatchMarker, nativeEvent) {
    SyntheticMouseEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent);
  }
  SyntheticMouseEvent.augmentClass(SyntheticDragEvent, DragEventInterface);
  module.exports = SyntheticDragEvent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SyntheticTouchEvent", ["npm:react@0.13.2/lib/SyntheticUIEvent", "npm:react@0.13.2/lib/getEventModifierState"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var SyntheticUIEvent = require("npm:react@0.13.2/lib/SyntheticUIEvent");
  var getEventModifierState = require("npm:react@0.13.2/lib/getEventModifierState");
  var TouchEventInterface = {
    touches: null,
    targetTouches: null,
    changedTouches: null,
    altKey: null,
    metaKey: null,
    ctrlKey: null,
    shiftKey: null,
    getModifierState: getEventModifierState
  };
  function SyntheticTouchEvent(dispatchConfig, dispatchMarker, nativeEvent) {
    SyntheticUIEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent);
  }
  SyntheticUIEvent.augmentClass(SyntheticTouchEvent, TouchEventInterface);
  module.exports = SyntheticTouchEvent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SyntheticWheelEvent", ["npm:react@0.13.2/lib/SyntheticMouseEvent"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var SyntheticMouseEvent = require("npm:react@0.13.2/lib/SyntheticMouseEvent");
  var WheelEventInterface = {
    deltaX: function(event) {
      return ('deltaX' in event ? event.deltaX : 'wheelDeltaX' in event ? -event.wheelDeltaX : 0);
    },
    deltaY: function(event) {
      return ('deltaY' in event ? event.deltaY : 'wheelDeltaY' in event ? -event.wheelDeltaY : 'wheelDelta' in event ? -event.wheelDelta : 0);
    },
    deltaZ: null,
    deltaMode: null
  };
  function SyntheticWheelEvent(dispatchConfig, dispatchMarker, nativeEvent) {
    SyntheticMouseEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent);
  }
  SyntheticMouseEvent.augmentClass(SyntheticWheelEvent, WheelEventInterface);
  module.exports = SyntheticWheelEvent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SVGDOMPropertyConfig", ["npm:react@0.13.2/lib/DOMProperty"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var DOMProperty = require("npm:react@0.13.2/lib/DOMProperty");
  var MUST_USE_ATTRIBUTE = DOMProperty.injection.MUST_USE_ATTRIBUTE;
  var SVGDOMPropertyConfig = {
    Properties: {
      cx: MUST_USE_ATTRIBUTE,
      cy: MUST_USE_ATTRIBUTE,
      d: MUST_USE_ATTRIBUTE,
      dx: MUST_USE_ATTRIBUTE,
      dy: MUST_USE_ATTRIBUTE,
      fill: MUST_USE_ATTRIBUTE,
      fillOpacity: MUST_USE_ATTRIBUTE,
      fontFamily: MUST_USE_ATTRIBUTE,
      fontSize: MUST_USE_ATTRIBUTE,
      fx: MUST_USE_ATTRIBUTE,
      fy: MUST_USE_ATTRIBUTE,
      gradientTransform: MUST_USE_ATTRIBUTE,
      gradientUnits: MUST_USE_ATTRIBUTE,
      markerEnd: MUST_USE_ATTRIBUTE,
      markerMid: MUST_USE_ATTRIBUTE,
      markerStart: MUST_USE_ATTRIBUTE,
      offset: MUST_USE_ATTRIBUTE,
      opacity: MUST_USE_ATTRIBUTE,
      patternContentUnits: MUST_USE_ATTRIBUTE,
      patternUnits: MUST_USE_ATTRIBUTE,
      points: MUST_USE_ATTRIBUTE,
      preserveAspectRatio: MUST_USE_ATTRIBUTE,
      r: MUST_USE_ATTRIBUTE,
      rx: MUST_USE_ATTRIBUTE,
      ry: MUST_USE_ATTRIBUTE,
      spreadMethod: MUST_USE_ATTRIBUTE,
      stopColor: MUST_USE_ATTRIBUTE,
      stopOpacity: MUST_USE_ATTRIBUTE,
      stroke: MUST_USE_ATTRIBUTE,
      strokeDasharray: MUST_USE_ATTRIBUTE,
      strokeLinecap: MUST_USE_ATTRIBUTE,
      strokeOpacity: MUST_USE_ATTRIBUTE,
      strokeWidth: MUST_USE_ATTRIBUTE,
      textAnchor: MUST_USE_ATTRIBUTE,
      transform: MUST_USE_ATTRIBUTE,
      version: MUST_USE_ATTRIBUTE,
      viewBox: MUST_USE_ATTRIBUTE,
      x1: MUST_USE_ATTRIBUTE,
      x2: MUST_USE_ATTRIBUTE,
      x: MUST_USE_ATTRIBUTE,
      y1: MUST_USE_ATTRIBUTE,
      y2: MUST_USE_ATTRIBUTE,
      y: MUST_USE_ATTRIBUTE
    },
    DOMAttributeNames: {
      fillOpacity: 'fill-opacity',
      fontFamily: 'font-family',
      fontSize: 'font-size',
      gradientTransform: 'gradientTransform',
      gradientUnits: 'gradientUnits',
      markerEnd: 'marker-end',
      markerMid: 'marker-mid',
      markerStart: 'marker-start',
      patternContentUnits: 'patternContentUnits',
      patternUnits: 'patternUnits',
      preserveAspectRatio: 'preserveAspectRatio',
      spreadMethod: 'spreadMethod',
      stopColor: 'stop-color',
      stopOpacity: 'stop-opacity',
      strokeDasharray: 'stroke-dasharray',
      strokeLinecap: 'stroke-linecap',
      strokeOpacity: 'stroke-opacity',
      strokeWidth: 'stroke-width',
      textAnchor: 'text-anchor',
      viewBox: 'viewBox'
    }
  };
  module.exports = SVGDOMPropertyConfig;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/createFullPageComponent", ["npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    function createFullPageComponent(tag) {
      var elementFactory = ReactElement.createFactory(tag);
      var FullPageComponent = ReactClass.createClass({
        tagName: tag.toUpperCase(),
        displayName: 'ReactFullPageComponent' + tag,
        componentWillUnmount: function() {
          ("production" !== process.env.NODE_ENV ? invariant(false, '%s tried to unmount. Because of cross-browser quirks it is ' + 'impossible to unmount some top-level components (eg <html>, <head>, ' + 'and <body>) reliably and efficiently. To fix this, have a single ' + 'top-level component that never unmounts render these elements.', this.constructor.displayName) : invariant(false));
        },
        render: function() {
          return elementFactory(this.props);
        }
      });
      return FullPageComponent;
    }
    module.exports = createFullPageComponent;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDefaultPerfAnalysis", ["npm:react@0.13.2/lib/Object.assign"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var DONT_CARE_THRESHOLD = 1.2;
  var DOM_OPERATION_TYPES = {
    '_mountImageIntoNode': 'set innerHTML',
    INSERT_MARKUP: 'set innerHTML',
    MOVE_EXISTING: 'move',
    REMOVE_NODE: 'remove',
    TEXT_CONTENT: 'set textContent',
    'updatePropertyByID': 'update attribute',
    'deletePropertyByID': 'delete attribute',
    'updateStylesByID': 'update styles',
    'updateInnerHTMLByID': 'set innerHTML',
    'dangerouslyReplaceNodeWithMarkupByID': 'replace'
  };
  function getTotalTime(measurements) {
    var totalTime = 0;
    for (var i = 0; i < measurements.length; i++) {
      var measurement = measurements[i];
      totalTime += measurement.totalTime;
    }
    return totalTime;
  }
  function getDOMSummary(measurements) {
    var items = [];
    for (var i = 0; i < measurements.length; i++) {
      var measurement = measurements[i];
      var id;
      for (id in measurement.writes) {
        measurement.writes[id].forEach(function(write) {
          items.push({
            id: id,
            type: DOM_OPERATION_TYPES[write.type] || write.type,
            args: write.args
          });
        });
      }
    }
    return items;
  }
  function getExclusiveSummary(measurements) {
    var candidates = {};
    var displayName;
    for (var i = 0; i < measurements.length; i++) {
      var measurement = measurements[i];
      var allIDs = assign({}, measurement.exclusive, measurement.inclusive);
      for (var id in allIDs) {
        displayName = measurement.displayNames[id].current;
        candidates[displayName] = candidates[displayName] || {
          componentName: displayName,
          inclusive: 0,
          exclusive: 0,
          render: 0,
          count: 0
        };
        if (measurement.render[id]) {
          candidates[displayName].render += measurement.render[id];
        }
        if (measurement.exclusive[id]) {
          candidates[displayName].exclusive += measurement.exclusive[id];
        }
        if (measurement.inclusive[id]) {
          candidates[displayName].inclusive += measurement.inclusive[id];
        }
        if (measurement.counts[id]) {
          candidates[displayName].count += measurement.counts[id];
        }
      }
    }
    var arr = [];
    for (displayName in candidates) {
      if (candidates[displayName].exclusive >= DONT_CARE_THRESHOLD) {
        arr.push(candidates[displayName]);
      }
    }
    arr.sort(function(a, b) {
      return b.exclusive - a.exclusive;
    });
    return arr;
  }
  function getInclusiveSummary(measurements, onlyClean) {
    var candidates = {};
    var inclusiveKey;
    for (var i = 0; i < measurements.length; i++) {
      var measurement = measurements[i];
      var allIDs = assign({}, measurement.exclusive, measurement.inclusive);
      var cleanComponents;
      if (onlyClean) {
        cleanComponents = getUnchangedComponents(measurement);
      }
      for (var id in allIDs) {
        if (onlyClean && !cleanComponents[id]) {
          continue;
        }
        var displayName = measurement.displayNames[id];
        inclusiveKey = displayName.owner + ' > ' + displayName.current;
        candidates[inclusiveKey] = candidates[inclusiveKey] || {
          componentName: inclusiveKey,
          time: 0,
          count: 0
        };
        if (measurement.inclusive[id]) {
          candidates[inclusiveKey].time += measurement.inclusive[id];
        }
        if (measurement.counts[id]) {
          candidates[inclusiveKey].count += measurement.counts[id];
        }
      }
    }
    var arr = [];
    for (inclusiveKey in candidates) {
      if (candidates[inclusiveKey].time >= DONT_CARE_THRESHOLD) {
        arr.push(candidates[inclusiveKey]);
      }
    }
    arr.sort(function(a, b) {
      return b.time - a.time;
    });
    return arr;
  }
  function getUnchangedComponents(measurement) {
    var cleanComponents = {};
    var dirtyLeafIDs = Object.keys(measurement.writes);
    var allIDs = assign({}, measurement.exclusive, measurement.inclusive);
    for (var id in allIDs) {
      var isDirty = false;
      for (var i = 0; i < dirtyLeafIDs.length; i++) {
        if (dirtyLeafIDs[i].indexOf(id) === 0) {
          isDirty = true;
          break;
        }
      }
      if (!isDirty && measurement.counts[id] > 0) {
        cleanComponents[id] = true;
      }
    }
    return cleanComponents;
  }
  var ReactDefaultPerfAnalysis = {
    getExclusiveSummary: getExclusiveSummary,
    getInclusiveSummary: getInclusiveSummary,
    getDOMSummary: getDOMSummary,
    getTotalTime: getTotalTime
  };
  module.exports = ReactDefaultPerfAnalysis;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/performance", ["npm:react@0.13.2/lib/ExecutionEnvironment"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
  var performance;
  if (ExecutionEnvironment.canUseDOM) {
    performance = window.performance || window.msPerformance || window.webkitPerformance;
  }
  module.exports = performance || {};
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactServerRenderingTransaction", ["npm:react@0.13.2/lib/PooledClass", "npm:react@0.13.2/lib/CallbackQueue", "npm:react@0.13.2/lib/ReactPutListenerQueue", "npm:react@0.13.2/lib/Transaction", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/emptyFunction"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var PooledClass = require("npm:react@0.13.2/lib/PooledClass");
  var CallbackQueue = require("npm:react@0.13.2/lib/CallbackQueue");
  var ReactPutListenerQueue = require("npm:react@0.13.2/lib/ReactPutListenerQueue");
  var Transaction = require("npm:react@0.13.2/lib/Transaction");
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var emptyFunction = require("npm:react@0.13.2/lib/emptyFunction");
  var ON_DOM_READY_QUEUEING = {
    initialize: function() {
      this.reactMountReady.reset();
    },
    close: emptyFunction
  };
  var PUT_LISTENER_QUEUEING = {
    initialize: function() {
      this.putListenerQueue.reset();
    },
    close: emptyFunction
  };
  var TRANSACTION_WRAPPERS = [PUT_LISTENER_QUEUEING, ON_DOM_READY_QUEUEING];
  function ReactServerRenderingTransaction(renderToStaticMarkup) {
    this.reinitializeTransaction();
    this.renderToStaticMarkup = renderToStaticMarkup;
    this.reactMountReady = CallbackQueue.getPooled(null);
    this.putListenerQueue = ReactPutListenerQueue.getPooled();
  }
  var Mixin = {
    getTransactionWrappers: function() {
      return TRANSACTION_WRAPPERS;
    },
    getReactMountReady: function() {
      return this.reactMountReady;
    },
    getPutListenerQueue: function() {
      return this.putListenerQueue;
    },
    destructor: function() {
      CallbackQueue.release(this.reactMountReady);
      this.reactMountReady = null;
      ReactPutListenerQueue.release(this.putListenerQueue);
      this.putListenerQueue = null;
    }
  };
  assign(ReactServerRenderingTransaction.prototype, Transaction.Mixin, Mixin);
  PooledClass.addPoolingTo(ReactServerRenderingTransaction);
  module.exports = ReactServerRenderingTransaction;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/onlyChild", ["npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    function onlyChild(children) {
      ("production" !== process.env.NODE_ENV ? invariant(ReactElement.isValidElement(children), 'onlyChild must be passed a children with exactly one child.') : invariant(ReactElement.isValidElement(children)));
      return children;
    }
    module.exports = onlyChild;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:object-assign@2.0.0/index", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  function ToObject(val) {
    if (val == null) {
      throw new TypeError('Object.assign cannot be called with null or undefined');
    }
    return Object(val);
  }
  module.exports = Object.assign || function(target, source) {
    var from;
    var keys;
    var to = ToObject(target);
    for (var s = 1; s < arguments.length; s++) {
      from = arguments[s];
      keys = Object.keys(Object(from));
      for (var i = 0; i < keys.length; i++) {
        to[keys[i]] = from[keys[i]];
      }
    }
    return to;
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:qs@2.4.1/lib/utils", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var internals = {};
  exports.arrayToObject = function(source) {
    var obj = {};
    for (var i = 0,
        il = source.length; i < il; ++i) {
      if (typeof source[i] !== 'undefined') {
        obj[i] = source[i];
      }
    }
    return obj;
  };
  exports.merge = function(target, source) {
    if (!source) {
      return target;
    }
    if (typeof source !== 'object') {
      if (Array.isArray(target)) {
        target.push(source);
      } else {
        target[source] = true;
      }
      return target;
    }
    if (typeof target !== 'object') {
      target = [target].concat(source);
      return target;
    }
    if (Array.isArray(target) && !Array.isArray(source)) {
      target = exports.arrayToObject(target);
    }
    var keys = Object.keys(source);
    for (var k = 0,
        kl = keys.length; k < kl; ++k) {
      var key = keys[k];
      var value = source[key];
      if (!target[key]) {
        target[key] = value;
      } else {
        target[key] = exports.merge(target[key], value);
      }
    }
    return target;
  };
  exports.decode = function(str) {
    try {
      return decodeURIComponent(str.replace(/\+/g, ' '));
    } catch (e) {
      return str;
    }
  };
  exports.compact = function(obj, refs) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    refs = refs || [];
    var lookup = refs.indexOf(obj);
    if (lookup !== -1) {
      return refs[lookup];
    }
    refs.push(obj);
    if (Array.isArray(obj)) {
      var compacted = [];
      for (var i = 0,
          il = obj.length; i < il; ++i) {
        if (typeof obj[i] !== 'undefined') {
          compacted.push(obj[i]);
        }
      }
      return compacted;
    }
    var keys = Object.keys(obj);
    for (i = 0, il = keys.length; i < il; ++i) {
      var key = keys[i];
      obj[key] = exports.compact(obj[key], refs);
    }
    return obj;
  };
  exports.isRegExp = function(obj) {
    return Object.prototype.toString.call(obj) === '[object RegExp]';
  };
  exports.isBuffer = function(obj) {
    if (obj === null || typeof obj === 'undefined') {
      return false;
    }
    return !!(obj.constructor && obj.constructor.isBuffer && obj.constructor.isBuffer(obj));
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:qs@2.4.1/lib/parse", ["npm:qs@2.4.1/lib/utils"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var Utils = require("npm:qs@2.4.1/lib/utils");
  var internals = {
    delimiter: '&',
    depth: 5,
    arrayLimit: 20,
    parameterLimit: 1000
  };
  internals.parseValues = function(str, options) {
    var obj = {};
    var parts = str.split(options.delimiter, options.parameterLimit === Infinity ? undefined : options.parameterLimit);
    for (var i = 0,
        il = parts.length; i < il; ++i) {
      var part = parts[i];
      var pos = part.indexOf(']=') === -1 ? part.indexOf('=') : part.indexOf(']=') + 1;
      if (pos === -1) {
        obj[Utils.decode(part)] = '';
      } else {
        var key = Utils.decode(part.slice(0, pos));
        var val = Utils.decode(part.slice(pos + 1));
        if (Object.prototype.hasOwnProperty(key)) {
          continue;
        }
        if (!obj.hasOwnProperty(key)) {
          obj[key] = val;
        } else {
          obj[key] = [].concat(obj[key]).concat(val);
        }
      }
    }
    return obj;
  };
  internals.parseObject = function(chain, val, options) {
    if (!chain.length) {
      return val;
    }
    var root = chain.shift();
    var obj = {};
    if (root === '[]') {
      obj = [];
      obj = obj.concat(internals.parseObject(chain, val, options));
    } else {
      var cleanRoot = root[0] === '[' && root[root.length - 1] === ']' ? root.slice(1, root.length - 1) : root;
      var index = parseInt(cleanRoot, 10);
      var indexString = '' + index;
      if (!isNaN(index) && root !== cleanRoot && indexString === cleanRoot && index >= 0 && index <= options.arrayLimit) {
        obj = [];
        obj[index] = internals.parseObject(chain, val, options);
      } else {
        obj[cleanRoot] = internals.parseObject(chain, val, options);
      }
    }
    return obj;
  };
  internals.parseKeys = function(key, val, options) {
    if (!key) {
      return ;
    }
    var parent = /^([^\[\]]*)/;
    var child = /(\[[^\[\]]*\])/g;
    var segment = parent.exec(key);
    if (Object.prototype.hasOwnProperty(segment[1])) {
      return ;
    }
    var keys = [];
    if (segment[1]) {
      keys.push(segment[1]);
    }
    var i = 0;
    while ((segment = child.exec(key)) !== null && i < options.depth) {
      ++i;
      if (!Object.prototype.hasOwnProperty(segment[1].replace(/\[|\]/g, ''))) {
        keys.push(segment[1]);
      }
    }
    if (segment) {
      keys.push('[' + key.slice(segment.index) + ']');
    }
    return internals.parseObject(keys, val, options);
  };
  module.exports = function(str, options) {
    if (str === '' || str === null || typeof str === 'undefined') {
      return {};
    }
    options = options || {};
    options.delimiter = typeof options.delimiter === 'string' || Utils.isRegExp(options.delimiter) ? options.delimiter : internals.delimiter;
    options.depth = typeof options.depth === 'number' ? options.depth : internals.depth;
    options.arrayLimit = typeof options.arrayLimit === 'number' ? options.arrayLimit : internals.arrayLimit;
    options.parameterLimit = typeof options.parameterLimit === 'number' ? options.parameterLimit : internals.parameterLimit;
    var tempObj = typeof str === 'string' ? internals.parseValues(str, options) : str;
    var obj = {};
    var keys = Object.keys(tempObj);
    for (var i = 0,
        il = keys.length; i < il; ++i) {
      var key = keys[i];
      var newObj = internals.parseKeys(key, tempObj[key], options);
      obj = Utils.merge(obj, newObj);
    }
    return Utils.compact(obj);
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/components/ContextWrapper", ["npm:react@0.13.2"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _createClass = (function() {
    function defineProperties(target, props) {
      for (var key in props) {
        var prop = props[key];
        prop.configurable = true;
        if (prop.value)
          prop.writable = true;
      }
      Object.defineProperties(target, props);
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  var _inherits = function(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }});
    if (superClass)
      subClass.__proto__ = superClass;
  };
  var _classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var React = require("npm:react@0.13.2");
  var ContextWrapper = (function(_React$Component) {
    function ContextWrapper() {
      _classCallCheck(this, ContextWrapper);
      if (_React$Component != null) {
        _React$Component.apply(this, arguments);
      }
    }
    _inherits(ContextWrapper, _React$Component);
    _createClass(ContextWrapper, {render: {value: function render() {
          return this.props.children;
        }}});
    return ContextWrapper;
  })(React.Component);
  module.exports = ContextWrapper;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/components/Route", ["npm:react@0.13.2", "npm:react@0.13.2/lib/invariant", "npm:react-router@0.13.2/lib/PropTypes", "npm:react-router@0.13.2/lib/components/RouteHandler"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _createClass = (function() {
    function defineProperties(target, props) {
      for (var key in props) {
        var prop = props[key];
        prop.configurable = true;
        if (prop.value)
          prop.writable = true;
      }
      Object.defineProperties(target, props);
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  var _inherits = function(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }});
    if (superClass)
      subClass.__proto__ = superClass;
  };
  var _classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var React = require("npm:react@0.13.2");
  var invariant = require("npm:react@0.13.2/lib/invariant");
  var PropTypes = require("npm:react-router@0.13.2/lib/PropTypes");
  var RouteHandler = require("npm:react-router@0.13.2/lib/components/RouteHandler");
  var Route = (function(_React$Component) {
    function Route() {
      _classCallCheck(this, Route);
      if (_React$Component != null) {
        _React$Component.apply(this, arguments);
      }
    }
    _inherits(Route, _React$Component);
    _createClass(Route, {render: {value: function render() {
          invariant(false, "%s elements are for router configuration only and should not be rendered", this.constructor.name);
        }}});
    return Route;
  })(React.Component);
  Route.propTypes = {
    name: PropTypes.string,
    path: PropTypes.string,
    handler: PropTypes.func,
    ignoreScrollBehavior: PropTypes.bool
  };
  Route.defaultProps = {handler: RouteHandler};
  module.exports = Route;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/components/Link", ["npm:react@0.13.2", "npm:react@0.13.2/lib/Object.assign", "npm:react-router@0.13.2/lib/PropTypes"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _createClass = (function() {
    function defineProperties(target, props) {
      for (var key in props) {
        var prop = props[key];
        prop.configurable = true;
        if (prop.value)
          prop.writable = true;
      }
      Object.defineProperties(target, props);
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  var _inherits = function(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }});
    if (superClass)
      subClass.__proto__ = superClass;
  };
  var _classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var React = require("npm:react@0.13.2");
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var PropTypes = require("npm:react-router@0.13.2/lib/PropTypes");
  function isLeftClickEvent(event) {
    return event.button === 0;
  }
  function isModifiedEvent(event) {
    return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
  }
  var Link = (function(_React$Component) {
    function Link() {
      _classCallCheck(this, Link);
      if (_React$Component != null) {
        _React$Component.apply(this, arguments);
      }
    }
    _inherits(Link, _React$Component);
    _createClass(Link, {
      handleClick: {value: function handleClick(event) {
          var allowTransition = true;
          var clickResult;
          if (this.props.onClick)
            clickResult = this.props.onClick(event);
          if (isModifiedEvent(event) || !isLeftClickEvent(event)) {
            return ;
          }
          if (clickResult === false || event.defaultPrevented === true)
            allowTransition = false;
          event.preventDefault();
          if (allowTransition)
            this.context.router.transitionTo(this.props.to, this.props.params, this.props.query);
        }},
      getHref: {value: function getHref() {
          return this.context.router.makeHref(this.props.to, this.props.params, this.props.query);
        }},
      getClassName: {value: function getClassName() {
          var className = this.props.className;
          if (this.getActiveState())
            className += " " + this.props.activeClassName;
          return className;
        }},
      getActiveState: {value: function getActiveState() {
          return this.context.router.isActive(this.props.to, this.props.params, this.props.query);
        }},
      render: {value: function render() {
          var props = assign({}, this.props, {
            href: this.getHref(),
            className: this.getClassName(),
            onClick: this.handleClick.bind(this)
          });
          if (props.activeStyle && this.getActiveState())
            props.style = props.activeStyle;
          return React.DOM.a(props, this.props.children);
        }}
    });
    return Link;
  })(React.Component);
  Link.contextTypes = {router: PropTypes.router.isRequired};
  Link.propTypes = {
    activeClassName: PropTypes.string.isRequired,
    to: PropTypes.oneOfType([PropTypes.string, PropTypes.route]).isRequired,
    params: PropTypes.object,
    query: PropTypes.object,
    activeStyle: PropTypes.object,
    onClick: PropTypes.func
  };
  Link.defaultProps = {
    activeClassName: "active",
    className: ""
  };
  module.exports = Link;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/components/NotFoundRoute", ["npm:react-router@0.13.2/lib/PropTypes", "npm:react-router@0.13.2/lib/components/RouteHandler", "npm:react-router@0.13.2/lib/components/Route"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _inherits = function(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }});
    if (superClass)
      subClass.__proto__ = superClass;
  };
  var _classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var PropTypes = require("npm:react-router@0.13.2/lib/PropTypes");
  var RouteHandler = require("npm:react-router@0.13.2/lib/components/RouteHandler");
  var Route = require("npm:react-router@0.13.2/lib/components/Route");
  var NotFoundRoute = (function(_Route) {
    function NotFoundRoute() {
      _classCallCheck(this, NotFoundRoute);
      if (_Route != null) {
        _Route.apply(this, arguments);
      }
    }
    _inherits(NotFoundRoute, _Route);
    return NotFoundRoute;
  })(Route);
  NotFoundRoute.propTypes = {
    name: PropTypes.string,
    path: PropTypes.falsy,
    children: PropTypes.falsy,
    handler: PropTypes.func.isRequired
  };
  NotFoundRoute.defaultProps = {handler: RouteHandler};
  module.exports = NotFoundRoute;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/components/Redirect", ["npm:react-router@0.13.2/lib/PropTypes", "npm:react-router@0.13.2/lib/components/Route"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _inherits = function(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }});
    if (superClass)
      subClass.__proto__ = superClass;
  };
  var _classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var PropTypes = require("npm:react-router@0.13.2/lib/PropTypes");
  var Route = require("npm:react-router@0.13.2/lib/components/Route");
  var Redirect = (function(_Route) {
    function Redirect() {
      _classCallCheck(this, Redirect);
      if (_Route != null) {
        _Route.apply(this, arguments);
      }
    }
    _inherits(Redirect, _Route);
    return Redirect;
  })(Route);
  Redirect.propTypes = {
    path: PropTypes.string,
    from: PropTypes.string,
    to: PropTypes.string,
    handler: PropTypes.falsy
  };
  Redirect.defaultProps = {};
  module.exports = Redirect;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/actions/LocationActions", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var LocationActions = {
    PUSH: "push",
    REPLACE: "replace",
    POP: "pop"
  };
  module.exports = LocationActions;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/History", ["npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/ExecutionEnvironment"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var invariant = require("npm:react@0.13.2/lib/invariant");
  var canUseDOM = require("npm:react@0.13.2/lib/ExecutionEnvironment").canUseDOM;
  var History = {
    length: 1,
    back: function back() {
      invariant(canUseDOM, "Cannot use History.back without a DOM");
      History.length -= 1;
      window.history.back();
    }
  };
  module.exports = History;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/locations/HistoryLocation", ["npm:react-router@0.13.2/lib/actions/LocationActions", "npm:react-router@0.13.2/lib/History"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var LocationActions = require("npm:react-router@0.13.2/lib/actions/LocationActions");
  var History = require("npm:react-router@0.13.2/lib/History");
  var _listeners = [];
  var _isListening = false;
  function notifyChange(type) {
    var change = {
      path: HistoryLocation.getCurrentPath(),
      type: type
    };
    _listeners.forEach(function(listener) {
      listener.call(HistoryLocation, change);
    });
  }
  function onPopState(event) {
    if (event.state === undefined) {
      return ;
    }
    notifyChange(LocationActions.POP);
  }
  var HistoryLocation = {
    addChangeListener: function addChangeListener(listener) {
      _listeners.push(listener);
      if (!_isListening) {
        if (window.addEventListener) {
          window.addEventListener("popstate", onPopState, false);
        } else {
          window.attachEvent("onpopstate", onPopState);
        }
        _isListening = true;
      }
    },
    removeChangeListener: function removeChangeListener(listener) {
      _listeners = _listeners.filter(function(l) {
        return l !== listener;
      });
      if (_listeners.length === 0) {
        if (window.addEventListener) {
          window.removeEventListener("popstate", onPopState, false);
        } else {
          window.removeEvent("onpopstate", onPopState);
        }
        _isListening = false;
      }
    },
    push: function push(path) {
      window.history.pushState({path: path}, "", path);
      History.length += 1;
      notifyChange(LocationActions.PUSH);
    },
    replace: function replace(path) {
      window.history.replaceState({path: path}, "", path);
      notifyChange(LocationActions.REPLACE);
    },
    pop: History.back,
    getCurrentPath: function getCurrentPath() {
      return decodeURI(window.location.pathname + window.location.search);
    },
    toString: function toString() {
      return "<HistoryLocation>";
    }
  };
  module.exports = HistoryLocation;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/locations/RefreshLocation", ["npm:react-router@0.13.2/lib/locations/HistoryLocation", "npm:react-router@0.13.2/lib/History"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var HistoryLocation = require("npm:react-router@0.13.2/lib/locations/HistoryLocation");
  var History = require("npm:react-router@0.13.2/lib/History");
  var RefreshLocation = {
    push: function push(path) {
      window.location = path;
    },
    replace: function replace(path) {
      window.location.replace(path);
    },
    pop: History.back,
    getCurrentPath: HistoryLocation.getCurrentPath,
    toString: function toString() {
      return "<RefreshLocation>";
    }
  };
  module.exports = RefreshLocation;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/locations/StaticLocation", ["npm:react@0.13.2/lib/invariant"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _createClass = (function() {
    function defineProperties(target, props) {
      for (var key in props) {
        var prop = props[key];
        prop.configurable = true;
        if (prop.value)
          prop.writable = true;
      }
      Object.defineProperties(target, props);
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  var _classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var invariant = require("npm:react@0.13.2/lib/invariant");
  function throwCannotModify() {
    invariant(false, "You cannot modify a static location");
  }
  var StaticLocation = (function() {
    function StaticLocation(path) {
      _classCallCheck(this, StaticLocation);
      this.path = path;
    }
    _createClass(StaticLocation, {
      getCurrentPath: {value: function getCurrentPath() {
          return this.path;
        }},
      toString: {value: function toString() {
          return "<StaticLocation path=\"" + this.path + "\">";
        }}
    });
    return StaticLocation;
  })();
  StaticLocation.prototype.push = throwCannotModify;
  StaticLocation.prototype.replace = throwCannotModify;
  StaticLocation.prototype.pop = throwCannotModify;
  module.exports = StaticLocation;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/locations/TestLocation", ["npm:react@0.13.2/lib/invariant", "npm:react-router@0.13.2/lib/actions/LocationActions", "npm:react-router@0.13.2/lib/History"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _createClass = (function() {
    function defineProperties(target, props) {
      for (var key in props) {
        var prop = props[key];
        prop.configurable = true;
        if (prop.value)
          prop.writable = true;
      }
      Object.defineProperties(target, props);
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  var _classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var invariant = require("npm:react@0.13.2/lib/invariant");
  var LocationActions = require("npm:react-router@0.13.2/lib/actions/LocationActions");
  var History = require("npm:react-router@0.13.2/lib/History");
  var TestLocation = (function() {
    function TestLocation(history) {
      _classCallCheck(this, TestLocation);
      this.history = history || [];
      this.listeners = [];
      this._updateHistoryLength();
    }
    _createClass(TestLocation, {
      needsDOM: {get: function() {
          return false;
        }},
      _updateHistoryLength: {value: function _updateHistoryLength() {
          History.length = this.history.length;
        }},
      _notifyChange: {value: function _notifyChange(type) {
          var change = {
            path: this.getCurrentPath(),
            type: type
          };
          for (var i = 0,
              len = this.listeners.length; i < len; ++i)
            this.listeners[i].call(this, change);
        }},
      addChangeListener: {value: function addChangeListener(listener) {
          this.listeners.push(listener);
        }},
      removeChangeListener: {value: function removeChangeListener(listener) {
          this.listeners = this.listeners.filter(function(l) {
            return l !== listener;
          });
        }},
      push: {value: function push(path) {
          this.history.push(path);
          this._updateHistoryLength();
          this._notifyChange(LocationActions.PUSH);
        }},
      replace: {value: function replace(path) {
          invariant(this.history.length, "You cannot replace the current path with no history");
          this.history[this.history.length - 1] = path;
          this._notifyChange(LocationActions.REPLACE);
        }},
      pop: {value: function pop() {
          this.history.pop();
          this._updateHistoryLength();
          this._notifyChange(LocationActions.POP);
        }},
      getCurrentPath: {value: function getCurrentPath() {
          return this.history[this.history.length - 1];
        }},
      toString: {value: function toString() {
          return "<TestLocation>";
        }}
    });
    return TestLocation;
  })();
  module.exports = TestLocation;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/behaviors/ImitateBrowserBehavior", ["npm:react-router@0.13.2/lib/actions/LocationActions"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var LocationActions = require("npm:react-router@0.13.2/lib/actions/LocationActions");
  var ImitateBrowserBehavior = {updateScrollPosition: function updateScrollPosition(position, actionType) {
      switch (actionType) {
        case LocationActions.PUSH:
        case LocationActions.REPLACE:
          window.scrollTo(0, 0);
          break;
        case LocationActions.POP:
          if (position) {
            window.scrollTo(position.x, position.y);
          } else {
            window.scrollTo(0, 0);
          }
          break;
      }
    }};
  module.exports = ImitateBrowserBehavior;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/behaviors/ScrollToTopBehavior", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var ScrollToTopBehavior = {updateScrollPosition: function updateScrollPosition() {
      window.scrollTo(0, 0);
    }};
  module.exports = ScrollToTopBehavior;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/Navigation", ["npm:react@0.13.2/lib/warning", "npm:react-router@0.13.2/lib/PropTypes"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var warning = require("npm:react@0.13.2/lib/warning");
  var PropTypes = require("npm:react-router@0.13.2/lib/PropTypes");
  function deprecatedMethod(routerMethodName, fn) {
    return function() {
      warning(false, "Router.Navigation is deprecated. Please use this.context.router." + routerMethodName + "() instead");
      return fn.apply(this, arguments);
    };
  }
  var Navigation = {
    contextTypes: {router: PropTypes.router.isRequired},
    makePath: deprecatedMethod("makePath", function(to, params, query) {
      return this.context.router.makePath(to, params, query);
    }),
    makeHref: deprecatedMethod("makeHref", function(to, params, query) {
      return this.context.router.makeHref(to, params, query);
    }),
    transitionTo: deprecatedMethod("transitionTo", function(to, params, query) {
      this.context.router.transitionTo(to, params, query);
    }),
    replaceWith: deprecatedMethod("replaceWith", function(to, params, query) {
      this.context.router.replaceWith(to, params, query);
    }),
    goBack: deprecatedMethod("goBack", function() {
      return this.context.router.goBack();
    })
  };
  module.exports = Navigation;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/State", ["npm:react@0.13.2/lib/warning", "npm:react-router@0.13.2/lib/PropTypes"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var warning = require("npm:react@0.13.2/lib/warning");
  var PropTypes = require("npm:react-router@0.13.2/lib/PropTypes");
  function deprecatedMethod(routerMethodName, fn) {
    return function() {
      warning(false, "Router.State is deprecated. Please use this.context.router." + routerMethodName + "() instead");
      return fn.apply(this, arguments);
    };
  }
  var State = {
    contextTypes: {router: PropTypes.router.isRequired},
    getPath: deprecatedMethod("getCurrentPath", function() {
      return this.context.router.getCurrentPath();
    }),
    getPathname: deprecatedMethod("getCurrentPathname", function() {
      return this.context.router.getCurrentPathname();
    }),
    getParams: deprecatedMethod("getCurrentParams", function() {
      return this.context.router.getCurrentParams();
    }),
    getQuery: deprecatedMethod("getCurrentQuery", function() {
      return this.context.router.getCurrentQuery();
    }),
    getRoutes: deprecatedMethod("getCurrentRoutes", function() {
      return this.context.router.getCurrentRoutes();
    }),
    isActive: deprecatedMethod("isActive", function(to, params, query) {
      return this.context.router.isActive(to, params, query);
    })
  };
  module.exports = State;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/createRoutesFromReactChildren", ["npm:react@0.13.2", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/warning", "npm:react-router@0.13.2/lib/components/DefaultRoute", "npm:react-router@0.13.2/lib/components/NotFoundRoute", "npm:react-router@0.13.2/lib/components/Redirect", "npm:react-router@0.13.2/lib/Route"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var React = require("npm:react@0.13.2");
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var warning = require("npm:react@0.13.2/lib/warning");
  var DefaultRoute = require("npm:react-router@0.13.2/lib/components/DefaultRoute");
  var NotFoundRoute = require("npm:react-router@0.13.2/lib/components/NotFoundRoute");
  var Redirect = require("npm:react-router@0.13.2/lib/components/Redirect");
  var Route = require("npm:react-router@0.13.2/lib/Route");
  function checkPropTypes(componentName, propTypes, props) {
    componentName = componentName || "UnknownComponent";
    for (var propName in propTypes) {
      if (propTypes.hasOwnProperty(propName)) {
        var error = propTypes[propName](props, propName, componentName);
        if (error instanceof Error)
          warning(false, error.message);
      }
    }
  }
  function createRouteOptions(props) {
    var options = assign({}, props);
    var handler = options.handler;
    if (handler) {
      options.onEnter = handler.willTransitionTo;
      options.onLeave = handler.willTransitionFrom;
    }
    return options;
  }
  function createRouteFromReactElement(element) {
    if (!React.isValidElement(element)) {
      return ;
    }
    var type = element.type;
    var props = assign({}, type.defaultProps, element.props);
    if (type.propTypes)
      checkPropTypes(type.displayName, type.propTypes, props);
    if (type === DefaultRoute) {
      return Route.createDefaultRoute(createRouteOptions(props));
    }
    if (type === NotFoundRoute) {
      return Route.createNotFoundRoute(createRouteOptions(props));
    }
    if (type === Redirect) {
      return Route.createRedirect(createRouteOptions(props));
    }
    return Route.createRoute(createRouteOptions(props), function() {
      if (props.children)
        createRoutesFromReactChildren(props.children);
    });
  }
  function createRoutesFromReactChildren(children) {
    var routes = [];
    React.Children.forEach(children, function(child) {
      if (child = createRouteFromReactElement(child))
        routes.push(child);
    });
    return routes;
  }
  module.exports = createRoutesFromReactChildren;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/getWindowScrollPosition", ["npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/ExecutionEnvironment"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var invariant = require("npm:react@0.13.2/lib/invariant");
  var canUseDOM = require("npm:react@0.13.2/lib/ExecutionEnvironment").canUseDOM;
  function getWindowScrollPosition() {
    invariant(canUseDOM, "Cannot get current scroll position without a DOM");
    return {
      x: window.pageXOffset || document.documentElement.scrollLeft,
      y: window.pageYOffset || document.documentElement.scrollTop
    };
  }
  module.exports = getWindowScrollPosition;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/isReactChildren", ["npm:react@0.13.2"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var React = require("npm:react@0.13.2");
  function isValidChild(object) {
    return object == null || React.isValidElement(object);
  }
  function isReactChildren(object) {
    return isValidChild(object) || Array.isArray(object) && object.every(isValidChild);
  }
  module.exports = isReactChildren;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/Cancellation", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  function Cancellation() {}
  module.exports = Cancellation;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/Redirect", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  function Redirect(to, params, query) {
    this.to = to;
    this.params = params;
    this.query = query;
  }
  module.exports = Redirect;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/Match", ["npm:react-router@0.13.2/lib/PathUtils"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _createClass = (function() {
    function defineProperties(target, props) {
      for (var key in props) {
        var prop = props[key];
        prop.configurable = true;
        if (prop.value)
          prop.writable = true;
      }
      Object.defineProperties(target, props);
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  var _classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var PathUtils = require("npm:react-router@0.13.2/lib/PathUtils");
  function deepSearch(route, pathname, query) {
    var childRoutes = route.childRoutes;
    if (childRoutes) {
      var match,
          childRoute;
      for (var i = 0,
          len = childRoutes.length; i < len; ++i) {
        childRoute = childRoutes[i];
        if (childRoute.isDefault || childRoute.isNotFound)
          continue;
        if (match = deepSearch(childRoute, pathname, query)) {
          match.routes.unshift(route);
          return match;
        }
      }
    }
    var defaultRoute = route.defaultRoute;
    if (defaultRoute && (params = PathUtils.extractParams(defaultRoute.path, pathname))) {
      return new Match(pathname, params, query, [route, defaultRoute]);
    }
    var notFoundRoute = route.notFoundRoute;
    if (notFoundRoute && (params = PathUtils.extractParams(notFoundRoute.path, pathname))) {
      return new Match(pathname, params, query, [route, notFoundRoute]);
    }
    var params = PathUtils.extractParams(route.path, pathname);
    if (params) {
      return new Match(pathname, params, query, [route]);
    }
    return null;
  }
  var Match = (function() {
    function Match(pathname, params, query, routes) {
      _classCallCheck(this, Match);
      this.pathname = pathname;
      this.params = params;
      this.query = query;
      this.routes = routes;
    }
    _createClass(Match, null, {findMatch: {value: function findMatch(routes, path) {
          var pathname = PathUtils.withoutQuery(path);
          var query = PathUtils.extractQuery(path);
          var match = null;
          for (var i = 0,
              len = routes.length; match == null && i < len; ++i)
            match = deepSearch(routes[i], pathname, query);
          return match;
        }}});
    return Match;
  })();
  module.exports = Match;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/supportsHistory", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  function supportsHistory() {
    var ua = navigator.userAgent;
    if ((ua.indexOf("Android 2.") !== -1 || ua.indexOf("Android 4.0") !== -1) && ua.indexOf("Mobile Safari") !== -1 && ua.indexOf("Chrome") === -1 && ua.indexOf("Windows Phone") === -1) {
      return false;
    }
    return window.history && "pushState" in window.history;
  }
  module.exports = supportsHistory;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/runRouter", ["npm:react-router@0.13.2/lib/createRouter"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var createRouter = require("npm:react-router@0.13.2/lib/createRouter");
  function runRouter(routes, location, callback) {
    if (typeof location === "function") {
      callback = location;
      location = null;
    }
    var router = createRouter({
      routes: routes,
      location: location
    });
    router.run(callback);
    return router;
  }
  module.exports = runRouter;
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/ActionMethods", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = {};
  global.define = __define;
  return module.exports;
});

System.register("npm:eventemitter3@0.1.6/index", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  function EE(fn, context, once) {
    this.fn = fn;
    this.context = context;
    this.once = once || false;
  }
  function EventEmitter() {}
  EventEmitter.prototype._events = undefined;
  EventEmitter.prototype.listeners = function listeners(event) {
    if (!this._events || !this._events[event])
      return [];
    if (this._events[event].fn)
      return [this._events[event].fn];
    for (var i = 0,
        l = this._events[event].length,
        ee = new Array(l); i < l; i++) {
      ee[i] = this._events[event][i].fn;
    }
    return ee;
  };
  EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
    if (!this._events || !this._events[event])
      return false;
    var listeners = this._events[event],
        len = arguments.length,
        args,
        i;
    if ('function' === typeof listeners.fn) {
      if (listeners.once)
        this.removeListener(event, listeners.fn, true);
      switch (len) {
        case 1:
          return listeners.fn.call(listeners.context), true;
        case 2:
          return listeners.fn.call(listeners.context, a1), true;
        case 3:
          return listeners.fn.call(listeners.context, a1, a2), true;
        case 4:
          return listeners.fn.call(listeners.context, a1, a2, a3), true;
        case 5:
          return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
        case 6:
          return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
      }
      for (i = 1, args = new Array(len - 1); i < len; i++) {
        args[i - 1] = arguments[i];
      }
      listeners.fn.apply(listeners.context, args);
    } else {
      var length = listeners.length,
          j;
      for (i = 0; i < length; i++) {
        if (listeners[i].once)
          this.removeListener(event, listeners[i].fn, true);
        switch (len) {
          case 1:
            listeners[i].fn.call(listeners[i].context);
            break;
          case 2:
            listeners[i].fn.call(listeners[i].context, a1);
            break;
          case 3:
            listeners[i].fn.call(listeners[i].context, a1, a2);
            break;
          default:
            if (!args)
              for (j = 1, args = new Array(len - 1); j < len; j++) {
                args[j - 1] = arguments[j];
              }
            listeners[i].fn.apply(listeners[i].context, args);
        }
      }
    }
    return true;
  };
  EventEmitter.prototype.on = function on(event, fn, context) {
    var listener = new EE(fn, context || this);
    if (!this._events)
      this._events = {};
    if (!this._events[event])
      this._events[event] = listener;
    else {
      if (!this._events[event].fn)
        this._events[event].push(listener);
      else
        this._events[event] = [this._events[event], listener];
    }
    return this;
  };
  EventEmitter.prototype.once = function once(event, fn, context) {
    var listener = new EE(fn, context || this, true);
    if (!this._events)
      this._events = {};
    if (!this._events[event])
      this._events[event] = listener;
    else {
      if (!this._events[event].fn)
        this._events[event].push(listener);
      else
        this._events[event] = [this._events[event], listener];
    }
    return this;
  };
  EventEmitter.prototype.removeListener = function removeListener(event, fn, once) {
    if (!this._events || !this._events[event])
      return this;
    var listeners = this._events[event],
        events = [];
    if (fn) {
      if (listeners.fn && (listeners.fn !== fn || (once && !listeners.once))) {
        events.push(listeners);
      }
      if (!listeners.fn)
        for (var i = 0,
            length = listeners.length; i < length; i++) {
          if (listeners[i].fn !== fn || (once && !listeners[i].once)) {
            events.push(listeners[i]);
          }
        }
    }
    if (events.length) {
      this._events[event] = events.length === 1 ? events[0] : events;
    } else {
      delete this._events[event];
    }
    return this;
  };
  EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
    if (!this._events)
      return this;
    if (event)
      delete this._events[event];
    else
      this._events = {};
    return this;
  };
  EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
  EventEmitter.prototype.addListener = EventEmitter.prototype.on;
  EventEmitter.prototype.setMaxListeners = function setMaxListeners() {
    return this;
  };
  EventEmitter.EventEmitter = EventEmitter;
  EventEmitter.EventEmitter2 = EventEmitter;
  EventEmitter.EventEmitter3 = EventEmitter;
  module.exports = EventEmitter;
  global.define = __define;
  return module.exports;
});

System.register("npm:native-promise-only@0.7.6-a/npo", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "format cjs";
  !function(t, n, e) {
    n[t] = n[t] || e(), "undefined" != typeof module && module.exports ? module.exports = n[t] : "function" == typeof define && define.amd && define(function() {
      return n[t];
    });
  }("Promise", "undefined" != typeof global ? global : this, function() {
    "use strict";
    function t(t, n) {
      l.add(t, n), h || (h = y(l.drain));
    }
    function n(t) {
      var n,
          e = typeof t;
      return null == t || "object" != e && "function" != e || (n = t.then), "function" == typeof n ? n : !1;
    }
    function e() {
      for (var t = 0; t < this.chain.length; t++)
        o(this, 1 === this.state ? this.chain[t].success : this.chain[t].failure, this.chain[t]);
      this.chain.length = 0;
    }
    function o(t, e, o) {
      var r,
          i;
      try {
        e === !1 ? o.reject(t.msg) : (r = e === !0 ? t.msg : e.call(void 0, t.msg), r === o.promise ? o.reject(TypeError("Promise-chain cycle")) : (i = n(r)) ? i.call(r, o.resolve, o.reject) : o.resolve(r));
      } catch (c) {
        o.reject(c);
      }
    }
    function r(o) {
      var c,
          u,
          a = this;
      if (!a.triggered) {
        a.triggered = !0, a.def && (a = a.def);
        try {
          (c = n(o)) ? (u = new f(a), c.call(o, function() {
            r.apply(u, arguments);
          }, function() {
            i.apply(u, arguments);
          })) : (a.msg = o, a.state = 1, a.chain.length > 0 && t(e, a));
        } catch (s) {
          i.call(u || new f(a), s);
        }
      }
    }
    function i(n) {
      var o = this;
      o.triggered || (o.triggered = !0, o.def && (o = o.def), o.msg = n, o.state = 2, o.chain.length > 0 && t(e, o));
    }
    function c(t, n, e, o) {
      for (var r = 0; r < n.length; r++)
        !function(r) {
          t.resolve(n[r]).then(function(t) {
            e(r, t);
          }, o);
        }(r);
    }
    function f(t) {
      this.def = t, this.triggered = !1;
    }
    function u(t) {
      this.promise = t, this.state = 0, this.triggered = !1, this.chain = [], this.msg = void 0;
    }
    function a(n) {
      if ("function" != typeof n)
        throw TypeError("Not a function");
      if (0 !== this.__NPO__)
        throw TypeError("Not a promise");
      this.__NPO__ = 1;
      var o = new u(this);
      this.then = function(n, r) {
        var i = {
          success: "function" == typeof n ? n : !0,
          failure: "function" == typeof r ? r : !1
        };
        return i.promise = new this.constructor(function(t, n) {
          if ("function" != typeof t || "function" != typeof n)
            throw TypeError("Not a function");
          i.resolve = t, i.reject = n;
        }), o.chain.push(i), 0 !== o.state && t(e, o), i.promise;
      }, this["catch"] = function(t) {
        return this.then(void 0, t);
      };
      try {
        n.call(void 0, function(t) {
          r.call(o, t);
        }, function(t) {
          i.call(o, t);
        });
      } catch (c) {
        i.call(o, c);
      }
    }
    var s,
        h,
        l,
        p = Object.prototype.toString,
        y = "undefined" != typeof setImmediate ? function(t) {
          return setImmediate(t);
        } : setTimeout;
    try {
      Object.defineProperty({}, "x", {}), s = function(t, n, e, o) {
        return Object.defineProperty(t, n, {
          value: e,
          writable: !0,
          configurable: o !== !1
        });
      };
    } catch (d) {
      s = function(t, n, e) {
        return t[n] = e, t;
      };
    }
    l = function() {
      function t(t, n) {
        this.fn = t, this.self = n, this.next = void 0;
      }
      var n,
          e,
          o;
      return {
        add: function(r, i) {
          o = new t(r, i), e ? e.next = o : n = o, e = o, o = void 0;
        },
        drain: function() {
          var t = n;
          for (n = e = h = void 0; t; )
            t.fn.call(t.self), t = t.next;
        }
      };
    }();
    var g = s({}, "constructor", a, !1);
    return s(a, "prototype", g, !1), s(g, "__NPO__", 0, !1), s(a, "resolve", function(t) {
      var n = this;
      return t && "object" == typeof t && 1 === t.__NPO__ ? t : new n(function(n, e) {
        if ("function" != typeof n || "function" != typeof e)
          throw TypeError("Not a function");
        n(t);
      });
    }), s(a, "reject", function(t) {
      return new this(function(n, e) {
        if ("function" != typeof n || "function" != typeof e)
          throw TypeError("Not a function");
        e(t);
      });
    }), s(a, "all", function(t) {
      var n = this;
      return "[object Array]" != p.call(t) ? n.reject(TypeError("Not an array")) : 0 === t.length ? n.resolve([]) : new n(function(e, o) {
        if ("function" != typeof e || "function" != typeof o)
          throw TypeError("Not a function");
        var r = t.length,
            i = Array(r),
            f = 0;
        c(n, t, function(t, n) {
          i[t] = n, ++f === r && e(i);
        }, o);
      });
    }), s(a, "race", function(t) {
      var n = this;
      return "[object Array]" != p.call(t) ? n.reject(TypeError("Not an array")) : new n(function(e, o) {
        if ("function" != typeof e || "function" != typeof o)
          throw TypeError("Not a function");
        c(n, t, function(t, n) {
          e(n);
        }, o);
      });
    }), a;
  });
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/Keep", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  exports.createdStores = [];
  exports.createdActions = [];
  exports.reset = function() {
    while (exports.createdStores.length) {
      exports.createdStores.pop();
    }
    while (exports.createdActions.length) {
      exports.createdActions.pop();
    }
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/mixer", ["npm:reflux@0.2.7/src/utils"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var _ = require("npm:reflux@0.2.7/src/utils");
  module.exports = function mix(def) {
    var composed = {
      init: [],
      preEmit: [],
      shouldEmit: []
    };
    var updated = (function mixDef(mixin) {
      var mixed = {};
      if (mixin.mixins) {
        mixin.mixins.forEach(function(subMixin) {
          _.extend(mixed, mixDef(subMixin));
        });
      }
      _.extend(mixed, mixin);
      Object.keys(composed).forEach(function(composable) {
        if (mixin.hasOwnProperty(composable)) {
          composed[composable].push(mixin[composable]);
        }
      });
      return mixed;
    }(def));
    if (composed.init.length > 1) {
      updated.init = function() {
        var args = arguments;
        composed.init.forEach(function(init) {
          init.apply(this, args);
        }, this);
      };
    }
    if (composed.preEmit.length > 1) {
      updated.preEmit = function() {
        return composed.preEmit.reduce(function(args, preEmit) {
          var newValue = preEmit.apply(this, args);
          return newValue === undefined ? args : [newValue];
        }.bind(this), arguments);
      };
    }
    if (composed.shouldEmit.length > 1) {
      updated.shouldEmit = function() {
        var args = arguments;
        return !composed.shouldEmit.some(function(shouldEmit) {
          return !shouldEmit.apply(this, args);
        }, this);
      };
    }
    Object.keys(composed).forEach(function(composable) {
      if (composed[composable].length === 1) {
        updated[composable] = composed[composable][0];
      }
    });
    return updated;
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/bindMethods", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = function(store, definition) {
    for (var name in definition) {
      if (Object.getOwnPropertyDescriptor && Object.defineProperty) {
        var propertyDescriptor = Object.getOwnPropertyDescriptor(definition, name);
        if (!propertyDescriptor.value || typeof propertyDescriptor.value !== 'function' || !definition.hasOwnProperty(name)) {
          continue;
        }
        store[name] = definition[name].bind(store);
      } else {
        var property = definition[name];
        if (typeof property !== 'function' || !definition.hasOwnProperty(name)) {
          continue;
        }
        store[name] = property.bind(store);
      }
    }
    return store;
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/PublisherMethods", ["npm:reflux@0.2.7/src/utils"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var _ = require("npm:reflux@0.2.7/src/utils");
  module.exports = {
    preEmit: function() {},
    shouldEmit: function() {
      return true;
    },
    listen: function(callback, bindContext) {
      bindContext = bindContext || this;
      var eventHandler = function(args) {
        if (aborted) {
          return ;
        }
        callback.apply(bindContext, args);
      },
          me = this,
          aborted = false;
      this.emitter.addListener(this.eventLabel, eventHandler);
      return function() {
        aborted = true;
        me.emitter.removeListener(me.eventLabel, eventHandler);
      };
    },
    promise: function(promise) {
      var me = this;
      var canHandlePromise = this.children.indexOf('completed') >= 0 && this.children.indexOf('failed') >= 0;
      if (!canHandlePromise) {
        throw new Error('Publisher must have "completed" and "failed" child publishers');
      }
      promise.then(function(response) {
        return me.completed(response);
      }, function(error) {
        return me.failed(error);
      });
    },
    listenAndPromise: function(callback, bindContext) {
      var me = this;
      bindContext = bindContext || this;
      this.willCallPromise = (this.willCallPromise || 0) + 1;
      var removeListen = this.listen(function() {
        if (!callback) {
          throw new Error('Expected a function returning a promise but got ' + callback);
        }
        var args = arguments,
            promise = callback.apply(bindContext, args);
        return me.promise.call(me, promise);
      }, bindContext);
      return function() {
        me.willCallPromise--;
        removeListen.call(me);
      };
    },
    trigger: function() {
      var args = arguments,
          pre = this.preEmit.apply(this, args);
      args = pre === undefined ? args : _.isArguments(pre) ? pre : [].concat(pre);
      if (this.shouldEmit.apply(this, args)) {
        this.emitter.emit(this.eventLabel, args);
      }
    },
    triggerAsync: function() {
      var args = arguments,
          me = this;
      _.nextTick(function() {
        me.trigger.apply(me, args);
      });
    },
    triggerPromise: function() {
      var me = this;
      var args = arguments;
      var canHandlePromise = this.children.indexOf('completed') >= 0 && this.children.indexOf('failed') >= 0;
      var promise = _.createPromise(function(resolve, reject) {
        if (me.willCallPromise) {
          _.nextTick(function() {
            var old_promise_method = me.promise;
            me.promise = function(promise) {
              promise.then(resolve, reject);
              me.promise = old_promise_method;
              return me.promise.apply(me, arguments);
            };
            me.trigger.apply(me, args);
          });
          return ;
        }
        if (canHandlePromise) {
          var removeSuccess = me.completed.listen(function(args) {
            removeSuccess();
            removeFailed();
            resolve(args);
          });
          var removeFailed = me.failed.listen(function(args) {
            removeSuccess();
            removeFailed();
            reject(args);
          });
        }
        me.triggerAsync.apply(me, args);
        if (!canHandlePromise) {
          resolve();
        }
      });
      return promise;
    }
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/StoreMethods", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = {};
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/createAction", ["npm:reflux@0.2.7/src/utils", "npm:reflux@0.2.7/src/index", "npm:reflux@0.2.7/src/Keep"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var _ = require("npm:reflux@0.2.7/src/utils"),
      Reflux = require("npm:reflux@0.2.7/src/index"),
      Keep = require("npm:reflux@0.2.7/src/Keep"),
      allowed = {
        preEmit: 1,
        shouldEmit: 1
      };
  var createAction = function(definition) {
    definition = definition || {};
    if (!_.isObject(definition)) {
      definition = {actionName: definition};
    }
    for (var a in Reflux.ActionMethods) {
      if (!allowed[a] && Reflux.PublisherMethods[a]) {
        throw new Error("Cannot override API method " + a + " in Reflux.ActionMethods. Use another method name or override it on Reflux.PublisherMethods instead.");
      }
    }
    for (var d in definition) {
      if (!allowed[d] && Reflux.PublisherMethods[d]) {
        throw new Error("Cannot override API method " + d + " in action creation. Use another method name or override it on Reflux.PublisherMethods instead.");
      }
    }
    definition.children = definition.children || [];
    if (definition.asyncResult) {
      definition.children = definition.children.concat(["completed", "failed"]);
    }
    var i = 0,
        childActions = {};
    for (; i < definition.children.length; i++) {
      var name = definition.children[i];
      childActions[name] = createAction(name);
    }
    var context = _.extend({
      eventLabel: "action",
      emitter: new _.EventEmitter(),
      _isAction: true
    }, Reflux.PublisherMethods, Reflux.ActionMethods, definition);
    var functor = function() {
      return functor[functor.sync ? "trigger" : "triggerPromise"].apply(functor, arguments);
    };
    _.extend(functor, childActions, context);
    Keep.createdActions.push(functor);
    return functor;
  };
  module.exports = createAction;
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/connect", ["npm:reflux@0.2.7/src/index", "npm:reflux@0.2.7/src/utils"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var Reflux = require("npm:reflux@0.2.7/src/index"),
      _ = require("npm:reflux@0.2.7/src/utils");
  module.exports = function(listenable, key) {
    return {
      getInitialState: function() {
        if (!_.isFunction(listenable.getInitialState)) {
          return {};
        } else if (key === undefined) {
          return listenable.getInitialState();
        } else {
          return _.object([key], [listenable.getInitialState()]);
        }
      },
      componentDidMount: function() {
        _.extend(this, Reflux.ListenerMethods);
        var me = this,
            cb = (key === undefined ? this.setState : function(v) {
              me.setState(_.object([key], [v]));
            });
        this.listenTo(listenable, cb);
      },
      componentWillUnmount: Reflux.ListenerMixin.componentWillUnmount
    };
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/connectFilter", ["npm:reflux@0.2.7/src/index", "npm:reflux@0.2.7/src/utils"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var Reflux = require("npm:reflux@0.2.7/src/index"),
      _ = require("npm:reflux@0.2.7/src/utils");
  module.exports = function(listenable, key, filterFunc) {
    filterFunc = _.isFunction(key) ? key : filterFunc;
    return {
      getInitialState: function() {
        if (!_.isFunction(listenable.getInitialState)) {
          return {};
        } else if (_.isFunction(key)) {
          return filterFunc.call(this, listenable.getInitialState());
        } else {
          var result = filterFunc.call(this, listenable.getInitialState());
          if (result) {
            return _.object([key], [result]);
          } else {
            return {};
          }
        }
      },
      componentDidMount: function() {
        _.extend(this, Reflux.ListenerMethods);
        var me = this;
        var cb = function(value) {
          if (_.isFunction(key)) {
            me.setState(filterFunc.call(me, value));
          } else {
            var result = filterFunc.call(me, value);
            me.setState(_.object([key], [result]));
          }
        };
        this.listenTo(listenable, cb);
      },
      componentWillUnmount: Reflux.ListenerMixin.componentWillUnmount
    };
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/ListenerMixin", ["npm:reflux@0.2.7/src/utils", "npm:reflux@0.2.7/src/ListenerMethods"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var _ = require("npm:reflux@0.2.7/src/utils"),
      ListenerMethods = require("npm:reflux@0.2.7/src/ListenerMethods");
  module.exports = _.extend({componentWillUnmount: ListenerMethods.stopListeningToAll}, ListenerMethods);
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/listenTo", ["npm:reflux@0.2.7/src/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var Reflux = require("npm:reflux@0.2.7/src/index");
  module.exports = function(listenable, callback, initial) {
    return {
      componentDidMount: function() {
        for (var m in Reflux.ListenerMethods) {
          if (this[m] !== Reflux.ListenerMethods[m]) {
            if (this[m]) {
              throw "Can't have other property '" + m + "' when using Reflux.listenTo!";
            }
            this[m] = Reflux.ListenerMethods[m];
          }
        }
        this.listenTo(listenable, callback, initial);
      },
      componentWillUnmount: Reflux.ListenerMethods.stopListeningToAll
    };
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/listenToMany", ["npm:reflux@0.2.7/src/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var Reflux = require("npm:reflux@0.2.7/src/index");
  module.exports = function(listenables) {
    return {
      componentDidMount: function() {
        for (var m in Reflux.ListenerMethods) {
          if (this[m] !== Reflux.ListenerMethods[m]) {
            if (this[m]) {
              throw "Can't have other property '" + m + "' when using Reflux.listenToMany!";
            }
            this[m] = Reflux.ListenerMethods[m];
          }
        }
        this.listenToMany(listenables);
      },
      componentWillUnmount: Reflux.ListenerMethods.stopListeningToAll
    };
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:process@0.10.1", ["npm:process@0.10.1/browser"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:process@0.10.1/browser");
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/warning", ["npm:react@0.13.2/lib/emptyFunction", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    "use strict";
    var emptyFunction = require("npm:react@0.13.2/lib/emptyFunction");
    var warning = emptyFunction;
    if ("production" !== process.env.NODE_ENV) {
      warning = function(condition, format) {
        for (var args = [],
            $__0 = 2,
            $__1 = arguments.length; $__0 < $__1; $__0++)
          args.push(arguments[$__0]);
        if (format === undefined) {
          throw new Error('`warning(condition, format, ...args)` requires a warning ' + 'message argument');
        }
        if (format.length < 10 || /^[s\W]*$/.test(format)) {
          throw new Error('The warning format should be able to uniquely identify this ' + 'warning. Please, use a more descriptive format than: ' + format);
        }
        if (format.indexOf('Failed Composite propType: ') === 0) {
          return ;
        }
        if (!condition) {
          var argIndex = 0;
          var message = 'Warning: ' + format.replace(/%s/g, function() {
            return args[argIndex++];
          });
          console.warn(message);
          try {
            throw new Error(message);
          } catch (x) {}
        }
      };
    }
    module.exports = warning;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactInstanceHandles", ["npm:react@0.13.2/lib/ReactRootIndex", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactRootIndex = require("npm:react@0.13.2/lib/ReactRootIndex");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var SEPARATOR = '.';
    var SEPARATOR_LENGTH = SEPARATOR.length;
    var MAX_TREE_DEPTH = 100;
    function getReactRootIDString(index) {
      return SEPARATOR + index.toString(36);
    }
    function isBoundary(id, index) {
      return id.charAt(index) === SEPARATOR || index === id.length;
    }
    function isValidID(id) {
      return id === '' || (id.charAt(0) === SEPARATOR && id.charAt(id.length - 1) !== SEPARATOR);
    }
    function isAncestorIDOf(ancestorID, descendantID) {
      return (descendantID.indexOf(ancestorID) === 0 && isBoundary(descendantID, ancestorID.length));
    }
    function getParentID(id) {
      return id ? id.substr(0, id.lastIndexOf(SEPARATOR)) : '';
    }
    function getNextDescendantID(ancestorID, destinationID) {
      ("production" !== process.env.NODE_ENV ? invariant(isValidID(ancestorID) && isValidID(destinationID), 'getNextDescendantID(%s, %s): Received an invalid React DOM ID.', ancestorID, destinationID) : invariant(isValidID(ancestorID) && isValidID(destinationID)));
      ("production" !== process.env.NODE_ENV ? invariant(isAncestorIDOf(ancestorID, destinationID), 'getNextDescendantID(...): React has made an invalid assumption about ' + 'the DOM hierarchy. Expected `%s` to be an ancestor of `%s`.', ancestorID, destinationID) : invariant(isAncestorIDOf(ancestorID, destinationID)));
      if (ancestorID === destinationID) {
        return ancestorID;
      }
      var start = ancestorID.length + SEPARATOR_LENGTH;
      var i;
      for (i = start; i < destinationID.length; i++) {
        if (isBoundary(destinationID, i)) {
          break;
        }
      }
      return destinationID.substr(0, i);
    }
    function getFirstCommonAncestorID(oneID, twoID) {
      var minLength = Math.min(oneID.length, twoID.length);
      if (minLength === 0) {
        return '';
      }
      var lastCommonMarkerIndex = 0;
      for (var i = 0; i <= minLength; i++) {
        if (isBoundary(oneID, i) && isBoundary(twoID, i)) {
          lastCommonMarkerIndex = i;
        } else if (oneID.charAt(i) !== twoID.charAt(i)) {
          break;
        }
      }
      var longestCommonID = oneID.substr(0, lastCommonMarkerIndex);
      ("production" !== process.env.NODE_ENV ? invariant(isValidID(longestCommonID), 'getFirstCommonAncestorID(%s, %s): Expected a valid React DOM ID: %s', oneID, twoID, longestCommonID) : invariant(isValidID(longestCommonID)));
      return longestCommonID;
    }
    function traverseParentPath(start, stop, cb, arg, skipFirst, skipLast) {
      start = start || '';
      stop = stop || '';
      ("production" !== process.env.NODE_ENV ? invariant(start !== stop, 'traverseParentPath(...): Cannot traverse from and to the same ID, `%s`.', start) : invariant(start !== stop));
      var traverseUp = isAncestorIDOf(stop, start);
      ("production" !== process.env.NODE_ENV ? invariant(traverseUp || isAncestorIDOf(start, stop), 'traverseParentPath(%s, %s, ...): Cannot traverse from two IDs that do ' + 'not have a parent path.', start, stop) : invariant(traverseUp || isAncestorIDOf(start, stop)));
      var depth = 0;
      var traverse = traverseUp ? getParentID : getNextDescendantID;
      for (var id = start; ; id = traverse(id, stop)) {
        var ret;
        if ((!skipFirst || id !== start) && (!skipLast || id !== stop)) {
          ret = cb(id, traverseUp, arg);
        }
        if (ret === false || id === stop) {
          break;
        }
        ("production" !== process.env.NODE_ENV ? invariant(depth++ < MAX_TREE_DEPTH, 'traverseParentPath(%s, %s, ...): Detected an infinite loop while ' + 'traversing the React DOM ID tree. This may be due to malformed IDs: %s', start, stop) : invariant(depth++ < MAX_TREE_DEPTH));
      }
    }
    var ReactInstanceHandles = {
      createReactRootID: function() {
        return getReactRootIDString(ReactRootIndex.createReactRootIndex());
      },
      createReactID: function(rootID, name) {
        return rootID + name;
      },
      getReactRootIDFromNodeID: function(id) {
        if (id && id.charAt(0) === SEPARATOR && id.length > 1) {
          var index = id.indexOf(SEPARATOR, 1);
          return index > -1 ? id.substr(0, index) : id;
        }
        return null;
      },
      traverseEnterLeave: function(leaveID, enterID, cb, upArg, downArg) {
        var ancestorID = getFirstCommonAncestorID(leaveID, enterID);
        if (ancestorID !== leaveID) {
          traverseParentPath(leaveID, ancestorID, cb, upArg, false, true);
        }
        if (ancestorID !== enterID) {
          traverseParentPath(ancestorID, enterID, cb, downArg, true, false);
        }
      },
      traverseTwoPhase: function(targetID, cb, arg) {
        if (targetID) {
          traverseParentPath('', targetID, cb, arg, true, false);
          traverseParentPath(targetID, '', cb, arg, false, true);
        }
      },
      traverseAncestors: function(targetID, cb, arg) {
        traverseParentPath('', targetID, cb, arg, true, false);
      },
      _getFirstCommonAncestorID: getFirstCommonAncestorID,
      _getNextDescendantID: getNextDescendantID,
      isAncestorIDOf: isAncestorIDOf,
      SEPARATOR: SEPARATOR
    };
    module.exports = ReactInstanceHandles;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactRef", ["npm:react@0.13.2/lib/ReactOwner", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactOwner = require("npm:react@0.13.2/lib/ReactOwner");
    var ReactRef = {};
    function attachRef(ref, component, owner) {
      if (typeof ref === 'function') {
        ref(component.getPublicInstance());
      } else {
        ReactOwner.addComponentAsRefTo(component, ref, owner);
      }
    }
    function detachRef(ref, component, owner) {
      if (typeof ref === 'function') {
        ref(null);
      } else {
        ReactOwner.removeComponentAsRefFrom(component, ref, owner);
      }
    }
    ReactRef.attachRefs = function(instance, element) {
      var ref = element.ref;
      if (ref != null) {
        attachRef(ref, instance, element._owner);
      }
    };
    ReactRef.shouldUpdateRefs = function(prevElement, nextElement) {
      return (nextElement._owner !== prevElement._owner || nextElement.ref !== prevElement.ref);
    };
    ReactRef.detachRefs = function(instance, element) {
      var ref = element.ref;
      if (ref != null) {
        detachRef(ref, instance, element._owner);
      }
    };
    module.exports = ReactRef;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactElementValidator", ["npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactFragment", "npm:react@0.13.2/lib/ReactPropTypeLocations", "npm:react@0.13.2/lib/ReactPropTypeLocationNames", "npm:react@0.13.2/lib/ReactCurrentOwner", "npm:react@0.13.2/lib/ReactNativeComponent", "npm:react@0.13.2/lib/getIteratorFn", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactFragment = require("npm:react@0.13.2/lib/ReactFragment");
    var ReactPropTypeLocations = require("npm:react@0.13.2/lib/ReactPropTypeLocations");
    var ReactPropTypeLocationNames = require("npm:react@0.13.2/lib/ReactPropTypeLocationNames");
    var ReactCurrentOwner = require("npm:react@0.13.2/lib/ReactCurrentOwner");
    var ReactNativeComponent = require("npm:react@0.13.2/lib/ReactNativeComponent");
    var getIteratorFn = require("npm:react@0.13.2/lib/getIteratorFn");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var warning = require("npm:react@0.13.2/lib/warning");
    function getDeclarationErrorAddendum() {
      if (ReactCurrentOwner.current) {
        var name = ReactCurrentOwner.current.getName();
        if (name) {
          return ' Check the render method of `' + name + '`.';
        }
      }
      return '';
    }
    var ownerHasKeyUseWarning = {};
    var loggedTypeFailures = {};
    var NUMERIC_PROPERTY_REGEX = /^\d+$/;
    function getName(instance) {
      var publicInstance = instance && instance.getPublicInstance();
      if (!publicInstance) {
        return undefined;
      }
      var constructor = publicInstance.constructor;
      if (!constructor) {
        return undefined;
      }
      return constructor.displayName || constructor.name || undefined;
    }
    function getCurrentOwnerDisplayName() {
      var current = ReactCurrentOwner.current;
      return (current && getName(current) || undefined);
    }
    function validateExplicitKey(element, parentType) {
      if (element._store.validated || element.key != null) {
        return ;
      }
      element._store.validated = true;
      warnAndMonitorForKeyUse('Each child in an array or iterator should have a unique "key" prop.', element, parentType);
    }
    function validatePropertyKey(name, element, parentType) {
      if (!NUMERIC_PROPERTY_REGEX.test(name)) {
        return ;
      }
      warnAndMonitorForKeyUse('Child objects should have non-numeric keys so ordering is preserved.', element, parentType);
    }
    function warnAndMonitorForKeyUse(message, element, parentType) {
      var ownerName = getCurrentOwnerDisplayName();
      var parentName = typeof parentType === 'string' ? parentType : parentType.displayName || parentType.name;
      var useName = ownerName || parentName;
      var memoizer = ownerHasKeyUseWarning[message] || ((ownerHasKeyUseWarning[message] = {}));
      if (memoizer.hasOwnProperty(useName)) {
        return ;
      }
      memoizer[useName] = true;
      var parentOrOwnerAddendum = ownerName ? (" Check the render method of " + ownerName + ".") : parentName ? (" Check the React.render call using <" + parentName + ">.") : '';
      var childOwnerAddendum = '';
      if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
        var childOwnerName = getName(element._owner);
        childOwnerAddendum = (" It was passed a child from " + childOwnerName + ".");
      }
      ("production" !== process.env.NODE_ENV ? warning(false, message + '%s%s See http://fb.me/react-warning-keys for more information.', parentOrOwnerAddendum, childOwnerAddendum) : null);
    }
    function validateChildKeys(node, parentType) {
      if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
          var child = node[i];
          if (ReactElement.isValidElement(child)) {
            validateExplicitKey(child, parentType);
          }
        }
      } else if (ReactElement.isValidElement(node)) {
        node._store.validated = true;
      } else if (node) {
        var iteratorFn = getIteratorFn(node);
        if (iteratorFn) {
          if (iteratorFn !== node.entries) {
            var iterator = iteratorFn.call(node);
            var step;
            while (!(step = iterator.next()).done) {
              if (ReactElement.isValidElement(step.value)) {
                validateExplicitKey(step.value, parentType);
              }
            }
          }
        } else if (typeof node === 'object') {
          var fragment = ReactFragment.extractIfFragment(node);
          for (var key in fragment) {
            if (fragment.hasOwnProperty(key)) {
              validatePropertyKey(key, fragment[key], parentType);
            }
          }
        }
      }
    }
    function checkPropTypes(componentName, propTypes, props, location) {
      for (var propName in propTypes) {
        if (propTypes.hasOwnProperty(propName)) {
          var error;
          try {
            ("production" !== process.env.NODE_ENV ? invariant(typeof propTypes[propName] === 'function', '%s: %s type `%s` is invalid; it must be a function, usually from ' + 'React.PropTypes.', componentName || 'React class', ReactPropTypeLocationNames[location], propName) : invariant(typeof propTypes[propName] === 'function'));
            error = propTypes[propName](props, propName, componentName, location);
          } catch (ex) {
            error = ex;
          }
          if (error instanceof Error && !(error.message in loggedTypeFailures)) {
            loggedTypeFailures[error.message] = true;
            var addendum = getDeclarationErrorAddendum(this);
            ("production" !== process.env.NODE_ENV ? warning(false, 'Failed propType: %s%s', error.message, addendum) : null);
          }
        }
      }
    }
    var warnedPropsMutations = {};
    function warnForPropsMutation(propName, element) {
      var type = element.type;
      var elementName = typeof type === 'string' ? type : type.displayName;
      var ownerName = element._owner ? element._owner.getPublicInstance().constructor.displayName : null;
      var warningKey = propName + '|' + elementName + '|' + ownerName;
      if (warnedPropsMutations.hasOwnProperty(warningKey)) {
        return ;
      }
      warnedPropsMutations[warningKey] = true;
      var elementInfo = '';
      if (elementName) {
        elementInfo = ' <' + elementName + ' />';
      }
      var ownerInfo = '';
      if (ownerName) {
        ownerInfo = ' The element was created by ' + ownerName + '.';
      }
      ("production" !== process.env.NODE_ENV ? warning(false, 'Don\'t set .props.%s of the React component%s. Instead, specify the ' + 'correct value when initially creating the element or use ' + 'React.cloneElement to make a new element with updated props.%s', propName, elementInfo, ownerInfo) : null);
    }
    function is(a, b) {
      if (a !== a) {
        return b !== b;
      }
      if (a === 0 && b === 0) {
        return 1 / a === 1 / b;
      }
      return a === b;
    }
    function checkAndWarnForMutatedProps(element) {
      if (!element._store) {
        return ;
      }
      var originalProps = element._store.originalProps;
      var props = element.props;
      for (var propName in props) {
        if (props.hasOwnProperty(propName)) {
          if (!originalProps.hasOwnProperty(propName) || !is(originalProps[propName], props[propName])) {
            warnForPropsMutation(propName, element);
            originalProps[propName] = props[propName];
          }
        }
      }
    }
    function validatePropTypes(element) {
      if (element.type == null) {
        return ;
      }
      var componentClass = ReactNativeComponent.getComponentClassForElement(element);
      var name = componentClass.displayName || componentClass.name;
      if (componentClass.propTypes) {
        checkPropTypes(name, componentClass.propTypes, element.props, ReactPropTypeLocations.prop);
      }
      if (typeof componentClass.getDefaultProps === 'function') {
        ("production" !== process.env.NODE_ENV ? warning(componentClass.getDefaultProps.isReactClassApproved, 'getDefaultProps is only used on classic React.createClass ' + 'definitions. Use a static property named `defaultProps` instead.') : null);
      }
    }
    var ReactElementValidator = {
      checkAndWarnForMutatedProps: checkAndWarnForMutatedProps,
      createElement: function(type, props, children) {
        ("production" !== process.env.NODE_ENV ? warning(type != null, 'React.createElement: type should not be null or undefined. It should ' + 'be a string (for DOM elements) or a ReactClass (for composite ' + 'components).') : null);
        var element = ReactElement.createElement.apply(this, arguments);
        if (element == null) {
          return element;
        }
        for (var i = 2; i < arguments.length; i++) {
          validateChildKeys(arguments[i], type);
        }
        validatePropTypes(element);
        return element;
      },
      createFactory: function(type) {
        var validatedFactory = ReactElementValidator.createElement.bind(null, type);
        validatedFactory.type = type;
        if ("production" !== process.env.NODE_ENV) {
          try {
            Object.defineProperty(validatedFactory, 'type', {
              enumerable: false,
              get: function() {
                ("production" !== process.env.NODE_ENV ? warning(false, 'Factory.type is deprecated. Access the class directly ' + 'before passing it to createFactory.') : null);
                Object.defineProperty(this, 'type', {value: type});
                return type;
              }
            });
          } catch (x) {}
        }
        return validatedFactory;
      },
      cloneElement: function(element, props, children) {
        var newElement = ReactElement.cloneElement.apply(this, arguments);
        for (var i = 2; i < arguments.length; i++) {
          validateChildKeys(arguments[i], newElement.type);
        }
        validatePropTypes(newElement);
        return newElement;
      }
    };
    module.exports = ReactElementValidator;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactClass", ["npm:react@0.13.2/lib/ReactComponent", "npm:react@0.13.2/lib/ReactCurrentOwner", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactErrorUtils", "npm:react@0.13.2/lib/ReactInstanceMap", "npm:react@0.13.2/lib/ReactLifeCycle", "npm:react@0.13.2/lib/ReactPropTypeLocations", "npm:react@0.13.2/lib/ReactPropTypeLocationNames", "npm:react@0.13.2/lib/ReactUpdateQueue", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/keyMirror", "npm:react@0.13.2/lib/keyOf", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactComponent = require("npm:react@0.13.2/lib/ReactComponent");
    var ReactCurrentOwner = require("npm:react@0.13.2/lib/ReactCurrentOwner");
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactErrorUtils = require("npm:react@0.13.2/lib/ReactErrorUtils");
    var ReactInstanceMap = require("npm:react@0.13.2/lib/ReactInstanceMap");
    var ReactLifeCycle = require("npm:react@0.13.2/lib/ReactLifeCycle");
    var ReactPropTypeLocations = require("npm:react@0.13.2/lib/ReactPropTypeLocations");
    var ReactPropTypeLocationNames = require("npm:react@0.13.2/lib/ReactPropTypeLocationNames");
    var ReactUpdateQueue = require("npm:react@0.13.2/lib/ReactUpdateQueue");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var keyMirror = require("npm:react@0.13.2/lib/keyMirror");
    var keyOf = require("npm:react@0.13.2/lib/keyOf");
    var warning = require("npm:react@0.13.2/lib/warning");
    var MIXINS_KEY = keyOf({mixins: null});
    var SpecPolicy = keyMirror({
      DEFINE_ONCE: null,
      DEFINE_MANY: null,
      OVERRIDE_BASE: null,
      DEFINE_MANY_MERGED: null
    });
    var injectedMixins = [];
    var ReactClassInterface = {
      mixins: SpecPolicy.DEFINE_MANY,
      statics: SpecPolicy.DEFINE_MANY,
      propTypes: SpecPolicy.DEFINE_MANY,
      contextTypes: SpecPolicy.DEFINE_MANY,
      childContextTypes: SpecPolicy.DEFINE_MANY,
      getDefaultProps: SpecPolicy.DEFINE_MANY_MERGED,
      getInitialState: SpecPolicy.DEFINE_MANY_MERGED,
      getChildContext: SpecPolicy.DEFINE_MANY_MERGED,
      render: SpecPolicy.DEFINE_ONCE,
      componentWillMount: SpecPolicy.DEFINE_MANY,
      componentDidMount: SpecPolicy.DEFINE_MANY,
      componentWillReceiveProps: SpecPolicy.DEFINE_MANY,
      shouldComponentUpdate: SpecPolicy.DEFINE_ONCE,
      componentWillUpdate: SpecPolicy.DEFINE_MANY,
      componentDidUpdate: SpecPolicy.DEFINE_MANY,
      componentWillUnmount: SpecPolicy.DEFINE_MANY,
      updateComponent: SpecPolicy.OVERRIDE_BASE
    };
    var RESERVED_SPEC_KEYS = {
      displayName: function(Constructor, displayName) {
        Constructor.displayName = displayName;
      },
      mixins: function(Constructor, mixins) {
        if (mixins) {
          for (var i = 0; i < mixins.length; i++) {
            mixSpecIntoComponent(Constructor, mixins[i]);
          }
        }
      },
      childContextTypes: function(Constructor, childContextTypes) {
        if ("production" !== process.env.NODE_ENV) {
          validateTypeDef(Constructor, childContextTypes, ReactPropTypeLocations.childContext);
        }
        Constructor.childContextTypes = assign({}, Constructor.childContextTypes, childContextTypes);
      },
      contextTypes: function(Constructor, contextTypes) {
        if ("production" !== process.env.NODE_ENV) {
          validateTypeDef(Constructor, contextTypes, ReactPropTypeLocations.context);
        }
        Constructor.contextTypes = assign({}, Constructor.contextTypes, contextTypes);
      },
      getDefaultProps: function(Constructor, getDefaultProps) {
        if (Constructor.getDefaultProps) {
          Constructor.getDefaultProps = createMergedResultFunction(Constructor.getDefaultProps, getDefaultProps);
        } else {
          Constructor.getDefaultProps = getDefaultProps;
        }
      },
      propTypes: function(Constructor, propTypes) {
        if ("production" !== process.env.NODE_ENV) {
          validateTypeDef(Constructor, propTypes, ReactPropTypeLocations.prop);
        }
        Constructor.propTypes = assign({}, Constructor.propTypes, propTypes);
      },
      statics: function(Constructor, statics) {
        mixStaticSpecIntoComponent(Constructor, statics);
      }
    };
    function validateTypeDef(Constructor, typeDef, location) {
      for (var propName in typeDef) {
        if (typeDef.hasOwnProperty(propName)) {
          ("production" !== process.env.NODE_ENV ? warning(typeof typeDef[propName] === 'function', '%s: %s type `%s` is invalid; it must be a function, usually from ' + 'React.PropTypes.', Constructor.displayName || 'ReactClass', ReactPropTypeLocationNames[location], propName) : null);
        }
      }
    }
    function validateMethodOverride(proto, name) {
      var specPolicy = ReactClassInterface.hasOwnProperty(name) ? ReactClassInterface[name] : null;
      if (ReactClassMixin.hasOwnProperty(name)) {
        ("production" !== process.env.NODE_ENV ? invariant(specPolicy === SpecPolicy.OVERRIDE_BASE, 'ReactClassInterface: You are attempting to override ' + '`%s` from your class specification. Ensure that your method names ' + 'do not overlap with React methods.', name) : invariant(specPolicy === SpecPolicy.OVERRIDE_BASE));
      }
      if (proto.hasOwnProperty(name)) {
        ("production" !== process.env.NODE_ENV ? invariant(specPolicy === SpecPolicy.DEFINE_MANY || specPolicy === SpecPolicy.DEFINE_MANY_MERGED, 'ReactClassInterface: You are attempting to define ' + '`%s` on your component more than once. This conflict may be due ' + 'to a mixin.', name) : invariant(specPolicy === SpecPolicy.DEFINE_MANY || specPolicy === SpecPolicy.DEFINE_MANY_MERGED));
      }
    }
    function mixSpecIntoComponent(Constructor, spec) {
      if (!spec) {
        return ;
      }
      ("production" !== process.env.NODE_ENV ? invariant(typeof spec !== 'function', 'ReactClass: You\'re attempting to ' + 'use a component class as a mixin. Instead, just use a regular object.') : invariant(typeof spec !== 'function'));
      ("production" !== process.env.NODE_ENV ? invariant(!ReactElement.isValidElement(spec), 'ReactClass: You\'re attempting to ' + 'use a component as a mixin. Instead, just use a regular object.') : invariant(!ReactElement.isValidElement(spec)));
      var proto = Constructor.prototype;
      if (spec.hasOwnProperty(MIXINS_KEY)) {
        RESERVED_SPEC_KEYS.mixins(Constructor, spec.mixins);
      }
      for (var name in spec) {
        if (!spec.hasOwnProperty(name)) {
          continue;
        }
        if (name === MIXINS_KEY) {
          continue;
        }
        var property = spec[name];
        validateMethodOverride(proto, name);
        if (RESERVED_SPEC_KEYS.hasOwnProperty(name)) {
          RESERVED_SPEC_KEYS[name](Constructor, property);
        } else {
          var isReactClassMethod = ReactClassInterface.hasOwnProperty(name);
          var isAlreadyDefined = proto.hasOwnProperty(name);
          var markedDontBind = property && property.__reactDontBind;
          var isFunction = typeof property === 'function';
          var shouldAutoBind = isFunction && !isReactClassMethod && !isAlreadyDefined && !markedDontBind;
          if (shouldAutoBind) {
            if (!proto.__reactAutoBindMap) {
              proto.__reactAutoBindMap = {};
            }
            proto.__reactAutoBindMap[name] = property;
            proto[name] = property;
          } else {
            if (isAlreadyDefined) {
              var specPolicy = ReactClassInterface[name];
              ("production" !== process.env.NODE_ENV ? invariant(isReactClassMethod && ((specPolicy === SpecPolicy.DEFINE_MANY_MERGED || specPolicy === SpecPolicy.DEFINE_MANY)), 'ReactClass: Unexpected spec policy %s for key %s ' + 'when mixing in component specs.', specPolicy, name) : invariant(isReactClassMethod && ((specPolicy === SpecPolicy.DEFINE_MANY_MERGED || specPolicy === SpecPolicy.DEFINE_MANY))));
              if (specPolicy === SpecPolicy.DEFINE_MANY_MERGED) {
                proto[name] = createMergedResultFunction(proto[name], property);
              } else if (specPolicy === SpecPolicy.DEFINE_MANY) {
                proto[name] = createChainedFunction(proto[name], property);
              }
            } else {
              proto[name] = property;
              if ("production" !== process.env.NODE_ENV) {
                if (typeof property === 'function' && spec.displayName) {
                  proto[name].displayName = spec.displayName + '_' + name;
                }
              }
            }
          }
        }
      }
    }
    function mixStaticSpecIntoComponent(Constructor, statics) {
      if (!statics) {
        return ;
      }
      for (var name in statics) {
        var property = statics[name];
        if (!statics.hasOwnProperty(name)) {
          continue;
        }
        var isReserved = name in RESERVED_SPEC_KEYS;
        ("production" !== process.env.NODE_ENV ? invariant(!isReserved, 'ReactClass: You are attempting to define a reserved ' + 'property, `%s`, that shouldn\'t be on the "statics" key. Define it ' + 'as an instance property instead; it will still be accessible on the ' + 'constructor.', name) : invariant(!isReserved));
        var isInherited = name in Constructor;
        ("production" !== process.env.NODE_ENV ? invariant(!isInherited, 'ReactClass: You are attempting to define ' + '`%s` on your component more than once. This conflict may be ' + 'due to a mixin.', name) : invariant(!isInherited));
        Constructor[name] = property;
      }
    }
    function mergeIntoWithNoDuplicateKeys(one, two) {
      ("production" !== process.env.NODE_ENV ? invariant(one && two && typeof one === 'object' && typeof two === 'object', 'mergeIntoWithNoDuplicateKeys(): Cannot merge non-objects.') : invariant(one && two && typeof one === 'object' && typeof two === 'object'));
      for (var key in two) {
        if (two.hasOwnProperty(key)) {
          ("production" !== process.env.NODE_ENV ? invariant(one[key] === undefined, 'mergeIntoWithNoDuplicateKeys(): ' + 'Tried to merge two objects with the same key: `%s`. This conflict ' + 'may be due to a mixin; in particular, this may be caused by two ' + 'getInitialState() or getDefaultProps() methods returning objects ' + 'with clashing keys.', key) : invariant(one[key] === undefined));
          one[key] = two[key];
        }
      }
      return one;
    }
    function createMergedResultFunction(one, two) {
      return function mergedResult() {
        var a = one.apply(this, arguments);
        var b = two.apply(this, arguments);
        if (a == null) {
          return b;
        } else if (b == null) {
          return a;
        }
        var c = {};
        mergeIntoWithNoDuplicateKeys(c, a);
        mergeIntoWithNoDuplicateKeys(c, b);
        return c;
      };
    }
    function createChainedFunction(one, two) {
      return function chainedFunction() {
        one.apply(this, arguments);
        two.apply(this, arguments);
      };
    }
    function bindAutoBindMethod(component, method) {
      var boundMethod = method.bind(component);
      if ("production" !== process.env.NODE_ENV) {
        boundMethod.__reactBoundContext = component;
        boundMethod.__reactBoundMethod = method;
        boundMethod.__reactBoundArguments = null;
        var componentName = component.constructor.displayName;
        var _bind = boundMethod.bind;
        boundMethod.bind = function(newThis) {
          for (var args = [],
              $__0 = 1,
              $__1 = arguments.length; $__0 < $__1; $__0++)
            args.push(arguments[$__0]);
          if (newThis !== component && newThis !== null) {
            ("production" !== process.env.NODE_ENV ? warning(false, 'bind(): React component methods may only be bound to the ' + 'component instance. See %s', componentName) : null);
          } else if (!args.length) {
            ("production" !== process.env.NODE_ENV ? warning(false, 'bind(): You are binding a component method to the component. ' + 'React does this for you automatically in a high-performance ' + 'way, so you can safely remove this call. See %s', componentName) : null);
            return boundMethod;
          }
          var reboundMethod = _bind.apply(boundMethod, arguments);
          reboundMethod.__reactBoundContext = component;
          reboundMethod.__reactBoundMethod = method;
          reboundMethod.__reactBoundArguments = args;
          return reboundMethod;
        };
      }
      return boundMethod;
    }
    function bindAutoBindMethods(component) {
      for (var autoBindKey in component.__reactAutoBindMap) {
        if (component.__reactAutoBindMap.hasOwnProperty(autoBindKey)) {
          var method = component.__reactAutoBindMap[autoBindKey];
          component[autoBindKey] = bindAutoBindMethod(component, ReactErrorUtils.guard(method, component.constructor.displayName + '.' + autoBindKey));
        }
      }
    }
    var typeDeprecationDescriptor = {
      enumerable: false,
      get: function() {
        var displayName = this.displayName || this.name || 'Component';
        ("production" !== process.env.NODE_ENV ? warning(false, '%s.type is deprecated. Use %s directly to access the class.', displayName, displayName) : null);
        Object.defineProperty(this, 'type', {value: this});
        return this;
      }
    };
    var ReactClassMixin = {
      replaceState: function(newState, callback) {
        ReactUpdateQueue.enqueueReplaceState(this, newState);
        if (callback) {
          ReactUpdateQueue.enqueueCallback(this, callback);
        }
      },
      isMounted: function() {
        if ("production" !== process.env.NODE_ENV) {
          var owner = ReactCurrentOwner.current;
          if (owner !== null) {
            ("production" !== process.env.NODE_ENV ? warning(owner._warnedAboutRefsInRender, '%s is accessing isMounted inside its render() function. ' + 'render() should be a pure function of props and state. It should ' + 'never access something that requires stale data from the previous ' + 'render, such as refs. Move this logic to componentDidMount and ' + 'componentDidUpdate instead.', owner.getName() || 'A component') : null);
            owner._warnedAboutRefsInRender = true;
          }
        }
        var internalInstance = ReactInstanceMap.get(this);
        return (internalInstance && internalInstance !== ReactLifeCycle.currentlyMountingInstance);
      },
      setProps: function(partialProps, callback) {
        ReactUpdateQueue.enqueueSetProps(this, partialProps);
        if (callback) {
          ReactUpdateQueue.enqueueCallback(this, callback);
        }
      },
      replaceProps: function(newProps, callback) {
        ReactUpdateQueue.enqueueReplaceProps(this, newProps);
        if (callback) {
          ReactUpdateQueue.enqueueCallback(this, callback);
        }
      }
    };
    var ReactClassComponent = function() {};
    assign(ReactClassComponent.prototype, ReactComponent.prototype, ReactClassMixin);
    var ReactClass = {
      createClass: function(spec) {
        var Constructor = function(props, context) {
          if ("production" !== process.env.NODE_ENV) {
            ("production" !== process.env.NODE_ENV ? warning(this instanceof Constructor, 'Something is calling a React component directly. Use a factory or ' + 'JSX instead. See: http://fb.me/react-legacyfactory') : null);
          }
          if (this.__reactAutoBindMap) {
            bindAutoBindMethods(this);
          }
          this.props = props;
          this.context = context;
          this.state = null;
          var initialState = this.getInitialState ? this.getInitialState() : null;
          if ("production" !== process.env.NODE_ENV) {
            if (typeof initialState === 'undefined' && this.getInitialState._isMockFunction) {
              initialState = null;
            }
          }
          ("production" !== process.env.NODE_ENV ? invariant(typeof initialState === 'object' && !Array.isArray(initialState), '%s.getInitialState(): must return an object or null', Constructor.displayName || 'ReactCompositeComponent') : invariant(typeof initialState === 'object' && !Array.isArray(initialState)));
          this.state = initialState;
        };
        Constructor.prototype = new ReactClassComponent();
        Constructor.prototype.constructor = Constructor;
        injectedMixins.forEach(mixSpecIntoComponent.bind(null, Constructor));
        mixSpecIntoComponent(Constructor, spec);
        if (Constructor.getDefaultProps) {
          Constructor.defaultProps = Constructor.getDefaultProps();
        }
        if ("production" !== process.env.NODE_ENV) {
          if (Constructor.getDefaultProps) {
            Constructor.getDefaultProps.isReactClassApproved = {};
          }
          if (Constructor.prototype.getInitialState) {
            Constructor.prototype.getInitialState.isReactClassApproved = {};
          }
        }
        ("production" !== process.env.NODE_ENV ? invariant(Constructor.prototype.render, 'createClass(...): Class specification must implement a `render` method.') : invariant(Constructor.prototype.render));
        if ("production" !== process.env.NODE_ENV) {
          ("production" !== process.env.NODE_ENV ? warning(!Constructor.prototype.componentShouldUpdate, '%s has a method called ' + 'componentShouldUpdate(). Did you mean shouldComponentUpdate()? ' + 'The name is phrased as a question because the function is ' + 'expected to return a value.', spec.displayName || 'A component') : null);
        }
        for (var methodName in ReactClassInterface) {
          if (!Constructor.prototype[methodName]) {
            Constructor.prototype[methodName] = null;
          }
        }
        Constructor.type = Constructor;
        if ("production" !== process.env.NODE_ENV) {
          try {
            Object.defineProperty(Constructor, 'type', typeDeprecationDescriptor);
          } catch (x) {}
        }
        return Constructor;
      },
      injection: {injectMixin: function(mixin) {
          injectedMixins.push(mixin);
        }}
    };
    module.exports = ReactClass;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOM", ["npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactElementValidator", "npm:react@0.13.2/lib/mapObject", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactElementValidator = require("npm:react@0.13.2/lib/ReactElementValidator");
    var mapObject = require("npm:react@0.13.2/lib/mapObject");
    function createDOMFactory(tag) {
      if ("production" !== process.env.NODE_ENV) {
        return ReactElementValidator.createFactory(tag);
      }
      return ReactElement.createFactory(tag);
    }
    var ReactDOM = mapObject({
      a: 'a',
      abbr: 'abbr',
      address: 'address',
      area: 'area',
      article: 'article',
      aside: 'aside',
      audio: 'audio',
      b: 'b',
      base: 'base',
      bdi: 'bdi',
      bdo: 'bdo',
      big: 'big',
      blockquote: 'blockquote',
      body: 'body',
      br: 'br',
      button: 'button',
      canvas: 'canvas',
      caption: 'caption',
      cite: 'cite',
      code: 'code',
      col: 'col',
      colgroup: 'colgroup',
      data: 'data',
      datalist: 'datalist',
      dd: 'dd',
      del: 'del',
      details: 'details',
      dfn: 'dfn',
      dialog: 'dialog',
      div: 'div',
      dl: 'dl',
      dt: 'dt',
      em: 'em',
      embed: 'embed',
      fieldset: 'fieldset',
      figcaption: 'figcaption',
      figure: 'figure',
      footer: 'footer',
      form: 'form',
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      h5: 'h5',
      h6: 'h6',
      head: 'head',
      header: 'header',
      hr: 'hr',
      html: 'html',
      i: 'i',
      iframe: 'iframe',
      img: 'img',
      input: 'input',
      ins: 'ins',
      kbd: 'kbd',
      keygen: 'keygen',
      label: 'label',
      legend: 'legend',
      li: 'li',
      link: 'link',
      main: 'main',
      map: 'map',
      mark: 'mark',
      menu: 'menu',
      menuitem: 'menuitem',
      meta: 'meta',
      meter: 'meter',
      nav: 'nav',
      noscript: 'noscript',
      object: 'object',
      ol: 'ol',
      optgroup: 'optgroup',
      option: 'option',
      output: 'output',
      p: 'p',
      param: 'param',
      picture: 'picture',
      pre: 'pre',
      progress: 'progress',
      q: 'q',
      rp: 'rp',
      rt: 'rt',
      ruby: 'ruby',
      s: 's',
      samp: 'samp',
      script: 'script',
      section: 'section',
      select: 'select',
      small: 'small',
      source: 'source',
      span: 'span',
      strong: 'strong',
      style: 'style',
      sub: 'sub',
      summary: 'summary',
      sup: 'sup',
      table: 'table',
      tbody: 'tbody',
      td: 'td',
      textarea: 'textarea',
      tfoot: 'tfoot',
      th: 'th',
      thead: 'thead',
      time: 'time',
      title: 'title',
      tr: 'tr',
      track: 'track',
      u: 'u',
      ul: 'ul',
      'var': 'var',
      video: 'video',
      wbr: 'wbr',
      circle: 'circle',
      defs: 'defs',
      ellipse: 'ellipse',
      g: 'g',
      line: 'line',
      linearGradient: 'linearGradient',
      mask: 'mask',
      path: 'path',
      pattern: 'pattern',
      polygon: 'polygon',
      polyline: 'polyline',
      radialGradient: 'radialGradient',
      rect: 'rect',
      stop: 'stop',
      svg: 'svg',
      text: 'text',
      tspan: 'tspan'
    }, createDOMFactory);
    module.exports = ReactDOM;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/quoteAttributeValueForBrowser", ["npm:react@0.13.2/lib/escapeTextContentForBrowser"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var escapeTextContentForBrowser = require("npm:react@0.13.2/lib/escapeTextContentForBrowser");
  function quoteAttributeValueForBrowser(value) {
    return '"' + escapeTextContentForBrowser(value) + '"';
  }
  module.exports = quoteAttributeValueForBrowser;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/camelizeStyleName", ["npm:react@0.13.2/lib/camelize"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var camelize = require("npm:react@0.13.2/lib/camelize");
  var msPattern = /^-ms-/;
  function camelizeStyleName(string) {
    return camelize(string.replace(msPattern, 'ms-'));
  }
  module.exports = camelizeStyleName;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/hyphenateStyleName", ["npm:react@0.13.2/lib/hyphenate"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var hyphenate = require("npm:react@0.13.2/lib/hyphenate");
  var msPattern = /^ms-/;
  function hyphenateStyleName(string) {
    return hyphenate(string).replace(msPattern, '-ms-');
  }
  module.exports = hyphenateStyleName;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/createArrayFromMixed", ["npm:react@0.13.2/lib/toArray"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var toArray = require("npm:react@0.13.2/lib/toArray");
  function hasArrayNature(obj) {
    return (!!obj && (typeof obj == 'object' || typeof obj == 'function') && ('length' in obj) && !('setInterval' in obj) && (typeof obj.nodeType != 'number') && (((Array.isArray(obj) || ('callee' in obj) || 'item' in obj))));
  }
  function createArrayFromMixed(obj) {
    if (!hasArrayNature(obj)) {
      return [obj];
    } else if (Array.isArray(obj)) {
      return obj.slice();
    } else {
      return toArray(obj);
    }
  }
  module.exports = createArrayFromMixed;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/setTextContent", ["npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react@0.13.2/lib/escapeTextContentForBrowser", "npm:react@0.13.2/lib/setInnerHTML"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
  var escapeTextContentForBrowser = require("npm:react@0.13.2/lib/escapeTextContentForBrowser");
  var setInnerHTML = require("npm:react@0.13.2/lib/setInnerHTML");
  var setTextContent = function(node, text) {
    node.textContent = text;
  };
  if (ExecutionEnvironment.canUseDOM) {
    if (!('textContent' in document.documentElement)) {
      setTextContent = function(node, text) {
        setInnerHTML(node, escapeTextContentForBrowser(text));
      };
    }
  }
  module.exports = setTextContent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/EventPluginHub", ["npm:react@0.13.2/lib/EventPluginRegistry", "npm:react@0.13.2/lib/EventPluginUtils", "npm:react@0.13.2/lib/accumulateInto", "npm:react@0.13.2/lib/forEachAccumulated", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var EventPluginRegistry = require("npm:react@0.13.2/lib/EventPluginRegistry");
    var EventPluginUtils = require("npm:react@0.13.2/lib/EventPluginUtils");
    var accumulateInto = require("npm:react@0.13.2/lib/accumulateInto");
    var forEachAccumulated = require("npm:react@0.13.2/lib/forEachAccumulated");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var listenerBank = {};
    var eventQueue = null;
    var executeDispatchesAndRelease = function(event) {
      if (event) {
        var executeDispatch = EventPluginUtils.executeDispatch;
        var PluginModule = EventPluginRegistry.getPluginModuleForEvent(event);
        if (PluginModule && PluginModule.executeDispatch) {
          executeDispatch = PluginModule.executeDispatch;
        }
        EventPluginUtils.executeDispatchesInOrder(event, executeDispatch);
        if (!event.isPersistent()) {
          event.constructor.release(event);
        }
      }
    };
    var InstanceHandle = null;
    function validateInstanceHandle() {
      var valid = InstanceHandle && InstanceHandle.traverseTwoPhase && InstanceHandle.traverseEnterLeave;
      ("production" !== process.env.NODE_ENV ? invariant(valid, 'InstanceHandle not injected before use!') : invariant(valid));
    }
    var EventPluginHub = {
      injection: {
        injectMount: EventPluginUtils.injection.injectMount,
        injectInstanceHandle: function(InjectedInstanceHandle) {
          InstanceHandle = InjectedInstanceHandle;
          if ("production" !== process.env.NODE_ENV) {
            validateInstanceHandle();
          }
        },
        getInstanceHandle: function() {
          if ("production" !== process.env.NODE_ENV) {
            validateInstanceHandle();
          }
          return InstanceHandle;
        },
        injectEventPluginOrder: EventPluginRegistry.injectEventPluginOrder,
        injectEventPluginsByName: EventPluginRegistry.injectEventPluginsByName
      },
      eventNameDispatchConfigs: EventPluginRegistry.eventNameDispatchConfigs,
      registrationNameModules: EventPluginRegistry.registrationNameModules,
      putListener: function(id, registrationName, listener) {
        ("production" !== process.env.NODE_ENV ? invariant(!listener || typeof listener === 'function', 'Expected %s listener to be a function, instead got type %s', registrationName, typeof listener) : invariant(!listener || typeof listener === 'function'));
        var bankForRegistrationName = listenerBank[registrationName] || (listenerBank[registrationName] = {});
        bankForRegistrationName[id] = listener;
      },
      getListener: function(id, registrationName) {
        var bankForRegistrationName = listenerBank[registrationName];
        return bankForRegistrationName && bankForRegistrationName[id];
      },
      deleteListener: function(id, registrationName) {
        var bankForRegistrationName = listenerBank[registrationName];
        if (bankForRegistrationName) {
          delete bankForRegistrationName[id];
        }
      },
      deleteAllListeners: function(id) {
        for (var registrationName in listenerBank) {
          delete listenerBank[registrationName][id];
        }
      },
      extractEvents: function(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent) {
        var events;
        var plugins = EventPluginRegistry.plugins;
        for (var i = 0,
            l = plugins.length; i < l; i++) {
          var possiblePlugin = plugins[i];
          if (possiblePlugin) {
            var extractedEvents = possiblePlugin.extractEvents(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent);
            if (extractedEvents) {
              events = accumulateInto(events, extractedEvents);
            }
          }
        }
        return events;
      },
      enqueueEvents: function(events) {
        if (events) {
          eventQueue = accumulateInto(eventQueue, events);
        }
      },
      processEventQueue: function() {
        var processingEventQueue = eventQueue;
        eventQueue = null;
        forEachAccumulated(processingEventQueue, executeDispatchesAndRelease);
        ("production" !== process.env.NODE_ENV ? invariant(!eventQueue, 'processEventQueue(): Additional events were enqueued while processing ' + 'an event queue. Support for this has not yet been implemented.') : invariant(!eventQueue));
      },
      __purge: function() {
        listenerBank = {};
      },
      __getListenerBank: function() {
        return listenerBank;
      }
    };
    module.exports = EventPluginHub;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactMarkupChecksum", ["npm:react@0.13.2/lib/adler32"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var adler32 = require("npm:react@0.13.2/lib/adler32");
  var ReactMarkupChecksum = {
    CHECKSUM_ATTR_NAME: 'data-react-checksum',
    addChecksumToMarkup: function(markup) {
      var checksum = adler32(markup);
      return markup.replace('>', ' ' + ReactMarkupChecksum.CHECKSUM_ATTR_NAME + '="' + checksum + '">');
    },
    canReuseMarkup: function(markup, element) {
      var existingChecksum = element.getAttribute(ReactMarkupChecksum.CHECKSUM_ATTR_NAME);
      existingChecksum = existingChecksum && parseInt(existingChecksum, 10);
      var markupChecksum = adler32(markup);
      return markupChecksum === existingChecksum;
    }
  };
  module.exports = ReactMarkupChecksum;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/isTextNode", ["npm:react@0.13.2/lib/isNode"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var isNode = require("npm:react@0.13.2/lib/isNode");
  function isTextNode(object) {
    return isNode(object) && object.nodeType == 3;
  }
  module.exports = isTextNode;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactCompositeComponent", ["npm:react@0.13.2/lib/ReactComponentEnvironment", "npm:react@0.13.2/lib/ReactContext", "npm:react@0.13.2/lib/ReactCurrentOwner", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactElementValidator", "npm:react@0.13.2/lib/ReactInstanceMap", "npm:react@0.13.2/lib/ReactLifeCycle", "npm:react@0.13.2/lib/ReactNativeComponent", "npm:react@0.13.2/lib/ReactPerf", "npm:react@0.13.2/lib/ReactPropTypeLocations", "npm:react@0.13.2/lib/ReactPropTypeLocationNames", "npm:react@0.13.2/lib/ReactReconciler", "npm:react@0.13.2/lib/ReactUpdates", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/emptyObject", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/shouldUpdateReactComponent", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactComponentEnvironment = require("npm:react@0.13.2/lib/ReactComponentEnvironment");
    var ReactContext = require("npm:react@0.13.2/lib/ReactContext");
    var ReactCurrentOwner = require("npm:react@0.13.2/lib/ReactCurrentOwner");
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactElementValidator = require("npm:react@0.13.2/lib/ReactElementValidator");
    var ReactInstanceMap = require("npm:react@0.13.2/lib/ReactInstanceMap");
    var ReactLifeCycle = require("npm:react@0.13.2/lib/ReactLifeCycle");
    var ReactNativeComponent = require("npm:react@0.13.2/lib/ReactNativeComponent");
    var ReactPerf = require("npm:react@0.13.2/lib/ReactPerf");
    var ReactPropTypeLocations = require("npm:react@0.13.2/lib/ReactPropTypeLocations");
    var ReactPropTypeLocationNames = require("npm:react@0.13.2/lib/ReactPropTypeLocationNames");
    var ReactReconciler = require("npm:react@0.13.2/lib/ReactReconciler");
    var ReactUpdates = require("npm:react@0.13.2/lib/ReactUpdates");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var emptyObject = require("npm:react@0.13.2/lib/emptyObject");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var shouldUpdateReactComponent = require("npm:react@0.13.2/lib/shouldUpdateReactComponent");
    var warning = require("npm:react@0.13.2/lib/warning");
    function getDeclarationErrorAddendum(component) {
      var owner = component._currentElement._owner || null;
      if (owner) {
        var name = owner.getName();
        if (name) {
          return ' Check the render method of `' + name + '`.';
        }
      }
      return '';
    }
    var nextMountID = 1;
    var ReactCompositeComponentMixin = {
      construct: function(element) {
        this._currentElement = element;
        this._rootNodeID = null;
        this._instance = null;
        this._pendingElement = null;
        this._pendingStateQueue = null;
        this._pendingReplaceState = false;
        this._pendingForceUpdate = false;
        this._renderedComponent = null;
        this._context = null;
        this._mountOrder = 0;
        this._isTopLevel = false;
        this._pendingCallbacks = null;
      },
      mountComponent: function(rootID, transaction, context) {
        this._context = context;
        this._mountOrder = nextMountID++;
        this._rootNodeID = rootID;
        var publicProps = this._processProps(this._currentElement.props);
        var publicContext = this._processContext(this._currentElement._context);
        var Component = ReactNativeComponent.getComponentClassForElement(this._currentElement);
        var inst = new Component(publicProps, publicContext);
        if ("production" !== process.env.NODE_ENV) {
          ("production" !== process.env.NODE_ENV ? warning(inst.render != null, '%s(...): No `render` method found on the returned component ' + 'instance: you may have forgotten to define `render` in your ' + 'component or you may have accidentally tried to render an element ' + 'whose type is a function that isn\'t a React component.', Component.displayName || Component.name || 'Component') : null);
        }
        inst.props = publicProps;
        inst.context = publicContext;
        inst.refs = emptyObject;
        this._instance = inst;
        ReactInstanceMap.set(inst, this);
        if ("production" !== process.env.NODE_ENV) {
          this._warnIfContextsDiffer(this._currentElement._context, context);
        }
        if ("production" !== process.env.NODE_ENV) {
          ("production" !== process.env.NODE_ENV ? warning(!inst.getInitialState || inst.getInitialState.isReactClassApproved, 'getInitialState was defined on %s, a plain JavaScript class. ' + 'This is only supported for classes created using React.createClass. ' + 'Did you mean to define a state property instead?', this.getName() || 'a component') : null);
          ("production" !== process.env.NODE_ENV ? warning(!inst.getDefaultProps || inst.getDefaultProps.isReactClassApproved, 'getDefaultProps was defined on %s, a plain JavaScript class. ' + 'This is only supported for classes created using React.createClass. ' + 'Use a static property to define defaultProps instead.', this.getName() || 'a component') : null);
          ("production" !== process.env.NODE_ENV ? warning(!inst.propTypes, 'propTypes was defined as an instance property on %s. Use a static ' + 'property to define propTypes instead.', this.getName() || 'a component') : null);
          ("production" !== process.env.NODE_ENV ? warning(!inst.contextTypes, 'contextTypes was defined as an instance property on %s. Use a ' + 'static property to define contextTypes instead.', this.getName() || 'a component') : null);
          ("production" !== process.env.NODE_ENV ? warning(typeof inst.componentShouldUpdate !== 'function', '%s has a method called ' + 'componentShouldUpdate(). Did you mean shouldComponentUpdate()? ' + 'The name is phrased as a question because the function is ' + 'expected to return a value.', (this.getName() || 'A component')) : null);
        }
        var initialState = inst.state;
        if (initialState === undefined) {
          inst.state = initialState = null;
        }
        ("production" !== process.env.NODE_ENV ? invariant(typeof initialState === 'object' && !Array.isArray(initialState), '%s.state: must be set to an object or null', this.getName() || 'ReactCompositeComponent') : invariant(typeof initialState === 'object' && !Array.isArray(initialState)));
        this._pendingStateQueue = null;
        this._pendingReplaceState = false;
        this._pendingForceUpdate = false;
        var renderedElement;
        var previouslyMounting = ReactLifeCycle.currentlyMountingInstance;
        ReactLifeCycle.currentlyMountingInstance = this;
        try {
          if (inst.componentWillMount) {
            inst.componentWillMount();
            if (this._pendingStateQueue) {
              inst.state = this._processPendingState(inst.props, inst.context);
            }
          }
          renderedElement = this._renderValidatedComponent();
        } finally {
          ReactLifeCycle.currentlyMountingInstance = previouslyMounting;
        }
        this._renderedComponent = this._instantiateReactComponent(renderedElement, this._currentElement.type);
        var markup = ReactReconciler.mountComponent(this._renderedComponent, rootID, transaction, this._processChildContext(context));
        if (inst.componentDidMount) {
          transaction.getReactMountReady().enqueue(inst.componentDidMount, inst);
        }
        return markup;
      },
      unmountComponent: function() {
        var inst = this._instance;
        if (inst.componentWillUnmount) {
          var previouslyUnmounting = ReactLifeCycle.currentlyUnmountingInstance;
          ReactLifeCycle.currentlyUnmountingInstance = this;
          try {
            inst.componentWillUnmount();
          } finally {
            ReactLifeCycle.currentlyUnmountingInstance = previouslyUnmounting;
          }
        }
        ReactReconciler.unmountComponent(this._renderedComponent);
        this._renderedComponent = null;
        this._pendingStateQueue = null;
        this._pendingReplaceState = false;
        this._pendingForceUpdate = false;
        this._pendingCallbacks = null;
        this._pendingElement = null;
        this._context = null;
        this._rootNodeID = null;
        ReactInstanceMap.remove(inst);
      },
      _setPropsInternal: function(partialProps, callback) {
        var element = this._pendingElement || this._currentElement;
        this._pendingElement = ReactElement.cloneAndReplaceProps(element, assign({}, element.props, partialProps));
        ReactUpdates.enqueueUpdate(this, callback);
      },
      _maskContext: function(context) {
        var maskedContext = null;
        if (typeof this._currentElement.type === 'string') {
          return emptyObject;
        }
        var contextTypes = this._currentElement.type.contextTypes;
        if (!contextTypes) {
          return emptyObject;
        }
        maskedContext = {};
        for (var contextName in contextTypes) {
          maskedContext[contextName] = context[contextName];
        }
        return maskedContext;
      },
      _processContext: function(context) {
        var maskedContext = this._maskContext(context);
        if ("production" !== process.env.NODE_ENV) {
          var Component = ReactNativeComponent.getComponentClassForElement(this._currentElement);
          if (Component.contextTypes) {
            this._checkPropTypes(Component.contextTypes, maskedContext, ReactPropTypeLocations.context);
          }
        }
        return maskedContext;
      },
      _processChildContext: function(currentContext) {
        var inst = this._instance;
        var childContext = inst.getChildContext && inst.getChildContext();
        if (childContext) {
          ("production" !== process.env.NODE_ENV ? invariant(typeof inst.constructor.childContextTypes === 'object', '%s.getChildContext(): childContextTypes must be defined in order to ' + 'use getChildContext().', this.getName() || 'ReactCompositeComponent') : invariant(typeof inst.constructor.childContextTypes === 'object'));
          if ("production" !== process.env.NODE_ENV) {
            this._checkPropTypes(inst.constructor.childContextTypes, childContext, ReactPropTypeLocations.childContext);
          }
          for (var name in childContext) {
            ("production" !== process.env.NODE_ENV ? invariant(name in inst.constructor.childContextTypes, '%s.getChildContext(): key "%s" is not defined in childContextTypes.', this.getName() || 'ReactCompositeComponent', name) : invariant(name in inst.constructor.childContextTypes));
          }
          return assign({}, currentContext, childContext);
        }
        return currentContext;
      },
      _processProps: function(newProps) {
        if ("production" !== process.env.NODE_ENV) {
          var Component = ReactNativeComponent.getComponentClassForElement(this._currentElement);
          if (Component.propTypes) {
            this._checkPropTypes(Component.propTypes, newProps, ReactPropTypeLocations.prop);
          }
        }
        return newProps;
      },
      _checkPropTypes: function(propTypes, props, location) {
        var componentName = this.getName();
        for (var propName in propTypes) {
          if (propTypes.hasOwnProperty(propName)) {
            var error;
            try {
              ("production" !== process.env.NODE_ENV ? invariant(typeof propTypes[propName] === 'function', '%s: %s type `%s` is invalid; it must be a function, usually ' + 'from React.PropTypes.', componentName || 'React class', ReactPropTypeLocationNames[location], propName) : invariant(typeof propTypes[propName] === 'function'));
              error = propTypes[propName](props, propName, componentName, location);
            } catch (ex) {
              error = ex;
            }
            if (error instanceof Error) {
              var addendum = getDeclarationErrorAddendum(this);
              if (location === ReactPropTypeLocations.prop) {
                ("production" !== process.env.NODE_ENV ? warning(false, 'Failed Composite propType: %s%s', error.message, addendum) : null);
              } else {
                ("production" !== process.env.NODE_ENV ? warning(false, 'Failed Context Types: %s%s', error.message, addendum) : null);
              }
            }
          }
        }
      },
      receiveComponent: function(nextElement, transaction, nextContext) {
        var prevElement = this._currentElement;
        var prevContext = this._context;
        this._pendingElement = null;
        this.updateComponent(transaction, prevElement, nextElement, prevContext, nextContext);
      },
      performUpdateIfNecessary: function(transaction) {
        if (this._pendingElement != null) {
          ReactReconciler.receiveComponent(this, this._pendingElement || this._currentElement, transaction, this._context);
        }
        if (this._pendingStateQueue !== null || this._pendingForceUpdate) {
          if ("production" !== process.env.NODE_ENV) {
            ReactElementValidator.checkAndWarnForMutatedProps(this._currentElement);
          }
          this.updateComponent(transaction, this._currentElement, this._currentElement, this._context, this._context);
        }
      },
      _warnIfContextsDiffer: function(ownerBasedContext, parentBasedContext) {
        ownerBasedContext = this._maskContext(ownerBasedContext);
        parentBasedContext = this._maskContext(parentBasedContext);
        var parentKeys = Object.keys(parentBasedContext).sort();
        var displayName = this.getName() || 'ReactCompositeComponent';
        for (var i = 0; i < parentKeys.length; i++) {
          var key = parentKeys[i];
          ("production" !== process.env.NODE_ENV ? warning(ownerBasedContext[key] === parentBasedContext[key], 'owner-based and parent-based contexts differ ' + '(values: `%s` vs `%s`) for key (%s) while mounting %s ' + '(see: http://fb.me/react-context-by-parent)', ownerBasedContext[key], parentBasedContext[key], key, displayName) : null);
        }
      },
      updateComponent: function(transaction, prevParentElement, nextParentElement, prevUnmaskedContext, nextUnmaskedContext) {
        var inst = this._instance;
        var nextContext = inst.context;
        var nextProps = inst.props;
        if (prevParentElement !== nextParentElement) {
          nextContext = this._processContext(nextParentElement._context);
          nextProps = this._processProps(nextParentElement.props);
          if ("production" !== process.env.NODE_ENV) {
            if (nextUnmaskedContext != null) {
              this._warnIfContextsDiffer(nextParentElement._context, nextUnmaskedContext);
            }
          }
          if (inst.componentWillReceiveProps) {
            inst.componentWillReceiveProps(nextProps, nextContext);
          }
        }
        var nextState = this._processPendingState(nextProps, nextContext);
        var shouldUpdate = this._pendingForceUpdate || !inst.shouldComponentUpdate || inst.shouldComponentUpdate(nextProps, nextState, nextContext);
        if ("production" !== process.env.NODE_ENV) {
          ("production" !== process.env.NODE_ENV ? warning(typeof shouldUpdate !== 'undefined', '%s.shouldComponentUpdate(): Returned undefined instead of a ' + 'boolean value. Make sure to return true or false.', this.getName() || 'ReactCompositeComponent') : null);
        }
        if (shouldUpdate) {
          this._pendingForceUpdate = false;
          this._performComponentUpdate(nextParentElement, nextProps, nextState, nextContext, transaction, nextUnmaskedContext);
        } else {
          this._currentElement = nextParentElement;
          this._context = nextUnmaskedContext;
          inst.props = nextProps;
          inst.state = nextState;
          inst.context = nextContext;
        }
      },
      _processPendingState: function(props, context) {
        var inst = this._instance;
        var queue = this._pendingStateQueue;
        var replace = this._pendingReplaceState;
        this._pendingReplaceState = false;
        this._pendingStateQueue = null;
        if (!queue) {
          return inst.state;
        }
        var nextState = assign({}, replace ? queue[0] : inst.state);
        for (var i = replace ? 1 : 0; i < queue.length; i++) {
          var partial = queue[i];
          assign(nextState, typeof partial === 'function' ? partial.call(inst, nextState, props, context) : partial);
        }
        return nextState;
      },
      _performComponentUpdate: function(nextElement, nextProps, nextState, nextContext, transaction, unmaskedContext) {
        var inst = this._instance;
        var prevProps = inst.props;
        var prevState = inst.state;
        var prevContext = inst.context;
        if (inst.componentWillUpdate) {
          inst.componentWillUpdate(nextProps, nextState, nextContext);
        }
        this._currentElement = nextElement;
        this._context = unmaskedContext;
        inst.props = nextProps;
        inst.state = nextState;
        inst.context = nextContext;
        this._updateRenderedComponent(transaction, unmaskedContext);
        if (inst.componentDidUpdate) {
          transaction.getReactMountReady().enqueue(inst.componentDidUpdate.bind(inst, prevProps, prevState, prevContext), inst);
        }
      },
      _updateRenderedComponent: function(transaction, context) {
        var prevComponentInstance = this._renderedComponent;
        var prevRenderedElement = prevComponentInstance._currentElement;
        var nextRenderedElement = this._renderValidatedComponent();
        if (shouldUpdateReactComponent(prevRenderedElement, nextRenderedElement)) {
          ReactReconciler.receiveComponent(prevComponentInstance, nextRenderedElement, transaction, this._processChildContext(context));
        } else {
          var thisID = this._rootNodeID;
          var prevComponentID = prevComponentInstance._rootNodeID;
          ReactReconciler.unmountComponent(prevComponentInstance);
          this._renderedComponent = this._instantiateReactComponent(nextRenderedElement, this._currentElement.type);
          var nextMarkup = ReactReconciler.mountComponent(this._renderedComponent, thisID, transaction, this._processChildContext(context));
          this._replaceNodeWithMarkupByID(prevComponentID, nextMarkup);
        }
      },
      _replaceNodeWithMarkupByID: function(prevComponentID, nextMarkup) {
        ReactComponentEnvironment.replaceNodeWithMarkupByID(prevComponentID, nextMarkup);
      },
      _renderValidatedComponentWithoutOwnerOrContext: function() {
        var inst = this._instance;
        var renderedComponent = inst.render();
        if ("production" !== process.env.NODE_ENV) {
          if (typeof renderedComponent === 'undefined' && inst.render._isMockFunction) {
            renderedComponent = null;
          }
        }
        return renderedComponent;
      },
      _renderValidatedComponent: function() {
        var renderedComponent;
        var previousContext = ReactContext.current;
        ReactContext.current = this._processChildContext(this._currentElement._context);
        ReactCurrentOwner.current = this;
        try {
          renderedComponent = this._renderValidatedComponentWithoutOwnerOrContext();
        } finally {
          ReactContext.current = previousContext;
          ReactCurrentOwner.current = null;
        }
        ("production" !== process.env.NODE_ENV ? invariant(renderedComponent === null || renderedComponent === false || ReactElement.isValidElement(renderedComponent), '%s.render(): A valid ReactComponent must be returned. You may have ' + 'returned undefined, an array or some other invalid object.', this.getName() || 'ReactCompositeComponent') : invariant(renderedComponent === null || renderedComponent === false || ReactElement.isValidElement(renderedComponent)));
        return renderedComponent;
      },
      attachRef: function(ref, component) {
        var inst = this.getPublicInstance();
        var refs = inst.refs === emptyObject ? (inst.refs = {}) : inst.refs;
        refs[ref] = component.getPublicInstance();
      },
      detachRef: function(ref) {
        var refs = this.getPublicInstance().refs;
        delete refs[ref];
      },
      getName: function() {
        var type = this._currentElement.type;
        var constructor = this._instance && this._instance.constructor;
        return (type.displayName || (constructor && constructor.displayName) || type.name || (constructor && constructor.name) || null);
      },
      getPublicInstance: function() {
        return this._instance;
      },
      _instantiateReactComponent: null
    };
    ReactPerf.measureMethods(ReactCompositeComponentMixin, 'ReactCompositeComponent', {
      mountComponent: 'mountComponent',
      updateComponent: 'updateComponent',
      _renderValidatedComponent: '_renderValidatedComponent'
    });
    var ReactCompositeComponent = {Mixin: ReactCompositeComponentMixin};
    module.exports = ReactCompositeComponent;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactChildReconciler", ["npm:react@0.13.2/lib/ReactReconciler", "npm:react@0.13.2/lib/flattenChildren", "npm:react@0.13.2/lib/instantiateReactComponent", "npm:react@0.13.2/lib/shouldUpdateReactComponent"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ReactReconciler = require("npm:react@0.13.2/lib/ReactReconciler");
  var flattenChildren = require("npm:react@0.13.2/lib/flattenChildren");
  var instantiateReactComponent = require("npm:react@0.13.2/lib/instantiateReactComponent");
  var shouldUpdateReactComponent = require("npm:react@0.13.2/lib/shouldUpdateReactComponent");
  var ReactChildReconciler = {
    instantiateChildren: function(nestedChildNodes, transaction, context) {
      var children = flattenChildren(nestedChildNodes);
      for (var name in children) {
        if (children.hasOwnProperty(name)) {
          var child = children[name];
          var childInstance = instantiateReactComponent(child, null);
          children[name] = childInstance;
        }
      }
      return children;
    },
    updateChildren: function(prevChildren, nextNestedChildNodes, transaction, context) {
      var nextChildren = flattenChildren(nextNestedChildNodes);
      if (!nextChildren && !prevChildren) {
        return null;
      }
      var name;
      for (name in nextChildren) {
        if (!nextChildren.hasOwnProperty(name)) {
          continue;
        }
        var prevChild = prevChildren && prevChildren[name];
        var prevElement = prevChild && prevChild._currentElement;
        var nextElement = nextChildren[name];
        if (shouldUpdateReactComponent(prevElement, nextElement)) {
          ReactReconciler.receiveComponent(prevChild, nextElement, transaction, context);
          nextChildren[name] = prevChild;
        } else {
          if (prevChild) {
            ReactReconciler.unmountComponent(prevChild, name);
          }
          var nextChildInstance = instantiateReactComponent(nextElement, null);
          nextChildren[name] = nextChildInstance;
        }
      }
      for (name in prevChildren) {
        if (prevChildren.hasOwnProperty(name) && !(nextChildren && nextChildren.hasOwnProperty(name))) {
          ReactReconciler.unmountComponent(prevChildren[name]);
        }
      }
      return nextChildren;
    },
    unmountChildren: function(renderedChildren) {
      for (var name in renderedChildren) {
        var renderedChild = renderedChildren[name];
        ReactReconciler.unmountComponent(renderedChild);
      }
    }
  };
  module.exports = ReactChildReconciler;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/FallbackCompositionState", ["npm:react@0.13.2/lib/PooledClass", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/getTextContentAccessor"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var PooledClass = require("npm:react@0.13.2/lib/PooledClass");
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var getTextContentAccessor = require("npm:react@0.13.2/lib/getTextContentAccessor");
  function FallbackCompositionState(root) {
    this._root = root;
    this._startText = this.getText();
    this._fallbackText = null;
  }
  assign(FallbackCompositionState.prototype, {
    getText: function() {
      if ('value' in this._root) {
        return this._root.value;
      }
      return this._root[getTextContentAccessor()];
    },
    getData: function() {
      if (this._fallbackText) {
        return this._fallbackText;
      }
      var start;
      var startValue = this._startText;
      var startLength = startValue.length;
      var end;
      var endValue = this.getText();
      var endLength = endValue.length;
      for (start = 0; start < startLength; start++) {
        if (startValue[start] !== endValue[start]) {
          break;
        }
      }
      var minEnd = startLength - start;
      for (end = 1; end <= minEnd; end++) {
        if (startValue[startLength - end] !== endValue[endLength - end]) {
          break;
        }
      }
      var sliceTail = end > 1 ? 1 - end : undefined;
      this._fallbackText = endValue.slice(start, sliceTail);
      return this._fallbackText;
    }
  });
  PooledClass.addPoolingTo(FallbackCompositionState);
  module.exports = FallbackCompositionState;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SyntheticEvent", ["npm:react@0.13.2/lib/PooledClass", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/emptyFunction", "npm:react@0.13.2/lib/getEventTarget"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var PooledClass = require("npm:react@0.13.2/lib/PooledClass");
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var emptyFunction = require("npm:react@0.13.2/lib/emptyFunction");
  var getEventTarget = require("npm:react@0.13.2/lib/getEventTarget");
  var EventInterface = {
    type: null,
    target: getEventTarget,
    currentTarget: emptyFunction.thatReturnsNull,
    eventPhase: null,
    bubbles: null,
    cancelable: null,
    timeStamp: function(event) {
      return event.timeStamp || Date.now();
    },
    defaultPrevented: null,
    isTrusted: null
  };
  function SyntheticEvent(dispatchConfig, dispatchMarker, nativeEvent) {
    this.dispatchConfig = dispatchConfig;
    this.dispatchMarker = dispatchMarker;
    this.nativeEvent = nativeEvent;
    var Interface = this.constructor.Interface;
    for (var propName in Interface) {
      if (!Interface.hasOwnProperty(propName)) {
        continue;
      }
      var normalize = Interface[propName];
      if (normalize) {
        this[propName] = normalize(nativeEvent);
      } else {
        this[propName] = nativeEvent[propName];
      }
    }
    var defaultPrevented = nativeEvent.defaultPrevented != null ? nativeEvent.defaultPrevented : nativeEvent.returnValue === false;
    if (defaultPrevented) {
      this.isDefaultPrevented = emptyFunction.thatReturnsTrue;
    } else {
      this.isDefaultPrevented = emptyFunction.thatReturnsFalse;
    }
    this.isPropagationStopped = emptyFunction.thatReturnsFalse;
  }
  assign(SyntheticEvent.prototype, {
    preventDefault: function() {
      this.defaultPrevented = true;
      var event = this.nativeEvent;
      if (event.preventDefault) {
        event.preventDefault();
      } else {
        event.returnValue = false;
      }
      this.isDefaultPrevented = emptyFunction.thatReturnsTrue;
    },
    stopPropagation: function() {
      var event = this.nativeEvent;
      if (event.stopPropagation) {
        event.stopPropagation();
      } else {
        event.cancelBubble = true;
      }
      this.isPropagationStopped = emptyFunction.thatReturnsTrue;
    },
    persist: function() {
      this.isPersistent = emptyFunction.thatReturnsTrue;
    },
    isPersistent: emptyFunction.thatReturnsFalse,
    destructor: function() {
      var Interface = this.constructor.Interface;
      for (var propName in Interface) {
        this[propName] = null;
      }
      this.dispatchConfig = null;
      this.dispatchMarker = null;
      this.nativeEvent = null;
    }
  });
  SyntheticEvent.Interface = EventInterface;
  SyntheticEvent.augmentClass = function(Class, Interface) {
    var Super = this;
    var prototype = Object.create(Super.prototype);
    assign(prototype, Class.prototype);
    Class.prototype = prototype;
    Class.prototype.constructor = Class;
    Class.Interface = assign({}, Super.Interface, Interface);
    Class.augmentClass = Super.augmentClass;
    PooledClass.addPoolingTo(Class, PooledClass.threeArgumentPooler);
  };
  PooledClass.addPoolingTo(SyntheticEvent, PooledClass.threeArgumentPooler);
  module.exports = SyntheticEvent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ChangeEventPlugin", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/EventPluginHub", "npm:react@0.13.2/lib/EventPropagators", "npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react@0.13.2/lib/ReactUpdates", "npm:react@0.13.2/lib/SyntheticEvent", "npm:react@0.13.2/lib/isEventSupported", "npm:react@0.13.2/lib/isTextInputElement", "npm:react@0.13.2/lib/keyOf", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
    var EventPluginHub = require("npm:react@0.13.2/lib/EventPluginHub");
    var EventPropagators = require("npm:react@0.13.2/lib/EventPropagators");
    var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
    var ReactUpdates = require("npm:react@0.13.2/lib/ReactUpdates");
    var SyntheticEvent = require("npm:react@0.13.2/lib/SyntheticEvent");
    var isEventSupported = require("npm:react@0.13.2/lib/isEventSupported");
    var isTextInputElement = require("npm:react@0.13.2/lib/isTextInputElement");
    var keyOf = require("npm:react@0.13.2/lib/keyOf");
    var topLevelTypes = EventConstants.topLevelTypes;
    var eventTypes = {change: {
        phasedRegistrationNames: {
          bubbled: keyOf({onChange: null}),
          captured: keyOf({onChangeCapture: null})
        },
        dependencies: [topLevelTypes.topBlur, topLevelTypes.topChange, topLevelTypes.topClick, topLevelTypes.topFocus, topLevelTypes.topInput, topLevelTypes.topKeyDown, topLevelTypes.topKeyUp, topLevelTypes.topSelectionChange]
      }};
    var activeElement = null;
    var activeElementID = null;
    var activeElementValue = null;
    var activeElementValueProp = null;
    function shouldUseChangeEvent(elem) {
      return (elem.nodeName === 'SELECT' || (elem.nodeName === 'INPUT' && elem.type === 'file'));
    }
    var doesChangeEventBubble = false;
    if (ExecutionEnvironment.canUseDOM) {
      doesChangeEventBubble = isEventSupported('change') && ((!('documentMode' in document) || document.documentMode > 8));
    }
    function manualDispatchChangeEvent(nativeEvent) {
      var event = SyntheticEvent.getPooled(eventTypes.change, activeElementID, nativeEvent);
      EventPropagators.accumulateTwoPhaseDispatches(event);
      ReactUpdates.batchedUpdates(runEventInBatch, event);
    }
    function runEventInBatch(event) {
      EventPluginHub.enqueueEvents(event);
      EventPluginHub.processEventQueue();
    }
    function startWatchingForChangeEventIE8(target, targetID) {
      activeElement = target;
      activeElementID = targetID;
      activeElement.attachEvent('onchange', manualDispatchChangeEvent);
    }
    function stopWatchingForChangeEventIE8() {
      if (!activeElement) {
        return ;
      }
      activeElement.detachEvent('onchange', manualDispatchChangeEvent);
      activeElement = null;
      activeElementID = null;
    }
    function getTargetIDForChangeEvent(topLevelType, topLevelTarget, topLevelTargetID) {
      if (topLevelType === topLevelTypes.topChange) {
        return topLevelTargetID;
      }
    }
    function handleEventsForChangeEventIE8(topLevelType, topLevelTarget, topLevelTargetID) {
      if (topLevelType === topLevelTypes.topFocus) {
        stopWatchingForChangeEventIE8();
        startWatchingForChangeEventIE8(topLevelTarget, topLevelTargetID);
      } else if (topLevelType === topLevelTypes.topBlur) {
        stopWatchingForChangeEventIE8();
      }
    }
    var isInputEventSupported = false;
    if (ExecutionEnvironment.canUseDOM) {
      isInputEventSupported = isEventSupported('input') && ((!('documentMode' in document) || document.documentMode > 9));
    }
    var newValueProp = {
      get: function() {
        return activeElementValueProp.get.call(this);
      },
      set: function(val) {
        activeElementValue = '' + val;
        activeElementValueProp.set.call(this, val);
      }
    };
    function startWatchingForValueChange(target, targetID) {
      activeElement = target;
      activeElementID = targetID;
      activeElementValue = target.value;
      activeElementValueProp = Object.getOwnPropertyDescriptor(target.constructor.prototype, 'value');
      Object.defineProperty(activeElement, 'value', newValueProp);
      activeElement.attachEvent('onpropertychange', handlePropertyChange);
    }
    function stopWatchingForValueChange() {
      if (!activeElement) {
        return ;
      }
      delete activeElement.value;
      activeElement.detachEvent('onpropertychange', handlePropertyChange);
      activeElement = null;
      activeElementID = null;
      activeElementValue = null;
      activeElementValueProp = null;
    }
    function handlePropertyChange(nativeEvent) {
      if (nativeEvent.propertyName !== 'value') {
        return ;
      }
      var value = nativeEvent.srcElement.value;
      if (value === activeElementValue) {
        return ;
      }
      activeElementValue = value;
      manualDispatchChangeEvent(nativeEvent);
    }
    function getTargetIDForInputEvent(topLevelType, topLevelTarget, topLevelTargetID) {
      if (topLevelType === topLevelTypes.topInput) {
        return topLevelTargetID;
      }
    }
    function handleEventsForInputEventIE(topLevelType, topLevelTarget, topLevelTargetID) {
      if (topLevelType === topLevelTypes.topFocus) {
        stopWatchingForValueChange();
        startWatchingForValueChange(topLevelTarget, topLevelTargetID);
      } else if (topLevelType === topLevelTypes.topBlur) {
        stopWatchingForValueChange();
      }
    }
    function getTargetIDForInputEventIE(topLevelType, topLevelTarget, topLevelTargetID) {
      if (topLevelType === topLevelTypes.topSelectionChange || topLevelType === topLevelTypes.topKeyUp || topLevelType === topLevelTypes.topKeyDown) {
        if (activeElement && activeElement.value !== activeElementValue) {
          activeElementValue = activeElement.value;
          return activeElementID;
        }
      }
    }
    function shouldUseClickEvent(elem) {
      return (elem.nodeName === 'INPUT' && (elem.type === 'checkbox' || elem.type === 'radio'));
    }
    function getTargetIDForClickEvent(topLevelType, topLevelTarget, topLevelTargetID) {
      if (topLevelType === topLevelTypes.topClick) {
        return topLevelTargetID;
      }
    }
    var ChangeEventPlugin = {
      eventTypes: eventTypes,
      extractEvents: function(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent) {
        var getTargetIDFunc,
            handleEventFunc;
        if (shouldUseChangeEvent(topLevelTarget)) {
          if (doesChangeEventBubble) {
            getTargetIDFunc = getTargetIDForChangeEvent;
          } else {
            handleEventFunc = handleEventsForChangeEventIE8;
          }
        } else if (isTextInputElement(topLevelTarget)) {
          if (isInputEventSupported) {
            getTargetIDFunc = getTargetIDForInputEvent;
          } else {
            getTargetIDFunc = getTargetIDForInputEventIE;
            handleEventFunc = handleEventsForInputEventIE;
          }
        } else if (shouldUseClickEvent(topLevelTarget)) {
          getTargetIDFunc = getTargetIDForClickEvent;
        }
        if (getTargetIDFunc) {
          var targetID = getTargetIDFunc(topLevelType, topLevelTarget, topLevelTargetID);
          if (targetID) {
            var event = SyntheticEvent.getPooled(eventTypes.change, targetID, nativeEvent);
            EventPropagators.accumulateTwoPhaseDispatches(event);
            return event;
          }
        }
        if (handleEventFunc) {
          handleEventFunc(topLevelType, topLevelTarget, topLevelTargetID);
        }
      }
    };
    module.exports = ChangeEventPlugin;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SyntheticMouseEvent", ["npm:react@0.13.2/lib/SyntheticUIEvent", "npm:react@0.13.2/lib/ViewportMetrics", "npm:react@0.13.2/lib/getEventModifierState"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var SyntheticUIEvent = require("npm:react@0.13.2/lib/SyntheticUIEvent");
  var ViewportMetrics = require("npm:react@0.13.2/lib/ViewportMetrics");
  var getEventModifierState = require("npm:react@0.13.2/lib/getEventModifierState");
  var MouseEventInterface = {
    screenX: null,
    screenY: null,
    clientX: null,
    clientY: null,
    ctrlKey: null,
    shiftKey: null,
    altKey: null,
    metaKey: null,
    getModifierState: getEventModifierState,
    button: function(event) {
      var button = event.button;
      if ('which' in event) {
        return button;
      }
      return button === 2 ? 2 : button === 4 ? 1 : 0;
    },
    buttons: null,
    relatedTarget: function(event) {
      return event.relatedTarget || (((event.fromElement === event.srcElement ? event.toElement : event.fromElement)));
    },
    pageX: function(event) {
      return 'pageX' in event ? event.pageX : event.clientX + ViewportMetrics.currentScrollLeft;
    },
    pageY: function(event) {
      return 'pageY' in event ? event.pageY : event.clientY + ViewportMetrics.currentScrollTop;
    }
  };
  function SyntheticMouseEvent(dispatchConfig, dispatchMarker, nativeEvent) {
    SyntheticUIEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent);
  }
  SyntheticUIEvent.augmentClass(SyntheticMouseEvent, MouseEventInterface);
  module.exports = SyntheticMouseEvent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactBrowserComponentMixin", ["npm:react@0.13.2/lib/findDOMNode"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var findDOMNode = require("npm:react@0.13.2/lib/findDOMNode");
  var ReactBrowserComponentMixin = {getDOMNode: function() {
      return findDOMNode(this);
    }};
  module.exports = ReactBrowserComponentMixin;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/AutoFocusMixin", ["npm:react@0.13.2/lib/focusNode"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var focusNode = require("npm:react@0.13.2/lib/focusNode");
  var AutoFocusMixin = {componentDidMount: function() {
      if (this.props.autoFocus) {
        focusNode(this.getDOMNode());
      }
    }};
  module.exports = AutoFocusMixin;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMForm", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/LocalEventTrapMixin", "npm:react@0.13.2/lib/ReactBrowserComponentMixin", "npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactElement"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
  var LocalEventTrapMixin = require("npm:react@0.13.2/lib/LocalEventTrapMixin");
  var ReactBrowserComponentMixin = require("npm:react@0.13.2/lib/ReactBrowserComponentMixin");
  var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
  var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
  var form = ReactElement.createFactory('form');
  var ReactDOMForm = ReactClass.createClass({
    displayName: 'ReactDOMForm',
    tagName: 'FORM',
    mixins: [ReactBrowserComponentMixin, LocalEventTrapMixin],
    render: function() {
      return form(this.props);
    },
    componentDidMount: function() {
      this.trapBubbledEvent(EventConstants.topLevelTypes.topReset, 'reset');
      this.trapBubbledEvent(EventConstants.topLevelTypes.topSubmit, 'submit');
    }
  });
  module.exports = ReactDOMForm;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/LinkedValueUtils", ["npm:react@0.13.2/lib/ReactPropTypes", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactPropTypes = require("npm:react@0.13.2/lib/ReactPropTypes");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var hasReadOnlyValue = {
      'button': true,
      'checkbox': true,
      'image': true,
      'hidden': true,
      'radio': true,
      'reset': true,
      'submit': true
    };
    function _assertSingleLink(input) {
      ("production" !== process.env.NODE_ENV ? invariant(input.props.checkedLink == null || input.props.valueLink == null, 'Cannot provide a checkedLink and a valueLink. If you want to use ' + 'checkedLink, you probably don\'t want to use valueLink and vice versa.') : invariant(input.props.checkedLink == null || input.props.valueLink == null));
    }
    function _assertValueLink(input) {
      _assertSingleLink(input);
      ("production" !== process.env.NODE_ENV ? invariant(input.props.value == null && input.props.onChange == null, 'Cannot provide a valueLink and a value or onChange event. If you want ' + 'to use value or onChange, you probably don\'t want to use valueLink.') : invariant(input.props.value == null && input.props.onChange == null));
    }
    function _assertCheckedLink(input) {
      _assertSingleLink(input);
      ("production" !== process.env.NODE_ENV ? invariant(input.props.checked == null && input.props.onChange == null, 'Cannot provide a checkedLink and a checked property or onChange event. ' + 'If you want to use checked or onChange, you probably don\'t want to ' + 'use checkedLink') : invariant(input.props.checked == null && input.props.onChange == null));
    }
    function _handleLinkedValueChange(e) {
      this.props.valueLink.requestChange(e.target.value);
    }
    function _handleLinkedCheckChange(e) {
      this.props.checkedLink.requestChange(e.target.checked);
    }
    var LinkedValueUtils = {
      Mixin: {propTypes: {
          value: function(props, propName, componentName) {
            if (!props[propName] || hasReadOnlyValue[props.type] || props.onChange || props.readOnly || props.disabled) {
              return null;
            }
            return new Error('You provided a `value` prop to a form field without an ' + '`onChange` handler. This will render a read-only field. If ' + 'the field should be mutable use `defaultValue`. Otherwise, ' + 'set either `onChange` or `readOnly`.');
          },
          checked: function(props, propName, componentName) {
            if (!props[propName] || props.onChange || props.readOnly || props.disabled) {
              return null;
            }
            return new Error('You provided a `checked` prop to a form field without an ' + '`onChange` handler. This will render a read-only field. If ' + 'the field should be mutable use `defaultChecked`. Otherwise, ' + 'set either `onChange` or `readOnly`.');
          },
          onChange: ReactPropTypes.func
        }},
      getValue: function(input) {
        if (input.props.valueLink) {
          _assertValueLink(input);
          return input.props.valueLink.value;
        }
        return input.props.value;
      },
      getChecked: function(input) {
        if (input.props.checkedLink) {
          _assertCheckedLink(input);
          return input.props.checkedLink.value;
        }
        return input.props.checked;
      },
      getOnChange: function(input) {
        if (input.props.valueLink) {
          _assertValueLink(input);
          return _handleLinkedValueChange;
        } else if (input.props.checkedLink) {
          _assertCheckedLink(input);
          return _handleLinkedCheckChange;
        }
        return input.props.onChange;
      }
    };
    module.exports = LinkedValueUtils;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactEventListener", ["npm:react@0.13.2/lib/EventListener", "npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react@0.13.2/lib/PooledClass", "npm:react@0.13.2/lib/ReactInstanceHandles", "npm:react@0.13.2/lib/ReactMount", "npm:react@0.13.2/lib/ReactUpdates", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/getEventTarget", "npm:react@0.13.2/lib/getUnboundedScrollPosition", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var EventListener = require("npm:react@0.13.2/lib/EventListener");
    var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
    var PooledClass = require("npm:react@0.13.2/lib/PooledClass");
    var ReactInstanceHandles = require("npm:react@0.13.2/lib/ReactInstanceHandles");
    var ReactMount = require("npm:react@0.13.2/lib/ReactMount");
    var ReactUpdates = require("npm:react@0.13.2/lib/ReactUpdates");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var getEventTarget = require("npm:react@0.13.2/lib/getEventTarget");
    var getUnboundedScrollPosition = require("npm:react@0.13.2/lib/getUnboundedScrollPosition");
    function findParent(node) {
      var nodeID = ReactMount.getID(node);
      var rootID = ReactInstanceHandles.getReactRootIDFromNodeID(nodeID);
      var container = ReactMount.findReactContainerForID(rootID);
      var parent = ReactMount.getFirstReactDOM(container);
      return parent;
    }
    function TopLevelCallbackBookKeeping(topLevelType, nativeEvent) {
      this.topLevelType = topLevelType;
      this.nativeEvent = nativeEvent;
      this.ancestors = [];
    }
    assign(TopLevelCallbackBookKeeping.prototype, {destructor: function() {
        this.topLevelType = null;
        this.nativeEvent = null;
        this.ancestors.length = 0;
      }});
    PooledClass.addPoolingTo(TopLevelCallbackBookKeeping, PooledClass.twoArgumentPooler);
    function handleTopLevelImpl(bookKeeping) {
      var topLevelTarget = ReactMount.getFirstReactDOM(getEventTarget(bookKeeping.nativeEvent)) || window;
      var ancestor = topLevelTarget;
      while (ancestor) {
        bookKeeping.ancestors.push(ancestor);
        ancestor = findParent(ancestor);
      }
      for (var i = 0,
          l = bookKeeping.ancestors.length; i < l; i++) {
        topLevelTarget = bookKeeping.ancestors[i];
        var topLevelTargetID = ReactMount.getID(topLevelTarget) || '';
        ReactEventListener._handleTopLevel(bookKeeping.topLevelType, topLevelTarget, topLevelTargetID, bookKeeping.nativeEvent);
      }
    }
    function scrollValueMonitor(cb) {
      var scrollPosition = getUnboundedScrollPosition(window);
      cb(scrollPosition);
    }
    var ReactEventListener = {
      _enabled: true,
      _handleTopLevel: null,
      WINDOW_HANDLE: ExecutionEnvironment.canUseDOM ? window : null,
      setHandleTopLevel: function(handleTopLevel) {
        ReactEventListener._handleTopLevel = handleTopLevel;
      },
      setEnabled: function(enabled) {
        ReactEventListener._enabled = !!enabled;
      },
      isEnabled: function() {
        return ReactEventListener._enabled;
      },
      trapBubbledEvent: function(topLevelType, handlerBaseName, handle) {
        var element = handle;
        if (!element) {
          return null;
        }
        return EventListener.listen(element, handlerBaseName, ReactEventListener.dispatchEvent.bind(null, topLevelType));
      },
      trapCapturedEvent: function(topLevelType, handlerBaseName, handle) {
        var element = handle;
        if (!element) {
          return null;
        }
        return EventListener.capture(element, handlerBaseName, ReactEventListener.dispatchEvent.bind(null, topLevelType));
      },
      monitorScrollValue: function(refresh) {
        var callback = scrollValueMonitor.bind(null, refresh);
        EventListener.listen(window, 'scroll', callback);
      },
      dispatchEvent: function(topLevelType, nativeEvent) {
        if (!ReactEventListener._enabled) {
          return ;
        }
        var bookKeeping = TopLevelCallbackBookKeeping.getPooled(topLevelType, nativeEvent);
        try {
          ReactUpdates.batchedUpdates(handleTopLevelImpl, bookKeeping);
        } finally {
          TopLevelCallbackBookKeeping.release(bookKeeping);
        }
      }
    };
    module.exports = ReactEventListener;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMSelection", ["npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react@0.13.2/lib/getNodeForCharacterOffset", "npm:react@0.13.2/lib/getTextContentAccessor"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
  var getNodeForCharacterOffset = require("npm:react@0.13.2/lib/getNodeForCharacterOffset");
  var getTextContentAccessor = require("npm:react@0.13.2/lib/getTextContentAccessor");
  function isCollapsed(anchorNode, anchorOffset, focusNode, focusOffset) {
    return anchorNode === focusNode && anchorOffset === focusOffset;
  }
  function getIEOffsets(node) {
    var selection = document.selection;
    var selectedRange = selection.createRange();
    var selectedLength = selectedRange.text.length;
    var fromStart = selectedRange.duplicate();
    fromStart.moveToElementText(node);
    fromStart.setEndPoint('EndToStart', selectedRange);
    var startOffset = fromStart.text.length;
    var endOffset = startOffset + selectedLength;
    return {
      start: startOffset,
      end: endOffset
    };
  }
  function getModernOffsets(node) {
    var selection = window.getSelection && window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return null;
    }
    var anchorNode = selection.anchorNode;
    var anchorOffset = selection.anchorOffset;
    var focusNode = selection.focusNode;
    var focusOffset = selection.focusOffset;
    var currentRange = selection.getRangeAt(0);
    var isSelectionCollapsed = isCollapsed(selection.anchorNode, selection.anchorOffset, selection.focusNode, selection.focusOffset);
    var rangeLength = isSelectionCollapsed ? 0 : currentRange.toString().length;
    var tempRange = currentRange.cloneRange();
    tempRange.selectNodeContents(node);
    tempRange.setEnd(currentRange.startContainer, currentRange.startOffset);
    var isTempRangeCollapsed = isCollapsed(tempRange.startContainer, tempRange.startOffset, tempRange.endContainer, tempRange.endOffset);
    var start = isTempRangeCollapsed ? 0 : tempRange.toString().length;
    var end = start + rangeLength;
    var detectionRange = document.createRange();
    detectionRange.setStart(anchorNode, anchorOffset);
    detectionRange.setEnd(focusNode, focusOffset);
    var isBackward = detectionRange.collapsed;
    return {
      start: isBackward ? end : start,
      end: isBackward ? start : end
    };
  }
  function setIEOffsets(node, offsets) {
    var range = document.selection.createRange().duplicate();
    var start,
        end;
    if (typeof offsets.end === 'undefined') {
      start = offsets.start;
      end = start;
    } else if (offsets.start > offsets.end) {
      start = offsets.end;
      end = offsets.start;
    } else {
      start = offsets.start;
      end = offsets.end;
    }
    range.moveToElementText(node);
    range.moveStart('character', start);
    range.setEndPoint('EndToStart', range);
    range.moveEnd('character', end - start);
    range.select();
  }
  function setModernOffsets(node, offsets) {
    if (!window.getSelection) {
      return ;
    }
    var selection = window.getSelection();
    var length = node[getTextContentAccessor()].length;
    var start = Math.min(offsets.start, length);
    var end = typeof offsets.end === 'undefined' ? start : Math.min(offsets.end, length);
    if (!selection.extend && start > end) {
      var temp = end;
      end = start;
      start = temp;
    }
    var startMarker = getNodeForCharacterOffset(node, start);
    var endMarker = getNodeForCharacterOffset(node, end);
    if (startMarker && endMarker) {
      var range = document.createRange();
      range.setStart(startMarker.node, startMarker.offset);
      selection.removeAllRanges();
      if (start > end) {
        selection.addRange(range);
        selection.extend(endMarker.node, endMarker.offset);
      } else {
        range.setEnd(endMarker.node, endMarker.offset);
        selection.addRange(range);
      }
    }
  }
  var useIEOffsets = (ExecutionEnvironment.canUseDOM && 'selection' in document && !('getSelection' in window));
  var ReactDOMSelection = {
    getOffsets: useIEOffsets ? getIEOffsets : getModernOffsets,
    setOffsets: useIEOffsets ? setIEOffsets : setModernOffsets
  };
  module.exports = ReactDOMSelection;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SelectEventPlugin", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/EventPropagators", "npm:react@0.13.2/lib/ReactInputSelection", "npm:react@0.13.2/lib/SyntheticEvent", "npm:react@0.13.2/lib/getActiveElement", "npm:react@0.13.2/lib/isTextInputElement", "npm:react@0.13.2/lib/keyOf", "npm:react@0.13.2/lib/shallowEqual"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
  var EventPropagators = require("npm:react@0.13.2/lib/EventPropagators");
  var ReactInputSelection = require("npm:react@0.13.2/lib/ReactInputSelection");
  var SyntheticEvent = require("npm:react@0.13.2/lib/SyntheticEvent");
  var getActiveElement = require("npm:react@0.13.2/lib/getActiveElement");
  var isTextInputElement = require("npm:react@0.13.2/lib/isTextInputElement");
  var keyOf = require("npm:react@0.13.2/lib/keyOf");
  var shallowEqual = require("npm:react@0.13.2/lib/shallowEqual");
  var topLevelTypes = EventConstants.topLevelTypes;
  var eventTypes = {select: {
      phasedRegistrationNames: {
        bubbled: keyOf({onSelect: null}),
        captured: keyOf({onSelectCapture: null})
      },
      dependencies: [topLevelTypes.topBlur, topLevelTypes.topContextMenu, topLevelTypes.topFocus, topLevelTypes.topKeyDown, topLevelTypes.topMouseDown, topLevelTypes.topMouseUp, topLevelTypes.topSelectionChange]
    }};
  var activeElement = null;
  var activeElementID = null;
  var lastSelection = null;
  var mouseDown = false;
  function getSelection(node) {
    if ('selectionStart' in node && ReactInputSelection.hasSelectionCapabilities(node)) {
      return {
        start: node.selectionStart,
        end: node.selectionEnd
      };
    } else if (window.getSelection) {
      var selection = window.getSelection();
      return {
        anchorNode: selection.anchorNode,
        anchorOffset: selection.anchorOffset,
        focusNode: selection.focusNode,
        focusOffset: selection.focusOffset
      };
    } else if (document.selection) {
      var range = document.selection.createRange();
      return {
        parentElement: range.parentElement(),
        text: range.text,
        top: range.boundingTop,
        left: range.boundingLeft
      };
    }
  }
  function constructSelectEvent(nativeEvent) {
    if (mouseDown || activeElement == null || activeElement !== getActiveElement()) {
      return null;
    }
    var currentSelection = getSelection(activeElement);
    if (!lastSelection || !shallowEqual(lastSelection, currentSelection)) {
      lastSelection = currentSelection;
      var syntheticEvent = SyntheticEvent.getPooled(eventTypes.select, activeElementID, nativeEvent);
      syntheticEvent.type = 'select';
      syntheticEvent.target = activeElement;
      EventPropagators.accumulateTwoPhaseDispatches(syntheticEvent);
      return syntheticEvent;
    }
  }
  var SelectEventPlugin = {
    eventTypes: eventTypes,
    extractEvents: function(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent) {
      switch (topLevelType) {
        case topLevelTypes.topFocus:
          if (isTextInputElement(topLevelTarget) || topLevelTarget.contentEditable === 'true') {
            activeElement = topLevelTarget;
            activeElementID = topLevelTargetID;
            lastSelection = null;
          }
          break;
        case topLevelTypes.topBlur:
          activeElement = null;
          activeElementID = null;
          lastSelection = null;
          break;
        case topLevelTypes.topMouseDown:
          mouseDown = true;
          break;
        case topLevelTypes.topContextMenu:
        case topLevelTypes.topMouseUp:
          mouseDown = false;
          return constructSelectEvent(nativeEvent);
        case topLevelTypes.topSelectionChange:
        case topLevelTypes.topKeyDown:
        case topLevelTypes.topKeyUp:
          return constructSelectEvent(nativeEvent);
      }
    }
  };
  module.exports = SelectEventPlugin;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SyntheticKeyboardEvent", ["npm:react@0.13.2/lib/SyntheticUIEvent", "npm:react@0.13.2/lib/getEventCharCode", "npm:react@0.13.2/lib/getEventKey", "npm:react@0.13.2/lib/getEventModifierState"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var SyntheticUIEvent = require("npm:react@0.13.2/lib/SyntheticUIEvent");
  var getEventCharCode = require("npm:react@0.13.2/lib/getEventCharCode");
  var getEventKey = require("npm:react@0.13.2/lib/getEventKey");
  var getEventModifierState = require("npm:react@0.13.2/lib/getEventModifierState");
  var KeyboardEventInterface = {
    key: getEventKey,
    location: null,
    ctrlKey: null,
    shiftKey: null,
    altKey: null,
    metaKey: null,
    repeat: null,
    locale: null,
    getModifierState: getEventModifierState,
    charCode: function(event) {
      if (event.type === 'keypress') {
        return getEventCharCode(event);
      }
      return 0;
    },
    keyCode: function(event) {
      if (event.type === 'keydown' || event.type === 'keyup') {
        return event.keyCode;
      }
      return 0;
    },
    which: function(event) {
      if (event.type === 'keypress') {
        return getEventCharCode(event);
      }
      if (event.type === 'keydown' || event.type === 'keyup') {
        return event.keyCode;
      }
      return 0;
    }
  };
  function SyntheticKeyboardEvent(dispatchConfig, dispatchMarker, nativeEvent) {
    SyntheticUIEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent);
  }
  SyntheticUIEvent.augmentClass(SyntheticKeyboardEvent, KeyboardEventInterface);
  module.exports = SyntheticKeyboardEvent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/performanceNow", ["npm:react@0.13.2/lib/performance"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var performance = require("npm:react@0.13.2/lib/performance");
  if (!performance || !performance.now) {
    performance = Date;
  }
  var performanceNow = performance.now.bind(performance);
  module.exports = performanceNow;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactServerRendering", ["npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactInstanceHandles", "npm:react@0.13.2/lib/ReactMarkupChecksum", "npm:react@0.13.2/lib/ReactServerRenderingTransaction", "npm:react@0.13.2/lib/emptyObject", "npm:react@0.13.2/lib/instantiateReactComponent", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactInstanceHandles = require("npm:react@0.13.2/lib/ReactInstanceHandles");
    var ReactMarkupChecksum = require("npm:react@0.13.2/lib/ReactMarkupChecksum");
    var ReactServerRenderingTransaction = require("npm:react@0.13.2/lib/ReactServerRenderingTransaction");
    var emptyObject = require("npm:react@0.13.2/lib/emptyObject");
    var instantiateReactComponent = require("npm:react@0.13.2/lib/instantiateReactComponent");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    function renderToString(element) {
      ("production" !== process.env.NODE_ENV ? invariant(ReactElement.isValidElement(element), 'renderToString(): You must pass a valid ReactElement.') : invariant(ReactElement.isValidElement(element)));
      var transaction;
      try {
        var id = ReactInstanceHandles.createReactRootID();
        transaction = ReactServerRenderingTransaction.getPooled(false);
        return transaction.perform(function() {
          var componentInstance = instantiateReactComponent(element, null);
          var markup = componentInstance.mountComponent(id, transaction, emptyObject);
          return ReactMarkupChecksum.addChecksumToMarkup(markup);
        }, null);
      } finally {
        ReactServerRenderingTransaction.release(transaction);
      }
    }
    function renderToStaticMarkup(element) {
      ("production" !== process.env.NODE_ENV ? invariant(ReactElement.isValidElement(element), 'renderToStaticMarkup(): You must pass a valid ReactElement.') : invariant(ReactElement.isValidElement(element)));
      var transaction;
      try {
        var id = ReactInstanceHandles.createReactRootID();
        transaction = ReactServerRenderingTransaction.getPooled(true);
        return transaction.perform(function() {
          var componentInstance = instantiateReactComponent(element, null);
          return componentInstance.mountComponent(id, transaction, emptyObject);
        }, null);
      } finally {
        ReactServerRenderingTransaction.release(transaction);
      }
    }
    module.exports = {
      renderToString: renderToString,
      renderToStaticMarkup: renderToStaticMarkup
    };
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:object-assign@2.0.0", ["npm:object-assign@2.0.0/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:object-assign@2.0.0/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:qs@2.4.1/lib/stringify", ["npm:qs@2.4.1/lib/utils"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var Utils = require("npm:qs@2.4.1/lib/utils");
  var internals = {
    delimiter: '&',
    arrayPrefixGenerators: {
      brackets: function(prefix, key) {
        return prefix + '[]';
      },
      indices: function(prefix, key) {
        return prefix + '[' + key + ']';
      },
      repeat: function(prefix, key) {
        return prefix;
      }
    }
  };
  internals.stringify = function(obj, prefix, generateArrayPrefix) {
    if (Utils.isBuffer(obj)) {
      obj = obj.toString();
    } else if (obj instanceof Date) {
      obj = obj.toISOString();
    } else if (obj === null) {
      obj = '';
    }
    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return [encodeURIComponent(prefix) + '=' + encodeURIComponent(obj)];
    }
    var values = [];
    if (typeof obj === 'undefined') {
      return values;
    }
    var objKeys = Object.keys(obj);
    for (var i = 0,
        il = objKeys.length; i < il; ++i) {
      var key = objKeys[i];
      if (Array.isArray(obj)) {
        values = values.concat(internals.stringify(obj[key], generateArrayPrefix(prefix, key), generateArrayPrefix));
      } else {
        values = values.concat(internals.stringify(obj[key], prefix + '[' + key + ']', generateArrayPrefix));
      }
    }
    return values;
  };
  module.exports = function(obj, options) {
    options = options || {};
    var delimiter = typeof options.delimiter === 'undefined' ? internals.delimiter : options.delimiter;
    var keys = [];
    if (typeof obj !== 'object' || obj === null) {
      return '';
    }
    var arrayFormat;
    if (options.arrayFormat in internals.arrayPrefixGenerators) {
      arrayFormat = options.arrayFormat;
    } else if ('indices' in options) {
      arrayFormat = options.indices ? 'indices' : 'repeat';
    } else {
      arrayFormat = 'indices';
    }
    var generateArrayPrefix = internals.arrayPrefixGenerators[arrayFormat];
    var objKeys = Object.keys(obj);
    for (var i = 0,
        il = objKeys.length; i < il; ++i) {
      var key = objKeys[i];
      keys = keys.concat(internals.stringify(obj[key], key, generateArrayPrefix));
    }
    return keys.join(delimiter);
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/components/RouteHandler", ["npm:react@0.13.2", "npm:react-router@0.13.2/lib/components/ContextWrapper", "npm:react@0.13.2/lib/Object.assign", "npm:react-router@0.13.2/lib/PropTypes"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _createClass = (function() {
    function defineProperties(target, props) {
      for (var key in props) {
        var prop = props[key];
        prop.configurable = true;
        if (prop.value)
          prop.writable = true;
      }
      Object.defineProperties(target, props);
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  var _inherits = function(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }});
    if (superClass)
      subClass.__proto__ = superClass;
  };
  var _classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var React = require("npm:react@0.13.2");
  var ContextWrapper = require("npm:react-router@0.13.2/lib/components/ContextWrapper");
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var PropTypes = require("npm:react-router@0.13.2/lib/PropTypes");
  var REF_NAME = "__routeHandler__";
  var RouteHandler = (function(_React$Component) {
    function RouteHandler() {
      _classCallCheck(this, RouteHandler);
      if (_React$Component != null) {
        _React$Component.apply(this, arguments);
      }
    }
    _inherits(RouteHandler, _React$Component);
    _createClass(RouteHandler, {
      getChildContext: {value: function getChildContext() {
          return {routeDepth: this.context.routeDepth + 1};
        }},
      componentDidMount: {value: function componentDidMount() {
          this._updateRouteComponent(this.refs[REF_NAME]);
        }},
      componentDidUpdate: {value: function componentDidUpdate() {
          this._updateRouteComponent(this.refs[REF_NAME]);
        }},
      componentWillUnmount: {value: function componentWillUnmount() {
          this._updateRouteComponent(null);
        }},
      _updateRouteComponent: {value: function _updateRouteComponent(component) {
          this.context.router.setRouteComponentAtDepth(this.getRouteDepth(), component);
        }},
      getRouteDepth: {value: function getRouteDepth() {
          return this.context.routeDepth;
        }},
      createChildRouteHandler: {value: function createChildRouteHandler(props) {
          var route = this.context.router.getRouteAtDepth(this.getRouteDepth());
          return route ? React.createElement(route.handler, assign({}, props || this.props, {ref: REF_NAME})) : null;
        }},
      render: {value: function render() {
          var handler = this.createChildRouteHandler();
          return handler ? React.createElement(ContextWrapper, null, handler) : React.createElement("script", null);
        }}
    });
    return RouteHandler;
  })(React.Component);
  RouteHandler.contextTypes = {
    routeDepth: PropTypes.number.isRequired,
    router: PropTypes.router.isRequired
  };
  RouteHandler.childContextTypes = {routeDepth: PropTypes.number.isRequired};
  module.exports = RouteHandler;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/locations/HashLocation", ["npm:react-router@0.13.2/lib/actions/LocationActions", "npm:react-router@0.13.2/lib/History"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var LocationActions = require("npm:react-router@0.13.2/lib/actions/LocationActions");
  var History = require("npm:react-router@0.13.2/lib/History");
  var _listeners = [];
  var _isListening = false;
  var _actionType;
  function notifyChange(type) {
    if (type === LocationActions.PUSH)
      History.length += 1;
    var change = {
      path: HashLocation.getCurrentPath(),
      type: type
    };
    _listeners.forEach(function(listener) {
      listener.call(HashLocation, change);
    });
  }
  function ensureSlash() {
    var path = HashLocation.getCurrentPath();
    if (path.charAt(0) === "/") {
      return true;
    }
    HashLocation.replace("/" + path);
    return false;
  }
  function onHashChange() {
    if (ensureSlash()) {
      var curActionType = _actionType;
      _actionType = null;
      notifyChange(curActionType || LocationActions.POP);
    }
  }
  var HashLocation = {
    addChangeListener: function addChangeListener(listener) {
      _listeners.push(listener);
      ensureSlash();
      if (!_isListening) {
        if (window.addEventListener) {
          window.addEventListener("hashchange", onHashChange, false);
        } else {
          window.attachEvent("onhashchange", onHashChange);
        }
        _isListening = true;
      }
    },
    removeChangeListener: function removeChangeListener(listener) {
      _listeners = _listeners.filter(function(l) {
        return l !== listener;
      });
      if (_listeners.length === 0) {
        if (window.removeEventListener) {
          window.removeEventListener("hashchange", onHashChange, false);
        } else {
          window.removeEvent("onhashchange", onHashChange);
        }
        _isListening = false;
      }
    },
    push: function push(path) {
      _actionType = LocationActions.PUSH;
      window.location.hash = path;
    },
    replace: function replace(path) {
      _actionType = LocationActions.REPLACE;
      window.location.replace(window.location.pathname + window.location.search + "#" + path);
    },
    pop: function pop() {
      _actionType = LocationActions.POP;
      History.back();
    },
    getCurrentPath: function getCurrentPath() {
      return decodeURI(window.location.href.split("#")[1] || "");
    },
    toString: function toString() {
      return "<HashLocation>";
    }
  };
  module.exports = HashLocation;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/ScrollHistory", ["npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react-router@0.13.2/lib/getWindowScrollPosition"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var invariant = require("npm:react@0.13.2/lib/invariant");
  var canUseDOM = require("npm:react@0.13.2/lib/ExecutionEnvironment").canUseDOM;
  var getWindowScrollPosition = require("npm:react-router@0.13.2/lib/getWindowScrollPosition");
  function shouldUpdateScroll(state, prevState) {
    if (!prevState) {
      return true;
    }
    if (state.pathname === prevState.pathname) {
      return false;
    }
    var routes = state.routes;
    var prevRoutes = prevState.routes;
    var sharedAncestorRoutes = routes.filter(function(route) {
      return prevRoutes.indexOf(route) !== -1;
    });
    return !sharedAncestorRoutes.some(function(route) {
      return route.ignoreScrollBehavior;
    });
  }
  var ScrollHistory = {
    statics: {
      recordScrollPosition: function recordScrollPosition(path) {
        if (!this.scrollHistory)
          this.scrollHistory = {};
        this.scrollHistory[path] = getWindowScrollPosition();
      },
      getScrollPosition: function getScrollPosition(path) {
        if (!this.scrollHistory)
          this.scrollHistory = {};
        return this.scrollHistory[path] || null;
      }
    },
    componentWillMount: function componentWillMount() {
      invariant(this.constructor.getScrollBehavior() == null || canUseDOM, "Cannot use scroll behavior without a DOM");
    },
    componentDidMount: function componentDidMount() {
      this._updateScroll();
    },
    componentDidUpdate: function componentDidUpdate(prevProps, prevState) {
      this._updateScroll(prevState);
    },
    _updateScroll: function _updateScroll(prevState) {
      if (!shouldUpdateScroll(this.state, prevState)) {
        return ;
      }
      var scrollBehavior = this.constructor.getScrollBehavior();
      if (scrollBehavior)
        scrollBehavior.updateScrollPosition(this.constructor.getScrollPosition(this.state.path), this.state.action);
    }
  };
  module.exports = ScrollHistory;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/Transition", ["npm:react-router@0.13.2/lib/Cancellation", "npm:react-router@0.13.2/lib/Redirect"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var Cancellation = require("npm:react-router@0.13.2/lib/Cancellation");
  var Redirect = require("npm:react-router@0.13.2/lib/Redirect");
  function Transition(path, retry) {
    this.path = path;
    this.abortReason = null;
    this.retry = retry.bind(this);
  }
  Transition.prototype.abort = function(reason) {
    if (this.abortReason == null)
      this.abortReason = reason || "ABORT";
  };
  Transition.prototype.redirect = function(to, params, query) {
    this.abort(new Redirect(to, params, query));
  };
  Transition.prototype.cancel = function() {
    this.abort(new Cancellation());
  };
  Transition.from = function(transition, routes, components, callback) {
    routes.reduce(function(callback, route, index) {
      return function(error) {
        if (error || transition.abortReason) {
          callback(error);
        } else if (route.onLeave) {
          try {
            route.onLeave(transition, components[index], callback);
            if (route.onLeave.length < 3)
              callback();
          } catch (e) {
            callback(e);
          }
        } else {
          callback();
        }
      };
    }, callback)();
  };
  Transition.to = function(transition, routes, params, query, callback) {
    routes.reduceRight(function(callback, route) {
      return function(error) {
        if (error || transition.abortReason) {
          callback(error);
        } else if (route.onEnter) {
          try {
            route.onEnter(transition, params, query, callback);
            if (route.onEnter.length < 4)
              callback();
          } catch (e) {
            callback(e);
          }
        } else {
          callback();
        }
      };
    }, callback)();
  };
  module.exports = Transition;
  global.define = __define;
  return module.exports;
});

System.register("npm:eventemitter3@0.1.6", ["npm:eventemitter3@0.1.6/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:eventemitter3@0.1.6/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:native-promise-only@0.7.6-a", ["npm:native-promise-only@0.7.6-a/npo"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:native-promise-only@0.7.6-a/npo");
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/createStore", ["npm:reflux@0.2.7/src/utils", "npm:reflux@0.2.7/src/index", "npm:reflux@0.2.7/src/Keep", "npm:reflux@0.2.7/src/mixer", "npm:reflux@0.2.7/src/bindMethods"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var _ = require("npm:reflux@0.2.7/src/utils"),
      Reflux = require("npm:reflux@0.2.7/src/index"),
      Keep = require("npm:reflux@0.2.7/src/Keep"),
      mixer = require("npm:reflux@0.2.7/src/mixer"),
      allowed = {
        preEmit: 1,
        shouldEmit: 1
      },
      bindMethods = require("npm:reflux@0.2.7/src/bindMethods");
  module.exports = function(definition) {
    definition = definition || {};
    for (var a in Reflux.StoreMethods) {
      if (!allowed[a] && (Reflux.PublisherMethods[a] || Reflux.ListenerMethods[a])) {
        throw new Error("Cannot override API method " + a + " in Reflux.StoreMethods. Use another method name or override it on Reflux.PublisherMethods / Reflux.ListenerMethods instead.");
      }
    }
    for (var d in definition) {
      if (!allowed[d] && (Reflux.PublisherMethods[d] || Reflux.ListenerMethods[d])) {
        throw new Error("Cannot override API method " + d + " in store creation. Use another method name or override it on Reflux.PublisherMethods / Reflux.ListenerMethods instead.");
      }
    }
    definition = mixer(definition);
    function Store() {
      var i = 0,
          arr;
      this.subscriptions = [];
      this.emitter = new _.EventEmitter();
      this.eventLabel = "change";
      bindMethods(this, definition);
      if (this.init && _.isFunction(this.init)) {
        this.init();
      }
      if (this.listenables) {
        arr = [].concat(this.listenables);
        for (; i < arr.length; i++) {
          this.listenToMany(arr[i]);
        }
      }
    }
    _.extend(Store.prototype, Reflux.ListenerMethods, Reflux.PublisherMethods, Reflux.StoreMethods, definition);
    var store = new Store();
    Keep.createdStores.push(store);
    return store;
  };
  global.define = __define;
  return module.exports;
});

System.register("github:necolas/normalize.css@3.0.3", ["github:necolas/normalize.css@3.0.3/normalize.css!github:systemjs/plugin-css@0.1.9!github:systemjs/plugin-css@0.1.9"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:necolas/normalize.css@3.0.3/normalize.css!github:systemjs/plugin-css@0.1.9!github:systemjs/plugin-css@0.1.9");
  global.define = __define;
  return module.exports;
});

System.register("github:jspm/nodelibs-process@0.1.1/index", ["npm:process@0.10.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = System._nodeRequire ? process : require("npm:process@0.10.1");
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactContext", ["npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/emptyObject", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var emptyObject = require("npm:react@0.13.2/lib/emptyObject");
    var warning = require("npm:react@0.13.2/lib/warning");
    var didWarn = false;
    var ReactContext = {
      current: emptyObject,
      withContext: function(newContext, scopedCallback) {
        if ("production" !== process.env.NODE_ENV) {
          ("production" !== process.env.NODE_ENV ? warning(didWarn, 'withContext is deprecated and will be removed in a future version. ' + 'Use a wrapper component with getChildContext instead.') : null);
          didWarn = true;
        }
        var result;
        var previousContext = ReactContext.current;
        ReactContext.current = assign({}, previousContext, newContext);
        try {
          result = scopedCallback();
        } finally {
          ReactContext.current = previousContext;
        }
        return result;
      }
    };
    module.exports = ReactContext;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/traverseAllChildren", ["npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactFragment", "npm:react@0.13.2/lib/ReactInstanceHandles", "npm:react@0.13.2/lib/getIteratorFn", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactFragment = require("npm:react@0.13.2/lib/ReactFragment");
    var ReactInstanceHandles = require("npm:react@0.13.2/lib/ReactInstanceHandles");
    var getIteratorFn = require("npm:react@0.13.2/lib/getIteratorFn");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var warning = require("npm:react@0.13.2/lib/warning");
    var SEPARATOR = ReactInstanceHandles.SEPARATOR;
    var SUBSEPARATOR = ':';
    var userProvidedKeyEscaperLookup = {
      '=': '=0',
      '.': '=1',
      ':': '=2'
    };
    var userProvidedKeyEscapeRegex = /[=.:]/g;
    var didWarnAboutMaps = false;
    function userProvidedKeyEscaper(match) {
      return userProvidedKeyEscaperLookup[match];
    }
    function getComponentKey(component, index) {
      if (component && component.key != null) {
        return wrapUserProvidedKey(component.key);
      }
      return index.toString(36);
    }
    function escapeUserProvidedKey(text) {
      return ('' + text).replace(userProvidedKeyEscapeRegex, userProvidedKeyEscaper);
    }
    function wrapUserProvidedKey(key) {
      return '$' + escapeUserProvidedKey(key);
    }
    function traverseAllChildrenImpl(children, nameSoFar, indexSoFar, callback, traverseContext) {
      var type = typeof children;
      if (type === 'undefined' || type === 'boolean') {
        children = null;
      }
      if (children === null || type === 'string' || type === 'number' || ReactElement.isValidElement(children)) {
        callback(traverseContext, children, nameSoFar === '' ? SEPARATOR + getComponentKey(children, 0) : nameSoFar, indexSoFar);
        return 1;
      }
      var child,
          nextName,
          nextIndex;
      var subtreeCount = 0;
      if (Array.isArray(children)) {
        for (var i = 0; i < children.length; i++) {
          child = children[i];
          nextName = ((nameSoFar !== '' ? nameSoFar + SUBSEPARATOR : SEPARATOR) + getComponentKey(child, i));
          nextIndex = indexSoFar + subtreeCount;
          subtreeCount += traverseAllChildrenImpl(child, nextName, nextIndex, callback, traverseContext);
        }
      } else {
        var iteratorFn = getIteratorFn(children);
        if (iteratorFn) {
          var iterator = iteratorFn.call(children);
          var step;
          if (iteratorFn !== children.entries) {
            var ii = 0;
            while (!(step = iterator.next()).done) {
              child = step.value;
              nextName = ((nameSoFar !== '' ? nameSoFar + SUBSEPARATOR : SEPARATOR) + getComponentKey(child, ii++));
              nextIndex = indexSoFar + subtreeCount;
              subtreeCount += traverseAllChildrenImpl(child, nextName, nextIndex, callback, traverseContext);
            }
          } else {
            if ("production" !== process.env.NODE_ENV) {
              ("production" !== process.env.NODE_ENV ? warning(didWarnAboutMaps, 'Using Maps as children is not yet fully supported. It is an ' + 'experimental feature that might be removed. Convert it to a ' + 'sequence / iterable of keyed ReactElements instead.') : null);
              didWarnAboutMaps = true;
            }
            while (!(step = iterator.next()).done) {
              var entry = step.value;
              if (entry) {
                child = entry[1];
                nextName = ((nameSoFar !== '' ? nameSoFar + SUBSEPARATOR : SEPARATOR) + wrapUserProvidedKey(entry[0]) + SUBSEPARATOR + getComponentKey(child, 0));
                nextIndex = indexSoFar + subtreeCount;
                subtreeCount += traverseAllChildrenImpl(child, nextName, nextIndex, callback, traverseContext);
              }
            }
          }
        } else if (type === 'object') {
          ("production" !== process.env.NODE_ENV ? invariant(children.nodeType !== 1, 'traverseAllChildren(...): Encountered an invalid child; DOM ' + 'elements are not valid children of React components.') : invariant(children.nodeType !== 1));
          var fragment = ReactFragment.extract(children);
          for (var key in fragment) {
            if (fragment.hasOwnProperty(key)) {
              child = fragment[key];
              nextName = ((nameSoFar !== '' ? nameSoFar + SUBSEPARATOR : SEPARATOR) + wrapUserProvidedKey(key) + SUBSEPARATOR + getComponentKey(child, 0));
              nextIndex = indexSoFar + subtreeCount;
              subtreeCount += traverseAllChildrenImpl(child, nextName, nextIndex, callback, traverseContext);
            }
          }
        }
      }
      return subtreeCount;
    }
    function traverseAllChildren(children, callback, traverseContext) {
      if (children == null) {
        return 0;
      }
      return traverseAllChildrenImpl(children, '', 0, callback, traverseContext);
    }
    module.exports = traverseAllChildren;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactReconciler", ["npm:react@0.13.2/lib/ReactRef", "npm:react@0.13.2/lib/ReactElementValidator", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactRef = require("npm:react@0.13.2/lib/ReactRef");
    var ReactElementValidator = require("npm:react@0.13.2/lib/ReactElementValidator");
    function attachRefs() {
      ReactRef.attachRefs(this, this._currentElement);
    }
    var ReactReconciler = {
      mountComponent: function(internalInstance, rootID, transaction, context) {
        var markup = internalInstance.mountComponent(rootID, transaction, context);
        if ("production" !== process.env.NODE_ENV) {
          ReactElementValidator.checkAndWarnForMutatedProps(internalInstance._currentElement);
        }
        transaction.getReactMountReady().enqueue(attachRefs, internalInstance);
        return markup;
      },
      unmountComponent: function(internalInstance) {
        ReactRef.detachRefs(internalInstance, internalInstance._currentElement);
        internalInstance.unmountComponent();
      },
      receiveComponent: function(internalInstance, nextElement, transaction, context) {
        var prevElement = internalInstance._currentElement;
        if (nextElement === prevElement && nextElement._owner != null) {
          return ;
        }
        if ("production" !== process.env.NODE_ENV) {
          ReactElementValidator.checkAndWarnForMutatedProps(nextElement);
        }
        var refsChanged = ReactRef.shouldUpdateRefs(prevElement, nextElement);
        if (refsChanged) {
          ReactRef.detachRefs(internalInstance, prevElement);
        }
        internalInstance.receiveComponent(nextElement, transaction, context);
        if (refsChanged) {
          transaction.getReactMountReady().enqueue(attachRefs, internalInstance);
        }
      },
      performUpdateIfNecessary: function(internalInstance, transaction) {
        internalInstance.performUpdateIfNecessary(transaction);
      }
    };
    module.exports = ReactReconciler;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/DOMPropertyOperations", ["npm:react@0.13.2/lib/DOMProperty", "npm:react@0.13.2/lib/quoteAttributeValueForBrowser", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var DOMProperty = require("npm:react@0.13.2/lib/DOMProperty");
    var quoteAttributeValueForBrowser = require("npm:react@0.13.2/lib/quoteAttributeValueForBrowser");
    var warning = require("npm:react@0.13.2/lib/warning");
    function shouldIgnoreValue(name, value) {
      return value == null || (DOMProperty.hasBooleanValue[name] && !value) || (DOMProperty.hasNumericValue[name] && isNaN(value)) || (DOMProperty.hasPositiveNumericValue[name] && (value < 1)) || (DOMProperty.hasOverloadedBooleanValue[name] && value === false);
    }
    if ("production" !== process.env.NODE_ENV) {
      var reactProps = {
        children: true,
        dangerouslySetInnerHTML: true,
        key: true,
        ref: true
      };
      var warnedProperties = {};
      var warnUnknownProperty = function(name) {
        if (reactProps.hasOwnProperty(name) && reactProps[name] || warnedProperties.hasOwnProperty(name) && warnedProperties[name]) {
          return ;
        }
        warnedProperties[name] = true;
        var lowerCasedName = name.toLowerCase();
        var standardName = (DOMProperty.isCustomAttribute(lowerCasedName) ? lowerCasedName : DOMProperty.getPossibleStandardName.hasOwnProperty(lowerCasedName) ? DOMProperty.getPossibleStandardName[lowerCasedName] : null);
        ("production" !== process.env.NODE_ENV ? warning(standardName == null, 'Unknown DOM property %s. Did you mean %s?', name, standardName) : null);
      };
    }
    var DOMPropertyOperations = {
      createMarkupForID: function(id) {
        return DOMProperty.ID_ATTRIBUTE_NAME + '=' + quoteAttributeValueForBrowser(id);
      },
      createMarkupForProperty: function(name, value) {
        if (DOMProperty.isStandardName.hasOwnProperty(name) && DOMProperty.isStandardName[name]) {
          if (shouldIgnoreValue(name, value)) {
            return '';
          }
          var attributeName = DOMProperty.getAttributeName[name];
          if (DOMProperty.hasBooleanValue[name] || (DOMProperty.hasOverloadedBooleanValue[name] && value === true)) {
            return attributeName;
          }
          return attributeName + '=' + quoteAttributeValueForBrowser(value);
        } else if (DOMProperty.isCustomAttribute(name)) {
          if (value == null) {
            return '';
          }
          return name + '=' + quoteAttributeValueForBrowser(value);
        } else if ("production" !== process.env.NODE_ENV) {
          warnUnknownProperty(name);
        }
        return null;
      },
      setValueForProperty: function(node, name, value) {
        if (DOMProperty.isStandardName.hasOwnProperty(name) && DOMProperty.isStandardName[name]) {
          var mutationMethod = DOMProperty.getMutationMethod[name];
          if (mutationMethod) {
            mutationMethod(node, value);
          } else if (shouldIgnoreValue(name, value)) {
            this.deleteValueForProperty(node, name);
          } else if (DOMProperty.mustUseAttribute[name]) {
            node.setAttribute(DOMProperty.getAttributeName[name], '' + value);
          } else {
            var propName = DOMProperty.getPropertyName[name];
            if (!DOMProperty.hasSideEffects[name] || ('' + node[propName]) !== ('' + value)) {
              node[propName] = value;
            }
          }
        } else if (DOMProperty.isCustomAttribute(name)) {
          if (value == null) {
            node.removeAttribute(name);
          } else {
            node.setAttribute(name, '' + value);
          }
        } else if ("production" !== process.env.NODE_ENV) {
          warnUnknownProperty(name);
        }
      },
      deleteValueForProperty: function(node, name) {
        if (DOMProperty.isStandardName.hasOwnProperty(name) && DOMProperty.isStandardName[name]) {
          var mutationMethod = DOMProperty.getMutationMethod[name];
          if (mutationMethod) {
            mutationMethod(node, undefined);
          } else if (DOMProperty.mustUseAttribute[name]) {
            node.removeAttribute(DOMProperty.getAttributeName[name]);
          } else {
            var propName = DOMProperty.getPropertyName[name];
            var defaultValue = DOMProperty.getDefaultValueForProperty(node.nodeName, propName);
            if (!DOMProperty.hasSideEffects[name] || ('' + node[propName]) !== defaultValue) {
              node[propName] = defaultValue;
            }
          }
        } else if (DOMProperty.isCustomAttribute(name)) {
          node.removeAttribute(name);
        } else if ("production" !== process.env.NODE_ENV) {
          warnUnknownProperty(name);
        }
      }
    };
    module.exports = DOMPropertyOperations;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/CSSPropertyOperations", ["npm:react@0.13.2/lib/CSSProperty", "npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react@0.13.2/lib/camelizeStyleName", "npm:react@0.13.2/lib/dangerousStyleValue", "npm:react@0.13.2/lib/hyphenateStyleName", "npm:react@0.13.2/lib/memoizeStringOnly", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var CSSProperty = require("npm:react@0.13.2/lib/CSSProperty");
    var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
    var camelizeStyleName = require("npm:react@0.13.2/lib/camelizeStyleName");
    var dangerousStyleValue = require("npm:react@0.13.2/lib/dangerousStyleValue");
    var hyphenateStyleName = require("npm:react@0.13.2/lib/hyphenateStyleName");
    var memoizeStringOnly = require("npm:react@0.13.2/lib/memoizeStringOnly");
    var warning = require("npm:react@0.13.2/lib/warning");
    var processStyleName = memoizeStringOnly(function(styleName) {
      return hyphenateStyleName(styleName);
    });
    var styleFloatAccessor = 'cssFloat';
    if (ExecutionEnvironment.canUseDOM) {
      if (document.documentElement.style.cssFloat === undefined) {
        styleFloatAccessor = 'styleFloat';
      }
    }
    if ("production" !== process.env.NODE_ENV) {
      var badVendoredStyleNamePattern = /^(?:webkit|moz|o)[A-Z]/;
      var badStyleValueWithSemicolonPattern = /;\s*$/;
      var warnedStyleNames = {};
      var warnedStyleValues = {};
      var warnHyphenatedStyleName = function(name) {
        if (warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name]) {
          return ;
        }
        warnedStyleNames[name] = true;
        ("production" !== process.env.NODE_ENV ? warning(false, 'Unsupported style property %s. Did you mean %s?', name, camelizeStyleName(name)) : null);
      };
      var warnBadVendoredStyleName = function(name) {
        if (warnedStyleNames.hasOwnProperty(name) && warnedStyleNames[name]) {
          return ;
        }
        warnedStyleNames[name] = true;
        ("production" !== process.env.NODE_ENV ? warning(false, 'Unsupported vendor-prefixed style property %s. Did you mean %s?', name, name.charAt(0).toUpperCase() + name.slice(1)) : null);
      };
      var warnStyleValueWithSemicolon = function(name, value) {
        if (warnedStyleValues.hasOwnProperty(value) && warnedStyleValues[value]) {
          return ;
        }
        warnedStyleValues[value] = true;
        ("production" !== process.env.NODE_ENV ? warning(false, 'Style property values shouldn\'t contain a semicolon. ' + 'Try "%s: %s" instead.', name, value.replace(badStyleValueWithSemicolonPattern, '')) : null);
      };
      var warnValidStyle = function(name, value) {
        if (name.indexOf('-') > -1) {
          warnHyphenatedStyleName(name);
        } else if (badVendoredStyleNamePattern.test(name)) {
          warnBadVendoredStyleName(name);
        } else if (badStyleValueWithSemicolonPattern.test(value)) {
          warnStyleValueWithSemicolon(name, value);
        }
      };
    }
    var CSSPropertyOperations = {
      createMarkupForStyles: function(styles) {
        var serialized = '';
        for (var styleName in styles) {
          if (!styles.hasOwnProperty(styleName)) {
            continue;
          }
          var styleValue = styles[styleName];
          if ("production" !== process.env.NODE_ENV) {
            warnValidStyle(styleName, styleValue);
          }
          if (styleValue != null) {
            serialized += processStyleName(styleName) + ':';
            serialized += dangerousStyleValue(styleName, styleValue) + ';';
          }
        }
        return serialized || null;
      },
      setValueForStyles: function(node, styles) {
        var style = node.style;
        for (var styleName in styles) {
          if (!styles.hasOwnProperty(styleName)) {
            continue;
          }
          if ("production" !== process.env.NODE_ENV) {
            warnValidStyle(styleName, styles[styleName]);
          }
          var styleValue = dangerousStyleValue(styleName, styles[styleName]);
          if (styleName === 'float') {
            styleName = styleFloatAccessor;
          }
          if (styleValue) {
            style[styleName] = styleValue;
          } else {
            var expansion = CSSProperty.shorthandPropertyExpansions[styleName];
            if (expansion) {
              for (var individualStyleName in expansion) {
                style[individualStyleName] = '';
              }
            } else {
              style[styleName] = '';
            }
          }
        }
      }
    };
    module.exports = CSSPropertyOperations;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/createNodesFromMarkup", ["npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react@0.13.2/lib/createArrayFromMixed", "npm:react@0.13.2/lib/getMarkupWrap", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
    var createArrayFromMixed = require("npm:react@0.13.2/lib/createArrayFromMixed");
    var getMarkupWrap = require("npm:react@0.13.2/lib/getMarkupWrap");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var dummyNode = ExecutionEnvironment.canUseDOM ? document.createElement('div') : null;
    var nodeNamePattern = /^\s*<(\w+)/;
    function getNodeName(markup) {
      var nodeNameMatch = markup.match(nodeNamePattern);
      return nodeNameMatch && nodeNameMatch[1].toLowerCase();
    }
    function createNodesFromMarkup(markup, handleScript) {
      var node = dummyNode;
      ("production" !== process.env.NODE_ENV ? invariant(!!dummyNode, 'createNodesFromMarkup dummy not initialized') : invariant(!!dummyNode));
      var nodeName = getNodeName(markup);
      var wrap = nodeName && getMarkupWrap(nodeName);
      if (wrap) {
        node.innerHTML = wrap[1] + markup + wrap[2];
        var wrapDepth = wrap[0];
        while (wrapDepth--) {
          node = node.lastChild;
        }
      } else {
        node.innerHTML = markup;
      }
      var scripts = node.getElementsByTagName('script');
      if (scripts.length) {
        ("production" !== process.env.NODE_ENV ? invariant(handleScript, 'createNodesFromMarkup(...): Unexpected <script> element rendered.') : invariant(handleScript));
        createArrayFromMixed(scripts).forEach(handleScript);
      }
      var nodes = createArrayFromMixed(node.childNodes);
      while (node.lastChild) {
        node.removeChild(node.lastChild);
      }
      return nodes;
    }
    module.exports = createNodesFromMarkup;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactBrowserEventEmitter", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/EventPluginHub", "npm:react@0.13.2/lib/EventPluginRegistry", "npm:react@0.13.2/lib/ReactEventEmitterMixin", "npm:react@0.13.2/lib/ViewportMetrics", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/isEventSupported", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
    var EventPluginHub = require("npm:react@0.13.2/lib/EventPluginHub");
    var EventPluginRegistry = require("npm:react@0.13.2/lib/EventPluginRegistry");
    var ReactEventEmitterMixin = require("npm:react@0.13.2/lib/ReactEventEmitterMixin");
    var ViewportMetrics = require("npm:react@0.13.2/lib/ViewportMetrics");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var isEventSupported = require("npm:react@0.13.2/lib/isEventSupported");
    var alreadyListeningTo = {};
    var isMonitoringScrollValue = false;
    var reactTopListenersCounter = 0;
    var topEventMapping = {
      topBlur: 'blur',
      topChange: 'change',
      topClick: 'click',
      topCompositionEnd: 'compositionend',
      topCompositionStart: 'compositionstart',
      topCompositionUpdate: 'compositionupdate',
      topContextMenu: 'contextmenu',
      topCopy: 'copy',
      topCut: 'cut',
      topDoubleClick: 'dblclick',
      topDrag: 'drag',
      topDragEnd: 'dragend',
      topDragEnter: 'dragenter',
      topDragExit: 'dragexit',
      topDragLeave: 'dragleave',
      topDragOver: 'dragover',
      topDragStart: 'dragstart',
      topDrop: 'drop',
      topFocus: 'focus',
      topInput: 'input',
      topKeyDown: 'keydown',
      topKeyPress: 'keypress',
      topKeyUp: 'keyup',
      topMouseDown: 'mousedown',
      topMouseMove: 'mousemove',
      topMouseOut: 'mouseout',
      topMouseOver: 'mouseover',
      topMouseUp: 'mouseup',
      topPaste: 'paste',
      topScroll: 'scroll',
      topSelectionChange: 'selectionchange',
      topTextInput: 'textInput',
      topTouchCancel: 'touchcancel',
      topTouchEnd: 'touchend',
      topTouchMove: 'touchmove',
      topTouchStart: 'touchstart',
      topWheel: 'wheel'
    };
    var topListenersIDKey = '_reactListenersID' + String(Math.random()).slice(2);
    function getListeningForDocument(mountAt) {
      if (!Object.prototype.hasOwnProperty.call(mountAt, topListenersIDKey)) {
        mountAt[topListenersIDKey] = reactTopListenersCounter++;
        alreadyListeningTo[mountAt[topListenersIDKey]] = {};
      }
      return alreadyListeningTo[mountAt[topListenersIDKey]];
    }
    var ReactBrowserEventEmitter = assign({}, ReactEventEmitterMixin, {
      ReactEventListener: null,
      injection: {injectReactEventListener: function(ReactEventListener) {
          ReactEventListener.setHandleTopLevel(ReactBrowserEventEmitter.handleTopLevel);
          ReactBrowserEventEmitter.ReactEventListener = ReactEventListener;
        }},
      setEnabled: function(enabled) {
        if (ReactBrowserEventEmitter.ReactEventListener) {
          ReactBrowserEventEmitter.ReactEventListener.setEnabled(enabled);
        }
      },
      isEnabled: function() {
        return !!((ReactBrowserEventEmitter.ReactEventListener && ReactBrowserEventEmitter.ReactEventListener.isEnabled()));
      },
      listenTo: function(registrationName, contentDocumentHandle) {
        var mountAt = contentDocumentHandle;
        var isListening = getListeningForDocument(mountAt);
        var dependencies = EventPluginRegistry.registrationNameDependencies[registrationName];
        var topLevelTypes = EventConstants.topLevelTypes;
        for (var i = 0,
            l = dependencies.length; i < l; i++) {
          var dependency = dependencies[i];
          if (!((isListening.hasOwnProperty(dependency) && isListening[dependency]))) {
            if (dependency === topLevelTypes.topWheel) {
              if (isEventSupported('wheel')) {
                ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topWheel, 'wheel', mountAt);
              } else if (isEventSupported('mousewheel')) {
                ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topWheel, 'mousewheel', mountAt);
              } else {
                ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topWheel, 'DOMMouseScroll', mountAt);
              }
            } else if (dependency === topLevelTypes.topScroll) {
              if (isEventSupported('scroll', true)) {
                ReactBrowserEventEmitter.ReactEventListener.trapCapturedEvent(topLevelTypes.topScroll, 'scroll', mountAt);
              } else {
                ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topScroll, 'scroll', ReactBrowserEventEmitter.ReactEventListener.WINDOW_HANDLE);
              }
            } else if (dependency === topLevelTypes.topFocus || dependency === topLevelTypes.topBlur) {
              if (isEventSupported('focus', true)) {
                ReactBrowserEventEmitter.ReactEventListener.trapCapturedEvent(topLevelTypes.topFocus, 'focus', mountAt);
                ReactBrowserEventEmitter.ReactEventListener.trapCapturedEvent(topLevelTypes.topBlur, 'blur', mountAt);
              } else if (isEventSupported('focusin')) {
                ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topFocus, 'focusin', mountAt);
                ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelTypes.topBlur, 'focusout', mountAt);
              }
              isListening[topLevelTypes.topBlur] = true;
              isListening[topLevelTypes.topFocus] = true;
            } else if (topEventMapping.hasOwnProperty(dependency)) {
              ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(dependency, topEventMapping[dependency], mountAt);
            }
            isListening[dependency] = true;
          }
        }
      },
      trapBubbledEvent: function(topLevelType, handlerBaseName, handle) {
        return ReactBrowserEventEmitter.ReactEventListener.trapBubbledEvent(topLevelType, handlerBaseName, handle);
      },
      trapCapturedEvent: function(topLevelType, handlerBaseName, handle) {
        return ReactBrowserEventEmitter.ReactEventListener.trapCapturedEvent(topLevelType, handlerBaseName, handle);
      },
      ensureScrollValueMonitoring: function() {
        if (!isMonitoringScrollValue) {
          var refresh = ViewportMetrics.refreshScrollValues;
          ReactBrowserEventEmitter.ReactEventListener.monitorScrollValue(refresh);
          isMonitoringScrollValue = true;
        }
      },
      eventNameDispatchConfigs: EventPluginHub.eventNameDispatchConfigs,
      registrationNameModules: EventPluginHub.registrationNameModules,
      putListener: EventPluginHub.putListener,
      getListener: EventPluginHub.getListener,
      deleteListener: EventPluginHub.deleteListener,
      deleteAllListeners: EventPluginHub.deleteAllListeners
    });
    module.exports = ReactBrowserEventEmitter;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/containsNode", ["npm:react@0.13.2/lib/isTextNode"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var isTextNode = require("npm:react@0.13.2/lib/isTextNode");
  function containsNode(outerNode, innerNode) {
    if (!outerNode || !innerNode) {
      return false;
    } else if (outerNode === innerNode) {
      return true;
    } else if (isTextNode(outerNode)) {
      return false;
    } else if (isTextNode(innerNode)) {
      return containsNode(outerNode, innerNode.parentNode);
    } else if (outerNode.contains) {
      return outerNode.contains(innerNode);
    } else if (outerNode.compareDocumentPosition) {
      return !!(outerNode.compareDocumentPosition(innerNode) & 16);
    } else {
      return false;
    }
  }
  module.exports = containsNode;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/instantiateReactComponent", ["npm:react@0.13.2/lib/ReactCompositeComponent", "npm:react@0.13.2/lib/ReactEmptyComponent", "npm:react@0.13.2/lib/ReactNativeComponent", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactCompositeComponent = require("npm:react@0.13.2/lib/ReactCompositeComponent");
    var ReactEmptyComponent = require("npm:react@0.13.2/lib/ReactEmptyComponent");
    var ReactNativeComponent = require("npm:react@0.13.2/lib/ReactNativeComponent");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var warning = require("npm:react@0.13.2/lib/warning");
    var ReactCompositeComponentWrapper = function() {};
    assign(ReactCompositeComponentWrapper.prototype, ReactCompositeComponent.Mixin, {_instantiateReactComponent: instantiateReactComponent});
    function isInternalComponentType(type) {
      return (typeof type === 'function' && typeof type.prototype !== 'undefined' && typeof type.prototype.mountComponent === 'function' && typeof type.prototype.receiveComponent === 'function');
    }
    function instantiateReactComponent(node, parentCompositeType) {
      var instance;
      if (node === null || node === false) {
        node = ReactEmptyComponent.emptyElement;
      }
      if (typeof node === 'object') {
        var element = node;
        if ("production" !== process.env.NODE_ENV) {
          ("production" !== process.env.NODE_ENV ? warning(element && (typeof element.type === 'function' || typeof element.type === 'string'), 'Only functions or strings can be mounted as React components.') : null);
        }
        if (parentCompositeType === element.type && typeof element.type === 'string') {
          instance = ReactNativeComponent.createInternalComponent(element);
        } else if (isInternalComponentType(element.type)) {
          instance = new element.type(element);
        } else {
          instance = new ReactCompositeComponentWrapper();
        }
      } else if (typeof node === 'string' || typeof node === 'number') {
        instance = ReactNativeComponent.createInstanceForText(node);
      } else {
        ("production" !== process.env.NODE_ENV ? invariant(false, 'Encountered invalid React node of type %s', typeof node) : invariant(false));
      }
      if ("production" !== process.env.NODE_ENV) {
        ("production" !== process.env.NODE_ENV ? warning(typeof instance.construct === 'function' && typeof instance.mountComponent === 'function' && typeof instance.receiveComponent === 'function' && typeof instance.unmountComponent === 'function', 'Only React Components can be mounted.') : null);
      }
      instance.construct(node);
      instance._mountIndex = 0;
      instance._mountImage = null;
      if ("production" !== process.env.NODE_ENV) {
        instance._isOwnerNecessary = false;
        instance._warnedAboutRefsInRender = false;
      }
      if ("production" !== process.env.NODE_ENV) {
        if (Object.preventExtensions) {
          Object.preventExtensions(instance);
        }
      }
      return instance;
    }
    module.exports = instantiateReactComponent;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactMultiChild", ["npm:react@0.13.2/lib/ReactComponentEnvironment", "npm:react@0.13.2/lib/ReactMultiChildUpdateTypes", "npm:react@0.13.2/lib/ReactReconciler", "npm:react@0.13.2/lib/ReactChildReconciler", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactComponentEnvironment = require("npm:react@0.13.2/lib/ReactComponentEnvironment");
    var ReactMultiChildUpdateTypes = require("npm:react@0.13.2/lib/ReactMultiChildUpdateTypes");
    var ReactReconciler = require("npm:react@0.13.2/lib/ReactReconciler");
    var ReactChildReconciler = require("npm:react@0.13.2/lib/ReactChildReconciler");
    var updateDepth = 0;
    var updateQueue = [];
    var markupQueue = [];
    function enqueueMarkup(parentID, markup, toIndex) {
      updateQueue.push({
        parentID: parentID,
        parentNode: null,
        type: ReactMultiChildUpdateTypes.INSERT_MARKUP,
        markupIndex: markupQueue.push(markup) - 1,
        textContent: null,
        fromIndex: null,
        toIndex: toIndex
      });
    }
    function enqueueMove(parentID, fromIndex, toIndex) {
      updateQueue.push({
        parentID: parentID,
        parentNode: null,
        type: ReactMultiChildUpdateTypes.MOVE_EXISTING,
        markupIndex: null,
        textContent: null,
        fromIndex: fromIndex,
        toIndex: toIndex
      });
    }
    function enqueueRemove(parentID, fromIndex) {
      updateQueue.push({
        parentID: parentID,
        parentNode: null,
        type: ReactMultiChildUpdateTypes.REMOVE_NODE,
        markupIndex: null,
        textContent: null,
        fromIndex: fromIndex,
        toIndex: null
      });
    }
    function enqueueTextContent(parentID, textContent) {
      updateQueue.push({
        parentID: parentID,
        parentNode: null,
        type: ReactMultiChildUpdateTypes.TEXT_CONTENT,
        markupIndex: null,
        textContent: textContent,
        fromIndex: null,
        toIndex: null
      });
    }
    function processQueue() {
      if (updateQueue.length) {
        ReactComponentEnvironment.processChildrenUpdates(updateQueue, markupQueue);
        clearQueue();
      }
    }
    function clearQueue() {
      updateQueue.length = 0;
      markupQueue.length = 0;
    }
    var ReactMultiChild = {Mixin: {
        mountChildren: function(nestedChildren, transaction, context) {
          var children = ReactChildReconciler.instantiateChildren(nestedChildren, transaction, context);
          this._renderedChildren = children;
          var mountImages = [];
          var index = 0;
          for (var name in children) {
            if (children.hasOwnProperty(name)) {
              var child = children[name];
              var rootID = this._rootNodeID + name;
              var mountImage = ReactReconciler.mountComponent(child, rootID, transaction, context);
              child._mountIndex = index;
              mountImages.push(mountImage);
              index++;
            }
          }
          return mountImages;
        },
        updateTextContent: function(nextContent) {
          updateDepth++;
          var errorThrown = true;
          try {
            var prevChildren = this._renderedChildren;
            ReactChildReconciler.unmountChildren(prevChildren);
            for (var name in prevChildren) {
              if (prevChildren.hasOwnProperty(name)) {
                this._unmountChildByName(prevChildren[name], name);
              }
            }
            this.setTextContent(nextContent);
            errorThrown = false;
          } finally {
            updateDepth--;
            if (!updateDepth) {
              if (errorThrown) {
                clearQueue();
              } else {
                processQueue();
              }
            }
          }
        },
        updateChildren: function(nextNestedChildren, transaction, context) {
          updateDepth++;
          var errorThrown = true;
          try {
            this._updateChildren(nextNestedChildren, transaction, context);
            errorThrown = false;
          } finally {
            updateDepth--;
            if (!updateDepth) {
              if (errorThrown) {
                clearQueue();
              } else {
                processQueue();
              }
            }
          }
        },
        _updateChildren: function(nextNestedChildren, transaction, context) {
          var prevChildren = this._renderedChildren;
          var nextChildren = ReactChildReconciler.updateChildren(prevChildren, nextNestedChildren, transaction, context);
          this._renderedChildren = nextChildren;
          if (!nextChildren && !prevChildren) {
            return ;
          }
          var name;
          var lastIndex = 0;
          var nextIndex = 0;
          for (name in nextChildren) {
            if (!nextChildren.hasOwnProperty(name)) {
              continue;
            }
            var prevChild = prevChildren && prevChildren[name];
            var nextChild = nextChildren[name];
            if (prevChild === nextChild) {
              this.moveChild(prevChild, nextIndex, lastIndex);
              lastIndex = Math.max(prevChild._mountIndex, lastIndex);
              prevChild._mountIndex = nextIndex;
            } else {
              if (prevChild) {
                lastIndex = Math.max(prevChild._mountIndex, lastIndex);
                this._unmountChildByName(prevChild, name);
              }
              this._mountChildByNameAtIndex(nextChild, name, nextIndex, transaction, context);
            }
            nextIndex++;
          }
          for (name in prevChildren) {
            if (prevChildren.hasOwnProperty(name) && !(nextChildren && nextChildren.hasOwnProperty(name))) {
              this._unmountChildByName(prevChildren[name], name);
            }
          }
        },
        unmountChildren: function() {
          var renderedChildren = this._renderedChildren;
          ReactChildReconciler.unmountChildren(renderedChildren);
          this._renderedChildren = null;
        },
        moveChild: function(child, toIndex, lastIndex) {
          if (child._mountIndex < lastIndex) {
            enqueueMove(this._rootNodeID, child._mountIndex, toIndex);
          }
        },
        createChild: function(child, mountImage) {
          enqueueMarkup(this._rootNodeID, mountImage, child._mountIndex);
        },
        removeChild: function(child) {
          enqueueRemove(this._rootNodeID, child._mountIndex);
        },
        setTextContent: function(textContent) {
          enqueueTextContent(this._rootNodeID, textContent);
        },
        _mountChildByNameAtIndex: function(child, name, index, transaction, context) {
          var rootID = this._rootNodeID + name;
          var mountImage = ReactReconciler.mountComponent(child, rootID, transaction, context);
          child._mountIndex = index;
          this.createChild(child, mountImage);
        },
        _unmountChildByName: function(child, name) {
          this.removeChild(child);
          child._mountIndex = null;
        }
      }};
    module.exports = ReactMultiChild;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SyntheticCompositionEvent", ["npm:react@0.13.2/lib/SyntheticEvent"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var SyntheticEvent = require("npm:react@0.13.2/lib/SyntheticEvent");
  var CompositionEventInterface = {data: null};
  function SyntheticCompositionEvent(dispatchConfig, dispatchMarker, nativeEvent) {
    SyntheticEvent.call(this, dispatchConfig, dispatchMarker, nativeEvent);
  }
  SyntheticEvent.augmentClass(SyntheticCompositionEvent, CompositionEventInterface);
  module.exports = SyntheticCompositionEvent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/EnterLeaveEventPlugin", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/EventPropagators", "npm:react@0.13.2/lib/SyntheticMouseEvent", "npm:react@0.13.2/lib/ReactMount", "npm:react@0.13.2/lib/keyOf"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
  var EventPropagators = require("npm:react@0.13.2/lib/EventPropagators");
  var SyntheticMouseEvent = require("npm:react@0.13.2/lib/SyntheticMouseEvent");
  var ReactMount = require("npm:react@0.13.2/lib/ReactMount");
  var keyOf = require("npm:react@0.13.2/lib/keyOf");
  var topLevelTypes = EventConstants.topLevelTypes;
  var getFirstReactDOM = ReactMount.getFirstReactDOM;
  var eventTypes = {
    mouseEnter: {
      registrationName: keyOf({onMouseEnter: null}),
      dependencies: [topLevelTypes.topMouseOut, topLevelTypes.topMouseOver]
    },
    mouseLeave: {
      registrationName: keyOf({onMouseLeave: null}),
      dependencies: [topLevelTypes.topMouseOut, topLevelTypes.topMouseOver]
    }
  };
  var extractedEvents = [null, null];
  var EnterLeaveEventPlugin = {
    eventTypes: eventTypes,
    extractEvents: function(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent) {
      if (topLevelType === topLevelTypes.topMouseOver && (nativeEvent.relatedTarget || nativeEvent.fromElement)) {
        return null;
      }
      if (topLevelType !== topLevelTypes.topMouseOut && topLevelType !== topLevelTypes.topMouseOver) {
        return null;
      }
      var win;
      if (topLevelTarget.window === topLevelTarget) {
        win = topLevelTarget;
      } else {
        var doc = topLevelTarget.ownerDocument;
        if (doc) {
          win = doc.defaultView || doc.parentWindow;
        } else {
          win = window;
        }
      }
      var from,
          to;
      if (topLevelType === topLevelTypes.topMouseOut) {
        from = topLevelTarget;
        to = getFirstReactDOM(nativeEvent.relatedTarget || nativeEvent.toElement) || win;
      } else {
        from = win;
        to = topLevelTarget;
      }
      if (from === to) {
        return null;
      }
      var fromID = from ? ReactMount.getID(from) : '';
      var toID = to ? ReactMount.getID(to) : '';
      var leave = SyntheticMouseEvent.getPooled(eventTypes.mouseLeave, fromID, nativeEvent);
      leave.type = 'mouseleave';
      leave.target = from;
      leave.relatedTarget = to;
      var enter = SyntheticMouseEvent.getPooled(eventTypes.mouseEnter, toID, nativeEvent);
      enter.type = 'mouseenter';
      enter.target = to;
      enter.relatedTarget = from;
      EventPropagators.accumulateEnterLeaveDispatches(leave, enter, fromID, toID);
      extractedEvents[0] = leave;
      extractedEvents[1] = enter;
      return extractedEvents;
    }
  };
  module.exports = EnterLeaveEventPlugin;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMButton", ["npm:react@0.13.2/lib/AutoFocusMixin", "npm:react@0.13.2/lib/ReactBrowserComponentMixin", "npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/keyMirror"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var AutoFocusMixin = require("npm:react@0.13.2/lib/AutoFocusMixin");
  var ReactBrowserComponentMixin = require("npm:react@0.13.2/lib/ReactBrowserComponentMixin");
  var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
  var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
  var keyMirror = require("npm:react@0.13.2/lib/keyMirror");
  var button = ReactElement.createFactory('button');
  var mouseListenerNames = keyMirror({
    onClick: true,
    onDoubleClick: true,
    onMouseDown: true,
    onMouseMove: true,
    onMouseUp: true,
    onClickCapture: true,
    onDoubleClickCapture: true,
    onMouseDownCapture: true,
    onMouseMoveCapture: true,
    onMouseUpCapture: true
  });
  var ReactDOMButton = ReactClass.createClass({
    displayName: 'ReactDOMButton',
    tagName: 'BUTTON',
    mixins: [AutoFocusMixin, ReactBrowserComponentMixin],
    render: function() {
      var props = {};
      for (var key in this.props) {
        if (this.props.hasOwnProperty(key) && (!this.props.disabled || !mouseListenerNames[key])) {
          props[key] = this.props[key];
        }
      }
      return button(props, this.props.children);
    }
  });
  module.exports = ReactDOMButton;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMInput", ["npm:react@0.13.2/lib/AutoFocusMixin", "npm:react@0.13.2/lib/DOMPropertyOperations", "npm:react@0.13.2/lib/LinkedValueUtils", "npm:react@0.13.2/lib/ReactBrowserComponentMixin", "npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactMount", "npm:react@0.13.2/lib/ReactUpdates", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var AutoFocusMixin = require("npm:react@0.13.2/lib/AutoFocusMixin");
    var DOMPropertyOperations = require("npm:react@0.13.2/lib/DOMPropertyOperations");
    var LinkedValueUtils = require("npm:react@0.13.2/lib/LinkedValueUtils");
    var ReactBrowserComponentMixin = require("npm:react@0.13.2/lib/ReactBrowserComponentMixin");
    var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactMount = require("npm:react@0.13.2/lib/ReactMount");
    var ReactUpdates = require("npm:react@0.13.2/lib/ReactUpdates");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var input = ReactElement.createFactory('input');
    var instancesByReactID = {};
    function forceUpdateIfMounted() {
      if (this.isMounted()) {
        this.forceUpdate();
      }
    }
    var ReactDOMInput = ReactClass.createClass({
      displayName: 'ReactDOMInput',
      tagName: 'INPUT',
      mixins: [AutoFocusMixin, LinkedValueUtils.Mixin, ReactBrowserComponentMixin],
      getInitialState: function() {
        var defaultValue = this.props.defaultValue;
        return {
          initialChecked: this.props.defaultChecked || false,
          initialValue: defaultValue != null ? defaultValue : null
        };
      },
      render: function() {
        var props = assign({}, this.props);
        props.defaultChecked = null;
        props.defaultValue = null;
        var value = LinkedValueUtils.getValue(this);
        props.value = value != null ? value : this.state.initialValue;
        var checked = LinkedValueUtils.getChecked(this);
        props.checked = checked != null ? checked : this.state.initialChecked;
        props.onChange = this._handleChange;
        return input(props, this.props.children);
      },
      componentDidMount: function() {
        var id = ReactMount.getID(this.getDOMNode());
        instancesByReactID[id] = this;
      },
      componentWillUnmount: function() {
        var rootNode = this.getDOMNode();
        var id = ReactMount.getID(rootNode);
        delete instancesByReactID[id];
      },
      componentDidUpdate: function(prevProps, prevState, prevContext) {
        var rootNode = this.getDOMNode();
        if (this.props.checked != null) {
          DOMPropertyOperations.setValueForProperty(rootNode, 'checked', this.props.checked || false);
        }
        var value = LinkedValueUtils.getValue(this);
        if (value != null) {
          DOMPropertyOperations.setValueForProperty(rootNode, 'value', '' + value);
        }
      },
      _handleChange: function(event) {
        var returnValue;
        var onChange = LinkedValueUtils.getOnChange(this);
        if (onChange) {
          returnValue = onChange.call(this, event);
        }
        ReactUpdates.asap(forceUpdateIfMounted, this);
        var name = this.props.name;
        if (this.props.type === 'radio' && name != null) {
          var rootNode = this.getDOMNode();
          var queryRoot = rootNode;
          while (queryRoot.parentNode) {
            queryRoot = queryRoot.parentNode;
          }
          var group = queryRoot.querySelectorAll('input[name=' + JSON.stringify('' + name) + '][type="radio"]');
          for (var i = 0,
              groupLen = group.length; i < groupLen; i++) {
            var otherNode = group[i];
            if (otherNode === rootNode || otherNode.form !== rootNode.form) {
              continue;
            }
            var otherID = ReactMount.getID(otherNode);
            ("production" !== process.env.NODE_ENV ? invariant(otherID, 'ReactDOMInput: Mixing React and non-React radio inputs with the ' + 'same `name` is not supported.') : invariant(otherID));
            var otherInstance = instancesByReactID[otherID];
            ("production" !== process.env.NODE_ENV ? invariant(otherInstance, 'ReactDOMInput: Unknown radio button ID %s.', otherID) : invariant(otherInstance));
            ReactUpdates.asap(forceUpdateIfMounted, otherInstance);
          }
        }
        return returnValue;
      }
    });
    module.exports = ReactDOMInput;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactInputSelection", ["npm:react@0.13.2/lib/ReactDOMSelection", "npm:react@0.13.2/lib/containsNode", "npm:react@0.13.2/lib/focusNode", "npm:react@0.13.2/lib/getActiveElement"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var ReactDOMSelection = require("npm:react@0.13.2/lib/ReactDOMSelection");
  var containsNode = require("npm:react@0.13.2/lib/containsNode");
  var focusNode = require("npm:react@0.13.2/lib/focusNode");
  var getActiveElement = require("npm:react@0.13.2/lib/getActiveElement");
  function isInDocument(node) {
    return containsNode(document.documentElement, node);
  }
  var ReactInputSelection = {
    hasSelectionCapabilities: function(elem) {
      return elem && (((elem.nodeName === 'INPUT' && elem.type === 'text') || elem.nodeName === 'TEXTAREA' || elem.contentEditable === 'true'));
    },
    getSelectionInformation: function() {
      var focusedElem = getActiveElement();
      return {
        focusedElem: focusedElem,
        selectionRange: ReactInputSelection.hasSelectionCapabilities(focusedElem) ? ReactInputSelection.getSelection(focusedElem) : null
      };
    },
    restoreSelection: function(priorSelectionInformation) {
      var curFocusedElem = getActiveElement();
      var priorFocusedElem = priorSelectionInformation.focusedElem;
      var priorSelectionRange = priorSelectionInformation.selectionRange;
      if (curFocusedElem !== priorFocusedElem && isInDocument(priorFocusedElem)) {
        if (ReactInputSelection.hasSelectionCapabilities(priorFocusedElem)) {
          ReactInputSelection.setSelection(priorFocusedElem, priorSelectionRange);
        }
        focusNode(priorFocusedElem);
      }
    },
    getSelection: function(input) {
      var selection;
      if ('selectionStart' in input) {
        selection = {
          start: input.selectionStart,
          end: input.selectionEnd
        };
      } else if (document.selection && input.nodeName === 'INPUT') {
        var range = document.selection.createRange();
        if (range.parentElement() === input) {
          selection = {
            start: -range.moveStart('character', -input.value.length),
            end: -range.moveEnd('character', -input.value.length)
          };
        }
      } else {
        selection = ReactDOMSelection.getOffsets(input);
      }
      return selection || {
        start: 0,
        end: 0
      };
    },
    setSelection: function(input, offsets) {
      var start = offsets.start;
      var end = offsets.end;
      if (typeof end === 'undefined') {
        end = start;
      }
      if ('selectionStart' in input) {
        input.selectionStart = start;
        input.selectionEnd = Math.min(end, input.value.length);
      } else if (document.selection && input.nodeName === 'INPUT') {
        var range = input.createTextRange();
        range.collapse(true);
        range.moveStart('character', start);
        range.moveEnd('character', end - start);
        range.select();
      } else {
        ReactDOMSelection.setOffsets(input, offsets);
      }
    }
  };
  module.exports = ReactInputSelection;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/SimpleEventPlugin", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/EventPluginUtils", "npm:react@0.13.2/lib/EventPropagators", "npm:react@0.13.2/lib/SyntheticClipboardEvent", "npm:react@0.13.2/lib/SyntheticEvent", "npm:react@0.13.2/lib/SyntheticFocusEvent", "npm:react@0.13.2/lib/SyntheticKeyboardEvent", "npm:react@0.13.2/lib/SyntheticMouseEvent", "npm:react@0.13.2/lib/SyntheticDragEvent", "npm:react@0.13.2/lib/SyntheticTouchEvent", "npm:react@0.13.2/lib/SyntheticUIEvent", "npm:react@0.13.2/lib/SyntheticWheelEvent", "npm:react@0.13.2/lib/getEventCharCode", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/keyOf", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
    var EventPluginUtils = require("npm:react@0.13.2/lib/EventPluginUtils");
    var EventPropagators = require("npm:react@0.13.2/lib/EventPropagators");
    var SyntheticClipboardEvent = require("npm:react@0.13.2/lib/SyntheticClipboardEvent");
    var SyntheticEvent = require("npm:react@0.13.2/lib/SyntheticEvent");
    var SyntheticFocusEvent = require("npm:react@0.13.2/lib/SyntheticFocusEvent");
    var SyntheticKeyboardEvent = require("npm:react@0.13.2/lib/SyntheticKeyboardEvent");
    var SyntheticMouseEvent = require("npm:react@0.13.2/lib/SyntheticMouseEvent");
    var SyntheticDragEvent = require("npm:react@0.13.2/lib/SyntheticDragEvent");
    var SyntheticTouchEvent = require("npm:react@0.13.2/lib/SyntheticTouchEvent");
    var SyntheticUIEvent = require("npm:react@0.13.2/lib/SyntheticUIEvent");
    var SyntheticWheelEvent = require("npm:react@0.13.2/lib/SyntheticWheelEvent");
    var getEventCharCode = require("npm:react@0.13.2/lib/getEventCharCode");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var keyOf = require("npm:react@0.13.2/lib/keyOf");
    var warning = require("npm:react@0.13.2/lib/warning");
    var topLevelTypes = EventConstants.topLevelTypes;
    var eventTypes = {
      blur: {phasedRegistrationNames: {
          bubbled: keyOf({onBlur: true}),
          captured: keyOf({onBlurCapture: true})
        }},
      click: {phasedRegistrationNames: {
          bubbled: keyOf({onClick: true}),
          captured: keyOf({onClickCapture: true})
        }},
      contextMenu: {phasedRegistrationNames: {
          bubbled: keyOf({onContextMenu: true}),
          captured: keyOf({onContextMenuCapture: true})
        }},
      copy: {phasedRegistrationNames: {
          bubbled: keyOf({onCopy: true}),
          captured: keyOf({onCopyCapture: true})
        }},
      cut: {phasedRegistrationNames: {
          bubbled: keyOf({onCut: true}),
          captured: keyOf({onCutCapture: true})
        }},
      doubleClick: {phasedRegistrationNames: {
          bubbled: keyOf({onDoubleClick: true}),
          captured: keyOf({onDoubleClickCapture: true})
        }},
      drag: {phasedRegistrationNames: {
          bubbled: keyOf({onDrag: true}),
          captured: keyOf({onDragCapture: true})
        }},
      dragEnd: {phasedRegistrationNames: {
          bubbled: keyOf({onDragEnd: true}),
          captured: keyOf({onDragEndCapture: true})
        }},
      dragEnter: {phasedRegistrationNames: {
          bubbled: keyOf({onDragEnter: true}),
          captured: keyOf({onDragEnterCapture: true})
        }},
      dragExit: {phasedRegistrationNames: {
          bubbled: keyOf({onDragExit: true}),
          captured: keyOf({onDragExitCapture: true})
        }},
      dragLeave: {phasedRegistrationNames: {
          bubbled: keyOf({onDragLeave: true}),
          captured: keyOf({onDragLeaveCapture: true})
        }},
      dragOver: {phasedRegistrationNames: {
          bubbled: keyOf({onDragOver: true}),
          captured: keyOf({onDragOverCapture: true})
        }},
      dragStart: {phasedRegistrationNames: {
          bubbled: keyOf({onDragStart: true}),
          captured: keyOf({onDragStartCapture: true})
        }},
      drop: {phasedRegistrationNames: {
          bubbled: keyOf({onDrop: true}),
          captured: keyOf({onDropCapture: true})
        }},
      focus: {phasedRegistrationNames: {
          bubbled: keyOf({onFocus: true}),
          captured: keyOf({onFocusCapture: true})
        }},
      input: {phasedRegistrationNames: {
          bubbled: keyOf({onInput: true}),
          captured: keyOf({onInputCapture: true})
        }},
      keyDown: {phasedRegistrationNames: {
          bubbled: keyOf({onKeyDown: true}),
          captured: keyOf({onKeyDownCapture: true})
        }},
      keyPress: {phasedRegistrationNames: {
          bubbled: keyOf({onKeyPress: true}),
          captured: keyOf({onKeyPressCapture: true})
        }},
      keyUp: {phasedRegistrationNames: {
          bubbled: keyOf({onKeyUp: true}),
          captured: keyOf({onKeyUpCapture: true})
        }},
      load: {phasedRegistrationNames: {
          bubbled: keyOf({onLoad: true}),
          captured: keyOf({onLoadCapture: true})
        }},
      error: {phasedRegistrationNames: {
          bubbled: keyOf({onError: true}),
          captured: keyOf({onErrorCapture: true})
        }},
      mouseDown: {phasedRegistrationNames: {
          bubbled: keyOf({onMouseDown: true}),
          captured: keyOf({onMouseDownCapture: true})
        }},
      mouseMove: {phasedRegistrationNames: {
          bubbled: keyOf({onMouseMove: true}),
          captured: keyOf({onMouseMoveCapture: true})
        }},
      mouseOut: {phasedRegistrationNames: {
          bubbled: keyOf({onMouseOut: true}),
          captured: keyOf({onMouseOutCapture: true})
        }},
      mouseOver: {phasedRegistrationNames: {
          bubbled: keyOf({onMouseOver: true}),
          captured: keyOf({onMouseOverCapture: true})
        }},
      mouseUp: {phasedRegistrationNames: {
          bubbled: keyOf({onMouseUp: true}),
          captured: keyOf({onMouseUpCapture: true})
        }},
      paste: {phasedRegistrationNames: {
          bubbled: keyOf({onPaste: true}),
          captured: keyOf({onPasteCapture: true})
        }},
      reset: {phasedRegistrationNames: {
          bubbled: keyOf({onReset: true}),
          captured: keyOf({onResetCapture: true})
        }},
      scroll: {phasedRegistrationNames: {
          bubbled: keyOf({onScroll: true}),
          captured: keyOf({onScrollCapture: true})
        }},
      submit: {phasedRegistrationNames: {
          bubbled: keyOf({onSubmit: true}),
          captured: keyOf({onSubmitCapture: true})
        }},
      touchCancel: {phasedRegistrationNames: {
          bubbled: keyOf({onTouchCancel: true}),
          captured: keyOf({onTouchCancelCapture: true})
        }},
      touchEnd: {phasedRegistrationNames: {
          bubbled: keyOf({onTouchEnd: true}),
          captured: keyOf({onTouchEndCapture: true})
        }},
      touchMove: {phasedRegistrationNames: {
          bubbled: keyOf({onTouchMove: true}),
          captured: keyOf({onTouchMoveCapture: true})
        }},
      touchStart: {phasedRegistrationNames: {
          bubbled: keyOf({onTouchStart: true}),
          captured: keyOf({onTouchStartCapture: true})
        }},
      wheel: {phasedRegistrationNames: {
          bubbled: keyOf({onWheel: true}),
          captured: keyOf({onWheelCapture: true})
        }}
    };
    var topLevelEventsToDispatchConfig = {
      topBlur: eventTypes.blur,
      topClick: eventTypes.click,
      topContextMenu: eventTypes.contextMenu,
      topCopy: eventTypes.copy,
      topCut: eventTypes.cut,
      topDoubleClick: eventTypes.doubleClick,
      topDrag: eventTypes.drag,
      topDragEnd: eventTypes.dragEnd,
      topDragEnter: eventTypes.dragEnter,
      topDragExit: eventTypes.dragExit,
      topDragLeave: eventTypes.dragLeave,
      topDragOver: eventTypes.dragOver,
      topDragStart: eventTypes.dragStart,
      topDrop: eventTypes.drop,
      topError: eventTypes.error,
      topFocus: eventTypes.focus,
      topInput: eventTypes.input,
      topKeyDown: eventTypes.keyDown,
      topKeyPress: eventTypes.keyPress,
      topKeyUp: eventTypes.keyUp,
      topLoad: eventTypes.load,
      topMouseDown: eventTypes.mouseDown,
      topMouseMove: eventTypes.mouseMove,
      topMouseOut: eventTypes.mouseOut,
      topMouseOver: eventTypes.mouseOver,
      topMouseUp: eventTypes.mouseUp,
      topPaste: eventTypes.paste,
      topReset: eventTypes.reset,
      topScroll: eventTypes.scroll,
      topSubmit: eventTypes.submit,
      topTouchCancel: eventTypes.touchCancel,
      topTouchEnd: eventTypes.touchEnd,
      topTouchMove: eventTypes.touchMove,
      topTouchStart: eventTypes.touchStart,
      topWheel: eventTypes.wheel
    };
    for (var type in topLevelEventsToDispatchConfig) {
      topLevelEventsToDispatchConfig[type].dependencies = [type];
    }
    var SimpleEventPlugin = {
      eventTypes: eventTypes,
      executeDispatch: function(event, listener, domID) {
        var returnValue = EventPluginUtils.executeDispatch(event, listener, domID);
        ("production" !== process.env.NODE_ENV ? warning(typeof returnValue !== 'boolean', 'Returning `false` from an event handler is deprecated and will be ' + 'ignored in a future release. Instead, manually call ' + 'e.stopPropagation() or e.preventDefault(), as appropriate.') : null);
        if (returnValue === false) {
          event.stopPropagation();
          event.preventDefault();
        }
      },
      extractEvents: function(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent) {
        var dispatchConfig = topLevelEventsToDispatchConfig[topLevelType];
        if (!dispatchConfig) {
          return null;
        }
        var EventConstructor;
        switch (topLevelType) {
          case topLevelTypes.topInput:
          case topLevelTypes.topLoad:
          case topLevelTypes.topError:
          case topLevelTypes.topReset:
          case topLevelTypes.topSubmit:
            EventConstructor = SyntheticEvent;
            break;
          case topLevelTypes.topKeyPress:
            if (getEventCharCode(nativeEvent) === 0) {
              return null;
            }
          case topLevelTypes.topKeyDown:
          case topLevelTypes.topKeyUp:
            EventConstructor = SyntheticKeyboardEvent;
            break;
          case topLevelTypes.topBlur:
          case topLevelTypes.topFocus:
            EventConstructor = SyntheticFocusEvent;
            break;
          case topLevelTypes.topClick:
            if (nativeEvent.button === 2) {
              return null;
            }
          case topLevelTypes.topContextMenu:
          case topLevelTypes.topDoubleClick:
          case topLevelTypes.topMouseDown:
          case topLevelTypes.topMouseMove:
          case topLevelTypes.topMouseOut:
          case topLevelTypes.topMouseOver:
          case topLevelTypes.topMouseUp:
            EventConstructor = SyntheticMouseEvent;
            break;
          case topLevelTypes.topDrag:
          case topLevelTypes.topDragEnd:
          case topLevelTypes.topDragEnter:
          case topLevelTypes.topDragExit:
          case topLevelTypes.topDragLeave:
          case topLevelTypes.topDragOver:
          case topLevelTypes.topDragStart:
          case topLevelTypes.topDrop:
            EventConstructor = SyntheticDragEvent;
            break;
          case topLevelTypes.topTouchCancel:
          case topLevelTypes.topTouchEnd:
          case topLevelTypes.topTouchMove:
          case topLevelTypes.topTouchStart:
            EventConstructor = SyntheticTouchEvent;
            break;
          case topLevelTypes.topScroll:
            EventConstructor = SyntheticUIEvent;
            break;
          case topLevelTypes.topWheel:
            EventConstructor = SyntheticWheelEvent;
            break;
          case topLevelTypes.topCopy:
          case topLevelTypes.topCut:
          case topLevelTypes.topPaste:
            EventConstructor = SyntheticClipboardEvent;
            break;
        }
        ("production" !== process.env.NODE_ENV ? invariant(EventConstructor, 'SimpleEventPlugin: Unhandled event type, `%s`.', topLevelType) : invariant(EventConstructor));
        var event = EventConstructor.getPooled(dispatchConfig, topLevelTargetID, nativeEvent);
        EventPropagators.accumulateTwoPhaseDispatches(event);
        return event;
      }
    };
    module.exports = SimpleEventPlugin;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDefaultPerf", ["npm:react@0.13.2/lib/DOMProperty", "npm:react@0.13.2/lib/ReactDefaultPerfAnalysis", "npm:react@0.13.2/lib/ReactMount", "npm:react@0.13.2/lib/ReactPerf", "npm:react@0.13.2/lib/performanceNow"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var DOMProperty = require("npm:react@0.13.2/lib/DOMProperty");
  var ReactDefaultPerfAnalysis = require("npm:react@0.13.2/lib/ReactDefaultPerfAnalysis");
  var ReactMount = require("npm:react@0.13.2/lib/ReactMount");
  var ReactPerf = require("npm:react@0.13.2/lib/ReactPerf");
  var performanceNow = require("npm:react@0.13.2/lib/performanceNow");
  function roundFloat(val) {
    return Math.floor(val * 100) / 100;
  }
  function addValue(obj, key, val) {
    obj[key] = (obj[key] || 0) + val;
  }
  var ReactDefaultPerf = {
    _allMeasurements: [],
    _mountStack: [0],
    _injected: false,
    start: function() {
      if (!ReactDefaultPerf._injected) {
        ReactPerf.injection.injectMeasure(ReactDefaultPerf.measure);
      }
      ReactDefaultPerf._allMeasurements.length = 0;
      ReactPerf.enableMeasure = true;
    },
    stop: function() {
      ReactPerf.enableMeasure = false;
    },
    getLastMeasurements: function() {
      return ReactDefaultPerf._allMeasurements;
    },
    printExclusive: function(measurements) {
      measurements = measurements || ReactDefaultPerf._allMeasurements;
      var summary = ReactDefaultPerfAnalysis.getExclusiveSummary(measurements);
      console.table(summary.map(function(item) {
        return {
          'Component class name': item.componentName,
          'Total inclusive time (ms)': roundFloat(item.inclusive),
          'Exclusive mount time (ms)': roundFloat(item.exclusive),
          'Exclusive render time (ms)': roundFloat(item.render),
          'Mount time per instance (ms)': roundFloat(item.exclusive / item.count),
          'Render time per instance (ms)': roundFloat(item.render / item.count),
          'Instances': item.count
        };
      }));
    },
    printInclusive: function(measurements) {
      measurements = measurements || ReactDefaultPerf._allMeasurements;
      var summary = ReactDefaultPerfAnalysis.getInclusiveSummary(measurements);
      console.table(summary.map(function(item) {
        return {
          'Owner > component': item.componentName,
          'Inclusive time (ms)': roundFloat(item.time),
          'Instances': item.count
        };
      }));
      console.log('Total time:', ReactDefaultPerfAnalysis.getTotalTime(measurements).toFixed(2) + ' ms');
    },
    getMeasurementsSummaryMap: function(measurements) {
      var summary = ReactDefaultPerfAnalysis.getInclusiveSummary(measurements, true);
      return summary.map(function(item) {
        return {
          'Owner > component': item.componentName,
          'Wasted time (ms)': item.time,
          'Instances': item.count
        };
      });
    },
    printWasted: function(measurements) {
      measurements = measurements || ReactDefaultPerf._allMeasurements;
      console.table(ReactDefaultPerf.getMeasurementsSummaryMap(measurements));
      console.log('Total time:', ReactDefaultPerfAnalysis.getTotalTime(measurements).toFixed(2) + ' ms');
    },
    printDOM: function(measurements) {
      measurements = measurements || ReactDefaultPerf._allMeasurements;
      var summary = ReactDefaultPerfAnalysis.getDOMSummary(measurements);
      console.table(summary.map(function(item) {
        var result = {};
        result[DOMProperty.ID_ATTRIBUTE_NAME] = item.id;
        result['type'] = item.type;
        result['args'] = JSON.stringify(item.args);
        return result;
      }));
      console.log('Total time:', ReactDefaultPerfAnalysis.getTotalTime(measurements).toFixed(2) + ' ms');
    },
    _recordWrite: function(id, fnName, totalTime, args) {
      var writes = ReactDefaultPerf._allMeasurements[ReactDefaultPerf._allMeasurements.length - 1].writes;
      writes[id] = writes[id] || [];
      writes[id].push({
        type: fnName,
        time: totalTime,
        args: args
      });
    },
    measure: function(moduleName, fnName, func) {
      return function() {
        for (var args = [],
            $__0 = 0,
            $__1 = arguments.length; $__0 < $__1; $__0++)
          args.push(arguments[$__0]);
        var totalTime;
        var rv;
        var start;
        if (fnName === '_renderNewRootComponent' || fnName === 'flushBatchedUpdates') {
          ReactDefaultPerf._allMeasurements.push({
            exclusive: {},
            inclusive: {},
            render: {},
            counts: {},
            writes: {},
            displayNames: {},
            totalTime: 0
          });
          start = performanceNow();
          rv = func.apply(this, args);
          ReactDefaultPerf._allMeasurements[ReactDefaultPerf._allMeasurements.length - 1].totalTime = performanceNow() - start;
          return rv;
        } else if (fnName === '_mountImageIntoNode' || moduleName === 'ReactDOMIDOperations') {
          start = performanceNow();
          rv = func.apply(this, args);
          totalTime = performanceNow() - start;
          if (fnName === '_mountImageIntoNode') {
            var mountID = ReactMount.getID(args[1]);
            ReactDefaultPerf._recordWrite(mountID, fnName, totalTime, args[0]);
          } else if (fnName === 'dangerouslyProcessChildrenUpdates') {
            args[0].forEach(function(update) {
              var writeArgs = {};
              if (update.fromIndex !== null) {
                writeArgs.fromIndex = update.fromIndex;
              }
              if (update.toIndex !== null) {
                writeArgs.toIndex = update.toIndex;
              }
              if (update.textContent !== null) {
                writeArgs.textContent = update.textContent;
              }
              if (update.markupIndex !== null) {
                writeArgs.markup = args[1][update.markupIndex];
              }
              ReactDefaultPerf._recordWrite(update.parentID, update.type, totalTime, writeArgs);
            });
          } else {
            ReactDefaultPerf._recordWrite(args[0], fnName, totalTime, Array.prototype.slice.call(args, 1));
          }
          return rv;
        } else if (moduleName === 'ReactCompositeComponent' && (((fnName === 'mountComponent' || fnName === 'updateComponent' || fnName === '_renderValidatedComponent')))) {
          if (typeof this._currentElement.type === 'string') {
            return func.apply(this, args);
          }
          var rootNodeID = fnName === 'mountComponent' ? args[0] : this._rootNodeID;
          var isRender = fnName === '_renderValidatedComponent';
          var isMount = fnName === 'mountComponent';
          var mountStack = ReactDefaultPerf._mountStack;
          var entry = ReactDefaultPerf._allMeasurements[ReactDefaultPerf._allMeasurements.length - 1];
          if (isRender) {
            addValue(entry.counts, rootNodeID, 1);
          } else if (isMount) {
            mountStack.push(0);
          }
          start = performanceNow();
          rv = func.apply(this, args);
          totalTime = performanceNow() - start;
          if (isRender) {
            addValue(entry.render, rootNodeID, totalTime);
          } else if (isMount) {
            var subMountTime = mountStack.pop();
            mountStack[mountStack.length - 1] += totalTime;
            addValue(entry.exclusive, rootNodeID, totalTime - subMountTime);
            addValue(entry.inclusive, rootNodeID, totalTime);
          } else {
            addValue(entry.inclusive, rootNodeID, totalTime);
          }
          entry.displayNames[rootNodeID] = {
            current: this.getName(),
            owner: this._currentElement._owner ? this._currentElement._owner.getName() : '<root>'
          };
          return rv;
        } else {
          return func.apply(this, args);
        }
      };
    }
  };
  module.exports = ReactDefaultPerf;
  global.define = __define;
  return module.exports;
});

System.register("npm:qs@2.4.1/lib/index", ["npm:qs@2.4.1/lib/stringify", "npm:qs@2.4.1/lib/parse"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var Stringify = require("npm:qs@2.4.1/lib/stringify");
  var Parse = require("npm:qs@2.4.1/lib/parse");
  var internals = {};
  module.exports = {
    stringify: Stringify,
    parse: Parse
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/createRouter", ["npm:react@0.13.2", "npm:react@0.13.2/lib/warning", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react-router@0.13.2/lib/actions/LocationActions", "npm:react-router@0.13.2/lib/behaviors/ImitateBrowserBehavior", "npm:react-router@0.13.2/lib/locations/HashLocation", "npm:react-router@0.13.2/lib/locations/HistoryLocation", "npm:react-router@0.13.2/lib/locations/RefreshLocation", "npm:react-router@0.13.2/lib/locations/StaticLocation", "npm:react-router@0.13.2/lib/ScrollHistory", "npm:react-router@0.13.2/lib/createRoutesFromReactChildren", "npm:react-router@0.13.2/lib/isReactChildren", "npm:react-router@0.13.2/lib/Transition", "npm:react-router@0.13.2/lib/PropTypes", "npm:react-router@0.13.2/lib/Redirect", "npm:react-router@0.13.2/lib/History", "npm:react-router@0.13.2/lib/Cancellation", "npm:react-router@0.13.2/lib/Match", "npm:react-router@0.13.2/lib/Route", "npm:react-router@0.13.2/lib/supportsHistory", "npm:react-router@0.13.2/lib/PathUtils", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    "use strict";
    var React = require("npm:react@0.13.2");
    var warning = require("npm:react@0.13.2/lib/warning");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var canUseDOM = require("npm:react@0.13.2/lib/ExecutionEnvironment").canUseDOM;
    var LocationActions = require("npm:react-router@0.13.2/lib/actions/LocationActions");
    var ImitateBrowserBehavior = require("npm:react-router@0.13.2/lib/behaviors/ImitateBrowserBehavior");
    var HashLocation = require("npm:react-router@0.13.2/lib/locations/HashLocation");
    var HistoryLocation = require("npm:react-router@0.13.2/lib/locations/HistoryLocation");
    var RefreshLocation = require("npm:react-router@0.13.2/lib/locations/RefreshLocation");
    var StaticLocation = require("npm:react-router@0.13.2/lib/locations/StaticLocation");
    var ScrollHistory = require("npm:react-router@0.13.2/lib/ScrollHistory");
    var createRoutesFromReactChildren = require("npm:react-router@0.13.2/lib/createRoutesFromReactChildren");
    var isReactChildren = require("npm:react-router@0.13.2/lib/isReactChildren");
    var Transition = require("npm:react-router@0.13.2/lib/Transition");
    var PropTypes = require("npm:react-router@0.13.2/lib/PropTypes");
    var Redirect = require("npm:react-router@0.13.2/lib/Redirect");
    var History = require("npm:react-router@0.13.2/lib/History");
    var Cancellation = require("npm:react-router@0.13.2/lib/Cancellation");
    var Match = require("npm:react-router@0.13.2/lib/Match");
    var Route = require("npm:react-router@0.13.2/lib/Route");
    var supportsHistory = require("npm:react-router@0.13.2/lib/supportsHistory");
    var PathUtils = require("npm:react-router@0.13.2/lib/PathUtils");
    var DEFAULT_LOCATION = canUseDOM ? HashLocation : "/";
    var DEFAULT_SCROLL_BEHAVIOR = canUseDOM ? ImitateBrowserBehavior : null;
    function hasProperties(object, properties) {
      for (var propertyName in properties)
        if (properties.hasOwnProperty(propertyName) && object[propertyName] !== properties[propertyName]) {
          return false;
        }
      return true;
    }
    function hasMatch(routes, route, prevParams, nextParams, prevQuery, nextQuery) {
      return routes.some(function(r) {
        if (r !== route)
          return false;
        var paramNames = route.paramNames;
        var paramName;
        for (var i = 0,
            len = paramNames.length; i < len; ++i) {
          paramName = paramNames[i];
          if (nextParams[paramName] !== prevParams[paramName])
            return false;
        }
        return hasProperties(prevQuery, nextQuery) && hasProperties(nextQuery, prevQuery);
      });
    }
    function addRoutesToNamedRoutes(routes, namedRoutes) {
      var route;
      for (var i = 0,
          len = routes.length; i < len; ++i) {
        route = routes[i];
        if (route.name) {
          invariant(namedRoutes[route.name] == null, "You may not have more than one route named \"%s\"", route.name);
          namedRoutes[route.name] = route;
        }
        if (route.childRoutes)
          addRoutesToNamedRoutes(route.childRoutes, namedRoutes);
      }
    }
    function routeIsActive(activeRoutes, routeName) {
      return activeRoutes.some(function(route) {
        return route.name === routeName;
      });
    }
    function paramsAreActive(activeParams, params) {
      for (var property in params)
        if (String(activeParams[property]) !== String(params[property])) {
          return false;
        }
      return true;
    }
    function queryIsActive(activeQuery, query) {
      for (var property in query)
        if (String(activeQuery[property]) !== String(query[property])) {
          return false;
        }
      return true;
    }
    function createRouter(options) {
      options = options || {};
      if (isReactChildren(options))
        options = {routes: options};
      var mountedComponents = [];
      var location = options.location || DEFAULT_LOCATION;
      var scrollBehavior = options.scrollBehavior || DEFAULT_SCROLL_BEHAVIOR;
      var state = {};
      var nextState = {};
      var pendingTransition = null;
      var dispatchHandler = null;
      if (typeof location === "string")
        location = new StaticLocation(location);
      if (location instanceof StaticLocation) {
        warning(!canUseDOM || process.env.NODE_ENV === "test", "You should not use a static location in a DOM environment because " + "the router will not be kept in sync with the current URL");
      } else {
        invariant(canUseDOM || location.needsDOM === false, "You cannot use %s without a DOM", location);
      }
      if (location === HistoryLocation && !supportsHistory())
        location = RefreshLocation;
      var Router = React.createClass({
        displayName: "Router",
        statics: {
          isRunning: false,
          cancelPendingTransition: function cancelPendingTransition() {
            if (pendingTransition) {
              pendingTransition.cancel();
              pendingTransition = null;
            }
          },
          clearAllRoutes: function clearAllRoutes() {
            Router.cancelPendingTransition();
            Router.namedRoutes = {};
            Router.routes = [];
          },
          addRoutes: function addRoutes(routes) {
            if (isReactChildren(routes))
              routes = createRoutesFromReactChildren(routes);
            addRoutesToNamedRoutes(routes, Router.namedRoutes);
            Router.routes.push.apply(Router.routes, routes);
          },
          replaceRoutes: function replaceRoutes(routes) {
            Router.clearAllRoutes();
            Router.addRoutes(routes);
            Router.refresh();
          },
          match: function match(path) {
            return Match.findMatch(Router.routes, path);
          },
          makePath: function makePath(to, params, query) {
            var path;
            if (PathUtils.isAbsolute(to)) {
              path = to;
            } else {
              var route = to instanceof Route ? to : Router.namedRoutes[to];
              invariant(route instanceof Route, "Cannot find a route named \"%s\"", to);
              path = route.path;
            }
            return PathUtils.withQuery(PathUtils.injectParams(path, params), query);
          },
          makeHref: function makeHref(to, params, query) {
            var path = Router.makePath(to, params, query);
            return location === HashLocation ? "#" + path : path;
          },
          transitionTo: function transitionTo(to, params, query) {
            var path = Router.makePath(to, params, query);
            if (pendingTransition) {
              location.replace(path);
            } else {
              location.push(path);
            }
          },
          replaceWith: function replaceWith(to, params, query) {
            location.replace(Router.makePath(to, params, query));
          },
          goBack: function goBack() {
            if (History.length > 1 || location === RefreshLocation) {
              location.pop();
              return true;
            }
            warning(false, "goBack() was ignored because there is no router history");
            return false;
          },
          handleAbort: options.onAbort || function(abortReason) {
            if (location instanceof StaticLocation)
              throw new Error("Unhandled aborted transition! Reason: " + abortReason);
            if (abortReason instanceof Cancellation) {
              return ;
            } else if (abortReason instanceof Redirect) {
              location.replace(Router.makePath(abortReason.to, abortReason.params, abortReason.query));
            } else {
              location.pop();
            }
          },
          handleError: options.onError || function(error) {
            throw error;
          },
          handleLocationChange: function handleLocationChange(change) {
            Router.dispatch(change.path, change.type);
          },
          dispatch: function dispatch(path, action) {
            Router.cancelPendingTransition();
            var prevPath = state.path;
            var isRefreshing = action == null;
            if (prevPath === path && !isRefreshing) {
              return ;
            }
            if (prevPath && action === LocationActions.PUSH)
              Router.recordScrollPosition(prevPath);
            var match = Router.match(path);
            warning(match != null, "No route matches path \"%s\". Make sure you have <Route path=\"%s\"> somewhere in your routes", path, path);
            if (match == null)
              match = {};
            var prevRoutes = state.routes || [];
            var prevParams = state.params || {};
            var prevQuery = state.query || {};
            var nextRoutes = match.routes || [];
            var nextParams = match.params || {};
            var nextQuery = match.query || {};
            var fromRoutes,
                toRoutes;
            if (prevRoutes.length) {
              fromRoutes = prevRoutes.filter(function(route) {
                return !hasMatch(nextRoutes, route, prevParams, nextParams, prevQuery, nextQuery);
              });
              toRoutes = nextRoutes.filter(function(route) {
                return !hasMatch(prevRoutes, route, prevParams, nextParams, prevQuery, nextQuery);
              });
            } else {
              fromRoutes = [];
              toRoutes = nextRoutes;
            }
            var transition = new Transition(path, Router.replaceWith.bind(Router, path));
            pendingTransition = transition;
            var fromComponents = mountedComponents.slice(prevRoutes.length - fromRoutes.length);
            Transition.from(transition, fromRoutes, fromComponents, function(error) {
              if (error || transition.abortReason)
                return dispatchHandler.call(Router, error, transition);
              Transition.to(transition, toRoutes, nextParams, nextQuery, function(error) {
                dispatchHandler.call(Router, error, transition, {
                  path: path,
                  action: action,
                  pathname: match.pathname,
                  routes: nextRoutes,
                  params: nextParams,
                  query: nextQuery
                });
              });
            });
          },
          run: function run(callback) {
            invariant(!Router.isRunning, "Router is already running");
            dispatchHandler = function(error, transition, newState) {
              if (error)
                Router.handleError(error);
              if (pendingTransition !== transition)
                return ;
              pendingTransition = null;
              if (transition.abortReason) {
                Router.handleAbort(transition.abortReason);
              } else {
                callback.call(Router, Router, nextState = newState);
              }
            };
            if (!(location instanceof StaticLocation)) {
              if (location.addChangeListener)
                location.addChangeListener(Router.handleLocationChange);
              Router.isRunning = true;
            }
            Router.refresh();
          },
          refresh: function refresh() {
            Router.dispatch(location.getCurrentPath(), null);
          },
          stop: function stop() {
            Router.cancelPendingTransition();
            if (location.removeChangeListener)
              location.removeChangeListener(Router.handleLocationChange);
            Router.isRunning = false;
          },
          getLocation: function getLocation() {
            return location;
          },
          getScrollBehavior: function getScrollBehavior() {
            return scrollBehavior;
          },
          getRouteAtDepth: function getRouteAtDepth(routeDepth) {
            var routes = state.routes;
            return routes && routes[routeDepth];
          },
          setRouteComponentAtDepth: function setRouteComponentAtDepth(routeDepth, component) {
            mountedComponents[routeDepth] = component;
          },
          getCurrentPath: function getCurrentPath() {
            return state.path;
          },
          getCurrentPathname: function getCurrentPathname() {
            return state.pathname;
          },
          getCurrentParams: function getCurrentParams() {
            return state.params;
          },
          getCurrentQuery: function getCurrentQuery() {
            return state.query;
          },
          getCurrentRoutes: function getCurrentRoutes() {
            return state.routes;
          },
          isActive: function isActive(to, params, query) {
            if (PathUtils.isAbsolute(to)) {
              return to === state.path;
            }
            return routeIsActive(state.routes, to) && paramsAreActive(state.params, params) && (query == null || queryIsActive(state.query, query));
          }
        },
        mixins: [ScrollHistory],
        propTypes: {children: PropTypes.falsy},
        childContextTypes: {
          routeDepth: PropTypes.number.isRequired,
          router: PropTypes.router.isRequired
        },
        getChildContext: function getChildContext() {
          return {
            routeDepth: 1,
            router: Router
          };
        },
        getInitialState: function getInitialState() {
          return state = nextState;
        },
        componentWillReceiveProps: function componentWillReceiveProps() {
          this.setState(state = nextState);
        },
        componentWillUnmount: function componentWillUnmount() {
          Router.stop();
        },
        render: function render() {
          var route = Router.getRouteAtDepth(0);
          return route ? React.createElement(route.handler, this.props) : null;
        }
      });
      Router.clearAllRoutes();
      if (options.routes)
        Router.addRoutes(options.routes);
      return Router;
    }
    module.exports = createRouter;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/utils", ["npm:eventemitter3@0.1.6", "npm:native-promise-only@0.7.6-a"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var isObject = exports.isObject = function(obj) {
    var type = typeof obj;
    return type === 'function' || type === 'object' && !!obj;
  };
  exports.extend = function(obj) {
    if (!isObject(obj)) {
      return obj;
    }
    var source,
        prop;
    for (var i = 1,
        length = arguments.length; i < length; i++) {
      source = arguments[i];
      for (prop in source) {
        if (Object.getOwnPropertyDescriptor && Object.defineProperty) {
          var propertyDescriptor = Object.getOwnPropertyDescriptor(source, prop);
          Object.defineProperty(obj, prop, propertyDescriptor);
        } else {
          obj[prop] = source[prop];
        }
      }
    }
    return obj;
  };
  exports.isFunction = function(value) {
    return typeof value === 'function';
  };
  exports.EventEmitter = require("npm:eventemitter3@0.1.6");
  exports.nextTick = function(callback) {
    setTimeout(callback, 0);
  };
  exports.capitalize = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };
  exports.callbackName = function(string) {
    return "on" + exports.capitalize(string);
  };
  exports.object = function(keys, vals) {
    var o = {},
        i = 0;
    for (; i < keys.length; i++) {
      o[keys[i]] = vals[i];
    }
    return o;
  };
  exports.Promise = require("npm:native-promise-only@0.7.6-a");
  exports.createPromise = function(resolver) {
    return new exports.Promise(resolver);
  };
  exports.isArguments = function(value) {
    return typeof value === 'object' && ('callee' in value) && typeof value.length === 'number';
  };
  exports.throwIf = function(val, msg) {
    if (val) {
      throw Error(msg || val);
    }
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/joins", ["npm:reflux@0.2.7/src/utils", "npm:reflux@0.2.7/src/createStore"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var slice = Array.prototype.slice,
      _ = require("npm:reflux@0.2.7/src/utils"),
      createStore = require("npm:reflux@0.2.7/src/createStore"),
      strategyMethodNames = {
        strict: "joinStrict",
        first: "joinLeading",
        last: "joinTrailing",
        all: "joinConcat"
      };
  exports.staticJoinCreator = function(strategy) {
    return function() {
      var listenables = slice.call(arguments);
      return createStore({init: function() {
          this[strategyMethodNames[strategy]].apply(this, listenables.concat("triggerAsync"));
        }});
    };
  };
  exports.instanceJoinCreator = function(strategy) {
    return function() {
      _.throwIf(arguments.length < 3, 'Cannot create a join with less than 2 listenables!');
      var listenables = slice.call(arguments),
          callback = listenables.pop(),
          numberOfListenables = listenables.length,
          join = {
            numberOfListenables: numberOfListenables,
            callback: this[callback] || callback,
            listener: this,
            strategy: strategy
          },
          i,
          cancels = [],
          subobj;
      for (i = 0; i < numberOfListenables; i++) {
        _.throwIf(this.validateListening(listenables[i]));
      }
      for (i = 0; i < numberOfListenables; i++) {
        cancels.push(listenables[i].listen(newListener(i, join), this));
      }
      reset(join);
      subobj = {listenable: listenables};
      subobj.stop = makeStopper(subobj, cancels, this);
      this.subscriptions = (this.subscriptions || []).concat(subobj);
      return subobj;
    };
  };
  function makeStopper(subobj, cancels, context) {
    return function() {
      var i,
          subs = context.subscriptions,
          index = (subs ? subs.indexOf(subobj) : -1);
      _.throwIf(index === -1, 'Tried to remove join already gone from subscriptions list!');
      for (i = 0; i < cancels.length; i++) {
        cancels[i]();
      }
      subs.splice(index, 1);
    };
  }
  function reset(join) {
    join.listenablesEmitted = new Array(join.numberOfListenables);
    join.args = new Array(join.numberOfListenables);
  }
  function newListener(i, join) {
    return function() {
      var callargs = slice.call(arguments);
      if (join.listenablesEmitted[i]) {
        switch (join.strategy) {
          case "strict":
            throw new Error("Strict join failed because listener triggered twice.");
          case "last":
            join.args[i] = callargs;
            break;
          case "all":
            join.args[i].push(callargs);
        }
      } else {
        join.listenablesEmitted[i] = true;
        join.args[i] = (join.strategy === "all" ? [callargs] : callargs);
      }
      emitIfAllListenablesEmitted(join);
    };
  }
  function emitIfAllListenablesEmitted(join) {
    for (var i = 0; i < join.numberOfListenables; i++) {
      if (!join.listenablesEmitted[i]) {
        return ;
      }
    }
    join.callback.apply(join.listener, join.args);
    reset(join);
  }
  global.define = __define;
  return module.exports;
});

System.register("github:jspm/nodelibs-process@0.1.1", ["github:jspm/nodelibs-process@0.1.1/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:jspm/nodelibs-process@0.1.1/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactElement", ["npm:react@0.13.2/lib/ReactContext", "npm:react@0.13.2/lib/ReactCurrentOwner", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactContext = require("npm:react@0.13.2/lib/ReactContext");
    var ReactCurrentOwner = require("npm:react@0.13.2/lib/ReactCurrentOwner");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var warning = require("npm:react@0.13.2/lib/warning");
    var RESERVED_PROPS = {
      key: true,
      ref: true
    };
    function defineWarningProperty(object, key) {
      Object.defineProperty(object, key, {
        configurable: false,
        enumerable: true,
        get: function() {
          if (!this._store) {
            return null;
          }
          return this._store[key];
        },
        set: function(value) {
          ("production" !== process.env.NODE_ENV ? warning(false, 'Don\'t set the %s property of the React element. Instead, ' + 'specify the correct value when initially creating the element.', key) : null);
          this._store[key] = value;
        }
      });
    }
    var useMutationMembrane = false;
    function defineMutationMembrane(prototype) {
      try {
        var pseudoFrozenProperties = {props: true};
        for (var key in pseudoFrozenProperties) {
          defineWarningProperty(prototype, key);
        }
        useMutationMembrane = true;
      } catch (x) {}
    }
    var ReactElement = function(type, key, ref, owner, context, props) {
      this.type = type;
      this.key = key;
      this.ref = ref;
      this._owner = owner;
      this._context = context;
      if ("production" !== process.env.NODE_ENV) {
        this._store = {
          props: props,
          originalProps: assign({}, props)
        };
        try {
          Object.defineProperty(this._store, 'validated', {
            configurable: false,
            enumerable: false,
            writable: true
          });
        } catch (x) {}
        this._store.validated = false;
        if (useMutationMembrane) {
          Object.freeze(this);
          return ;
        }
      }
      this.props = props;
    };
    ReactElement.prototype = {_isReactElement: true};
    if ("production" !== process.env.NODE_ENV) {
      defineMutationMembrane(ReactElement.prototype);
    }
    ReactElement.createElement = function(type, config, children) {
      var propName;
      var props = {};
      var key = null;
      var ref = null;
      if (config != null) {
        ref = config.ref === undefined ? null : config.ref;
        key = config.key === undefined ? null : '' + config.key;
        for (propName in config) {
          if (config.hasOwnProperty(propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
            props[propName] = config[propName];
          }
        }
      }
      var childrenLength = arguments.length - 2;
      if (childrenLength === 1) {
        props.children = children;
      } else if (childrenLength > 1) {
        var childArray = Array(childrenLength);
        for (var i = 0; i < childrenLength; i++) {
          childArray[i] = arguments[i + 2];
        }
        props.children = childArray;
      }
      if (type && type.defaultProps) {
        var defaultProps = type.defaultProps;
        for (propName in defaultProps) {
          if (typeof props[propName] === 'undefined') {
            props[propName] = defaultProps[propName];
          }
        }
      }
      return new ReactElement(type, key, ref, ReactCurrentOwner.current, ReactContext.current, props);
    };
    ReactElement.createFactory = function(type) {
      var factory = ReactElement.createElement.bind(null, type);
      factory.type = type;
      return factory;
    };
    ReactElement.cloneAndReplaceProps = function(oldElement, newProps) {
      var newElement = new ReactElement(oldElement.type, oldElement.key, oldElement.ref, oldElement._owner, oldElement._context, newProps);
      if ("production" !== process.env.NODE_ENV) {
        newElement._store.validated = oldElement._store.validated;
      }
      return newElement;
    };
    ReactElement.cloneElement = function(element, config, children) {
      var propName;
      var props = assign({}, element.props);
      var key = element.key;
      var ref = element.ref;
      var owner = element._owner;
      if (config != null) {
        if (config.ref !== undefined) {
          ref = config.ref;
          owner = ReactCurrentOwner.current;
        }
        if (config.key !== undefined) {
          key = '' + config.key;
        }
        for (propName in config) {
          if (config.hasOwnProperty(propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
            props[propName] = config[propName];
          }
        }
      }
      var childrenLength = arguments.length - 2;
      if (childrenLength === 1) {
        props.children = children;
      } else if (childrenLength > 1) {
        var childArray = Array(childrenLength);
        for (var i = 0; i < childrenLength; i++) {
          childArray[i] = arguments[i + 2];
        }
        props.children = childArray;
      }
      return new ReactElement(element.type, key, ref, owner, element._context, props);
    };
    ReactElement.isValidElement = function(object) {
      var isElement = !!(object && object._isReactElement);
      return isElement;
    };
    module.exports = ReactElement;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactUpdates", ["npm:react@0.13.2/lib/CallbackQueue", "npm:react@0.13.2/lib/PooledClass", "npm:react@0.13.2/lib/ReactCurrentOwner", "npm:react@0.13.2/lib/ReactPerf", "npm:react@0.13.2/lib/ReactReconciler", "npm:react@0.13.2/lib/Transaction", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var CallbackQueue = require("npm:react@0.13.2/lib/CallbackQueue");
    var PooledClass = require("npm:react@0.13.2/lib/PooledClass");
    var ReactCurrentOwner = require("npm:react@0.13.2/lib/ReactCurrentOwner");
    var ReactPerf = require("npm:react@0.13.2/lib/ReactPerf");
    var ReactReconciler = require("npm:react@0.13.2/lib/ReactReconciler");
    var Transaction = require("npm:react@0.13.2/lib/Transaction");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var warning = require("npm:react@0.13.2/lib/warning");
    var dirtyComponents = [];
    var asapCallbackQueue = CallbackQueue.getPooled();
    var asapEnqueued = false;
    var batchingStrategy = null;
    function ensureInjected() {
      ("production" !== process.env.NODE_ENV ? invariant(ReactUpdates.ReactReconcileTransaction && batchingStrategy, 'ReactUpdates: must inject a reconcile transaction class and batching ' + 'strategy') : invariant(ReactUpdates.ReactReconcileTransaction && batchingStrategy));
    }
    var NESTED_UPDATES = {
      initialize: function() {
        this.dirtyComponentsLength = dirtyComponents.length;
      },
      close: function() {
        if (this.dirtyComponentsLength !== dirtyComponents.length) {
          dirtyComponents.splice(0, this.dirtyComponentsLength);
          flushBatchedUpdates();
        } else {
          dirtyComponents.length = 0;
        }
      }
    };
    var UPDATE_QUEUEING = {
      initialize: function() {
        this.callbackQueue.reset();
      },
      close: function() {
        this.callbackQueue.notifyAll();
      }
    };
    var TRANSACTION_WRAPPERS = [NESTED_UPDATES, UPDATE_QUEUEING];
    function ReactUpdatesFlushTransaction() {
      this.reinitializeTransaction();
      this.dirtyComponentsLength = null;
      this.callbackQueue = CallbackQueue.getPooled();
      this.reconcileTransaction = ReactUpdates.ReactReconcileTransaction.getPooled();
    }
    assign(ReactUpdatesFlushTransaction.prototype, Transaction.Mixin, {
      getTransactionWrappers: function() {
        return TRANSACTION_WRAPPERS;
      },
      destructor: function() {
        this.dirtyComponentsLength = null;
        CallbackQueue.release(this.callbackQueue);
        this.callbackQueue = null;
        ReactUpdates.ReactReconcileTransaction.release(this.reconcileTransaction);
        this.reconcileTransaction = null;
      },
      perform: function(method, scope, a) {
        return Transaction.Mixin.perform.call(this, this.reconcileTransaction.perform, this.reconcileTransaction, method, scope, a);
      }
    });
    PooledClass.addPoolingTo(ReactUpdatesFlushTransaction);
    function batchedUpdates(callback, a, b, c, d) {
      ensureInjected();
      batchingStrategy.batchedUpdates(callback, a, b, c, d);
    }
    function mountOrderComparator(c1, c2) {
      return c1._mountOrder - c2._mountOrder;
    }
    function runBatchedUpdates(transaction) {
      var len = transaction.dirtyComponentsLength;
      ("production" !== process.env.NODE_ENV ? invariant(len === dirtyComponents.length, 'Expected flush transaction\'s stored dirty-components length (%s) to ' + 'match dirty-components array length (%s).', len, dirtyComponents.length) : invariant(len === dirtyComponents.length));
      dirtyComponents.sort(mountOrderComparator);
      for (var i = 0; i < len; i++) {
        var component = dirtyComponents[i];
        var callbacks = component._pendingCallbacks;
        component._pendingCallbacks = null;
        ReactReconciler.performUpdateIfNecessary(component, transaction.reconcileTransaction);
        if (callbacks) {
          for (var j = 0; j < callbacks.length; j++) {
            transaction.callbackQueue.enqueue(callbacks[j], component.getPublicInstance());
          }
        }
      }
    }
    var flushBatchedUpdates = function() {
      while (dirtyComponents.length || asapEnqueued) {
        if (dirtyComponents.length) {
          var transaction = ReactUpdatesFlushTransaction.getPooled();
          transaction.perform(runBatchedUpdates, null, transaction);
          ReactUpdatesFlushTransaction.release(transaction);
        }
        if (asapEnqueued) {
          asapEnqueued = false;
          var queue = asapCallbackQueue;
          asapCallbackQueue = CallbackQueue.getPooled();
          queue.notifyAll();
          CallbackQueue.release(queue);
        }
      }
    };
    flushBatchedUpdates = ReactPerf.measure('ReactUpdates', 'flushBatchedUpdates', flushBatchedUpdates);
    function enqueueUpdate(component) {
      ensureInjected();
      ("production" !== process.env.NODE_ENV ? warning(ReactCurrentOwner.current == null, 'enqueueUpdate(): Render methods should be a pure function of props ' + 'and state; triggering nested component updates from render is not ' + 'allowed. If necessary, trigger nested updates in ' + 'componentDidUpdate.') : null);
      if (!batchingStrategy.isBatchingUpdates) {
        batchingStrategy.batchedUpdates(enqueueUpdate, component);
        return ;
      }
      dirtyComponents.push(component);
    }
    function asap(callback, context) {
      ("production" !== process.env.NODE_ENV ? invariant(batchingStrategy.isBatchingUpdates, 'ReactUpdates.asap: Can\'t enqueue an asap callback in a context where' + 'updates are not being batched.') : invariant(batchingStrategy.isBatchingUpdates));
      asapCallbackQueue.enqueue(callback, context);
      asapEnqueued = true;
    }
    var ReactUpdatesInjection = {
      injectReconcileTransaction: function(ReconcileTransaction) {
        ("production" !== process.env.NODE_ENV ? invariant(ReconcileTransaction, 'ReactUpdates: must provide a reconcile transaction class') : invariant(ReconcileTransaction));
        ReactUpdates.ReactReconcileTransaction = ReconcileTransaction;
      },
      injectBatchingStrategy: function(_batchingStrategy) {
        ("production" !== process.env.NODE_ENV ? invariant(_batchingStrategy, 'ReactUpdates: must provide a batching strategy') : invariant(_batchingStrategy));
        ("production" !== process.env.NODE_ENV ? invariant(typeof _batchingStrategy.batchedUpdates === 'function', 'ReactUpdates: must provide a batchedUpdates() function') : invariant(typeof _batchingStrategy.batchedUpdates === 'function'));
        ("production" !== process.env.NODE_ENV ? invariant(typeof _batchingStrategy.isBatchingUpdates === 'boolean', 'ReactUpdates: must provide an isBatchingUpdates boolean attribute') : invariant(typeof _batchingStrategy.isBatchingUpdates === 'boolean'));
        batchingStrategy = _batchingStrategy;
      }
    };
    var ReactUpdates = {
      ReactReconcileTransaction: null,
      batchedUpdates: batchedUpdates,
      enqueueUpdate: enqueueUpdate,
      flushBatchedUpdates: flushBatchedUpdates,
      injection: ReactUpdatesInjection,
      asap: asap
    };
    module.exports = ReactUpdates;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/Danger", ["npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react@0.13.2/lib/createNodesFromMarkup", "npm:react@0.13.2/lib/emptyFunction", "npm:react@0.13.2/lib/getMarkupWrap", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
    var createNodesFromMarkup = require("npm:react@0.13.2/lib/createNodesFromMarkup");
    var emptyFunction = require("npm:react@0.13.2/lib/emptyFunction");
    var getMarkupWrap = require("npm:react@0.13.2/lib/getMarkupWrap");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var OPEN_TAG_NAME_EXP = /^(<[^ \/>]+)/;
    var RESULT_INDEX_ATTR = 'data-danger-index';
    function getNodeName(markup) {
      return markup.substring(1, markup.indexOf(' '));
    }
    var Danger = {
      dangerouslyRenderMarkup: function(markupList) {
        ("production" !== process.env.NODE_ENV ? invariant(ExecutionEnvironment.canUseDOM, 'dangerouslyRenderMarkup(...): Cannot render markup in a worker ' + 'thread. Make sure `window` and `document` are available globally ' + 'before requiring React when unit testing or use ' + 'React.renderToString for server rendering.') : invariant(ExecutionEnvironment.canUseDOM));
        var nodeName;
        var markupByNodeName = {};
        for (var i = 0; i < markupList.length; i++) {
          ("production" !== process.env.NODE_ENV ? invariant(markupList[i], 'dangerouslyRenderMarkup(...): Missing markup.') : invariant(markupList[i]));
          nodeName = getNodeName(markupList[i]);
          nodeName = getMarkupWrap(nodeName) ? nodeName : '*';
          markupByNodeName[nodeName] = markupByNodeName[nodeName] || [];
          markupByNodeName[nodeName][i] = markupList[i];
        }
        var resultList = [];
        var resultListAssignmentCount = 0;
        for (nodeName in markupByNodeName) {
          if (!markupByNodeName.hasOwnProperty(nodeName)) {
            continue;
          }
          var markupListByNodeName = markupByNodeName[nodeName];
          var resultIndex;
          for (resultIndex in markupListByNodeName) {
            if (markupListByNodeName.hasOwnProperty(resultIndex)) {
              var markup = markupListByNodeName[resultIndex];
              markupListByNodeName[resultIndex] = markup.replace(OPEN_TAG_NAME_EXP, '$1 ' + RESULT_INDEX_ATTR + '="' + resultIndex + '" ');
            }
          }
          var renderNodes = createNodesFromMarkup(markupListByNodeName.join(''), emptyFunction);
          for (var j = 0; j < renderNodes.length; ++j) {
            var renderNode = renderNodes[j];
            if (renderNode.hasAttribute && renderNode.hasAttribute(RESULT_INDEX_ATTR)) {
              resultIndex = +renderNode.getAttribute(RESULT_INDEX_ATTR);
              renderNode.removeAttribute(RESULT_INDEX_ATTR);
              ("production" !== process.env.NODE_ENV ? invariant(!resultList.hasOwnProperty(resultIndex), 'Danger: Assigning to an already-occupied result index.') : invariant(!resultList.hasOwnProperty(resultIndex)));
              resultList[resultIndex] = renderNode;
              resultListAssignmentCount += 1;
            } else if ("production" !== process.env.NODE_ENV) {
              console.error('Danger: Discarding unexpected node:', renderNode);
            }
          }
        }
        ("production" !== process.env.NODE_ENV ? invariant(resultListAssignmentCount === resultList.length, 'Danger: Did not assign to every index of resultList.') : invariant(resultListAssignmentCount === resultList.length));
        ("production" !== process.env.NODE_ENV ? invariant(resultList.length === markupList.length, 'Danger: Expected markup to render %s nodes, but rendered %s.', markupList.length, resultList.length) : invariant(resultList.length === markupList.length));
        return resultList;
      },
      dangerouslyReplaceNodeWithMarkup: function(oldChild, markup) {
        ("production" !== process.env.NODE_ENV ? invariant(ExecutionEnvironment.canUseDOM, 'dangerouslyReplaceNodeWithMarkup(...): Cannot render markup in a ' + 'worker thread. Make sure `window` and `document` are available ' + 'globally before requiring React when unit testing or use ' + 'React.renderToString for server rendering.') : invariant(ExecutionEnvironment.canUseDOM));
        ("production" !== process.env.NODE_ENV ? invariant(markup, 'dangerouslyReplaceNodeWithMarkup(...): Missing markup.') : invariant(markup));
        ("production" !== process.env.NODE_ENV ? invariant(oldChild.tagName.toLowerCase() !== 'html', 'dangerouslyReplaceNodeWithMarkup(...): Cannot replace markup of the ' + '<html> node. This is because browser quirks make this unreliable ' + 'and/or slow. If you want to render to the root you must use ' + 'server rendering. See React.renderToString().') : invariant(oldChild.tagName.toLowerCase() !== 'html'));
        var newChild = createNodesFromMarkup(markup, emptyFunction)[0];
        oldChild.parentNode.replaceChild(newChild, oldChild);
      }
    };
    module.exports = Danger;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactMount", ["npm:react@0.13.2/lib/DOMProperty", "npm:react@0.13.2/lib/ReactBrowserEventEmitter", "npm:react@0.13.2/lib/ReactCurrentOwner", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactElementValidator", "npm:react@0.13.2/lib/ReactEmptyComponent", "npm:react@0.13.2/lib/ReactInstanceHandles", "npm:react@0.13.2/lib/ReactInstanceMap", "npm:react@0.13.2/lib/ReactMarkupChecksum", "npm:react@0.13.2/lib/ReactPerf", "npm:react@0.13.2/lib/ReactReconciler", "npm:react@0.13.2/lib/ReactUpdateQueue", "npm:react@0.13.2/lib/ReactUpdates", "npm:react@0.13.2/lib/emptyObject", "npm:react@0.13.2/lib/containsNode", "npm:react@0.13.2/lib/getReactRootElementInContainer", "npm:react@0.13.2/lib/instantiateReactComponent", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/setInnerHTML", "npm:react@0.13.2/lib/shouldUpdateReactComponent", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var DOMProperty = require("npm:react@0.13.2/lib/DOMProperty");
    var ReactBrowserEventEmitter = require("npm:react@0.13.2/lib/ReactBrowserEventEmitter");
    var ReactCurrentOwner = require("npm:react@0.13.2/lib/ReactCurrentOwner");
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactElementValidator = require("npm:react@0.13.2/lib/ReactElementValidator");
    var ReactEmptyComponent = require("npm:react@0.13.2/lib/ReactEmptyComponent");
    var ReactInstanceHandles = require("npm:react@0.13.2/lib/ReactInstanceHandles");
    var ReactInstanceMap = require("npm:react@0.13.2/lib/ReactInstanceMap");
    var ReactMarkupChecksum = require("npm:react@0.13.2/lib/ReactMarkupChecksum");
    var ReactPerf = require("npm:react@0.13.2/lib/ReactPerf");
    var ReactReconciler = require("npm:react@0.13.2/lib/ReactReconciler");
    var ReactUpdateQueue = require("npm:react@0.13.2/lib/ReactUpdateQueue");
    var ReactUpdates = require("npm:react@0.13.2/lib/ReactUpdates");
    var emptyObject = require("npm:react@0.13.2/lib/emptyObject");
    var containsNode = require("npm:react@0.13.2/lib/containsNode");
    var getReactRootElementInContainer = require("npm:react@0.13.2/lib/getReactRootElementInContainer");
    var instantiateReactComponent = require("npm:react@0.13.2/lib/instantiateReactComponent");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var setInnerHTML = require("npm:react@0.13.2/lib/setInnerHTML");
    var shouldUpdateReactComponent = require("npm:react@0.13.2/lib/shouldUpdateReactComponent");
    var warning = require("npm:react@0.13.2/lib/warning");
    var SEPARATOR = ReactInstanceHandles.SEPARATOR;
    var ATTR_NAME = DOMProperty.ID_ATTRIBUTE_NAME;
    var nodeCache = {};
    var ELEMENT_NODE_TYPE = 1;
    var DOC_NODE_TYPE = 9;
    var instancesByReactRootID = {};
    var containersByReactRootID = {};
    if ("production" !== process.env.NODE_ENV) {
      var rootElementsByReactRootID = {};
    }
    var findComponentRootReusableArray = [];
    function firstDifferenceIndex(string1, string2) {
      var minLen = Math.min(string1.length, string2.length);
      for (var i = 0; i < minLen; i++) {
        if (string1.charAt(i) !== string2.charAt(i)) {
          return i;
        }
      }
      return string1.length === string2.length ? -1 : minLen;
    }
    function getReactRootID(container) {
      var rootElement = getReactRootElementInContainer(container);
      return rootElement && ReactMount.getID(rootElement);
    }
    function getID(node) {
      var id = internalGetID(node);
      if (id) {
        if (nodeCache.hasOwnProperty(id)) {
          var cached = nodeCache[id];
          if (cached !== node) {
            ("production" !== process.env.NODE_ENV ? invariant(!isValid(cached, id), 'ReactMount: Two valid but unequal nodes with the same `%s`: %s', ATTR_NAME, id) : invariant(!isValid(cached, id)));
            nodeCache[id] = node;
          }
        } else {
          nodeCache[id] = node;
        }
      }
      return id;
    }
    function internalGetID(node) {
      return node && node.getAttribute && node.getAttribute(ATTR_NAME) || '';
    }
    function setID(node, id) {
      var oldID = internalGetID(node);
      if (oldID !== id) {
        delete nodeCache[oldID];
      }
      node.setAttribute(ATTR_NAME, id);
      nodeCache[id] = node;
    }
    function getNode(id) {
      if (!nodeCache.hasOwnProperty(id) || !isValid(nodeCache[id], id)) {
        nodeCache[id] = ReactMount.findReactNodeByID(id);
      }
      return nodeCache[id];
    }
    function getNodeFromInstance(instance) {
      var id = ReactInstanceMap.get(instance)._rootNodeID;
      if (ReactEmptyComponent.isNullComponentID(id)) {
        return null;
      }
      if (!nodeCache.hasOwnProperty(id) || !isValid(nodeCache[id], id)) {
        nodeCache[id] = ReactMount.findReactNodeByID(id);
      }
      return nodeCache[id];
    }
    function isValid(node, id) {
      if (node) {
        ("production" !== process.env.NODE_ENV ? invariant(internalGetID(node) === id, 'ReactMount: Unexpected modification of `%s`', ATTR_NAME) : invariant(internalGetID(node) === id));
        var container = ReactMount.findReactContainerForID(id);
        if (container && containsNode(container, node)) {
          return true;
        }
      }
      return false;
    }
    function purgeID(id) {
      delete nodeCache[id];
    }
    var deepestNodeSoFar = null;
    function findDeepestCachedAncestorImpl(ancestorID) {
      var ancestor = nodeCache[ancestorID];
      if (ancestor && isValid(ancestor, ancestorID)) {
        deepestNodeSoFar = ancestor;
      } else {
        return false;
      }
    }
    function findDeepestCachedAncestor(targetID) {
      deepestNodeSoFar = null;
      ReactInstanceHandles.traverseAncestors(targetID, findDeepestCachedAncestorImpl);
      var foundNode = deepestNodeSoFar;
      deepestNodeSoFar = null;
      return foundNode;
    }
    function mountComponentIntoNode(componentInstance, rootID, container, transaction, shouldReuseMarkup) {
      var markup = ReactReconciler.mountComponent(componentInstance, rootID, transaction, emptyObject);
      componentInstance._isTopLevel = true;
      ReactMount._mountImageIntoNode(markup, container, shouldReuseMarkup);
    }
    function batchedMountComponentIntoNode(componentInstance, rootID, container, shouldReuseMarkup) {
      var transaction = ReactUpdates.ReactReconcileTransaction.getPooled();
      transaction.perform(mountComponentIntoNode, null, componentInstance, rootID, container, transaction, shouldReuseMarkup);
      ReactUpdates.ReactReconcileTransaction.release(transaction);
    }
    var ReactMount = {
      _instancesByReactRootID: instancesByReactRootID,
      scrollMonitor: function(container, renderCallback) {
        renderCallback();
      },
      _updateRootComponent: function(prevComponent, nextElement, container, callback) {
        if ("production" !== process.env.NODE_ENV) {
          ReactElementValidator.checkAndWarnForMutatedProps(nextElement);
        }
        ReactMount.scrollMonitor(container, function() {
          ReactUpdateQueue.enqueueElementInternal(prevComponent, nextElement);
          if (callback) {
            ReactUpdateQueue.enqueueCallbackInternal(prevComponent, callback);
          }
        });
        if ("production" !== process.env.NODE_ENV) {
          rootElementsByReactRootID[getReactRootID(container)] = getReactRootElementInContainer(container);
        }
        return prevComponent;
      },
      _registerComponent: function(nextComponent, container) {
        ("production" !== process.env.NODE_ENV ? invariant(container && ((container.nodeType === ELEMENT_NODE_TYPE || container.nodeType === DOC_NODE_TYPE)), '_registerComponent(...): Target container is not a DOM element.') : invariant(container && ((container.nodeType === ELEMENT_NODE_TYPE || container.nodeType === DOC_NODE_TYPE))));
        ReactBrowserEventEmitter.ensureScrollValueMonitoring();
        var reactRootID = ReactMount.registerContainer(container);
        instancesByReactRootID[reactRootID] = nextComponent;
        return reactRootID;
      },
      _renderNewRootComponent: function(nextElement, container, shouldReuseMarkup) {
        ("production" !== process.env.NODE_ENV ? warning(ReactCurrentOwner.current == null, '_renderNewRootComponent(): Render methods should be a pure function ' + 'of props and state; triggering nested component updates from ' + 'render is not allowed. If necessary, trigger nested updates in ' + 'componentDidUpdate.') : null);
        var componentInstance = instantiateReactComponent(nextElement, null);
        var reactRootID = ReactMount._registerComponent(componentInstance, container);
        ReactUpdates.batchedUpdates(batchedMountComponentIntoNode, componentInstance, reactRootID, container, shouldReuseMarkup);
        if ("production" !== process.env.NODE_ENV) {
          rootElementsByReactRootID[reactRootID] = getReactRootElementInContainer(container);
        }
        return componentInstance;
      },
      render: function(nextElement, container, callback) {
        ("production" !== process.env.NODE_ENV ? invariant(ReactElement.isValidElement(nextElement), 'React.render(): Invalid component element.%s', (typeof nextElement === 'string' ? ' Instead of passing an element string, make sure to instantiate ' + 'it by passing it to React.createElement.' : typeof nextElement === 'function' ? ' Instead of passing a component class, make sure to instantiate ' + 'it by passing it to React.createElement.' : nextElement != null && nextElement.props !== undefined ? ' This may be caused by unintentionally loading two independent ' + 'copies of React.' : '')) : invariant(ReactElement.isValidElement(nextElement)));
        var prevComponent = instancesByReactRootID[getReactRootID(container)];
        if (prevComponent) {
          var prevElement = prevComponent._currentElement;
          if (shouldUpdateReactComponent(prevElement, nextElement)) {
            return ReactMount._updateRootComponent(prevComponent, nextElement, container, callback).getPublicInstance();
          } else {
            ReactMount.unmountComponentAtNode(container);
          }
        }
        var reactRootElement = getReactRootElementInContainer(container);
        var containerHasReactMarkup = reactRootElement && ReactMount.isRenderedByReact(reactRootElement);
        if ("production" !== process.env.NODE_ENV) {
          if (!containerHasReactMarkup || reactRootElement.nextSibling) {
            var rootElementSibling = reactRootElement;
            while (rootElementSibling) {
              if (ReactMount.isRenderedByReact(rootElementSibling)) {
                ("production" !== process.env.NODE_ENV ? warning(false, 'render(): Target node has markup rendered by React, but there ' + 'are unrelated nodes as well. This is most commonly caused by ' + 'white-space inserted around server-rendered markup.') : null);
                break;
              }
              rootElementSibling = rootElementSibling.nextSibling;
            }
          }
        }
        var shouldReuseMarkup = containerHasReactMarkup && !prevComponent;
        var component = ReactMount._renderNewRootComponent(nextElement, container, shouldReuseMarkup).getPublicInstance();
        if (callback) {
          callback.call(component);
        }
        return component;
      },
      constructAndRenderComponent: function(constructor, props, container) {
        var element = ReactElement.createElement(constructor, props);
        return ReactMount.render(element, container);
      },
      constructAndRenderComponentByID: function(constructor, props, id) {
        var domNode = document.getElementById(id);
        ("production" !== process.env.NODE_ENV ? invariant(domNode, 'Tried to get element with id of "%s" but it is not present on the page.', id) : invariant(domNode));
        return ReactMount.constructAndRenderComponent(constructor, props, domNode);
      },
      registerContainer: function(container) {
        var reactRootID = getReactRootID(container);
        if (reactRootID) {
          reactRootID = ReactInstanceHandles.getReactRootIDFromNodeID(reactRootID);
        }
        if (!reactRootID) {
          reactRootID = ReactInstanceHandles.createReactRootID();
        }
        containersByReactRootID[reactRootID] = container;
        return reactRootID;
      },
      unmountComponentAtNode: function(container) {
        ("production" !== process.env.NODE_ENV ? warning(ReactCurrentOwner.current == null, 'unmountComponentAtNode(): Render methods should be a pure function of ' + 'props and state; triggering nested component updates from render is ' + 'not allowed. If necessary, trigger nested updates in ' + 'componentDidUpdate.') : null);
        ("production" !== process.env.NODE_ENV ? invariant(container && ((container.nodeType === ELEMENT_NODE_TYPE || container.nodeType === DOC_NODE_TYPE)), 'unmountComponentAtNode(...): Target container is not a DOM element.') : invariant(container && ((container.nodeType === ELEMENT_NODE_TYPE || container.nodeType === DOC_NODE_TYPE))));
        var reactRootID = getReactRootID(container);
        var component = instancesByReactRootID[reactRootID];
        if (!component) {
          return false;
        }
        ReactMount.unmountComponentFromNode(component, container);
        delete instancesByReactRootID[reactRootID];
        delete containersByReactRootID[reactRootID];
        if ("production" !== process.env.NODE_ENV) {
          delete rootElementsByReactRootID[reactRootID];
        }
        return true;
      },
      unmountComponentFromNode: function(instance, container) {
        ReactReconciler.unmountComponent(instance);
        if (container.nodeType === DOC_NODE_TYPE) {
          container = container.documentElement;
        }
        while (container.lastChild) {
          container.removeChild(container.lastChild);
        }
      },
      findReactContainerForID: function(id) {
        var reactRootID = ReactInstanceHandles.getReactRootIDFromNodeID(id);
        var container = containersByReactRootID[reactRootID];
        if ("production" !== process.env.NODE_ENV) {
          var rootElement = rootElementsByReactRootID[reactRootID];
          if (rootElement && rootElement.parentNode !== container) {
            ("production" !== process.env.NODE_ENV ? invariant(internalGetID(rootElement) === reactRootID, 'ReactMount: Root element ID differed from reactRootID.') : invariant(internalGetID(rootElement) === reactRootID));
            var containerChild = container.firstChild;
            if (containerChild && reactRootID === internalGetID(containerChild)) {
              rootElementsByReactRootID[reactRootID] = containerChild;
            } else {
              ("production" !== process.env.NODE_ENV ? warning(false, 'ReactMount: Root element has been removed from its original ' + 'container. New container:', rootElement.parentNode) : null);
            }
          }
        }
        return container;
      },
      findReactNodeByID: function(id) {
        var reactRoot = ReactMount.findReactContainerForID(id);
        return ReactMount.findComponentRoot(reactRoot, id);
      },
      isRenderedByReact: function(node) {
        if (node.nodeType !== 1) {
          return false;
        }
        var id = ReactMount.getID(node);
        return id ? id.charAt(0) === SEPARATOR : false;
      },
      getFirstReactDOM: function(node) {
        var current = node;
        while (current && current.parentNode !== current) {
          if (ReactMount.isRenderedByReact(current)) {
            return current;
          }
          current = current.parentNode;
        }
        return null;
      },
      findComponentRoot: function(ancestorNode, targetID) {
        var firstChildren = findComponentRootReusableArray;
        var childIndex = 0;
        var deepestAncestor = findDeepestCachedAncestor(targetID) || ancestorNode;
        firstChildren[0] = deepestAncestor.firstChild;
        firstChildren.length = 1;
        while (childIndex < firstChildren.length) {
          var child = firstChildren[childIndex++];
          var targetChild;
          while (child) {
            var childID = ReactMount.getID(child);
            if (childID) {
              if (targetID === childID) {
                targetChild = child;
              } else if (ReactInstanceHandles.isAncestorIDOf(childID, targetID)) {
                firstChildren.length = childIndex = 0;
                firstChildren.push(child.firstChild);
              }
            } else {
              firstChildren.push(child.firstChild);
            }
            child = child.nextSibling;
          }
          if (targetChild) {
            firstChildren.length = 0;
            return targetChild;
          }
        }
        firstChildren.length = 0;
        ("production" !== process.env.NODE_ENV ? invariant(false, 'findComponentRoot(..., %s): Unable to find element. This probably ' + 'means the DOM was unexpectedly mutated (e.g., by the browser), ' + 'usually due to forgetting a <tbody> when using tables, nesting tags ' + 'like <form>, <p>, or <a>, or using non-SVG elements in an <svg> ' + 'parent. ' + 'Try inspecting the child nodes of the element with React ID `%s`.', targetID, ReactMount.getID(ancestorNode)) : invariant(false));
      },
      _mountImageIntoNode: function(markup, container, shouldReuseMarkup) {
        ("production" !== process.env.NODE_ENV ? invariant(container && ((container.nodeType === ELEMENT_NODE_TYPE || container.nodeType === DOC_NODE_TYPE)), 'mountComponentIntoNode(...): Target container is not valid.') : invariant(container && ((container.nodeType === ELEMENT_NODE_TYPE || container.nodeType === DOC_NODE_TYPE))));
        if (shouldReuseMarkup) {
          var rootElement = getReactRootElementInContainer(container);
          if (ReactMarkupChecksum.canReuseMarkup(markup, rootElement)) {
            return ;
          } else {
            var checksum = rootElement.getAttribute(ReactMarkupChecksum.CHECKSUM_ATTR_NAME);
            rootElement.removeAttribute(ReactMarkupChecksum.CHECKSUM_ATTR_NAME);
            var rootMarkup = rootElement.outerHTML;
            rootElement.setAttribute(ReactMarkupChecksum.CHECKSUM_ATTR_NAME, checksum);
            var diffIndex = firstDifferenceIndex(markup, rootMarkup);
            var difference = ' (client) ' + markup.substring(diffIndex - 20, diffIndex + 20) + '\n (server) ' + rootMarkup.substring(diffIndex - 20, diffIndex + 20);
            ("production" !== process.env.NODE_ENV ? invariant(container.nodeType !== DOC_NODE_TYPE, 'You\'re trying to render a component to the document using ' + 'server rendering but the checksum was invalid. This usually ' + 'means you rendered a different component type or props on ' + 'the client from the one on the server, or your render() ' + 'methods are impure. React cannot handle this case due to ' + 'cross-browser quirks by rendering at the document root. You ' + 'should look for environment dependent code in your components ' + 'and ensure the props are the same client and server side:\n%s', difference) : invariant(container.nodeType !== DOC_NODE_TYPE));
            if ("production" !== process.env.NODE_ENV) {
              ("production" !== process.env.NODE_ENV ? warning(false, 'React attempted to reuse markup in a container but the ' + 'checksum was invalid. This generally means that you are ' + 'using server rendering and the markup generated on the ' + 'server was not what the client was expecting. React injected ' + 'new markup to compensate which works but you have lost many ' + 'of the benefits of server rendering. Instead, figure out ' + 'why the markup being generated is different on the client ' + 'or server:\n%s', difference) : null);
            }
          }
        }
        ("production" !== process.env.NODE_ENV ? invariant(container.nodeType !== DOC_NODE_TYPE, 'You\'re trying to render a component to the document but ' + 'you didn\'t use server rendering. We can\'t do this ' + 'without using server rendering due to cross-browser quirks. ' + 'See React.renderToString() for server rendering.') : invariant(container.nodeType !== DOC_NODE_TYPE));
        setInnerHTML(container, markup);
      },
      getReactRootID: getReactRootID,
      getID: getID,
      setID: setID,
      getNode: getNode,
      getNodeFromInstance: getNodeFromInstance,
      purgeID: purgeID
    };
    ReactPerf.measureMethods(ReactMount, 'ReactMount', {
      _renderNewRootComponent: '_renderNewRootComponent',
      _mountImageIntoNode: '_mountImageIntoNode'
    });
    module.exports = ReactMount;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMComponent", ["npm:react@0.13.2/lib/CSSPropertyOperations", "npm:react@0.13.2/lib/DOMProperty", "npm:react@0.13.2/lib/DOMPropertyOperations", "npm:react@0.13.2/lib/ReactBrowserEventEmitter", "npm:react@0.13.2/lib/ReactComponentBrowserEnvironment", "npm:react@0.13.2/lib/ReactMount", "npm:react@0.13.2/lib/ReactMultiChild", "npm:react@0.13.2/lib/ReactPerf", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/escapeTextContentForBrowser", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/isEventSupported", "npm:react@0.13.2/lib/keyOf", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var CSSPropertyOperations = require("npm:react@0.13.2/lib/CSSPropertyOperations");
    var DOMProperty = require("npm:react@0.13.2/lib/DOMProperty");
    var DOMPropertyOperations = require("npm:react@0.13.2/lib/DOMPropertyOperations");
    var ReactBrowserEventEmitter = require("npm:react@0.13.2/lib/ReactBrowserEventEmitter");
    var ReactComponentBrowserEnvironment = require("npm:react@0.13.2/lib/ReactComponentBrowserEnvironment");
    var ReactMount = require("npm:react@0.13.2/lib/ReactMount");
    var ReactMultiChild = require("npm:react@0.13.2/lib/ReactMultiChild");
    var ReactPerf = require("npm:react@0.13.2/lib/ReactPerf");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var escapeTextContentForBrowser = require("npm:react@0.13.2/lib/escapeTextContentForBrowser");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var isEventSupported = require("npm:react@0.13.2/lib/isEventSupported");
    var keyOf = require("npm:react@0.13.2/lib/keyOf");
    var warning = require("npm:react@0.13.2/lib/warning");
    var deleteListener = ReactBrowserEventEmitter.deleteListener;
    var listenTo = ReactBrowserEventEmitter.listenTo;
    var registrationNameModules = ReactBrowserEventEmitter.registrationNameModules;
    var CONTENT_TYPES = {
      'string': true,
      'number': true
    };
    var STYLE = keyOf({style: null});
    var ELEMENT_NODE_TYPE = 1;
    var BackendIDOperations = null;
    function assertValidProps(props) {
      if (!props) {
        return ;
      }
      if (props.dangerouslySetInnerHTML != null) {
        ("production" !== process.env.NODE_ENV ? invariant(props.children == null, 'Can only set one of `children` or `props.dangerouslySetInnerHTML`.') : invariant(props.children == null));
        ("production" !== process.env.NODE_ENV ? invariant(props.dangerouslySetInnerHTML.__html != null, '`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. ' + 'Please visit http://fb.me/react-invariant-dangerously-set-inner-html ' + 'for more information.') : invariant(props.dangerouslySetInnerHTML.__html != null));
      }
      if ("production" !== process.env.NODE_ENV) {
        ("production" !== process.env.NODE_ENV ? warning(props.innerHTML == null, 'Directly setting property `innerHTML` is not permitted. ' + 'For more information, lookup documentation on `dangerouslySetInnerHTML`.') : null);
        ("production" !== process.env.NODE_ENV ? warning(!props.contentEditable || props.children == null, 'A component is `contentEditable` and contains `children` managed by ' + 'React. It is now your responsibility to guarantee that none of ' + 'those nodes are unexpectedly modified or duplicated. This is ' + 'probably not intentional.') : null);
      }
      ("production" !== process.env.NODE_ENV ? invariant(props.style == null || typeof props.style === 'object', 'The `style` prop expects a mapping from style properties to values, ' + 'not a string. For example, style={{marginRight: spacing + \'em\'}} when ' + 'using JSX.') : invariant(props.style == null || typeof props.style === 'object'));
    }
    function putListener(id, registrationName, listener, transaction) {
      if ("production" !== process.env.NODE_ENV) {
        ("production" !== process.env.NODE_ENV ? warning(registrationName !== 'onScroll' || isEventSupported('scroll', true), 'This browser doesn\'t support the `onScroll` event') : null);
      }
      var container = ReactMount.findReactContainerForID(id);
      if (container) {
        var doc = container.nodeType === ELEMENT_NODE_TYPE ? container.ownerDocument : container;
        listenTo(registrationName, doc);
      }
      transaction.getPutListenerQueue().enqueuePutListener(id, registrationName, listener);
    }
    var omittedCloseTags = {
      'area': true,
      'base': true,
      'br': true,
      'col': true,
      'embed': true,
      'hr': true,
      'img': true,
      'input': true,
      'keygen': true,
      'link': true,
      'meta': true,
      'param': true,
      'source': true,
      'track': true,
      'wbr': true
    };
    var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/;
    var validatedTagCache = {};
    var hasOwnProperty = {}.hasOwnProperty;
    function validateDangerousTag(tag) {
      if (!hasOwnProperty.call(validatedTagCache, tag)) {
        ("production" !== process.env.NODE_ENV ? invariant(VALID_TAG_REGEX.test(tag), 'Invalid tag: %s', tag) : invariant(VALID_TAG_REGEX.test(tag)));
        validatedTagCache[tag] = true;
      }
    }
    function ReactDOMComponent(tag) {
      validateDangerousTag(tag);
      this._tag = tag;
      this._renderedChildren = null;
      this._previousStyleCopy = null;
      this._rootNodeID = null;
    }
    ReactDOMComponent.displayName = 'ReactDOMComponent';
    ReactDOMComponent.Mixin = {
      construct: function(element) {
        this._currentElement = element;
      },
      mountComponent: function(rootID, transaction, context) {
        this._rootNodeID = rootID;
        assertValidProps(this._currentElement.props);
        var closeTag = omittedCloseTags[this._tag] ? '' : '</' + this._tag + '>';
        return (this._createOpenTagMarkupAndPutListeners(transaction) + this._createContentMarkup(transaction, context) + closeTag);
      },
      _createOpenTagMarkupAndPutListeners: function(transaction) {
        var props = this._currentElement.props;
        var ret = '<' + this._tag;
        for (var propKey in props) {
          if (!props.hasOwnProperty(propKey)) {
            continue;
          }
          var propValue = props[propKey];
          if (propValue == null) {
            continue;
          }
          if (registrationNameModules.hasOwnProperty(propKey)) {
            putListener(this._rootNodeID, propKey, propValue, transaction);
          } else {
            if (propKey === STYLE) {
              if (propValue) {
                propValue = this._previousStyleCopy = assign({}, props.style);
              }
              propValue = CSSPropertyOperations.createMarkupForStyles(propValue);
            }
            var markup = DOMPropertyOperations.createMarkupForProperty(propKey, propValue);
            if (markup) {
              ret += ' ' + markup;
            }
          }
        }
        if (transaction.renderToStaticMarkup) {
          return ret + '>';
        }
        var markupForID = DOMPropertyOperations.createMarkupForID(this._rootNodeID);
        return ret + ' ' + markupForID + '>';
      },
      _createContentMarkup: function(transaction, context) {
        var prefix = '';
        if (this._tag === 'listing' || this._tag === 'pre' || this._tag === 'textarea') {
          prefix = '\n';
        }
        var props = this._currentElement.props;
        var innerHTML = props.dangerouslySetInnerHTML;
        if (innerHTML != null) {
          if (innerHTML.__html != null) {
            return prefix + innerHTML.__html;
          }
        } else {
          var contentToUse = CONTENT_TYPES[typeof props.children] ? props.children : null;
          var childrenToUse = contentToUse != null ? null : props.children;
          if (contentToUse != null) {
            return prefix + escapeTextContentForBrowser(contentToUse);
          } else if (childrenToUse != null) {
            var mountImages = this.mountChildren(childrenToUse, transaction, context);
            return prefix + mountImages.join('');
          }
        }
        return prefix;
      },
      receiveComponent: function(nextElement, transaction, context) {
        var prevElement = this._currentElement;
        this._currentElement = nextElement;
        this.updateComponent(transaction, prevElement, nextElement, context);
      },
      updateComponent: function(transaction, prevElement, nextElement, context) {
        assertValidProps(this._currentElement.props);
        this._updateDOMProperties(prevElement.props, transaction);
        this._updateDOMChildren(prevElement.props, transaction, context);
      },
      _updateDOMProperties: function(lastProps, transaction) {
        var nextProps = this._currentElement.props;
        var propKey;
        var styleName;
        var styleUpdates;
        for (propKey in lastProps) {
          if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
            continue;
          }
          if (propKey === STYLE) {
            var lastStyle = this._previousStyleCopy;
            for (styleName in lastStyle) {
              if (lastStyle.hasOwnProperty(styleName)) {
                styleUpdates = styleUpdates || {};
                styleUpdates[styleName] = '';
              }
            }
            this._previousStyleCopy = null;
          } else if (registrationNameModules.hasOwnProperty(propKey)) {
            deleteListener(this._rootNodeID, propKey);
          } else if (DOMProperty.isStandardName[propKey] || DOMProperty.isCustomAttribute(propKey)) {
            BackendIDOperations.deletePropertyByID(this._rootNodeID, propKey);
          }
        }
        for (propKey in nextProps) {
          var nextProp = nextProps[propKey];
          var lastProp = propKey === STYLE ? this._previousStyleCopy : lastProps[propKey];
          if (!nextProps.hasOwnProperty(propKey) || nextProp === lastProp) {
            continue;
          }
          if (propKey === STYLE) {
            if (nextProp) {
              nextProp = this._previousStyleCopy = assign({}, nextProp);
            } else {
              this._previousStyleCopy = null;
            }
            if (lastProp) {
              for (styleName in lastProp) {
                if (lastProp.hasOwnProperty(styleName) && (!nextProp || !nextProp.hasOwnProperty(styleName))) {
                  styleUpdates = styleUpdates || {};
                  styleUpdates[styleName] = '';
                }
              }
              for (styleName in nextProp) {
                if (nextProp.hasOwnProperty(styleName) && lastProp[styleName] !== nextProp[styleName]) {
                  styleUpdates = styleUpdates || {};
                  styleUpdates[styleName] = nextProp[styleName];
                }
              }
            } else {
              styleUpdates = nextProp;
            }
          } else if (registrationNameModules.hasOwnProperty(propKey)) {
            putListener(this._rootNodeID, propKey, nextProp, transaction);
          } else if (DOMProperty.isStandardName[propKey] || DOMProperty.isCustomAttribute(propKey)) {
            BackendIDOperations.updatePropertyByID(this._rootNodeID, propKey, nextProp);
          }
        }
        if (styleUpdates) {
          BackendIDOperations.updateStylesByID(this._rootNodeID, styleUpdates);
        }
      },
      _updateDOMChildren: function(lastProps, transaction, context) {
        var nextProps = this._currentElement.props;
        var lastContent = CONTENT_TYPES[typeof lastProps.children] ? lastProps.children : null;
        var nextContent = CONTENT_TYPES[typeof nextProps.children] ? nextProps.children : null;
        var lastHtml = lastProps.dangerouslySetInnerHTML && lastProps.dangerouslySetInnerHTML.__html;
        var nextHtml = nextProps.dangerouslySetInnerHTML && nextProps.dangerouslySetInnerHTML.__html;
        var lastChildren = lastContent != null ? null : lastProps.children;
        var nextChildren = nextContent != null ? null : nextProps.children;
        var lastHasContentOrHtml = lastContent != null || lastHtml != null;
        var nextHasContentOrHtml = nextContent != null || nextHtml != null;
        if (lastChildren != null && nextChildren == null) {
          this.updateChildren(null, transaction, context);
        } else if (lastHasContentOrHtml && !nextHasContentOrHtml) {
          this.updateTextContent('');
        }
        if (nextContent != null) {
          if (lastContent !== nextContent) {
            this.updateTextContent('' + nextContent);
          }
        } else if (nextHtml != null) {
          if (lastHtml !== nextHtml) {
            BackendIDOperations.updateInnerHTMLByID(this._rootNodeID, nextHtml);
          }
        } else if (nextChildren != null) {
          this.updateChildren(nextChildren, transaction, context);
        }
      },
      unmountComponent: function() {
        this.unmountChildren();
        ReactBrowserEventEmitter.deleteAllListeners(this._rootNodeID);
        ReactComponentBrowserEnvironment.unmountIDFromEnvironment(this._rootNodeID);
        this._rootNodeID = null;
      }
    };
    ReactPerf.measureMethods(ReactDOMComponent, 'ReactDOMComponent', {
      mountComponent: 'mountComponent',
      updateComponent: 'updateComponent'
    });
    assign(ReactDOMComponent.prototype, ReactDOMComponent.Mixin, ReactMultiChild.Mixin);
    ReactDOMComponent.injection = {injectIDOperations: function(IDOperations) {
        ReactDOMComponent.BackendIDOperations = BackendIDOperations = IDOperations;
      }};
    module.exports = ReactDOMComponent;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/BeforeInputEventPlugin", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/EventPropagators", "npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react@0.13.2/lib/FallbackCompositionState", "npm:react@0.13.2/lib/SyntheticCompositionEvent", "npm:react@0.13.2/lib/SyntheticInputEvent", "npm:react@0.13.2/lib/keyOf"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
  var EventPropagators = require("npm:react@0.13.2/lib/EventPropagators");
  var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
  var FallbackCompositionState = require("npm:react@0.13.2/lib/FallbackCompositionState");
  var SyntheticCompositionEvent = require("npm:react@0.13.2/lib/SyntheticCompositionEvent");
  var SyntheticInputEvent = require("npm:react@0.13.2/lib/SyntheticInputEvent");
  var keyOf = require("npm:react@0.13.2/lib/keyOf");
  var END_KEYCODES = [9, 13, 27, 32];
  var START_KEYCODE = 229;
  var canUseCompositionEvent = (ExecutionEnvironment.canUseDOM && 'CompositionEvent' in window);
  var documentMode = null;
  if (ExecutionEnvironment.canUseDOM && 'documentMode' in document) {
    documentMode = document.documentMode;
  }
  var canUseTextInputEvent = (ExecutionEnvironment.canUseDOM && 'TextEvent' in window && !documentMode && !isPresto());
  var useFallbackCompositionData = (ExecutionEnvironment.canUseDOM && ((!canUseCompositionEvent || documentMode && documentMode > 8 && documentMode <= 11)));
  function isPresto() {
    var opera = window.opera;
    return (typeof opera === 'object' && typeof opera.version === 'function' && parseInt(opera.version(), 10) <= 12);
  }
  var SPACEBAR_CODE = 32;
  var SPACEBAR_CHAR = String.fromCharCode(SPACEBAR_CODE);
  var topLevelTypes = EventConstants.topLevelTypes;
  var eventTypes = {
    beforeInput: {
      phasedRegistrationNames: {
        bubbled: keyOf({onBeforeInput: null}),
        captured: keyOf({onBeforeInputCapture: null})
      },
      dependencies: [topLevelTypes.topCompositionEnd, topLevelTypes.topKeyPress, topLevelTypes.topTextInput, topLevelTypes.topPaste]
    },
    compositionEnd: {
      phasedRegistrationNames: {
        bubbled: keyOf({onCompositionEnd: null}),
        captured: keyOf({onCompositionEndCapture: null})
      },
      dependencies: [topLevelTypes.topBlur, topLevelTypes.topCompositionEnd, topLevelTypes.topKeyDown, topLevelTypes.topKeyPress, topLevelTypes.topKeyUp, topLevelTypes.topMouseDown]
    },
    compositionStart: {
      phasedRegistrationNames: {
        bubbled: keyOf({onCompositionStart: null}),
        captured: keyOf({onCompositionStartCapture: null})
      },
      dependencies: [topLevelTypes.topBlur, topLevelTypes.topCompositionStart, topLevelTypes.topKeyDown, topLevelTypes.topKeyPress, topLevelTypes.topKeyUp, topLevelTypes.topMouseDown]
    },
    compositionUpdate: {
      phasedRegistrationNames: {
        bubbled: keyOf({onCompositionUpdate: null}),
        captured: keyOf({onCompositionUpdateCapture: null})
      },
      dependencies: [topLevelTypes.topBlur, topLevelTypes.topCompositionUpdate, topLevelTypes.topKeyDown, topLevelTypes.topKeyPress, topLevelTypes.topKeyUp, topLevelTypes.topMouseDown]
    }
  };
  var hasSpaceKeypress = false;
  function isKeypressCommand(nativeEvent) {
    return ((nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) && !(nativeEvent.ctrlKey && nativeEvent.altKey));
  }
  function getCompositionEventType(topLevelType) {
    switch (topLevelType) {
      case topLevelTypes.topCompositionStart:
        return eventTypes.compositionStart;
      case topLevelTypes.topCompositionEnd:
        return eventTypes.compositionEnd;
      case topLevelTypes.topCompositionUpdate:
        return eventTypes.compositionUpdate;
    }
  }
  function isFallbackCompositionStart(topLevelType, nativeEvent) {
    return (topLevelType === topLevelTypes.topKeyDown && nativeEvent.keyCode === START_KEYCODE);
  }
  function isFallbackCompositionEnd(topLevelType, nativeEvent) {
    switch (topLevelType) {
      case topLevelTypes.topKeyUp:
        return (END_KEYCODES.indexOf(nativeEvent.keyCode) !== -1);
      case topLevelTypes.topKeyDown:
        return (nativeEvent.keyCode !== START_KEYCODE);
      case topLevelTypes.topKeyPress:
      case topLevelTypes.topMouseDown:
      case topLevelTypes.topBlur:
        return true;
      default:
        return false;
    }
  }
  function getDataFromCustomEvent(nativeEvent) {
    var detail = nativeEvent.detail;
    if (typeof detail === 'object' && 'data' in detail) {
      return detail.data;
    }
    return null;
  }
  var currentComposition = null;
  function extractCompositionEvent(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent) {
    var eventType;
    var fallbackData;
    if (canUseCompositionEvent) {
      eventType = getCompositionEventType(topLevelType);
    } else if (!currentComposition) {
      if (isFallbackCompositionStart(topLevelType, nativeEvent)) {
        eventType = eventTypes.compositionStart;
      }
    } else if (isFallbackCompositionEnd(topLevelType, nativeEvent)) {
      eventType = eventTypes.compositionEnd;
    }
    if (!eventType) {
      return null;
    }
    if (useFallbackCompositionData) {
      if (!currentComposition && eventType === eventTypes.compositionStart) {
        currentComposition = FallbackCompositionState.getPooled(topLevelTarget);
      } else if (eventType === eventTypes.compositionEnd) {
        if (currentComposition) {
          fallbackData = currentComposition.getData();
        }
      }
    }
    var event = SyntheticCompositionEvent.getPooled(eventType, topLevelTargetID, nativeEvent);
    if (fallbackData) {
      event.data = fallbackData;
    } else {
      var customData = getDataFromCustomEvent(nativeEvent);
      if (customData !== null) {
        event.data = customData;
      }
    }
    EventPropagators.accumulateTwoPhaseDispatches(event);
    return event;
  }
  function getNativeBeforeInputChars(topLevelType, nativeEvent) {
    switch (topLevelType) {
      case topLevelTypes.topCompositionEnd:
        return getDataFromCustomEvent(nativeEvent);
      case topLevelTypes.topKeyPress:
        var which = nativeEvent.which;
        if (which !== SPACEBAR_CODE) {
          return null;
        }
        hasSpaceKeypress = true;
        return SPACEBAR_CHAR;
      case topLevelTypes.topTextInput:
        var chars = nativeEvent.data;
        if (chars === SPACEBAR_CHAR && hasSpaceKeypress) {
          return null;
        }
        return chars;
      default:
        return null;
    }
  }
  function getFallbackBeforeInputChars(topLevelType, nativeEvent) {
    if (currentComposition) {
      if (topLevelType === topLevelTypes.topCompositionEnd || isFallbackCompositionEnd(topLevelType, nativeEvent)) {
        var chars = currentComposition.getData();
        FallbackCompositionState.release(currentComposition);
        currentComposition = null;
        return chars;
      }
      return null;
    }
    switch (topLevelType) {
      case topLevelTypes.topPaste:
        return null;
      case topLevelTypes.topKeyPress:
        if (nativeEvent.which && !isKeypressCommand(nativeEvent)) {
          return String.fromCharCode(nativeEvent.which);
        }
        return null;
      case topLevelTypes.topCompositionEnd:
        return useFallbackCompositionData ? null : nativeEvent.data;
      default:
        return null;
    }
  }
  function extractBeforeInputEvent(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent) {
    var chars;
    if (canUseTextInputEvent) {
      chars = getNativeBeforeInputChars(topLevelType, nativeEvent);
    } else {
      chars = getFallbackBeforeInputChars(topLevelType, nativeEvent);
    }
    if (!chars) {
      return null;
    }
    var event = SyntheticInputEvent.getPooled(eventTypes.beforeInput, topLevelTargetID, nativeEvent);
    event.data = chars;
    EventPropagators.accumulateTwoPhaseDispatches(event);
    return event;
  }
  var BeforeInputEventPlugin = {
    eventTypes: eventTypes,
    extractEvents: function(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent) {
      return [extractCompositionEvent(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent), extractBeforeInputEvent(topLevelType, topLevelTarget, topLevelTargetID, nativeEvent)];
    }
  };
  module.exports = BeforeInputEventPlugin;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactReconcileTransaction", ["npm:react@0.13.2/lib/CallbackQueue", "npm:react@0.13.2/lib/PooledClass", "npm:react@0.13.2/lib/ReactBrowserEventEmitter", "npm:react@0.13.2/lib/ReactInputSelection", "npm:react@0.13.2/lib/ReactPutListenerQueue", "npm:react@0.13.2/lib/Transaction", "npm:react@0.13.2/lib/Object.assign"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var CallbackQueue = require("npm:react@0.13.2/lib/CallbackQueue");
  var PooledClass = require("npm:react@0.13.2/lib/PooledClass");
  var ReactBrowserEventEmitter = require("npm:react@0.13.2/lib/ReactBrowserEventEmitter");
  var ReactInputSelection = require("npm:react@0.13.2/lib/ReactInputSelection");
  var ReactPutListenerQueue = require("npm:react@0.13.2/lib/ReactPutListenerQueue");
  var Transaction = require("npm:react@0.13.2/lib/Transaction");
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var SELECTION_RESTORATION = {
    initialize: ReactInputSelection.getSelectionInformation,
    close: ReactInputSelection.restoreSelection
  };
  var EVENT_SUPPRESSION = {
    initialize: function() {
      var currentlyEnabled = ReactBrowserEventEmitter.isEnabled();
      ReactBrowserEventEmitter.setEnabled(false);
      return currentlyEnabled;
    },
    close: function(previouslyEnabled) {
      ReactBrowserEventEmitter.setEnabled(previouslyEnabled);
    }
  };
  var ON_DOM_READY_QUEUEING = {
    initialize: function() {
      this.reactMountReady.reset();
    },
    close: function() {
      this.reactMountReady.notifyAll();
    }
  };
  var PUT_LISTENER_QUEUEING = {
    initialize: function() {
      this.putListenerQueue.reset();
    },
    close: function() {
      this.putListenerQueue.putListeners();
    }
  };
  var TRANSACTION_WRAPPERS = [PUT_LISTENER_QUEUEING, SELECTION_RESTORATION, EVENT_SUPPRESSION, ON_DOM_READY_QUEUEING];
  function ReactReconcileTransaction() {
    this.reinitializeTransaction();
    this.renderToStaticMarkup = false;
    this.reactMountReady = CallbackQueue.getPooled(null);
    this.putListenerQueue = ReactPutListenerQueue.getPooled();
  }
  var Mixin = {
    getTransactionWrappers: function() {
      return TRANSACTION_WRAPPERS;
    },
    getReactMountReady: function() {
      return this.reactMountReady;
    },
    getPutListenerQueue: function() {
      return this.putListenerQueue;
    },
    destructor: function() {
      CallbackQueue.release(this.reactMountReady);
      this.reactMountReady = null;
      ReactPutListenerQueue.release(this.putListenerQueue);
      this.putListenerQueue = null;
    }
  };
  assign(ReactReconcileTransaction.prototype, Transaction.Mixin, Mixin);
  PooledClass.addPoolingTo(ReactReconcileTransaction);
  module.exports = ReactReconcileTransaction;
  global.define = __define;
  return module.exports;
});

System.register("npm:qs@2.4.1/index", ["npm:qs@2.4.1/lib/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:qs@2.4.1/lib/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/ListenerMethods", ["npm:reflux@0.2.7/src/utils", "npm:reflux@0.2.7/src/joins"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  var _ = require("npm:reflux@0.2.7/src/utils"),
      maker = require("npm:reflux@0.2.7/src/joins").instanceJoinCreator;
  var mapChildListenables = function(listenable) {
    var i = 0,
        children = {},
        childName;
    for (; i < (listenable.children || []).length; ++i) {
      childName = listenable.children[i];
      if (listenable[childName]) {
        children[childName] = listenable[childName];
      }
    }
    return children;
  };
  var flattenListenables = function(listenables) {
    var flattened = {};
    for (var key in listenables) {
      var listenable = listenables[key];
      var childMap = mapChildListenables(listenable);
      var children = flattenListenables(childMap);
      flattened[key] = listenable;
      for (var childKey in children) {
        var childListenable = children[childKey];
        flattened[key + _.capitalize(childKey)] = childListenable;
      }
    }
    return flattened;
  };
  module.exports = {
    hasListener: function(listenable) {
      var i = 0,
          j,
          listener,
          listenables;
      for (; i < (this.subscriptions || []).length; ++i) {
        listenables = [].concat(this.subscriptions[i].listenable);
        for (j = 0; j < listenables.length; j++) {
          listener = listenables[j];
          if (listener === listenable || listener.hasListener && listener.hasListener(listenable)) {
            return true;
          }
        }
      }
      return false;
    },
    listenToMany: function(listenables) {
      var allListenables = flattenListenables(listenables);
      for (var key in allListenables) {
        var cbname = _.callbackName(key),
            localname = this[cbname] ? cbname : this[key] ? key : undefined;
        if (localname) {
          this.listenTo(allListenables[key], localname, this[cbname + "Default"] || this[localname + "Default"] || localname);
        }
      }
    },
    validateListening: function(listenable) {
      if (listenable === this) {
        return "Listener is not able to listen to itself";
      }
      if (!_.isFunction(listenable.listen)) {
        return listenable + " is missing a listen method";
      }
      if (listenable.hasListener && listenable.hasListener(this)) {
        return "Listener cannot listen to this listenable because of circular loop";
      }
    },
    listenTo: function(listenable, callback, defaultCallback) {
      var desub,
          unsubscriber,
          subscriptionobj,
          subs = this.subscriptions = this.subscriptions || [];
      _.throwIf(this.validateListening(listenable));
      this.fetchInitialState(listenable, defaultCallback);
      desub = listenable.listen(this[callback] || callback, this);
      unsubscriber = function() {
        var index = subs.indexOf(subscriptionobj);
        _.throwIf(index === -1, 'Tried to remove listen already gone from subscriptions list!');
        subs.splice(index, 1);
        desub();
      };
      subscriptionobj = {
        stop: unsubscriber,
        listenable: listenable
      };
      subs.push(subscriptionobj);
      return subscriptionobj;
    },
    stopListeningTo: function(listenable) {
      var sub,
          i = 0,
          subs = this.subscriptions || [];
      for (; i < subs.length; i++) {
        sub = subs[i];
        if (sub.listenable === listenable) {
          sub.stop();
          _.throwIf(subs.indexOf(sub) !== -1, 'Failed to remove listen from subscriptions list!');
          return true;
        }
      }
      return false;
    },
    stopListeningToAll: function() {
      var remaining,
          subs = this.subscriptions || [];
      while ((remaining = subs.length)) {
        subs[0].stop();
        _.throwIf(subs.length !== remaining - 1, 'Failed to remove listen from subscriptions list!');
      }
    },
    fetchInitialState: function(listenable, defaultCallback) {
      defaultCallback = (defaultCallback && this[defaultCallback]) || defaultCallback;
      var me = this;
      if (_.isFunction(defaultCallback) && _.isFunction(listenable.getInitialState)) {
        var data = listenable.getInitialState();
        if (data && _.isFunction(data.then)) {
          data.then(function() {
            defaultCallback.apply(me, arguments);
          });
        } else {
          defaultCallback.call(this, data);
        }
      }
    },
    joinTrailing: maker("last"),
    joinLeading: maker("first"),
    joinConcat: maker("all"),
    joinStrict: maker("strict")
  };
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/invariant", ["github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    "use strict";
    var invariant = function(condition, format, a, b, c, d, e, f) {
      if ("production" !== process.env.NODE_ENV) {
        if (format === undefined) {
          throw new Error('invariant requires an error message argument');
        }
      }
      if (!condition) {
        var error;
        if (format === undefined) {
          error = new Error('Minified exception occurred; use the non-minified dev environment ' + 'for the full error message and additional helpful warnings.');
        } else {
          var args = [a, b, c, d, e, f];
          var argIndex = 0;
          error = new Error('Invariant Violation: ' + format.replace(/%s/g, function() {
            return args[argIndex++];
          }));
        }
        error.framesToPop = 1;
        throw error;
      }
    };
    module.exports = invariant;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactFragment", ["npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var warning = require("npm:react@0.13.2/lib/warning");
    if ("production" !== process.env.NODE_ENV) {
      var fragmentKey = '_reactFragment';
      var didWarnKey = '_reactDidWarn';
      var canWarnForReactFragment = false;
      try {
        var dummy = function() {
          return 1;
        };
        Object.defineProperty({}, fragmentKey, {
          enumerable: false,
          value: true
        });
        Object.defineProperty({}, 'key', {
          enumerable: true,
          get: dummy
        });
        canWarnForReactFragment = true;
      } catch (x) {}
      var proxyPropertyAccessWithWarning = function(obj, key) {
        Object.defineProperty(obj, key, {
          enumerable: true,
          get: function() {
            ("production" !== process.env.NODE_ENV ? warning(this[didWarnKey], 'A ReactFragment is an opaque type. Accessing any of its ' + 'properties is deprecated. Pass it to one of the React.Children ' + 'helpers.') : null);
            this[didWarnKey] = true;
            return this[fragmentKey][key];
          },
          set: function(value) {
            ("production" !== process.env.NODE_ENV ? warning(this[didWarnKey], 'A ReactFragment is an immutable opaque type. Mutating its ' + 'properties is deprecated.') : null);
            this[didWarnKey] = true;
            this[fragmentKey][key] = value;
          }
        });
      };
      var issuedWarnings = {};
      var didWarnForFragment = function(fragment) {
        var fragmentCacheKey = '';
        for (var key in fragment) {
          fragmentCacheKey += key + ':' + (typeof fragment[key]) + ',';
        }
        var alreadyWarnedOnce = !!issuedWarnings[fragmentCacheKey];
        issuedWarnings[fragmentCacheKey] = true;
        return alreadyWarnedOnce;
      };
    }
    var ReactFragment = {
      create: function(object) {
        if ("production" !== process.env.NODE_ENV) {
          if (typeof object !== 'object' || !object || Array.isArray(object)) {
            ("production" !== process.env.NODE_ENV ? warning(false, 'React.addons.createFragment only accepts a single object.', object) : null);
            return object;
          }
          if (ReactElement.isValidElement(object)) {
            ("production" !== process.env.NODE_ENV ? warning(false, 'React.addons.createFragment does not accept a ReactElement ' + 'without a wrapper object.') : null);
            return object;
          }
          if (canWarnForReactFragment) {
            var proxy = {};
            Object.defineProperty(proxy, fragmentKey, {
              enumerable: false,
              value: object
            });
            Object.defineProperty(proxy, didWarnKey, {
              writable: true,
              enumerable: false,
              value: false
            });
            for (var key in object) {
              proxyPropertyAccessWithWarning(proxy, key);
            }
            Object.preventExtensions(proxy);
            return proxy;
          }
        }
        return object;
      },
      extract: function(fragment) {
        if ("production" !== process.env.NODE_ENV) {
          if (canWarnForReactFragment) {
            if (!fragment[fragmentKey]) {
              ("production" !== process.env.NODE_ENV ? warning(didWarnForFragment(fragment), 'Any use of a keyed object should be wrapped in ' + 'React.addons.createFragment(object) before being passed as a ' + 'child.') : null);
              return fragment;
            }
            return fragment[fragmentKey];
          }
        }
        return fragment;
      },
      extractIfFragment: function(fragment) {
        if ("production" !== process.env.NODE_ENV) {
          if (canWarnForReactFragment) {
            if (fragment[fragmentKey]) {
              return fragment[fragmentKey];
            }
            for (var key in fragment) {
              if (fragment.hasOwnProperty(key) && ReactElement.isValidElement(fragment[key])) {
                return ReactFragment.extract(fragment);
              }
            }
          }
        }
        return fragment;
      }
    };
    module.exports = ReactFragment;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactUpdateQueue", ["npm:react@0.13.2/lib/ReactLifeCycle", "npm:react@0.13.2/lib/ReactCurrentOwner", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactInstanceMap", "npm:react@0.13.2/lib/ReactUpdates", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactLifeCycle = require("npm:react@0.13.2/lib/ReactLifeCycle");
    var ReactCurrentOwner = require("npm:react@0.13.2/lib/ReactCurrentOwner");
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactInstanceMap = require("npm:react@0.13.2/lib/ReactInstanceMap");
    var ReactUpdates = require("npm:react@0.13.2/lib/ReactUpdates");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var warning = require("npm:react@0.13.2/lib/warning");
    function enqueueUpdate(internalInstance) {
      if (internalInstance !== ReactLifeCycle.currentlyMountingInstance) {
        ReactUpdates.enqueueUpdate(internalInstance);
      }
    }
    function getInternalInstanceReadyForUpdate(publicInstance, callerName) {
      ("production" !== process.env.NODE_ENV ? invariant(ReactCurrentOwner.current == null, '%s(...): Cannot update during an existing state transition ' + '(such as within `render`). Render methods should be a pure function ' + 'of props and state.', callerName) : invariant(ReactCurrentOwner.current == null));
      var internalInstance = ReactInstanceMap.get(publicInstance);
      if (!internalInstance) {
        if ("production" !== process.env.NODE_ENV) {
          ("production" !== process.env.NODE_ENV ? warning(!callerName, '%s(...): Can only update a mounted or mounting component. ' + 'This usually means you called %s() on an unmounted ' + 'component. This is a no-op.', callerName, callerName) : null);
        }
        return null;
      }
      if (internalInstance === ReactLifeCycle.currentlyUnmountingInstance) {
        return null;
      }
      return internalInstance;
    }
    var ReactUpdateQueue = {
      enqueueCallback: function(publicInstance, callback) {
        ("production" !== process.env.NODE_ENV ? invariant(typeof callback === 'function', 'enqueueCallback(...): You called `setProps`, `replaceProps`, ' + '`setState`, `replaceState`, or `forceUpdate` with a callback that ' + 'isn\'t callable.') : invariant(typeof callback === 'function'));
        var internalInstance = getInternalInstanceReadyForUpdate(publicInstance);
        if (!internalInstance || internalInstance === ReactLifeCycle.currentlyMountingInstance) {
          return null;
        }
        if (internalInstance._pendingCallbacks) {
          internalInstance._pendingCallbacks.push(callback);
        } else {
          internalInstance._pendingCallbacks = [callback];
        }
        enqueueUpdate(internalInstance);
      },
      enqueueCallbackInternal: function(internalInstance, callback) {
        ("production" !== process.env.NODE_ENV ? invariant(typeof callback === 'function', 'enqueueCallback(...): You called `setProps`, `replaceProps`, ' + '`setState`, `replaceState`, or `forceUpdate` with a callback that ' + 'isn\'t callable.') : invariant(typeof callback === 'function'));
        if (internalInstance._pendingCallbacks) {
          internalInstance._pendingCallbacks.push(callback);
        } else {
          internalInstance._pendingCallbacks = [callback];
        }
        enqueueUpdate(internalInstance);
      },
      enqueueForceUpdate: function(publicInstance) {
        var internalInstance = getInternalInstanceReadyForUpdate(publicInstance, 'forceUpdate');
        if (!internalInstance) {
          return ;
        }
        internalInstance._pendingForceUpdate = true;
        enqueueUpdate(internalInstance);
      },
      enqueueReplaceState: function(publicInstance, completeState) {
        var internalInstance = getInternalInstanceReadyForUpdate(publicInstance, 'replaceState');
        if (!internalInstance) {
          return ;
        }
        internalInstance._pendingStateQueue = [completeState];
        internalInstance._pendingReplaceState = true;
        enqueueUpdate(internalInstance);
      },
      enqueueSetState: function(publicInstance, partialState) {
        var internalInstance = getInternalInstanceReadyForUpdate(publicInstance, 'setState');
        if (!internalInstance) {
          return ;
        }
        var queue = internalInstance._pendingStateQueue || (internalInstance._pendingStateQueue = []);
        queue.push(partialState);
        enqueueUpdate(internalInstance);
      },
      enqueueSetProps: function(publicInstance, partialProps) {
        var internalInstance = getInternalInstanceReadyForUpdate(publicInstance, 'setProps');
        if (!internalInstance) {
          return ;
        }
        ("production" !== process.env.NODE_ENV ? invariant(internalInstance._isTopLevel, 'setProps(...): You called `setProps` on a ' + 'component with a parent. This is an anti-pattern since props will ' + 'get reactively updated when rendered. Instead, change the owner\'s ' + '`render` method to pass the correct value as props to the component ' + 'where it is created.') : invariant(internalInstance._isTopLevel));
        var element = internalInstance._pendingElement || internalInstance._currentElement;
        var props = assign({}, element.props, partialProps);
        internalInstance._pendingElement = ReactElement.cloneAndReplaceProps(element, props);
        enqueueUpdate(internalInstance);
      },
      enqueueReplaceProps: function(publicInstance, props) {
        var internalInstance = getInternalInstanceReadyForUpdate(publicInstance, 'replaceProps');
        if (!internalInstance) {
          return ;
        }
        ("production" !== process.env.NODE_ENV ? invariant(internalInstance._isTopLevel, 'replaceProps(...): You called `replaceProps` on a ' + 'component with a parent. This is an anti-pattern since props will ' + 'get reactively updated when rendered. Instead, change the owner\'s ' + '`render` method to pass the correct value as props to the component ' + 'where it is created.') : invariant(internalInstance._isTopLevel));
        var element = internalInstance._pendingElement || internalInstance._currentElement;
        internalInstance._pendingElement = ReactElement.cloneAndReplaceProps(element, props);
        enqueueUpdate(internalInstance);
      },
      enqueueElementInternal: function(internalInstance, newElement) {
        internalInstance._pendingElement = newElement;
        enqueueUpdate(internalInstance);
      }
    };
    module.exports = ReactUpdateQueue;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/DOMChildrenOperations", ["npm:react@0.13.2/lib/Danger", "npm:react@0.13.2/lib/ReactMultiChildUpdateTypes", "npm:react@0.13.2/lib/setTextContent", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var Danger = require("npm:react@0.13.2/lib/Danger");
    var ReactMultiChildUpdateTypes = require("npm:react@0.13.2/lib/ReactMultiChildUpdateTypes");
    var setTextContent = require("npm:react@0.13.2/lib/setTextContent");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    function insertChildAt(parentNode, childNode, index) {
      parentNode.insertBefore(childNode, parentNode.childNodes[index] || null);
    }
    var DOMChildrenOperations = {
      dangerouslyReplaceNodeWithMarkup: Danger.dangerouslyReplaceNodeWithMarkup,
      updateTextContent: setTextContent,
      processUpdates: function(updates, markupList) {
        var update;
        var initialChildren = null;
        var updatedChildren = null;
        for (var i = 0; i < updates.length; i++) {
          update = updates[i];
          if (update.type === ReactMultiChildUpdateTypes.MOVE_EXISTING || update.type === ReactMultiChildUpdateTypes.REMOVE_NODE) {
            var updatedIndex = update.fromIndex;
            var updatedChild = update.parentNode.childNodes[updatedIndex];
            var parentID = update.parentID;
            ("production" !== process.env.NODE_ENV ? invariant(updatedChild, 'processUpdates(): Unable to find child %s of element. This ' + 'probably means the DOM was unexpectedly mutated (e.g., by the ' + 'browser), usually due to forgetting a <tbody> when using tables, ' + 'nesting tags like <form>, <p>, or <a>, or using non-SVG elements ' + 'in an <svg> parent. Try inspecting the child nodes of the element ' + 'with React ID `%s`.', updatedIndex, parentID) : invariant(updatedChild));
            initialChildren = initialChildren || {};
            initialChildren[parentID] = initialChildren[parentID] || [];
            initialChildren[parentID][updatedIndex] = updatedChild;
            updatedChildren = updatedChildren || [];
            updatedChildren.push(updatedChild);
          }
        }
        var renderedMarkup = Danger.dangerouslyRenderMarkup(markupList);
        if (updatedChildren) {
          for (var j = 0; j < updatedChildren.length; j++) {
            updatedChildren[j].parentNode.removeChild(updatedChildren[j]);
          }
        }
        for (var k = 0; k < updates.length; k++) {
          update = updates[k];
          switch (update.type) {
            case ReactMultiChildUpdateTypes.INSERT_MARKUP:
              insertChildAt(update.parentNode, renderedMarkup[update.markupIndex], update.toIndex);
              break;
            case ReactMultiChildUpdateTypes.MOVE_EXISTING:
              insertChildAt(update.parentNode, initialChildren[update.parentID][update.fromIndex], update.toIndex);
              break;
            case ReactMultiChildUpdateTypes.TEXT_CONTENT:
              setTextContent(update.parentNode, update.textContent);
              break;
            case ReactMultiChildUpdateTypes.REMOVE_NODE:
              break;
          }
        }
      }
    };
    module.exports = DOMChildrenOperations;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDefaultInjection", ["npm:react@0.13.2/lib/BeforeInputEventPlugin", "npm:react@0.13.2/lib/ChangeEventPlugin", "npm:react@0.13.2/lib/ClientReactRootIndex", "npm:react@0.13.2/lib/DefaultEventPluginOrder", "npm:react@0.13.2/lib/EnterLeaveEventPlugin", "npm:react@0.13.2/lib/ExecutionEnvironment", "npm:react@0.13.2/lib/HTMLDOMPropertyConfig", "npm:react@0.13.2/lib/MobileSafariClickEventPlugin", "npm:react@0.13.2/lib/ReactBrowserComponentMixin", "npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactComponentBrowserEnvironment", "npm:react@0.13.2/lib/ReactDefaultBatchingStrategy", "npm:react@0.13.2/lib/ReactDOMComponent", "npm:react@0.13.2/lib/ReactDOMButton", "npm:react@0.13.2/lib/ReactDOMForm", "npm:react@0.13.2/lib/ReactDOMImg", "npm:react@0.13.2/lib/ReactDOMIDOperations", "npm:react@0.13.2/lib/ReactDOMIframe", "npm:react@0.13.2/lib/ReactDOMInput", "npm:react@0.13.2/lib/ReactDOMOption", "npm:react@0.13.2/lib/ReactDOMSelect", "npm:react@0.13.2/lib/ReactDOMTextarea", "npm:react@0.13.2/lib/ReactDOMTextComponent", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactEventListener", "npm:react@0.13.2/lib/ReactInjection", "npm:react@0.13.2/lib/ReactInstanceHandles", "npm:react@0.13.2/lib/ReactMount", "npm:react@0.13.2/lib/ReactReconcileTransaction", "npm:react@0.13.2/lib/SelectEventPlugin", "npm:react@0.13.2/lib/ServerReactRootIndex", "npm:react@0.13.2/lib/SimpleEventPlugin", "npm:react@0.13.2/lib/SVGDOMPropertyConfig", "npm:react@0.13.2/lib/createFullPageComponent", "npm:react@0.13.2/lib/ReactDefaultPerf", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var BeforeInputEventPlugin = require("npm:react@0.13.2/lib/BeforeInputEventPlugin");
    var ChangeEventPlugin = require("npm:react@0.13.2/lib/ChangeEventPlugin");
    var ClientReactRootIndex = require("npm:react@0.13.2/lib/ClientReactRootIndex");
    var DefaultEventPluginOrder = require("npm:react@0.13.2/lib/DefaultEventPluginOrder");
    var EnterLeaveEventPlugin = require("npm:react@0.13.2/lib/EnterLeaveEventPlugin");
    var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
    var HTMLDOMPropertyConfig = require("npm:react@0.13.2/lib/HTMLDOMPropertyConfig");
    var MobileSafariClickEventPlugin = require("npm:react@0.13.2/lib/MobileSafariClickEventPlugin");
    var ReactBrowserComponentMixin = require("npm:react@0.13.2/lib/ReactBrowserComponentMixin");
    var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
    var ReactComponentBrowserEnvironment = require("npm:react@0.13.2/lib/ReactComponentBrowserEnvironment");
    var ReactDefaultBatchingStrategy = require("npm:react@0.13.2/lib/ReactDefaultBatchingStrategy");
    var ReactDOMComponent = require("npm:react@0.13.2/lib/ReactDOMComponent");
    var ReactDOMButton = require("npm:react@0.13.2/lib/ReactDOMButton");
    var ReactDOMForm = require("npm:react@0.13.2/lib/ReactDOMForm");
    var ReactDOMImg = require("npm:react@0.13.2/lib/ReactDOMImg");
    var ReactDOMIDOperations = require("npm:react@0.13.2/lib/ReactDOMIDOperations");
    var ReactDOMIframe = require("npm:react@0.13.2/lib/ReactDOMIframe");
    var ReactDOMInput = require("npm:react@0.13.2/lib/ReactDOMInput");
    var ReactDOMOption = require("npm:react@0.13.2/lib/ReactDOMOption");
    var ReactDOMSelect = require("npm:react@0.13.2/lib/ReactDOMSelect");
    var ReactDOMTextarea = require("npm:react@0.13.2/lib/ReactDOMTextarea");
    var ReactDOMTextComponent = require("npm:react@0.13.2/lib/ReactDOMTextComponent");
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactEventListener = require("npm:react@0.13.2/lib/ReactEventListener");
    var ReactInjection = require("npm:react@0.13.2/lib/ReactInjection");
    var ReactInstanceHandles = require("npm:react@0.13.2/lib/ReactInstanceHandles");
    var ReactMount = require("npm:react@0.13.2/lib/ReactMount");
    var ReactReconcileTransaction = require("npm:react@0.13.2/lib/ReactReconcileTransaction");
    var SelectEventPlugin = require("npm:react@0.13.2/lib/SelectEventPlugin");
    var ServerReactRootIndex = require("npm:react@0.13.2/lib/ServerReactRootIndex");
    var SimpleEventPlugin = require("npm:react@0.13.2/lib/SimpleEventPlugin");
    var SVGDOMPropertyConfig = require("npm:react@0.13.2/lib/SVGDOMPropertyConfig");
    var createFullPageComponent = require("npm:react@0.13.2/lib/createFullPageComponent");
    function autoGenerateWrapperClass(type) {
      return ReactClass.createClass({
        tagName: type.toUpperCase(),
        render: function() {
          return new ReactElement(type, null, null, null, null, this.props);
        }
      });
    }
    function inject() {
      ReactInjection.EventEmitter.injectReactEventListener(ReactEventListener);
      ReactInjection.EventPluginHub.injectEventPluginOrder(DefaultEventPluginOrder);
      ReactInjection.EventPluginHub.injectInstanceHandle(ReactInstanceHandles);
      ReactInjection.EventPluginHub.injectMount(ReactMount);
      ReactInjection.EventPluginHub.injectEventPluginsByName({
        SimpleEventPlugin: SimpleEventPlugin,
        EnterLeaveEventPlugin: EnterLeaveEventPlugin,
        ChangeEventPlugin: ChangeEventPlugin,
        MobileSafariClickEventPlugin: MobileSafariClickEventPlugin,
        SelectEventPlugin: SelectEventPlugin,
        BeforeInputEventPlugin: BeforeInputEventPlugin
      });
      ReactInjection.NativeComponent.injectGenericComponentClass(ReactDOMComponent);
      ReactInjection.NativeComponent.injectTextComponentClass(ReactDOMTextComponent);
      ReactInjection.NativeComponent.injectAutoWrapper(autoGenerateWrapperClass);
      ReactInjection.Class.injectMixin(ReactBrowserComponentMixin);
      ReactInjection.NativeComponent.injectComponentClasses({
        'button': ReactDOMButton,
        'form': ReactDOMForm,
        'iframe': ReactDOMIframe,
        'img': ReactDOMImg,
        'input': ReactDOMInput,
        'option': ReactDOMOption,
        'select': ReactDOMSelect,
        'textarea': ReactDOMTextarea,
        'html': createFullPageComponent('html'),
        'head': createFullPageComponent('head'),
        'body': createFullPageComponent('body')
      });
      ReactInjection.DOMProperty.injectDOMPropertyConfig(HTMLDOMPropertyConfig);
      ReactInjection.DOMProperty.injectDOMPropertyConfig(SVGDOMPropertyConfig);
      ReactInjection.EmptyComponent.injectEmptyComponent('noscript');
      ReactInjection.Updates.injectReconcileTransaction(ReactReconcileTransaction);
      ReactInjection.Updates.injectBatchingStrategy(ReactDefaultBatchingStrategy);
      ReactInjection.RootIndex.injectCreateReactRootIndex(ExecutionEnvironment.canUseDOM ? ClientReactRootIndex.createReactRootIndex : ServerReactRootIndex.createReactRootIndex);
      ReactInjection.Component.injectEnvironment(ReactComponentBrowserEnvironment);
      ReactInjection.DOMComponent.injectIDOperations(ReactDOMIDOperations);
      if ("production" !== process.env.NODE_ENV) {
        var url = (ExecutionEnvironment.canUseDOM && window.location.href) || '';
        if ((/[?&]react_perf\b/).test(url)) {
          var ReactDefaultPerf = require("npm:react@0.13.2/lib/ReactDefaultPerf");
          ReactDefaultPerf.start();
        }
      }
    }
    module.exports = {inject: inject};
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:qs@2.4.1", ["npm:qs@2.4.1/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:qs@2.4.1/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/src/index", ["npm:reflux@0.2.7/src/ActionMethods", "npm:reflux@0.2.7/src/ListenerMethods", "npm:reflux@0.2.7/src/PublisherMethods", "npm:reflux@0.2.7/src/StoreMethods", "npm:reflux@0.2.7/src/createAction", "npm:reflux@0.2.7/src/createStore", "npm:reflux@0.2.7/src/connect", "npm:reflux@0.2.7/src/connectFilter", "npm:reflux@0.2.7/src/ListenerMixin", "npm:reflux@0.2.7/src/listenTo", "npm:reflux@0.2.7/src/listenToMany", "npm:reflux@0.2.7/src/joins", "npm:reflux@0.2.7/src/utils", "npm:reflux@0.2.7/src/utils", "npm:reflux@0.2.7/src/utils", "npm:reflux@0.2.7/src/utils", "npm:reflux@0.2.7/src/utils", "npm:reflux@0.2.7/src/Keep"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  exports.ActionMethods = require("npm:reflux@0.2.7/src/ActionMethods");
  exports.ListenerMethods = require("npm:reflux@0.2.7/src/ListenerMethods");
  exports.PublisherMethods = require("npm:reflux@0.2.7/src/PublisherMethods");
  exports.StoreMethods = require("npm:reflux@0.2.7/src/StoreMethods");
  exports.createAction = require("npm:reflux@0.2.7/src/createAction");
  exports.createStore = require("npm:reflux@0.2.7/src/createStore");
  exports.connect = require("npm:reflux@0.2.7/src/connect");
  exports.connectFilter = require("npm:reflux@0.2.7/src/connectFilter");
  exports.ListenerMixin = require("npm:reflux@0.2.7/src/ListenerMixin");
  exports.listenTo = require("npm:reflux@0.2.7/src/listenTo");
  exports.listenToMany = require("npm:reflux@0.2.7/src/listenToMany");
  var maker = require("npm:reflux@0.2.7/src/joins").staticJoinCreator;
  exports.joinTrailing = exports.all = maker("last");
  exports.joinLeading = maker("first");
  exports.joinStrict = maker("strict");
  exports.joinConcat = maker("all");
  var _ = require("npm:reflux@0.2.7/src/utils");
  exports.EventEmitter = _.EventEmitter;
  exports.Promise = _.Promise;
  exports.createActions = function(definitions) {
    var actions = {};
    for (var k in definitions) {
      if (definitions.hasOwnProperty(k)) {
        var val = definitions[k],
            actionName = _.isObject(val) ? k : val;
        actions[actionName] = exports.createAction(val);
      }
    }
    return actions;
  };
  exports.setEventEmitter = function(ctx) {
    var _ = require("npm:reflux@0.2.7/src/utils");
    exports.EventEmitter = _.EventEmitter = ctx;
  };
  exports.setPromise = function(ctx) {
    var _ = require("npm:reflux@0.2.7/src/utils");
    exports.Promise = _.Promise = ctx;
  };
  exports.setPromiseFactory = function(factory) {
    var _ = require("npm:reflux@0.2.7/src/utils");
    _.createPromise = factory;
  };
  exports.nextTick = function(nextTick) {
    var _ = require("npm:reflux@0.2.7/src/utils");
    _.nextTick = nextTick;
  };
  exports.__keep = require("npm:reflux@0.2.7/src/Keep");
  if (!Function.prototype.bind) {
    console.error('Function.prototype.bind not available. ' + 'ES5 shim required. ' + 'https://github.com/spoike/refluxjs#es5');
  }
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/keyMirror", ["npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var keyMirror = function(obj) {
      var ret = {};
      var key;
      ("production" !== process.env.NODE_ENV ? invariant(obj instanceof Object && !Array.isArray(obj), 'keyMirror(...): Argument must be an object.') : invariant(obj instanceof Object && !Array.isArray(obj)));
      for (key in obj) {
        if (!obj.hasOwnProperty(key)) {
          continue;
        }
        ret[key] = key;
      }
      return ret;
    };
    module.exports = keyMirror;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactChildren", ["npm:react@0.13.2/lib/PooledClass", "npm:react@0.13.2/lib/ReactFragment", "npm:react@0.13.2/lib/traverseAllChildren", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var PooledClass = require("npm:react@0.13.2/lib/PooledClass");
    var ReactFragment = require("npm:react@0.13.2/lib/ReactFragment");
    var traverseAllChildren = require("npm:react@0.13.2/lib/traverseAllChildren");
    var warning = require("npm:react@0.13.2/lib/warning");
    var twoArgumentPooler = PooledClass.twoArgumentPooler;
    var threeArgumentPooler = PooledClass.threeArgumentPooler;
    function ForEachBookKeeping(forEachFunction, forEachContext) {
      this.forEachFunction = forEachFunction;
      this.forEachContext = forEachContext;
    }
    PooledClass.addPoolingTo(ForEachBookKeeping, twoArgumentPooler);
    function forEachSingleChild(traverseContext, child, name, i) {
      var forEachBookKeeping = traverseContext;
      forEachBookKeeping.forEachFunction.call(forEachBookKeeping.forEachContext, child, i);
    }
    function forEachChildren(children, forEachFunc, forEachContext) {
      if (children == null) {
        return children;
      }
      var traverseContext = ForEachBookKeeping.getPooled(forEachFunc, forEachContext);
      traverseAllChildren(children, forEachSingleChild, traverseContext);
      ForEachBookKeeping.release(traverseContext);
    }
    function MapBookKeeping(mapResult, mapFunction, mapContext) {
      this.mapResult = mapResult;
      this.mapFunction = mapFunction;
      this.mapContext = mapContext;
    }
    PooledClass.addPoolingTo(MapBookKeeping, threeArgumentPooler);
    function mapSingleChildIntoContext(traverseContext, child, name, i) {
      var mapBookKeeping = traverseContext;
      var mapResult = mapBookKeeping.mapResult;
      var keyUnique = !mapResult.hasOwnProperty(name);
      if ("production" !== process.env.NODE_ENV) {
        ("production" !== process.env.NODE_ENV ? warning(keyUnique, 'ReactChildren.map(...): Encountered two children with the same key, ' + '`%s`. Child keys must be unique; when two children share a key, only ' + 'the first child will be used.', name) : null);
      }
      if (keyUnique) {
        var mappedChild = mapBookKeeping.mapFunction.call(mapBookKeeping.mapContext, child, i);
        mapResult[name] = mappedChild;
      }
    }
    function mapChildren(children, func, context) {
      if (children == null) {
        return children;
      }
      var mapResult = {};
      var traverseContext = MapBookKeeping.getPooled(mapResult, func, context);
      traverseAllChildren(children, mapSingleChildIntoContext, traverseContext);
      MapBookKeeping.release(traverseContext);
      return ReactFragment.create(mapResult);
    }
    function forEachSingleChildDummy(traverseContext, child, name, i) {
      return null;
    }
    function countChildren(children, context) {
      return traverseAllChildren(children, forEachSingleChildDummy, null);
    }
    var ReactChildren = {
      forEach: forEachChildren,
      map: mapChildren,
      count: countChildren
    };
    module.exports = ReactChildren;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactComponent", ["npm:react@0.13.2/lib/ReactUpdateQueue", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/warning", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactUpdateQueue = require("npm:react@0.13.2/lib/ReactUpdateQueue");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var warning = require("npm:react@0.13.2/lib/warning");
    function ReactComponent(props, context) {
      this.props = props;
      this.context = context;
    }
    ReactComponent.prototype.setState = function(partialState, callback) {
      ("production" !== process.env.NODE_ENV ? invariant(typeof partialState === 'object' || typeof partialState === 'function' || partialState == null, 'setState(...): takes an object of state variables to update or a ' + 'function which returns an object of state variables.') : invariant(typeof partialState === 'object' || typeof partialState === 'function' || partialState == null));
      if ("production" !== process.env.NODE_ENV) {
        ("production" !== process.env.NODE_ENV ? warning(partialState != null, 'setState(...): You passed an undefined or null state object; ' + 'instead, use forceUpdate().') : null);
      }
      ReactUpdateQueue.enqueueSetState(this, partialState);
      if (callback) {
        ReactUpdateQueue.enqueueCallback(this, callback);
      }
    };
    ReactComponent.prototype.forceUpdate = function(callback) {
      ReactUpdateQueue.enqueueForceUpdate(this);
      if (callback) {
        ReactUpdateQueue.enqueueCallback(this, callback);
      }
    };
    if ("production" !== process.env.NODE_ENV) {
      var deprecatedAPIs = {
        getDOMNode: 'getDOMNode',
        isMounted: 'isMounted',
        replaceProps: 'replaceProps',
        replaceState: 'replaceState',
        setProps: 'setProps'
      };
      var defineDeprecationWarning = function(methodName, displayName) {
        try {
          Object.defineProperty(ReactComponent.prototype, methodName, {get: function() {
              ("production" !== process.env.NODE_ENV ? warning(false, '%s(...) is deprecated in plain JavaScript React classes.', displayName) : null);
              return undefined;
            }});
        } catch (x) {}
      };
      for (var fnName in deprecatedAPIs) {
        if (deprecatedAPIs.hasOwnProperty(fnName)) {
          defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
        }
      }
    }
    module.exports = ReactComponent;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMIDOperations", ["npm:react@0.13.2/lib/CSSPropertyOperations", "npm:react@0.13.2/lib/DOMChildrenOperations", "npm:react@0.13.2/lib/DOMPropertyOperations", "npm:react@0.13.2/lib/ReactMount", "npm:react@0.13.2/lib/ReactPerf", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/setInnerHTML", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var CSSPropertyOperations = require("npm:react@0.13.2/lib/CSSPropertyOperations");
    var DOMChildrenOperations = require("npm:react@0.13.2/lib/DOMChildrenOperations");
    var DOMPropertyOperations = require("npm:react@0.13.2/lib/DOMPropertyOperations");
    var ReactMount = require("npm:react@0.13.2/lib/ReactMount");
    var ReactPerf = require("npm:react@0.13.2/lib/ReactPerf");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var setInnerHTML = require("npm:react@0.13.2/lib/setInnerHTML");
    var INVALID_PROPERTY_ERRORS = {
      dangerouslySetInnerHTML: '`dangerouslySetInnerHTML` must be set using `updateInnerHTMLByID()`.',
      style: '`style` must be set using `updateStylesByID()`.'
    };
    var ReactDOMIDOperations = {
      updatePropertyByID: function(id, name, value) {
        var node = ReactMount.getNode(id);
        ("production" !== process.env.NODE_ENV ? invariant(!INVALID_PROPERTY_ERRORS.hasOwnProperty(name), 'updatePropertyByID(...): %s', INVALID_PROPERTY_ERRORS[name]) : invariant(!INVALID_PROPERTY_ERRORS.hasOwnProperty(name)));
        if (value != null) {
          DOMPropertyOperations.setValueForProperty(node, name, value);
        } else {
          DOMPropertyOperations.deleteValueForProperty(node, name);
        }
      },
      deletePropertyByID: function(id, name, value) {
        var node = ReactMount.getNode(id);
        ("production" !== process.env.NODE_ENV ? invariant(!INVALID_PROPERTY_ERRORS.hasOwnProperty(name), 'updatePropertyByID(...): %s', INVALID_PROPERTY_ERRORS[name]) : invariant(!INVALID_PROPERTY_ERRORS.hasOwnProperty(name)));
        DOMPropertyOperations.deleteValueForProperty(node, name, value);
      },
      updateStylesByID: function(id, styles) {
        var node = ReactMount.getNode(id);
        CSSPropertyOperations.setValueForStyles(node, styles);
      },
      updateInnerHTMLByID: function(id, html) {
        var node = ReactMount.getNode(id);
        setInnerHTML(node, html);
      },
      updateTextContentByID: function(id, content) {
        var node = ReactMount.getNode(id);
        DOMChildrenOperations.updateTextContent(node, content);
      },
      dangerouslyReplaceNodeWithMarkupByID: function(id, markup) {
        var node = ReactMount.getNode(id);
        DOMChildrenOperations.dangerouslyReplaceNodeWithMarkup(node, markup);
      },
      dangerouslyProcessChildrenUpdates: function(updates, markup) {
        for (var i = 0; i < updates.length; i++) {
          updates[i].parentNode = ReactMount.getNode(updates[i].parentID);
        }
        DOMChildrenOperations.processUpdates(updates, markup);
      }
    };
    ReactPerf.measureMethods(ReactDOMIDOperations, 'ReactDOMIDOperations', {
      updatePropertyByID: 'updatePropertyByID',
      deletePropertyByID: 'deletePropertyByID',
      updateStylesByID: 'updateStylesByID',
      updateInnerHTMLByID: 'updateInnerHTMLByID',
      updateTextContentByID: 'updateTextContentByID',
      dangerouslyReplaceNodeWithMarkupByID: 'dangerouslyReplaceNodeWithMarkupByID',
      dangerouslyProcessChildrenUpdates: 'dangerouslyProcessChildrenUpdates'
    });
    module.exports = ReactDOMIDOperations;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/PathUtils", ["npm:react@0.13.2/lib/invariant", "npm:object-assign@2.0.0", "npm:qs@2.4.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var invariant = require("npm:react@0.13.2/lib/invariant");
  var objectAssign = require("npm:object-assign@2.0.0");
  var qs = require("npm:qs@2.4.1");
  var paramCompileMatcher = /:([a-zA-Z_$][a-zA-Z0-9_$]*)|[*.()\[\]\\+|{}^$]/g;
  var paramInjectMatcher = /:([a-zA-Z_$][a-zA-Z0-9_$?]*[?]?)|[*]/g;
  var paramInjectTrailingSlashMatcher = /\/\/\?|\/\?\/|\/\?/g;
  var queryMatcher = /\?(.*)$/;
  var _compiledPatterns = {};
  function compilePattern(pattern) {
    if (!(pattern in _compiledPatterns)) {
      var paramNames = [];
      var source = pattern.replace(paramCompileMatcher, function(match, paramName) {
        if (paramName) {
          paramNames.push(paramName);
          return "([^/?#]+)";
        } else if (match === "*") {
          paramNames.push("splat");
          return "(.*?)";
        } else {
          return "\\" + match;
        }
      });
      _compiledPatterns[pattern] = {
        matcher: new RegExp("^" + source + "$", "i"),
        paramNames: paramNames
      };
    }
    return _compiledPatterns[pattern];
  }
  var PathUtils = {
    isAbsolute: function isAbsolute(path) {
      return path.charAt(0) === "/";
    },
    join: function join(a, b) {
      return a.replace(/\/*$/, "/") + b;
    },
    extractParamNames: function extractParamNames(pattern) {
      return compilePattern(pattern).paramNames;
    },
    extractParams: function extractParams(pattern, path) {
      var _compilePattern = compilePattern(pattern);
      var matcher = _compilePattern.matcher;
      var paramNames = _compilePattern.paramNames;
      var match = path.match(matcher);
      if (!match) {
        return null;
      }
      var params = {};
      paramNames.forEach(function(paramName, index) {
        params[paramName] = match[index + 1];
      });
      return params;
    },
    injectParams: function injectParams(pattern, params) {
      params = params || {};
      var splatIndex = 0;
      return pattern.replace(paramInjectMatcher, function(match, paramName) {
        paramName = paramName || "splat";
        if (paramName.slice(-1) === "?") {
          paramName = paramName.slice(0, -1);
          if (params[paramName] == null)
            return "";
        } else {
          invariant(params[paramName] != null, "Missing \"%s\" parameter for path \"%s\"", paramName, pattern);
        }
        var segment;
        if (paramName === "splat" && Array.isArray(params[paramName])) {
          segment = params[paramName][splatIndex++];
          invariant(segment != null, "Missing splat # %s for path \"%s\"", splatIndex, pattern);
        } else {
          segment = params[paramName];
        }
        return segment;
      }).replace(paramInjectTrailingSlashMatcher, "/");
    },
    extractQuery: function extractQuery(path) {
      var match = path.match(queryMatcher);
      return match && qs.parse(match[1]);
    },
    withoutQuery: function withoutQuery(path) {
      return path.replace(queryMatcher, "");
    },
    withQuery: function withQuery(path, query) {
      var existingQuery = PathUtils.extractQuery(path);
      if (existingQuery)
        query = query ? objectAssign(existingQuery, query) : existingQuery;
      var queryString = qs.stringify(query, {arrayFormat: "brackets"});
      if (queryString) {
        return PathUtils.withoutQuery(path) + "?" + queryString;
      }
      return PathUtils.withoutQuery(path);
    }
  };
  module.exports = PathUtils;
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7/index", ["npm:reflux@0.2.7/src/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:reflux@0.2.7/src/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/EventConstants", ["npm:react@0.13.2/lib/keyMirror"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var keyMirror = require("npm:react@0.13.2/lib/keyMirror");
  var PropagationPhases = keyMirror({
    bubbled: null,
    captured: null
  });
  var topLevelTypes = keyMirror({
    topBlur: null,
    topChange: null,
    topClick: null,
    topCompositionEnd: null,
    topCompositionStart: null,
    topCompositionUpdate: null,
    topContextMenu: null,
    topCopy: null,
    topCut: null,
    topDoubleClick: null,
    topDrag: null,
    topDragEnd: null,
    topDragEnter: null,
    topDragExit: null,
    topDragLeave: null,
    topDragOver: null,
    topDragStart: null,
    topDrop: null,
    topError: null,
    topFocus: null,
    topInput: null,
    topKeyDown: null,
    topKeyPress: null,
    topKeyUp: null,
    topLoad: null,
    topMouseDown: null,
    topMouseMove: null,
    topMouseOut: null,
    topMouseOver: null,
    topMouseUp: null,
    topPaste: null,
    topReset: null,
    topScroll: null,
    topSelectionChange: null,
    topSubmit: null,
    topTextInput: null,
    topTouchCancel: null,
    topTouchEnd: null,
    topTouchMove: null,
    topTouchStart: null,
    topWheel: null
  });
  var EventConstants = {
    topLevelTypes: topLevelTypes,
    PropagationPhases: PropagationPhases
  };
  module.exports = EventConstants;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactComponentBrowserEnvironment", ["npm:react@0.13.2/lib/ReactDOMIDOperations", "npm:react@0.13.2/lib/ReactMount", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var ReactDOMIDOperations = require("npm:react@0.13.2/lib/ReactDOMIDOperations");
    var ReactMount = require("npm:react@0.13.2/lib/ReactMount");
    var ReactComponentBrowserEnvironment = {
      processChildrenUpdates: ReactDOMIDOperations.dangerouslyProcessChildrenUpdates,
      replaceNodeWithMarkupByID: ReactDOMIDOperations.dangerouslyReplaceNodeWithMarkupByID,
      unmountIDFromEnvironment: function(rootNodeID) {
        ReactMount.purgeID(rootNodeID);
      }
    };
    module.exports = ReactComponentBrowserEnvironment;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/Route", ["npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/invariant", "npm:react@0.13.2/lib/warning", "npm:react-router@0.13.2/lib/PathUtils"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _createClass = (function() {
    function defineProperties(target, props) {
      for (var key in props) {
        var prop = props[key];
        prop.configurable = true;
        if (prop.value)
          prop.writable = true;
      }
      Object.defineProperties(target, props);
    }
    return function(Constructor, protoProps, staticProps) {
      if (protoProps)
        defineProperties(Constructor.prototype, protoProps);
      if (staticProps)
        defineProperties(Constructor, staticProps);
      return Constructor;
    };
  })();
  var _classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var invariant = require("npm:react@0.13.2/lib/invariant");
  var warning = require("npm:react@0.13.2/lib/warning");
  var PathUtils = require("npm:react-router@0.13.2/lib/PathUtils");
  var _currentRoute;
  var Route = (function() {
    function Route(name, path, ignoreScrollBehavior, isDefault, isNotFound, onEnter, onLeave, handler) {
      _classCallCheck(this, Route);
      this.name = name;
      this.path = path;
      this.paramNames = PathUtils.extractParamNames(this.path);
      this.ignoreScrollBehavior = !!ignoreScrollBehavior;
      this.isDefault = !!isDefault;
      this.isNotFound = !!isNotFound;
      this.onEnter = onEnter;
      this.onLeave = onLeave;
      this.handler = handler;
    }
    _createClass(Route, {
      appendChild: {value: function appendChild(route) {
          invariant(route instanceof Route, "route.appendChild must use a valid Route");
          if (!this.childRoutes)
            this.childRoutes = [];
          this.childRoutes.push(route);
        }},
      toString: {value: function toString() {
          var string = "<Route";
          if (this.name)
            string += " name=\"" + this.name + "\"";
          string += " path=\"" + this.path + "\">";
          return string;
        }}
    }, {
      createRoute: {value: function createRoute(options, callback) {
          options = options || {};
          if (typeof options === "string")
            options = {path: options};
          var parentRoute = _currentRoute;
          if (parentRoute) {
            warning(options.parentRoute == null || options.parentRoute === parentRoute, "You should not use parentRoute with createRoute inside another route's child callback; it is ignored");
          } else {
            parentRoute = options.parentRoute;
          }
          var name = options.name;
          var path = options.path || name;
          if (path && !(options.isDefault || options.isNotFound)) {
            if (PathUtils.isAbsolute(path)) {
              if (parentRoute) {
                invariant(path === parentRoute.path || parentRoute.paramNames.length === 0, "You cannot nest path \"%s\" inside \"%s\"; the parent requires URL parameters", path, parentRoute.path);
              }
            } else if (parentRoute) {
              path = PathUtils.join(parentRoute.path, path);
            } else {
              path = "/" + path;
            }
          } else {
            path = parentRoute ? parentRoute.path : "/";
          }
          if (options.isNotFound && !/\*$/.test(path))
            path += "*";
          var route = new Route(name, path, options.ignoreScrollBehavior, options.isDefault, options.isNotFound, options.onEnter, options.onLeave, options.handler);
          if (parentRoute) {
            if (route.isDefault) {
              invariant(parentRoute.defaultRoute == null, "%s may not have more than one default route", parentRoute);
              parentRoute.defaultRoute = route;
            } else if (route.isNotFound) {
              invariant(parentRoute.notFoundRoute == null, "%s may not have more than one not found route", parentRoute);
              parentRoute.notFoundRoute = route;
            }
            parentRoute.appendChild(route);
          }
          if (typeof callback === "function") {
            var currentRoute = _currentRoute;
            _currentRoute = route;
            callback.call(route, route);
            _currentRoute = currentRoute;
          }
          return route;
        }},
      createDefaultRoute: {value: function createDefaultRoute(options) {
          return Route.createRoute(assign({}, options, {isDefault: true}));
        }},
      createNotFoundRoute: {value: function createNotFoundRoute(options) {
          return Route.createRoute(assign({}, options, {isNotFound: true}));
        }},
      createRedirect: {value: function createRedirect(options) {
          return Route.createRoute(assign({}, options, {
            path: options.path || options.from || "*",
            onEnter: function onEnter(transition, params, query) {
              transition.redirect(options.to, options.params || params, options.query || query);
            }
          }));
        }}
    });
    return Route;
  })();
  module.exports = Route;
  global.define = __define;
  return module.exports;
});

System.register("npm:reflux@0.2.7", ["npm:reflux@0.2.7/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:reflux@0.2.7/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/EventPluginUtils", ["npm:react@0.13.2/lib/EventConstants", "npm:react@0.13.2/lib/invariant", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var EventConstants = require("npm:react@0.13.2/lib/EventConstants");
    var invariant = require("npm:react@0.13.2/lib/invariant");
    var injection = {
      Mount: null,
      injectMount: function(InjectedMount) {
        injection.Mount = InjectedMount;
        if ("production" !== process.env.NODE_ENV) {
          ("production" !== process.env.NODE_ENV ? invariant(InjectedMount && InjectedMount.getNode, 'EventPluginUtils.injection.injectMount(...): Injected Mount module ' + 'is missing getNode.') : invariant(InjectedMount && InjectedMount.getNode));
        }
      }
    };
    var topLevelTypes = EventConstants.topLevelTypes;
    function isEndish(topLevelType) {
      return topLevelType === topLevelTypes.topMouseUp || topLevelType === topLevelTypes.topTouchEnd || topLevelType === topLevelTypes.topTouchCancel;
    }
    function isMoveish(topLevelType) {
      return topLevelType === topLevelTypes.topMouseMove || topLevelType === topLevelTypes.topTouchMove;
    }
    function isStartish(topLevelType) {
      return topLevelType === topLevelTypes.topMouseDown || topLevelType === topLevelTypes.topTouchStart;
    }
    var validateEventDispatches;
    if ("production" !== process.env.NODE_ENV) {
      validateEventDispatches = function(event) {
        var dispatchListeners = event._dispatchListeners;
        var dispatchIDs = event._dispatchIDs;
        var listenersIsArr = Array.isArray(dispatchListeners);
        var idsIsArr = Array.isArray(dispatchIDs);
        var IDsLen = idsIsArr ? dispatchIDs.length : dispatchIDs ? 1 : 0;
        var listenersLen = listenersIsArr ? dispatchListeners.length : dispatchListeners ? 1 : 0;
        ("production" !== process.env.NODE_ENV ? invariant(idsIsArr === listenersIsArr && IDsLen === listenersLen, 'EventPluginUtils: Invalid `event`.') : invariant(idsIsArr === listenersIsArr && IDsLen === listenersLen));
      };
    }
    function forEachEventDispatch(event, cb) {
      var dispatchListeners = event._dispatchListeners;
      var dispatchIDs = event._dispatchIDs;
      if ("production" !== process.env.NODE_ENV) {
        validateEventDispatches(event);
      }
      if (Array.isArray(dispatchListeners)) {
        for (var i = 0; i < dispatchListeners.length; i++) {
          if (event.isPropagationStopped()) {
            break;
          }
          cb(event, dispatchListeners[i], dispatchIDs[i]);
        }
      } else if (dispatchListeners) {
        cb(event, dispatchListeners, dispatchIDs);
      }
    }
    function executeDispatch(event, listener, domID) {
      event.currentTarget = injection.Mount.getNode(domID);
      var returnValue = listener(event, domID);
      event.currentTarget = null;
      return returnValue;
    }
    function executeDispatchesInOrder(event, cb) {
      forEachEventDispatch(event, cb);
      event._dispatchListeners = null;
      event._dispatchIDs = null;
    }
    function executeDispatchesInOrderStopAtTrueImpl(event) {
      var dispatchListeners = event._dispatchListeners;
      var dispatchIDs = event._dispatchIDs;
      if ("production" !== process.env.NODE_ENV) {
        validateEventDispatches(event);
      }
      if (Array.isArray(dispatchListeners)) {
        for (var i = 0; i < dispatchListeners.length; i++) {
          if (event.isPropagationStopped()) {
            break;
          }
          if (dispatchListeners[i](event, dispatchIDs[i])) {
            return dispatchIDs[i];
          }
        }
      } else if (dispatchListeners) {
        if (dispatchListeners(event, dispatchIDs)) {
          return dispatchIDs;
        }
      }
      return null;
    }
    function executeDispatchesInOrderStopAtTrue(event) {
      var ret = executeDispatchesInOrderStopAtTrueImpl(event);
      event._dispatchIDs = null;
      event._dispatchListeners = null;
      return ret;
    }
    function executeDirectDispatch(event) {
      if ("production" !== process.env.NODE_ENV) {
        validateEventDispatches(event);
      }
      var dispatchListener = event._dispatchListeners;
      var dispatchID = event._dispatchIDs;
      ("production" !== process.env.NODE_ENV ? invariant(!Array.isArray(dispatchListener), 'executeDirectDispatch(...): Invalid `event`.') : invariant(!Array.isArray(dispatchListener)));
      var res = dispatchListener ? dispatchListener(event, dispatchID) : null;
      event._dispatchListeners = null;
      event._dispatchIDs = null;
      return res;
    }
    function hasDispatches(event) {
      return !!event._dispatchListeners;
    }
    var EventPluginUtils = {
      isEndish: isEndish,
      isMoveish: isMoveish,
      isStartish: isStartish,
      executeDirectDispatch: executeDirectDispatch,
      executeDispatch: executeDispatch,
      executeDispatchesInOrder: executeDispatchesInOrder,
      executeDispatchesInOrderStopAtTrue: executeDispatchesInOrderStopAtTrue,
      hasDispatches: hasDispatches,
      injection: injection,
      useTouchEvents: false
    };
    module.exports = EventPluginUtils;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/ReactDOMTextComponent", ["npm:react@0.13.2/lib/DOMPropertyOperations", "npm:react@0.13.2/lib/ReactComponentBrowserEnvironment", "npm:react@0.13.2/lib/ReactDOMComponent", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/escapeTextContentForBrowser"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  'use strict';
  var DOMPropertyOperations = require("npm:react@0.13.2/lib/DOMPropertyOperations");
  var ReactComponentBrowserEnvironment = require("npm:react@0.13.2/lib/ReactComponentBrowserEnvironment");
  var ReactDOMComponent = require("npm:react@0.13.2/lib/ReactDOMComponent");
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var escapeTextContentForBrowser = require("npm:react@0.13.2/lib/escapeTextContentForBrowser");
  var ReactDOMTextComponent = function(props) {};
  assign(ReactDOMTextComponent.prototype, {
    construct: function(text) {
      this._currentElement = text;
      this._stringText = '' + text;
      this._rootNodeID = null;
      this._mountIndex = 0;
    },
    mountComponent: function(rootID, transaction, context) {
      this._rootNodeID = rootID;
      var escapedText = escapeTextContentForBrowser(this._stringText);
      if (transaction.renderToStaticMarkup) {
        return escapedText;
      }
      return ('<span ' + DOMPropertyOperations.createMarkupForID(rootID) + '>' + escapedText + '</span>');
    },
    receiveComponent: function(nextText, transaction) {
      if (nextText !== this._currentElement) {
        this._currentElement = nextText;
        var nextStringText = '' + nextText;
        if (nextStringText !== this._stringText) {
          this._stringText = nextStringText;
          ReactDOMComponent.BackendIDOperations.updateTextContentByID(this._rootNodeID, nextStringText);
        }
      }
    },
    unmountComponent: function() {
      ReactComponentBrowserEnvironment.unmountIDFromEnvironment(this._rootNodeID);
    }
  });
  module.exports = ReactDOMTextComponent;
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/PropTypes", ["npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2", "npm:react-router@0.13.2/lib/Route"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var assign = require("npm:react@0.13.2/lib/Object.assign");
  var ReactPropTypes = require("npm:react@0.13.2").PropTypes;
  var Route = require("npm:react-router@0.13.2/lib/Route");
  var PropTypes = assign({}, ReactPropTypes, {
    falsy: function falsy(props, propName, componentName) {
      if (props[propName]) {
        return new Error("<" + componentName + "> may not have a \"" + propName + "\" prop");
      }
    },
    route: ReactPropTypes.instanceOf(Route),
    router: ReactPropTypes.func
  });
  module.exports = PropTypes;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/lib/React", ["npm:react@0.13.2/lib/EventPluginUtils", "npm:react@0.13.2/lib/ReactChildren", "npm:react@0.13.2/lib/ReactComponent", "npm:react@0.13.2/lib/ReactClass", "npm:react@0.13.2/lib/ReactContext", "npm:react@0.13.2/lib/ReactCurrentOwner", "npm:react@0.13.2/lib/ReactElement", "npm:react@0.13.2/lib/ReactElementValidator", "npm:react@0.13.2/lib/ReactDOM", "npm:react@0.13.2/lib/ReactDOMTextComponent", "npm:react@0.13.2/lib/ReactDefaultInjection", "npm:react@0.13.2/lib/ReactInstanceHandles", "npm:react@0.13.2/lib/ReactMount", "npm:react@0.13.2/lib/ReactPerf", "npm:react@0.13.2/lib/ReactPropTypes", "npm:react@0.13.2/lib/ReactReconciler", "npm:react@0.13.2/lib/ReactServerRendering", "npm:react@0.13.2/lib/Object.assign", "npm:react@0.13.2/lib/findDOMNode", "npm:react@0.13.2/lib/onlyChild", "npm:react@0.13.2/lib/ExecutionEnvironment", "github:jspm/nodelibs-process@0.1.1"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(process) {
    'use strict';
    var EventPluginUtils = require("npm:react@0.13.2/lib/EventPluginUtils");
    var ReactChildren = require("npm:react@0.13.2/lib/ReactChildren");
    var ReactComponent = require("npm:react@0.13.2/lib/ReactComponent");
    var ReactClass = require("npm:react@0.13.2/lib/ReactClass");
    var ReactContext = require("npm:react@0.13.2/lib/ReactContext");
    var ReactCurrentOwner = require("npm:react@0.13.2/lib/ReactCurrentOwner");
    var ReactElement = require("npm:react@0.13.2/lib/ReactElement");
    var ReactElementValidator = require("npm:react@0.13.2/lib/ReactElementValidator");
    var ReactDOM = require("npm:react@0.13.2/lib/ReactDOM");
    var ReactDOMTextComponent = require("npm:react@0.13.2/lib/ReactDOMTextComponent");
    var ReactDefaultInjection = require("npm:react@0.13.2/lib/ReactDefaultInjection");
    var ReactInstanceHandles = require("npm:react@0.13.2/lib/ReactInstanceHandles");
    var ReactMount = require("npm:react@0.13.2/lib/ReactMount");
    var ReactPerf = require("npm:react@0.13.2/lib/ReactPerf");
    var ReactPropTypes = require("npm:react@0.13.2/lib/ReactPropTypes");
    var ReactReconciler = require("npm:react@0.13.2/lib/ReactReconciler");
    var ReactServerRendering = require("npm:react@0.13.2/lib/ReactServerRendering");
    var assign = require("npm:react@0.13.2/lib/Object.assign");
    var findDOMNode = require("npm:react@0.13.2/lib/findDOMNode");
    var onlyChild = require("npm:react@0.13.2/lib/onlyChild");
    ReactDefaultInjection.inject();
    var createElement = ReactElement.createElement;
    var createFactory = ReactElement.createFactory;
    var cloneElement = ReactElement.cloneElement;
    if ("production" !== process.env.NODE_ENV) {
      createElement = ReactElementValidator.createElement;
      createFactory = ReactElementValidator.createFactory;
      cloneElement = ReactElementValidator.cloneElement;
    }
    var render = ReactPerf.measure('React', 'render', ReactMount.render);
    var React = {
      Children: {
        map: ReactChildren.map,
        forEach: ReactChildren.forEach,
        count: ReactChildren.count,
        only: onlyChild
      },
      Component: ReactComponent,
      DOM: ReactDOM,
      PropTypes: ReactPropTypes,
      initializeTouchEvents: function(shouldUseTouch) {
        EventPluginUtils.useTouchEvents = shouldUseTouch;
      },
      createClass: ReactClass.createClass,
      createElement: createElement,
      cloneElement: cloneElement,
      createFactory: createFactory,
      createMixin: function(mixin) {
        return mixin;
      },
      constructAndRenderComponent: ReactMount.constructAndRenderComponent,
      constructAndRenderComponentByID: ReactMount.constructAndRenderComponentByID,
      findDOMNode: findDOMNode,
      render: render,
      renderToString: ReactServerRendering.renderToString,
      renderToStaticMarkup: ReactServerRendering.renderToStaticMarkup,
      unmountComponentAtNode: ReactMount.unmountComponentAtNode,
      isValidElement: ReactElement.isValidElement,
      withContext: ReactContext.withContext,
      __spread: assign
    };
    if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined' && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.inject === 'function') {
      __REACT_DEVTOOLS_GLOBAL_HOOK__.inject({
        CurrentOwner: ReactCurrentOwner,
        InstanceHandles: ReactInstanceHandles,
        Mount: ReactMount,
        Reconciler: ReactReconciler,
        TextComponent: ReactDOMTextComponent
      });
    }
    if ("production" !== process.env.NODE_ENV) {
      var ExecutionEnvironment = require("npm:react@0.13.2/lib/ExecutionEnvironment");
      if (ExecutionEnvironment.canUseDOM && window.top === window.self) {
        if (navigator.userAgent.indexOf('Chrome') > -1) {
          if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
            console.debug('Download the React DevTools for a better development experience: ' + 'http://fb.me/react-devtools');
          }
        }
        var expectedFeatures = [Array.isArray, Array.prototype.every, Array.prototype.forEach, Array.prototype.indexOf, Array.prototype.map, Date.now, Function.prototype.bind, Object.keys, String.prototype.split, String.prototype.trim, Object.create, Object.freeze];
        for (var i = 0; i < expectedFeatures.length; i++) {
          if (!expectedFeatures[i]) {
            console.error('One or more ES5 shim/shams expected by React are not available: ' + 'http://fb.me/react-warning-polyfills');
            break;
          }
        }
      }
    }
    React.version = '0.13.2';
    module.exports = React;
  })(require("github:jspm/nodelibs-process@0.1.1"));
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/components/DefaultRoute", ["npm:react-router@0.13.2/lib/PropTypes", "npm:react-router@0.13.2/lib/components/RouteHandler", "npm:react-router@0.13.2/lib/components/Route"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  var _inherits = function(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }});
    if (superClass)
      subClass.__proto__ = superClass;
  };
  var _classCallCheck = function(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };
  var PropTypes = require("npm:react-router@0.13.2/lib/PropTypes");
  var RouteHandler = require("npm:react-router@0.13.2/lib/components/RouteHandler");
  var Route = require("npm:react-router@0.13.2/lib/components/Route");
  var DefaultRoute = (function(_Route) {
    function DefaultRoute() {
      _classCallCheck(this, DefaultRoute);
      if (_Route != null) {
        _Route.apply(this, arguments);
      }
    }
    _inherits(DefaultRoute, _Route);
    return DefaultRoute;
  })(Route);
  DefaultRoute.propTypes = {
    name: PropTypes.string,
    path: PropTypes.falsy,
    children: PropTypes.falsy,
    handler: PropTypes.func.isRequired
  };
  DefaultRoute.defaultProps = {handler: RouteHandler};
  module.exports = DefaultRoute;
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2/react", ["npm:react@0.13.2/lib/React"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:react@0.13.2/lib/React");
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib/index", ["npm:react-router@0.13.2/lib/components/DefaultRoute", "npm:react-router@0.13.2/lib/components/Link", "npm:react-router@0.13.2/lib/components/NotFoundRoute", "npm:react-router@0.13.2/lib/components/Redirect", "npm:react-router@0.13.2/lib/components/Route", "npm:react-router@0.13.2/lib/components/RouteHandler", "npm:react-router@0.13.2/lib/locations/HashLocation", "npm:react-router@0.13.2/lib/locations/HistoryLocation", "npm:react-router@0.13.2/lib/locations/RefreshLocation", "npm:react-router@0.13.2/lib/locations/StaticLocation", "npm:react-router@0.13.2/lib/locations/TestLocation", "npm:react-router@0.13.2/lib/behaviors/ImitateBrowserBehavior", "npm:react-router@0.13.2/lib/behaviors/ScrollToTopBehavior", "npm:react-router@0.13.2/lib/History", "npm:react-router@0.13.2/lib/Navigation", "npm:react-router@0.13.2/lib/State", "npm:react-router@0.13.2/lib/Route", "npm:react-router@0.13.2/lib/Route", "npm:react-router@0.13.2/lib/Route", "npm:react-router@0.13.2/lib/Route", "npm:react-router@0.13.2/lib/createRoutesFromReactChildren", "npm:react-router@0.13.2/lib/createRouter", "npm:react-router@0.13.2/lib/runRouter"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  "use strict";
  exports.DefaultRoute = require("npm:react-router@0.13.2/lib/components/DefaultRoute");
  exports.Link = require("npm:react-router@0.13.2/lib/components/Link");
  exports.NotFoundRoute = require("npm:react-router@0.13.2/lib/components/NotFoundRoute");
  exports.Redirect = require("npm:react-router@0.13.2/lib/components/Redirect");
  exports.Route = require("npm:react-router@0.13.2/lib/components/Route");
  exports.RouteHandler = require("npm:react-router@0.13.2/lib/components/RouteHandler");
  exports.HashLocation = require("npm:react-router@0.13.2/lib/locations/HashLocation");
  exports.HistoryLocation = require("npm:react-router@0.13.2/lib/locations/HistoryLocation");
  exports.RefreshLocation = require("npm:react-router@0.13.2/lib/locations/RefreshLocation");
  exports.StaticLocation = require("npm:react-router@0.13.2/lib/locations/StaticLocation");
  exports.TestLocation = require("npm:react-router@0.13.2/lib/locations/TestLocation");
  exports.ImitateBrowserBehavior = require("npm:react-router@0.13.2/lib/behaviors/ImitateBrowserBehavior");
  exports.ScrollToTopBehavior = require("npm:react-router@0.13.2/lib/behaviors/ScrollToTopBehavior");
  exports.History = require("npm:react-router@0.13.2/lib/History");
  exports.Navigation = require("npm:react-router@0.13.2/lib/Navigation");
  exports.State = require("npm:react-router@0.13.2/lib/State");
  exports.createRoute = require("npm:react-router@0.13.2/lib/Route").createRoute;
  exports.createDefaultRoute = require("npm:react-router@0.13.2/lib/Route").createDefaultRoute;
  exports.createNotFoundRoute = require("npm:react-router@0.13.2/lib/Route").createNotFoundRoute;
  exports.createRedirect = require("npm:react-router@0.13.2/lib/Route").createRedirect;
  exports.createRoutesFromReactChildren = require("npm:react-router@0.13.2/lib/createRoutesFromReactChildren");
  exports.create = require("npm:react-router@0.13.2/lib/createRouter");
  exports.run = require("npm:react-router@0.13.2/lib/runRouter");
  global.define = __define;
  return module.exports;
});

System.register("npm:react@0.13.2", ["npm:react@0.13.2/react"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:react@0.13.2/react");
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2/lib", ["npm:react-router@0.13.2/lib/index"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:react-router@0.13.2/lib/index");
  global.define = __define;
  return module.exports;
});

System.register("npm:react-router@0.13.2", ["npm:react-router@0.13.2/lib"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:react-router@0.13.2/lib");
  global.define = __define;
  return module.exports;
});

System.register("src/model/core/seat", [], function($__export) {
  "use strict";
  var __moduleName = "src/model/core/seat";
  var Seat;
  return {
    setters: [],
    execute: function() {
      Seat = $__export("Seat", {
        North: 1,
        East: 2,
        South: 3,
        West: 4,
        all: function() {
          return [Seat.North, Seat.East, Seat.South, Seat.West];
        },
        name: function(seat) {
          switch (seat) {
            case Seat.North:
              return "north";
            case Seat.South:
              return "south";
            case Seat.East:
              return "east";
            case Seat.West:
              return "west";
            default:
              throw new Error("unrecognised seat");
          }
        },
        rotate: function(seat, count) {
          count = count || 0;
          return ((seat + count - Seat.North) % 4) + Seat.North;
        },
        isPartner: function(seat1, seat2) {
          return (Seat.rotate(seat1, 2) === seat2);
        }
      });
    }
  };
});

System.register("src/model/core/card", [], function($__export) {
  "use strict";
  var __moduleName = "src/model/core/card";
  var Suit,
      Pip,
      Card;
  return {
    setters: [],
    execute: function() {
      Suit = $__export("Suit", {
        "Clubs": 1,
        "Diamonds": 2,
        "Hearts": 3,
        "Spades": 4
      });
      Pip = $__export("Pip", {
        "Two": 2,
        "Three": 3,
        "Four": 4,
        "Five": 5,
        "Six": 6,
        "Seven": 7,
        "Eight": 8,
        "Nine": 9,
        "Ten": 10,
        "Jack": 11,
        "Queen": 12,
        "King": 13,
        "Ace": 14
      });
      Card = $__export("Card", (function() {
        var Card = function Card() {
          ;
        };
        return ($traceurRuntime.createClass)(Card, {}, {
          stringify: function(card) {},
          compare: function(card1, card2, trumpSuit, leadSuit) {
            if (card1.suit == card2.suit) {
              return card1.pip - card2.pip;
            } else {
              if (trumpSuit) {
                if (card1.suit == trumpSuit)
                  return 1;
                else if (card2.suit == trumpSuit)
                  return -1;
              }
              if (leadSuit) {
                if (card1.suit == leadSuit)
                  return 1;
                else if (card2.suit == leadSuit)
                  return -1;
              }
              return card1.suit - card2.suit;
            }
          },
          create: function(card) {
            var shortSuitNames = ["", "C", "D", "H", "S"];
            var shortPipNames = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
            var result = {};
            result.pip = shortPipNames.indexOf(card[0].toUpperCase());
            result.suit = shortSuitNames.indexOf(card[1].toUpperCase());
            return result;
          },
          suitName: function(suit) {
            var suitNames = ["", "clubs", "diamonds", "hearts", "spades"];
            return suitNames[suit];
          },
          pipName: function(pip) {
            switch (pip) {
              case Pip.Ace:
                return "A";
              case Pip.King:
                return "K";
              case Pip.Queen:
                return "Q";
              case Pip.Jack:
                return "J";
              default:
                return pip.toString();
            }
          }
        });
      }()));
      Object.defineProperty(Card.create, "parameters", {get: function() {
          return [[$traceurRuntime.type.string]];
        }});
      Object.defineProperty(Card.suitName, "parameters", {get: function() {
          return [[Suit]];
        }});
    }
  };
});

System.register("src/model/core/bid", [], function($__export) {
  "use strict";
  var __moduleName = "src/model/core/bid";
  var BidSuit,
      BidType,
      Bid;
  return {
    setters: [],
    execute: function() {
      BidSuit = $__export("BidSuit", {
        "Clubs": 1,
        "Diamonds": 2,
        "Hearts": 3,
        "Spades": 4,
        "NoTrumps": 5
      });
      BidType = $__export("BidType", {
        "NoBid": 1,
        "Call": 2,
        "Double": 3,
        "Redouble": 4
      });
      Bid = $__export("Bid", (function() {
        var Bid = function Bid() {
          ;
        };
        return ($traceurRuntime.createClass)(Bid, {}, {
          stringify: function(bid) {
            switch (bid.type) {
              case BidType.NoBid:
                return "No Bid";
              case BidType.Call:
                return bid.level.toString() + ' ' + Bid.suitName(bid.suit, (bid.level == 1));
              case BidType.Double:
                return "Double";
              case BidType.Redouble:
                return "Redouble";
              default:
                throw new Error("unrecognised bid");
            }
          },
          key: function(bid) {
            var result = [bid.type];
            if (bid.type == BidType.Call)
              result = result.concat([bid.level, bid.suit]);
            return result.join('-');
          },
          create: function(bid) {
            var shortNames = ["", "c", "d", "h", "s", "nt"];
            bid = bid.toLowerCase();
            if (bid == "double")
              return {type: BidType.Double};
            else if (bid == "redouble")
              return {type: BidType.Redouble};
            else if (bid == "no bid")
              return {type: BidType.NoBid};
            else {
              var result = {type: BidType.Call};
              result.level = parseInt(bid[0]);
              result.suit = shortNames.indexOf(bid.slice(1));
              return result;
            }
          },
          suitName: function(suit, singular) {
            var names = ["", "club", "diamond", "heart", "spade", "no-trump"];
            return names[suit] + (singular ? '' : 's');
          },
          compare: function(bid1, bid2) {
            if (bid1.type != bid2.type) {
              return bid1.type - bid2.type;
            } else {
              if (bid1.type == BidType.Call) {
                if (bid1.level == bid2.level)
                  return bid1.suit - bid2.suit;
                else
                  return bid1.level - bid2.level;
              } else {
                return 0;
              }
            }
          }
        });
      }()));
      Object.defineProperty(Bid.create, "parameters", {get: function() {
          return [[$traceurRuntime.type.string]];
        }});
      Object.defineProperty(Bid.suitName, "parameters", {get: function() {
          return [[BidSuit], [$traceurRuntime.type.boolean]];
        }});
    }
  };
});

System.register("src/model/game/game-scorer", [], function($__export) {
  "use strict";
  var __moduleName = "src/model/game/game-scorer";
  var GameScorer;
  return {
    setters: [],
    execute: function() {
      GameScorer = $__export("GameScorer", (function() {
        var GameScorer = function GameScorer() {
          ;
        };
        return ($traceurRuntime.createClass)(GameScorer, {}, {});
      }()));
    }
  };
});

System.register("src/model/game/validators", ["src/model/core/seat", "src/model/core/bid", "src/model/core/card", "src/model/game/game-state"], function($__export) {
  "use strict";
  var __moduleName = "src/model/game/validators";
  var Seat,
      Bid,
      BidType,
      BidSuit,
      Card,
      Pip,
      Suit,
      GameStateHelper;
  function validateBid(bid, game) {
    if (game.biddingHasEnded)
      return new Error("the bidding has already ended");
    switch (bid.type) {
      case BidType.NoBid:
        return ;
      case BidType.Double:
        if (!game.lastAction || (game.lastAction.type != BidType.Call))
          return new Error("invalid double");
        else if (Seat.isPartner(game.lastCaller, game.nextPlayer))
          return new Error("you cannot double your partner!");
        else
          return ;
      case BidType.Redouble:
        if (!game.lastAction || (game.lastAction.type != BidType.Double))
          return new Error("invalid redouble");
        else if (Seat.isPartner(game.lastActor, game.nextPlayer))
          return new Error("you cannot redouble your partner");
        else
          return ;
      case BidType.Call:
        {
          if ((!bid.level) || (!bid.suit))
            return new Error("you must say the level and the suit");
          else if ((bid.level < 1) || (bid.level > 7))
            return new Error("invalid bid level");
          else if (game.lastCall) {
            if (Bid.compare(bid, game.lastCall) <= 0)
              return new Error("bid must be higher than " + Bid.stringify(game.lastCall));
          }
          return ;
        }
    }
  }
  function validateCard(card, game) {}
  $__export("validateBid", validateBid);
  $__export("validateCard", validateCard);
  return {
    setters: [function($__m) {
      Seat = $__m.Seat;
    }, function($__m) {
      Bid = $__m.Bid;
      BidType = $__m.BidType;
      BidSuit = $__m.BidSuit;
    }, function($__m) {
      Card = $__m.Card;
      Pip = $__m.Pip;
      Suit = $__m.Suit;
    }, function($__m) {
      GameStateHelper = $__m.GameStateHelper;
    }],
    execute: function() {
      Object.defineProperty(validateBid, "parameters", {get: function() {
          return [[tower.IBid], [GameStateHelper]];
        }});
      Object.defineProperty(validateCard, "parameters", {get: function() {
          return [[tower.ICard], [GameStateHelper]];
        }});
    }
  };
});

System.register("src/stores/notification-store", ["npm:reflux@0.2.7"], function($__export) {
  "use strict";
  var __moduleName = "src/stores/notification-store";
  var Reflux,
      NotificationActions,
      NotificationStore;
  return {
    setters: [function($__m) {
      Reflux = $__m.default;
    }],
    execute: function() {
      NotificationActions = $__export("NotificationActions", Reflux.createActions(["info", "warn", "error", "question", "success", "notify", "dismiss"]));
      NotificationStore = $__export("NotificationStore", Reflux.createStore({
        init: function() {
          var $__0 = this;
          this.listenToMany(NotificationActions);
          this.notifications = [];
          this.currentId = 1;
          setInterval((function() {
            $__0.autoDismiss();
          }), 7500);
        },
        autoDismiss: function() {
          var now = new Date();
          this.notifications.forEach((function(notif) {
            if (!notif.dismissed && !(notif.type == 'question')) {
              if (now.getTime() - notif.timestamp.getTime() > 10000) {
                NotificationActions.dismiss({id: notif.id});
              }
            }
          }));
        },
        onInfo: function(opts) {
          opts = opts || {};
          opts.type = 'info';
          var notification = this.notify(opts);
          this.trigger(notification);
        },
        onWarn: function(opts) {
          opts = opts || {};
          opts.type = 'warn';
          var notification = this.notify(opts);
          this.trigger(notification);
        },
        onError: function(opts) {
          opts = opts || {};
          opts.type = 'error';
          var notification = this.notify(opts);
          this.trigger(notification);
        },
        onQuestion: function(opts) {
          opts = opts || {};
          opts.type = 'question';
          opts.timeout = opts.timeout || -1;
          var notification = this.notify(opts);
          this.trigger(notification);
        },
        onSuccess: function(opts) {
          opts = opts || {};
          opts.type = 'success';
          var notification = this.notify(opts);
          this.trigger(notification);
        },
        onNotify: function(opts) {
          var notification = this.notify(opts);
          this.trigger(notification);
        },
        notify: function(opts) {
          var notification = {};
          notification.id = this.generateId();
          notification.timestamp = new Date();
          notification.source = opts.source;
          notification.type = opts.type;
          notification.title = opts.title;
          notification.timeout = opts.timeout || 20000;
          notification.message = opts.message;
          notification.buttons = opts.buttons || [];
          notification.defaultButton = opts.defaultButton;
          this.notifications.push(notification);
          return notification;
        },
        onDismiss: function(opts) {
          var notification = this.notifications.filter((function(notif) {
            return notif.id == opts.id;
          }))[0];
          if (notification) {
            this.notifications = this.notifications.filter((function(notif) {
              return notif.id != opts.id;
            }));
            notification.response = opts.response;
            this.trigger(notification);
          }
        },
        generateId: function() {
          return this.currentId++;
        }
      }));
    }
  };
});

System.register("src/model/strategy/cardplay/cardplay-strategy", [], function($__export) {
  "use strict";
  var __moduleName = "src/model/strategy/cardplay/cardplay-strategy";
  var CardplayStrategy;
  return {
    setters: [],
    execute: function() {
      CardplayStrategy = $__export("CardplayStrategy", (function() {
        var CardplayStrategy = function CardplayStrategy() {};
        return ($traceurRuntime.createClass)(CardplayStrategy, {
          getCard: function(game) {
            var trick = game.currentTrick;
            var cards = game.currentBoard.hands[game.nextPlayer].filter((function(card) {
              return !game.hasBeenPlayed(card);
            }));
            return this.getAnyCard(trick[0], cards);
          },
          getAnyCard: function(lead, cards) {
            var availableCards = cards;
            if (lead) {
              var followers = availableCards.filter((function(card) {
                return card.suit == lead.card.suit;
              }));
              if (followers.length > 0)
                availableCards = followers;
            }
            return availableCards[0];
          }
        }, {});
      }()));
      Object.defineProperty(CardplayStrategy.prototype.getAnyCard, "parameters", {get: function() {
          return [[tower.ICard], [tower.IHand]];
        }});
    }
  };
});

System.register("src/model/strategy/bidding/bidding-strategy", ["src/model/core/bid"], function($__export) {
  "use strict";
  var __moduleName = "src/model/strategy/bidding/bidding-strategy";
  var BidSuit,
      BidType,
      Bid,
      BiddingStrategy;
  return {
    setters: [function($__m) {
      BidSuit = $__m.BidSuit;
      BidType = $__m.BidType;
      Bid = $__m.Bid;
    }],
    execute: function() {
      BiddingStrategy = $__export("BiddingStrategy", (function() {
        var BiddingStrategy = function BiddingStrategy() {};
        return ($traceurRuntime.createClass)(BiddingStrategy, {getBid: function(game) {
            if (!game.lastCall) {
              return {type: BidType.NoBid};
            } else if ((game.currentBoard.bids.length > 0) && (game.currentBoard.bids.length < 4))
              return {
                type: BidType.Call,
                suit: game.lastCall.suit + 1 || BidSuit.Clubs,
                level: game.lastCall.level + 1 || 1
              };
            else
              return {type: BidType.NoBid};
          }}, {});
      }()));
      Object.defineProperty(BiddingStrategy.prototype.getBid, "parameters", {get: function() {
          return [[tower.IGame]];
        }});
    }
  };
});

System.register("src/ui/components/card.jsx!github:floatdrop/plugin-jsx@0.1.1", ["npm:react@0.13.2", "src/model/core/card"], function($__export) {
  "use strict";
  var __moduleName = "src/ui/components/card.jsx!github:floatdrop/plugin-jsx@0.1.1";
  var React,
      Suit,
      Pip,
      Card,
      CardComponent;
  return {
    setters: [function($__m) {
      React = $__m.default;
    }, function($__m) {
      Suit = $__m.Suit;
      Pip = $__m.Pip;
      Card = $__m.Card;
    }],
    execute: function() {
      CardComponent = $__export("CardComponent", (function($__super) {
        var CardComponent = function CardComponent(props) {
          $traceurRuntime.superConstructor(CardComponent).call(this, props);
        };
        return ($traceurRuntime.createClass)(CardComponent, {render: function() {
            if (!this.props.card)
              return React.createElement("div", {className: "card-container empty-container"});
            return (React.createElement("div", {className: "card-container"}, React.createElement("div", {className: "card-edge-left"}, React.createElement("div", {className: "card-pip-small"}, Card.pipName(this.props.card.pip)), React.createElement("div", {className: "card-suit suit-" + Card.suitName(this.props.card.suit)})), React.createElement("div", {className: "card-pip"}, Card.pipName(this.props.card.pip)), React.createElement("div", {className: "card-edge-right"}, React.createElement("div", {className: "card-pip-small"}, Card.pipName(this.props.card.pip)), React.createElement("div", {className: "card-suit suit-" + Card.suitName(this.props.card.suit)}))));
          }}, {key: function(card) {
            return Card.suitName(card.suit) + Card.pipName(card.pip);
          }}, $__super);
      }(React.Component)));
    }
  };
});

System.register("src/ui/components/bid.jsx!github:floatdrop/plugin-jsx@0.1.1", ["npm:react@0.13.2", "src/model/core/bid"], function($__export) {
  "use strict";
  var __moduleName = "src/ui/components/bid.jsx!github:floatdrop/plugin-jsx@0.1.1";
  var React,
      BidType,
      BidSuit,
      Bid,
      BidComponent;
  return {
    setters: [function($__m) {
      React = $__m.default;
    }, function($__m) {
      BidType = $__m.BidType;
      BidSuit = $__m.BidSuit;
      Bid = $__m.Bid;
    }],
    execute: function() {
      BidComponent = $__export("BidComponent", (function($__super) {
        var BidComponent = function BidComponent(props) {
          $traceurRuntime.superConstructor(BidComponent).call(this, props);
        };
        return ($traceurRuntime.createClass)(BidComponent, {render: function() {
            switch (this.props.bid.type) {
              case BidType.NoBid:
                return React.createElement("div", {className: "bid-container"}, "No Bid");
              case BidType.Call:
                return (React.createElement("div", {className: "bid-container"}, React.createElement("span", {className: "bid-level"}, this.props.bid.level), React.createElement("span", {className: "bid-suit suit-" + Bid.suitName(this.props.bid.suit)})));
              case BidType.Double:
                return React.createElement("div", {className: "bid-container"}, "Double");
              case BidType.Redouble:
                return React.createElement("div", {className: "bid-container"}, "Redouble");
              default:
                throw new Error("unrecognised bid");
            }
          }}, {key: function(bid) {
            switch (bid.type) {
              case BidType.NoBid:
                return "No Bid";
              case BidType.Call:
                return Bid.key(bid);
              case BidType.Double:
                return "Double";
              case BidType.Redouble:
                return "Redouble";
              default:
                throw new Error("unrecognised bid");
            }
          }}, $__super);
      }(React.Component)));
    }
  };
});

System.register("src/ui/table/bidding-history.jsx!github:floatdrop/plugin-jsx@0.1.1", ["npm:react@0.13.2", "src/ui/components/bid.jsx!github:floatdrop/plugin-jsx@0.1.1", "src/model/core/seat"], function($__export) {
  "use strict";
  var __moduleName = "src/ui/table/bidding-history.jsx!github:floatdrop/plugin-jsx@0.1.1";
  var React,
      BidComponent,
      Seat,
      BiddingHistory;
  return {
    setters: [function($__m) {
      React = $__m.default;
    }, function($__m) {
      BidComponent = $__m.BidComponent;
    }, function($__m) {
      Seat = $__m.Seat;
    }],
    execute: function() {
      BiddingHistory = $__export("BiddingHistory", (function($__super) {
        var BiddingHistory = function BiddingHistory(props) {
          $traceurRuntime.superConstructor(BiddingHistory).call(this, props);
        };
        return ($traceurRuntime.createClass)(BiddingHistory, {render: function() {
            var headings = [];
            for (var seat = Seat.North; seat <= Seat.West; seat++) {
              headings.push(React.createElement("th", {
                key: seat,
                className: "bidding-cell"
              }, Seat.name(seat)));
            }
            var rows = [];
            for (var i = 0; i < 6; i++) {
              var cells = [];
              for (var j = 0; j < 4; j++) {
                var position = (i * 4) + j;
                if (this.props.board.bids.length > position) {
                  var bid = this.props.board.bids[position];
                  cells.push(React.createElement("td", {
                    key: position,
                    className: "bidding-cell"
                  }, React.createElement(BidComponent, {bid: bid})));
                } else {
                  cells.push(React.createElement("td", {
                    key: position,
                    className: "bidding-cell"
                  }));
                }
              }
              rows.push(React.createElement("tr", {
                key: i,
                className: "bidding-round"
              }, cells));
            }
            return (React.createElement("table", {className: "bidding-container pure-table"}, React.createElement("thead", null, React.createElement("tr", null, headings)), React.createElement("tbody", null, rows)));
          }}, {}, $__super);
      }(React.Component)));
    }
  };
});

System.register("src/ui/table/trick.jsx!github:floatdrop/plugin-jsx@0.1.1", ["npm:react@0.13.2", "src/ui/components/card.jsx!github:floatdrop/plugin-jsx@0.1.1", "src/model/core/seat"], function($__export) {
  "use strict";
  var __moduleName = "src/ui/table/trick.jsx!github:floatdrop/plugin-jsx@0.1.1";
  var React,
      CardComponent,
      Seat,
      TrickComponent;
  return {
    setters: [function($__m) {
      React = $__m.default;
    }, function($__m) {
      CardComponent = $__m.CardComponent;
    }, function($__m) {
      Seat = $__m.Seat;
    }],
    execute: function() {
      TrickComponent = $__export("TrickComponent", (function($__super) {
        var TrickComponent = function TrickComponent(props) {
          $traceurRuntime.superConstructor(TrickComponent).call(this, props);
        };
        return ($traceurRuntime.createClass)(TrickComponent, {
          getCard: function(seat) {
            var card = undefined;
            this.props.game.currentTrick.forEach((function(played) {
              if (played.seat == seat)
                card = played.card;
            }));
            return card;
          },
          render: function() {
            var $__0 = this;
            var cards = Seat.all().map((function(seat) {
              return React.createElement("li", {
                key: seat,
                className: "trick-card-" + Seat.name(seat)
              }, React.createElement(CardComponent, {card: $__0.getCard(seat)}));
            }));
            return (React.createElement("ol", {className: "trick-container"}, cards));
          }
        }, {}, $__super);
      }(React.Component)));
      Object.defineProperty(TrickComponent.prototype.getCard, "parameters", {get: function() {
          return [[Seat]];
        }});
    }
  };
});

System.register("src/ui/about/about.jsx!github:floatdrop/plugin-jsx@0.1.1", ["npm:react@0.13.2"], function($__export) {
  "use strict";
  var __moduleName = "src/ui/about/about.jsx!github:floatdrop/plugin-jsx@0.1.1";
  var React,
      AboutView;
  return {
    setters: [function($__m) {
      React = $__m.default;
    }],
    execute: function() {
      AboutView = $__export("AboutView", (function($__super) {
        var AboutView = function AboutView(props) {
          $traceurRuntime.superConstructor(AboutView).call(this, props);
        };
        return ($traceurRuntime.createClass)(AboutView, {render: function() {
            console.log('rendering about');
            return (React.createElement("div", {className: "about-container"}, React.createElement("section", null, React.createElement("h3", null, "About Tower"), React.createElement("p", null, "Welcome to Tower!. I use it as sandpit where I can try out new technologies," + ' ' + "tools and techniques which I am interested in. At some point during my lifetime I may even finish it, but that's not what's important right now." + ' ' + "The application you are using is developed in ES6 using ReactJS and uses the Flux architecture. It is built using SystemJS, JSPM and Babel." + ' ' + "I have also ported this application to ", React.createElement("a", {href: "https://github.com/frankwallis/tower/tree/angular2"}, "Angular2"), "," + ' ' + "and combined Angular2 Zones with ReactJS to create the world's first ", React.createElement("a", {href: "https://github.com/frankwallis/tower/blob/react-zones/src/ui/"}, "react zones"), " application!" + ' ' + "It is a work in progress, so please excuse any strange behaviours, or send a pull request :)")), React.createElement("section", null, React.createElement("h3", null, "Roadmap"), React.createElement("ul", null, React.createElement("li", null, "Implement the playing strategies based on ", React.createElement("a", {href: "http://www.aifactory.co.uk/newsletter/2011_02_mcts_static.htm"}, "Information Set Monte Carlo Tree Search"), " algorithm"), React.createElement("li", null, "Select a proper immutable data library"), React.createElement("li", null, "Integration Tests"), React.createElement("li", null, "Better shuffling algorithm"), React.createElement("li", null, "Rewrite in Om!"))), React.createElement("section", null, React.createElement("h3", null, "About Me"), React.createElement("p", null, "I am a software developer based in London"))));
          }}, {}, $__super);
      }(React.Component)));
    }
  };
});

System.register("src/ui/settings/settings.jsx!github:floatdrop/plugin-jsx@0.1.1", ["npm:react@0.13.2", "npm:reflux@0.2.7", "src/stores/player-store", "src/model/core/seat"], function($__export) {
  "use strict";
  var __moduleName = "src/ui/settings/settings.jsx!github:floatdrop/plugin-jsx@0.1.1";
  var React,
      Reflux,
      PlayerStore,
      PlayerActions,
      Seat,
      SettingsView;
  return {
    setters: [function($__m) {
      React = $__m.default;
    }, function($__m) {
      Reflux = $__m.default;
    }, function($__m) {
      PlayerStore = $__m.PlayerStore;
      PlayerActions = $__m.PlayerActions;
    }, function($__m) {
      Seat = $__m.Seat;
    }],
    execute: function() {
      SettingsView = $__export("SettingsView", (function($__super) {
        var SettingsView = function SettingsView(props) {
          $traceurRuntime.superConstructor(SettingsView).call(this, props);
          this.players = PlayerStore.players;
        };
        return ($traceurRuntime.createClass)(SettingsView, {
          componentDidMount: function() {
            var $__0 = this;
            this.unsubscribePlayers = PlayerStore.listen((function(players) {
              $__0.players = players;
              $__0.forceUpdate();
            }));
          },
          componentWillUnmount: function() {
            this.unsubscribePlayers();
          },
          handleChangeName: function(seat, event) {
            PlayerActions.updatePlayer(seat, {name: event.target.value});
          },
          handleChangeHuman: function(seat, event) {
            PlayerActions.updatePlayer(seat, {ishuman: !event.target.checked});
          },
          render: function() {
            var $__0 = this;
            console.log('rendering setings');
            var players = Seat.all().map((function(seat) {
              return React.createElement("li", {
                className: "settings-player",
                key: seat
              }, React.createElement("h3", {className: "settings-player-header"}, Seat.name(seat)), React.createElement("div", {className: "settings-field"}, React.createElement("label", {
                className: "settings-label",
                htmlFor: "name-input-" + Seat.name(seat)
              }, "Name"), React.createElement("input", {
                className: "settings-input-name",
                type: "text",
                id: "name-input-" + Seat.name(seat),
                defaultValue: $__0.players[seat].name,
                onChange: (function(event) {
                  return $__0.handleChangeName(seat, event);
                })
              })), React.createElement("div", {className: "settings-field"}, React.createElement("label", {
                className: "settings-label",
                htmlFor: "human-input-" + Seat.name(seat)
              }, "Automatic"), React.createElement("input", {
                className: "settings-input-human",
                type: "checkbox",
                id: "human-input-" + Seat.name(seat),
                defaultChecked: !$__0.players[seat].ishuman,
                onChange: (function(event) {
                  return $__0.handleChangeHuman(seat, event);
                })
              })));
            }));
            return (React.createElement("div", {className: "settings-container"}, React.createElement("ul", {className: "settings-players"}, players)));
          }
        }, {}, $__super);
      }(React.Component)));
    }
  };
});

System.register("src/ui/growl/growl.jsx!github:floatdrop/plugin-jsx@0.1.1", ["npm:react@0.13.2", "npm:reflux@0.2.7", "src/stores/notification-store"], function($__export) {
  "use strict";
  var __moduleName = "src/ui/growl/growl.jsx!github:floatdrop/plugin-jsx@0.1.1";
  var React,
      Reflux,
      NotificationStore,
      NotificationActions,
      GrowlContainer;
  return {
    setters: [function($__m) {
      React = $__m.default;
    }, function($__m) {
      Reflux = $__m.default;
    }, function($__m) {
      NotificationStore = $__m.NotificationStore;
      NotificationActions = $__m.NotificationActions;
    }],
    execute: function() {
      GrowlContainer = $__export("GrowlContainer", (function($__super) {
        var GrowlContainer = function GrowlContainer(props) {
          $traceurRuntime.superConstructor(GrowlContainer).call(this, props);
        };
        return ($traceurRuntime.createClass)(GrowlContainer, {
          componentDidMount: function() {
            var $__0 = this;
            this.unsubscribe = NotificationStore.listen((function() {
              $__0.forceUpdate();
            }));
          },
          componentWillUnmount: function() {
            this.unsubscribe();
          },
          handleResponse: function(id, response) {
            NotificationActions.dismiss({
              id: id,
              response: response
            });
          },
          render: function() {
            var $__0 = this;
            console.log('rendering growls');
            var growls = NotificationStore.notifications.map((function(notification) {
              var buttons = notification.buttons.map((function(button) {
                return React.createElement("a", {onClick: (function() {
                    return $__0.handleResponse(notification.id, button);
                  })}, button);
              }));
              return (React.createElement("li", {
                className: "growl-item growl-" + notification.type,
                onClick: (function() {
                  return $__0.handleResponse(notification.id, notification.defaultButton);
                }),
                key: notification.id
              }, React.createElement("h3", {className: "growl-title"}, notification.title), React.createElement("p", {className: "growl-message"}, notification.message), React.createElement("div", {className: "growl-buttons"}, buttons)));
            }));
            return (React.createElement("ol", {className: "growl-list"}, growls));
          }
        }, {}, $__super);
      }(React.Component)));
    }
  };
});

System.register("src/model/core/deck", ["src/model/core/card"], function($__export) {
  "use strict";
  var __moduleName = "src/model/core/deck";
  var Suit,
      Pip,
      Card,
      Deck;
  return {
    setters: [function($__m) {
      Suit = $__m.Suit;
      Pip = $__m.Pip;
      Card = $__m.Card;
    }],
    execute: function() {
      Deck = $__export("Deck", (function() {
        var Deck = function Deck() {
          this.cards = this.createCards();
        };
        return ($traceurRuntime.createClass)(Deck, {
          createCards: function() {
            var result = [];
            for (var asuit = Suit.Clubs; asuit <= Suit.Spades; asuit++) {
              for (var apip = Pip.Two; apip <= Pip.Ace; apip++) {
                result.push({
                  suit: asuit,
                  pip: apip
                });
              }
            }
            return result;
          },
          shuffleCards: function(array) {
            var i = array.length,
                j,
                swap;
            while (--i) {
              j = Math.random() * (i + 1) | 0;
              swap = array[i];
              array[i] = array[j];
              array[j] = swap;
            }
            return array;
          },
          shuffle: function() {
            this.cards = this.shuffleCards(this.cards);
          },
          deal: function(hands) {
            var current = 0;
            var result = [];
            while (current < this.cards.length) {
              var hand = current % hands;
              if (!result[hand])
                result[hand] = [];
              result[hand].push(this.cards[current]);
              current++;
            }
            return result;
          }
        }, {});
      }()));
      Object.defineProperty(Deck.prototype.shuffleCards, "parameters", {get: function() {
          return [[$traceurRuntime.genericType(Array, Card)]];
        }});
      Object.defineProperty(Deck.prototype.deal, "parameters", {get: function() {
          return [[$traceurRuntime.type.number]];
        }});
    }
  };
});

System.register("src/ui/table/hand.jsx!github:floatdrop/plugin-jsx@0.1.1", ["npm:react@0.13.2", "src/ui/components/card.jsx!github:floatdrop/plugin-jsx@0.1.1", "src/stores/game-store", "src/model/core/card"], function($__export) {
  "use strict";
  var __moduleName = "src/ui/table/hand.jsx!github:floatdrop/plugin-jsx@0.1.1";
  var React,
      CardComponent,
      GameActions,
      Card,
      HandComponent;
  return {
    setters: [function($__m) {
      React = $__m.default;
    }, function($__m) {
      CardComponent = $__m.CardComponent;
    }, function($__m) {
      GameActions = $__m.GameActions;
    }, function($__m) {
      Card = $__m.Card;
    }],
    execute: function() {
      HandComponent = $__export("HandComponent", (function($__super) {
        var HandComponent = function HandComponent(props) {
          $traceurRuntime.superConstructor(HandComponent).call(this, props);
        };
        return ($traceurRuntime.createClass)(HandComponent, {
          get availableCards() {
            var $__0 = this;
            return this.props.game.currentBoard.hands[this.props.seat].filter((function(card) {
              return !$__0.props.game.hasBeenPlayed(card);
            })).sort((function(c1, c2) {
              return Card.compare(c1, c2, $__0.props.game.currentBoard.trumpSuit);
            }));
          },
          playCard: function(card) {
            GameActions.playCard(card);
          },
          render: function() {
            var $__0 = this;
            var cards = this.availableCards.map((function(card) {
              return (React.createElement("li", {
                className: "hand-card",
                key: CardComponent.key(card)
              }, React.createElement("button", {
                className: "hand-card-button",
                onClick: (function() {
                  return $__0.playCard(card);
                })
              }, React.createElement(CardComponent, {card: card}))));
            }));
            return (React.createElement("div", {className: "hand-container"}, React.createElement("ol", {className: "container"}, cards)));
          }
        }, {}, $__super);
      }(React.Component)));
    }
  };
});

System.register("src/ui/table/bidding-box.jsx!github:floatdrop/plugin-jsx@0.1.1", ["npm:react@0.13.2", "src/ui/components/bid.jsx!github:floatdrop/plugin-jsx@0.1.1", "src/model/core/bid", "src/stores/game-store"], function($__export) {
  "use strict";
  var __moduleName = "src/ui/table/bidding-box.jsx!github:floatdrop/plugin-jsx@0.1.1";
  var React,
      BidComponent,
      BidSuit,
      BidType,
      Bid,
      GameActions,
      BiddingBox;
  return {
    setters: [function($__m) {
      React = $__m.default;
    }, function($__m) {
      BidComponent = $__m.BidComponent;
    }, function($__m) {
      BidSuit = $__m.BidSuit;
      BidType = $__m.BidType;
      Bid = $__m.Bid;
    }, function($__m) {
      GameActions = $__m.GameActions;
    }],
    execute: function() {
      BiddingBox = $__export("BiddingBox", (function($__super) {
        var BiddingBox = function BiddingBox(props) {
          $traceurRuntime.superConstructor(BiddingBox).call(this, props);
          console.log('created bidding-box');
        };
        return ($traceurRuntime.createClass)(BiddingBox, {
          bidButton: function(bid, colspan) {
            var $__0 = this;
            return (React.createElement("td", {
              key: BidComponent.key(bid),
              className: "bidding-box-cell",
              colSpan: colspan
            }, React.createElement("button", {
              className: "bidding-box-button pure-button",
              onClick: (function() {
                return $__0.makeBid(bid);
              })
            }, React.createElement(BidComponent, {bid: bid}))));
          },
          makeBid: function(bid) {
            console.log('in makeBid');
            GameActions.makeBid(bid);
          },
          render: function() {
            console.log('rendering bidding-box');
            var levels = [];
            for (var i = 1; i <= 7; i++) {
              var cells = [];
              for (var s = BidSuit.Clubs; s <= BidSuit.NoTrumps; s++) {
                cells.push(this.bidButton({
                  type: BidType.Call,
                  suit: s,
                  level: i
                }, 2));
              }
              levels.push(React.createElement("tr", {
                key: i,
                className: "bidding-box-level"
              }, cells));
            }
            var modButtons = [this.bidButton({type: BidType.Double}, 3), this.bidButton({type: BidType.Redouble}, 3), this.bidButton({type: BidType.NoBid}, 4)];
            levels.push(React.createElement("tr", {
              key: "bottom",
              className: "bidding-box-level"
            }, modButtons));
            return (React.createElement("div", {className: "bidding-box-container"}, React.createElement("table", null, React.createElement("colgroup", null, React.createElement("col", {
              span: "1",
              style: {width: '10%'}
            }), React.createElement("col", {
              span: "1",
              style: {width: '10%'}
            }), React.createElement("col", {
              span: "1",
              style: {width: '10%'}
            }), React.createElement("col", {
              span: "1",
              style: {width: '10%'}
            }), React.createElement("col", {
              span: "1",
              style: {width: '10%'}
            }), React.createElement("col", {
              span: "1",
              style: {width: '10%'}
            }), React.createElement("col", {
              span: "1",
              style: {width: '10%'}
            }), React.createElement("col", {
              span: "1",
              style: {width: '10%'}
            }), React.createElement("col", {
              span: "1",
              style: {width: '10%'}
            }), React.createElement("col", {
              span: "1",
              style: {width: '10%'}
            })), React.createElement("tbody", null, levels))));
          }
        }, {}, $__super);
      }(React.Component)));
      Object.defineProperty(BiddingBox.prototype.bidButton, "parameters", {get: function() {
          return [[tower.IBid], [$traceurRuntime.type.number]];
        }});
    }
  };
});

System.register("src/model/game/game-state", ["src/model/core/deck", "src/model/core/seat", "src/model/core/bid", "src/model/core/card", "src/model/game/game-scorer", "src/model/game/validators"], function($__export) {
  "use strict";
  var __moduleName = "src/model/game/game-state";
  var Deck,
      Seat,
      Bid,
      BidType,
      BidSuit,
      Card,
      Pip,
      Suit,
      GameScorer,
      validateBid,
      validateCard,
      GameStateHelper,
      Game;
  return {
    setters: [function($__m) {
      Deck = $__m.Deck;
    }, function($__m) {
      Seat = $__m.Seat;
    }, function($__m) {
      Bid = $__m.Bid;
      BidType = $__m.BidType;
      BidSuit = $__m.BidSuit;
    }, function($__m) {
      Card = $__m.Card;
      Pip = $__m.Pip;
      Suit = $__m.Suit;
    }, function($__m) {
      GameScorer = $__m.GameScorer;
    }, function($__m) {
      validateBid = $__m.validateBid;
      validateCard = $__m.validateCard;
    }],
    execute: function() {
      GameStateHelper = $__export("GameStateHelper", (function() {
        var GameStateHelper = function GameStateHelper(gameState) {
          this.gameState = gameState || {boards: []};
        };
        return ($traceurRuntime.createClass)(GameStateHelper, {
          get currentBoard() {
            return this.gameState.boards[this.gameState.boards.length - 1];
          },
          get lastBid() {
            return this.currentBoard.bids[this.currentBoard.bids.length - 1];
          },
          get lastCall() {
            return this.currentBoard.bids.reduce((function(current, bid) {
              if (bid.type == BidType.Call)
                return bid;
              else
                return current;
            }), undefined);
          },
          get lastCaller() {
            var call = this.lastCall;
            if (call)
              return Seat.rotate(this.currentBoard.dealer, this.currentBoard.bids.indexOf(call));
          },
          get lastAction() {
            return this.currentBoard.bids.reduce((function(current, bid) {
              if (bid.type != BidType.NoBid)
                return bid;
              else
                return current;
            }), undefined);
          },
          get lastActor() {
            var act = this.lastAction;
            if (act)
              return Seat.rotate(this.currentBoard.dealer, this.currentBoard.bids.indexOf(act));
          },
          get trumpSuit() {
            if (this.biddingHasEnded && this.lastCall)
              return this.lastCall.suit;
          },
          get biddingHasEnded() {
            var consecutivePasses = 0;
            var idx = this.currentBoard.bids.length - 1;
            while (idx >= 0) {
              if (this.currentBoard.bids[idx].type == BidType.NoBid)
                consecutivePasses++;
              else
                break;
              idx--;
            }
            return (consecutivePasses >= 3) && (this.currentBoard.bids.length >= 4);
          },
          get currentTrick() {
            var played = this.currentBoard.cards.length % 4;
            played = played || 4;
            return this.currentBoard.cards.slice(played * -1);
          },
          get previousTrickWinner() {
            var $__0 = this;
            if (this.currentBoard.cards.length < 4)
              return undefined;
            var played = this.currentBoard.cards.length % 4;
            var trick = this.currentBoard.cards.slice(this.currentBoard.cards.length - played - 4, this.currentBoard.cards.length - played);
            var winner = trick.sort((function(played1, played2) {
              return Card.compare(played1.card, played2.card, $__0.trumpSuit, trick[0].card.suit);
            }))[3].seat;
            return winner;
          },
          get playHasEnded() {
            return (this.currentBoard.cards.length == 52);
          },
          hasBeenPlayed: function(card) {
            return this.currentBoard.cards.some((function(played) {
              return !Card.compare(card, played.card);
            }));
          },
          get gameHasEnded() {
            return false;
          },
          get declarer() {
            if (!this.biddingHasEnded)
              throw new Error("the bidding has not ended yet");
            if (this.lastCall) {
              for (var i = 0; i < this.currentBoard.bids.length - 1; i++)
                if (this.currentBoard.bids[i].suit == this.lastCall.suit)
                  return Seat.rotate(this.currentBoard.dealer, i);
            }
            throw new Error("declarer not found");
          },
          get leader() {
            if (this.currentBoard.cards.length < 4)
              return Seat.rotate(this.declarer, 1);
            else
              return this.previousTrickWinner;
          },
          get nextPlayer() {
            if (!this.biddingHasEnded)
              return Seat.rotate(this.currentBoard.dealer, this.currentBoard.bids.length);
            else if (!this.lastCall)
              return undefined;
            else
              return Seat.rotate(this.leader, this.currentTrick.length);
          },
          clone: function() {
            var newstate = JSON.parse(JSON.stringify(this.gameState));
            return new GameStateHelper(newstate);
          },
          newBoard: function(dealer) {
            dealer = dealer || Seat.North;
            var deck = new Deck();
            deck.shuffle();
            var hands = {};
            deck.deal(4).forEach((function(hand, idx) {
              hands[Seat.rotate(dealer, idx + 1)] = hand;
            }));
            var board = {
              dealer: dealer,
              hands: hands,
              bids: [],
              cards: []
            };
            var result = this.clone();
            result.gameState.boards.push(board);
            return result;
          },
          makeBid: function(bid) {
            var err = validateBid(bid, this);
            if (err)
              throw err;
            var newstate = this.clone();
            newstate.currentBoard.bids.push(bid);
            return newstate;
          },
          playCard: function(card) {
            var err = validateCard(card, this);
            if (err)
              throw err;
            var newstate = this.clone();
            newstate.currentBoard.cards.push({
              "seat": this.nextPlayer,
              "card": card
            });
            return newstate;
          }
        }, {});
      }()));
      Object.defineProperty(GameStateHelper, "parameters", {get: function() {
          return [[tower.IGameState]];
        }});
      Object.defineProperty(GameStateHelper.prototype.newBoard, "parameters", {get: function() {
          return [[Seat]];
        }});
      Object.defineProperty(GameStateHelper.prototype.makeBid, "parameters", {get: function() {
          return [[Bid]];
        }});
      Object.defineProperty(GameStateHelper.prototype.playCard, "parameters", {get: function() {
          return [[Card]];
        }});
      Game = $__export("Game", (function($__super) {
        var Game = function Game() {
          $traceurRuntime.superConstructor(Game).apply(this, arguments);
          ;
        };
        return ($traceurRuntime.createClass)(Game, {}, {}, $__super);
      }(GameStateHelper)));
    }
  };
});

System.register("src/stores/game-store", ["npm:reflux@0.2.7", "src/model/game/game-state", "src/model/game/validators", "src/stores/notification-store", "src/model/core/seat"], function($__export) {
  "use strict";
  var __moduleName = "src/stores/game-store";
  var Reflux,
      GameStateHelper,
      validateBid,
      validateCard,
      NotificationActions,
      Seat,
      GameActions,
      GameStore;
  return {
    setters: [function($__m) {
      Reflux = $__m.default;
    }, function($__m) {
      GameStateHelper = $__m.GameStateHelper;
    }, function($__m) {
      validateBid = $__m.validateBid;
      validateCard = $__m.validateCard;
    }, function($__m) {
      NotificationActions = $__m.NotificationActions;
    }, function($__m) {
      Seat = $__m.Seat;
    }],
    execute: function() {
      GameActions = $__export("GameActions", Reflux.createActions(["newGame", "newBoard", "makeBid", "playCard", "back", "forward"]));
      GameStore = $__export("GameStore", Reflux.createStore({
        init: function() {
          this.listenToMany(GameActions);
          this.reset();
        },
        reset: function() {
          this.states = [new GameStateHelper().newBoard(Seat.North)];
          this.currentStateIdx = 0;
        },
        getInitialState: function() {
          return this.states[this.currentStateIdx];
        },
        currentState: function() {
          return this.states[this.currentStateIdx];
        },
        pushState: function(state) {
          this.states = this.states.slice(0, this.currentStateIdx);
          this.states.push(state);
          this.currentStateIdx = this.states.length - 1;
        },
        onNewBoard: function() {
          this.pushState(this.currentState().newBoard());
          this.trigger(this.currentState());
        },
        onMakeBid: function(bid) {
          console.log('making bid');
          var result = this.currentState().makeBid(bid);
          this.pushState(result);
          this.trigger(this.currentState());
        },
        onPlayCard: function(card) {
          var result = this.currentState().playCard(card);
          this.pushState(result);
          this.trigger(this.currentState());
        },
        onBack: function() {
          if (this.currentStateIdx > 0)
            this.currentStateIdx--;
          this.trigger(this.currentState());
        },
        onForward: function() {
          if (this.currentStateIdx < this.states.length - 1)
            this.currentStateIdx++;
          this.trigger(this.currentState());
        }
      }));
      GameActions.makeBid.shouldEmit = function(bid) {
        var err = validateBid(bid, GameStore.currentState());
        if (err) {
          NotificationActions.error({
            title: "Invalid bid",
            message: err.message
          });
        }
        return !err;
      };
      GameActions.playCard.shouldEmit = function(card) {
        var err = validateCard(card, GameStore.currentState());
        if (err) {
          NotificationActions.error({
            title: "Invalid card",
            message: err.message
          });
        }
        return !err;
      };
    }
  };
});

System.register("src/stores/player-store", ["npm:reflux@0.2.7", "src/model/core/seat", "src/stores/game-store", "src/model/strategy/cardplay/cardplay-strategy", "src/model/strategy/bidding/bidding-strategy"], function($__export) {
  "use strict";
  var __moduleName = "src/stores/player-store";
  var Reflux,
      Seat,
      GameStore,
      GameActions,
      CardplayStrategy,
      BiddingStrategy,
      PlayerActions,
      STORAGE_KEY,
      PlayerStore;
  return {
    setters: [function($__m) {
      Reflux = $__m.default;
    }, function($__m) {
      Seat = $__m.Seat;
    }, function($__m) {
      GameStore = $__m.GameStore;
      GameActions = $__m.GameActions;
    }, function($__m) {
      CardplayStrategy = $__m.CardplayStrategy;
    }, function($__m) {
      BiddingStrategy = $__m.BiddingStrategy;
    }],
    execute: function() {
      PlayerActions = $__export("PlayerActions", Reflux.createActions(["updatePlayer"]));
      STORAGE_KEY = 'players';
      PlayerStore = $__export("PlayerStore", Reflux.createStore({
        init: function() {
          var $__0 = this;
          this.listenToMany(PlayerActions);
          var playersStr = localStorage.getItem(STORAGE_KEY);
          if (playersStr)
            this.players = JSON.parse(playersStr);
          else {
            this.players = {};
            Seat.all().forEach((function(seat) {
              $__0.players[seat] = {
                seat: seat,
                name: Seat.name(seat),
                ishuman: (seat == Seat.South)
              };
            }));
          }
          this.cardplayStrategy = new CardplayStrategy();
          this.biddingStrategy = new BiddingStrategy();
          this.unsubscribeGame = this.listenTo(GameStore, (function(game) {
            return $__0.onGameTurn(game);
          }), (function(game) {
            return $__0.onGameTurn(game);
          }));
        },
        onUpdatePlayer: function(seat, delta) {
          var $__0 = this;
          console.log('updating player');
          Object.keys(delta).forEach((function(key) {
            $__0.players[seat][key] = delta[key];
          }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.players));
          this.trigger(this.players);
        },
        onGameTurn: function(game) {
          console.log('onGameTurn');
          if (!game.nextPlayer)
            return ;
          if (!this.players[game.nextPlayer].ishuman) {
            if (game.biddingHasEnded) {
              var card = this.cardplayStrategy.getCard(game);
              setTimeout((function() {
                GameActions.playCard(card, game);
              }), 800);
            } else {
              var bid = this.biddingStrategy.getBid(game);
              setTimeout((function() {
                GameActions.makeBid(bid, game);
              }), 800);
            }
          }
        }
      }));
    }
  };
});

System.register("src/ui/table/table.jsx!github:floatdrop/plugin-jsx@0.1.1", ["npm:react@0.13.2", "npm:reflux@0.2.7", "src/stores/player-store", "src/stores/game-store", "src/model/game/game-state", "src/model/core/seat", "src/ui/table/hand.jsx!github:floatdrop/plugin-jsx@0.1.1", "src/ui/table/bidding-box.jsx!github:floatdrop/plugin-jsx@0.1.1", "src/ui/table/bidding-history.jsx!github:floatdrop/plugin-jsx@0.1.1", "src/ui/table/trick.jsx!github:floatdrop/plugin-jsx@0.1.1"], function($__export) {
  "use strict";
  var __moduleName = "src/ui/table/table.jsx!github:floatdrop/plugin-jsx@0.1.1";
  var React,
      Reflux,
      PlayerStore,
      GameStore,
      GameActions,
      GameState,
      Seat,
      HandComponent,
      BiddingBox,
      BiddingHistory,
      TrickComponent,
      Table;
  return {
    setters: [function($__m) {
      React = $__m.default;
    }, function($__m) {
      Reflux = $__m.default;
    }, function($__m) {
      PlayerStore = $__m.PlayerStore;
    }, function($__m) {
      GameStore = $__m.GameStore;
      GameActions = $__m.GameActions;
    }, function($__m) {
      GameState = $__m.GameState;
    }, function($__m) {
      Seat = $__m.Seat;
    }, function($__m) {
      HandComponent = $__m.HandComponent;
    }, function($__m) {
      BiddingBox = $__m.BiddingBox;
    }, function($__m) {
      BiddingHistory = $__m.BiddingHistory;
    }, function($__m) {
      TrickComponent = $__m.TrickComponent;
    }],
    execute: function() {
      Table = $__export("Table", (function($__super) {
        var Table = function Table(props) {
          $traceurRuntime.superConstructor(Table).call(this, props);
          this.players = PlayerStore.players;
          this.game = GameStore.currentState();
        };
        return ($traceurRuntime.createClass)(Table, {
          componentDidMount: function() {
            var $__0 = this;
            this.unsubscribePlayers = PlayerStore.listen((function(players) {
              $__0.players = players;
              $__0.forceUpdate();
            }));
            this.unsubscribeGame = GameStore.listen((function(state) {
              $__0.game = state;
              $__0.forceUpdate();
            }));
          },
          componentWillUnmount: function() {
            this.unsubscribePlayers();
            this.unsubscribeGame();
          },
          render: function() {
            var $__0 = this;
            console.log('rendering table');
            var players = Seat.all().map((function(seat) {
              return (React.createElement("section", {
                className: "table-edge-" + Seat.name(seat),
                key: seat
              }, React.createElement("header", {className: "table-player-name"}, $__0.players[seat].name), React.createElement("div", {className: "table-hand-" + Seat.name(seat)}, React.createElement(HandComponent, {
                seat: seat,
                game: $__0.game
              }))));
            }));
            var board = this.game.biddingHasEnded ? React.createElement(TrickComponent, {game: this.game}) : React.createElement(BiddingHistory, {board: this.game.currentBoard});
            var biddingBox = this.game.biddingHasEnded ? undefined : React.createElement(BiddingBox, {
              className: "table-bidding-box",
              game: this.game
            });
            return (React.createElement("div", {className: "bridge-table"}, React.createElement("div", {className: "table-players"}, players), React.createElement("div", {className: "table-board"}, board), React.createElement("div", {className: "table-bidding-box"}, biddingBox)));
          }
        }, {}, $__super);
      }(React.Component)));
    }
  };
});

System.register("src/ui/app.jsx!github:floatdrop/plugin-jsx@0.1.1", ["npm:react@0.13.2", "npm:react-router@0.13.2", "src/ui/table/table.jsx!github:floatdrop/plugin-jsx@0.1.1", "src/ui/about/about.jsx!github:floatdrop/plugin-jsx@0.1.1", "src/ui/settings/settings.jsx!github:floatdrop/plugin-jsx@0.1.1", "src/ui/growl/growl.jsx!github:floatdrop/plugin-jsx@0.1.1", "github:necolas/normalize.css@3.0.3", "npm:purecss@0.6.0/build/pure.css!github:systemjs/plugin-css@0.1.9!github:systemjs/plugin-css@0.1.9", "npm:font-awesome@4.3.0/css/font-awesome.css!github:systemjs/plugin-css@0.1.9!github:systemjs/plugin-css@0.1.9", "src/ui/app.css!github:systemjs/plugin-css@0.1.9"], function($__export) {
  "use strict";
  var __moduleName = "src/ui/app.jsx!github:floatdrop/plugin-jsx@0.1.1";
  var React,
      Router,
      Route,
      DefaultRoute,
      Redirect,
      RouteHandler,
      Link,
      Table,
      AboutView,
      SettingsView,
      GrowlContainer,
      a,
      b,
      c,
      d,
      App,
      routes;
  return {
    setters: [function($__m) {
      React = $__m.default;
    }, function($__m) {
      Router = $__m.default;
    }, function($__m) {
      Table = $__m.Table;
    }, function($__m) {
      AboutView = $__m.AboutView;
    }, function($__m) {
      SettingsView = $__m.SettingsView;
    }, function($__m) {
      GrowlContainer = $__m.GrowlContainer;
    }, function($__m) {
      a = $__m.default;
    }, function($__m) {
      b = $__m.default;
    }, function($__m) {
      c = $__m.default;
    }, function($__m) {
      d = $__m.default;
    }],
    execute: function() {
      var $__1;
      (($__1 = Router, Route = $__1.Route, DefaultRoute = $__1.DefaultRoute, Redirect = $__1.Redirect, RouteHandler = $__1.RouteHandler, Link = $__1.Link, $__1));
      App = $__export("App", (function($__super) {
        var App = function App(props) {
          $traceurRuntime.superConstructor(App).call(this, props);
          this.state = {route: "table"};
        };
        return ($traceurRuntime.createClass)(App, {
          routeClicked: function(route) {
            this.setState({"route": route});
            return false;
          },
          render: function() {
            console.log('rendering app');
            var routes = ["table", "settings", "about"].map((function(route) {
              return (React.createElement("li", {key: route}, React.createElement(Link, {to: route}, route)));
            }));
            return (React.createElement("div", {className: "app-container"}, React.createElement("nav", {
              role: "navigation",
              className: "app-navbar nav-main"
            }, React.createElement("ul", {className: "nav-site"}, routes)), React.createElement("div", {className: "app-content"}, React.createElement(RouteHandler, null)), React.createElement("div", {className: "app-growl"}, React.createElement(GrowlContainer, null))));
          }
        }, {}, $__super);
      }(React.Component)));
      routes = (React.createElement(Route, {
        handler: App,
        path: "/tower/"
      }, React.createElement(DefaultRoute, {
        name: "table",
        handler: Table
      }), React.createElement(Route, {
        name: "about",
        handler: AboutView
      }), React.createElement(Route, {
        name: "settings",
        handler: SettingsView
      }), React.createElement(Redirect, {
        from: "/",
        to: "/tower/"
      })));
      Router.run(routes, Router.HistoryLocation, function(Handler) {
        React.render(React.createElement(Handler, null), document.body);
      });
    }
  };
});

System.register('github:necolas/normalize.css@3.0.3/normalize.css!github:systemjs/plugin-css@0.1.9!github:systemjs/plugin-css@0.1.9', [], false, function() {});
System.register('npm:purecss@0.6.0/build/pure.css!github:systemjs/plugin-css@0.1.9!github:systemjs/plugin-css@0.1.9', [], false, function() {});
System.register('npm:font-awesome@4.3.0/css/font-awesome.css!github:systemjs/plugin-css@0.1.9!github:systemjs/plugin-css@0.1.9', [], false, function() {});
System.register('src/ui/app.css!github:systemjs/plugin-css@0.1.9', [], false, function() {});
});