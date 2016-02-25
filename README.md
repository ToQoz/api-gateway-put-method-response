# api-gateway-put-method-responses

creates or updates (or deletes) methodResponse of AWS APIGateway

## Usage

example.js:

```javascript
var AWS = require('aws-sdk');
var credentials = new AWS.SharedIniFileCredentials({
  profile: 'org-stuff'
});
AWS.config.credentials = credentials;

var putMethodResponse = require('api-gateway-put-method-response');

putMethodResponse(
  new AWS.APIGateway({
    region: 'ap-northeast-1'
  }),
  {
    restApiId: 'xxx',
    resourceId: 'yyy',
    httpMethod: 'GET',
    responses: [
      {
        statusCode: '200',
        responseModels: {
          'text/html': 'Empty'
        },
        responseParameters: {},
      },
    ],
    deleteOthers: false,
    dryRun: false,
  },
  function(err, data) {
    if (err) console.error(err);
    else console.log(JSON.stringify(data, null, 2));
  }
);
```

```

$ node example.js
{
  "items": [
    {
      "statusCode": "200",
      "responseModels": {
        "text/html": "Empty"
      }
    }
  ],
  "operations": [
    {
      "op": "apiGateway.putMethodResponse",
      "params": {
        "statusCode": "200",
        "responseModels": {
          "text/html": "Empty"
        },
        "responseParameters": {},
        "httpMethod": "GET",
        "restApiId": "xxx",
        "resourceId": "yyy"
      }
    }
  ]
}
$ sed -i'' -e 's,text/html,text/css,' example.js
{
  "items": [
    {
      "statusCode": "200",
      "responseModels": {
        "text/css": "Empty"
      }
    }
  ],
  "operations": [
    {
      "op": "apiGateway.updateMethodResponse",
      "params": {
        "restApiId": "xxx",
        "resourceId": "yyy",
        "httpMethod": "GET",
        "statusCode": "200",
        "patchOperations": [
          {
            "op": "remove",
            "path": "/responseModels/text~1html"
          },
          {
            "op": "add",
            "path": "/responseModels/text~1css",
            "value": "Empty"
          }
        ]
      }
    }
  ],
  "deletedItems": []
}
$ node example.js
{
  "items": [
    {
      "statusCode": "200",
      "responseModels": {
        "text/css": "Empty"
      }
    }
  ],
  "operations": [],
  "deletedItems": []
}
```

## API

```javascript
var putMethodResponse = require('api-gateway-put-method-response')
```

### putFunction(apiGateway, params, cb)

This function creates or updates (or deletes) AWS API Gateway's resource if it doesn't exist.

- Arguments
  - apiGateway - **required** - `instance of AWS.APIGateway`
  - params - **required** - `map`
    - restApiId - **required** - `String`
    - resourceId - **required** - `String`
    - httpMethod - **required** - `String`
    - responses - **required** - `Array<map> | map`
      - statusCode - **required** - `String`
      - responseModels - `map<String, String>`
      - responseParameters - `map<String, Boolean>`
    - dryRun - defaults to false - `Boolean`
    - deleteOthers - defaults to false - `Boolean`
  - cb - `function(err, data) {}` - called with following arguments on the end of operation
    - Arguments (cb)
      - err - `Error` - the error object from aws-sdk. Set to `null` if the operation is successful.
      - data - `map` - the data from aws-sdk. Set to `null` if the operation error occur.
        - items - `Array<map>` - the created or updated methods
          - statusCode - `String`
          - responseModels - `map<String, String>`
          - responseParameters - `map<String, Boolean>`
        - deletedItems - `Array<map>` - the deleted methods
          - statusCode - `String`
        - operations - `Array<map>`
          - op - `String` - like a `'apiGateway.putMethodResponse'`
          - params - `map` - like a `{restApiId: 'xxx', resourceId: 'yyy', httpMethod: 'GET', statusCode: '200'}`
