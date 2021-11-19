const getCollectionNameForModel = (model: any) => {
  return model.getName().toLowerCase().replace('_', '-').replace(' ', '-')
}

export {
  getCollectionNameForModel,
}
