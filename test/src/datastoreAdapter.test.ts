import chai, { assert } from 'chai'
import asPromised from 'chai-as-promised'
import {
  Model,
  OrmModel,
  PrimaryKeyUuidProperty,
  queryBuilder,
  SortOrder,
  TextProperty,
} from 'functional-models'
import sinon from 'sinon'
import { create as mongoDatastore } from '../../src/datastoreAdapter'

chai.use(asPromised)

const DATABASE_NAME = 'not-real'

type Model1 = {
  id: string
  name?: string
}

const model1 = () => {
  return Model<Model1>({
    pluralName: 'Model1',
    namespace: 'functional-models-orm-mongo',
    properties: {
      id: PrimaryKeyUuidProperty(),
      name: TextProperty(),
    },
  }) as OrmModel<Model1>
}

const setup = () => {
  const toArray = sinon.stub().resolves([])
  const cursorInsides = {
    limit: sinon.stub(),
    sort: sinon.stub(),
    toArray,
  }
  cursorInsides.limit.returns(cursorInsides)
  cursorInsides.sort.returns(cursorInsides)
  const aggregate = sinon.stub().returns(cursorInsides)
  const find = sinon.stub().returns(cursorInsides)
  const findOne = sinon.stub().resolves(undefined)
  const bulkWrite = sinon.stub().resolves(undefined)
  const deleteMany = sinon.stub().resolves(undefined)
  const updateOne = sinon.stub().resolves(undefined)
  const deleteOne = sinon.stub().resolves(undefined)
  const count = sinon.stub().resolves(0)
  const collectionOperations = {
    updateOne,
    find,
    findOne,
    aggregate,
    bulkWrite,
    deleteMany,
    deleteOne,
    count,
  }
  const collection = sinon.stub().returns(collectionOperations)
  const db = sinon.stub().returns({
    collection,
  })
  const mongoClient = {
    db,
  }
  return {
    mongoClient,
    db,
    collection,
    find,
    aggregate,
    cursorInsides,
    collectionOperations,
  }
}

