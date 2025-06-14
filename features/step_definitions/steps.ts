import { After, Before, Given, Then, When } from '@cucumber/cucumber'
import { assert } from 'chai'
import {
  createOrm,
  DatastoreValueType,
  DateProperty,
  DatetimeProperty,
  IntegerProperty,
  Model,
  ModelType,
  ModelWithReferencesConstructorProps,
  noFetch,
  OrmModelInstance,
  PrimaryKeyUuidProperty,
  queryBuilder,
  TextProperty,
} from 'functional-models'
import { MongoClient } from 'mongodb'
import env from '../../.env-cucumber.json'
import {
  getCollectionNameForModel,
  datastoreAdapter as mongoDatastore,
} from '../../dist'

const DB_NAME = 'functional-models-orm-mongo'
const MODELS: Record<
  string,
  (props: ModelWithReferencesConstructorProps) => {
    models: readonly ModelType<any>[]
    instances: readonly OrmModelInstance<any>[]
  }
> = {
  ModelList3: ({ Model, fetcher }) => {
    const ModelC = Model({
      pluralName: 'ModelC',
      namespace: 'functional-models-orm-mongo',
      properties: {
        id: PrimaryKeyUuidProperty(),
        name: TextProperty({ required: true }),
        age: IntegerProperty({ required: true }),
        date: DateProperty(),
      },
    })
    return {
      models: [ModelC] as ModelType<any>[],
      instances: [
        ModelC.create({
          name: 'name-2',
          age: 2,
        }),
        ModelC.create({
          name: 'name-3',
          age: 10,
          date: '2020-02-01',
        }),
        ModelC.create({
          name: 'name-1',
          age: 1,
          date: '2020-01-01',
        }),
        ModelC.create({
          name: 'name-4',
          age: 15,
          date: '2020-03-01',
        }),
        ModelC.create({
          name: 'name-5',
          age: 20,
        }),
        ModelC.create({
          name: 'name-7',
          age: 20,
        }),
        ModelC.create({
          name: 'name-6',
          age: 20,
        }),
        ModelC.create({
          name: 'name-9',
          age: 30,
        }),
        ModelC.create({
          name: 'name-10',
          age: 100,
          date: '2020-05-01',
        }),
        ModelC.create({
          name: 'name-8',
          age: 50,
        }),
      ] as OrmModelInstance<any>[],
    }
  },
  ModelList2: ({ Model, fetcher }) => {
    const ModelB = Model({
      pluralName: 'ModelB',
      namespace: 'functional-models-orm-mongo',
      properties: {
        id: PrimaryKeyUuidProperty(),
        name: TextProperty({ required: true }),
        age: IntegerProperty({ required: true }),
        datetime: TextProperty(),
      },
    })
    return {
      models: [ModelB] as ModelType<any>[],
      instances: [
        ModelB.create({
          name: 'name-2',
          age: 2,
        }),
        ModelB.create({
          name: 'name-3',
          age: 10,
          datetime: '2020-02-01T00:00:00.000Z',
        }),
        ModelB.create({
          name: 'name-1',
          age: 1,
          datetime: '2020-01-01T00:00:00.000Z',
        }),
        ModelB.create({
          name: 'name-4',
          age: 15,
          datetime: '2020-03-01T00:00:00.000Z',
        }),
        ModelB.create({
          name: 'name-5',
          age: 20,
        }),
        ModelB.create({
          name: 'name-7',
          age: 20,
        }),
        ModelB.create({
          name: 'name-6',
          age: 20,
        }),
        ModelB.create({
          name: 'name-9',
          age: 30,
        }),
        ModelB.create({
          name: 'name-10',
          age: 100,
          datetime: '2020-05-01T00:00:00.000Z',
        }),
        ModelB.create({
          name: 'name-8',
          age: 50,
        }),
      ] as OrmModelInstance<any>[],
    }
  },
  ModelList1: ({ Model, fetcher }) => {
    const ModelA = Model({
      pluralName: 'ModelA',
      namespace: 'functional-models-orm-mongo',
      properties: {
        id: PrimaryKeyUuidProperty(),
        name: TextProperty({ required: true }),
        age: IntegerProperty({ required: true }),
        datetime: DatetimeProperty(),
      },
    })

    return {
      models: [ModelA] as ModelType<any>[],
      instances: [
        ModelA.create({
          id: 'edf73dba-216a-4e10-a38f-398a4b38350a',
          name: 'name-2',
          age: 2,
        }),
        ModelA.create({
          id: '2c3e6547-2d6b-44c3-ad2c-1220a3d305be',
          name: 'name-3',
          age: 10,
          datetime: new Date('2020-02-01T00:00:00.000Z'),
        }),
        ModelA.create({
          id: 'ed1dc8ff-fdc5-401c-a229-8566a418ceb5',
          name: 'name-1',
          age: 1,
          datetime: new Date('2020-01-01T00:00:00.000Z'),
        }),
        ModelA.create({
          name: 'name-4',
          age: 15,
          datetime: new Date('2020-03-01T00:00:00.000Z'),
        }),
        ModelA.create({
          name: 'name-5',
          age: 20,
        }),
        ModelA.create({
          name: 'name-7',
          age: 20,
        }),
        ModelA.create({
          name: 'name-6',
          age: 20,
        }),
        ModelA.create({
          name: 'name-9',
          age: 30,
        }),
        ModelA.create({
          name: 'name-10',
          age: 100,
          datetime: new Date('2020-05-01T00:00:00.000Z'),
        }),
        ModelA.create({
          name: 'name-8',
          age: 50,
        }),
      ] as OrmModelInstance<any>[],
    }
  },
}

