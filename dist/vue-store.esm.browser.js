let Vue;
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
function normalizeModule(userModule, routes = [], target) {
    if (typeof userModule === 'function') {
        userModule = userModule();
    }
    const normalized = {
        state: {}, getters: {}, mutations: {}, actions: {}, subModules: {}, routes: [...routes]
    };
    Object.keys(userModule).forEach((name) => {
        if (isCapital(name)) {
            if (userModule[name]) {
                normalized.subModules[name] = normalizeModule(userModule[name], routes.concat(name), target ? target[name] : null);
            }
        }
        else {
            const getter = Object.getOwnPropertyDescriptor(userModule, name).get;
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
const STORE_META = '__VUE_STORE_META__';
function createVueStore(modules, options) {
    if (!Vue) {
        onError('Please install vue-store plugin first.');
    }
    let isCommitting = false;
    let isReplacing = false;
    let subscribeName = '';
    const _vm = new Vue();
    const strict = options ? options.strict : false;
    const base = {
        addModule(path, userModule, options) {
            const routes = path.split('.');
            options = options || {
                preserveState: true
            };
            const moduleName = routes.pop();
            let target = store;
            routes.forEach((r) => { target = target[r]; });
            if (target[moduleName] && target[moduleName].__vue__) {
                return target[moduleName];
            }
            const normalizedModule = normalizeModule(userModule);
            if (target[moduleName] && (options.preserveState || !('preserveState' in options))) {
                const vueIns = target[moduleName].__vue__;
                normalizedModule.state = Object.assign({}, vueIns ? vueIns[STORE_META].state : target[moduleName]);
            }
            target[moduleName] = _createVueStore(normalizedModule);
            target[moduleName].__vue__[STORE_META].dynamic = true;
            target.__vue__[STORE_META].state[moduleName] = target[moduleName].__vue__[STORE_META].state;
            target.__vue__[STORE_META].stateGetters[moduleName] = target[moduleName].__vue__[STORE_META].stateGetters;
            return target[moduleName];
        },
        removeModule(path) {
            const routes = path.split('.');
            const moduleName = routes.pop();
            let target = store;
            routes.forEach((r) => { target = target[r]; });
            const vueIns = target[moduleName].__vue__;
            vueIns.$destroy();
            delete target[moduleName];
            delete target.__vue__[STORE_META].state[moduleName];
            delete target.__vue__[STORE_META].stateGetters[moduleName];
        },
        subscribe(listener) {
            subscribeName = subscribeName || 'vuestore-mutation-action-subscribe-event';
            const _listener = (data, state) => { listener(data, state); };
            _vm.$on(subscribeName, _listener);
            return () => { _vm.$off(subscribeName, _listener); };
        },
        replaceState(state, target, routes) {
            target = target || store;
            Object.keys(state).forEach((name) => {
                if (isCapital(name)) {
                    const newRoutes = (routes || []).concat(name);
                    if (target[name]) {
                        if (target[name].__vue__) {
                            this.replaceState(state[name], target[name], newRoutes);
                        }
                        else {
                            Object.assign(target[name], state[name]);
                        }
                    }
                    else {
                        target[name] = Object.assign({}, state[name]);
                    }
                }
                else {
                    isReplacing = true;
                    target.__vue__[name] = state[name];
                    isReplacing = false;
                }
            });
        },
        watch(fn, cb, option) {
            return _vm.$watch(fn, cb, option);
        },
        getState() {
            {
                onWarn('Only call getState in development mode.');
            }
            return JSON.parse(JSON.stringify(store.__vue__[STORE_META].state));
        },
        hotUpdate(path, hotModule) {
            if (typeof path !== 'string') {
                hotModule = path;
                path = '';
            }
            let target = store;
            let routes = [];
            if (path) {
                routes = path.split('.');
                routes.forEach((route) => {
                    target = target[route];
                });
            }
            const normalizedModule = normalizeModule(hotModule, routes);
            target.__vue__[STORE_META].getters = normalizedModule.getters;
            target.__vue__[STORE_META].mutations = normalizedModule.mutations;
            target.__vue__[STORE_META].actions = normalizedModule.actions;
        }
    };
    function _createVueStore(normalizedModule) {
        const { state: data, getters, mutations, actions, subModules, routes } = normalizedModule;
        const vueStore = routes.length ? {} : Object.create(base);
        const state = {};
        const stateGetters = Object.create(state);
        const vueOptions = {
            data: {},
            computed: {},
            methods: {}
        };
        Object.keys(data).forEach((name) => {
            vueOptions.data[name] = data[name];
            const descriptor = {
                get() {
                    return vueStore.__vue__[name];
                },
                set(val) {
                    vueStore.__vue__[name] = val;
                },
                enumerable: true
            };
            Object.defineProperty(vueStore, name, descriptor);
            Object.defineProperty(state, name, descriptor);
        });
        Object.keys(getters).forEach((name) => {
            vueOptions.computed[name] = function () {
                return vueStore.__vue__[STORE_META].getters[name].call(stateGetters);
            };
            const descriptor = {
                get() {
                    return vueStore.__vue__[name];
                },
                enumerable: true
            };
            Object.defineProperty(vueStore, name, descriptor);
            Object.defineProperty(stateGetters, name, descriptor);
        });
        Object.keys(mutations).forEach((name) => {
            vueOptions.methods[name] = function (payload) {
                vueStore.__vue__[STORE_META].mutations[name].call(state, payload);
            };
            setFunction(vueStore, name, (payload) => {
                isCommitting = true;
                vueStore.__vue__[name](payload);
                isCommitting = false;
                subscribeName && _vm.$emit(subscribeName, {
                    type: routes.join('.'),
                    payload
                }, state);
            });
        });
        Object.keys(actions).forEach((name) => {
            vueOptions.methods[name] = function (payload) {
                return vueStore.__vue__[STORE_META].actions[name].call(vueStore, payload);
            };
            setFunction(vueStore, name, (payload) => {
                const promise = vueStore.__vue__[name](payload);
                return Promise.resolve(promise).then((res) => {
                    subscribeName && _vm.$emit(subscribeName, {
                        actionType: routes.join('.'),
                        payload
                    }, state);
                    return res;
                });
            });
        });
        Object.keys(subModules).forEach((name) => {
            vueStore[name] = _createVueStore(subModules[name]);
            state[name] = vueStore[name].__vue__[STORE_META].state;
            stateGetters[name] = vueStore[name].__vue__[STORE_META].stateGetters;
        });
        Object.defineProperty(vueStore, '__vue__', { value: new Vue(vueOptions) });
        Object.defineProperty(vueStore.__vue__, STORE_META, {
            value: {
                state, stateGetters, getters, mutations, actions
            }
        });
        if (strict) {
            vueStore.__vue__.$watch(() => state, () => {
                if (!isCommitting && !isReplacing) {
                    try {
                        onError('Only mutation(pure function) could change store.');
                    }
                    catch (err) {
                        // prevent vue to show error
                        setTimeout(() => { throw err; }, 0);
                    }
                }
            }, { deep: true, sync: true });
        }
        return vueStore;
    }
    {
        if (strict) {
            onWarn('Only use strict option in development mode.');
        }
    }
    const normalizedModule = normalizeModule(modules);
    const store = _createVueStore(normalizedModule);
    if (options && Array.isArray(options.plugins)) {
        options.plugins.forEach((plugin) => {
            if (typeof plugin === 'function') {
                plugin(store);
            }
        });
    }
    return store;
}
var vueStore = {
    install(vue) {
        if (Vue && Vue === vue) {
            onWarn('Do not install the plugin again.');
        }
        Vue = vue;
        Vue.mixin({
            beforeCreate() {
                const options = this.$options;
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