describe('/src/datastoreAdapter.ts', () => {
  describe('#create()', () => {
    it('should have the the 4 functions + bulkInsert and count', () => {
      const { mongoClient } = setup()
      const instance = mongoDatastore({
        mongoClient,
        databaseName: DATABASE_NAME,
      })
      const actual = Object.keys(instance)
      const expected = [
        'bulkInsert',
        'search',
        'retrieve',
        'save',
        'delete',
        'count',
      ]
      assert.includeMembers(actual, expected)
    })
    describe('#count()', () => {
      it('should call collection with the collectionName inside count', async () => {
        const { mongoClient, collection } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        await instance.count(model)
        const actual = collection.getCall(0).args[0]
        const expected = 'test-me'
        assert.deepEqual(actual, expected)
      })
    })
    describe('#retrieve()', () => {
      it('should remove the _id property when found', async () => {
        const { mongoClient, collectionOperations } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        collectionOperations.findOne.resolves({
          id: 'test-me',
          _id: 'test-me',
        })
        const model = model1()
        const actual = await instance.retrieve(model, 1)
        const expected = {
          id: 'test-me',
        }
        assert.deepEqual(actual, expected)
      })
      it('should call collection with the collectionName inside retrieve', async () => {
        const { mongoClient, collection } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        await instance.retrieve(model, 1)
        const actual = collection.getCall(0).args[0]
        const expected = 'test-me'
        assert.deepEqual(actual, expected)
      })
    })
    describe('#save()', () => {
      it('should call collection with the collectionName inside save', async () => {
        const { mongoClient, collection } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        await instance.save(model.create<'id'>({}))
        const actual = collection.getCall(0).args[0]
        const expected = 'test-me'
        assert.deepEqual(actual, expected)
      })
    })
    describe('#delete()', () => {
      it('should call collection with the collectionName inside delete', async () => {
        const { mongoClient, collection } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        await instance.delete(model, 1)
        const actual = collection.getCall(0).args[0]
        const expected = 'test-me'
        assert.deepEqual(actual, expected)
      })
    })
    describe('#bulkDelete()', () => {
      it('should delete the expected values', async () => {
        const { mongoClient, collectionOperations } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        await instance.bulkDelete(model, ['id-1', 'id-2', 'id-3'])
        const actual = collectionOperations.deleteMany.getCall(0).args[0]
        const expected = {
          _id: { $in: ['id-1', 'id-2', 'id-3'] },
        }
        assert.deepEqual(actual, expected)
      })
    })
    describe('#bulkInsert()', () => {
      it('should throw an exception if more than one model type is passed in', () => {
        const { mongoClient, collectionOperations } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        const newModel = Model({
          pluralName: 'not-the-same',
          namespace: 'test-me',
          properties: {
            id: PrimaryKeyUuidProperty(),
          },
        })
        // @ts-ignore
        const promise = instance.bulkInsert(model, [
          model.create({ id: '1' }),
          newModel.create({ id: '1' }),
        ])
        assert.isRejected(promise, 'blahblah')
      })
      it('should create the expected input into bulkInsert', async () => {
        const { mongoClient, collectionOperations } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        await instance.bulkInsert(model, [
          model.create({
            id: 'id-1',
            name: 'name-1',
          }),
          model.create({
            id: 'id-2',
            name: 'name-2',
          }),
          model.create({
            id: 'id-3',
            name: 'name-3',
          }),
        ])
        const actual = collectionOperations.bulkWrite.getCall(0).args[0]
        const expected = [
          {
            updateOne: {
              filter: { _id: 'id-1' },
              update: { $set: { _id: 'id-1', id: 'id-1', name: 'name-1' } },
              upsert: true,
            },
          },
          {
            updateOne: {
              filter: { _id: 'id-2' },
              update: { $set: { _id: 'id-2', id: 'id-2', name: 'name-2' } },
              upsert: true,
            },
          },
          {
            updateOne: {
              filter: { _id: 'id-3' },
              update: { $set: { _id: 'id-3', id: 'id-3', name: 'name-3' } },
              upsert: true,
            },
          },
        ]

        assert.deepEqual(actual, expected)
      })
    })
    describe('#search()', () => {
      it('should use aggregate when query is not empty', async () => {
        const { mongoClient, collectionOperations } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        await instance.search(
          model,
          queryBuilder().property('a', 'b').compile()
        )
        assert.isTrue(collectionOperations.aggregate.called)
      })
      it('should call limit when take is used', async () => {
        const { mongoClient, cursorInsides } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        await instance.search(
          model,
          queryBuilder().property('a', 'b').take(10).compile()
        )
        const actual = cursorInsides.limit.getCall(0).args[0]
        const expected = 10
        assert.deepEqual(actual, expected)
      })
      it('should call cursor.sort with -1 when a sort.dsc is used', async () => {
        const { mongoClient, cursorInsides } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        await instance.search(
          model,
          queryBuilder()
            .property('a', 'b')
            .sort('my-key', SortOrder.dsc)
            .compile()
        )
        const actual = cursorInsides.sort.getCall(0).args[0]
        const expected = {
          'my-key': -1,
        }
        assert.deepEqual(actual, expected)
      })
      it('should call cursor.sort when a sort is used', async () => {
        const { mongoClient, cursorInsides } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        await instance.search(
          model,
          queryBuilder()
            .property('a', 'b')
            .sort('my-key', SortOrder.asc)
            .compile()
        )
        const actual = cursorInsides.sort.getCall(0).args[0]
        const expected = {
          'my-key': 1,
        }
        assert.deepEqual(actual, expected)
      })
      it('should use find when query is an empty array', async () => {
        const { mongoClient, collectionOperations } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        await instance.search(model, {
          query: [],
        })
        assert.isTrue(collectionOperations.find.called)
      })
      it('should remove the _id when searches are found', async () => {
        const { mongoClient, collectionOperations, cursorInsides } = setup()
        const getCollectionNameForModel = sinon.stub().returns('test-me')
        const instance = mongoDatastore({
          mongoClient,
          databaseName: DATABASE_NAME,
          getCollectionNameForModel,
        })
        const model = model1()
        cursorInsides.toArray.resolves([
          { _id: '1', id: '1' },
          { _id: '2', id: '2' },
          { _id: '3', id: '3' },
        ])
        const actual = await instance.search(model, {
          query: [],
        })
        const expected = {
          instances: [{ id: '1' }, { id: '2' }, { id: '3' }],
          page: undefined,
        }
        assert.deepEqual(actual, expected)
      })
    })
  })
})
