var Vue;
var prefix = 'vuestore: ';
function setFunction(target, name, func) {
    var _a;
    target[name] = (_a = {},
        _a[name] = func,
        _a)[name];
}
function createVueStore(modules, option) {
    if (!Vue) {
        throw new Error(prefix + 'Please install VueStorePlugin first.');
    }
    var isCommitting = false;
    var isReplacing = false;
    var subscribeName = '';
    var eventBus = new Vue();
    var base = {
        addModule: function (path, _module) {
            var routes = path.split('.');
            var moduleName = routes.pop();
            var parentModule = store;
            routes.forEach(function (r) {
                parentModule = parentModule[r];
            });
            Object.defineProperty(parentModule, moduleName, {
                value: _createStore(_module, routes.concat(moduleName))[0],
                enumerable: true,
                configurable: true // allow to delete dynamic module
            });
            return parentModule[moduleName];
        },
        removeModule: function (path) {
            var routes = path.split('.');
            var moduleName = routes.pop();
            var parentModule = store;
            routes.forEach(function (r) {
                parentModule = parentModule[r];
            });
            try {
                var vueIns = parentModule[moduleName].__vue__;
                delete parentModule[moduleName];
                vueIns.$destroy();
            }
            catch (_a) {
                throw new Error(prefix + ("Only dynamic module can be removed while " + path + " is an initial module."));
            }
        },
        subscribe: function (listener) {
            if (!subscribeName) {
                subscribeName = 'vuestore-mutation-action-subscribe-event';
            }
            var _listener = function (data, state) { listener(data, state); };
            eventBus.$on(subscribeName, _listener);
            return function () { eventBus.$off(subscribeName, _listener); };
        },
        replaceState: function (state, _store) {
            if (_store === void 0) { _store = store; }
            isReplacing = true;
            var vueInstance = _store.__vue__;
            Object.keys(state).forEach(function (key) {
                if (/[A-Z]/.test(key[0])) {
                    var replaceState = base.replaceState;
                    if (_store[key]) {
                        replaceState(state[key], _store[key]);
                    }
                    else {
                        throw new Error(prefix + ("Namespace sub module " + key + " does not exist"));
                    }
                }
                else { // avoid to trigger getter
                    var getter = Object.getOwnPropertyDescriptor(state, key).get;
                    if (typeof getter !== 'function' && typeof state[key] !== 'function') {
                        vueInstance.$set(vueInstance, key, state[key]);
                    }
                }
            });
            isReplacing = false;
        },
        watch: function (fn, cb, option) {
            var getter = fn.bind(stateGetters);
            return eventBus.$watch(getter, cb, option);
        },
        getState: function () {
            if (process.env.NODE_ENV === 'production') {
                console.warn(prefix + 'Only use getState in development mode.');
            }
            return JSON.parse(JSON.stringify(state));
        },
        hotUpdate: function (path, _module) {
            var newModule = typeof path === 'string' ? _module : path;
            var routesPath = typeof path === 'string' ? path : '';
            var routes = routesPath.split('/');
            var Module = store;
            routes.forEach(function (r) {
                Module = Module[r];
            });
            Object.keys(Module.__module__).forEach(function (k) {
                if (typeof Module.__module__[k] === 'function') {
                    delete Module.__module__[k];
                }
            });
            Object.keys(newModule).forEach(function (key) {
                if (/[A-Z]/.test(key[0])) {
                    var hotUpdate = base.hotUpdate;
                    hotUpdate(routesPath + '/' + key, newModule[key]);
                }
                else {
                    var getter = Object.getOwnPropertyDescriptor(newModule, key).get;
                    if (typeof getter === 'function') {
                        Module.__module__[key] = getter;
                    }
                    else if (typeof newModule[key] === 'function') {
                        Module.__module__[key] = newModule[key];
                    }
                }
            });
        }
    };
    function _createStore(Modules, routes) {
        if (routes === void 0) { routes = []; }
        if (typeof Modules === 'function') {
            Modules = Modules();
        }
        var ModulesCopy = {}; // for hotUpdate, store functions
        var Module = routes.length ? {} : Object.create(base);
        var state = {};
        var stateGetters = {};
        var vueOption = {};
        var routesPath = routes.join('/');
        Object.keys(Modules).forEach(function (key) {
            if (/[A-Z]/.test(key[0])) {
                if (!Modules[key])
                    return;
                var _a = _createStore(Modules[key], routes.concat(key)), _Module = _a[0], _state = _a[1], _stateGetters = _a[2];
                Object.defineProperty(Module, key, {
                    value: _Module,
                    enumerable: true,
                    configurable: false
                });
                state[key] = _state;
                stateGetters[key] = _stateGetters;
            }
            else {
                var getter = Object.getOwnPropertyDescriptor(Modules, key).get;
                if (typeof getter === 'function') {
                    ModulesCopy[key] = getter;
                    vueOption.computed = vueOption.computed || {};
                    vueOption.computed[key] = function () {
                        return ModulesCopy[key].call(stateGetters);
                    };
                    var descriptor = {
                        get: function () { return vueIns[key]; },
                        enumerable: true
                    };
                    Object.defineProperty(stateGetters, key, descriptor);
                    Object.defineProperty(Module, key, descriptor);
                }
                else if (typeof Modules[key] === 'function') {
                    ModulesCopy[key] = Modules[key];
                    setFunction(Module, key, key[0] === '$' ? function (payload) {
                        if (subscribeName) {
                            eventBus.$emit(subscribeName, {
                                actionType: routesPath ? routesPath + "/" + key : key,
                                payload: payload
                            }, state);
                        }
                        return ModulesCopy[key].call(Module, payload);
                    } : function (payload) {
                        isCommitting = true;
                        if (subscribeName) {
                            eventBus.$emit(subscribeName, {
                                type: routesPath ? routesPath + "/" + key : key,
                                payload: payload
                            }, state);
                        }
                        ModulesCopy[key].call(state, payload);
                        isCommitting = false;
                    });
                }
                else {
                    var data = vueOption.data = vueOption.data || {};
                    data[key] = Modules[key];
                    var descriptor = {
                        get: function () { return vueIns[key]; },
                        set: function (val) {
                            vueIns[key] = val;
                        },
                        enumerable: true
                    };
                    Object.defineProperty(state, key, descriptor);
                    Object.defineProperty(stateGetters, key, descriptor);
                    Object.defineProperty(Module, key, descriptor);
                }
            }
        });
        var vueIns = new Vue(vueOption);
        Object.defineProperties(Module, {
            __vue__: { value: vueIns },
            __module__: { value: ModulesCopy }
        });
        return [Module, state, stateGetters];
    }
    var _a = _createStore(modules), _store = _a[0], state = _a[1], stateGetters = _a[2];
    var store = _store;
    if (option && option.strict) {
        if (process.env.NODE_ENV === 'production') {
            console.warn(prefix + 'Only use strict option in development mode!');
        }
        eventBus.$watch(function () { return state; }, function () {
            if (!isCommitting && !isReplacing) {
                setTimeout(function () {
                    throw new Error(prefix + 'Only mutation could change state!');
                });
            }
        }, { deep: true, sync: true });
    }
    if (option && Array.isArray(option.plugins)) {
        option.plugins.forEach(function (plugin) {
            typeof plugin === 'function' && plugin(store);
        });
    }
    return store;
}
var VueStorePlugin = {
    install: function (vue) {
        if (Vue && Vue === vue) {
            console.warn(prefix + 'Do not install the plugin again.');
        }
        Vue = vue;
        Vue.mixin({
            beforeCreate: function () {
                var options = this.$options;
                if (options.store) {
                    this.$store = options.store;
                }
                else if (options.parent && options.parent.$store) {
                    this.$store = options.parent.$store;
                }
            }
        });
    },
    createStore: createVueStore
};

export default VueStorePlugin;
