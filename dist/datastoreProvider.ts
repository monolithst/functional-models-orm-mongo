import omit from 'lodash/omit'
import flow from 'lodash/flow'
import groupBy from 'lodash/groupBy'
import merge from 'lodash/merge'
import { getCollectionNameForModel as defaultCollectionName } from './utils'
import { EQUALITY_SYMBOLS, OrmQueryStatement, OrmQuery, PropertyStatement, DatesAfterStatement, DatesBeforeStatement } from 'functional-models-orm/dist/interfaces'

const _equalitySymbolToMongoSymbol = {
  [EQUALITY_SYMBOLS.EQUALS]: '$eq',
  [EQUALITY_SYMBOLS.GT]: '$gt',
  [EQUALITY_SYMBOLS.GTE]: '$gte',
  [EQUALITY_SYMBOLS.LT]: '$lt',
  [EQUALITY_SYMBOLS.LTE]: '$lte',
}

const mongoDatastoreProvider = ({
  mongoClient,
  databaseName,
  getCollectionNameForModel = defaultCollectionName,
}:{mongoClient: any, databaseName: string, getCollectionNameForModel: (modelInstance: any) => string}) => {
  const db = mongoClient.db(databaseName)

  const _buildMongoFindValue = (partial: PropertyStatement) => {
    const value = partial.value
    // Is this a javascript date??
    if (value && value.toISOString) {
      return { [partial.name]: value.toISOString() }
    }
    if (partial.valueType === 'string') {
      const options = !partial.options.caseSensitive ? { $options: 'i' } : {}
      if (partial.options.startsWith) {
        return { [partial.name]: { $regex: `^${value}`, ...options}}
      }
      if (partial.options.endsWith) {
        return { [partial.name]: { $regex: `${value}$`, ...options}}
      }
      if (!partial.options.caseSensitive) {
        return { [partial.name]: { $regex: `^${value}$`, ...options}}
      }
    }
    if(partial.valueType === 'number') {
      const mongoSymbol = _equalitySymbolToMongoSymbol[partial.options.equalitySymbol]
      if (!mongoSymbol) {
        throw new Error(`Symbol ${partial.options.equalitySymbol} is unhandled`)
      }

      return { [partial.name]: { [mongoSymbol]: partial.value }}
    }
    return { [partial.name]: value }
  }

  const _buildDateQueries = (
    datesBefore: {[s: string]: DatesBeforeStatement},
    datesAfter: {[s: string]: DatesAfterStatement},
  ) => {
    const before = Object.entries(datesBefore)
      .reduce((acc, [key, partial]) => {
        return merge(acc, {
          [key]: {
            [`$lt${partial.options.equalToAndBefore ? 'e' : ''}`]: partial.date instanceof Date ? partial.date.toISOString() : partial.date
          }
       })
      }, {})
    return Object.entries(datesAfter)
      .reduce((acc, [key, partial]) => {
        return merge(acc, {
          [key]: {
            [`$gt${partial.options.equalToAndAfter ? 'e' : ''}`]: partial.date instanceof Date ? partial.date.toISOString() : partial.date
          }
        })
      }, before)
  }

  const search = (model: any, ormQuery: OrmQuery) => {
    return Promise.resolve().then(async () => {
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      const properties = Object.entries(ormQuery.properties || {})
        .reduce((acc, [_, partial]) => {
          return merge(acc, _buildMongoFindValue(partial))
        }, {})
      const dateEntries = _buildDateQueries(ormQuery.datesBefore || {}, ormQuery.datesAfter || {})
      const take = ormQuery.take
      const query = merge(properties, dateEntries)
      const cursor = collection.find(query)
      const sorted = ormQuery.sort
        ? cursor.sort({[ormQuery.sort.key]: ormQuery.sort.order ? 1 : -1})
        : cursor
      const limited = take
        ? sorted.limit(take)
        : sorted
      return limited.toArray()
        .then((result: any[]) => {
          return {
            instances: result.map(x=> omit(x, '_id')),
            page: null,
          }
        })
    })
  }

  const retrieve = (model: any, id: string) => {
    return Promise.resolve().then(() => {
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      return collection.findOne({ _id: id})
        .then((x: any)=> {
          if (!x) {
            return null
          }
          return omit(x, '_id')
        })
    })
  }

  const save = async (instance: any) => {
    return Promise.resolve().then(async () => {
      const model = instance.meta.getModel()
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      const key = model.getPrimaryKeyName()
      const data = await instance.functions.toObj()
      const options = { upsert: true}
      const insertData = merge({}, data, { _id: data[key]})
      return collection.updateOne({_id: data[key]}, { $set: insertData}, options)
        .then(() => {
          return data
        })
    })
  }

  const bulkInsert = async (Model: any, instances: any[]) => {
    return Promise.resolve().then(async () => {
      const groups = groupBy(instances, x=> x.meta.getModel().getName())
      if (Object.keys(groups).length > 1) {
        throw new Error(`Cannot have more than one model type.`)
      }

      const model = instances[0].meta.getModel()
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      const key = model.getPrimaryKeyName()

      const query = (await Promise.all(instances.map(x=>x.functions.toObj())))
        .map(obj => {
          const doc = merge(obj, { _id: obj[key]})
          return {
            updateOne: {
              filter: {_id: doc._id},
              update: { $set: doc},
              upsert: true,
            }
          }
        })
      const options = { upsert: true, ordered: true}
      return collection.bulkWrite(query)
        .then(() => {
          return undefined
        })
    })
  }

  const deleteObj = (instance: any) => {
    return Promise.resolve().then(async () => {
      const model = instance.meta.getModel()
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      const primaryKey = await instance.functions.getPrimaryKey()
      return collection.deleteOne({ _id: primaryKey })
        .then(() => {
          return null
        })
    })
  }

  return {
    bulkInsert,
    search,
    retrieve,
    save,
    delete: deleteObj,
  }
}



export default mongoDatastoreProvider
