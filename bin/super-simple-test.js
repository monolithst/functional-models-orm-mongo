const { BaseModel, TextProperty } = require('functional-models')
const assert = require('chai').assert
const { MongoClient } = require('mongodb')
const d = require('../dist/datastoreProvider').default
const { ormQuery } = require('functional-models-orm')

const ormQueryBuilder = ormQuery.ormQueryBuilder

const _deleteEverything = async collection => {
  const everything = await collection.find({}).toArray()
  await Promise.all(
    everything.map(x => {
      return collection.deleteOne(x)
    })
  )
}

const doit = async client => {
  const collection = client.db('testme').collection('testmodel1')
  await _deleteEverything(collection)
  const store = d({ mongoClient: client, databaseName: 'testme' })
  const m = BaseModel('TestModel1', {
    properties: {
      name: TextProperty({ required: true }),
      myDate: TextProperty({}),
    },
  })
  const instance = m.create({ name: 'my-name' })
  console.log('id')
  await instance.get.id().then(console.log)
  console.log('saving')
  await store.save(instance).then(console.log)
  console.log('retrieve')
  const x = await store.retrieve(m, await instance.get.id())
  console.log('back')
  console.log(x)

  console.log('search 1')
  const query1 = ormQueryBuilder()
    .property('name', 'my-name', { caseSensitive: true })
    .take(2)
    .compile()
  const r1 = await store.search(m, query1)
  console.log(r1)

  console.log('search 2')
  const query2 = ormQueryBuilder()
    .property('name', 'MY-NAME', { caseSensitive: false })
    .take(2)
    .compile()
  const r2 = await store.search(m, query2)
  console.log(r2)

  console.log('search 3')
  const query3 = ormQueryBuilder()
    .property('name', 'MY', { caseSensitive: false, startsWith: true })
    .take(2)
    .compile()
  const r3 = await store.search(m, query3)
  console.log(r3)

  console.log('search 4')
  const query4 = ormQueryBuilder()
    .property('name', 'naMe', { caseSensitive: false, endsWith: true })
    .take(2)
    .compile()
  const r4 = await store.search(m, query4)
  console.log(r4)

  console.log('deleting')
  await store.delete(instance).then(console.log)
  console.log('retrieve again')
  await store.retrieve(m, await instance.get.id()).then(console.log)

  console.log('Date Querying')
  const dateInstance = m.create({ name: 'a-date', myDate: '2020-01-01' })
  await store.save(dateInstance).then(console.log)
  const dateInstance2 = m.create({
    name: 'a-date',
    myDate: new Date('2021-01-01').toISOString(),
  })
  await store.save(dateInstance2).then(console.log)
  const dateInstance3 = m.create({
    name: 'a-date',
    myDate: new Date('2022-01-01'),
  })
  await store.save(dateInstance3).then(console.log)

  console.log('all saved, now querying')
  const dr1 = (
    await store.search(
      m,
      ormQueryBuilder().datesBefore('myDate', '2020-02-01', {}).compile()
    )
  ).instances
  console.log(dr1)
  const dr1b = (
    await store.search(
      m,
      ormQueryBuilder()
        .datesBefore('myDate', new Date('2020-02-01'), {})
        .compile()
    )
  ).instances
  console.log(dr1b)

  const dr2 = (
    await store.search(
      m,
      ormQueryBuilder().datesAfter('myDate', '2020-02-01', {}).compile()
    )
  ).instances
  console.log(dr2)

  const dr3 = (
    await store.search(
      m,
      ormQueryBuilder()
        .datesAfter('myDate', new Date('2021-02-01'), {})
        .compile()
    )
  ).instances
  console.log(dr3)

  console.log('Clearing everything')
  await _deleteEverything(collection)

  console.log('Doing a bulk insert')
  await store.bulkInsert(m, [
    m.create({ name: 'A' }),
    m.create({ name: 'B' }),
    m.create({ name: 'C' }),
    m.create({ name: 'D' }),
  ])
  const bulkSearch = ormQueryBuilder().compile()
  console.log('Searching for bulk inserts')
  console.log(await store.search(m, bulkSearch))
  await _deleteEverything(collection)

  console.log('Testing sort')
  await store.bulkInsert(m, [
    m.create({ name: 'a3' }),
    m.create({ name: 'a2' }),
    m.create({ name: 'a1' }),
    m.create({ name: 'a4' }),
  ])
  console.log('Searching for bulk inserts')
  const sortResult = await store.search(
    m,
    ormQueryBuilder()
      .property('name', 'a', { startsWith: true })
      .sort('name', true)
      .compile()
  )
  console.log(sortResult)
  const sortResult2 = await store.search(
    m,
    ormQueryBuilder()
      .property('name', 'a', { startsWith: true })
      .sort('name', false)
      .compile()
  )
  console.log(sortResult2)
  await _deleteEverything(collection)
}

const main = async () => {
  const url = process.argv[2]
  if (!url) {
    throw new Error(`Must include a mongodb:// url`)
  }
  console.log(url)
  const client = new MongoClient(url)
  await client.connect()
  try {
    await doit(client)
  } finally {
    client.close()
  }
}

main()
