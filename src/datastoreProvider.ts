import {
  DataDescription,
  ModelInstance,
  ModelType,
  PrimaryKeyType,
} from 'functional-models'
import { DatastoreProvider } from 'functional-models-orm'
import groupBy from 'lodash/groupBy'
import merge from 'lodash/merge'
import omit from 'lodash/omit'
import {
  AQuery,
  getCollectionNameForModel as defaultCollectionName,
  v2,
} from './lib'

const mongoDatastoreProvider = ({
  mongoClient,
  databaseName,
  getCollectionNameForModel = defaultCollectionName,
}: {
  mongoClient: any
  databaseName: string
  getCollectionNameForModel: <T extends DataDescription>(
    model: ModelType<T>
  ) => string
}): DatastoreProvider => {
  const db = mongoClient.db(databaseName)

  const search = <T extends DataDescription>(
    model: ModelType<T>,
    ormQuery: AQuery
  ) => {
    return Promise.resolve().then(async () => {
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      //const query = buildSearchQuery(ormQuery)
      const query = v2(ormQuery)

      console.log(JSON.stringify(query, null, 2))
      //const cursor = collection.find(query)
      const cursor = collection.aggregate(query)

      /*
      const sorted = ormQuery.sort
        ? cursor.sort({ [ormQuery.sort.key]: ormQuery.sort.order ? 1 : -1 })
        : cursor
      const take = ormQuery.take
      const limited = take ? sorted.limit(take) : sorted
     */
      return cursor.toArray().then((result: any[]) => {
        return {
          instances: result.map(x => omit(x, '_id')),
          page: null,
        }
      })
    })
  }

  const retrieve = <T extends DataDescription>(
    model: ModelType<T>,
    id: PrimaryKeyType
  ) => {
    return Promise.resolve().then(() => {
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      return collection.findOne({ _id: id }).then((x: any) => {
        if (!x) {
          return null
        }
        return omit(x, '_id')
      })
    })
  }

  const save = async <T extends DataDescription>(
    instance: ModelInstance<T>
  ) => {
    return Promise.resolve().then(async () => {
      const model = instance.getModel()
      const collectionName = getCollectionNameForModel<T>(model)
      const collection = db.collection(collectionName)
      const key = model.getModelDefinition().primaryKeyName
      const data = await instance.toObj()
      const options = { upsert: true }
      // @ts-ignore
      const insertData = merge({}, data, { _id: data[key] })
      return (
        collection
          // @ts-ignore
          .updateOne({ _id: data[key] }, { $set: insertData }, options)
          .then(() => {
            return data
          })
      )
    })
  }

  const bulkInsert = async <T extends DataDescription>(
    model: ModelType<T>,
    instances: readonly ModelInstance<T>[]
  ) => {
    return Promise.resolve().then(async () => {
      const groups = groupBy(instances, x => x.getModel().getName())
      if (Object.keys(groups).length > 1) {
        throw new Error(`Cannot have more than one model type.`)
      }

      const model = instances[0].getModel()
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      const key = model.getModelDefinition().primaryKeyName

      const query = (await Promise.all(instances.map(x => x.toObj<T>()))).map(
        obj => {
          if (!obj) {
            throw new Error(`An object was empty`)
          }
          // @ts-ignore
          const doc = merge({}, obj, { _id: obj[key] })
          return {
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: doc },
              upsert: true,
            },
          }
        }
      )
      // TODO: This wasn't used but i'm not sure if it needed to be.
      //const options = { upsert: true, ordered: true }
      return collection.bulkWrite(query).then(() => {
        return undefined
      })
    })
  }

  const deleteObj = <T extends DataDescription>(instance: ModelInstance<T>) => {
    return Promise.resolve().then(async () => {
      const model = instance.getModel()
      const collectionName = getCollectionNameForModel<T>(model)
      const collection = db.collection(collectionName)
      const primaryKey = await instance.getPrimaryKey()
      return collection.deleteOne({ _id: primaryKey }).then(() => {
        return null
      })
    })
  }

  return {
    bulkInsert,
    // @ts-ignore
    search,
    retrieve,
    save,
    delete: deleteObj,
  }
}

export default mongoDatastoreProvider
