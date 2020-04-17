import Vuex from 'vuex';

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

let Vue;
function createVuexStore(modules, options) {
    const defaultStateGetter = (state, key) => state[key];
    const stateGetterMap = {};
    const getStateGetter = (routes) => {
        if (!routes.length)
            return defaultStateGetter;
        const router = routes.join('.');
        if (!stateGetterMap[router]) {
            // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
            stateGetterMap[router] = new Function('s', 'n', `return s.${router}[n]`);
        }
        return stateGetterMap[router];
    };
    function setState(vs, key, routes) {
        const stateGetter = getStateGetter(routes);
        Object.defineProperty(vs, key, {
            enumerable: true,
            configurable: true,
            get() {
                return stateGetter(store.state, key);
            },
            set() {
                throw new Error('[vue-store]: do not mutate vuex store state outside mutation handlers.');
            }
        });
    }
    function findParent(router) {
        const routes = router.split('.');
        const moduleName = routes.pop();
        let _vuestore = vueStore;
        routes.forEach((name, i) => {
            if (!_vuestore[name]) {
                throw new Error(`[vue-store]: nest module "${routes.slice(0, i).join('.')}" does not exist.`);
            }
            _vuestore = _vuestore[name];
        });
        return [_vuestore, moduleName];
    }
    function normalizeModule(userModule, routes = []) {
        const vuexModule = {
            namespaced: true,
            state: {}
        };
        const um = { g: {}, m: {}, a: {} };
        const vueModule = {
            __um__: um
        };
        Object.keys(userModule).forEach(key => {
            var _a, _b, _c, _d;
            const getter = Object.getOwnPropertyDescriptor(userModule, key).get;
            const newRoutes = routes.concat(key).join('/');
            const firstCode = key.charCodeAt(0);
            if (firstCode >= 65 && firstCode <= 90) { // module
                if (!userModule[key] || typeof userModule[key] !== 'object')
                    return;
                const [nestVuexModule, nestVueModule] = normalizeModule(userModule[key], routes.concat(key));
                vuexModule.modules = (_a = vuexModule.modules) !== null && _a !== void 0 ? _a : {};
                vuexModule.modules[key] = nestVuexModule;
                vueModule[key] = nestVueModule;
            }
            else if (typeof getter === 'function') { // getter
                vuexModule.getters = (_b = vuexModule.getters) !== null && _b !== void 0 ? _b : {};
                um.g[key] = getter;
                vuexModule.getters[key] = function (state, getters, rootState, rootGetters) {
                    const getterState = Object.create(getters);
                    Object.keys(state).forEach(k => {
                        Object.defineProperty(getterState, k, {
                            get() {
                                return state[k];
                            },
                            enumerable: true,
                            configurable: true
                        });
                    });
                    return um.g[key].call(getterState);
                };
                const descriptor = {
                    configurable: true,
                    enumerable: true,
                    get() {
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
                    return __awaiter(this, void 0, void 0, function* () {
                        const result = yield store.dispatch(newRoutes, payload);
                        return result;
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
    const api = {
        addModule(router, userModule) {
            const [_store, moduleName] = findParent(router);
            const routes = router.split('.');
            const [vuexOptions, nestVueStore] = normalizeModule(userModule, routes);
            store.registerModule(routes, vuexOptions);
            _store[moduleName] = nestVueStore;
            Object.defineProperty(_store, moduleName, {
                value: nestVueStore,
                enumerable: true
            });
            return () => {
                store.unregisterModule(routes);
                // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                delete _store[moduleName];
            };
        },
        subscribe(sub, action) {
            if (action) {
                return store.subscribeAction(sub);
            }
            return store.subscribe(sub);
        },
        watch(fn, callback, options) {
            return store.watch(fn, callback, options);
        },
        getState(pure) {
            if (pure) {
                return JSON.parse(JSON.stringify(store.state));
            }
            return store.state;
        },
        replaceState(newState, vs = vueStore, routes = []) {
            if (!newState || typeof newState !== 'object')
                return;
            Object.keys(newState).forEach(key => {
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
    const [storeOptions, vueStore] = normalizeModule(modules);
    Vue.use(Vuex);
    const store = new Vuex.Store(Object.assign(storeOptions, options));
    api.$store = store;
    Object.setPrototypeOf(vueStore, api);
    return vueStore;
}
const createStore = createVuexStore;
const vuestoreplugin = (vue) => {
    if (Vue && Vue === vue) {
        console.warn('[vue-store]: Do not install the plugin again.');
    }
    Vue = vue;
};

export default vuestoreplugin;
export { createStore };
