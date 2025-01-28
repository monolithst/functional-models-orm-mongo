import {
  DataDescription,
  EqualitySymbol,
  isPropertyBasedQuery,
  ModelType,
  OrmSearch,
  PropertyQuery,
  QueryTokens,
  threeitize,
  validateOrmSearch,
} from 'functional-models'
import kebabCase from 'lodash/kebabCase'

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
  return kebabCase(model.getName()).toLowerCase()
}

const buildMongoFindValue = (query: PropertyQuery) => {
  const value = query.value
  // Is this a javascript date??
  if (value && value.toISOString) {
    return { [query.key]: value.toISOString() }
  }
  if (query.valueType === 'string') {
    const options = !query.options.caseSensitive ? { $options: 'i' } : {}
    if (query.options.startsWith) {
      return { [query.key]: { $regex: `^${value}`, ...options } }
    }
    if (query.options.endsWith) {
      return { [query.key]: { $regex: `${value}$`, ...options } }
    }
    if (!query.options.caseSensitive) {
      return { [query.key]: { $regex: `^${value}$`, ...options } }
    }
  }

  if (query.valueType === 'number') {
    const mongoSymbol = _equalitySymbolToMongoSymbol[query.equalitySymbol]
    if (!mongoSymbol) {
      throw new Error(`Symbol ${query.equalitySymbol} is unhandled`)
    }
    return { [query.key]: { [mongoSymbol]: query.value } }
  }
  return { [query.key]: value }
}

const processMongoArray = (
  o: QueryTokens[]
):
  | {
      $and?: any
      $or?: any
    }
  | [] => {
  // If we don't have any AND/OR its all an AND
  if (o.every(x => x !== 'AND' && x !== 'OR')) {
    // All ANDS
    return {
      $and: o.map(handleMongoQuery),
    }
  }
  const threes = threeitize(o)
  return threes.toReversed().reduce((acc, [a, l, b]) => {
    const aQuery = handleMongoQuery(a)
    // After the first time, acc is always the previous.
    if (Object.entries(acc).length > 0) {
      return {
        // @ts-ignore
        [`$${l.toLowerCase()}`]: [aQuery, acc],
      }
    }
    const bQuery = handleMongoQuery(b)
    return {
      // @ts-ignore
      [`$${l.toLowerCase()}`]: [aQuery, bQuery],
    }
  }, {})
}

const handleMongoQuery = (o: QueryTokens) => {
  if (Array.isArray(o)) {
    return processMongoArray(o)
  }
  /* istanbul ignore next */
  if (isPropertyBasedQuery(o)) {
    if (o.type === 'property') {
      return buildMongoFindValue(o)
    }
    if (o.type === 'datesBefore') {
      return {
        [o.key]: {
          [`$lt${o.options.equalToAndBefore ? 'e' : ''}`]: o.date,
        },
      }
    }
    /* istanbul ignore next */
    if (o.type === 'datesAfter') {
      return {
        [o.key]: {
          [`$gt${o.options.equalToAndAfter ? 'e' : ''}`]: o.date,
        },
      }
    }
  }
  /* istanbul ignore next */
  throw new Error(`Unhandled querytoken ${o}`)
}

const toMongo = (o: OrmSearch) => {
  validateOrmSearch(o)
  if (o.query.length < 1) {
    return { $match: [] }
  }
  return [
    {
      $match: handleMongoQuery(o.query),
    },
  ]
}

export { getCollectionNameForModel, toMongo }
