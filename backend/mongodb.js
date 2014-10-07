var Db = require('mongodb').Db,
    Connection = require('mongodb').Connection,
    Server = require('mongodb').Server,
    Q = require('q'),
    _ = require('underscore-data'),
    BaseBackend = require('./base');




/** @class MongoBackend
    @extends BaseBackend */
var MongoBackend = BaseBackend.extend(
/** @lends MongoBackend# */
{
    /** @method */
    initialize: function(options) {
        options = _.extend({}, MongoBackend.defaults, options || {});
        this.options = options;

        this._db = new Db(options.database, new Server(options.host, options.port,  {auto_reconnect: true})/*, {native_parser:true}*/);

        this._opened = null;
    },

    /** @method */
    objectStoreNames: function() {
        return this.open().then(function(db) {
            return Q.ninvoke(db, 'collectionNames');
        });
    },

    /** @method */
    objectStore: function(name, options) {
        return new MongoStore(this, name, options);
    },

    /** @method */
    createObjectStore: function(name, options) {
        return this.open().then(function(db) {
            return Q.ninvoke(db, 'collection', name).then(function() {
                return new MongoStore(this, name, options);
            });
        });
    },

    /** @method */
    deleteObjectStore: function(name) {
        return this.open().then(function(db) {
            return Q.ninvoke(db, 'dropCollection', name);
        });
    },

    /** @method */
    open: function() {
        var self = this;
        if (!this._opened) {
            this._opened = Q.ninvoke(this._db, 'open')
                .then(function (db) {
                    if (self.options.username) {
                        return Q.ninvoke(db, 'authenticate', self.options.username, self.options.password)
                                .then(function() {
                                    return db;
                                });
                    } else {
                        return db;
                    }
                });
        }
        return this._opened;
    },

    /** @method */
    close: function() {
        if (this._opened) {
            this._opened = false;
            return Q.ninvoke(this._db, 'close');
        }
    },

    /** @method */
    isClosed: function() {
        return Q.defer()
                .resolve(!!this._opened);
    }
});

MongoBackend.defaults = {
    host: 'localhost',
    port: 27017,
    database: 'default'
};

/** @class MongoStore
    @extends BaseStore */
var MongoStore = BaseBackend.BaseStore.extend(
/** @lends MongoStore# */
{
    /** @method */
    initialize: function(backend, name, options) {
        options = _.extend({keyPath: '_id'}, options || {});
        BaseBackend.BaseStore.prototype.initialize.call(this, backend, name, options);

        this._collection = null;
    },

    /** @method */
    get: function(directives) {
        var search = {};
        search[this.keyPath] = this._getObjectKey({}, directives);
        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'findOne', search);
        });
    },

    /** @method */
    add: function(object, directives) {
        //var key = this._getObjectKey(object, directives);

        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'insert', object, {safe:true})
                    .then(function(result) {
                        return result[0] || object;
                    });
        });
    },

    /** @method */
    put: function(object, directives) {
        var key = this._getObjectKey(object, directives),
            selector = {};
        selector[this.keyPath] = key;
        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'update', selector, object, {safe:true})
                    .then(function(result) {
                        return object;
                    });
        });
    },

    /** @method */
    'delete': function(directives) {
        var search = {};
        search[this.keyPath] = this._getObjectKey({}, directives);
        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'remove', search, {safe:true, single: true});
        });
    },

    /** Execute RQL query */
    query: function(query) {
        var meta = {},
            search = {};
        if (query && !_.isEmpty(query)) {
            var x = this.parse(query);
            search = x.search;
            meta = x.meta;
        }

        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'find', search||{}, meta||{})
                    .then(function(cursor) {
                        return Q.ninvoke(cursor, 'toArray');
                    });
        });
    },

    /** Get native DB object */
    db: function() {
        return this.backend.open();
    },

    /** Get Collection object */
    collection: function() {
        if (!this._collection) {
            var self = this;
            this._collection = this.db().then(function(db) {
                return Q.ninvoke(db, 'collection', self.name);
            });
        }
        return this._collection;
    },

    /** Delete all items */
    clear: function() {
        return this.collection().then(function(collection) {
            return Q.ninvoke(collection, 'remove', {}, {safe: true});
        });
    },

    /** Parse RQL query */
    parse: function(query) {
        return _.rql(query).toMongo();
    },

    /* @method */
    _getObjectKey: function(obj, key) {
        if (typeof key === 'object') {
            key = key.key;
        }

        key =  key || obj[this.keyPath];

        var intKey = parseInt(key, 10);
        if (!isNaN(intKey) && intKey.toString() === key) {
            key = intKey;
        }
        return 'ObjectId("' + key + '")';
    }
});

/** @module mongodb */

MongoBackend.MongoStore = MongoStore;
module.exports = MongoBackend;
