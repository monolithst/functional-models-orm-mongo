import { assert } from 'chai'
import { queryBuilder } from 'functional-models'
import { toMongo } from '../../src/lib'

describe('/src/lib.ts', () => {
  describe('#toMongo()', () => {
    it('should handle a simple AND query correctly', () => {
      const query = queryBuilder()
        .property('test', 'value1')
        .and()
        .property('test2', 'value2')
        .compile()
      const actual = toMongo(query)
      const expected = {
        test: {
          $options: 'i',
          $regex: '^value1$',
        },
        test2: {
          $options: 'i',
          $regex: '^value2$',
        },
      }
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
      const expected = {
        test: {
          $options: 'i',
          $regex: '^value1$',
        },
        test2: {
          $options: 'i',
          $regex: '^value2$',
        },
      }
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
      const expected = {
        $and: [
          {
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
        ],
      }
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
      const expected = {
        $and: [
          {
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
          {
            $or: [
              {
                prop2: {
                  $options: 'i',
                  $regex: '^2$',
                },
              },
            ],
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
      }
      // @ts-ignore
      assert.deepEqual(actual, expected)
    })
  })
})
