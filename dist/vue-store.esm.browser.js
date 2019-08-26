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
function createVueStore(modules, options) {
    if (!Vue) {
        onError('Please install VueStorePlugin first.');
    }
    let isCommitting = false;
    let isReplacing = false;
    let subscribeName = '';
    const _vm = new Vue();
    const strict = options ? options.strict : false;
    const base = {
        addModule(path, _module, options) {
            const routes = path.split('.');
            options = options || {
                preserveState: true
            };
            const moduleName = routes.pop();
            let vueStore = store;
            routes.forEach((r) => { vueStore = vueStore[r]; });
            const _state = {};
            if (vueStore[moduleName] && (options.preserveState || !('preserveState' in options))) {
                Object.assign(_state, vueStore[moduleName].__state__);
            }
            if (vueStore[moduleName] && vueStore[moduleName].__vue__) {
                {
                    onWarn(`Namespaced module: ${path} has been added, do not repeat to add it.`);
                }
                return vueStore[moduleName];
            }
            vueStore[moduleName] = _createStore(_module, routes.concat(moduleName), _state);
            vueStore.__state__[moduleName] = vueStore[moduleName].__state__;
            return vueStore[moduleName];
        },
        removeModule(path) {
            const routes = path.split('.');
            const moduleName = routes.pop();
            let vueStore = store;
            routes.forEach((r) => { vueStore = vueStore[r]; });
            try {
                const vueIns = vueStore[moduleName].__vue__;
                delete vueStore.__state__[moduleName];
                delete vueStore[moduleName];
                vueIns.$destroy();
            }
            catch (_a) {
                onError(`${path} can not be removed as it is not dynamic module.`);
            }
        },
        subscribe(listener) {
            subscribeName = subscribeName || 'vuestore-mutation-action-subscribe-event';
            const _listener = (data, state) => { listener(data, state); };
            _vm.$on(subscribeName, _listener);
            return () => { _vm.$off(subscribeName, _listener); };
        },
        replaceState(state, vueStore) {
            vueStore = vueStore || store;
            Object.keys(state).forEach((key) => {
                if (/[A-Z]/.test(key[0])) {
                    if (vueStore[key]) {
                        this.replaceState(state[key], vueStore[key]);
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
        watch(fn, cb, option) {
            return _vm.$watch(fn, cb, option);
        },
        getState() {
            return JSON.parse(JSON.stringify(store.__state__));
        },
        hotUpdate(path, _module) {
            const newModule = typeof path === 'string' ? _module : path;
            const routesPath = typeof path === 'string' ? path : '';
            const routes = routesPath.split('.');
            let vueStore = store;
            routes.forEach((r) => { vueStore = vueStore[r]; });
            Object.keys(vueStore.__getters__).forEach((name) => {
                delete vueStore.__getters__[name];
            });
            Object.keys(vueStore.__methods__).forEach((name) => {
                delete vueStore.__methods__[name];
            });
            Object.keys(newModule).forEach((key) => {
                if (/[A-Z]/.test(key[0])) {
                    this.hotUpdate(routesPath + '.' + key, newModule[key]);
                }
                else {
                    const getter = Object.getOwnPropertyDescriptor(newModule, key).get;
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
    function _createStore(UserModule, routes = [], preservedState) {
        if (typeof UserModule === 'function') {
            UserModule = UserModule();
        }
        const Methods = {}; // for hotUpdate, store functions
        const Getters = {};
        const state = {};
        const stateGetters = {};
        const vueStore = routes.length ? {} : Object.create(base);
        const vueOption = {};
        const routesPath = routes.join('/');
        Object.keys(UserModule).forEach((key) => {
            if (/[A-Z]/.test(key[0])) {
                if (!UserModule[key])
                    return;
                const _store = _createStore(UserModule[key], routes.concat(key));
                Object.defineProperty(vueStore, key, {
                    value: _store,
                    enumerable: true,
                    configurable: false // prevent to be deleted
                });
                state[key] = _store.__state__;
                stateGetters[key] = _store.__stateGetters__;
            }
            else {
                const getter = Object.getOwnPropertyDescriptor(UserModule, key).get;
                if (typeof getter === 'function') {
                    Getters[key] = getter;
                    vueOption.computed = vueOption.computed || {};
                    // eslint-disable-next-line
                    setFunction(vueOption.computed, key, function () {
                        return Getters[key].call(stateGetters);
                    });
                    const descriptor = {
                        get() { return vueStore.__vue__[key]; },
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
                                actionType: routesPath ? `${routesPath}/${key}` : key,
                                payload
                            }, state);
                        }
                        return Methods[key].call(vueStore, payload);
                    } : function (payload) {
                        if (subscribeName) {
                            _vm.$emit(subscribeName, {
                                type: routesPath ? `${routesPath}/${key}` : key,
                                payload
                            }, state);
                        }
                        isCommitting = true;
                        Methods[key].call(state, payload);
                        isCommitting = false;
                    });
                }
                else {
                    const data = (vueOption.data = vueOption.data || {});
                    data[key] = (preservedState && (key in preservedState)) ? preservedState[key] : UserModule[key];
                    const descriptor = {
                        get() { return vueStore.__vue__[key]; },
                        set(val) {
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
            vueStore.__vue__.$watch(() => state, () => {
                if (!isCommitting && !isReplacing) {
                    try {
                        onError('Only mutation(pure function) could change state.');
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
    const store = _createStore(modules);
    if (options && Array.isArray(options.plugins)) {
        options.plugins.forEach((plugin) => {
            typeof plugin === 'function' && plugin(store);
        });
    }
    return store;
}
var VueStorePlugin = {
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

export default VueStorePlugin;
