import { DataDescription, ModelType } from 'functional-models'
import {
  DatesAfterStatement,
  DatesBeforeStatement,
  EqualitySymbol,
  PropertyStatement, QueryTokens,
  SearchQuery,
  threeitize,
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
/*

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

 */

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

const processMongoArray = (o: QueryTokens[]): {
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

const handleMongoQuery = (o: QueryTokens) => {
  if (Array.isArray(o)) {
    return processMongoArray(o)
  }
  if (o === 'AND' || o === 'OR') {
    throw new Error(``)
  }
  if (o.type === 'property') {
    return buildMongoFindValue(o)
  }
  if (o.type === 'datesBefore') {
      return {
        [o.key]: {
          [`$lt${o.options.equalToAndBefore ? 'e' : ''}`]:
            o.date instanceof Date
              ? o.date.toISOString()
              : o.date,
        },
      }
  }
  if (o.type === 'datesAfter') {
      return {
        [o.key]: {
          [`$gt${o.options.equalToAndAfter ? 'e' : ''}`]:
            o.date instanceof Date
              ? o.date.toISOString()
              : o.date,
        },
      }
  }
  throw new Error('Unhandled currently')
}

const v2 = (o: SearchQuery) => {
  return [
    {
      $match: handleMongoQuery(o.query),
    },
  ]
}

export {
  buildDateQueries,
  buildMongoFindValue,
  getCollectionNameForModel,
  v2,
}
