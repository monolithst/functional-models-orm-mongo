"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
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
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var omit_1 = __importDefault(require("lodash/omit"));
var groupBy_1 = __importDefault(require("lodash/groupBy"));
var merge_1 = __importDefault(require("lodash/merge"));
var utils_1 = require("./utils");
var interfaces_1 = require("functional-models-orm/dist/interfaces");
var _equalitySymbolToMongoSymbol = (_a = {},
    _a[interfaces_1.EQUALITY_SYMBOLS.EQUALS] = '$eq',
    _a[interfaces_1.EQUALITY_SYMBOLS.GT] = '$gt',
    _a[interfaces_1.EQUALITY_SYMBOLS.GTE] = '$gte',
    _a[interfaces_1.EQUALITY_SYMBOLS.LT] = '$lt',
    _a[interfaces_1.EQUALITY_SYMBOLS.LTE] = '$lte',
    _a);
var mongoDatastoreProvider = function (_a) {
    var mongoClient = _a.mongoClient, databaseName = _a.databaseName, _b = _a.getCollectionNameForModel, getCollectionNameForModel = _b === void 0 ? utils_1.getCollectionNameForModel : _b;
    var db = mongoClient.db(databaseName);
    var _buildMongoFindValue = function (partial) {
        var _a, _b, _c, _d, _e, _f, _g;
        var value = partial.value;
        // Is this a javascript date??
        if (value && value.toISOString) {
            return _a = {}, _a[partial.name] = value.toISOString(), _a;
        }
        if (partial.valueType === 'string') {
            var options = !partial.options.caseSensitive ? { $options: 'i' } : {};
            if (partial.options.startsWith) {
                return _b = {}, _b[partial.name] = __assign({ $regex: "^" + value }, options), _b;
            }
            if (partial.options.endsWith) {
                return _c = {}, _c[partial.name] = __assign({ $regex: value + "$" }, options), _c;
            }
            if (!partial.options.caseSensitive) {
                return _d = {}, _d[partial.name] = __assign({ $regex: "^" + value + "$" }, options), _d;
            }
        }
        if (partial.valueType === 'number') {
            var mongoSymbol = _equalitySymbolToMongoSymbol[partial.options.equalitySymbol];
            if (!mongoSymbol) {
                throw new Error("Symbol " + partial.options.equalitySymbol + " is unhandled");
            }
            return _e = {}, _e[partial.name] = (_f = {}, _f[mongoSymbol] = partial.value, _f), _e;
        }
        return _g = {}, _g[partial.name] = value, _g;
    };
    var _buildDateQueries = function (datesBefore, datesAfter) {
        var before = Object.entries(datesBefore)
            .reduce(function (acc, _a) {
            var _b, _c;
            var key = _a[0], partial = _a[1];
            return (0, merge_1.default)(acc, (_b = {},
                _b[key] = (_c = {},
                    _c["$lt" + (partial.options.equalToAndBefore ? 'e' : '')] = partial.date instanceof Date ? partial.date.toISOString() : partial.date,
                    _c),
                _b));
        }, {});
        return Object.entries(datesAfter)
            .reduce(function (acc, _a) {
            var _b, _c;
            var key = _a[0], partial = _a[1];
            return (0, merge_1.default)(acc, (_b = {},
                _b[key] = (_c = {},
                    _c["$gt" + (partial.options.equalToAndAfter ? 'e' : '')] = partial.date instanceof Date ? partial.date.toISOString() : partial.date,
                    _c),
                _b));
        }, before);
    };
    var search = function (model, ormQuery) {
        return Promise.resolve().then(function () { return __awaiter(void 0, void 0, void 0, function () {
            var collectionName, collection, properties, dateEntries, take, query, cursor, sorted, limited;
            var _a;
            return __generator(this, function (_b) {
                collectionName = getCollectionNameForModel(model);
                collection = db.collection(collectionName);
                properties = Object.entries(ormQuery.properties || {})
                    .reduce(function (acc, _a) {
                    var _ = _a[0], partial = _a[1];
                    return (0, merge_1.default)(acc, _buildMongoFindValue(partial));
                }, {});
                dateEntries = _buildDateQueries(ormQuery.datesBefore || {}, ormQuery.datesAfter || {});
                take = ormQuery.take;
                query = (0, merge_1.default)(properties, dateEntries);
                cursor = collection.find(query);
                sorted = ormQuery.sort
                    ? cursor.sort((_a = {}, _a[ormQuery.sort.key] = ormQuery.sort.order ? 1 : -1, _a))
                    : cursor;
                limited = take
                    ? sorted.limit(take)
                    : sorted;
                return [2 /*return*/, limited.toArray()
                        .then(function (result) {
                        return {
                            instances: result.map(function (x) { return (0, omit_1.default)(x, '_id'); }),
                            page: null,
                        };
                    })];
            });
        }); });
    };
    var retrieve = function (model, id) {
        return Promise.resolve().then(function () {
            var collectionName = getCollectionNameForModel(model);
            var collection = db.collection(collectionName);
            return collection.findOne({ _id: id })
                .then(function (x) {
                if (!x) {
                    return null;
                }
                return (0, omit_1.default)(x, '_id');
            });
        });
    };
    var save = function (instance) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, Promise.resolve().then(function () { return __awaiter(void 0, void 0, void 0, function () {
                    var model, collectionName, collection, key, data, options, insertData;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                model = instance.meta.getModel();
                                collectionName = getCollectionNameForModel(model);
                                collection = db.collection(collectionName);
                                key = model.getPrimaryKeyName();
                                return [4 /*yield*/, instance.functions.toObj()];
                            case 1:
                                data = _a.sent();
                                options = { upsert: true };
                                insertData = (0, merge_1.default)({}, data, { _id: data[key] });
                                return [2 /*return*/, collection.updateOne({ _id: data[key] }, { $set: insertData }, options)
                                        .then(function () {
                                        return data;
                                    })];
                        }
                    });
                }); })];
        });
    }); };
    var bulkInsert = function (Model, instances) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, Promise.resolve().then(function () { return __awaiter(void 0, void 0, void 0, function () {
                    var groups, model, collectionName, collection, key, query, options;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                groups = (0, groupBy_1.default)(instances, function (x) { return x.meta.getModel().getName(); });
                                if (Object.keys(groups).length > 1) {
                                    throw new Error("Cannot have more than one model type.");
                                }
                                model = instances[0].meta.getModel();
                                collectionName = getCollectionNameForModel(model);
                                collection = db.collection(collectionName);
                                key = model.getPrimaryKeyName();
                                return [4 /*yield*/, Promise.all(instances.map(function (x) { return x.functions.toObj(); }))];
                            case 1:
                                query = (_a.sent())
                                    .map(function (obj) {
                                    var doc = (0, merge_1.default)(obj, { _id: obj[key] });
                                    return {
                                        updateOne: {
                                            filter: { _id: doc._id },
                                            update: { $set: doc },
                                            upsert: true,
                                        }
                                    };
                                });
                                options = { upsert: true, ordered: true };
                                return [2 /*return*/, collection.bulkWrite(query)
                                        .then(function () {
                                        return undefined;
                                    })];
                        }
                    });
                }); })];
        });
    }); };
    var deleteObj = function (instance) {
        return Promise.resolve().then(function () { return __awaiter(void 0, void 0, void 0, function () {
            var model, collectionName, collection, primaryKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        model = instance.meta.getModel();
                        collectionName = getCollectionNameForModel(model);
                        collection = db.collection(collectionName);
                        return [4 /*yield*/, instance.functions.getPrimaryKey()];
                    case 1:
                        primaryKey = _a.sent();
                        return [2 /*return*/, collection.deleteOne({ _id: primaryKey })
                                .then(function () {
                                return null;
                            })];
                }
            });
        }); });
    };
    return {
        bulkInsert: bulkInsert,
        search: search,
        retrieve: retrieve,
        save: save,
        delete: deleteObj,
    };
};
exports.default = mongoDatastoreProvider;
//# sourceMappingURL=datastoreProvider.js.map