const SEARCHES = {
  DateSpanSearch: () =>
    queryBuilder()
      .datesAfter('datetime', '2020-02-01T00:00:00.000Z', {
        equalToAndAfter: true,
      })
      .and()
      .datesBefore('datetime', '2020-05-01T00:00:00.000Z', {
        equalToAndBefore: false,
      })
      .compile(),
  DateSpanSearch2: () =>
    queryBuilder()
      .datesAfter('datetime', '2020-02-01T00:00:00.000Z', {
        valueType: DatastoreValueType.string,
        equalToAndAfter: true,
      })
      .and()
      .datesBefore('datetime', '2020-05-01T00:00:00.000Z', {
        valueType: DatastoreValueType.string,
        equalToAndBefore: false,
      })
      .compile(),
  DateSpanSearch3: () =>
    queryBuilder()
      .datesAfter('date', '2020-02-01', {
        valueType: DatastoreValueType.string,
        equalToAndAfter: true,
      })
      .and()
      .datesBefore('date', '2020-05-01', {
        valueType: DatastoreValueType.string,
        equalToAndBefore: false,
      })
      .compile(),
  TextStartsWithPropertySearch: () =>
    queryBuilder().property('name', 'name-1', { startsWith: true }).compile(),
  OrPropertySearch: () =>
    queryBuilder()
      .property('name', 'name-8')
      .or()
      .property('name', 'name-1')
      .or()
      .property('name', 'name-10')
      .compile(),
  EmptySearch: () => queryBuilder().compile(),
}

const _loadMongoClient = () => {
  if (!env) {
    throw new Error(`Must have a .env-cucumber.json file`)
  }
  if (!env.mongoUrl) {
    throw new Error(`Must have mongoUrl inside the .env-cucumber.json`)
  }
  const client = new MongoClient(env.mongoUrl)
  const db = client.db(DB_NAME)
  return {
    client,
    db,
  }
}

const _cleanoutDatabase = async function () {
  if (!this.db) {
    const { db, client } = _loadMongoClient()
    this.db = db
    this.client = client
  }
  await Promise.all(
    Object.entries(MODELS).map(async ([key, value]) => {
      const models = value({
        Model,
        fetcher: noFetch,
      })
      const names = models.models.map(getCollectionNameForModel)
      await Promise.all(
        names.map(name => {
          const c = this.db.collection(name)
          return c.deleteMany({})
        })
      )
    })
  )
  await this.client.close()
}

Before(_cleanoutDatabase)
After(_cleanoutDatabase)

Given('an orm is setup', function () {
  const objs = _loadMongoClient()
  this.client = objs.client
  this.db = objs.db
  this.datastoreAdapter = mongoDatastore.create({
    databaseName: DB_NAME,
    mongoClient: this.client,
  })
  this.orm = createOrm({ datastoreAdapter: this.datastoreAdapter })
})

Given(
  '{word} is created and inserted into the database',
  async function (key: string) {
    const result = MODELS[key](this.orm)
    this.models = result.models
    // @ts-ignore
    await result.instances.reduce(async (accP, i) => {
      await accP
      return i.save()
    }, Promise.resolve())
  }
)
When(
  'search named {word} is executed on model named {word}',
  async function (key: string, modelPluralName: string) {
    const search = SEARCHES[key]()
    const model = this.models.find(
      x => x.getModelDefinition().pluralName === modelPluralName
    )
    this.result = await model.search(search)
  }
)
Then(/^(\d+) instances are found$/, function (count: number) {
  const actual = this.result.instances.length
  const expected = count
  assert.equal(actual, expected)
})

When(
  'bulk delete is executed on model named {word} with ids {string}',
  async function (modelPluralName: string, ids: string) {
    const model = this.models.find(
      x => x.getModelDefinition().pluralName === modelPluralName
    )
    const idsArray = ids.split(',').map(x => x.trim())
    await model.bulkDelete(idsArray)
  }
)
