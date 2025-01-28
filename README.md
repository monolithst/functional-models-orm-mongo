# Functional Models ORM Mongo

![Unit Tests](https://github.com/monolithst/functional-models-orm-mongo/actions/workflows/ut.yml/badge.svg?branch=master)
![Feature Tests](https://github.com/monolithst/functional-models-orm-mongo/actions/workflows/feature.yml/badge.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/monolithst/functional-models-orm-mongo/badge.svg?branch=master)](https://coveralls.io/github/monolithst/functional-models-orm-mongo?branch=master)

A [Functional Models](https://monolithst.github.io/functional-models/) datastoreAdapter implementation for mongo databases.

## Example

```javascript
const { MongoClient } = require('mongodb')
const { createOrm } from 'functional-models'
const { datastoreAdapter: mongoAdapter } = require('functional-models-orm-mongo')

const datastoreAdapter = mongoAdapter ({ mongoClient: client, databaseName: 'your-database-name' })

const orm = createOrm({ datastoreAdapter })

```
