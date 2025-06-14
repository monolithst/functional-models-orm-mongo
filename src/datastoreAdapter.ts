import {
  DataDescription,
  DatastoreAdapter,
  ModelInstance,
  ModelType,
  OrmSearch,
  PrimaryKeyType,
} from 'functional-models'
import groupBy from 'lodash/groupBy'
import merge from 'lodash/merge'
import omit from 'lodash/omit'
import {
  getCollectionNameForModel as defaultCollectionName,
  formatForMongo,
  toMongo,
} from './lib'

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

const create = ({
  mongoClient,
  databaseName,
  getCollectionNameForModel = defaultCollectionName,
}: {
  mongoClient: any
  databaseName: string
  getCollectionNameForModel?: <T extends DataDescription>(
    model: ModelType<T>
  ) => string
}): WithRequired<DatastoreAdapter, 'bulkInsert' | 'count' | 'bulkDelete'> => {
  const db = mongoClient.db(databaseName)

  const search = <T extends DataDescription>(
    model: ModelType<T>,
    ormQuery: OrmSearch
  ) => {
    return Promise.resolve().then(async () => {
      const collectionName = getCollectionNameForModel(model)
      const collection = db.collection(collectionName)
      const query = toMongo(ormQuery)

      const cursor =
        ormQuery.query.length > 0
          ? collection.aggregate(query)
          : collection.find({})

      const sorted = ormQuery.sort
        ? cursor.sort({
            [ormQuery.sort.key]: ormQuery.sort.order === 'asc' ? 1 : -1,
          })
        : cursor
      const take = ormQuery.take
      const limited = take ? sorted.limit(take) : sorted

      return limited.toArray().then((result: any[]) => {
        return {
          instances: result.map(x => omit(x, '_id')),
          page: undefined,
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
      const data = (await instance.toObj<T>()) as T
      const cleanedUp = formatForMongo(data, model)
      const options = { upsert: true }
      // @ts-ignore
      const insertData = merge(cleanedUp, { _id: cleanedUp[key] })
      return (
        collection
          // @ts-ignore
          .updateOne({ _id: cleanedUp[key] }, { $set: insertData }, options)
          .then(() => {
            return cleanedUp
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

  const deleteObj = <T extends DataDescription>(
    model: ModelType<T>,
    id: PrimaryKeyType
  ) => {
    return Promise.resolve().then(async () => {
      const collectionName = getCollectionNameForModel<T>(model)
      const collection = db.collection(collectionName)
      return collection.deleteOne({ _id: id }).then(() => {
        return null
      })
    })
  }

  const count = <T extends DataDescription>(
    model: ModelType<T>
  ): Promise<number> => {
    const collectionName = getCollectionNameForModel<T>(model)
    const collection = db.collection(collectionName)
    return collection.count()
  }

  const bulkDelete = <T extends DataDescription>(
    model: ModelType<T>,
    ids: readonly PrimaryKeyType[]
  ) => {
    return Promise.resolve().then(async () => {
      const collectionName = getCollectionNameForModel<T>(model)
      const collection = db.collection(collectionName)
      return collection.deleteMany({ _id: { $in: ids } }).then(() => {
        return undefined
      })
    })
  }

  return {
    bulkInsert,
    bulkDelete,
    // @ts-ignore
    search,
    retrieve,
    save,
    delete: deleteObj,
    count,
  }
}

export { create }
