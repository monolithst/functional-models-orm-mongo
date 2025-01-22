import { DataDescription, ModelType } from 'functional-models'
import {
  AllowableEqualitySymbols,
  DatesAfterStatement,
  DatesBeforeStatement,
  EqualitySymbol,
  OrmQuery,
  OrmQueryStatement,
  ORMType,
  PropertyOptions,
  PropertyStatement,
  SortStatement,
  TakeStatement,
} from 'functional-models-orm'
import merge from 'lodash/merge'

const _equalitySymbolToMongoSymbol = {
  [EqualitySymbol.eq]: '$eq',
  [EqualitySymbol.gt]: '$gt',
  [EqualitySymbol.gte]: '$gte',
  [EqualitySymbol.lt]: '$lt',
  [EqualitySymbol.lte]: '$lte',
}

const getCollectionNameForModel = <T extends DataDescription>(
  model: ModelType<T>
) => {
  return model.getName().toLowerCase().replace('_', '-').replace(' ', '-')
}

const buildDateQueries = (
  datesBefore: { [s: string]: DatesBeforeStatement },
  datesAfter: { [s: string]: DatesAfterStatement }
) => {
  const before = Object.entries(datesBefore).reduce((acc, [key, partial]) => {
    return merge(acc, {
      [key]: {
        [`$lt${partial.options.equalToAndBefore ? 'e' : ''}`]:
          partial.date instanceof Date
            ? partial.date.toISOString()
            : partial.date,
      },
    })
  }, {})
  return Object.entries(datesAfter).reduce((acc, [key, partial]) => {
    return merge(acc, {
      [key]: {
        [`$gt${partial.options.equalToAndAfter ? 'e' : ''}`]:
          partial.date instanceof Date
            ? partial.date.toISOString()
            : partial.date,
      },
    })
  }, before)
}

const buildSearchQuery = (ormQuery: OrmQuery) => {
  if (!ormQuery.chain) {
    return {}
  }
  // If we have no OR statements, its all ands, and its simple.
  const isComplex = Boolean(ormQuery.chain.find((c: any) => c.type === 'or'))
  if (!isComplex) {
    const properties = Object.entries(ormQuery.properties || {}).reduce(
      (acc, [_, partial]) => {
        return merge(acc, buildMongoFindValue(partial))
      },
      {}
    )
    const dateEntries = buildDateQueries(
      ormQuery.datesBefore || {},
      ormQuery.datesAfter || {}
    )
    return merge(properties, dateEntries)
  }
  const properties = ormQuery.chain.reduce(
    (
      [previousOr, acc]: [previous: any, acc: any],
      statement: OrmQueryStatement
    ) => {
      if (statement.type === 'or') {
        // If there is already an or statement going, just move on
        if (previousOr) {
          return [previousOr, acc]
        }
        // We have an actual or statement we need to fill
        const newPrevious = acc.slice(-1)[0]
        return [newPrevious, acc]
      }
      if (statement.type === 'and') {
        // Regardless if we had an or statement or not we are moving on
        return [undefined, acc]
      }
      if (statement.type === 'property') {
        const value = buildMongoFindValue(statement)
        // Is this part of an or? If so, we need to keep it going
        if (previousOr) {
          previousOr.$or.push(value)
          return [previousOr, acc]
        }

        return [
          undefined,
          acc.concat({
            $or: [value],
          }),
        ]
      }
      return acc
    },
    [undefined, []] as [any, any]
  )[1]
  const propertyQuery = {
    $and: properties,
  }
  const dateEntries = buildDateQueries(
    ormQuery.datesBefore || {},
    ormQuery.datesAfter || {}
  )
  return merge(propertyQuery, dateEntries)
}

