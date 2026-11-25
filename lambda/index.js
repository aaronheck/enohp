'use strict';
// Lambda entry point: real DynamoDB + S3 behind the handler in app.js.
const { DynamoDBClient, GetItemCommand, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const { S3Client, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { createHandler } = require('./app');

const REGION = process.env.DATA_REGION || 'us-east-1';
const TABLE = process.env.GAMES_TABLE || 'enohp-games';
const BUCKET = process.env.RECORDING_BUCKET || 'enohp';

const db = new DynamoDBClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

async function getGame(id) {
  const res = await db.send(new GetItemCommand({ TableName: TABLE, Key: { id: { S: id } }, ConsistentRead: true }));
  return res.Item ? unmarshall(res.Item) : null;
}

// expectedTurns: null = must be a brand-new game; n = only save if the stored game
// still has exactly n turns (so two simultaneous turns can't overwrite each other).
async function putGame(game, { expectedTurns }) {
  const params = { TableName: TABLE, Item: marshall(game, { removeUndefinedValues: true }) };
  if (expectedTurns == null) {
    params.ConditionExpression = 'attribute_not_exists(id)';
  } else if (expectedTurns === 0) {
    params.ConditionExpression = 'attribute_not_exists(turns) OR size(turns) = :n';
    params.ExpressionAttributeValues = { ':n': { N: '0' } };
  } else {
    params.ConditionExpression = 'size(turns) = :n';
    params.ExpressionAttributeValues = { ':n': { N: String(expectedTurns) } };
  }
  try {
    await db.send(new PutItemCommand(params));
    return true;
  } catch (e) {
    if (e.name === 'ConditionalCheckFailedException') return false;
    throw e;
  }
}

async function recordingExists(key) {
  if (!key) return false;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (e) {
    const status = e.$metadata && e.$metadata.httpStatusCode;
    if (status === 404 || e.name === 'NotFound') return false;
    // 403 can mean "missing" (when the role can't list the bucket) or "no access".
    // Assume the recording exists rather than risk dropping a real turn.
    if (status === 403) return true;
    throw e;
  }
}

const signGet = (key, seconds) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: seconds });

const signPut = (key, contentType, seconds) =>
  getSignedUrl(s3, new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }), {
    expiresIn: seconds,
  });

exports.handler = createHandler({ getGame, putGame, recordingExists, signGet, signPut });
