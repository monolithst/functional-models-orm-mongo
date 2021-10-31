const { Model, TextProperty } = require('functional-models')
const assert = require('chai').assert
const {MongoClient} = require('mongodb')
const d = require('../src/datastoreProvider')
const { ormQueryBuilder } = require('functional-models-orm/src/ormQuery')

const doit = async (client) => {
  const collection = client.db('testme').collection('testmodel1')
  const everything = await collection.find({}).toArray()
  await Promise.all(everything.map(x=> {
    return collection.deleteOne(x)
  }))
  const store = d({mongoClient: client, databaseName: 'testme'})
  const m = Model('TestModel1', {
    name: TextProperty({required: true}),
    myDate: TextProperty({}),
  })
  const instance = m.create({name: 'my-name'})
  console.log("id")
  await instance.getId().then(console.log)
  console.log("saving")
  await store.save(instance).then(console.log)
  console.log("retrieve")
  const x = await store.retrieve(m, await instance.getId())
  console.log("back")
  console.log(x)

  console.log("search 1")
  const query1 = ormQueryBuilder()
    .property('name', 'my-name', { caseSensitive: true})
    .take(2)
    .compile()
  const r1 = await store.search(m, query1)
  console.log(r1)

  console.log("search 2")
  const query2 = ormQueryBuilder()
    .property('name', 'MY-NAME', {caseSensitive: false})
    .take(2)
    .compile()
  const r2 = await store.search(m, query2)
  console.log(r2)

  console.log("search 3")
  const query3 = ormQueryBuilder()
    .property('name', 'MY', {caseSensitive: false, startsWith: true})
    .take(2)
    .compile()
  const r3 = await store.search(m, query3)
  console.log(r3)

  console.log("search 4")
  const query4 = ormQueryBuilder()
    .property('name', 'naMe', {caseSensitive: false, endsWith: true})
    .take(2)
    .compile()
  const r4 = await store.search(m, query4)
  console.log(r4)

  console.log("deleting")
  await store.delete(instance).then(console.log)
  console.log("retrieve again")
  await store.retrieve(m, await instance.getId()).then(console.log)

  console.log('Date Querying')
  const dateInstance = m.create({name: 'a-date', myDate: '2020-01-01'})
  await store.save(dateInstance).then(console.log)
  const dateInstance2 = m.create({name: 'a-date', myDate: new Date('2021-01-01').toISOString()})
  await store.save(dateInstance2).then(console.log)
  const dateInstance3 = m.create({name: 'a-date', myDate: new Date('2022-01-01')})
  await store.save(dateInstance3).then(console.log)

  console.log("all saved, now querying")
  const dr1 = (await store.search(
    m,
    ormQueryBuilder()
      .datesBefore('myDate', '2020-02-01',{})
      .compile()
  )).instances
  console.log(dr1)
  const dr1b = (await store.search(
    m,
    ormQueryBuilder()
      .datesBefore('myDate', new Date('2020-02-01'),{})
      .compile()
  )).instances
  console.log(dr1b)

  const dr2 = (await store.search(
    m,
    ormQueryBuilder()
      .datesAfter('myDate', '2020-02-01',{})
      .compile()
  )).instances
  console.log(dr2)

  const dr3 = (await store.search(
    m,
    ormQueryBuilder()
      .datesAfter('myDate', new Date('2021-02-01'),{})
      .compile()
  )).instances
  console.log(dr3)




}

const main = async () => {
  const url = process.argv[2]
  const client = new MongoClient(url)
  await client.connect()
  try {
    await doit(client)
  } finally {
    client.close()
  }
}


main()