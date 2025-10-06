import {
  DataDescription,
  DatastoreValueType,
  EqualitySymbol,
  isPropertyBasedQuery,
  ModelType,
  OrmSearch,
  PropertyInstance,
  PropertyQuery,
  PropertyType,
  QueryTokens,
  threeitize,
  validateOrmSearch,
} from 'functional-models'
import kebabCase from 'lodash/kebabCase'
import merge from 'lodash/merge'

const _equalitySymbolToMongoSymbol = {
  [EqualitySymbol.eq]: '$eq',
  [EqualitySymbol.gt]: '$gt',
  [EqualitySymbol.gte]: '$gte',
  [EqualitySymbol.lt]: '$lt',
  [EqualitySymbol.lte]: '$lte',
  [EqualitySymbol.ne]: '$ne',
}

const getCollectionNameForModel = <T extends DataDescription>(
  model: ModelType<T>
) => {
  const name = model.getName()
    .replaceAll('@', '')
    .replaceAll('/', '-')
  return kebabCase(name).toLowerCase()
}

// Module-level pure helpers for string query handling
const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')

const buildStringPattern = (
  raw: string,
  startsWith: boolean,
  endsWith: boolean,
  includes: boolean
): string => {
  const escaped = escapeRegExp(raw)
  if (startsWith) {
    return `^${escaped}`
  }
  if (endsWith) {
    return `${escaped}$`
  }
  if (includes) {
    return `${escaped}`
  }
  // default: exact match
  return `^${escaped}$`
}

const regexObjectForPattern = (
  pattern: string,
  caseSensitive: boolean
): { $regex: string; $options?: string } =>
  caseSensitive ? { $regex: pattern } : { $regex: pattern, $options: 'i' }

const buildMongoFindValue = (query: PropertyQuery) => {
  const value = query.value
  if (!value) {
    return { [query.key]: null }
  }
  // Is this a javascript date??
  if (value && value.toISOString) {
    return { [query.key]: value.toISOString() }
  }
  if (query.valueType === 'string') {
    const caseSensitive = Boolean(query.options.caseSensitive)
    const startsWith = Boolean(query.options.startsWith)
    const endsWith = Boolean(query.options.endsWith)
    const includes = Boolean(query.options.includes)

    if (
      query.equalitySymbol !== EqualitySymbol.eq &&
      query.equalitySymbol !== EqualitySymbol.ne
    ) {
      throw new Error(
        `Symbol ${query.equalitySymbol} is unhandled for string type`
      )
    }

    const raw = String(value)
    const pattern = buildStringPattern(raw, startsWith, endsWith, includes)
    const regexObj = regexObjectForPattern(pattern, caseSensitive)

    if (query.equalitySymbol === EqualitySymbol.ne) {
      const isPlainExact =
        !startsWith && !endsWith && !includes && caseSensitive
      return isPlainExact
        ? { [query.key]: { $ne: raw } }
        : { [query.key]: { $not: regexObj } }
    }

    const useRegex = startsWith || endsWith || includes || !caseSensitive
    return useRegex ? { [query.key]: regexObj } : { [query.key]: raw }
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
  // eslint-disable-next-line functional/immutable-data
  const threes = threeitize(o).reverse()
  return threes.reduce((acc, [a, l, b]) => {
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
          [`$lt${o.options.equalToAndBefore ? 'e' : ''}`]:
            o.valueType === DatastoreValueType.date ? new Date(o.date) : o.date,
        },
      }
    }
    /* istanbul ignore next */
    if (o.type === 'datesAfter') {
      return {
        [o.key]: {
          [`$gt${o.options.equalToAndAfter ? 'e' : ''}`]:
            o.valueType === DatastoreValueType.date ? new Date(o.date) : o.date,
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

const formatForMongo = <T extends DataDescription>(
  data: T,
  model: ModelType<T>
): object => {
  return Object.entries<PropertyInstance<any>>(
    model.getModelDefinition().properties
  ).reduce((acc, [key, property]) => {
    const type = property.getPropertyType()
    switch (type) {
      case PropertyType.Datetime: {
        // @ts-ignore
        const value = acc[key] as string | Date
        if (value) {
          const obj = { [key]: new Date(value) }
          return merge(acc, obj)
        }
        break
      }
      default:
        break
    }
    return acc
  }, data)
}

export { formatForMongo, getCollectionNameForModel, toMongo }
