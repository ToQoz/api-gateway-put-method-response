var test = require('tape');

var applyPatchOps = require('aws-apply-patch-operations');

var putMethodResponse = require('..');

function APIGateway() {
  this.responses = {};
};
APIGateway.prototype = {
  _res: function(statusCode) {
    var returnAttrs = ['httpMethod', 'statusCode', 'responseModels', 'responseParameters'];
    return objectFilter(this.responses[statusCode], returnAttrs);
  },
  getMethod: function(params, cb) {
    cb(null, {methodResponses: this.responses});
  },
  getMethodResponse: function(params, cb) {
    cb(null, this._res(params.statusCode));
  },
  putMethodResponse: function(params, cb) {
    this.responses[params.statusCode] = params;
    cb(null, this._res(params.statusCode));
  },
  updateMethodResponse: function(params, cb) {
    this.responses[params.statusCode] = applyPatchOps(this.responses[params.statusCode], params.patchOperations);
    cb(null, this._res(params.statusCode));
  },
  deleteMethodResponse: function(params, cb) {
    delete this.responses[params.statusCode];
    cb(null, {});
  },
};

test('create GET -> nop GET + create POST -> delete GET', function(t) {
  t.plan(6);

  var ag = new APIGateway();

  // create 200
  putMethodResponse(ag, {restApiId: '', resourceId: 'y', httpMethod: "GET", responses: [{statusCode: '200'}]}, function(err, data) {
    t.deepEqual(data.items, [{httpMethod: "GET", statusCode: '200'}]);
    t.deepEqual(data.operations, [{
      op: 'apiGateway.putMethodResponse',
      params: {restApiId: '', resourceId: 'y', httpMethod: "GET", statusCode: '200'},
      message: 'apiGateway: put methodResponse 200 (resourceId=y httpMethod=GET)'
    }]);

    // nop 200 + create 400
    putMethodResponse(ag, {restApiId: '', resourceId: 'y', httpMethod: "GET", responses: [{statusCode: '200'}, {statusCode: "400"}]}, function(err, data) {
      t.deepEqual(data.items, [{httpMethod: "GET", statusCode: '200'}, {httpMethod: "GET", statusCode: '400'}]);
      t.deepEqual(data.operations, [{
        op: 'apiGateway.putMethodResponse',
        params: {restApiId: '', resourceId: 'y', httpMethod: "GET", statusCode: '400'},
      message: 'apiGateway: put methodResponse 400 (resourceId=y httpMethod=GET)'
      }]);

      // delete 200
      putMethodResponse(ag, {deleteOthers: true, restApiId: '', resourceId: 'y', httpMethod: "GET", responses: [{statusCode: '400'}]}, function(err, data) {
        t.deepEqual(data.items, [{httpMethod: "GET", statusCode: '400'}]);
        t.deepEqual(data.operations, [{
          op: 'apiGateway.deleteMethodResponse',
          params: {restApiId: '', resourceId: 'y', httpMethod: "GET", statusCode: '200'},
          message: 'apiGateway: delete methodResponse 200 (resourceId=y httpMethod=GET)'
        }]);
      });
    });
  });
});
test('dryrun', function(t) {
  t.plan(2);

  var ag = new APIGateway();

  putMethodResponse(ag, {dryRun: true, restApiId: '', resourceId: 'y', httpMethod: "GET", responses: [{statusCode: '200'}]}, function(err, data) {
    t.deepEqual(data.items, []);
    t.deepEqual(data.operations, [{
      op: 'apiGateway.putMethodResponse',
      params: {restApiId: '', resourceId: 'y', httpMethod: "GET", statusCode: '200'},
      message: '(dryrun) apiGateway: put methodResponse 200 (resourceId=y httpMethod=GET)'
    }]);
  });
});

function objectFilter(obj, keys) {
  return Object.keys(obj).reduce(function(acc, k) {
    if (keys.indexOf(k) !== -1) {
      acc[k] = obj[k];
    }
    return acc;
  }, {});
}
