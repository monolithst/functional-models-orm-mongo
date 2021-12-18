import { FunctionalModel, Model } from 'functional-models/interfaces'

const getCollectionNameForModel = <T extends FunctionalModel>(model: Model<T>) => {
  return model.getName().toLowerCase().replace('_', '-').replace(' ', '-')
}

export {
  getCollectionNameForModel,
}
