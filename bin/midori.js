const {
  Model,
  TextProperty,
  PrimaryKeyUuidProperty,
} = require('functional-models')
const assert = require('chai').assert
const { MongoClient } = require('mongodb')
const d = require('../dist/datastoreProvider').default
const { ormQuery } = require('functional-models-orm')
const { property } = require('../dist/lib')

const ormQueryBuilder = ormQuery.ormQueryBuilder

const doit = async client => {
  const store = d({ mongoClient: client, databaseName: 'midori-backend-local' })

  const m = Model({
    pluralName: 'Species',
    namespace: 'test',
    properties: {
      id: PrimaryKeyUuidProperty(),
      name: TextProperty({ required: true }),
      myDate: TextProperty({}),
    },
  })
  const r = await store.search(m, {
    query: [
      /*
      [
        property('name', 'Apple'),
        'AND',
        property('latinName', 'Malus domestica'),
      ],
      'OR',

       */
      property('name', 'Tart Cherry'),
      'OR',
      property('name', 'Seaberry'),
      /*
      [
        property('name', 'Seaberry'),
        'AND',
        [
          property('latinName', 'big-bullshit'),
          'OR',
          property('latinName', 'Hippophae rhamnoides'),
        ],
      ],

       */
    ],
  })
  console.log(r)
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
