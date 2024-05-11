import {
  DatesAfterStatement,
  DatesBeforeStatement,
  EQUALITY_SYMBOLS,
  OrmQuery,
  PropertyStatement,
} from 'functional-models-orm/interfaces'
import { FunctionalModel, Model } from 'functional-models/interfaces'
import merge from 'lodash/merge'

const _equalitySymbolToMongoSymbol = {
  [EQUALITY_SYMBOLS.EQUALS]: '$eq',
  [EQUALITY_SYMBOLS.GT]: '$gt',
  [EQUALITY_SYMBOLS.GTE]: '$gte',
  [EQUALITY_SYMBOLS.LT]: '$lt',
  [EQUALITY_SYMBOLS.LTE]: '$lte',
}

const getCollectionNameForModel = <T extends FunctionalModel>(
  model: Model<T>
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
  // If we have no OR statements, its all ands, and its simple.
  const isComplex = Boolean(ormQuery.chain.find(c => c.type === 'or'))
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
    ([previousOr, acc], statement) => {
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
        partial.options.equalitySymbol || EQUALITY_SYMBOLS.EQUALS
      ]
    if (!mongoSymbol) {
      throw new Error(`Symbol ${partial.options.equalitySymbol} is unhandled`)
    }

    return { [partial.name]: { [mongoSymbol]: partial.value } }
  }
  return { [partial.name]: value }
}

export {
  getCollectionNameForModel,
  buildSearchQuery,
  buildDateQueries,
  buildMongoFindValue,
}
