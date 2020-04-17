(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vuex')) :
typeof define === 'function' && define.amd ? define(['exports', 'vuex'], factory) :
(global = global || self, factory(global.VueStore = {}, global.Vuex));
}(this, (function (exports, Vuex) { 'use strict';

Vuex = Vuex && Object.prototype.hasOwnProperty.call(Vuex, 'default') ? Vuex['default'] : Vuex;

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

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var Vue;
function createVuexStore(modules, options) {
    var defaultStateGetter = function (state, key) { return state[key]; };
    var stateGetterMap = {};
    var getStateGetter = function (routes) {
        if (!routes.length)
            return defaultStateGetter;
        var router = routes.join('.');
        if (!stateGetterMap[router]) {
            // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
            stateGetterMap[router] = new Function('s', 'n', "return s." + router + "[n]");
        }
        return stateGetterMap[router];
    };
    function setState(vs, key, routes) {
        var stateGetter = getStateGetter(routes);
        Object.defineProperty(vs, key, {
            enumerable: true,
            configurable: true,
            get: function () {
                return stateGetter(store.state, key);
            },
            set: function () {
                throw new Error('[vue-store]: do not mutate vuex store state outside mutation handlers.');
            }
        });
    }
    function findParent(router) {
        var routes = router.split('.');
        var moduleName = routes.pop();
        var _vuestore = vueStore;
        routes.forEach(function (name, i) {
            if (!_vuestore[name]) {
                throw new Error("[vue-store]: nest module \"" + routes.slice(0, i).join('.') + "\" does not exist.");
            }
            _vuestore = _vuestore[name];
        });
        return [_vuestore, moduleName];
    }
    function normalizeModule(userModule, routes) {
        if (routes === void 0) { routes = []; }
        var vuexModule = {
            namespaced: true,
            state: {}
        };
        var um = { g: {}, m: {}, a: {} };
        var vueModule = {
            __um__: um
        };
        Object.keys(userModule).forEach(function (key) {
            var _a, _b, _c, _d;
            var getter = Object.getOwnPropertyDescriptor(userModule, key).get;
            var newRoutes = routes.concat(key).join('/');
            var firstCode = key.charCodeAt(0);
            if (firstCode >= 65 && firstCode <= 90) { // module
                if (!userModule[key] || typeof userModule[key] !== 'object')
                    return;
                var _e = normalizeModule(userModule[key], routes.concat(key)), nestVuexModule = _e[0], nestVueModule = _e[1];
                vuexModule.modules = (_a = vuexModule.modules) !== null && _a !== void 0 ? _a : {};
                vuexModule.modules[key] = nestVuexModule;
                vueModule[key] = nestVueModule;
            }
            else if (typeof getter === 'function') { // getter
                vuexModule.getters = (_b = vuexModule.getters) !== null && _b !== void 0 ? _b : {};
                um.g[key] = getter;
                vuexModule.getters[key] = function (state, getters, rootState, rootGetters) {
                    var getterState = Object.create(getters);
                    Object.keys(state).forEach(function (k) {
                        Object.defineProperty(getterState, k, {
                            get: function () {
                                return state[k];
                            },
                            enumerable: true,
                            configurable: true
                        });
                    });
                    return um.g[key].call(getterState);
                };
                var descriptor = {
                    configurable: true,
                    enumerable: true,
                    get: function () {
                        return store.getters[newRoutes];
                    }
                };
                Object.defineProperty(vueModule, key, descriptor);
            }
            else if (firstCode === 36) { // action
                // eslint-disable-next-line eqeqeq
                if (userModule[key] == undefined)
                    return;
                vuexModule.actions = (_c = vuexModule.actions) !== null && _c !== void 0 ? _c : {};
                um.a[key] = userModule[key];
                vuexModule.actions[key] = function (ctx, payload) {
                    return um.a[key].call(vueModule, payload);
                };
                // eslint-disable-next-line @typescript-eslint/promise-function-async
                vueModule[key] = function (payload) {
                    return __awaiter(this, void 0, void 0, function () {
                        var result;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, store.dispatch(newRoutes, payload)];
                                case 1:
                                    result = _a.sent();
                                    return [2 /*return*/, result];
                            }
                        });
                    });
                };
            }
            else if (typeof userModule[key] === 'function') { // mutation
                vuexModule.mutations = (_d = vuexModule.mutations) !== null && _d !== void 0 ? _d : {};
                um.m[key] = userModule[key];
                vuexModule.mutations[key] = function (state, payload) {
                    um.m[key].call(state, payload);
                };
                vueModule[key] = function (payload) {
                    store.commit(newRoutes, payload);
                };
            }
            else {
                vuexModule.state[key] = userModule[key];
                setState(vueModule, key, routes);
            }
        });
        return [vuexModule, vueModule];
    }
    var api = {
        addModule: function (router, userModule) {
            var _a = findParent(router), _store = _a[0], moduleName = _a[1];
            var routes = router.split('.');
            var _b = normalizeModule(userModule, routes), vuexOptions = _b[0], nestVueStore = _b[1];
            store.registerModule(routes, vuexOptions);
            _store[moduleName] = nestVueStore;
            Object.defineProperty(_store, moduleName, {
                value: nestVueStore,
                enumerable: true
            });
            return function () {
                store.unregisterModule(routes);
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete _store[moduleName];
            };
        },
        subscribe: function (sub, action) {
            if (action) {
                return store.subscribeAction(sub);
            }
            return store.subscribe(sub);
        },
        watch: function (fn, callback, options) {
            return store.watch(fn, callback, options);
        },
        getState: function (pure) {
            if (pure) {
                return JSON.parse(JSON.stringify(store.state));
            }
            return store.state;
        },
        replaceState: function (newState, vs, routes) {
            if (vs === void 0) { vs = vueStore; }
            if (routes === void 0) { routes = []; }
            if (!newState || typeof newState !== 'object')
                return;
            Object.keys(newState).forEach(function (key) {
                var _a;
                if (/[A-Z]/.test(key[0])) {
                    vs[key] = (_a = vs[key]) !== null && _a !== void 0 ? _a : {};
                    api.replaceState(newState[key], vs[key], routes.concat(key));
                }
                else {
                    setState(vs, key, routes);
                }
            });
            if (!routes.length) {
                store.replaceState(newState);
            }
        }
    };
    var _a = normalizeModule(modules), storeOptions = _a[0], vueStore = _a[1];
    Vue.use(Vuex);
    var store = new Vuex.Store(Object.assign(storeOptions, options));
    api.$store = store;
    Object.setPrototypeOf(vueStore, api);
    return vueStore;
}
var createStore = createVuexStore;
var vuestoreplugin = function (vue) {
    if (Vue && Vue === vue) {
        console.warn('[vue-store]: Do not install the plugin again.');
    }
    Vue = vue;
};

exports.createStore = createStore;
exports.default = vuestoreplugin;

Object.defineProperty(exports, '__esModule', { value: true });

})));
