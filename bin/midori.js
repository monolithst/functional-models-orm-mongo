const {
  Model,
  TextProperty,
  PrimaryKeyUuidProperty,
} = require('functional-models')
const assert = require('chai').assert
const { MongoClient } = require('mongodb')
const d = require('../dist/datastoreProvider').default
const { ormQuery } = require('functional-models-orm')
const { property, builderV2 } = require('../dist/lib')

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
      [
        property('name', 'Apple'),
        'AND',
        property('latinName', 'Malus domestica'),
      ],
      'OR',
      property('name', 'Tart Cherry'),
      'OR',
      //property('name', 'Seaberry'),
      [
        property('name', 'Seaberry'),
        'AND',
        [
          property('latinName', 'big-bullshit'),
          'OR',
          property('latinName', 'Hippophae rhamnoides'),
        ],
      ],
    ],
  })
  console.log(r)
  const r5 = await store.search(m, builderV2()
    .complex(x => x
      .property('name', 'Apple')
      .and()
      .property('latinName', 'Malus domestica')
      .compile()
    )
    .or()
    .property('name', 'Tart Cherry')
    .or()
    .complex(y => y
      .property('name', 'Seaberry')
      .and()
      .complex(z => z
        .property('latinName', 'big-bullshit')
        .or()
        .property('latinName', 'Hippophae rhamnoides')
        .compile()
      )
      .compile()
    )
    .compile()
  )
  console.log(r5)
  const r2 = await store.search(m, {
    query: [
        property('name', 'Apple'),
        'AND',
        property('latinName', 'Malus domestica'),
        'AND',
        property('genus', 'c52dfae2-5e23-4214-b5dd-4cf369be0885'),
        'AND',
        property('id', 'f46094fd-3fa9-4b69-b385-a294ddd01e41'),
    ],
  })
  const r3 = await store.search(m, 
    builderV2()
      .property('name', 'Apple')
      .and()
      .property('latinName', 'Malus domestica')
      .and()
      .property('genus', 'c52dfae2-5e23-4214-b5dd-4cf369be0885')
      .and()
      .property('id', 'f46094fd-3fa9-4b69-b385-a294ddd01e41')
      .compile()
  )
  console.log(r3)
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
