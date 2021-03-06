
/** @module memory */
(function (factory) {
    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined' && typeof require !== 'undefined') {
        // CommonJS
        module.exports = factory(require('q'), require('underscore-data'), require('./base'));
    } else {
        // running in browser
        window.warehouse = window.warehouse || {};
        window.warehouse.MemoryBackend = factory(Q, _, warehouse.BaseBackend);
    }
})(function(Q, _, BaseBackend) {

function resolvedPromise(val) {
    var d = Q.defer();
    d.resolve(val);
    return d.promise;
}

/** @class MemoryBackend
    @extends BaseBackend */
var MemoryBackend = BaseBackend.extend(
/** @lends MemoryBackend# */
{
    /** @method */
    initialize: function(options) {
        BaseBackend.prototype.initialize.call(this, options);

        this._stores = {};
    },

    /** @method */
    objectStoreNames: function() {
        return resolvedPromise(_.keys(this._stores));
    },

    /** @method */
    objectStore: function(name, options) {
        if (!this._stores[name]) {
            this._stores[name] = [];
        }
        return new MemoryStore(this, name, this._stores[name], options);
    },

    /** @method */
    createObjectStore: function(name, options) {
        return resolvedPromise(this.objectStore(name, options));
    },

    /** @method */
    deleteObjectStore: function(name) {
        return resolvedPromise(delete this._stores[name]);
    }
});



/** @class MemoryStore
    @extends BaseStore */
var MemoryStore = BaseBackend.BaseStore.extend(
/** @lends MemoryStore# */
{
    /** @method */
    initialize: function(backend, name, store, options) {
        BaseBackend.BaseStore.prototype.initialize.call(this, backend, name, options);

        this.fromJSON(options.json);
    },

    /** @method */
    get: function(directives) {
        var key = this._getObjectKey({}, directives);

        return resolvedPromise(this._store[key]);
    },

    /** @method */
    add: function(object, directives) {
        object = _.clone(object);
        var key = this._getObjectKey(object, directives);

        this._store[key] = object;

        return resolvedPromise(object);
    },

    /** @method */
    put: function(object, directives) {
        object = _.clone(object);
        var key = this._getObjectKey(object, directives);

        this._store[key] = object;

        return resolvedPromise(object);
    },

    /** @method */
    'delete': function(directives) {
        var key = this._getObjectKey({}, directives);

        var val = this._store[key] && delete (this._store)[key];
        val = val ? 1 : 0;

        return resolvedPromise(val);
    },

    /** Execute RQL query */
    query: function(query) {
        return resolvedPromise(_.query(_.values(this._store), query));
    },

    /** Delete all items */
    clear: function() {
        this._store = {};
        return resolvedPromise(true);
    },

    /** Sets data to be used */
    fromJSON: function(data) {
        var ret = {};
        if (typeof data === 'string') {
            try {
                this.fromJSON(JSON.parse(data));
                return;
            } catch(e) {
            }
        } else if (typeof data === 'object') {
            if (data.constructor && data.constructor.name === 'Array') {
                for (var i = 0; i < data.length; i++) {
                    ret[this._getObjectKey(data[i]) || i] = data[i];
                }
            } else {
                ret = data;
            }
        }
        this._store = ret;
    },

    /** Returns copy of all data */
    toJSON: function() {
        return _.clone(this._store);
    }
});

MemoryBackend.MemoryStore = MemoryStore;
return MemoryBackend;

});