const getCollectionNameForModel = model => {
    return model.getName().toLowerCase().replace('_', '-').replace(' ', '-')
}

module.exports = {
    getCollectionNameForModel,
}
