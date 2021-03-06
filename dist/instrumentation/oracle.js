/*
 * Copyright 2020 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const logger = require('../logger').child({ component: 'oracle' })
const shimmer = require('../shimmer')
const parseSql = require('../db/parse-sql')
const ORACLE = require('../metrics/names').ORACLE

module.exports = function initialize(agent, oracle) {
  const tracer = agent.tracer
  let wrapped = false

  logger.trace('wrapping oracle.connect and oracle.connectSync')

  shimmer.wrapMethod(oracle, 'Oracle', 'connect', function wrapMethod(connect) {
    return function wrappedConnect(connectData, cb) {
      return connect.call(this, connectData, tracer.bindFunction(wrapConnection))

      function wrapConnection(err, connection) {
        if (!err) {
          ensureConnectionWrapped(connection)
        }
        return cb(err, connection)
      }
    }
  })

  shimmer.wrapMethod(oracle, 'Oracle', 'connectSync', function wrapSyncConnect(connect) {
    return function wrappedSyncConnect() {
      const connection = connect.apply(this, arguments)
      ensureConnectionWrapped(connection)
      return connection
    }
  })

  function ensureConnectionWrapped(connection) {
    // return early in case called from an async connect after wrapping
    if (wrapped) {
      return
    }
    logger.trace('wrapping oracle connection prototype')
    wrapped = true

    oracle.connectSync.__NR_unwrap()
    oracle.connect.__NR_unwrap()
    shimmer.wrapMethod(oracle, 'Oracle', 'connect', function wrapMethod(connect) {
      return tracer.wrapFunctionNoSegment(connect, 'connect')
    })

    const proto = Object.getPrototypeOf(connection)
    wrapConnectionExecute(proto, tracer)
    wrapConnectionPrepare(proto, tracer)

    shimmer.wrapMethod(proto, 'Oracle', 'reader', function wrapMethod(createReader) {
      return function wrappedConnect(sql) {
        const reader = createReader.apply(this, arguments)
        wrapReader(reader, tracer, sql)
        return reader
      }
    })
  }
}

function wrapConnectionExecute(connection, tracer) {
  shimmer.wrapMethod(connection, 'Oracle.connection', 'execute', wrapExecute)

  function wrapExecute(execute) {
    return tracer.wrapFunction(ORACLE.STATEMENT + 'other/', null, execute, wrappedExecute)
  }

  function wrappedExecute(segment, args, bind) {
    const ps = parseSql(ORACLE.PREFIX, args[0])
    const collection = ps.collection
    const operation = ps.operation

    segment.name = ORACLE.STATEMENT + collection + '/Connection.execute/' + operation
    logger.trace('capturing oracle query. collection: %s, Operation: %s', collection, operation)

    segment.transaction.addRecorder(ps.recordMetrics.bind(ps, segment))
    args[2] = bind(args[2])
    return args
  }
}

function wrapReader(reader, tracer, sql) {
  const ps = parseSql(ORACLE.PREFIX, sql)
  shimmer.wrapMethod(reader, 'Oracle.Reader', 'nextRow', wrapNextRow)
  shimmer.wrapMethod(reader, 'Oracle.Reader', 'nextRows', wrapNextRows)

  function wrapNextRow(nextRow) {
    return tracer.wrapFunctionLast(
      ORACLE.STATEMENT + ps.collection + '/Reader.nextRow/' + ps.operation,
      ps.recordMetrics.bind(ps),
      nextRow
    )
  }

  function wrapNextRows(nextRows) {
    return tracer.wrapFunctionLast(
      ORACLE.STATEMENT + ps.collection + '/Reader.nextRows/' + ps.operation,
      ps.recordMetrics.bind(ps),
      nextRows
    )
  }
}

function wrapConnectionPrepare(connection, tracer) {
  shimmer.wrapMethod(connection, 'Oracle.connection', 'prepare', wrapPrepare)

  function wrapPrepare(prepare) {
    return function wrappedPrepare(sql) {
      const ps = parseSql(ORACLE.PREFIX, sql)
      const prepared = prepare.apply(this, arguments)
      shimmer.wrapMethod(prepared, 'Oracle', 'execute', wrapExecute)
      return prepared

      function wrapExecute(execute) {
        return tracer.wrapFunctionLast(
          ORACLE.STATEMENT + ps.collection + '/Statement.execute/' + ps.operation,
          ps.recordMetrics.bind(ps),
          execute
        )
      }
    }
  }
}
