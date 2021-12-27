"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollectionNameForModel = void 0;
var getCollectionNameForModel = function (model) {
    return model.getName().toLowerCase().replace('_', '-').replace(' ', '-');
};
exports.getCollectionNameForModel = getCollectionNameForModel;
//# sourceMappingURL=utils.js.map