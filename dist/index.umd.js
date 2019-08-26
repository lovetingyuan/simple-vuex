(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
typeof define === 'function' && define.amd ? define(factory) :
(global = global || self, global.VueStorePlugin = factory());
}(this, function () { 'use strict';

var Vue;
function setFunction(target, name, func) {
    if (func.name !== name) {
        Object.defineProperty(func, 'name', { value: name });
    }
    target[name] = func;
}
function onError(msg) {
    throw new Error('vue-store error: ' + msg);
}
function onWarn(msg) {
    console.warn('vue-store warn: ' + msg);
}
function createVueStore(modules, options) {
    if (!Vue) {
        onError('Please install VueStorePlugin first.');
    }
    var isCommitting = false;
    var isReplacing = false;
    var subscribeName = '';
    var _vm = new Vue();
    var strict = options ? options.strict : false;
    var base = {
        addModule: function (path, _module, options) {
            var routes = path.split('.');
            options = options || {
                preserveState: true
            };
            var moduleName = routes.pop();
            var vueStore = store;
            routes.forEach(function (r) { vueStore = vueStore[r]; });
            var _state = {};
            if (vueStore[moduleName] && (options.preserveState || !('preserveState' in options))) {
                Object.assign(_state, vueStore[moduleName].__state__);
            }
            if (vueStore[moduleName] && vueStore[moduleName].__vue__) {
                onWarn(path + " has been added, do not repeat to add it.");
                return vueStore[moduleName];
            }
            vueStore[moduleName] = _createStore(_module, routes.concat(moduleName), _state);
            vueStore.__state__[moduleName] = vueStore[moduleName].__state__;
            return vueStore[moduleName];
        },
        removeModule: function (path) {
            var routes = path.split('.');
            var moduleName = routes.pop();
            var vueStore = store;
            routes.forEach(function (r) { vueStore = vueStore[r]; });
            try {
                var vueIns = vueStore[moduleName].__vue__;
                delete vueStore.__state__[moduleName];
                delete vueStore[moduleName];
                vueIns.$destroy();
            }
            catch (_a) {
                onError(path + " can not be removed as it is not dynamic module.");
            }
        },
        subscribe: function (listener) {
            subscribeName = subscribeName || 'vuestore-mutation-action-subscribe-event';
            var _listener = function (data, state) { listener(data, state); };
            _vm.$on(subscribeName, _listener);
            return function () { _vm.$off(subscribeName, _listener); };
        },
        replaceState: function (state, vueStore) {
            var _this = this;
            vueStore = vueStore || store;
            Object.keys(state).forEach(function (key) {
                if (/[A-Z]/.test(key[0])) {
                    if (vueStore[key]) {
                        _this.replaceState(state[key], vueStore[key]);
                    }
                    else {
                        vueStore[key] = {
                            __state__: state[key]
                        };
                        vueStore.__state__[key] = state[key];
                    }
                }
                else {
                    isReplacing = true;
                    vueStore.__vue__[key] = state[key];
                    isReplacing = false;
                }
            });
        },
        watch: function (fn, cb, option) {
            return _vm.$watch(fn, cb, option);
        },
        getState: function () {
            return JSON.parse(JSON.stringify(store.__state__));
        },
        hotUpdate: function (path, _module) {
            var _this = this;
            var newModule = typeof path === 'string' ? _module : path;
            var routesPath = typeof path === 'string' ? path : '';
            var routes = routesPath.split('.');
            var vueStore = store;
            routes.forEach(function (r) { vueStore = vueStore[r]; });
            Object.keys(vueStore.__getters__).forEach(function (name) {
                delete vueStore.__getters__[name];
            });
            Object.keys(vueStore.__methods__).forEach(function (name) {
                delete vueStore.__methods__[name];
            });
            Object.keys(newModule).forEach(function (key) {
                if (/[A-Z]/.test(key[0])) {
                    _this.hotUpdate(routesPath + '.' + key, newModule[key]);
                }
                else {
                    var getter = Object.getOwnPropertyDescriptor(newModule, key).get;
                    if (typeof getter === 'function') {
                        vueStore.__getters__[key] = getter;
                    }
                    else if (typeof newModule[key] === 'function') {
                        vueStore.__methods__[key] = newModule[key];
                    }
                }
            });
        }
    };
    function _createStore(UserModule, routes, preservedState) {
        if (routes === void 0) { routes = []; }
        if (typeof UserModule === 'function') {
            UserModule = UserModule();
        }
        var Methods = {}; // for hotUpdate, store functions
        var Getters = {};
        var state = {};
        var stateGetters = {};
        var vueStore = routes.length ? {} : Object.create(base);
        var vueOption = {};
        var routesPath = routes.join('/');
        Object.keys(UserModule).forEach(function (key) {
            if (/[A-Z]/.test(key[0])) {
                if (!UserModule[key])
                    return;
                var _store = _createStore(UserModule[key], routes.concat(key));
                Object.defineProperty(vueStore, key, {
                    value: _store,
                    enumerable: true,
                    configurable: false // prevent to be deleted
                });
                state[key] = _store.__state__;
                stateGetters[key] = _store.__stateGetters__;
            }
            else {
                var getter = Object.getOwnPropertyDescriptor(UserModule, key).get;
                if (typeof getter === 'function') {
                    Getters[key] = getter;
                    vueOption.computed = vueOption.computed || {};
                    // eslint-disable-next-line
                    setFunction(vueOption.computed, key, function () {
                        return Getters[key].call(stateGetters);
                    });
                    var descriptor = {
                        get: function () { return vueStore.__vue__[key]; },
                        enumerable: true
                    };
                    Object.defineProperty(stateGetters, key, descriptor);
                    Object.defineProperty(vueStore, key, descriptor);
                }
                else if (typeof UserModule[key] === 'function') {
                    Methods[key] = UserModule[key];
                    setFunction(vueStore, key, key[0] === '$' ? function (payload) {
                        if (subscribeName) {
                            _vm.$emit(subscribeName, {
                                actionType: routesPath ? routesPath + "/" + key : key,
                                payload: payload
                            }, state);
                        }
                        return Methods[key].call(vueStore, payload);
                    } : function (payload) {
                        if (subscribeName) {
                            _vm.$emit(subscribeName, {
                                type: routesPath ? routesPath + "/" + key : key,
                                payload: payload
                            }, state);
                        }
                        isCommitting = true;
                        Methods[key].call(state, payload);
                        isCommitting = false;
                    });
                }
                else {
                    var data = (vueOption.data = vueOption.data || {});
                    data[key] = (preservedState && (key in preservedState)) ? preservedState[key] : UserModule[key];
                    var descriptor = {
                        get: function () { return vueStore.__vue__[key]; },
                        set: function (val) {
                            vueStore.__vue__[key] = val;
                        },
                        enumerable: true
                    };
                    Object.defineProperty(state, key, descriptor);
                    Object.defineProperty(stateGetters, key, descriptor);
                    Object.defineProperty(vueStore, key, descriptor);
                }
            }
        });
        Object.defineProperties(vueStore, {
            __vue__: { value: new Vue(vueOption) },
            __methods__: { value: Methods },
            __getters__: { value: Getters },
            __state__: { value: state },
            __stateGetters__: { value: stateGetters }
            // __path__: { value: routesPath },
            // __module__: { value: UserModule }
        });
        if (strict) {
            vueStore.__vue__.$watch(function () { return state; }, function () {
                if (!isCommitting && !isReplacing) {
                    setTimeout(function () {
                        onError('Only mutation could change state.');
                    });
                }
            }, { deep: true, sync: true });
        }
        return vueStore;
    }
    var store = _createStore(modules);
    if (options && Array.isArray(options.plugins)) {
        options.plugins.forEach(function (plugin) {
            typeof plugin === 'function' && plugin(store);
        });
    }
    return store;
}
var VueStorePlugin = {
    install: function (vue) {
        if (Vue && Vue === vue) {
            onWarn('Do not install the plugin again.');
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

return VueStorePlugin;

}));
