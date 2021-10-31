const omit = require('lodash/omit')
const flow = require('lodash/flow')
const merge = require('lodash/merge')
const { getCollectionNameForModel: defaultCollectionName } = require('./utils')


const mongoDatastoreProvider = ({
  mongoClient,
  databaseName,
  getCollectionNameForModel = defaultCollectionName,
}) => {
  const db = mongoClient.db(databaseName)

  const _buildMongoFindValue = partial => {
    const value = partial.value
    const options = partial.options.caseSensitive === false ? { $options: 'i' } : {}
    if (partial.options.startsWith) {
      return { [partial.name]: { $regex: `^${value}`, ...options}}
    }
    if (partial.options.endsWith) {
      return { [partial.name]: { $regex: `${value}$`, ...options}}
    }
    if (partial.options.caseSensitive === false) {
      return { [partial.name]: { $regex: `^${value}$`, ...options}}
    }
    return { [partial.name]: value }
  }

  const _buildDateQueries = (datesBefore={}, datesAfter={}) => {
    const before = Object.entries(datesBefore)
      .reduce((acc, [key, partial]) => {
        return merge(acc, {
          [key]: {
            [`$lt${partial.options.equalToAndBefore ? 'e' : ''}`]: partial.date
          }
       })
      }, {})
    return Object.entries(datesAfter)
      .reduce((acc, [key, partial]) => {
        return merge(acc, {
          [key]: {
            [`$gt${partial.options.equalToAndAfter ? 'e' : ''}`]: partial.date.toISOString ? partial.date.toISOString() : partial.date
          }
        })
      }, before)
  }

  const search = (model, ormQuery) => {
    return Promise.resolve().then(async () => {
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      const properties = Object.entries(ormQuery.properties)
        .reduce((acc, [_, partial]) => {
          return merge(acc, _buildMongoFindValue(partial))
        }, {})
      const dateEntries = _buildDateQueries(ormQuery.datesBefore || {}, ormQuery.datesAfter || {})
      const take = ormQuery.take
      const query = merge(properties, dateEntries)
      const cursor = collection.find(query)
      const limited = take
        ? cursor.limit(take)
        : cursor
      return limited.toArray()
        .then(result => {
          return {
            instances: result.map(x=> omit(x, '_id')),
            page: null,
          }
        })
    })
  }

  const retrieve = (model, id) => {
    return Promise.resolve().then(() => {
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      return collection.findOne({ _id: id})
        .then(x=> {
          return omit(x, '_id')
        })
    })
  }

  const save = async instance => {
    return Promise.resolve().then(async () => {
      const model = instance.meta.getModel()
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      const key = model.getPrimaryKeyName()
      const data = await instance.functions.toObj()
      const options = { upsert: true}
      const insertData = merge(data, { _id: data[key]})
      return collection.updateOne(insertData, { $set: data}, options)
        .then(x => {
          return data
        })
    })
  }

  const deleteObj = instance => {
    return Promise.resolve().then(async () => {
      const model = instance.meta.getModel()
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      const primaryKey = await instance.functions.getPrimaryKey()
      return collection.deleteOne({ _id: primaryKey })
        .then(x=> {
          return null
        })
    })
  }

  return {
    search,
    retrieve,
    save,
    delete: deleteObj,
  }
}



module.exports = mongoDatastoreProvider
