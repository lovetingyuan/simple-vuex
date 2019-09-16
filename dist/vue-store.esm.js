/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */

function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

var Vue;
function setFunction(target, name, func) {
    if (func.name !== name) {
        Object.defineProperty(func, 'name', { value: name });
    }
    target[name] = func;
}
function onError(msg) {
    throw new Error('[vue-store] error: ' + msg);
}
function onWarn(msg) {
    console.warn('[vue-store] warn: ' + msg);
}
function isCapital(val) {
    if (!val)
        return false;
    return /[A-Z]/.test(val[0]);
}
function isObject(val) {
    return ({}).toString.apply(val) === '[object Object]' && Object(val) === val;
}
function normalizeModule(userModule, routes, target) {
    if (routes === void 0) { routes = []; }
    if (typeof userModule === 'function') {
        userModule = userModule();
    }
    var normalized = {
        state: {}, getters: {}, mutations: {}, actions: {}, subModules: {}, routes: __spreadArrays(routes)
    };
    Object.keys(userModule).forEach(function (name) {
        if (isCapital(name)) {
            if (userModule[name]) {
                normalized.subModules[name] = normalizeModule(userModule[name], routes.concat(name), target ? target[name] : null);
            }
        }
        else {
            var getter = Object.getOwnPropertyDescriptor(userModule, name).get;
            if (typeof getter === 'function') {
                normalized.getters[name] = getter;
            }
            else if (typeof userModule[name] === 'function') {
                normalized[name[0] === '$' ? 'actions' : 'mutations'][name] = userModule[name];
            }
            else {
                if (target) {
                    normalized.state[name] = target[name];
                }
                else {
                    normalized.state[name] = userModule[name];
                }
            }
        }
    });
    return normalized;
}
var STORE_META = '__VUE_STORE_META__';
function createVueStore(modules, options) {
    if (!Vue) {
        onError('Please install vue-store plugin first.');
    }
    var isCommitting = false;
    var isReplacing = false;
    var subscribeName = '';
    var _vm = new Vue();
    var strict = options ? options.strict : false;
    var base = {
        addModule: function (path, userModule, options) {
            if (process.env.NODE_ENV !== 'production') {
                if (typeof path !== 'string' ||
                    !path.split('.').length ||
                    !userModule ||
                    !isObject(userModule)) {
                    onError('Invalid parameters for "store.addModule".');
                }
                var routes_1 = path.split('.');
                var target_1 = store;
                routes_1.forEach(function (r, i) {
                    if (!isCapital(r)) {
                        onError("module name must start with capital letter, but received \"" + r + "\"");
                    }
                    if (i !== routes_1.length - 1) {
                        target_1 = target_1[r];
                        if (!target_1 || !target_1.__vue__) {
                            onError("module \"" + r + "\" does not exist, please add it first.");
                        }
                    }
                    else {
                        if (target_1[r] && target_1[r].__vue__) {
                            onWarn("module \"" + path + "\" has been added, please do not repeat to add it.");
                        }
                    }
                });
            }
            var routes = path.split('.');
            options = options || {
                preserveState: true
            };
            var moduleName = routes.pop();
            var target = store;
            routes.forEach(function (r) { target = target[r]; });
            if (target[moduleName] && target[moduleName].__vue__) {
                return target[moduleName];
            }
            var normalizedModule = normalizeModule(userModule);
            if (target[moduleName] && (options.preserveState || !('preserveState' in options))) {
                var vueIns = target[moduleName].__vue__;
                normalizedModule.state = Object.assign({}, vueIns ? vueIns[STORE_META].state : target[moduleName]);
            }
            target[moduleName] = _createVueStore(normalizedModule);
            target[moduleName].__vue__[STORE_META].dynamic = true;
            target.__vue__[STORE_META].state[moduleName] = target[moduleName].__vue__[STORE_META].state;
            target.__vue__[STORE_META].stateGetters[moduleName] = target[moduleName].__vue__[STORE_META].stateGetters;
            return target[moduleName];
        },
        removeModule: function (path) {
            if (process.env.NODE_ENV !== 'production') {
                if (typeof path !== 'string' ||
                    !path.split('.').length) {
                    onError('Invalid parameters for "store.removeModule".');
                }
                var routes_2 = path.split('.');
                var target_2 = store;
                routes_2.forEach(function (r, i) {
                    if (!isCapital(r)) {
                        onError("Module name \"" + r + "\" must start with capital letter.");
                    }
                    target_2 = target_2[r];
                    if (!target_2 || !target_2.__vue__) {
                        onError("Namespaced module \"" + r + "\" does not exist.");
                    }
                    if (i === routes_2.length - 1 && !target_2.__vue__[STORE_META].dynamic) {
                        onError("Namespaced module \"" + path + "\" can not be removed as it is not dynamic module.");
                    }
                });
            }
            var routes = path.split('.');
            var moduleName = routes.pop();
            var target = store;
            routes.forEach(function (r) { target = target[r]; });
            var vueIns = target[moduleName].__vue__;
            vueIns.$destroy();
            delete target[moduleName];
            delete target.__vue__[STORE_META].state[moduleName];
            delete target.__vue__[STORE_META].stateGetters[moduleName];
        },
        subscribe: function (listener) {
            if (process.env.NODE_ENV !== 'production') {
                if (typeof listener !== 'function') {
                    onError('listener callback passed to "store.subscribe" must be a function.');
                }
            }
            subscribeName = subscribeName || 'vuestore-mutation-action-subscribe-event';
            var _listener = function (data, state) { listener(data, state); };
            _vm.$on(subscribeName, _listener);
            return function () { _vm.$off(subscribeName, _listener); };
        },
        replaceState: function (state, target, routes) {
            var _this = this;
            target = target || store;
            Object.keys(state).forEach(function (name) {
                if (isCapital(name)) {
                    var newRoutes = (routes || []).concat(name);
                    if (target[name] && target[name].__vue__) {
                        _this.replaceState(state[name], target[name], newRoutes);
                    }
                    else {
                        Object.assign(target[name] || {}, state[name]);
                    }
                }
                else {
                    isReplacing = true;
                    target.__vue__[name] = state[name];
                    isReplacing = false;
                }
            });
        },
        watch: function (fn, cb, option) {
            if (process.env.NODE_ENV !== 'production') {
                if (typeof fn !== 'function' || typeof cb !== 'function') {
                    onError('Invalid parameters passed to "store.watch".');
                }
            }
            return _vm.$watch(fn, cb, option);
        },
        getState: function () {
            if (process.env.NODE_ENV === 'production') {
                onWarn('Only call getState in development mode.');
            }
            return JSON.parse(JSON.stringify(store.__vue__[STORE_META].state));
        },
        hotUpdate: function (path, hotModule) {
            if (process.env.NODE_ENV !== 'production') {
                if ((typeof path === 'string' && !isObject(hotModule)) ||
                    !isObject(path)) {
                    onError('Invalid parameters passed to "store.hotUpdate".');
                }
                var routes_3 = path.split('.');
                var target_3 = store;
                routes_3.forEach(function (route) {
                    if (!isCapital(route)) {
                        onError("Module name \"" + route + "\" must start with capital letter.");
                    }
                    if (!target_3[route]) {
                        onError("module " + path + " do not exists.");
                    }
                    target_3 = target_3[route];
                });
            }
            if (typeof path !== 'string') {
                hotModule = path;
                path = '';
            }
            var target = store;
            var routes = [];
            if (path) {
                routes = path.split('.');
                routes.forEach(function (route) {
                    target = target[route];
                });
            }
            var normalizedModule = normalizeModule(hotModule, routes);
            target.__vue__[STORE_META].getters = normalizedModule.getters;
            target.__vue__[STORE_META].mutations = normalizedModule.mutations;
            target.__vue__[STORE_META].actions = normalizedModule.actions;
        }
    };
    function _createVueStore(normalizedModule) {
        var data = normalizedModule.state, getters = normalizedModule.getters, mutations = normalizedModule.mutations, actions = normalizedModule.actions, subModules = normalizedModule.subModules, routes = normalizedModule.routes;
        var vueStore = routes.length ? {} : Object.create(base);
        var state = {};
        var stateGetters = Object.create(state);
        var vueOptions = {
            data: {},
            computed: {},
            methods: {}
        };
        Object.keys(data).forEach(function (name) {
            vueOptions.data[name] = data[name];
            var descriptor = {
                get: function () {
                    return vueStore.__vue__[name];
                },
                set: function (val) {
                    vueStore.__vue__[name] = val;
                },
                enumerable: true
            };
            Object.defineProperty(vueStore, name, descriptor);
            Object.defineProperty(state, name, descriptor);
        });
        Object.keys(getters).forEach(function (name) {
            vueOptions.computed[name] = function () {
                return vueStore.__vue__[STORE_META].getters[name].call(stateGetters);
            };
            var descriptor = {
                get: function () {
                    return vueStore.__vue__[name];
                },
                enumerable: true
            };
            Object.defineProperty(vueStore, name, descriptor);
            Object.defineProperty(stateGetters, name, descriptor);
        });
        Object.keys(mutations).forEach(function (name) {
            vueOptions.methods[name] = function (payload) {
                vueStore.__vue__[STORE_META].mutations[name].call(state, payload);
            };
            setFunction(vueStore, name, function (payload) {
                isCommitting = true;
                vueStore.__vue__[name](payload);
                isCommitting = false;
                subscribeName && _vm.$emit(subscribeName, {
                    type: routes.join('.'),
                    payload: payload
                }, state);
            });
        });
        Object.keys(actions).forEach(function (name) {
            vueOptions.methods[name] = function (payload) {
                return vueStore.__vue__[STORE_META].actions[name].call(vueStore, payload);
            };
            setFunction(vueStore, name, function (payload) {
                var promise = vueStore.__vue__[name](payload);
                return Promise.resolve(promise).then(function (res) {
                    subscribeName && _vm.$emit(subscribeName, {
                        actionType: routes.join('.'),
                        payload: payload
                    }, state);
                    return res;
                });
            });
        });
        Object.keys(subModules).forEach(function (name) {
            vueStore[name] = _createVueStore(subModules[name]);
            state[name] = vueStore[name].__vue__[STORE_META].state;
            stateGetters[name] = vueStore[name].__vue__[STORE_META].stateGetters;
        });
        Object.defineProperty(vueStore, '__vue__', { value: new Vue(vueOptions) });
        Object.defineProperty(vueStore.__vue__, STORE_META, {
            value: {
                state: state, stateGetters: stateGetters, getters: getters, mutations: mutations, actions: actions
            }
        });
        if (strict) {
            vueStore.__vue__.$watch(function () { return state; }, function () {
                if (!isCommitting && !isReplacing) {
                    try {
                        onError('Only mutation(pure function) could change store.');
                    }
                    catch (err) {
                        // prevent vue to show error
                        setTimeout(function () { throw err; }, 0);
                    }
                }
            }, { deep: true, sync: true });
        }
        return vueStore;
    }
    if (process.env.NODE_ENV === 'production') {
        if (strict) {
            onWarn('Only use strict option in development mode.');
        }
    }
    else {
        if (!isObject(modules)) {
            onError('modules must be plain object.');
        }
    }
    var normalizedModule = normalizeModule(modules);
    var store = _createVueStore(normalizedModule);
    if (options && Array.isArray(options.plugins)) {
        options.plugins.forEach(function (plugin) {
            if (typeof plugin === 'function') {
                plugin(store);
            }
            else if (process.env.NODE_ENV !== 'production') {
                onError("vue store plugin " + plugin + " must be function.");
            }
        });
    }
    return store;
}
var vueStore = {
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

export default vueStore;
