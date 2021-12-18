import omit from 'lodash/omit'
import groupBy from 'lodash/groupBy'
import merge from 'lodash/merge'
import {getCollectionNameForModel as defaultCollectionName} from './utils'
import {
  DatastoreProvider,
  DatesAfterStatement,
  DatesBeforeStatement,
  OrmQuery,
  PropertyStatement,
  OrmModelInstance,
  OrmModel,
} from 'functional-models-orm/interfaces'
import {FunctionalModel, PrimaryKeyType, Model } from 'functional-models/interfaces'
import {EQUALITY_SYMBOLS} from 'functional-models-orm/constants'

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
}:{mongoClient: any, databaseName: string, getCollectionNameForModel: <T extends FunctionalModel>(model: Model<T>) => string}) : DatastoreProvider => {
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
      const mongoSymbol = _equalitySymbolToMongoSymbol[partial.options.equalitySymbol || EQUALITY_SYMBOLS.EQUALS]
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

  const search = <T extends FunctionalModel>(model: OrmModel<T>, ormQuery: OrmQuery) => {
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

  const retrieve = <T extends FunctionalModel>(model: OrmModel<T>, id: PrimaryKeyType) => {
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

  const save = async <T extends FunctionalModel>(instance: OrmModelInstance<T>) => {
    return Promise.resolve().then(async () => {
      const model = instance.getModel()
      const collectionName = getCollectionNameForModel<T>(model)
      const collection = db.collection(collectionName)
      const key = model.getPrimaryKeyName()
      const data = await instance.toObj()
      const options = { upsert: true}
      // @ts-ignore
      const insertData = merge({}, data, { _id: data[key]})
      // @ts-ignore
      return collection.updateOne({_id: data[key]}, { $set: insertData}, options)
        .then(() => {
          return data
        })
    })
  }

  const bulkInsert = async <T extends FunctionalModel>(Model: OrmModel<T>, instances: readonly OrmModelInstance<T>[]) => {
    return Promise.resolve().then(async () => {
      const groups = groupBy(instances, x=> x.getModel().getName())
      if (Object.keys(groups).length > 1) {
        throw new Error(`Cannot have more than one model type.`)
      }

      const model = instances[0].getModel()
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      const key = model.getPrimaryKeyName()

      const query = (await Promise.all(instances.map(x=>x.toObj())))
        .map((obj) => {
          if (!obj) {
            throw new Error(`An object was empty`)
          }
          // @ts-ignore
          const doc = merge({}, obj, { _id: obj[key]})
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

  const deleteObj = <T extends FunctionalModel>(instance: OrmModelInstance<T>) => {
    return Promise.resolve().then(async () => {
      const model = instance.getModel()
      const collectionName = getCollectionNameForModel<T>(model)
      const collection = db.collection(collectionName)
      const primaryKey = await instance.getPrimaryKey()
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