const buildMongoFindValue = (partial: PropertyStatement) => {
  const value = partial.value
  // Is this a javascript date??
  if (value && value.toISOString) {
    return { [partial.name]: value.toISOString() }
  }
  if (partial.valueType === 'string') {
    const options = !partial.options.caseSensitive ? { $options: 'i' } : {}
    if (partial.options.startsWith) {
      return { [partial.name]: { $regex: `^${value}`, ...options } }
    }
    if (partial.options.endsWith) {
      return { [partial.name]: { $regex: `${value}$`, ...options } }
    }
    if (!partial.options.caseSensitive) {
      return { [partial.name]: { $regex: `^${value}$`, ...options } }
    }
  }

  if (partial.valueType === 'number') {
    const mongoSymbol =
      _equalitySymbolToMongoSymbol[
        partial.options.equalitySymbol || EqualitySymbol.eq
      ]
    if (!mongoSymbol) {
      throw new Error(`Symbol ${partial.options.equalitySymbol} is unhandled`)
    }

    return { [partial.name]: { [mongoSymbol]: partial.value } }
  }
  return { [partial.name]: value }
}

/*
Situations

[a=true]
[a=true and b=true]
[a=true or b=true]
[a=[b=true or c=true] and d=[e=true and f=true]]

And statement always first.

Rules:
Overall object is an array.

Arrays Must:
Be All statements (Ands)
Be Statements separated by and/or
Cannot end with and/or
Cannot have two and/or in a row.

Each spot can be...
An array
A statement
And/OR



[
  [s1 'and' s2], 'and', [[s3 and s4], 'or', [s3 and s5], 'or' [s4 'or' s5]]
]


 */

type S = OrmQueryStatement
type E = 'AND' | 'OR'
type Tokens = Tokens[] | S | E

type OverallQuery = Tokens[]

const fu = (o: OverallQuery) => {}

const property = (
  name: string,
  value: any,
  {
    caseSensitive = false,
    startsWith = false,
    endsWith = false,
    type = ORMType.string,
    equalitySymbol = EqualitySymbol.eq,
  }: PropertyOptions = {}
) => {
  if (!AllowableEqualitySymbols.includes(equalitySymbol)) {
    throw new Error(`${equalitySymbol} is not a valid symbol`)
  }
  if (equalitySymbol !== EqualitySymbol.eq && type === ORMType.string) {
    throw new Error(`Cannot use a non = symbol for a string type`)
  }
  if (!type) {
    type = ORMType.string
  }

  const propertyEntry: PropertyStatement = {
    type: 'property',
    name,
    value,
    valueType: type,
    options: {
      caseSensitive,
      startsWith,
      endsWith,
      equalitySymbol,
    },
  }
  return propertyEntry
}

/*

[
  [s1 'and' s2], 'and', [[s3 and s4], 'or', [s3 and s5], 'or' [s4 'or' s5]]
]

 */
fu([
  [property('s1', 'abc'), 'AND', property('s2', 'cbd')],
  'AND',
  [
    [property('s3', '123'), 'AND', property('s4', 'abc')],
    'OR',
    [property('s3', '123'), 'AND', property('s5', '098')],
    'OR',
    [
      property('s4', 'abc'),
      'AND',
      property('s5', '098'),
      'AND',
      property('s6', '1111'),
    ],
  ],
])

/*
// Builder Approach - Creates statement query
builderV2()
  .property('something', 'else')
  .or()
  .complex(x => x 
    .property('another', 'value')
    .and()
    .complex(y => y
      .property('another2', 'value2')
      .and()
      .property('another3', 'value3')
    )
  )
  .compile()
*/

/*
// Just writing it out approach - Writing a statement query
[
  property('something', 'else'),
  'OR',
  [
    property('another', 'value'),
    'AND',
    [
      property('another2', 'value2'),
      'AND',
      property('another3', 'value3'),
    ]
  ]
]
*/

const link = (data: AQuery) => {
  return {
    and: () => {
      return builderV2({...data, query: data.query.concat('AND')})
    },
    or: () => {
      return builderV2({...data, query: data.query.concat('OR')})
    },
    compile: () => {
      return data
      //return v2({query: data})
    }
  }
}

type BuilderLink = {
  and: () => BuilderV2,
  or: () => BuilderV2,
  compile: () => AQuery // Final query
}

type BuilderV2 = {
  complex: (subBuilderFunc: SubBuilderFunction) => BuilderLink,
}

type SubBuilderFunction = (builder: BuilderV2|AQuery) => AQuery 


