var assign = require('object-assign');

var makePatchOperations = require('aws-make-patch-operations');

module.exports = function(apiGateway, params, cb) {
  params = assign({}, params);

  var dryRun = params.dryRun;
  delete params.dryRun;

  if (!Array.isArray(params.responses)) {
    params.responses = [params.responses];
  }
  var responses = params.responses;
  delete params.responses;

  var deleteOthers = params.deleteOthers && function(putResult, existingResponses, cb) {
    var puttedResponses = responses.map(function(res) { return res.statusCode; });
    del(arraySubtract(existingResponses, puttedResponses), function(err, data) {
      if (err) {
        cb(err, null);
      } else {
        var operations = putResult.operations.concat(data.operations);
        cb(null, {items: putResult.items, operations: operations, deletedItems: data.items});
      }
    });
  };
  delete params.deleteOthers;

  list(function(err, existingResponses) {
    if (err) {
      cb(err, null)
    } else {
      put(responses, existingResponses, function(err, data) {
        if (err) {
          cb(err, null);
        } else if (!deleteOthers) {
          cb(null, data);
        } else {
          deleteOthers(data, existingResponses, cb);
        }
      });
    }
  });

  function list(cb) {
    _list(
      apiGateway,
      {
        restApiId: params.restApiId,
        resourceId: params.resourceId,
        httpMethod: params.httpMethod,
      },
      dryRun,
      cb
    )
  }

  function del(responses, cb) {
    if (responses.length === 0) {
      return cb(null, {operations: [], items: []});
    }

    var next = function(err, data) {
      if (err) return cb(err, null);

      del(responses.slice(1), function(err, nextData) {
        if (err) {
          cb(err, null);
        } else {
          var operations = data.operations.concat(nextData.operations);
          var items = data.items.concat(nextData.items);
          cb(null, {operations: operations, items: items});
        }
      });
    };

    _del(
      apiGateway,
      {
        restApiId: params.restApiId,
        resourceId: params.resourceId,
        httpMethod: params.httpMethod,
        statusCode: responses[0],
      },
      dryRun,
      next
    )
  }

  function put(targetResponses, existingResponses, cb) {
    if (targetResponses.length === 0) {
      return cb(null, {items: [], operations: []});
    }

    var next = function(err, data) {
      if (err) return cb(err, null);

      put(targetResponses.slice(1), existingResponses, function(err, nextData) {
        if (err) {
          cb(err, null);
        } else {
          var items = data.items.concat(nextData.items);
          var operations = data.operations.concat(nextData.operations);
          cb(null, {items: items, operations: operations});
        }
      });
    };

    var itemParams = assign({}, targetResponses[0], params);
    if (existingResponses.indexOf(itemParams.statusCode) !== -1) {
      _update(apiGateway, itemParams, dryRun, next);
    } else {
      _create(apiGateway, itemParams, dryRun, next);
    }
  }
};

function _list(apiGateway, params, dryRun, cb) {
  apiGateway.getMethod(params, function(err, res) {
    if (err) {
      cb(err, null);
    } else {
      cb(null, res.methodResponses ? Object.keys(res.methodResponses) : []);
    }
  });
}

function _del(apiGateway, params, dryRun, cb) {
  var operation = {
    op: 'apiGateway.deleteMethodResponse',
    params: params,
    message: 'apiGateway: delete methodResponse ' + params.statusCode + ' (resourceId=' + params.resourceId + ' httpMethod=' + params.httpMethod + ')'
  };

  if (dryRun) {
    operation.message = '(dryrun) ' + operation.message;
    cb(null, {operations: [operation], items: []});
  } else {
    apiGateway.deleteMethodResponse(
      params,
      function(err) {
        var data = {statusCode: params.statusCode};
        cb(err, {operations: [operation], items: [data]});
      }
    );
  }
}

function _create(apiGateway, params, dryRun, cb) {
  var operation = {
    op: 'apiGateway.putMethodResponse',
    params: params,
    message: 'apiGateway: put methodResponse ' + params.statusCode + ' (resourceId=' + params.resourceId + ' httpMethod=' + params.httpMethod + ')'
  };

  if (dryRun) {
    operation.message = '(dryrun) ' + operation.message;
    cb(null, {operations: [operation], items: []});
  } else {
    apiGateway.putMethodResponse(params, function(err, data) {
      cb(err, {operations: [operation], items: [data]});
    });
  }
}

function _update(apiGateway, params, dryRun, cb) {
  var idendifiers = {
    restApiId: params.restApiId,
    resourceId: params.resourceId,
    httpMethod: params.httpMethod,
    statusCode: params.statusCode,
  };

  apiGateway.getMethodResponse(idendifiers, function(err, data) {
    if (err) {
      cb(err, null);
    } else {
      // idendifiers can't be patchable
      var patchables = ['responseModels', 'responseParameters'];
      var patchOperations = makePatchOperations(objectFilter(data, patchables), objectFilter(params, patchables));
      if (patchOperations.length > 0) {
        params = assign({}, idendifiers, {patchOperations: patchOperations});

        var operation = {
          op: 'apiGateway.updateMethodResponse',
          params: params,
          message: 'apiGateway: update methodResponse ' + params.statusCode + ' (resourceId=' + params.resourceId + ' httpMethod=' + params.httpMethod + ')'
        };
        if (dryRun) {
          operation.message = '(dryrun) ' + operation.message;
          cb(null, {operations: [operation], items: []});
        } else {
          apiGateway.updateMethodResponse(params, function(err, data) {
            cb(err, {operations: [operation], items: [data]});
          });
        }
      } else {
        if (dryRun) {
          cb(null, {operations: [], items: []});
        } else {
          cb(null, {operations: [], items: [data]});
        }
      }
    }
  });
}

function arraySubtract(aa, ba) {
  return aa.filter(function(a) { return ba.indexOf(a) === -1; })
}

function objectFilter(obj, keys) {
  return Object.keys(obj).reduce(function(acc, k) {
    if (keys.indexOf(k) !== -1) {
      acc[k] = obj[k];
    }
    return acc;
  }, {});
}
