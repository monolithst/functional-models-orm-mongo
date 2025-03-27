import { assert } from 'chai'
import {
  DatastoreValueType,
  EqualitySymbol,
  PropertyType,
  queryBuilder,
} from 'functional-models'
import {
  formatForMongo,
  getCollectionNameForModel,
  toMongo,
} from '../../src/lib'

describe('/src/lib.ts', () => {
  describe('#formatForMongo()', () => {
    it('should properly handle a date', () => {
      const theDate = new Date()
      const input = [
        {
          myDate: theDate.toISOString(),
        },
        {
          getModelDefinition: () => ({
            properties: {
              myDate: {
                getPropertyType: () => PropertyType.Date,
              },
            },
          }),
        },
      ]
      // @ts-ignore
      const actual = formatForMongo(...input)
      const expected = {
        myDate: theDate.toISOString(),
      }
      assert.deepEqual(actual, expected)
    })
    it('should properly handle a datetime when its undefined', () => {
      const theDate = new Date()
      const input = [
        {
          myDate: undefined,
        },
        {
          getModelDefinition: () => ({
            properties: {
              myDate: {
                getPropertyType: () => PropertyType.Datetime,
              },
            },
          }),
        },
      ]
      // @ts-ignore
      const actual = formatForMongo(...input)
      const expected = {
        myDate: undefined,
      }
      assert.deepEqual(actual, expected)
    })
    it('should properly handle a datetime by converting a string to a datetime', () => {
      const theDate = new Date()
      const input = [
        {
          myDate: theDate.toISOString(),
        },
        {
          getModelDefinition: () => ({
            properties: {
              myDate: {
                getPropertyType: () => PropertyType.Datetime,
              },
            },
          }),
        },
      ]
      // @ts-ignore
      const actual = formatForMongo(...input)
      const expected = {
        myDate: new Date(theDate),
      }
      assert.deepEqual(actual, expected)
    })
  })
  describe('#getCollectionNameForModel()', () => {
    it('should get the expected name', () => {
      // @ts-ignore
      const actual = getCollectionNameForModel({
        // @ts-ignore
        getName: () => 'MyPluralNames',
      })
      const expected = 'my-plural-names'
      assert.deepEqual(actual, expected)
    })
  })
  describe('#toMongo()', () => {
    it('should throw an exception with an unhandled equalitySymbol', () => {
      assert.throws(() => {
        toMongo({
          query: [
            {
              type: 'property',
              key: 'test',
              value: 5,
              // @ts-ignore
              equalitySymbol: '==',
              valueType: DatastoreValueType.number,
            },
          ],
        })
      }, 'Symbol == is unhandled')
    })
    it('should handle a datesAfter when its a date', () => {
      // @ts-ignore
      const query = queryBuilder()
        .datesAfter('my-key', new Date('2020-01-01T00:00:00.000Z'), {
          equalToAndAfter: false,
        })
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                'my-key': {
                  ['$gt']: new Date('2020-01-01T00:00:00.000Z'),
                },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle a datesAfter with equalToAndAfter=false correctly', () => {
      // @ts-ignore
      const query = queryBuilder()
        .datesAfter('my-key', '2020-01-01', {
          valueType: DatastoreValueType.string,
          equalToAndAfter: false,
        })
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                'my-key': {
                  ['$gt']: '2020-01-01',
                },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle a datesAfter with equalToAndAfter correctly', () => {
      // @ts-ignore
      const query = queryBuilder()
        .datesAfter('my-key', '2020-01-01', {
          valueType: DatastoreValueType.string,
        })
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                'my-key': {
                  ['$gte']: '2020-01-01',
                },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle a datesBefore with equalToAndBefore=false correctly', () => {
      // @ts-ignore
      const query = queryBuilder()
        .datesBefore('my-key', '2020-01-01', {
          valueType: DatastoreValueType.string,
          equalToAndBefore: false,
        })
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                'my-key': {
                  ['$lt']: '2020-01-01',
                },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle a datesBefore with equalToAndBefore correctly', () => {
      // @ts-ignore
      const query = queryBuilder()
        .datesBefore('my-key', '2020-01-01', {
          valueType: DatastoreValueType.string,
        })
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                'my-key': {
                  ['$lte']: '2020-01-01',
                },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle a number with > correctly', () => {
      const query = queryBuilder()
        .property('test', 5, {
          type: DatastoreValueType.number,
          equalitySymbol: EqualitySymbol.gt,
        })
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                test: { $gt: 5 },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle a number with eq correctly', () => {
      const query = queryBuilder()
        .property('test', 5, { type: DatastoreValueType.number })
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                test: { $eq: 5 },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle caseSensitive', () => {
      const query = queryBuilder()
        .property('test', 'value1', { caseSensitive: true })
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                test: 'value1',
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle date object correctly', () => {
      const query = queryBuilder()
        .property('test', new Date('2020-01-01T00:00:00.000Z'))
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                test: '2020-01-01T00:00:00.000Z',
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle endsWith correctly', () => {
      const query = queryBuilder()
        .property('test', 'value1', { endsWith: true })
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                test: {
                  $regex: 'value1$',
                  $options: 'i',
                },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle startsWith correctly', () => {
      const query = queryBuilder()
        .property('test', 'value1', { startsWith: true })
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                test: {
                  $regex: '^value1',
                  $options: 'i',
                },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle a simple AND query correctly', () => {
      const query = queryBuilder()
        .property('test', 'value1')
        .and()
        .property('test2', 'value2')
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                test: {
                  $regex: '^value1$',
                  $options: 'i',
                },
              },
              {
                test2: {
                  $regex: '^value2$',
                  $options: 'i',
                },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle a simple query correctly', () => {
      const query = queryBuilder()
        .property('test', 'value1')
        .and()
        .property('test2', 'value2')
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $and: [
              {
                test: {
                  $options: 'i',
                  $regex: '^value1$',
                },
              },
              {
                test2: {
                  $options: 'i',
                  $regex: '^value2$',
                },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle a simple OR query correctly', () => {
      const query = queryBuilder()
        .property('test', 'value1')
        .or()
        .property('test', 'value2')
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $or: [
              {
                test: {
                  $options: 'i',
                  $regex: '^value1$',
                },
              },
              {
                test: {
                  $options: 'i',
                  $regex: '^value2$',
                },
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
    it('should handle a very complex AND/OR query correctly', () => {
      const query = queryBuilder()
        .property('test', 'value1')
        .or()
        .property('test', 'value2')
        .and()
        .property('prop2', 2)
        .and()
        .property('prop3', 3)
        .or()
        .property('prop4', 4)
        .compile()
      const actual = toMongo(query)
      const expected = [
        {
          $match: {
            $or: [
              {
                test: {
                  $options: 'i',
                  $regex: '^value1$',
                },
              },
              {
                $and: [
                  {
                    test: {
                      $options: 'i',
                      $regex: '^value2$',
                    },
                  },
                  {
                    $and: [
                      {
                        prop2: {
                          $options: 'i',
                          $regex: '^2$',
                        },
                      },
                      {
                        $or: [
                          {
                            prop3: {
                              $options: 'i',
                              $regex: '^3$',
                            },
                          },
                          {
                            prop4: {
                              $options: 'i',
                              $regex: '^4$',
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ]
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
  })
})