const builderV2 = (data: AQuery|undefined=undefined) => {
  data = data || { query: []}

  const myProperty = (...args: any[]) => {
    // @ts-ignore
    const p = property(...args)
    return link({...data, query: data.query.concat(p)})
  }

  const complex = (subBuilderFunc: SubBuilderFunction) => {
    const subBuilder = builderV2()
    const result = subBuilderFunc(subBuilder)
    console.log("subbuilder result")
    console.log(result)
    // @ts-ignore
    if (result.compile) {
      // @ts-ignore
      return link({...data, query: data.query.concat([result.compile().query])})
    }
      // @ts-ignore
    return link({...data, query: data.query.concat([result.query])})
  }

  const take = (num: number) => {
    const parsed = parseInt(num as unknown as string, 10)
    if (Number.isNaN(parsed)) {
      throw new Error(`${num} must be an integer.`)
    }
    return link({...data, take: {
      type: 'take',
      value: parsed,
    }})
  }

  const sort = (key: string, isAscending = true) => {
    if (typeof isAscending !== 'boolean') {
      throw new Error('Must be a boolean type')
    }
    const sortStatement: SortStatement = {
      type: 'sort',
      key,
      order: isAscending,
    }
    return link({...data, sort: sortStatement})
  }

  return {
    complex,
    property: myProperty,
    take,
    sort,
  }
}

type Either = "$and"|"$or"
const processMongoArray = (o: Tokens[]): { 
  "$and"?: any,
  "$or"?: any,
} => {
  // If we don't have any AND/OR its all an AND
  if (o.every(x => x !== 'AND' && x !== 'OR')) {
    // All ANDS
    return {
      $and: o.map(handleMongoQuery),
    }
  }
  const first = o[0]
  if (first === 'AND' || first === 'OR') {
    throw new Error('Cannot have AND or OR at the very start.')
  }
  const last = o[o.length - 1]
  if (last === 'AND' || last === 'OR') {
    throw new Error('Cannot have AND or OR at the very end.')
  }
  const totalLinks = o.filter(x => x === 'AND' || x === 'OR')
  const nonLinks = o.filter(x => x !== 'AND' && x !== 'OR')
  if (totalLinks.length !== nonLinks.length - 1) {
    throw new Error('Must separate each statement with an AND or OR')
  }
  const threes = threeitize(o)
  return threes.toReversed().reduce((acc, [a, l, b]) => {
    if (l !== 'AND' && l !== 'OR') {
      throw new Error(`${l} is not a valid symbol`)
    }
    const aQuery = handleMongoQuery(a)
    // After the first time, acc is always the previous.
    if (Object.entries(acc).length > 0) {
      return {
        [`$${l.toLowerCase()}`]: [aQuery, acc],
      }
    }
    const bQuery = handleMongoQuery(b)
    return {
      [`$${l.toLowerCase()}`]: [aQuery, bQuery],
    }
  }, {})
  /*
  return {
    $or: allAndStatements,
  }
 */
}

const doProperty = (p: PropertyStatement) => {
  return {
    [p.name]: p.value,
  }
}

const handleMongoQuery = (o: Tokens) => {
  if (Array.isArray(o)) {
    return processMongoArray(o)
  }
  if (o === 'AND' || o === 'OR') {
    throw new Error(``)
  }
  if (o.type === 'property') {
    return doProperty(o)
  }
  throw new Error('Unhandled currently')
}

type AQuery = {
  take?: TakeStatement
  sort?: SortStatement
  query: OverallQuery
}

const threeitize = <T>(data: T[]): T[][] => {
  if (data.length === 0 || data.length === 1) {
    return []
  }
  if (data.length < 3) {
    throw new Error('Must include at least 3 items')
  }
  const three = data.slice(0, 3)
  const rest = data.slice(2)
  const moreThrees = threeitize(rest)
  return [three, ...moreThrees]
}


const v2 = (o: AQuery) => {
  return [
    {
      $match: handleMongoQuery(o.query),
    },
  ]
}

export {
  AQuery,
  buildDateQueries,
  buildMongoFindValue,
  buildSearchQuery,
  getCollectionNameForModel,
  OverallQuery,
  property,
  v2,
  builderV2,
}
