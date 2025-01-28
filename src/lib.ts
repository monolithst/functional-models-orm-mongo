import {
  DataDescription,
  EqualitySymbol,
  isPropertyBasedQuery,
  ModelType,
  OrmSearch,
  PropertyQuery,
  QueryTokens,
  threeitize,
} from 'functional-models'

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

const buildMongoFindValue = (partial: PropertyQuery) => {
  const value = partial.value
  // Is this a javascript date??
  if (value && value.toISOString) {
    return { [partial.key]: value.toISOString() }
  }
  if (partial.valueType === 'string') {
    const options = !partial.options.caseSensitive ? { $options: 'i' } : {}
    if (partial.options.startsWith) {
      return { [partial.key]: { $regex: `^${value}`, ...options } }
    }
    if (partial.options.endsWith) {
      return { [partial.key]: { $regex: `${value}$`, ...options } }
    }
    if (!partial.options.caseSensitive) {
      return { [partial.key]: { $regex: `^${value}$`, ...options } }
    }
  }

  if (partial.valueType === 'number') {
    const mongoSymbol =
      _equalitySymbolToMongoSymbol[partial.equalitySymbol || EqualitySymbol.eq]
    if (!mongoSymbol) {
      throw new Error(`Symbol ${partial.equalitySymbol} is unhandled`)
    }
    return { [partial.key]: { [mongoSymbol]: partial.value } }
  }
  return { [partial.key]: value }
}

const processMongoArray = (
  o: QueryTokens[]
):
  | {
      $and?: any
      $or?: any
    }
  | [] => {
  if (o.length === 0) {
    return []
  }
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
}

const handleMongoQuery = (o: QueryTokens) => {
  if (Array.isArray(o)) {
    return processMongoArray(o)
  }
  if (isPropertyBasedQuery(o)) {
    if (o.type === 'property') {
      return buildMongoFindValue(o)
    }
    if (o.type === 'datesBefore') {
      return {
        [o.key]: {
          [`$lt${o.options.equalToAndBefore ? 'e' : ''}`]:
            // @ts-ignore
            o.date instanceof Date ? o.date.toISOString() : o.date,
        },
      }
    }
    if (o.type === 'datesAfter') {
      return {
        [o.key]: {
          [`$gt${o.options.equalToAndAfter ? 'e' : ''}`]:
            // @ts-ignore
            o.date instanceof Date ? o.date.toISOString() : o.date,
        },
      }
    }
  }
  throw new Error('Unhandled currently')
}

const toMongo = (o: OrmSearch) => {
  return [
    {
      $match: handleMongoQuery(o.query),
    },
  ]
}

export { buildMongoFindValue, getCollectionNameForModel, toMongo }
